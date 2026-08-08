import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import RequestBuilder from "../utils/request_builder.js";
import ConfigurationManager from "../utils/config_manager.js";
import { NotFoundError } from "../helpers/execute_helper.js";

const extension = ConfigurationManager.getAlgorithmSetting.vinted_api_domain_extension;

function getVintedDomainExtension(url) {
    if (!url) {
        return extension;
    }

    const hostname = new URL(url).hostname;
    const parts = hostname.split('.').filter(Boolean);

    if (parts.length >= 4 && parts[parts.length - 2] === 'co' && parts[parts.length - 1] === 'uk') {
        return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    }

    return parts[parts.length - 1] || extension;
}

export function buildCatalogItemsQueryParams({ url = null, per_page = 20, order = null }) {
    const params = new URLSearchParams();

    if (url) {
        const parsedUrl = new URL(url);
        const explicitOrder = parsedUrl.searchParams.get('order');

        for (const [key, value] of parsedUrl.searchParams.entries()) {
            if (key === 'per_page' || key === 'order') {
                continue;
            }
            params.append(key, value);
        }

        params.set('order', order ?? explicitOrder ?? 'newest_first');
    } else {
        params.set('order', order ?? 'newest_first');
    }

    params.set('per_page', per_page.toString());
    return params;
}

/**
 * Fetch catalog items from Vinted.
 * @param {Object} params - Parameters for fetching catalog items.
 * @param {string} params.cookie - Cookie for authentication.
 * @param {string} [params.url] - The Vinted catalog URL whose query params should be reused.
 * @param {number} [params.per_page=20] - Number of items per page.
 * @param {string} [params.order] - Order of items.
 * @returns {Promise<Object>} - Promise resolving to the fetched catalog items.
 */
export async function fetchCatalogItems({ cookie, url = null, per_page = 20, order = null }) {
    return await executeWithDetailedHandling(async () => {
        const apiExtension = getVintedDomainExtension(url);
        const requestUrl = new URL(`https://www.vinted.${apiExtension}/api/v2/catalog/items`);
        requestUrl.search = buildCatalogItemsQueryParams({ url, per_page, order }).toString();

        const response = await RequestBuilder.get(requestUrl.toString())
                        .setNextProxy()
                        .setCookie(cookie)
                        .send();

        if (!response.success) {
            throw new NotFoundError("Error fetching catalog items.");
        }

        return { items: response.data.items };
    });
}
