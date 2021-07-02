/* global request: false empty: false */
'use strict';

/**
 * @module models/authToken
 */

/**
 * @typedef  {Object} tokenObj Represents the tokenObject provided by the Salesforce Platform
 * @property {String} access_token Describes if the current customer represents a newCustomer
 * @property {String} issued_at Describes if the current customer represents a newCustomer
 */

/**
 * The limit is 10 minutes (10 * (60 * 1000 milliseconds))
 * This is used to refresh the token only if the token is expired or will expire in the next 10 minutes
 * @type {Number}
 */
var EXPIRE_LIMIT = 10 * 60 * 1000;

/**
 * Returns whether the stored token is valid (exist and not expired)
 *
 * @param {Object} tokenObj The token object retrieved from the auth API response
 * @returns {Boolean} Whether the token is valid and not expired
 */
function isValidAuth(tokenObj) {
    // The auth is valid if:
    // - the token object exists
    // - and the access token exists
    // - and the issued_at value exists
    // - and the issued_at plus the expire limit value is not yet exceed
    return !(!tokenObj || !tokenObj.access_token || !tokenObj.issued_at || Date.now() >= (tokenObj.issued_at + EXPIRE_LIMIT));
}

/**
 * Gets a valid token from storage or from a new auth request
 *
 * @param {Boolean} bypassCache If true, then the authentication token will be retrieved from the Salesforce Core Platform, not from the cache
 * @returns {Object} Plain JS object containing the token response. If the token is not valid or not found, throw an error
 */
function getValidToken(bypassCache) {

    // Initialize local variables
    var cache,
        cacheKey,
        tokenObj;

    // Pull the cache using the customCacheKey
    cache = require('dw/system/CacheMgr').getCache(require('../b2ccrmsync.config').customCacheID);

    // Cache the token per site, per locale
    // This is useful in case the integration is per country
    cacheKey = [require('dw/system/Site').getCurrent().getID(), request.locale, 'auth'].join('_');

    // In case we need to bypass the cache, let's remove the value from the cache, so that the cache loader function will be executed
    if (bypassCache) {
        cache.invalidate(cacheKey);
    }

    // Retrieve the token from the in-memory cache
    tokenObj = cache.get(cacheKey, function requestAuthToken() {
        // In case the token does not exist in the cache, then retrieve it from the API, and store it
        var svc = require('../services/ServiceMgr').getAuthService();
        var result = svc.call();
        if (result.status === 'OK' && !empty(result.object)) {
            // In case the auth token has been retrieved, then return it, so that it will be cached in the CacheMgr
            return result.object;
        }

        // Exit early
        return undefined;

    });

    // Was an authToken found?  If not, throw an error
    if (!isValidAuth(tokenObj)) {
        throw new Error('No auth token available, please verify your configuration!');
    }

    // Return the tokenObject
    return tokenObj;

}

module.exports.getValidToken = getValidToken;
