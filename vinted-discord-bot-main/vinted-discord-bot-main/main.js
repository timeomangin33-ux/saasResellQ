import ProxyManager from "./src/utils/proxy_manager.js";
import { VintedItem } from "./src/entities/vinted_item.js";
import { filterItemsByUrl } from "./src/services/url_service.js";
import { Preference, buildCategoryMapFromRoots } from "./src/database.js";
import client from "./src/client.js";
import ConfigurationManager from "./src/utils/config_manager.js";
import { postMessageToChannel, checkVintedChannelInactivity } from "./src/services/discord_service.js";
import { createVintedItemEmbed, createVintedItemActionRow } from "./src/bot/components/item_embed.js";
import { fetchCookie } from "./src/api/fetchCookie.js";
import { fetchCatalogInitializer } from "./src/api/fetchCatalogInitializers.js";
import { fetchCatalogItems } from "./src/api/fetchCatalogItems.js";
import crud from "./src/crud.js";
import Logger from "./src/utils/logger.js";
import CatalogService from "./src/services/catalog_service.js";

var cookie = null;

try {
    ConfigurationManager.validateConfig();
} catch (error) {
    Logger.error(`Configuration validation failed: ${error.message}`);
    process.exit(1);
}

process.on('unhandledRejection', (reason) => {
    Logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`);
    Logger.error(error.stack || 'No stack available');
    process.exit(1);
});

process.on('SIGINT', () => {
    Logger.info('Received SIGINT, shutting down gracefully.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    Logger.info('Received SIGTERM, shutting down gracefully.');
    process.exit(0);
});

try {
    await ProxyManager.init();
} catch (error) {
    Logger.error(`Failed to initialize proxies: ${error.message}`);
    Logger.info('Continuing without proxies...');
}

const algorithmSettings = ConfigurationManager.getAlgorithmSetting;
CatalogService.initializeConcurrency(algorithmSettings.concurrent_requests);

const getCookie = async () => {
    const c = await fetchCookie();
    return c.cookie;
};

const refreshCookie = async () => {
    let found = false;
    while (!found) {
        try {
            const cookie = await getCookie();
            if (cookie) {
                found = true;
                Logger.info('Fetched cookie from Vinted');
                return cookie;
            }
        } catch (error) {
            Logger.debug('Error fetching cookie');
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        setTimeout(() => {
            Logger.debug('Retrying to fetch cookie');
        }, 1000);
    }
};


const discordConfig = ConfigurationManager.getDiscordConfig
const token = discordConfig.token;

Logger.info('Starting Vinted Bot');
Logger.info('Fetching cookie from Vinted');

cookie = await refreshCookie();

setInterval(async () => {
    try {
        cookie = await refreshCookie();
    } catch (error) {
        Logger.debug('Error refreshing cookie');
    }
}, 60000);  // 60 seconds

const getCatalogRoots = async (cookie) => {
    let found = false;
    while (!found) {
        try {
            const roots = await fetchCatalogInitializer( { cookie });
            if (roots) {
                buildCategoryMapFromRoots(roots);
                found = true;
                Logger.info('Fetched catalog roots from Vinted');
            }
        } catch (error) {
            Logger.debug('Error fetching catalog roots');
            console.error(error);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

Logger.info('Fetching catalog roots from Vinted');

await getCatalogRoots(cookie);

const sendToChannel = async (item, user, vintedChannel) => {
    // get the domain from the URL between vinted. and the next /
    const domain = vintedChannel.url.match(/vinted\.(.*?)\//)[1];
    const { embed, photosEmbeds } = await createVintedItemEmbed(item, domain);
    const actionRow = await createVintedItemActionRow(item, domain);

    const doMentionUser = user && vintedChannel.preferences.get(Preference.Mention);
    const mentionString = doMentionUser ? `<@${user.discordId}>` : '';

    try {
        await postMessageToChannel(
            token,
            vintedChannel.channelId,
            `${mentionString} `,
            [embed, ...photosEmbeds],
            [actionRow]
        );
    }
    catch (error) {
        Logger.debug('Error posting message to channel');
        Logger.debug(error);
    }

};

const backfilledChannels = new Set();

const backfillTop20Items = async (channel) => {
    if (!channel?.url || !channel.isMonitoring) {
        return;
    }

    const channelKey = channel._id?.toString() || channel.id?.toString();
    if (!channelKey || backfilledChannels.has(channelKey)) {
        return;
    }

    backfilledChannels.add(channelKey);

    try {
        const response = await fetchCatalogItems({ cookie, url: channel.url, per_page: 20 });
        const items = response.items || [];

        if (!items.length) {
            return;
        }

        const matchingItems = filterItemsByUrl(
            items.map(item => new VintedItem(item)),
            channel.url,
            channel.bannedKeywords,
            channel.preferences.get(Preference.Countries) || []
        );

        for (const item of matchingItems) {
            await sendToChannel(item, channel.user, channel);
        }
    } catch (error) {
        Logger.debug(`Error backfilling top 20 catalog items for channel ${channel.channelId}`);
        Logger.debug(error);
    }
};

Logger.info('Fetching monitored channels');

let allMonitoringChannels = await crud.getAllMonitoredVintedChannels();
let allMonitoringChannelsBrandMap = await crud.getAllMonitoredVintedChannelsBrandMap();

for (const channel of allMonitoringChannels) {
    await backfillTop20Items(channel);
}

// Print the number of monitored channels
Logger.info(`Monitoring ${allMonitoringChannels.length} Vinted channels`);

crud.eventEmitter.on('updated', async () => {
    allMonitoringChannels = await crud.getAllMonitoredVintedChannels();
    allMonitoringChannelsBrandMap = await crud.getAllMonitoredVintedChannelsBrandMap();
    Logger.debug('Updated vinted channels');

    for (const channel of allMonitoringChannels) {
        await backfillTop20Items(channel);
    }
});

const monitorChannels = () => {
    const handleItem = async (rawItem) => {
        Logger.debug('Handling item');
        const item = new VintedItem(rawItem);

        if (item.getNumericStars() === 0 && algorithmSettings.filter_zero_stars_profiles) {
            return;
        }

        let rawItemBrandId = item.brandId;
        rawItemBrandId = rawItemBrandId ? rawItemBrandId.toString() : null;

        if (allMonitoringChannelsBrandMap.has(rawItemBrandId)) {
            const brandChannels = allMonitoringChannelsBrandMap.get(rawItemBrandId);
            for (const brandChannel of brandChannels) {
                try {
                    const user = brandChannel.user;
                    const matchingItems = filterItemsByUrl(
                        [item], 
                        brandChannel.url, 
                        brandChannel.bannedKeywords, 
                        brandChannel.preferences.get(Preference.Countries) || []
                    );

                    if (matchingItems.length > 0) {
                        sendToChannel(item, user, brandChannel);
                    }
                } catch(error) {
                    Logger.debug('Error sending to channel');
                    Logger.debug(error);
                }
            }
        }
    };

    (async () => {
        await CatalogService.findHighestIDUntilSuccessful(cookie);

        while (true) {
            try {
                await CatalogService.fetchUntilCurrentAutomatic(cookie, handleItem);
            } catch (error) {
                console.error(error);
            }
        }
    })();
};

Logger.info('Starting monitoring channels');

monitorChannels();

if (discordConfig.channel_inactivity_enabled) {
    //every 30 minutes
    setInterval(() => {
        checkVintedChannelInactivity(client)
    }, 1000 * 60 * 30);
}