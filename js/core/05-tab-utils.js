// js/core/05-tab-utils.js
// ===========================================
// SHARED TAB UTILITIES
// Common logic used across Spin, Tasks, Timer, and other tabs
// ===========================================
// Consolidates:
// - Date parsing and filtering
// - Task filtering logic
// - People/Locations data access
// - Category/XP/Weight calculations
// ===========================================

(function() {
    'use strict';

    // ===========================================
    // DATE UTILITIES
    // ===========================================

    /**
     * Get start of day for a date
     * @param {Date} d - Date object
     * @returns {Date} Start of day
     */
    const dayStart = (d) => {
        if (!d) return new Date();
        const date = d instanceof Date ? d : new Date(d);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    /**
     * Check if a date is valid
     * @param {Date|string|number} d - Date to validate
     * @returns {boolean} True if valid date
     */
    const isValidDate = (d) => {
        if (!d) return false;
        const date = d instanceof Date ? d : new Date(d);
        return date instanceof Date && !isNaN(date.getTime());
    };

    /**
     * Parse due date from task object (handles multiple field names)
     * @param {object} task - Task object
     * @returns {Date|null} Parsed date or null
     */
    const parseDueDate = (task) => {
        if (!task) return null;
        try {
            const raw = task.dueAt || task.due || task.dueDate || task.dueDateTime || 
                       task.dueISO || task.due_date || task.due_time || null;
            if (!raw) return null;
            
            if (typeof raw === 'number') {
                return isValidDate(new Date(raw)) ? new Date(raw) : null;
            }
            
            if (typeof raw === 'string') {
                const s = raw.trim();
                if (!s) return null;
                // Handle timestamp strings
                if (/^\d+$/.test(s)) {
                    const n = parseInt(s, 10);
                    return isValidDate(new Date(n)) ? new Date(n) : null;
                }
                return isValidDate(new Date(s)) ? new Date(s) : null;
            }
            
            return null;
        } catch {
            return null;
        }
    };

    /**
     * Check if task matches due date filter
     * @param {object} task - Task object
     * @param {string} filterDue - Filter value ("Any", "Overdue", "Today", etc.)
     * @returns {boolean} True if matches filter
     */
    const dueMatches = (task, filterDue) => {
        if (!filterDue || filterDue === 'Any') return true;
        
        const due = parseDueDate(task);
        if (!due) return false;
        
        const now = new Date();
        const dueStart = dayStart(due);
        const nowStart = dayStart(now);
        const diffDays = Math.round((dueStart.getTime() - nowStart.getTime()) / 86400000);
        
        switch (filterDue) {
            case 'Overdue':
                return diffDays < 0;
            case 'Today':
            case 'Now':
                return diffDays === 0;
            case 'Tomorrow':
                return diffDays === 1;
            case 'This Week':
            case 'Week':
                return diffDays >= 0 && diffDays <= 7;
            case 'Next Week':
                return diffDays > 7 && diffDays <= 14;
            case 'This Month':
            case 'Month':
                return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    };

    /**
     * Get days difference from today
     * @param {string|Date} dateStr - Date string or Date object
     * @returns {number|null} Days difference (negative = past, positive = future)
     */
    const getDaysDiff = (dateStr) => {
        if (!dateStr) return null;
        try {
            const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
            if (!isValidDate(date)) return null;
            const today = dayStart(new Date());
            const target = dayStart(date);
            return Math.ceil((target.getTime() - today.getTime()) / 86400000);
        } catch {
            return null;
        }
    };

    // ===========================================
    // TASK FILTERING UTILITIES
    // ===========================================

    /**
     * Filter tasks by multiple criteria
     * @param {Array} tasks - Array of tasks
     * @param {object} filters - Filter options
     * @param {string} filters.searchText - Search query
     * @param {Array} filters.categories - Selected categories
     * @param {Array} filters.priorities - Selected priorities
     * @param {string} filters.dueDate - Due date filter
     * @param {string} filters.duration - Duration filter
     * @param {boolean} filters.completed - Include completed tasks
     * @param {boolean} filters.excludeFromTumbler - Include excluded tasks
     * @returns {Array} Filtered tasks
     */
    const filterTasks = (tasks, filters = {}) => {
        if (!Array.isArray(tasks)) return [];
        
        const {
            searchText = '',
            categories = [],
            priorities = [],
            dueDate = 'Any',
            duration = 'Any',
            completed = null, // null = all, true = only completed, false = only active
            excludeFromTumbler = null // null = all, true = include excluded, false = exclude excluded
        } = filters;
        
        const searchLower = searchText.toLowerCase().trim();
        
        return tasks.filter(task => {
            // Search filter
            if (searchLower) {
                const titleMatch = (task.title || '').toLowerCase().includes(searchLower);
                const categoryMatch = (task.category || '').toLowerCase().includes(searchLower);
                const tagsMatch = Array.isArray(task.tags) && 
                                 task.tags.some(tag => tag.toLowerCase().includes(searchLower));
                if (!titleMatch && !categoryMatch && !tagsMatch) return false;
            }
            
            // Category filter
            if (categories.length > 0 && !categories.includes(task.category)) {
                return false;
            }
            
            // Priority filter
            if (priorities.length > 0 && !priorities.includes(task.priority)) {
                return false;
            }
            
            // Due date filter
            if (dueDate !== 'Any' && !dueMatches(task, dueDate)) {
                return false;
            }
            
            // Duration filter (matches original Spin tab logic exactly)
            if (duration !== 'Any') {
                const est = parseInt(task.estimatedTime, 10) || 0;

                if (duration === 'None') {
                    // "None" filter: only show tasks WITHOUT estimated time
                    if (est > 0) return false;
                } else {
                    // All other duration filters: exclude tasks without estimated time (est === 0)
                    // and exclude tasks outside the range
                    if (duration === '< 5m' && (est === 0 || est >= 5)) return false;
                    if (duration === '< 15m' && (est === 0 || est >= 15)) return false;
                    if (duration === '< 30m' && (est === 0 || est >= 30)) return false;
                    if (duration === '< 60m' && (est === 0 || est >= 60)) return false;
                    if (duration === '> 1h' && est < 60) return false;
                }
            }
            
            // Completion filter
            if (completed !== null) {
                if (completed && !task.completed) return false;
                if (!completed && task.completed) return false;
            }
            
            // Exclude from tumbler filter
            if (excludeFromTumbler === false && task.excludeFromTumbler) {
                return false;
            }
            
            return true;
        });
    };

    /**
     * Get active (incomplete) tasks
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Active tasks
     */
    const getActiveTasks = (tasks) => {
        if (!Array.isArray(tasks)) return [];
        return tasks.filter(t => !t.completed && !t.archived);
    };

    /**
     * Get completed tasks
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Completed tasks
     */
    const getCompletedTasks = (tasks) => {
        if (!Array.isArray(tasks)) return [];
        return tasks.filter(t => t.completed);
    };

    // ===========================================
    // CATEGORY & XP UTILITIES
    // ===========================================

    /**
     * Get category XP adjustment
     * @param {string} category - Category name
     * @param {object} settings - Settings object
     * @returns {number} XP adjustment (can be negative)
     */
    const getCatXpAdjust = (category, settings) => {
        if (!category || !settings) return 0;
        const v = settings.categoryXpAdjust?.[category];
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
    };

    /**
     * Get category multiplier
     * @param {string} category - Category name
     * @param {object} settings - Settings object
     * @returns {number} Multiplier (default 1)
     */
    const getCatMultiplier = (category, settings) => {
        if (!category || !settings) return 1;
        const v = settings.categoryMultipliers?.[category];
        const n = Number(v);
        return Number.isFinite(n) ? n : 1;
    };

    /**
     * Check if category is eligible for spin (not excluded)
     * @param {string} category - Category name
     * @param {object} settings - Settings object
     * @returns {boolean} True if eligible
     */
    const isSpinEligibleCategory = (category, settings) => {
        if (!category) return true;
        const key = String(category).trim();
        if (!key) return true;
        
        const adj = getCatXpAdjust(key, settings);
        if (Number.isFinite(adj) && adj < 0) return false;
        
        const mult = getCatMultiplier(key, settings);
        if (Number.isFinite(mult) && mult < 0) return false;
        
        return true;
    };

    /**
     * Compute task weight with multipliers
     * @param {object} task - Task object
     * @param {object} settings - Settings object
     * @param {boolean} useWeighted - Whether to apply multipliers
     * @returns {number} Computed weight
     */
    const computeWeight = (task, settings, useWeighted = true) => {
        if (!useWeighted || !settings || !task) {
            const base = parseInt(task?.weight, 10);
            return Number.isFinite(base) ? base : 10;
        }
        
        const base = parseInt(task?.weight, 10);
        let w = Number.isFinite(base) ? base : 10;
        
        const priMult = settings.priorityMultipliers?.[task?.priority] ?? 1;
        const catMult = getCatMultiplier(task?.category, settings);
        
        const result = w * priMult * catMult;
        return Number.isFinite(result) ? result : 10;
    };

    /**
     * Pick random index from weighted array
     * @param {Array} items - Array of items
     * @param {Array} weights - Array of weights
     * @returns {number} Selected index
     */
    const pickWeightedIndex = (items, weights) => {
        if (!Array.isArray(items) || !Array.isArray(weights) || items.length === 0) {
            return 0;
        }
        
        const total = weights.reduce((a, b) => a + b, 0);
        if (total <= 0) return Math.floor(Math.random() * items.length);
        
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i;
        }
        return weights.length - 1;
    };

    // ===========================================
    // DATA ACCESS UTILITIES (People & Locations)
    // ===========================================

    /**
     * Get saved people with fallback
     * @returns {Array} Array of people
     */
    const getSavedPeople = () => {
        try {
            if (typeof window.getSavedPeople === 'function') {
                return window.getSavedPeople() || [];
            }
            if (window.DataManager?.people?.getAll) {
                return window.DataManager.people.getAll() || [];
            }
            const raw = localStorage.getItem('savedPeople');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    /**
     * Set saved people with fallback
     * @param {Array} people - Array of people
     * @returns {boolean} Success status
     */
    const setSavedPeople = (people) => {
        try {
            if (typeof window.setSavedPeople === 'function') {
                return window.setSavedPeople(people);
            }
            if (window.DataManager?.people?.setAll) {
                window.DataManager.people.setAll(people);
                return true;
            }
            localStorage.setItem('savedPeople', JSON.stringify(people));
            window.dispatchEvent(new Event('people-updated'));
            return true;
        } catch {
            return false;
        }
    };

    /**
     * Get saved locations with fallback
     * @returns {Array} Array of locations
     */
    const getSavedLocations = () => {
        try {
            if (typeof window.getSavedLocationsV1 === 'function') {
                return window.getSavedLocationsV1() || [];
            }
            if (window.DataManager?.locations?.getAll) {
                return window.DataManager.locations.getAll() || [];
            }
            const raw = localStorage.getItem('savedLocations_v1');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    /**
     * Set saved locations with fallback
     * @param {Array} locations - Array of locations
     * @returns {boolean} Success status
     */
    const setSavedLocations = (locations) => {
        try {
            if (typeof window.setSavedLocationsV1 === 'function') {
                return window.setSavedLocationsV1(locations);
            }
            if (window.DataManager?.locations?.setAll) {
                window.DataManager.locations.setAll(locations);
                return true;
            }
            localStorage.setItem('savedLocations_v1', JSON.stringify(locations));
            window.dispatchEvent(new Event('locations-updated'));
            return true;
        } catch {
            return false;
        }
    };

    /**
     * Get categories with fallback
     * @returns {Array} Array of categories
     */
    const getCategories = () => {
        try {
            if (window.DataManager?.categories?.getAll) {
                return window.DataManager.categories.getAll() || [];
            }
            const raw = localStorage.getItem('categories');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    // ===========================================
    // GENERAL UTILITIES
    // ===========================================

    /**
     * Clamp number between min and max
     * @param {number} n - Number to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    /**
     * Convert time value to minutes
     * @param {number|string} val - Time value
     * @param {string} unit - Unit ('min', 'hours', 'days', etc.)
     * @returns {number} Minutes
     */
    const toMinutes = (val, unit) => {
        const v = parseInt(val, 10) || 0;
        if (unit === 'hours' || unit === 'h') return v * 60;
        if (unit === 'days' || unit === 'd') return v * 1440;
        return v;
    };

    // ===========================================
    // EXPORTS
    // ===========================================

    window.TabUtils = {
        // Date utilities
        dayStart,
        isValidDate,
        parseDueDate,
        dueMatches,
        getDaysDiff,
        
        // Task filtering
        filterTasks,
        getActiveTasks,
        getCompletedTasks,
        
        // Category & XP
        getCatXpAdjust,
        getCatMultiplier,
        isSpinEligibleCategory,
        computeWeight,
        pickWeightedIndex,
        
        // Data access
        getSavedPeople,
        setSavedPeople,
        getSavedLocations,
        setSavedLocations,
        getCategories,
        
        // General
        clamp,
        toMinutes
    };

    console.log('✅ Tab utilities loaded (05-tab-utils.js)');

})();

