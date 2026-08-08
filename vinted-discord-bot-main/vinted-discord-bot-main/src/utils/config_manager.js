import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Check if .env.local exists and load environment variables from it, overriding the default .env values
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
}

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return String(value).trim() === '1' || String(value).trim().toLowerCase() === 'true';
}

function parseIntOrDefault(value, defaultValue) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseStringArray(value, delimiter = ',', defaultValue = []) {
    if (!value) {
        return defaultValue;
    }
    return String(value)
        .split(delimiter)
        .map((item) => item.trim())
        .filter(Boolean);
}

/**
 * Static class to manage application configurations.
 */
class ConfigurationManager {
    /**
     * Retrieves the Discord configuration section from environment variables.
     * @returns {Object} Discord configuration object.
     */
    static getDiscordConfig = {
        client_id: process.env.DISCORD_CLIENT_ID || '',
        token: process.env.DISCORD_TOKEN || '',
        role_admin_id: process.env.DISCORD_ROLE_ADMIN_ID || '',
        guild_id: process.env.DISCORD_GUILD_ID || '',
        thread_channel_id: process.env.DISCORD_THREAD_CHANNEL_ID || '',
        command_channel_id: process.env.DISCORD_COMMAND_CHANNEL_ID || '',
        channel_inactivity_enabled: parseBoolean(process.env.ENABLE_CHANNEL_INACTIVITY, false),
        channel_inactivity_hours: parseIntOrDefault(process.env.CHANNEL_INACTIVITY_HOURS, 72),
        channel_inactivity_delete_hours: parseIntOrDefault(process.env.CHANNEL_INACTIVITY_DELETE_HOURS, 24),
    }
    
    /**
     * Retrieves the MongoDB configuration section from environment variables.
     * @returns {Object} MongoDB configuration object.
     */
    static getMongoDBConfig = {
        uri: process.env.MONGODB_URI || ''
    }
    
    /**
     * Retrieves the user configuration from environment variables.
     * @returns {Object} User configuration object.
     */
    static getUserConfig = {
        max_private_channels_default: parseIntOrDefault(process.env.USER_MAX_PRIVATE_CHANNELS_DEFAULT, 2),
    }

    static getPermissionConfig = {
        allow_user_to_create_private_channels: parseBoolean(process.env.ALLOW_USER_TO_CREATE_PRIVATE_CHANNELS, false)
    }

    /**
     * Retrieves the algorithm settings from environment variables.
     * @returns {Object} Algorithm settings object.
     */
    static getAlgorithmSetting = {
        vinted_api_domain_extension: process.env.VINTED_API_DOMAIN_EXTENSION || 'fr',
        filter_zero_stars_profiles: parseBoolean(process.env.ALGORITHM_FILTER_ZERO_STARS_PROFILES, false),
        concurrent_requests: parseIntOrDefault(process.env.ALGORITHM_CONCURRENT_REQUESTS, 2),
        blacklisted_countries_codes: parseStringArray(process.env.BLACKLISTED_COUNTRIES_CODES, ','),
    }

    /**
     * Retrieves the rotating proxy configuration from environment variables.
     * @returns {Array} Array of proxy configurations.
     */
    static getProxiesConfig = {
        use_webshare: parseBoolean(process.env.USE_WEBSHARE, false),
        webshare_api_key: process.env.WEBSHARE_API_KEY || '',
    }

    static getDevMode = parseBoolean(process.env.DEV_MODE, false);
    static getDumpLogs = parseBoolean(process.env.DUMP_LOGS, false);

    static validateConfig() {
        const discordConfig = this.getDiscordConfig;

        const missing = [];
        if (!discordConfig.token) missing.push('DISCORD_TOKEN');
        if (!discordConfig.client_id) missing.push('DISCORD_CLIENT_ID');
        if (!discordConfig.guild_id) missing.push('DISCORD_GUILD_ID');
        if (!discordConfig.command_channel_id) missing.push('DISCORD_COMMAND_CHANNEL_ID');
        if (!this.getMongoDBConfig.uri) missing.push('MONGODB_URI');

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
}

export default ConfigurationManager;
