// js/04-utils.js
// Updated: 2025-12-19 (Roadmap Improvements Applied)
// ===========================================
// UTILITY FUNCTIONS & GEOLOCATION HANDLERS
// ===========================================
// Improvements:
// - Better ID generation
// - Enhanced time formatters
// - Improved geolocation caching
// ===========================================

// --- ID Generator ---
window.generateId = function(prefix = 'id') {
    // Use crypto.randomUUID if available (more entropy)
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return `${prefix}_${crypto.randomUUID()}`;
        }
    } catch (e) {}
    // Fallback with high entropy
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

// Enhanced: Human-readable duration (e.g., "2h 30m")
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

// Enhanced: Relative date formatting
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



window.fetchLocationName = async function(lat, lon) {
    // Round coords to ~11 meters to hit cache more often
    const kLat = parseFloat(lat).toFixed(4);
    const kLon = parseFloat(lon).toFixed(4);
    const cacheKey = `${kLat},${kLon}`;
    
    // 1. CHECK CACHE (Instant Load)
    const cache = getGeoCache();
    if (cache[cacheKey] && cache[cacheKey].name) {
        console.log('📍 Cache hit for location');
        return cache[cacheKey].name;
    }

    // 2. NETWORK FETCH (OpenStreetMap / Nominatim)
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'TaskTumbler-App/1.0' }
        });

        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        // 3. CLEAN UP ADDRESS
        let address = data.display_name || `${kLat}, ${kLon}`;
        
        // Try to construct a shorter, nicer name if components exist
        if (data.address) {
            const { road, house_number, neighbourhood, suburb, city, town, village } = data.address;
            const street = road ? `${house_number ? house_number + ' ' : ''}${road}` : null;
            const area = neighbourhood || suburb || city || town || village;
            
            if (street && area) address = `${street}, ${area}`;
            else if (street) address = street;
            else if (area) address = area;
        }

        // 4. SAVE TO CACHE with timestamp
        cache[cacheKey] = { name: address, ts: Date.now() };
        setGeoCache(cache);
        
        return address;

    } catch (error) {
        console.warn('Geo fetch failed:', error);
        // Fallback: Just return the coordinates so the user sees *something*
        return `${kLat}, ${kLon}`;
    }
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
// DEBOUNCE & THROTTLE UTILITIES
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
// DEEP EQUALITY CHECK (for #10 memoization)
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

console.log('✅ Utils loaded (Enhanced Location + Helpers)');
