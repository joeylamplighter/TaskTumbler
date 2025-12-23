// src/utils/notifications.js
// ===========================================
// 🔖 BROWSER NOTIFICATIONS
// ===========================================

const BrowserNotifications = {
    permission: null,
    
    /**
     * Check if notifications are supported
     * @returns {boolean}
     */
    isSupported() {
        return 'Notification' in window;
    },
    
    /**
     * Get current permission state
     * @returns {string} 'granted' | 'denied' | 'default'
     */
    getPermission() {
        if (!this.isSupported()) return 'denied';
        return Notification.permission;
    },
    
    /**
     * Request notification permission from user
     * @returns {Promise<boolean>} True if granted
     */
    async requestPermission() {
        if (!this.isSupported()) {
            console.log('Notifications not supported');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        }
        
        return false;
    },
    
    /**
     * Send a browser notification
     * @param {string} title - Notification title
     * @param {object} options - Notification options
     * @returns {Notification|null}
     */
    send(title, options = {}) {
        if (this.permission !== 'granted' && Notification.permission !== 'granted') {
            return null;
        }
        
        const defaultOptions = {
            icon: 'https://cdn-icons-png.flaticon.com/512/2997/2997985.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/2997/2997985.png',
            tag: 'tasktumbler',
            renotify: true,
            requireInteraction: false,
            silent: false
        };
        
        const notification = new Notification(title, {
            ...defaultOptions,
            ...options
        });
        
        return notification;
    },
    
    /**
     * Send a task due notification
     * @param {object} task - Task object
     * @param {string} message - Custom message
     */
    sendTaskDue(task, message = '') {
        if (!task) return;
        
        const body = message || `"${task.title}" is due soon!`;
        
        const notification = this.send('Task Reminder', {
            body,
            tag: `task-${task.id}`,
            data: { taskId: task.id }
        });
        
        if (notification) {
            notification.onclick = () => {
                window.focus();
                notification.close();
                window.dispatchEvent(new CustomEvent('notification-click', { 
                    detail: { taskId: task.id } 
                }));
            };
        }
    },
    
    /**
     * Send an achievement notification
     * @param {string} title - Achievement title
     * @param {string} description - Achievement description
     */
    sendAchievement(title, description = '') {
        this.send(`🏆 ${title}`, {
            body: description,
            tag: 'achievement',
            requireInteraction: true
        });
    },
    
    /**
     * Schedule a notification for later
     * @param {string} title - Notification title
     * @param {object} options - Notification options
     * @param {number} delayMs - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    schedule(title, options = {}, delayMs = 0) {
        return setTimeout(() => {
            this.send(title, options);
        }, delayMs);
    },
    
    /**
     * Cancel a scheduled notification
     * @param {number} timeoutId - ID from schedule()
     */
    cancel(timeoutId) {
        clearTimeout(timeoutId);
    }
};

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
    window.BrowserNotifications = BrowserNotifications;
}

export default BrowserNotifications;

