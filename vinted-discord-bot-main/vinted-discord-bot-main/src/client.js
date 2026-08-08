import pkg, { IntentsBitField } from 'discord.js';
const { Client, GatewayIntentBits } = pkg;
import { registerCommands, handleCommands } from './bot/commands_handler.js';
import ConfigurationManager from './utils/config_manager.js';
import Logger from './utils/logger.js';
import crud from './crud.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.Guilds,
    ]
});

const discordConfig = ConfigurationManager.getDiscordConfig;
const devMode = ConfigurationManager.getDevMode;

client.once('ready', async () => {
    Logger.info('Client is ready!');
    try {
        await registerCommands(client, discordConfig);
    } catch (error) {
        Logger.error(`Failed to register commands: ${error.message}`);
    }

    try {
        const presenceText = devMode ? 'in dev mode' : 'Vinted';
        await client.user.setPresence({ activities: [{ name: presenceText }], status: 'online' });
    } catch (error) {
        Logger.error(`Failed to set presence: ${error.message}`);
    }
});

client.on('error', (error) => {
    Logger.error(`Discord client error: ${error.message}`);
});

client.on('warn', (info) => {
    Logger.warn(`Discord client warning: ${info}`);
});

// Change presence to show number of channels being monitored
setInterval(async () => {
    try {
        if (!client.user) {
            return;
        }

        const channelCount = (await crud.getAllVintedChannels()).length;
        await client.user.setPresence({ activities: [{ name: `${channelCount} channels` }], status: 'online' });
    } catch (error) {
        Logger.error(`Presence update failed: ${error.message}`);
    }
}, 60000);

client.on('interactionCreate', async (interaction) => {
    try {
        await handleCommands(interaction);
    } catch (error) {
        Logger.error(`Error processing interaction: ${error.message}`);
    }
});

client.login(discordConfig.token)
    .then(() => {
        Logger.info(`Logged in as ${client.user?.tag ?? 'unknown user'}`);
    })
    .catch((error) => {
        Logger.error(`Discord login failed: ${error.message}`);
        process.exit(1);
    });

export default client;
