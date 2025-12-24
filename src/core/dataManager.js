// src/core/dataManager.js
// ===========================================
// CENTRALIZED DATA MANAGER
// Single source of truth for ALL app data
// ===========================================

// TASK EVENTS (History feed)
(function(){
  const KEY = "taskEvents_v1";

  function safeParse(v, fallback) {
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function getEvents() {
    if (window.DataManager?.history?.getAll) return window.DataManager.history.getAll() || [];
    return safeParse(localStorage.getItem(KEY) || "[]", []);
  }

  function setEvents(list) {
    if (window.DataManager?.history?.setAll) return window.DataManager.history.setAll(list);
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("history-updated"));
    window.dispatchEvent(new Event("stats-updated"));
  }

  function addEvent(evt) {
    const list = Array.isArray(getEvents()) ? getEvents() : [];
    setEvents([evt, ...list]);
  }

  window.TaskEvents = {
    KEY,
    getAll: getEvents,
    add: addEvent,
    log(task, type, meta = {}) {
      const t = task || {};
      const taskId = t.id || meta.taskId;
      if (!taskId) return;

      const now = new Date();
      const entry = {
        id: "te_" + now.getTime() + "_" + Math.random().toString(16).slice(2),
        ts: now.toISOString(),
        type,
        taskId,
        title: t.title || meta.title || "",
        category: t.category || meta.category || "",
        priority: t.priority || meta.priority || "",
        meta: meta || {}
      };

      addEvent(entry);
      return entry;
    }
  };
})();

// DATA MANAGER
(function() {
    'use strict';

    const makeId = () => {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        } catch (e) {}
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    };

    const safeParse = (raw, fallback = null) => {
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    };

    const DATA_VERSION = '1.0.0';
    const VERSION_KEY = 'tt_data_version';
    
    const getDataVersion = () => {
        try {
            return localStorage.getItem(VERSION_KEY) || '0.0.0';
        } catch {
            return '0.0.0';
        }
    };
    
    const setDataVersion = (version) => {
        try {
            localStorage.setItem(VERSION_KEY, version);
        } catch {}
    };
    
    const migrateData = (version) => {
        const current = getDataVersion();
        if (current === version) return;
        setDataVersion(version);
    };
    
    if (getDataVersion() !== DATA_VERSION) {
        migrateData(DATA_VERSION);
    }

    const deepEqual = (a, b) => {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        
        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (Array.isArray(a[key]) && Array.isArray(b[key])) {
                if (a[key].length !== b[key].length) return false;
                for (let i = 0; i < a[key].length; i++) {
                    if (!deepEqual(a[key][i], b[key][i])) return false;
                }
            } else if (typeof a[key] === 'object' && typeof b[key] === 'object') {
                if (!deepEqual(a[key], b[key])) return false;
            } else if (a[key] !== b[key]) {
                return false;
            }
        }
        return true;
    };

    const createBackup = (key, value) => {
        try {
            const backupKey = `${key}_backup`;
            const backup = localStorage.getItem(key);
            if (backup !== null) {
                localStorage.setItem(backupKey, backup);
            }
        } catch (e) {
            console.warn('[DataManager] Backup creation failed:', key, e);
        }
    };
    
    const restoreBackup = (key) => {
        try {
            const backupKey = `${key}_backup`;
            const backup = localStorage.getItem(backupKey);
            if (backup !== null) {
                localStorage.setItem(key, backup);
                return safeParse(backup, null);
            }
        } catch (e) {
            console.warn('[DataManager] Backup restore failed:', key, e);
        }
        return null;
    };

    const saveQueue = new Map();
    let saveTimeout = null;
    
    const processSaveQueue = () => {
        if (saveQueue.size === 0) return;
        
        const entries = Array.from(saveQueue.entries());
        saveQueue.clear();
        
        entries.forEach(([key, entry]) => {
            if (entry.processing) return;
            entry.processing = true;
            
            try {
                createBackup(key, entry.pending);
                
                const current = localStorage.getItem(key);
                if (current !== null) {
                    const currentParsed = safeParse(current, null);
                    if (currentParsed !== null && deepEqual(currentParsed, entry.pending)) {
                        entry.processing = false;
                        return;
                    }
                }
                
                localStorage.setItem(key, JSON.stringify(entry.pending));
                entry.processing = false;
            } catch (e) {
                console.error('[DataManager] Queued save error:', key, e);
                entry.processing = false;
                
                const restored = restoreBackup(key);
                if (restored !== null) {
                    console.warn('[DataManager] Restored from backup:', key);
                }
            }
        });
    };
    
    const queueSave = (key, value) => {
        saveQueue.set(key, { pending: value, processing: false });
        
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(processSaveQueue, 50);
    };

    const loadFromStorage = (key, fallback = null) => {
        try {
            const item = localStorage.getItem(key);
            if (item === null || item === undefined) return fallback;
            return safeParse(item, fallback);
        } catch (e) {
            console.warn('[DataManager] Load error:', key, e);
            const restored = restoreBackup(key);
            if (restored !== null) return restored;
            return fallback;
        }
    };

    const saveToStorage = (key, value) => {
        queueSave(key, value);
        return true;
    };

    const EventBus = {
        _listeners: {},
        subscribe(event, callback) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(callback);
            return () => { this._listeners[event] = this._listeners[event].filter(cb => cb !== callback); };
        },
        emit(event, data) {
            if (this._listeners[event]) {
                this._listeners[event].forEach(cb => { 
                    try { cb(data); } 
                    catch (e) { console.error('[DataManager] Event error:', e); } 
                });
            }
            window.dispatchEvent(new CustomEvent(event, { detail: data }));
        },
        subscribeMany(events, callback) {
            const unsubs = events.map(e => this.subscribe(e, callback));
            return () => unsubs.forEach(fn => fn());
        }
    };

    function createCollection(config) {
        const { storageKey, eventName, normalize = (item) => item, dedupe = null, defaults = [] } = config;
        let _cache = null;

        return {
            STORAGE_KEY: storageKey,
            EVENT_NAME: eventName,
            getAll() {
                if (_cache !== null) return _cache;
                const raw = loadFromStorage(storageKey, defaults);
                let items = Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : defaults;
                if (dedupe) items = dedupe(items);
                _cache = items;
                return _cache;
            },
            getById(id) { return this.getAll().find(item => item.id === id) || null; },
            setAll(items) {
                const normalized = Array.isArray(items) ? items.map(normalize).filter(Boolean) : [];
                _cache = dedupe ? dedupe(normalized) : normalized;
                saveToStorage(storageKey, _cache);
                EventBus.emit(eventName, _cache);
                EventBus.emit('data-changed', { type: storageKey, data: _cache });
                return _cache;
            },
            add(item) {
                const normalized = normalize(item);
                if (!normalized) return null;
                if (!normalized.id) normalized.id = makeId();
                const all = [...this.getAll(), normalized];
                this.setAll(all);
                return normalized;
            },
            update(id, updates) {
                const all = this.getAll();
                const index = all.findIndex(item => item.id === id);
                if (index === -1) return null;
                const updated = normalize({ ...all[index], ...updates, id });
                if (!updated) return null;
                all[index] = updated;
                this.setAll(all);
                return updated;
            },
            remove(id) {
                const all = this.getAll();
                const filtered = all.filter(item => item.id !== id);
                if (filtered.length === all.length) return false;
                this.setAll(filtered);
                return true;
            },
            invalidate() { _cache = null; },
            subscribe(callback) { return EventBus.subscribe(eventName, callback); }
        };
    }

    const normalizeTask = (t) => {
        if (!t || typeof t !== 'object') return null;
        const title = String(t.title || '').trim();
        if (!title) return null;
        
        const rawPercent = Number(t.percentComplete) || 0;
        const percentComplete = Math.round(Math.max(0, Math.min(100, rawPercent)));
        
        return {
            id: t.id || makeId(),
            title,
            category: t.category || 'Work',
            priority: t.priority || 'Medium',
            weight: Number(t.weight) || 10,
            completed: Boolean(t.completed),
            estimatedTime: t.estimatedTime || '',
            estimatedTimeUnit: t.estimatedTimeUnit || 'min',
            startDate: t.startDate || '',
            startTime: t.startTime || '',
            dueDate: (() => {
                const date = t.dueDate;
                if (!date || date === '') return '';
                if (typeof date === 'string') {
                    const parsed = new Date(date);
                    if (!isNaN(parsed.getTime())) {
                        return parsed.toISOString().split('T')[0];
                    }
                }
                return '';
            })(),
            dueTime: t.dueTime || '',
            reminderMode: t.reminderMode || 'none',
            reminderAnchor: t.reminderAnchor || 'due',
            reminderOffsetValue: t.reminderOffsetValue || 1,
            reminderOffsetUnit: t.reminderOffsetUnit || 'hours',
            recurring: t.recurring || 'None',
            excludeFromTumbler: Boolean(t.excludeFromTumbler),
            subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
            tags: Array.isArray(t.tags) ? t.tags.filter(Boolean) : [],
            people: Array.isArray(t.people) ? t.people.filter(Boolean) : [],
            blockedBy: Array.isArray(t.blockedBy) ? t.blockedBy : [],
            goalId: t.goalId || null,
            location: t.location || '',
            locationCoords: t.locationCoords || null,
            percentComplete,
            createdAt: t.createdAt || new Date().toISOString(),
            completedAt: t.completedAt || null,
            actualTime: Number(t.actualTime) || 0,
            lastModified: t.lastModified || new Date().toISOString(),
            subtype: t.subtype || null
        };
    };

    const normalizeGoal = (g) => {
        if (!g || typeof g !== 'object') return null;
        const title = String(g.title || '').trim();
        if (!title) return null;
        return {
            id: g.id || makeId(),
            title,
            description: g.description || '',
            category: g.category || 'General',
            target: Number(g.target) || 0,
            progress: Number(g.progress) || 0,
            createdAt: g.createdAt || new Date().toISOString(),
        };
    };

    const normalizeCategory = (c) => {
        if (typeof c === 'string') {
            const v = c.trim();
            return v ? v : null;
        }
        if (!c || typeof c !== 'object') return null;
        const name = String(c.name || c.title || '').trim();
        return name ? name : null;
    };

    const normalizeActivity = (a) => {
        if (!a || typeof a !== 'object') return null;
        const title = String(a.title || a.name || '').trim();
        if (!title) return null;
        const activityType = (a.type !== undefined && a.type !== null && String(a.type).trim() !== '') 
            ? String(a.type).trim() 
            : 'log';
        return {
            id: a.id || makeId(),
            title,
            category: a.category || 'General',
            duration: Number(a.duration) || 0,
            type: activityType,
            taskId: a.taskId || null,
            people: Array.isArray(a.people) ? a.people.filter(Boolean) : (a.people ? [String(a.people)] : []),
            locationLabel: a.locationLabel || a.location || '',
            locationCoords: a.locationCoords || null,
            locationId: a.locationId || null,
            createdAt: a.createdAt || a.timestamp || new Date().toISOString(),
        };
    };

    const normalizeNote = (n) => {
        if (!n || typeof n !== 'object') return null;
        const text = String(n.text || n.note || '').trim();
        if (!text) return null;
        return {
            id: n.id || makeId(),
            text,
            createdAt: n.createdAt || new Date().toISOString(),
        };
    };

    const normalizeSettings = (s) => (s && typeof s === 'object') ? s : {};
    const normalizeTimerState = (t) => (t && typeof t === 'object') ? t : {
        isRunning: false,
        startTime: null,
        storedTime: 0,
        activityName: 'Tracked Session'
    };
    const normalizeScratchpad = (v) => (typeof v === 'string') ? v : '';

    const normalizePerson = (p) => {
        if (!p || typeof p !== 'object') return null;
        
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
            id: p.id || makeId(),
            name, // Keep name for backward compatibility
            firstName,
            lastName,
            type: p.type || 'contact',
            phone: String(p.phone || '').trim(),
            email: String(p.email || '').trim(),
            notes: String(p.notes || '').trim(),
            links: links,
            tags: tags,
            weight: Number(p.weight) || 1,
            compassCrmLink: String(p.compassCrmLink || p.compassLink || p.compassCRM || p.crmLink || '').trim(),
            locationIds: Array.isArray(p.locationIds) ? p.locationIds.filter(Boolean) : [],
            isFavorite: Boolean(p.isFavorite),
            lastContactDate: String(p.lastContactDate || '').trim(),
            groups: Array.isArray(p.groups) ? p.groups.filter(Boolean) : [],
            relationships: Array.isArray(p.relationships) ? p.relationships.filter(Boolean) : [],
            notesHistory: Array.isArray(p.notesHistory) ? p.notesHistory : [],
            externalId: String(p.externalId || '').trim(), // Compass CRM personId
            // Profile picture (DP) - same as profilePicture - preserve if exists
            profilePicture: p.profilePicture || p.dp || '',
            profilePictureType: p.profilePictureType || 'initials',
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
        };
    };

    const Tasks = createCollection({
        storageKey: 'tasks',
        eventName: 'tasks-updated',
        normalize: normalizeTask,
        dedupe: (list) => {
            const map = new Map();
            for (const item of list) { if (item.id && !map.has(item.id)) map.set(item.id, item); }
            return Array.from(map.values());
        }
    });

    const Goals = createCollection({
        storageKey: 'goals',
        eventName: 'goals-updated',
        normalize: normalizeGoal
    });

    const Categories = createCollection({
        storageKey: 'categories',
        eventName: 'categories-updated',
        normalize: normalizeCategory,
        defaults: ['Work', 'Personal', 'Errands', 'Health', 'Fun']
    });

    const Activities = createCollection({
        storageKey: 'activities',
        eventName: 'activities-updated',
        normalize: normalizeActivity
    });

    const SavedNotes = createCollection({
        storageKey: 'savedNotes',
        eventName: 'notes-updated',
        normalize: normalizeNote
    });

    const makeSingleton = (storageKey, eventName, normalize, defaults) => {
        let _cache = null;
        return {
            STORAGE_KEY: storageKey,
            EVENT_NAME: eventName,
            get() {
                if (_cache !== null) return _cache;
                _cache = normalize(loadFromStorage(storageKey, defaults));
                return _cache;
            },
            set(value) {
                _cache = normalize(value);
                saveToStorage(storageKey, _cache);
                EventBus.emit(eventName, _cache);
                EventBus.emit('data-changed', { type: storageKey, data: _cache });
                return _cache;
            },
            invalidate() { _cache = null; },
            subscribe(callback) { return EventBus.subscribe(eventName, callback); }
        };
    };

    const Settings = makeSingleton('settings', 'settings-updated', normalizeSettings, {});
    const UserStats = makeSingleton('userStats', 'userStats-updated', normalizeSettings, { xp: 0, level: 1 });
    const TimerState = makeSingleton('timerState', 'timerState-updated', normalizeTimerState, null);
    const Scratchpad = makeSingleton('scratchpad', 'scratchpad-updated', normalizeScratchpad, '');

    const People = createCollection({
        storageKey: 'savedPeople',
        eventName: 'people-updated',
        normalize: normalizePerson,
        dedupe: (list) => {
            const map = new Map();
            for (const item of list) { 
                if (item && item.id && !map.has(item.id)) {
                    map.set(item.id, item); 
                }
            }
            return Array.from(map.values());
        }
    });

    const DataManager = {
        tasks: Tasks,
        goals: Goals,
        categories: Categories,
        activities: Activities,
        savedNotes: SavedNotes,
        settings: Settings,
        userStats: UserStats,
        timerState: TimerState,
        scratchpad: Scratchpad,
        people: People,
        events: EventBus,
        makeId,
        version: DATA_VERSION,
        getDataVersion,
        restoreBackup: (key) => restoreBackup(key)
    };

    const batchUpdate = (updates) => {
        const results = {};
        try {
            Object.keys(updates).forEach(key => {
                const collection = DataManager[key];
                if (collection && typeof updates[key] === 'function') {
                    const current = collection.getAll ? collection.getAll() : collection.get ? collection.get() : null;
                    const updated = updates[key](current);
                    if (collection.setAll) {
                        results[key] = collection.setAll(updated);
                    } else if (collection.set) {
                        results[key] = collection.set(updated);
                    }
                }
            });
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                processSaveQueue();
            }
            return results;
        } catch (e) {
            console.error('[DataManager] Batch update error:', e);
            return results;
        }
    };
    
    DataManager.batchUpdate = batchUpdate;

    window.DataManager = DataManager;
    window.normalizeTask = normalizeTask;

    console.log('✅ DataManager loaded');
})();

