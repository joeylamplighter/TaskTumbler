// src/core/storage.js
// ===========================================
// LOCAL STORAGE UTILITIES
// ===========================================

const makeId = (prefix = 'id') => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return `${prefix}_${crypto.randomUUID()}`;
        }
    } catch (e) {
        console.warn('crypto.randomUUID not available, using fallback:', e);
    }
    const ts = Date.now().toString(36);
    const perf = typeof performance !== 'undefined' ? performance.now().toString(36).replace('.', '') : '';
    const rnd = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${ts}_${perf}_${rnd}`;
};

const safeParse = (raw, fallback = null) => {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
};

const load = (key, fallback = null) => {
    try {
        const item = localStorage.getItem(key);
        if (item === null || item === undefined) return fallback;
        return safeParse(item, fallback);
    } catch (e) {
        console.warn('Load error:', key, e);
        return fallback;
    }
};

const save = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Save error:', key, e);
        return false;
    }
};

const remove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn('Remove error:', key, e);
    }
};

const normalizePerson = (p) => {
    if (typeof p === 'string') {
        const name = String(p || '').trim();
        if (!name) return null;
        return { id: makeId('p'), name, contact: '', tags: [], weight: 1, profilePicture: '', profilePictureType: 'initials' };
    }
    if (p && typeof p === 'object') {
        const name = String(p.name || '').trim();
        if (!name) return null;
        const id = String(p.id || '').trim() || makeId('p');
        // Preserve profilePicture (DP) - support both profilePicture and dp field names
        const profilePicture = String(p.profilePicture || p.dp || '').trim();
        const profilePictureType = p.profilePictureType || 'initials';
        return { 
            id, 
            name, 
            contact: p.contact || '', 
            tags: p.tags || [], 
            weight: p.weight || 1,
            profilePicture,
            profilePictureType
        };
    }
    return null;
};

const normalizeSavedPeople = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    const mapById = new Map();
    const seenNames = new Set();
    
    list.map(normalizePerson).filter(Boolean).forEach(p => {
        if (!mapById.has(p.id)) {
            const nameLower = p.name.toLowerCase();
            if (!seenNames.has(nameLower)) {
                mapById.set(p.id, p);
                seenNames.add(nameLower);
            }
        }
    });
    return Array.from(mapById.values());
};

const normalizeLocation = (loc) => {
    if (!loc || typeof loc !== 'object') return null;
    const name = String(loc.name || '').trim();
    if (!name) return null;
    const id = String(loc.id || '').trim() || makeId('loc');
    return { 
        id, 
        name, 
        coords: loc.coords || null,
        address: loc.address || '',
        type: loc.type || 'client',
        createdAt: loc.createdAt || new Date().toISOString()
    };
};

const normalizeSavedLocationsV1 = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    const map = new Map();
    list.map(normalizeLocation).filter(Boolean).forEach(l => {
        const key = l.name.toLowerCase();
        if (!map.has(key)) map.set(key, l);
    });
    return Array.from(map.values());
};

let _initLiteDBComplete = false;

const initLiteDB = () => {
    if (_initLiteDBComplete) {
        return;
    }
    _initLiteDBComplete = true;
    
    try {
        const rawPeople = load('savedPeople', null);
        if (rawPeople !== null) {
            save('savedPeople', normalizeSavedPeople(rawPeople));
        }
        
        const rawLocs = load('savedLocations_v1', null);
        if (rawLocs !== null) {
            save('savedLocations_v1', normalizeSavedLocationsV1(rawLocs));
        }
    } catch (e) {
        console.warn('Lite DB init error:', e);
    }
};

try { initLiteDB(); } catch (e) { console.warn('Lite DB init failed:', e); }

window.load = load;
window.save = save;
window.remove = remove;
window.makeId = makeId;
window.getSavedPeople = () => load('savedPeople', []);
window.setSavedPeople = (arr) => save('savedPeople', normalizeSavedPeople(arr));
window.getSavedLocationsV1 = () => load('savedLocations_v1', []);
window.setSavedLocationsV1 = (arr) => save('savedLocations_v1', normalizeSavedLocationsV1(arr));

console.log('✅ Storage loaded');

