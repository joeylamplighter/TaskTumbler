// js/core/03-data-manager.js
// ===========================================
// CENTRALIZED DATA MANAGER
// Single source of truth for ALL app data
// ===========================================
// Features:
// - Schema defaults and migrations
// - Race condition protection with queue system
// - Deep equality checks before save
// - LocalStorage backup system
// - Event bus for data change notifications
// - Collections: tasks, goals, categories, activities, notes, people, locations, history, stats
// ===========================================

(function() {
    'use strict';

    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================
    
    const makeId = () => {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
        } catch (e) {
            // Fall through to fallback
        }
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    };

    const safeParse = (raw, fallback = null) => {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    };

    // ===========================================
    // DATA VERSIONING & MIGRATIONS
    // ===========================================
    const DATA_VERSION = '2.0.0';
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
        } catch (e) {
            console.warn('[DataManager] Failed to set version:', e);
        }
    };
    
    /**
     * Migration handler - extensible for future versions
     * @param {string} targetVersion - Target version to migrate to
     */
    const migrateData = (targetVersion) => {
        const current = getDataVersion();
        if (current === targetVersion) return;
        
        console.log(`[DataManager] Migrating from ${current} to ${targetVersion}`);
        
        try {
            // Migration 1.0.0 -> 2.0.0: Ensure all collections have proper defaults
            if (current < '2.0.0') {
                // Migrate tasks to ensure all have required fields
                const tasks = safeParse(localStorage.getItem('tasks') || '[]', []);
                if (Array.isArray(tasks) && tasks.length > 0) {
                    const migrated = tasks.map(t => {
                        if (!t.actualTime) t.actualTime = 0;
                        if (!t.lastModified) t.lastModified = t.createdAt || new Date().toISOString();
                        if (t.percentComplete !== undefined) {
                            t.percentComplete = Math.round(Math.max(0, Math.min(100, Number(t.percentComplete) || 0)));
                        }
                        return t;
                    });
                    localStorage.setItem('tasks', JSON.stringify(migrated));
                }
                
                // Migrate userStats to ensure structure
                const stats = safeParse(localStorage.getItem('userStats') || '{}', {});
                if (!stats.xp) stats.xp = 0;
                if (!stats.level) stats.level = 1;
                localStorage.setItem('userStats', JSON.stringify(stats));
            }
            
            // Future migrations can be added here
            // Example: if (current < '2.1.0') { ... }
            
            setDataVersion(targetVersion);
            console.log(`[DataManager] Migration complete: ${targetVersion}`);
        } catch (e) {
            console.error('[DataManager] Migration error:', e);
        }
    };
    
    // Initialize version on first load
    if (getDataVersion() !== DATA_VERSION) {
        migrateData(DATA_VERSION);
    }

    // ===========================================
    // DATA VALIDATION & RECOVERY
    // ===========================================

    /**
     * Validate task structure
     * @param {*} task - Task to validate
     * @returns {object|null} Validated task or null if invalid
     */
    const validateTask = (task) => {
        if (!task || typeof task !== 'object') return null;
        if (!task.title || typeof task.title !== 'string' || !task.title.trim()) return null;
        if (task.id && typeof task.id !== 'string') return null;
        // Check for required fields that should exist
        if (task.percentComplete !== undefined) {
            const pc = Number(task.percentComplete);
            if (isNaN(pc) || pc < 0 || pc > 100) return null;
        }
        if (task.weight !== undefined) {
            const w = Number(task.weight);
            if (isNaN(w) || w < 0) return null;
        }
        return task;
    };

    /**
     * Validate category structure
     * @param {*} category - Category to validate
     * @returns {string|null} Validated category name or null
     */
    const validateCategory = (category) => {
        if (typeof category === 'string') {
            const trimmed = category.trim();
            return trimmed ? trimmed : null;
        }
        if (category && typeof category === 'object') {
            const name = String(category.name || category.title || '').trim();
            return name ? name : null;
        }
        return null;
    };

    /**
     * Validate settings structure
     * @param {*} settings - Settings to validate
     * @returns {object} Validated settings with defaults
     */
    const validateSettings = (settings) => {
        if (!settings || typeof settings !== 'object') {
            return window.DEFAULT_SETTINGS || {};
        }
        
        // Ensure critical settings exist
        const defaults = window.DEFAULT_SETTINGS || {};
        const validated = { ...defaults, ...settings };
        
        // Validate specific fields
        if (typeof validated.theme !== 'string') validated.theme = defaults.theme || 'dark';
        if (typeof validated.visibleTabs !== 'object') validated.visibleTabs = defaults.visibleTabs || {};
        if (typeof validated.priorityMultipliers !== 'object') validated.priorityMultipliers = defaults.priorityMultipliers || {};
        if (typeof validated.categoryMultipliers !== 'object') validated.categoryMultipliers = defaults.categoryMultipliers || {};
        if (typeof validated.categoryXpAdjust !== 'object') validated.categoryXpAdjust = defaults.categoryXpAdjust || {};
        
        // Deep merge navBarVisibleItems - defaults take precedence to override old saved values
        if (typeof defaults.navBarVisibleItems === 'object' && defaults.navBarVisibleItems !== null) {
            validated.navBarVisibleItems = { ...(validated.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
        } else if (typeof validated.navBarVisibleItems !== 'object') {
            validated.navBarVisibleItems = defaults.navBarVisibleItems || {};
        }
        
        // Ensure headerQuickNavItems defaults are always present
        if (Array.isArray(defaults.headerQuickNavItems) && defaults.headerQuickNavItems.length > 0) {
            // If stored settings don't have quickNavItems or it's empty, use defaults
            if (!Array.isArray(validated.headerQuickNavItems) || validated.headerQuickNavItems.length === 0) {
                validated.headerQuickNavItems = [...defaults.headerQuickNavItems];
            }
        } else if (!Array.isArray(validated.headerQuickNavItems)) {
            validated.headerQuickNavItems = [];
        }
        
        // Ensure navItemsOrder defaults are always present
        if (Array.isArray(defaults.navItemsOrder) && defaults.navItemsOrder.length > 0) {
            if (!Array.isArray(validated.navItemsOrder) || validated.navItemsOrder.length === 0) {
                validated.navItemsOrder = [...defaults.navItemsOrder];
            }
        } else if (!Array.isArray(validated.navItemsOrder)) {
            validated.navItemsOrder = [];
        }
        
        return validated;
    };

    /**
     * Validate and recover tasks collection
     * @returns {Array} Validated tasks array
     */
    const validateAndRecoverTasks = () => {
        try {
            let tasks = loadFromStorage('tasks', []);
            
            // Check if it's an array
            if (!Array.isArray(tasks)) {
                console.warn('[DataManager] Tasks is not an array, attempting recovery');
                const backup = restoreBackup('tasks');
                if (backup && Array.isArray(backup)) {
                    tasks = backup;
                } else {
                    console.warn('[DataManager] Backup recovery failed, using empty array');
                    tasks = [];
                }
            }
            
            // Validate each task
            // Note: normalizeTask will be called by the collection when data is accessed
            const validated = [];
            let corruptedCount = 0;
            
            for (const task of tasks) {
                const valid = validateTask(task);
                if (valid) {
                    validated.push(valid);
                } else {
                    corruptedCount++;
                }
            }
            
            if (corruptedCount > 0) {
                console.warn(`[DataManager] Removed ${corruptedCount} corrupted task(s)`);
                // Save cleaned data (normalization happens when collection loads)
                if (validated.length !== tasks.length) {
                    saveToStorage('tasks', validated);
                }
            }
            
            return validated;
        } catch (e) {
            console.error('[DataManager] Task validation error:', e);
            // Try backup
            const backup = restoreBackup('tasks');
            if (backup && Array.isArray(backup)) {
                // Filter out invalid tasks, normalization will happen in collection
                return backup.filter(t => validateTask(t));
            }
            return [];
        }
    };

    /**
     * Validate and recover categories collection
     * @returns {Array} Validated categories array
     */
    const validateAndRecoverCategories = () => {
        try {
            let categories = loadFromStorage('categories', []);
            
            // Check if it's an array
            if (!Array.isArray(categories)) {
                console.warn('[DataManager] Categories is not an array, attempting recovery');
                const backup = restoreBackup('categories');
                if (backup && Array.isArray(backup)) {
                    categories = backup;
                } else {
                    console.warn('[DataManager] Backup recovery failed, using defaults');
                    categories = ['Work', 'Personal', 'Errands', 'Health', 'Fun'];
                }
            }
            
            // Validate each category
            const validated = [];
            let corruptedCount = 0;
            
            for (const cat of categories) {
                const valid = validateCategory(cat);
                if (valid) {
                    validated.push(valid);
                } else {
                    corruptedCount++;
                }
            }
            
            // Ensure at least default categories exist
            const defaults = ['Work', 'Personal', 'Errands', 'Health', 'Fun'];
            const existing = new Set(validated.map(c => c.toLowerCase()));
            defaults.forEach(d => {
                if (!existing.has(d.toLowerCase())) {
                    validated.push(d);
                }
            });
            
            if (corruptedCount > 0) {
                console.warn(`[DataManager] Removed ${corruptedCount} corrupted category/categories`);
                // Save cleaned data
                if (validated.length !== categories.length || corruptedCount > 0) {
                    saveToStorage('categories', validated);
                }
            }
            
            return validated;
        } catch (e) {
            console.error('[DataManager] Category validation error:', e);
            // Try backup
            const backup = restoreBackup('categories');
            if (backup && Array.isArray(backup)) {
                return backup.map(validateCategory).filter(Boolean);
            }
            return ['Work', 'Personal', 'Errands', 'Health', 'Fun'];
        }
    };

    /**
     * Validate and recover settings
     * @returns {object} Validated settings object
     */
    const validateAndRecoverSettings = () => {
        try {
            let settings = loadFromStorage('settings', null);
            const defaults = window.DEFAULT_SETTINGS || {};
            
            // Check if it's an object
            if (!settings || typeof settings !== 'object') {
                console.warn('[DataManager] Settings is not an object, attempting recovery');
                const backup = restoreBackup('settings');
                if (backup && typeof backup === 'object') {
                    settings = backup;
                } else {
                    console.warn('[DataManager] Backup recovery failed, using defaults');
                    settings = {};
                }
            }
            
            // Validate and merge with defaults
            const validated = validateSettings(settings);
            
            // CRITICAL: Always ensure navigation defaults are present
            // Deep merge navBarVisibleItems - defaults take precedence to override old saved values
            if (defaults.navBarVisibleItems) {
                validated.navBarVisibleItems = { ...(validated.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
            }
            
            // Ensure headerQuickNavItems defaults
            if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(validated.headerQuickNavItems) || validated.headerQuickNavItems.length === 0)) {
                validated.headerQuickNavItems = [...defaults.headerQuickNavItems];
            }
            
            // Ensure navItemsOrder defaults
            if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(validated.navItemsOrder) || validated.navItemsOrder.length === 0)) {
                validated.navItemsOrder = [...defaults.navItemsOrder];
            }
            
            // Always save the validated settings to ensure defaults persist
            // This is critical after a nuke/reset
            saveToStorage('settings', validated);
            
            return validated;
        } catch (e) {
            console.error('[DataManager] Settings validation error:', e);
            // Try backup
            const backup = restoreBackup('settings');
            const defaults = window.DEFAULT_SETTINGS || {};
            if (backup && typeof backup === 'object') {
                const validated = validateSettings(backup);
                // Ensure defaults are merged - defaults take precedence to override old saved values
                if (defaults.navBarVisibleItems) {
                    validated.navBarVisibleItems = { ...(validated.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
                }
                if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(validated.headerQuickNavItems) || validated.headerQuickNavItems.length === 0)) {
                    validated.headerQuickNavItems = [...defaults.headerQuickNavItems];
                }
                if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(validated.navItemsOrder) || validated.navItemsOrder.length === 0)) {
                    validated.navItemsOrder = [...defaults.navItemsOrder];
                }
                saveToStorage('settings', validated);
                return validated;
            }
            // Return defaults and save them
            saveToStorage('settings', defaults);
            return defaults;
        }
    };

    /**
     * Run validation and recovery on all critical data
     * Called on app initialization
     */
    const validateAndRecoverAll = () => {
        console.log('[DataManager] Starting data validation and recovery...');
        
        try {
            // Validate tasks
            const tasks = validateAndRecoverTasks();
            if (tasks.length > 0 || localStorage.getItem('tasks') !== null) {
                saveToStorage('tasks', tasks);
            }
            
            // Validate categories
            const categories = validateAndRecoverCategories();
            saveToStorage('categories', categories);
            
            // Validate settings
            const settings = validateAndRecoverSettings();
            saveToStorage('settings', settings);
            
            console.log('[DataManager] Validation complete:', {
                tasks: tasks.length,
                categories: categories.length,
                settingsValid: typeof settings === 'object'
            });
        } catch (e) {
            console.error('[DataManager] Validation failed:', e);
            // Don't throw - continue with defaults
        }
    };

    // Note: validateAndRecoverAll will be called after normalizers are defined
    // This ensures validation functions can use normalizeTask, etc.

    // ===========================================
    // DEEP EQUALITY CHECK
    // ===========================================
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

    // ===========================================
    // BACKUP SYSTEM (Last Known Good)
    // ===========================================
    const createBackup = (key, value) => {
        try {
            const backupKey = `${key}_backup`;
            const current = localStorage.getItem(key);
            if (current !== null) {
                localStorage.setItem(backupKey, current);
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

    // ===========================================
    // RACE CONDITION QUEUE SYSTEM
    // ===========================================
    const saveQueue = new Map(); // key -> { pending: value, processing: boolean }
    let saveTimeout = null;
    
    const processSaveQueue = () => {
        if (saveQueue.size === 0) return;
        
        const entries = Array.from(saveQueue.entries());
        saveQueue.clear();
        
        entries.forEach(([key, entry]) => {
            if (entry.processing) return;
            entry.processing = true;
            
            try {
                // Create backup before save
                createBackup(key, entry.pending);
                
                // Deep equality check - skip if unchanged
                const current = localStorage.getItem(key);
                if (current !== null) {
                    const currentParsed = safeParse(current, null);
                    if (currentParsed !== null && deepEqual(currentParsed, entry.pending)) {
                        entry.processing = false;
                        return; // Skip save, data unchanged
                    }
                }
                
                // Perform save
                localStorage.setItem(key, JSON.stringify(entry.pending));
                entry.processing = false;
            } catch (e) {
                console.error('[DataManager] Queued save error:', key, e);
                entry.processing = false;
                
                // Attempt backup restore on error
                const restored = restoreBackup(key);
                if (restored !== null) {
                    console.warn('[DataManager] Restored from backup:', key);
                }
            }
        });
    };
    
    const queueSave = (key, value) => {
        saveQueue.set(key, { pending: value, processing: false });
        
        // Debounce: process queue after 50ms of inactivity
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
            // Try to restore from backup
            const restored = restoreBackup(key);
            if (restored !== null) return restored;
            return fallback;
        }
    };

    const saveToStorage = (key, value) => {
        // Use queue system to prevent race conditions
        queueSave(key, value);
        return true;
    };

    // ===========================================
    // EVENT BUS - Central pub/sub system
    // ===========================================
    
    const EventBus = {
        _listeners: {},
        subscribe(event, callback) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(callback);
            return () => {
                this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
            };
        },
        emit(event, data) {
            if (this._listeners[event]) {
                this._listeners[event].forEach(cb => {
                    try {
                        cb(data);
                    } catch (e) {
                        console.error('[DataManager] Event error:', e);
                    }
                });
            }
            // Also dispatch to window for backward compatibility
            try {
                window.dispatchEvent(new CustomEvent(event, { detail: data }));
            } catch (e) {
                // Ignore dispatch errors
            }
        },
        subscribeMany(events, callback) {
            const unsubs = events.map(e => this.subscribe(e, callback));
            return () => unsubs.forEach(fn => fn());
        }
    };

    // ===========================================
    // BASE COLLECTION FACTORY
    // ===========================================
    
    function createCollection(config) {
        const {
            storageKey,
            eventName,
            normalize = (item) => item,
            dedupe = null,
            defaults = []
        } = config;
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
            getById(id) {
                if (!id) return null;
                return this.getAll().find(item => item.id === id) || null;
            },
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
                if (!id) return null;
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
                if (!id) return false;
                const all = this.getAll();
                const filtered = all.filter(item => item.id !== id);
                if (filtered.length === all.length) return false;
                this.setAll(filtered);
                return true;
            },
            invalidate() {
                _cache = null;
            },
            subscribe(callback) {
                return EventBus.subscribe(eventName, callback);
            }
        };
    }

    // ===========================================
    // NORMALIZERS
    // ===========================================

    /**
     * Normalize task with all required fields and defaults
     */
    const normalizeTask = (t) => {
        if (!t || typeof t !== 'object') return null;
        const title = String(t.title || '').trim();
        if (!title) return null;
        
        // Round percentComplete to nearest integer
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
            startDate: (() => {
                const date = t.startDate;
                if (!date || date === '') return '';
                if (typeof date === 'string') {
                    // If already in YYYY-MM-DD format, ensure it's treated as UTC
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        // Validate and return as UTC date string
                        const parsed = new Date(date + 'T00:00:00Z');
                        if (!isNaN(parsed.getTime())) {
                            return parsed.toISOString().split('T')[0];
                        }
                    } else {
                        // Parse other formats and convert to UTC
                        const parsed = new Date(date);
                        if (!isNaN(parsed.getTime())) {
                            return parsed.toISOString().split('T')[0];
                        }
                    }
                }
                return '';
            })(),
            startTime: t.startTime || '',
            dueDate: (() => {
                const date = t.dueDate;
                if (!date || date === '') return '';
                if (typeof date === 'string') {
                    // If already in YYYY-MM-DD format, ensure it's treated as UTC
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        // Validate and return as UTC date string
                        const parsed = new Date(date + 'T00:00:00Z');
                        if (!isNaN(parsed.getTime())) {
                            return parsed.toISOString().split('T')[0];
                        }
                    } else {
                        // Parse other formats and convert to UTC
                        const parsed = new Date(date);
                        if (!isNaN(parsed.getTime())) {
                            return parsed.toISOString().split('T')[0];
                        }
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
            subtasks: (() => {
                if (!Array.isArray(t.subtasks)) return [];
                // Normalize subtasks: convert strings to objects, ensure all have title, completed, and ID
                const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                return t.subtasks.map((st, index) => {
                    if (typeof st === 'string') {
                        return { 
                            id: generateId('st'), 
                            title: st, 
                            text: st, 
                            completed: false 
                        };
                    }
                    if (typeof st === 'object' && st !== null) {
                        return {
                            id: st.id || generateId('st'),
                            title: st.title || st.text || String(st).trim() || 'Untitled',
                            text: st.text || st.title || String(st).trim() || 'Untitled',
                            completed: Boolean(st.completed)
                        };
                    }
                    return { 
                        id: generateId('st'), 
                        title: 'Untitled', 
                        text: 'Untitled', 
                        completed: false 
                    };
                });
            })(),
            tags: Array.isArray(t.tags) ? t.tags.filter(Boolean) : [],
            people: Array.isArray(t.people) ? t.people.filter(Boolean) : [],
            blockedBy: Array.isArray(t.blockedBy) ? t.blockedBy : [],
            goalId: t.goalId || null,
            location: t.location || '',
            locationCoords: t.locationCoords || null,
            percentComplete,
            createdAt: (() => {
                if (t.createdAt) {
                    const parsed = new Date(t.createdAt);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
            completedAt: (() => {
                if (!t.completedAt) return null;
                const parsed = new Date(t.completedAt);
                return !isNaN(parsed.getTime()) ? parsed.toISOString() : null;
            })(),
            actualTime: Number(t.actualTime) || 0,
            lastModified: (() => {
                if (t.lastModified) {
                    const parsed = new Date(t.lastModified);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
            subtype: t.subtype || null,
            description: t.description || '',
            images: Array.isArray(t.images) ? t.images.filter(Boolean) : []
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
            createdAt: (() => {
                if (g.createdAt) {
                    const parsed = new Date(g.createdAt);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
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
            createdAt: (() => {
                const dateStr = a.createdAt || a.timestamp;
                if (dateStr) {
                    const parsed = new Date(dateStr);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
        };
    };

    const normalizeNote = (n) => {
        if (!n || typeof n !== 'object') return null;
        const text = String(n.text || n.note || '').trim();
        if (!text) return null;
        return {
            id: n.id || makeId(),
            text,
            createdAt: (() => {
                if (n.createdAt) {
                    const parsed = new Date(n.createdAt);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
        };
    };

    // People normalizer - supports all fields including firstName/lastName
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
        
        // Handle links: can be string, array, or empty
        let links = [];
        if (Array.isArray(p.links)) {
            links = p.links.filter(Boolean).map(String);
        } else if (p.links && String(p.links).trim()) {
            links = [String(p.links).trim()];
        }
        
        // Handle tags: can be string, array, or empty
        let tags = [];
        if (Array.isArray(p.tags)) {
            tags = p.tags.filter(Boolean).map(String);
        } else if (p.tags && String(p.tags).trim()) {
            tags = String(p.tags).trim().split(',').map(t => t.trim()).filter(Boolean);
        }
        
        return {
            id: p.id || makeId(),
            name, // Keep name for backward compatibility
            firstName,
            lastName,
            type: p.type || 'client',
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
            notesHistory: Array.isArray(p.notesHistory) ? p.notesHistory.slice(-10) : [],
            externalId: String(p.externalId || '').trim(), // Compass CRM personId
            // Profile picture (DP) - same as profilePicture - preserve if exists
            profilePicture: p.profilePicture || p.dp || '',
            profilePictureType: p.profilePictureType || 'initials',
            createdAt: (() => {
                if (p.createdAt) {
                    const parsed = new Date(p.createdAt);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
            updatedAt: (() => {
                const dateStr = p.updatedAt || p.createdAt;
                if (dateStr) {
                    const parsed = new Date(dateStr);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
        };
    };

    const normalizeLocation = (loc) => {
        if (!loc || typeof loc !== 'object') return null;
        const name = String(loc.name || '').trim();
        if (!name) return null;
        const id = String(loc.id || '').trim() || makeId('loc');
        return {
            id,
            name,
            coords: (loc.coords && typeof loc.coords === 'object') ? loc.coords : null,
            address: String(loc.address || '').trim(),
            type: String(loc.type || 'client').trim(),
            notes: String(loc.notes || '').trim(),
            createdAt: (() => {
                if (loc.createdAt) {
                    const parsed = new Date(loc.createdAt);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })()
        };
    };

    const normalizeHistoryEvent = (evt) => {
        if (!evt || typeof evt !== 'object') return null;
        return {
            id: evt.id || makeId(),
            ts: (() => {
                const dateStr = evt.ts || evt.timestamp;
                if (dateStr) {
                    const parsed = new Date(dateStr);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                }
                return new Date().toISOString();
            })(),
            type: String(evt.type || 'log').trim(),
            taskId: evt.taskId || null,
            title: String(evt.title || '').trim(),
            category: String(evt.category || '').trim(),
            priority: String(evt.priority || '').trim(),
            meta: (evt.meta && typeof evt.meta === 'object') ? evt.meta : {}
        };
    };

    const normalizeSettings = (s) => {
        const defaults = window.DEFAULT_SETTINGS || {};
        
        // If input is invalid, return defaults
        if (!s || typeof s !== 'object') {
            return defaults;
        }
        
        // Merge with defaults to ensure all keys exist
        const normalized = { ...defaults, ...s };
        
        // CRITICAL: Deep merge navBarVisibleItems - only add defaults for missing keys
        // Don't override existing user preferences (that happens on first load in validateAndRecoverSettings)
        if (typeof defaults.navBarVisibleItems === 'object' && defaults.navBarVisibleItems !== null) {
            if (!normalized.navBarVisibleItems) {
                normalized.navBarVisibleItems = { ...defaults.navBarVisibleItems };
            } else {
                // Only add defaults for keys that don't exist in user settings
                Object.keys(defaults.navBarVisibleItems).forEach(key => {
                    if (!(key in normalized.navBarVisibleItems)) {
                        normalized.navBarVisibleItems[key] = defaults.navBarVisibleItems[key];
                    }
                });
            }
        } else if (!normalized.navBarVisibleItems) {
            normalized.navBarVisibleItems = {};
        }
        
        // Ensure headerQuickNavItems defaults are always present
        if (Array.isArray(defaults.headerQuickNavItems) && defaults.headerQuickNavItems.length > 0) {
            if (!Array.isArray(normalized.headerQuickNavItems) || normalized.headerQuickNavItems.length === 0) {
                normalized.headerQuickNavItems = [...defaults.headerQuickNavItems];
            }
        } else if (!Array.isArray(normalized.headerQuickNavItems)) {
            normalized.headerQuickNavItems = [];
        }
        
        // Ensure navItemsOrder defaults are always present
        if (Array.isArray(defaults.navItemsOrder) && defaults.navItemsOrder.length > 0) {
            if (!Array.isArray(normalized.navItemsOrder) || normalized.navItemsOrder.length === 0) {
                normalized.navItemsOrder = [...defaults.navItemsOrder];
            }
        } else if (!Array.isArray(normalized.navItemsOrder)) {
            normalized.navItemsOrder = [];
        }
        
        return normalized;
    };

    const normalizeTimerState = (t) => {
        if (!t || typeof t !== 'object') {
            return {
                isRunning: false,
                startTime: null,
                storedTime: 0,
                activityName: 'Tracked Session'
            };
        }
        return {
            isRunning: Boolean(t.isRunning),
            startTime: t.startTime || null,
            storedTime: Number(t.storedTime) || 0,
            activityName: String(t.activityName || 'Tracked Session').trim()
        };
    };

    const normalizeScratchpad = (v) => {
        return typeof v === 'string' ? v : '';
    };

    const normalizeUserStats = (s) => {
        if (!s || typeof s !== 'object') {
            return {
                xp: 0,
                level: 1,
                tasksCompleted: 0,
                totalFocusTime: 0,
                dailyStreak: 0,
                lastCompletionDate: null
            };
        }
        return {
            xp: Number(s.xp) || 0,
            level: Number(s.level) || 1,
            tasksCompleted: Number(s.tasksCompleted) || 0,
            totalFocusTime: Number(s.totalFocusTime) || 0,
            dailyStreak: Number(s.dailyStreak) || 0,
            lastCompletionDate: s.lastCompletionDate || null
        };
    };

    // ===========================================
    // COLLECTIONS SETUP
    // ===========================================

    const Tasks = createCollection({
        storageKey: 'tasks',
        eventName: 'tasks-updated',
        normalize: normalizeTask,
        dedupe: (list) => {
            const map = new Map();
            for (const item of list) {
                if (item && item.id && !map.has(item.id)) {
                    map.set(item.id, item);
                }
            }
            return Array.from(map.values());
        },
        defaults: []
    });

    // Add validation hook to Tasks collection
    const originalTasksGetAll = Tasks.getAll;
    let tasksValidated = false;
    Tasks.getAll = function() {
        if (!tasksValidated) {
            tasksValidated = true;
            try {
                const validated = validateAndRecoverTasks();
                if (validated.length > 0 || localStorage.getItem('tasks') !== null) {
                    this.setAll(validated);
                    return validated;
                }
            } catch (e) {
                console.error('[DataManager] Task validation hook error:', e);
            }
        }
        return originalTasksGetAll.call(this);
    };

    const Goals = createCollection({
        storageKey: 'goals',
        eventName: 'goals-updated',
        normalize: normalizeGoal,
        defaults: []
    });

    const Categories = createCollection({
        storageKey: 'categories',
        eventName: 'categories-updated',
        normalize: normalizeCategory,
        defaults: ['Work', 'Personal', 'Errands', 'Health', 'Fun']
    });

    // Add validation hook to Categories collection
    const originalCategoriesGetAll = Categories.getAll;
    let categoriesValidated = false;
    Categories.getAll = function() {
        if (!categoriesValidated) {
            categoriesValidated = true;
            try {
                const validated = validateAndRecoverCategories();
                if (validated.length > 0) {
                    this.setAll(validated);
                    return validated;
                }
            } catch (e) {
                console.error('[DataManager] Category validation hook error:', e);
            }
        }
        return originalCategoriesGetAll.call(this);
    };

    // Override getAll to use validated data on first load
    const originalCategoriesGetAll = Categories.getAll;
    let categoriesValidated = false;
    Categories.getAll = function() {
        if (!categoriesValidated) {
            categoriesValidated = true;
            const validated = validateAndRecoverCategories();
            if (validated.length > 0) {
                this.setAll(validated);
                return validated;
            }
        }
        return originalCategoriesGetAll.call(this);
    };

    const Activities = createCollection({
        storageKey: 'activities',
        eventName: 'activities-updated',
        normalize: normalizeActivity,
        defaults: []
    });

    const SavedNotes = createCollection({
        storageKey: 'savedNotes',
        eventName: 'notes-updated',
        normalize: normalizeNote,
        defaults: []
    });

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
        },
        defaults: []
    });

    const Locations = createCollection({
        storageKey: 'savedLocations_v1',
        eventName: 'locations-updated',
        normalize: normalizeLocation,
        dedupe: (list) => {
            const map = new Map();
            for (const item of list) {
                if (item && item.id && !map.has(item.id)) {
                    map.set(item.id, item);
                }
            }
            return Array.from(map.values());
        },
        defaults: []
    });

    const History = createCollection({
        storageKey: 'taskEvents_v1',
        eventName: 'history-updated',
        normalize: normalizeHistoryEvent,
        defaults: []
    });

    // ===========================================
    // TAGS AGGREGATION SYSTEM
    // Aggregates tags from tasks and people
    // ===========================================
    const TagsAggregator = (() => {
        let _cache = null;
        let _taskUnsubscribe = null;
        let _peopleUnsubscribe = null;

        const aggregateTags = () => {
            const allTags = new Set();
            
            // Collect tags from tasks
            const tasks = Tasks.getAll();
            tasks.forEach(task => {
                if (Array.isArray(task.tags)) {
                    task.tags.forEach(tag => {
                        const normalized = String(tag || '').trim();
                        if (normalized) {
                            allTags.add(normalized);
                        }
                    });
                }
            });
            
            // Collect tags from people
            const people = People.getAll();
            people.forEach(person => {
                if (Array.isArray(person.tags)) {
                    person.tags.forEach(tag => {
                        const normalized = String(tag || '').trim();
                        if (normalized) {
                            allTags.add(normalized);
                        }
                    });
                }
            });
            
            return Array.from(allTags).sort();
        };

        const invalidateCache = () => {
            _cache = null;
            EventBus.emit('tags-updated', getAll());
        };

        const getAll = () => {
            if (_cache === null) {
                _cache = aggregateTags();
            }
            return _cache;
        };

        const add = (tag) => {
            const normalized = String(tag || '').trim();
            if (!normalized) return null;
            
            // Add tag to a temporary task or person to persist it
            // For now, we'll just invalidate cache - tags will be added through tasks/people
            invalidateCache();
            return normalized;
        };

        const remove = (tag) => {
            const normalized = String(tag || '').trim();
            if (!normalized) return false;
            
            // Remove tag from all tasks and people that have it
            let removed = false;
            
            // Remove from tasks
            const tasks = Tasks.getAll();
            const updatedTasks = tasks.map(task => {
                if (Array.isArray(task.tags) && task.tags.includes(normalized)) {
                    removed = true;
                    return {
                        ...task,
                        tags: task.tags.filter(t => t !== normalized)
                    };
                }
                return task;
            });
            if (removed) {
                Tasks.setAll(updatedTasks);
            }
            
            // Remove from people
            const people = People.getAll();
            const updatedPeople = people.map(person => {
                if (Array.isArray(person.tags) && person.tags.includes(normalized)) {
                    removed = true;
                    return {
                        ...person,
                        tags: person.tags.filter(t => t !== normalized)
                    };
                }
                return person;
            });
            if (removed) {
                People.setAll(updatedPeople);
            }
            
            invalidateCache();
            return removed;
        };

        const search = (query) => {
            const q = String(query || '').toLowerCase().trim();
            if (!q) return getAll();
            
            return getAll().filter(tag => 
                tag.toLowerCase().includes(q)
            );
        };

        const subscribe = (callback) => {
            return EventBus.subscribe('tags-updated', callback);
        };

        // Subscribe to tasks and people changes to auto-update tags
        const initialize = () => {
            if (_taskUnsubscribe) _taskUnsubscribe();
            if (_peopleUnsubscribe) _peopleUnsubscribe();
            
            _taskUnsubscribe = EventBus.subscribe('tasks-updated', () => {
                invalidateCache();
            });
            
            _peopleUnsubscribe = EventBus.subscribe('people-updated', () => {
                invalidateCache();
            });
        };

        // Initialize subscriptions
        initialize();

        return {
            getAll,
            add,
            remove,
            search,
            subscribe,
            invalidate: invalidateCache,
            EVENT_NAME: 'tags-updated',
            STORAGE_KEY: 'tags_aggregated'
        };
    })();

    // ===========================================
    // SINGLETON STORES
    // ===========================================

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
            invalidate() {
                _cache = null;
            },
            subscribe(callback) {
                return EventBus.subscribe(eventName, callback);
            }
        };
    };

    const Settings = makeSingleton('settings', 'settings-updated', normalizeSettings, window.DEFAULT_SETTINGS || {});

    // Override get to use validated data on first load
    const originalSettingsGet = Settings.get;
    let settingsValidated = false;
    Settings.get = function() {
        if (!settingsValidated) {
            settingsValidated = true;
            const validated = validateAndRecoverSettings();
            // Always ensure defaults are present, especially for navigation
            const defaults = window.DEFAULT_SETTINGS || {};
            const final = { ...defaults, ...validated };
            
            // Deep merge navBarVisibleItems - defaults take precedence to override old saved values
            if (defaults.navBarVisibleItems) {
                final.navBarVisibleItems = { ...(final.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
            }
            
            // Ensure headerQuickNavItems defaults
            if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(final.headerQuickNavItems) || final.headerQuickNavItems.length === 0)) {
                final.headerQuickNavItems = [...defaults.headerQuickNavItems];
            }
            
            // Ensure navItemsOrder defaults
            if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(final.navItemsOrder) || final.navItemsOrder.length === 0)) {
                final.navItemsOrder = [...defaults.navItemsOrder];
            }
            
            // Always save the merged settings to ensure defaults persist
            this.set(final);
            return final;
        }
        const current = originalSettingsGet.call(this);
        // On every get, ensure defaults are still present (defensive)
        const defaults = window.DEFAULT_SETTINGS || {};
        if (defaults.navBarVisibleItems && (!current.navBarVisibleItems || Object.keys(current.navBarVisibleItems).length === 0)) {
            const merged = { ...defaults, ...current };
            merged.navBarVisibleItems = { ...(merged.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
            if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(merged.headerQuickNavItems) || merged.headerQuickNavItems.length === 0)) {
                merged.headerQuickNavItems = [...defaults.headerQuickNavItems];
            }
            if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(merged.navItemsOrder) || merged.navItemsOrder.length === 0)) {
                merged.navItemsOrder = [...defaults.navItemsOrder];
            }
            this.set(merged);
            return merged;
        }
        return current;
    };
    const UserStats = makeSingleton('userStats', 'userStats-updated', normalizeUserStats, {
        xp: 0,
        level: 1,
        tasksCompleted: 0,
        totalFocusTime: 0,
        dailyStreak: 0,
        lastCompletionDate: null
    });
    const TimerState = makeSingleton('timerState', 'timerState-updated', normalizeTimerState, {
        isRunning: false,
        startTime: null,
        storedTime: 0,
        activityName: 'Tracked Session'
    });
    const Scratchpad = makeSingleton('scratchpad', 'scratchpad-updated', normalizeScratchpad, '');

    // ===========================================
    // DATA MANAGER INSTANCE
    // ===========================================

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
        tags: TagsAggregator,
        locations: Locations,
        history: History,
        events: EventBus,
        makeId,
        version: DATA_VERSION,
        getDataVersion,
        restoreBackup: (key) => restoreBackup(key)
    };

    // ===========================================
    // BATCH UPDATE SYSTEM
    // ===========================================
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
            // Force queue flush after batch
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

    // ===========================================
    // RUN VALIDATION AFTER ALL COLLECTIONS ARE SETUP
    // ===========================================
    // Now that normalizers are defined, we can run full validation
    // This ensures corrupted data is cleaned before first access
    validateAndRecoverAll();

    // ===========================================
    // TASK EVENTS COMPATIBILITY LAYER
    // ===========================================
    // Maintain backward compatibility with TaskEvents API
    window.TaskEvents = {
        KEY: 'taskEvents_v1',
        getAll: () => DataManager.history.getAll(),
        add: (evt) => {
            const normalized = normalizeHistoryEvent(evt);
            if (normalized) {
                DataManager.history.add(normalized);
                EventBus.emit('history-updated', DataManager.history.getAll());
                EventBus.emit('stats-updated', DataManager.history.getAll());
            }
        },
        log: (task, type, meta = {}) => {
            const t = task || {};
            const taskId = t.id || meta.taskId;
            if (!taskId) return null;

            const now = new Date();
            const entry = {
                id: makeId(),
                ts: new Date().toISOString(),
                type: String(type || 'log').trim(),
                taskId,
                title: String(t.title || meta.title || '').trim(),
                category: String(t.category || meta.category || '').trim(),
                priority: String(t.priority || meta.priority || '').trim(),
                meta: (meta && typeof meta === 'object') ? meta : {}
            };

            const normalized = normalizeHistoryEvent(entry);
            if (normalized) {
                DataManager.history.add(normalized);
                EventBus.emit('history-updated', DataManager.history.getAll());
                EventBus.emit('stats-updated', DataManager.history.getAll());
                return normalized;
            }
            return null;
        },
        setAll: (list) => {
            DataManager.history.setAll(list);
            EventBus.emit('history-updated', DataManager.history.getAll());
            EventBus.emit('stats-updated', DataManager.history.getAll());
        }
    };

    // ===========================================
    // GLOBAL EXPORTS
    // ===========================================
    
    window.DataManager = DataManager;
    window.normalizeTask = normalizeTask;

    console.log('✅ DataManager loaded (v2.0 - Complete data layer with migrations + validation)');

})();
