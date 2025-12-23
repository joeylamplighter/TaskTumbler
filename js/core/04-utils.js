// js/04-utils.js
// Updated: 2025-12-20 (Fixed GEO_CACHE)
// ===========================================
// UTILITY FUNCTIONS & GEOLOCATION HANDLERS
// ===========================================

// --- ID Generator ---
window.generateId = function(prefix = 'id') {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return `${prefix}_${crypto.randomUUID()}`;
        }
    } catch (e) {}
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${ts}_${rnd}`;
};

// --- Time Formatters ---
window.formatDuration = function(totalSeconds) {
    if (!totalSeconds) return '0:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

window.formatDurationHuman = function(totalSeconds) {
    if (!totalSeconds || totalSeconds < 0) return '0m';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
};

window.formatTime = function(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

window.formatDate = function(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
};

window.formatRelativeDate = function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.ceil(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

window.toMinutes = function(val, unit) {
    const v = parseInt(val) || 0;
    if (unit === 'hours' || unit === 'h') return v * 60;
    if (unit === 'days' || unit === 'd') return v * 1440;
    return v;
};

// ===========================================
// GEO CACHE (FIX: Define before use)
// ===========================================
const GEO_CACHE_KEY = 'geo_cache';

function getGeoCache() {
    try {
        return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
    } catch {
        return {};
    }
}

function setGeoCache(cache) {
    try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch {}
}

// Export for other files if needed
window.getGeoCache = getGeoCache;
window.setGeoCache = setGeoCache;

// ===========================================
// GEOLOCATION FETCH - Returns detailed location data
// ===========================================
window.fetchLocationName = async function(lat, lon) {
    const kLat = parseFloat(lat).toFixed(4);
    const kLon = parseFloat(lon).toFixed(4);
    const cacheKey = `${kLat},${kLon}`;
    
    // 1. CHECK CACHE
    const cache = getGeoCache();
    // Check if we have full cached data
    if (cache[cacheKey] && cache[cacheKey].resolvedAddress) {
        console.log('📍 Cache hit for location');
        // Return object if cached data exists, string for backward compatibility
        return cache[cacheKey];
    }

    // 2. NETWORK FETCH (OpenStreetMap / Nominatim)
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'TaskTumbler-App/1.0' }
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Extract full display name
        const fullAddress = data.display_name || `${kLat}, ${kLon}`;
        
        // Extract simplified address
        let shortAddress = fullAddress;
        if (data.address) {
            const { road, house_number, neighbourhood, suburb, city, town, village, state, country } = data.address;
            const street = road ? `${house_number ? house_number + ' ' : ''}${road}` : null;
            const area = neighbourhood || suburb || city || town || village;
            
            if (street && area) shortAddress = `${street}, ${area}`;
            else if (street) shortAddress = street;
            else if (area) shortAddress = area;
        }

        // Build location data object
        const locationData = {
            // For backward compatibility - return string when used as string
            toString: () => shortAddress,
            valueOf: () => shortAddress,
            // Full location data
            resolvedAddress: fullAddress,
            shortAddress: shortAddress,
            coordinates: {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                latFormatted: kLat,
                lonFormatted: kLon
            },
            // Google Maps link
            googleMapsLink: `https://www.google.com/maps?q=${lat},${lon}`,
            // Raw OSM data for reference
            osmData: data.address || {}
        };

        // 4. SAVE TO CACHE
        cache[cacheKey] = {
            ...locationData,
            ts: Date.now()
        };
        setGeoCache(cache);
        
        return locationData;

    } catch (error) {
        console.warn('Geo fetch failed:', error);
        const fallback = `${kLat}, ${kLon}`;
        return {
            toString: () => fallback,
            valueOf: () => fallback,
            resolvedAddress: fallback,
            shortAddress: fallback,
            coordinates: {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                latFormatted: kLat,
                lonFormatted: kLon
            },
            googleMapsLink: `https://www.google.com/maps?q=${lat},${lon}`,
            osmData: {}
        };
    }
};

// Helper to generate Google Maps link from coordinates
window.getGoogleMapsLink = function(lat, lon) {
    if (!lat || !lon) return null;
    return `https://www.google.com/maps?q=${lat},${lon}`;
};

// --- Array/Object Helpers ---
window.load = function(key, defaultVal) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
};

window.save = function(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Save failed', e);
    }
};

// ===========================================
// DEBOUNCE & THROTTLE
// ===========================================
window.debounce = function(fn, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
};

window.throttle = function(fn, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ===========================================
// DEEP EQUALITY CHECK
// ===========================================
window.deepEqual = function(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, i) => window.deepEqual(item, b[i]));
    }
    
    if (typeof a === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => window.deepEqual(a[key], b[key]));
    }
    
    return false;
};

// ===========================================
// COMPASS CRM PASSTHROUGH LINKER
// ===========================================
/**
 * Opens Compass CRM links for a person
 * @param {string|object} personOrId - Person object or externalId string
 * @param {string} action - Action target: 'profile', 'notes', 'email', 'bizTracker', 'listings', 'tasks'
 * @param {string} fallbackName - Name to use for search fallback
 */
window.openCompass = function(personOrId, action = 'profile', fallbackName = '') {
    let externalId = '';
    let personName = fallbackName;
    
    // Handle both person object and externalId string
    if (typeof personOrId === 'string') {
        externalId = personOrId.trim();
    } else if (personOrId && typeof personOrId === 'object') {
        externalId = String(personOrId.externalId || '').trim();
        personName = personName || personOrId.name || 
                    [personOrId.firstName, personOrId.lastName].filter(Boolean).join(' ') || '';
    }
    
    // Base Compass URL
    const baseUrl = 'https://www.compass.com/app';
    
    // Action targets
    const targets = {
        profile: `/contacts/profile/${externalId}`,
        notes: `/contacts/profile/${externalId}/notes`,
        email: `/contacts/profile/${externalId}/email`,
        bizTracker: `/contacts/profile/${externalId}/biz-tracker`,
        listings: `/contacts/profile/${externalId}/listings`,
        tasks: `/contacts/profile/${externalId}/tasks`,
        transactions: `/contacts/profile/${externalId}/transactions`,
        documents: `/contacts/profile/${externalId}/documents`
    };
    
    // If we have externalId, use direct link
    if (externalId) {
        const path = targets[action] || targets.profile;
        const url = `${baseUrl}${path}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return url;
    }
    
    // Fallback: search by name
    if (personName) {
        const searchUrl = `${baseUrl}/contacts/?q=${encodeURIComponent(personName)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        return searchUrl;
    }
    
    // Ultimate fallback: just open contacts
    const fallbackUrl = `${baseUrl}/contacts/`;
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    return fallbackUrl;
};

console.log('✅ 04-utils.js loaded (GEO_CACHE Fixed + Compass CRM Linker)');
