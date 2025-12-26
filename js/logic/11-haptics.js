// js/logic/11-haptics.js
// ===========================================
// 📳 HAPTIC FEEDBACK SYSTEM
// ===========================================
// Uses Navigator Vibration API for haptic feedback on mobile devices

(function () {
    'use strict';

    const Haptics = {
        // Internal state
        _settings: null,
        _isSupported: null,
        
        /**
         * Check if vibration API is supported
         * @returns {boolean}
         */
        isSupported: function() {
            if (this._isSupported !== null) {
                return this._isSupported;
            }
            
            this._isSupported = !!(navigator && navigator.vibrate && typeof navigator.vibrate === 'function');
            return this._isSupported;
        },
        
        /**
         * Get settings object (lazy load)
         * @private
         */
        _getSettings: function() {
            if (this._settings !== null) {
                return this._settings;
            }
            
            // Try to get settings from window.DM (DataManager) if available
            if (window.DM && window.DM.settings && window.DM.settings.get) {
                this._settings = window.DM.settings.get();
            } else {
                // Fallback to default settings
                this._settings = window.DEFAULT_SETTINGS || { enableHaptics: true };
            }
            
            return this._settings;
        },
        
        /**
         * Check if haptics are enabled (checks both API support and settings)
         * @returns {boolean}
         */
        isEnabled: function() {
            if (!this.isSupported()) {
                return false;
            }
            
            const settings = this._getSettings();
            return settings && settings.enableHaptics !== false; // Default to true if not set
        },
        
        /**
         * Update settings reference (call this when settings change)
         * @param {object} newSettings - New settings object
         */
        updateSettings: function(newSettings) {
            this._settings = newSettings;
        },
        
        /**
         * Core vibration function
         * @param {number|array} pattern - Vibration pattern (ms duration or array of [vibrate, pause, vibrate, ...])
         * @returns {boolean} True if vibration was triggered
         */
        vibrate: function(pattern) {
            if (!this.isEnabled()) {
                return false;
            }
            
            try {
                if (typeof pattern === 'number') {
                    pattern = [pattern];
                }
                
                if (Array.isArray(pattern)) {
                    navigator.vibrate(pattern);
                    return true;
                }
            } catch (error) {
                // Silently fail on unsupported devices or errors
                console.warn('Haptics vibration error:', error);
            }
            
            return false;
        },
        
        /**
         * Stop any ongoing vibration
         */
        stop: function() {
            if (this.isSupported()) {
                try {
                    navigator.vibrate(0);
                } catch (error) {
                    // Silently fail
                }
            }
        },
        
        // ===========================================
        // PRESET PATTERNS
        // ===========================================
        
        /**
         * Light tap (quick, subtle)
         */
        light: function() {
            return this.vibrate(10);
        },
        
        /**
         * Medium tap (standard feedback)
         */
        medium: function() {
            return this.vibrate(20);
        },
        
        /**
         * Heavy tap (strong feedback)
         */
        heavy: function() {
            return this.vibrate(40);
        },
        
        /**
         * Double tap pattern
         */
        double: function() {
            return this.vibrate([15, 30, 15]);
        },
        
        /**
         * Triple tap pattern
         */
        triple: function() {
            return this.vibrate([10, 20, 10, 20, 10]);
        },
        
        /**
         * Success pattern (short-short-long)
         */
        success: function() {
            return this.vibrate([20, 40, 60]);
        },
        
        /**
         * Error pattern (long vibration)
         */
        error: function() {
            return this.vibrate([100]);
        },
        
        /**
         * Warning pattern (medium-long-medium)
         */
        warning: function() {
            return this.vibrate([50, 30, 50]);
        },
        
        /**
         * Selection tick (very quick)
         */
        tick: function() {
            return this.vibrate(5);
        },
        
        /**
         * Impact pattern (for button presses)
         */
        impact: function() {
            return this.vibrate([30, 20, 30]);
        },
        
        /**
         * Notification pattern (distinct pattern)
         */
        notification: function() {
            return this.vibrate([50, 100, 50]);
        },
        
        /**
         * Celebration pattern (rhythmic pattern)
         */
        celebration: function() {
            return this.vibrate([20, 30, 20, 30, 40, 50, 60]);
        },
        
        /**
         * Spin wheel tick (for rapid feedback during spin)
         */
        spinTick: function() {
            return this.vibrate(8);
        },
        
        /**
         * Task completion pattern
         */
        taskComplete: function() {
            return this.vibrate([30, 50, 80]);
        },
        
        /**
         * Level up / achievement pattern
         */
        levelUp: function() {
            return this.vibrate([40, 60, 100, 80, 60, 40]);
        },
        
        /**
         * Delete / destructive action pattern
         */
        destructive: function() {
            return this.vibrate([80, 40, 80]);
        },
        
        /**
         * Cancel / dismiss pattern
         */
        cancel: function() {
            return this.vibrate([30, 60, 30]);
        }
    };

    // ==========================================
    // EXPOSE GLOBALS
    // ==========================================
    window.Haptics = Haptics;
    
    // Also expose as safeHaptics for backward compatibility with existing code
    window.safeHaptics = function(pattern) {
        if (pattern === undefined) {
            pattern = [50];
        }
        return Haptics.vibrate(pattern);
    };

    console.log('✅ Haptics loaded');
})();

