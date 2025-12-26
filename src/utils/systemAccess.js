// src/utils/systemAccess.js
// ===========================================
// 🔋 SYSTEM ACCESS: Battery, DND, Device State
// ===========================================
//
// Usage Examples:
//
// 1. Initialize monitoring:
//    await SystemAccess.init();
//
// 2. Get battery level:
//    const level = SystemAccess.getBatteryLevel(); // 0-100 or null
//    const isCharging = SystemAccess.isCharging();
//
// 3. Check Do Not Disturb state:
//    const dndState = SystemAccess.getDNDState();
//    const isDND = SystemAccess.isDNDActive();
//
// 4. Get device state:
//    const deviceState = SystemAccess.getDeviceState();
//
// 5. Subscribe to changes:
//    const unsubscribe = SystemAccess.onBatteryChange((battery) => {
//      console.log('Battery:', battery.level * 100 + '%');
//    });
//    const unsubscribeDND = SystemAccess.onDNDChange((dnd) => {
//      console.log('DND active:', dnd.active);
//    });
//

/**
 * System Access Manager
 * Provides battery level monitoring, Do Not Disturb detection, and device state monitoring
 */
const SystemAccess = {
    // State
    battery: null,
    isMonitoring: false,
    listeners: {
        battery: [],
        dnd: [],
        deviceState: [],
        online: [],
        visibility: []
    },
    
    // Internal state
    _batteryManager: null,
    _lastBatteryLevel: null,
    _lastDNDState: null,
    _lastDeviceState: null,
    
    /**
     * Initialize system access monitoring
     * @returns {Promise<boolean>} True if successfully initialized
     */
    async init() {
        if (this.isMonitoring) {
            return true;
        }
        
        try {
            // Initialize battery monitoring
            await this._initBattery();
            
            // Initialize visibility monitoring (for DND detection)
            this._initVisibility();
            
            // Initialize online/offline monitoring
            this._initOnlineStatus();
            
            // Initialize focus monitoring
            this._initFocus();
            
            this.isMonitoring = true;
            return true;
        } catch (error) {
            console.error('SystemAccess init error:', error);
            return false;
        }
    },
    
    /**
     * Initialize battery API monitoring
     * @private
     */
    async _initBattery() {
        if (!navigator.getBattery) {
            console.log('Battery API not supported');
            return;
        }
        
        try {
            this._batteryManager = await navigator.getBattery();
            this.battery = {
                level: this._batteryManager.level,
                charging: this._batteryManager.charging,
                chargingTime: this._batteryManager.chargingTime,
                dischargingTime: this._batteryManager.dischargingTime,
                supported: true
            };
            
            // Listen to battery events
            this._batteryManager.addEventListener('chargingchange', () => this._onBatteryChange());
            this._batteryManager.addEventListener('chargingtimechange', () => this._onBatteryChange());
            this._batteryManager.addEventListener('dischargingtimechange', () => this._onBatteryChange());
            this._batteryManager.addEventListener('levelchange', () => this._onBatteryChange());
            
            this._onBatteryChange();
        } catch (error) {
            console.error('Battery API error:', error);
            this.battery = { supported: false, error: error.message };
        }
    },
    
    /**
     * Handle battery state changes
     * @private
     */
    _onBatteryChange() {
        if (!this._batteryManager) return;
        
        const newState = {
            level: this._batteryManager.level,
            charging: this._batteryManager.charging,
            chargingTime: this._batteryManager.chargingTime,
            dischargingTime: this._batteryManager.dischargingTime,
            supported: true,
            timestamp: Date.now()
        };
        
        const changed = !this._lastBatteryLevel || 
            this._lastBatteryLevel.level !== newState.level ||
            this._lastBatteryLevel.charging !== newState.charging;
        
        this.battery = newState;
        this._lastBatteryLevel = { ...newState };
        
        if (changed) {
            this._notifyListeners('battery', newState);
        }
    },
    
    /**
     * Initialize visibility API monitoring (for DND detection)
     * @private
     */
    _initVisibility() {
        if (!document) return;
        
        const handleVisibilityChange = () => {
            const isVisible = !document.hidden;
            const dndState = this.getDNDState();
            
            if (this._lastDNDState !== dndState) {
                this._lastDNDState = dndState;
                this._notifyListeners('dnd', dndState);
                this._notifyListeners('visibility', { visible: isVisible, dnd: dndState });
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Initial check
        handleVisibilityChange();
    },
    
    /**
     * Initialize online/offline monitoring
     * @private
     */
    _initOnlineStatus() {
        if (!window) return;
        
        const handleOnlineChange = () => {
            const isOnline = navigator.onLine;
            const deviceState = this.getDeviceState();
            this._notifyListeners('online', { online: isOnline, deviceState });
        };
        
        window.addEventListener('online', handleOnlineChange);
        window.addEventListener('offline', handleOnlineChange);
        
        // Initial state
        handleOnlineChange();
    },
    
    /**
     * Initialize focus monitoring
     * @private
     */
    _initFocus() {
        if (!window) return;
        
        const handleFocusChange = () => {
            const dndState = this.getDNDState();
            const dndActive = dndState.active;
            
            if (!this._lastDNDState || this._lastDNDState.active !== dndActive) {
                this._lastDNDState = dndState;
                this._notifyListeners('dnd', dndState);
            }
            
            const deviceState = this.getDeviceState();
            const deviceStateStr = JSON.stringify(deviceState);
            const lastDeviceStateStr = this._lastDeviceState ? JSON.stringify(this._lastDeviceState) : null;
            
            if (deviceStateStr !== lastDeviceStateStr) {
                this._lastDeviceState = { ...deviceState };
                this._notifyListeners('deviceState', deviceState);
            }
        };
        
        window.addEventListener('focus', handleFocusChange);
        window.addEventListener('blur', handleFocusChange);
        
        // Initial check
        handleFocusChange();
    },
    
    /**
     * Get current battery information
     * @returns {object} Battery state object
     */
    getBattery() {
        if (!this.battery) {
            return {
                supported: false,
                level: null,
                charging: null,
                chargingTime: null,
                dischargingTime: null
            };
        }
        
        return { ...this.battery };
    },
    
    /**
     * Get battery level as percentage (0-100)
     * @returns {number|null} Battery percentage or null if not available
     */
    getBatteryLevel() {
        if (!this.battery || !this.battery.supported) {
            return null;
        }
        return Math.round(this.battery.level * 100);
    },
    
    /**
     * Check if device is charging
     * @returns {boolean|null} True if charging, false if not, null if unknown
     */
    isCharging() {
        if (!this.battery || !this.battery.supported) {
            return null;
        }
        return this.battery.charging;
    },
    
    /**
     * Get estimated time until fully charged (in seconds)
     * @returns {number|null} Time in seconds or null if not available
     */
    getChargingTime() {
        if (!this.battery || !this.battery.supported || !this.battery.charging) {
            return null;
        }
        return this.battery.chargingTime === Infinity ? null : this.battery.chargingTime;
    },
    
    /**
     * Get estimated time until battery depleted (in seconds)
     * @returns {number|null} Time in seconds or null if not available
     */
    getDischargingTime() {
        if (!this.battery || !this.battery.supported || this.battery.charging) {
            return null;
        }
        return this.battery.dischargingTime === Infinity ? null : this.battery.dischargingTime;
    },
    
    /**
     * Get Do Not Disturb state
     * Uses visibility and focus as indicators
     * @returns {object} DND state { active: boolean, reason: string, details: object }
     */
    getDNDState() {
        const state = {
            active: false,
            reason: 'none',
            details: {}
        };
        
        if (!document || !window) {
            return state;
        }
        
        const isHidden = document.hidden;
        const isFocused = document.hasFocus();
        const visibilityState = document.visibilityState;
        
        // DND is active if:
        // 1. Page is hidden (user switched tabs/apps)
        // 2. Page is not focused (user is in another window)
        // 3. Visibility state is 'hidden'
        
        if (isHidden || !isFocused || visibilityState === 'hidden') {
            state.active = true;
            
            if (visibilityState === 'hidden') {
                state.reason = 'hidden';
                state.details = { visibilityState, isFocused };
            } else if (!isFocused) {
                state.reason = 'unfocused';
                state.details = { visibilityState, isFocused, isHidden };
            } else {
                state.reason = 'background';
                state.details = { visibilityState, isFocused, isHidden };
            }
        } else {
            state.active = false;
            state.reason = 'active';
            state.details = { visibilityState, isFocused, isHidden };
        }
        
        return state;
    },
    
    /**
     * Check if Do Not Disturb mode is active
     * @returns {boolean} True if DND is active
     */
    isDNDActive() {
        return this.getDNDState().active;
    },
    
    /**
     * Get comprehensive device state
     * @returns {object} Device state object
     */
    getDeviceState() {
        const state = {
            online: navigator.onLine || false,
            visibility: document?.visibilityState || 'unknown',
            isVisible: !document?.hidden,
            isFocused: document?.hasFocus() || false,
            dnd: this.getDNDState(),
            battery: this.getBattery(),
            connection: this.getConnectionInfo(),
            timestamp: Date.now()
        };
        
        return state;
    },
    
    /**
     * Get network connection information
     * @returns {object} Connection info
     */
    getConnectionInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (!conn) {
            return {
                supported: false,
                effectiveType: null,
                downlink: null,
                rtt: null,
                saveData: null
            };
        }
        
        return {
            supported: true,
            effectiveType: conn.effectiveType || null,
            downlink: conn.downlink || null,
            rtt: conn.rtt || null,
            saveData: conn.saveData || false,
            type: conn.type || null
        };
    },
    
    /**
     * Subscribe to battery changes
     * @param {Function} callback - Callback function(batteryState)
     * @returns {Function} Unsubscribe function
     */
    onBatteryChange(callback) {
        if (typeof callback !== 'function') {
            console.error('SystemAccess.onBatteryChange: callback must be a function');
            return () => {};
        }
        
        this.listeners.battery.push(callback);
        
        // Immediately call with current state
        if (this.battery) {
            callback(this.getBattery());
        }
        
        return () => {
            const index = this.listeners.battery.indexOf(callback);
            if (index > -1) {
                this.listeners.battery.splice(index, 1);
            }
        };
    },
    
    /**
     * Subscribe to DND state changes
     * @param {Function} callback - Callback function(dndState)
     * @returns {Function} Unsubscribe function
     */
    onDNDChange(callback) {
        if (typeof callback !== 'function') {
            console.error('SystemAccess.onDNDChange: callback must be a function');
            return () => {};
        }
        
        this.listeners.dnd.push(callback);
        
        // Immediately call with current state
        callback(this.getDNDState());
        
        return () => {
            const index = this.listeners.dnd.indexOf(callback);
            if (index > -1) {
                this.listeners.dnd.splice(index, 1);
            }
        };
    },
    
    /**
     * Subscribe to device state changes
     * @param {Function} callback - Callback function(deviceState)
     * @returns {Function} Unsubscribe function
     */
    onDeviceStateChange(callback) {
        if (typeof callback !== 'function') {
            console.error('SystemAccess.onDeviceStateChange: callback must be a function');
            return () => {};
        }
        
        this.listeners.deviceState.push(callback);
        
        // Immediately call with current state
        callback(this.getDeviceState());
        
        return () => {
            const index = this.listeners.deviceState.indexOf(callback);
            if (index > -1) {
                this.listeners.deviceState.splice(index, 1);
            }
        };
    },
    
    /**
     * Subscribe to online/offline changes
     * @param {Function} callback - Callback function({ online: boolean, deviceState })
     * @returns {Function} Unsubscribe function
     */
    onOnlineChange(callback) {
        if (typeof callback !== 'function') {
            console.error('SystemAccess.onOnlineChange: callback must be a function');
            return () => {};
        }
        
        this.listeners.online.push(callback);
        
        // Immediately call with current state
        callback({ online: navigator.onLine, deviceState: this.getDeviceState() });
        
        return () => {
            const index = this.listeners.online.indexOf(callback);
            if (index > -1) {
                this.listeners.online.splice(index, 1);
            }
        };
    },
    
    /**
     * Subscribe to visibility changes
     * @param {Function} callback - Callback function({ visible: boolean, dnd })
     * @returns {Function} Unsubscribe function
     */
    onVisibilityChange(callback) {
        if (typeof callback !== 'function') {
            console.error('SystemAccess.onVisibilityChange: callback must be a function');
            return () => {};
        }
        
        this.listeners.visibility.push(callback);
        
        // Immediately call with current state
        const isVisible = !document?.hidden;
        callback({ visible: isVisible, dnd: this.getDNDState() });
        
        return () => {
            const index = this.listeners.visibility.indexOf(callback);
            if (index > -1) {
                this.listeners.visibility.splice(index, 1);
            }
        };
    },
    
    /**
     * Notify all listeners of a specific type
     * @private
     */
    _notifyListeners(type, data) {
        if (!this.listeners[type]) return;
        
        this.listeners[type].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`SystemAccess listener error (${type}):`, error);
            }
        });
    },
    
    /**
     * Clean up and stop monitoring
     */
    destroy() {
        this.isMonitoring = false;
        
        // Clear all listeners
        Object.keys(this.listeners).forEach(key => {
            this.listeners[key] = [];
        });
        
        // Note: Battery API listeners are automatically cleaned up
        // when the battery manager is garbage collected
        
        this._batteryManager = null;
        this.battery = null;
        this._lastBatteryLevel = null;
        this._lastDNDState = null;
        this._lastDeviceState = null;
    }
};

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
    window.SystemAccess = SystemAccess;
}

export default SystemAccess;

