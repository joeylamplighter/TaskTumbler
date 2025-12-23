// js/09-hooks.js
// Updated: 2025-12-19 (Roadmap Improvements Applied)
// ===========================================
// 📖 CUSTOM REACT HOOKS
// ===========================================
// Improvements:
// - Better error handling in hooks
// - Consistent return patterns
// - Added useOnline hook for network status
// ===========================================
// Note: React must be loaded before this file

// ==========================================
// FIX: Define React Hook Aliases Globally
// ==========================================
const { useState, useEffect, useRef, useMemo, useCallback } = React;
window.useState = useState;
window.useEffect = useEffect;
window.useRef = useRef;
window.useMemo = useMemo;
window.useCallback = useCallback;
// ------------------------------------------


/**
 * Hook for bulk task import (CSV or AI)
 * @param {object} params - Hook parameters
 * @returns {function} handleBulkImport function
 */
const useBulkImport = ({ bulkText, aiMode, settings, categories, onAdd, notify, setBulkText }) => {
    
    const handleBulkImport = async () => {
        if (!bulkText.trim()) {
            notify?.("Enter some text first", "⚠️");
            return;
        }
        
        if (aiMode) {
            // AI Mode - Parse with Gemini
            if (!settings?.geminiApiKey) {
                notify?.("Set Gemini API key in Settings → Data & AI", "⚠️");
                return;
            }
            
            notify?.("Processing with AI...", "🧠");
            
            const safeCategories = Array.isArray(categories) ? categories : ['General'];
            const prompt = window.getTaskParsePrompt 
                ? window.getTaskParsePrompt(bulkText, safeCategories)
                : `Parse these tasks. Return ONLY a JSON array of objects with fields: title, category (one of: ${safeCategories.join(', ')}), priority (Urgent/High/Medium/Low). Text: "${bulkText}"`;
            
            try {
                const res = await callGemini(prompt, settings.geminiApiKey);
                
                if (res.error) {
                    notify?.(res.error, "❌");
                    return;
                }
                
                if (res.text) {
                    const parsed = JSON.parse(extractJSON(res.text));
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed.forEach(t => onAdd?.({
                            title: t.title,
                            category: t.category || safeCategories[0],
                            priority: t.priority || 'Medium',
                            weight: 10
                        }));
                        notify?.(`AI Imported ${parsed.length} tasks!`, "🧠");
                        setBulkText?.('');
                    } else {
                        notify?.("No tasks found in response", "⚠️");
                    }
                } else {
                    notify?.("No response from AI", "❌");
                }
            } catch(e) {
                console.error('AI Import error:', e);
                notify?.("AI Parse Error: " + e.message, "❌");
            }
        } else {
            // CSV Mode: Format is Title | Category | Priority | Weight | Time | Due
            const safeCategories = Array.isArray(categories) ? categories : ['General'];
            const lines = bulkText.split('\n').filter(l => l.trim());
            let count = 0;
            
            lines.forEach(l => {
                const parts = l.split('|').map(s => s.trim());
                if (parts[0]) {
                    onAdd?.({
                        title: parts[0],
                        category: parts[1] || safeCategories[0],
                        priority: parts[2] || 'Medium',
                        weight: parseInt(parts[3]) || 10,
                        estimatedTime: parseInt(parts[4]) || 0,
                        dueDate: parts[5] || ''
                    });
                    count++;
                }
            });
            
            if (count > 0) {
                notify?.(`Imported ${count} tasks!`, "🔥");
                setBulkText?.('');
            } else {
                notify?.("No tasks to import", "⚠️");
            }
        }
    };
    
    return handleBulkImport;
};

/**
 * Hook for local storage state
 * @param {string} key - Storage key
 * @param {*} initialValue - Default value
 * @returns {[*, function]} State and setter
 */
const useLocalStorage = (key, initialValue) => {
    
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn('useLocalStorage read error:', error);
            return initialValue;
        }
    });
    
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error('useLocalStorage write error:', error);
        }
    }, [key, storedValue]);
    
    return [storedValue, setStoredValue];
};

/**
 * Hook for debounced value
 * @param {*} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} Debounced value
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => clearTimeout(handler);
    }, [value, delay]);
    
    return debouncedValue;
};

/**
 * Hook for previous value
 * @param {*} value - Current value
 * @returns {*} Previous value
 */
const usePrevious = (value) => {
    const ref = useRef();
    
    useEffect(() => {
        ref.current = value;
    });
    
    return ref.current;
};

/**
 * Hook for keyboard shortcuts
 * @param {object} keyMap - Map of key combinations to handlers
 */
const useKeyboardShortcuts = (keyMap) => {
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            const key = e.key.toLowerCase();
            const combo = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey ? 'shift+' : ''}${key}`;
            
            if (keyMap[combo]) {
                e.preventDefault();
                keyMap[combo](e);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyMap]);
};

/**
 * Hook for interval
 * @param {function} callback - Function to call
 * @param {number|null} delay - Interval delay (null to pause)
 */
const useInterval = (callback, delay) => {
    const savedCallback = useRef();
    
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);
    
    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

/**
 * Hook for online/offline status (for #76)
 * @returns {boolean} Whether the browser is online
 */
const useOnline = () => {
    const [isOnline, setIsOnline] = useState(() => 
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    return isOnline;
};

// ==========================================
// DATA MANAGER HOOKS
// ==========================================

/**
 * Hook to subscribe to a DataManager collection
 * Auto-updates when data changes
 * @param {string} storeName - Name of the store (tasks, goals, people, etc.)
 * @returns {Array} Current data from the store
 */
const useDataStore = (storeName) => {
    const store = window.DataManager?.[storeName];
    
    const [data, setData] = useState(() => {
        if (!store) return [];
        try {
            return typeof store.getAll === 'function' ? store.getAll() : store.get?.() ?? [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (!store?.subscribe) return;
        
        const unsubscribe = store.subscribe((newData) => {
            setData(newData);
        });
        
        return unsubscribe;
    }, [storeName]);

    return data;
};

/**
 * Hook to get a DataManager value store (settings, userStats, etc.)
 * @param {string} storeName - Name of the store
 * @returns {[any, function]} Value and setter
 */
const useDataValue = (storeName) => {
    const store = window.DataManager?.[storeName];
    
    const [value, setValue] = useState(() => {
        if (!store) return null;
        try {
            return store.get?.() ?? null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (!store?.subscribe) return;
        
        const unsubscribe = store.subscribe((newValue) => {
            setValue(newValue);
        });
        
        return unsubscribe;
    }, [storeName]);

    const update = useCallback((newValue) => {
        if (!store) return;
        try {
            if (typeof newValue === 'function') {
                store.set(newValue(value));
            } else if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                store.set({ ...value, ...newValue });
            } else {
                store.set(newValue);
            }
        } catch (e) {
            console.error('useDataValue update error:', e);
        }
    }, [store, value]);

    return [value, update];
};

/**
 * Hook to get tasks with auto-subscription
 * @returns {[Array, Object]} [tasks, { add, update, remove, complete }]
 */
const useTasks = () => {
    const tasks = useDataStore('tasks');
    
    const actions = useMemo(() => ({
        add: (task) => window.DataManager?.tasks?.add(task),
        update: (id, updates) => window.DataManager?.tasks?.update(id, updates),
        remove: (id) => window.DataManager?.tasks?.remove(id),
        getById: (id) => window.DataManager?.tasks?.getById(id)
    }), []);
    
    return [tasks, actions];
};

/**
 * Hook to get goals with auto-subscription
 * @returns {[Array, Object]} [goals, { add, update, remove }]
 */
const useGoals = () => {
    const goals = useDataStore('goals');
    
    const actions = useMemo(() => ({
        add: (goal) => window.DataManager?.goals?.add(goal),
        update: (id, updates) => window.DataManager?.goals?.update(id, updates),
        remove: (id) => window.DataManager?.goals?.remove(id),
        getById: (id) => window.DataManager?.goals?.getById(id)
    }), []);
    
    return [goals, actions];
};

/**
 * Hook to get people with auto-subscription
 * @returns {[Array, Object]} [people, { add, update, remove, search }]
 */
const usePeople = () => {
    const people = useDataStore('people');
    
    const actions = useMemo(() => ({
        add: (person) => window.DataManager?.people?.add(person),
        update: (id, updates) => window.DataManager?.people?.update(id, updates),
        remove: (id) => window.DataManager?.people?.remove(id),
        getById: (id) => window.DataManager?.people?.getById(id),
        getByName: (name) => {
            const lower = String(name || '').toLowerCase();
            return people.find(p => p.name?.toLowerCase() === lower) || null;
        },
        search: (query) => {
            const q = String(query || '').toLowerCase();
            if (!q) return people;
            return people.filter(p => 
                p.name?.toLowerCase().includes(q) ||
                (p.contact || '').toLowerCase().includes(q) ||
                (p.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }
    }), [people]);
    
    return [people, actions];
};

/**
 * Hook to get locations with auto-subscription
 * @returns {[Array, Object]} [locations, { add, update, remove }]
 */
const useLocations = () => {
    const locations = useDataStore('locations');
    
    const actions = useMemo(() => ({
        add: (loc) => window.DataManager?.locations?.add(loc),
        update: (id, updates) => window.DataManager?.locations?.update(id, updates),
        remove: (id) => window.DataManager?.locations?.remove(id),
        getById: (id) => window.DataManager?.locations?.getById(id),
        getByName: (name) => {
            const lower = String(name || '').toLowerCase();
            return locations.find(l => l.name?.toLowerCase() === lower) || null;
        }
    }), [locations]);
    
    return [locations, actions];
};

/**
 * Hook to get categories with auto-subscription
 * @returns {[Array, Object]} [categories, { add, remove, rename }]
 */
const useCategories = () => {
    const categories = useDataStore('categories');
    
    const actions = useMemo(() => ({
        add: (cat) => {
            const clean = String(cat || '').trim();
            if (!clean || categories.includes(clean)) return false;
            window.DataManager?.categories?.setAll([...categories, clean]);
            return true;
        },
        remove: (cat) => window.DataManager?.categories?.remove(cat),
        rename: (oldName, newName) => {
            const clean = String(newName || '').trim();
            if (!clean || categories.includes(clean)) return false;
            const updated = categories.map(c => c === oldName ? clean : c);
            window.DataManager?.categories?.setAll(updated);
            // Also rename in subcategories
            window.DataManager?.subCategoriesHelper?.renameCategory?.(oldName, clean);
            return true;
        }
    }), [categories]);
    
    return [categories, actions];
};

/**
 * Hook to get tags with auto-subscription
 * @returns {[Array, Object]} [tags, { add, remove, search }]
 */
const useTags = () => {
    const tags = useDataStore('tags');
    
    const actions = useMemo(() => ({
        add: (tag) => window.DataManager?.tags?.add(tag),
        remove: (tag) => window.DataManager?.tags?.remove(tag),
        search: (query) => window.DataManager?.tags?.search?.(query) || []
    }), []);
    
    return [tags, actions];
};

/**
 * Hook to get subcategories for a category
 * @param {string} category - Parent category name
 * @returns {[Array, Object]} [subcategories, { add, remove }]
 */
const useSubCategories = (category) => {
    const [subCategories, setSubCategories] = useState(() => {
        return window.DataManager?.subCategoriesHelper?.getFor?.(category) || [];
    });

    useEffect(() => {
        if (!window.DataManager?.subCategories?.subscribe) return;
        
        const unsubscribe = window.DataManager.subCategories.subscribe(() => {
            setSubCategories(window.DataManager.subCategoriesHelper?.getFor?.(category) || []);
        });
        
        // Also refresh on mount
        setSubCategories(window.DataManager.subCategoriesHelper?.getFor?.(category) || []);
        
        return unsubscribe;
    }, [category]);

    const actions = useMemo(() => ({
        add: (subcat) => window.DataManager?.subCategoriesHelper?.add?.(category, subcat),
        remove: (subcat) => window.DataManager?.subCategoriesHelper?.remove?.(category, subcat)
    }), [category]);

    return [subCategories, actions];
};

/**
 * Hook to get settings with auto-subscription
 * @returns {[Object, function]} [settings, updateSettings]
 */
const useSettings = () => {
    return useDataValue('settings');
};

/**
 * Hook to get user stats with auto-subscription
 * @returns {[Object, function]} [userStats, updateStats]
 */
const useUserStats = () => {
    return useDataValue('userStats');
};

/**
 * Hook to get activities with auto-subscription
 * @returns {[Array, Object]} [activities, { add }]
 */
const useActivities = () => {
    const activities = useDataStore('activities');
    
    const actions = useMemo(() => ({
        add: (activity) => window.DataManager?.activities?.add(activity),
        getAll: () => activities
    }), [activities]);
    
    return [activities, actions];
};

// ==========================================
// EXPOSE GLOBALS (Remaining)
// ==========================================
window.useBulkImport = useBulkImport;
window.useLocalStorage = useLocalStorage;
window.useDebounce = useDebounce;
window.usePrevious = usePrevious;
window.useKeyboardShortcuts = useKeyboardShortcuts;
window.useInterval = useInterval;
window.useOnline = useOnline;

// DataManager hooks
window.useDataStore = useDataStore;
window.useDataValue = useDataValue;
window.useTasks = useTasks;
window.useGoals = useGoals;
window.usePeople = usePeople;
window.useLocations = useLocations;
window.useCategories = useCategories;
window.useTags = useTags;
window.useSubCategories = useSubCategories;
window.useSettings = useSettings;
window.useUserStats = useUserStats;
window.useActivities = useActivities;

console.log('✅ Hooks loaded (Enhanced + useOnline)');
