// js/core/03-storage.js
// ===========================================
// STORAGE ADAPTER - localStorage with error handling
// ===========================================
// Provides: load, save, remove, makeId
// Legacy APIs: getSavedPeople, setSavedPeople, getSavedLocationsV1, setSavedLocationsV1
// ===========================================

(function() {
    'use strict';

    // ===========================================
    // STORAGE QUOTA MANAGEMENT
    // ===========================================
    const STORAGE_QUOTA_WARNING = 4.5 * 1024 * 1024; // 4.5MB warning threshold
    const STORAGE_QUOTA_ERROR = 4.8 * 1024 * 1024; // 4.8MB error threshold

    const getStorageSize = () => {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return total;
        } catch (e) {
            return 0;
        }
    };

    const checkStorageQuota = () => {
        const size = getStorageSize();
        if (size > STORAGE_QUOTA_ERROR) {
            console.error('[Storage] Quota exceeded:', size, 'bytes');
            return false;
        }
        if (size > STORAGE_QUOTA_WARNING) {
            console.warn('[Storage] Approaching quota:', size, 'bytes');
        }
        return true;
    };

    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================

    /**
     * Standardized High-Entropy ID Generator
     * @param {string} prefix - Optional prefix for the ID
     * @returns {string} Unique ID
     */
    const makeId = (prefix = 'id') => {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return `${prefix}_${crypto.randomUUID()}`;
            }
        } catch (e) {
            // Fall through to fallback
        }
        const ts = Date.now().toString(36);
        const perf = typeof performance !== 'undefined' ? performance.now().toString(36).replace('.', '') : '';
        const rnd = Math.random().toString(36).substring(2, 10);
        return `${prefix}_${ts}_${perf}_${rnd}`;
    };

    /**
     * Safe JSON parse with fallback
     * @param {string} raw - JSON string to parse
     * @param {*} fallback - Fallback value if parse fails
     * @returns {*} Parsed value or fallback
     */
    const safeParse = (raw, fallback = null) => {
        if (raw === null || raw === undefined) return fallback;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[Storage] Parse error:', e.message);
            return fallback;
        }
    };

    /**
     * Load value from localStorage
     * @param {string} key - Storage key
     * @param {*} fallback - Fallback value if key doesn't exist or parse fails
     * @returns {*} Stored value or fallback
     */
    const load = (key, fallback = null) => {
        if (!key || typeof key !== 'string') {
            console.warn('[Storage] Invalid key:', key);
            return fallback;
        }
        try {
            const item = localStorage.getItem(key);
            if (item === null || item === undefined) return fallback;
            return safeParse(item, fallback);
        } catch (e) {
            console.warn('[Storage] Load error:', key, e.message);
            return fallback;
        }
    };

    /**
     * Save value to localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to save
     * @returns {boolean} Success status
     */
    const save = (key, value) => {
        if (!key || typeof key !== 'string') {
            console.warn('[Storage] Invalid key:', key);
            return false;
        }
        if (!checkStorageQuota()) {
            console.error('[Storage] Cannot save - quota exceeded');
            return false;
        }
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.error('[Storage] Quota exceeded for key:', key);
                // Try to clean up old backups
                try {
                    const backupKey = `${key}_backup`;
                    localStorage.removeItem(backupKey);
                    localStorage.setItem(key, serialized);
                    return true;
                } catch (e2) {
                    console.error('[Storage] Cleanup failed:', e2);
                }
            }
            console.error('[Storage] Save error:', key, e.message);
            return false;
        }
    };

    /**
     * Remove value from localStorage
     * @param {string} key - Storage key to remove
     * @returns {boolean} Success status
     */
    const remove = (key) => {
        if (!key || typeof key !== 'string') return false;
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('[Storage] Remove error:', key, e.message);
            return false;
        }
    };

    // ===========================================
    // PEOPLE NORMALIZATION
    // ===========================================

    /**
     * Normalize a person object or string
     * @param {object|string} p - Person data
     * @returns {object|null} Normalized person or null
     */
    const normalizePerson = (p) => {
        // Handle string input
        if (typeof p === 'string') {
            const name = String(p || '').trim();
            if (!name) return null;
            
            // Auto-split name into firstName/lastName
            const parts = name.trim().split(/\s+/);
            let firstName = '';
            let lastName = '';
            if (parts.length === 1) {
                firstName = parts[0];
                lastName = '';
            } else {
                lastName = parts.pop();
                firstName = parts.join(' ');
            }
            
            return {
                id: makeId('p'),
                name,
                firstName,
                lastName,
                contact: '',
                tags: [],
                weight: 1,
                type: 'contact',
                phone: '',
                email: '',
                notes: '',
                links: [],
                compassLink: '',
                locationIds: [],
                isFavorite: false,
                lastContactDate: '',
                groups: [],
                relationships: [],
                notesHistory: [],
                company: '',
                jobTitle: '',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
                website: '',
                linkedin: '',
                twitter: '',
                profilePicture: '',
                profilePictureType: 'initials',
                createdAt: new Date().toISOString()
            };
        }
        // Handle object input
        if (p && typeof p === 'object') {
            // Support both firstName/lastName and name field
            let firstName = String(p.firstName || '').trim();
            let lastName = String(p.lastName || '').trim();
            let name = String(p.name || '').trim();
            
            // If we have firstName/lastName but no name, construct name
            if ((firstName || lastName) && !name) {
                name = [firstName, lastName].filter(Boolean).join(' ').trim();
            }
            
            // If we have name but no firstName/lastName, auto-split
            if (name && !firstName && !lastName) {
                const parts = name.trim().split(/\s+/);
                if (parts.length === 1) {
                    firstName = parts[0];
                    lastName = '';
                } else {
                    lastName = parts.pop();
                    firstName = parts.join(' ');
                }
            }
            
            if (!name) return null;
            const id = String(p.id || '').trim() || makeId('p');
            
            // Handle tags: can be string, array, or empty
            let tags = [];
            if (Array.isArray(p.tags)) {
                tags = p.tags.filter(Boolean).map(String);
            } else if (p.tags && String(p.tags).trim()) {
                tags = String(p.tags).trim().split(',').map(t => t.trim()).filter(Boolean);
            }
            
            // Handle links: can be string, array, or empty
            let links = [];
            if (Array.isArray(p.links)) {
                links = p.links.filter(Boolean).map(String);
            } else if (p.links && String(p.links).trim()) {
                links = [String(p.links).trim()];
            }
            
            return {
                id,
                name, // Keep name for backward compatibility
                firstName,
                lastName,
                contact: p.contact || '',
                tags: tags,
                weight: Number(p.weight) || 1,
                type: p.type || 'contact',
                phone: String(p.phone || '').trim(),
                email: String(p.email || '').trim(),
                notes: String(p.notes || '').trim(),
                links: links,
                compassLink: p.compassLink || p.compassCRM || p.crmLink || p.compassCrmLink || '',
                locationIds: Array.isArray(p.locationIds) ? p.locationIds.filter(Boolean) : [],
                isFavorite: Boolean(p.isFavorite),
                lastContactDate: String(p.lastContactDate || '').trim(),
                groups: Array.isArray(p.groups) ? p.groups.filter(Boolean) : [],
                relationships: Array.isArray(p.relationships) ? p.relationships.filter(Boolean) : [],
                notesHistory: Array.isArray(p.notesHistory) ? p.notesHistory.slice(-10) : [],
                externalId: String(p.externalId || '').trim(), // Compass CRM personId
                // Profile picture (DP) - same as profilePicture - preserve if exists
                profilePicture: p.profilePicture || p.dp || '',
                profilePictureType: p.profilePictureType || 'initials',
                createdAt: p.createdAt || new Date().toISOString(),
                updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
            };
        }
        return null;
    };

    /**
     * Normalize and deduplicate people array
     * Uses ID as primary key, falls back to name
     * @param {Array} arr - Array of people
     * @returns {Array} Normalized and deduplicated array
     */
    const normalizeSavedPeople = (arr) => {
        const list = Array.isArray(arr) ? arr : [];
        const mapById = new Map();
        const seenNames = new Set();
        
        list.map(normalizePerson).filter(Boolean).forEach(p => {
            // Primary: dedupe by ID
            if (!mapById.has(p.id)) {
                const nameLower = p.name.toLowerCase();
                // Also check name to avoid duplicates with different IDs
                if (!seenNames.has(nameLower)) {
                    mapById.set(p.id, p);
                    seenNames.add(nameLower);
                }
            }
        });
        return Array.from(mapById.values());
    };

    // ===========================================
    // LOCATIONS NORMALIZATION
    // ===========================================

    /**
     * Normalize a location object
     * Schema: { id, label, lat?, lon?, address?, type, notes, createdAt }
     * @param {object} loc - Location data
     * @returns {object|null} Normalized location or null
     */
    const normalizeLocation = (loc) => {
        if (!loc || typeof loc !== 'object') return null;
        
        // Support both 'label' and 'name' for backward compatibility
        const label = String(loc.label || loc.name || '').trim();
        if (!label) return null;
        
        const id = String(loc.id || '').trim() || makeId('loc');
        
        // Handle GPS coordinates - support both {lat, lon} object and separate fields
        let lat = null;
        let lon = null;
        if (loc.coords && typeof loc.coords === 'object') {
            lat = typeof loc.coords.lat === 'number' ? loc.coords.lat : (typeof loc.coords.lat === 'string' ? parseFloat(loc.coords.lat) : null);
            lon = typeof loc.coords.lon === 'number' ? loc.coords.lon : (typeof loc.coords.lon === 'string' ? parseFloat(loc.coords.lon) : null);
        } else if (loc.lat !== undefined || loc.lon !== undefined) {
            lat = typeof loc.lat === 'number' ? loc.lat : (typeof loc.lat === 'string' ? parseFloat(loc.lat) : null);
            lon = typeof loc.lon === 'number' ? loc.lon : (typeof loc.lon === 'string' ? parseFloat(loc.lon) : null);
        }
        
        // Only include lat/lon if both are valid numbers
        const hasValidCoords = lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);
        
        return {
            id,
            label,
            // Keep 'name' for backward compatibility
            name: label,
            lat: hasValidCoords ? lat : null,
            lon: hasValidCoords ? lon : null,
            address: String(loc.address || '').trim() || null,
            type: String(loc.type || 'client').trim(),
            notes: String(loc.notes || '').trim(),
            createdAt: loc.createdAt || new Date().toISOString()
        };
    };

    /**
     * Normalize and deduplicate locations array
     * Uses label (case-insensitive) as deduplication key
     * @param {Array} arr - Array of locations
     * @returns {Array} Normalized and deduplicated array
     */
    const normalizeSavedLocationsV1 = (arr) => {
        const list = Array.isArray(arr) ? arr : [];
        const map = new Map();
        list.map(normalizeLocation).filter(Boolean).forEach(l => {
            const key = (l.label || l.name || '').toLowerCase();
            if (!map.has(key)) map.set(key, l);
        });
        return Array.from(map.values());
    };

    // ===========================================
    // INITIALIZATION & MIGRATION
    // ===========================================

    let _initLiteDBComplete = false;

    /**
     * Initialize and normalize stored data
     * Runs once per session
     */
    const initLiteDB = () => {
        if (_initLiteDBComplete) return;
        _initLiteDBComplete = true;
        
        try {
            // Normalize people
            const rawPeople = load('savedPeople', null);
            if (rawPeople !== null) {
                const normalized = normalizeSavedPeople(rawPeople);
                if (normalized.length > 0 || Array.isArray(rawPeople)) {
                    save('savedPeople', normalized);
                }
            }
            
            // Normalize locations
            const rawLocs = load('savedLocations_v1', null);
            if (rawLocs !== null) {
                const normalized = normalizeSavedLocationsV1(rawLocs);
                if (normalized.length > 0 || Array.isArray(rawLocs)) {
                    save('savedLocations_v1', normalized);
                }
            }
        } catch (e) {
            console.warn('[Storage] Init error:', e);
        }
    };

    // Run initialization
    try {
        initLiteDB();
    } catch (e) {
        console.warn('[Storage] Init failed:', e);
    }

    // ===========================================
    // PUBLIC API - Core Functions
    // ===========================================

    window.load = load;
    window.save = save;
    window.remove = remove;
    window.makeId = makeId;

    // ===========================================
    // PUBLIC API - Legacy People Functions
    // ===========================================

    /**
     * Get saved people array
     * @returns {Array} Array of people objects
     */
    window.getSavedPeople = () => {
        const people = load('savedPeople', []);
        return Array.isArray(people) ? people : [];
    };

    /**
     * Set saved people array (with normalization)
     * @param {Array} arr - Array of people
     * @returns {boolean} Success status
     */
    window.setSavedPeople = (arr) => {
        const normalized = normalizeSavedPeople(arr);
        return save('savedPeople', normalized);
    };

    // ===========================================
    // PUBLIC API - Legacy Location Functions
    // ===========================================

    /**
     * Get saved locations array
     * @returns {Array} Array of location objects
     */
    window.getSavedLocationsV1 = () => {
        const locations = load('savedLocations_v1', []);
        return Array.isArray(locations) ? locations : [];
    };

    /**
     * Set saved locations array (with normalization)
     * @param {Array} arr - Array of locations
     * @returns {boolean} Success status
     */
    window.setSavedLocationsV1 = (arr) => {
        const normalized = normalizeSavedLocationsV1(arr);
        return save('savedLocations_v1', normalized);
    };

    console.log('✅ Storage loaded (v2.0 - Robust error handling)');

})();
