// 13-00-core-utils.jsx
(function() {
    // 1. Unified Toolbar Config
    function getTB() {
      return { size: 34, pad: '4px 8px', radius: 8, icon: 16, badge: 18, badgeFont: 11 };
    }
    window.getTB = getTB;
    window.TOOLBAR = getTB(); 

    // 2. Unified Date Utilities
    // All dates stored internally as UTC, localized only at render time
    const dateUtils = {
      /**
       * Get today's date as UTC date string (YYYY-MM-DD)
       * Returns the current date in UTC timezone
       */
      todayStr: () => {
        const now = new Date();
        // Get UTC date components
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },

      /**
       * Convert UTC date string to local date string for display
       * @param {string} utcDateStr - UTC date string (YYYY-MM-DD or ISO string)
       * @returns {string} Local date string (YYYY-MM-DD) for date inputs
       */
      utcToLocalDateStr: (utcDateStr) => {
        if (!utcDateStr) return '';
        // Parse as UTC and convert to local date
        const utcDate = new Date(utcDateStr.includes('T') ? utcDateStr : utcDateStr + 'T00:00:00Z');
        if (isNaN(utcDate.getTime())) return '';
        const year = utcDate.getFullYear();
        const month = String(utcDate.getMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },

      /**
       * Convert local date string to UTC date string for storage
       * @param {string} localDateStr - Local date string (YYYY-MM-DD)
       * @returns {string} UTC date string (YYYY-MM-DD)
       */
      localToUtcDateStr: (localDateStr) => {
        if (!localDateStr) return '';
        // Parse as local date and convert to UTC
        const localDate = new Date(localDateStr + 'T00:00:00');
        if (isNaN(localDate.getTime())) return '';
        const year = localDate.getUTCFullYear();
        const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(localDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },

      /**
       * Format UTC date string for human-readable display (localized)
       * @param {string} utcDateStr - UTC date string (YYYY-MM-DD or ISO string)
       * @returns {string} Formatted date string
       */
      formatHuman: (utcDateStr) => {
        if (!utcDateStr) return '';
        // Parse UTC date and format in local timezone
        const utcDate = new Date(utcDateStr.includes('T') ? utcDateStr : utcDateStr + 'T00:00:00Z');
        if (isNaN(utcDate.getTime())) return '';
        return utcDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      },

      /**
       * Check if UTC date is in the past
       * @param {string} utcDateStr - UTC date string (YYYY-MM-DD)
       * @returns {boolean} True if date is in the past
       */
      isPast: (utcDateStr) => {
        if (!utcDateStr) return false;
        return utcDateStr < dateUtils.todayStr();
      },

      /**
       * Check if UTC date is today
       * @param {string} utcDateStr - UTC date string (YYYY-MM-DD)
       * @returns {boolean} True if date is today
       */
      isToday: (utcDateStr) => {
        if (!utcDateStr) return false;
        return utcDateStr === dateUtils.todayStr();
      },

      /**
       * Check if UTC date is tomorrow
       * @param {string} utcDateStr - UTC date string (YYYY-MM-DD)
       * @returns {boolean} True if date is tomorrow
       */
      isTomorrow: (utcDateStr) => {
        if (!utcDateStr) return false;
        const today = dateUtils.todayStr();
        const todayDate = new Date(today + 'T00:00:00Z');
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
        return utcDateStr === tomorrowStr;
      },

      /**
       * Get days difference between UTC date and today
       * @param {string} utcDateStr - UTC date string (YYYY-MM-DD)
       * @returns {number|null} Days difference (negative = past, positive = future)
       */
      daysDiff: (utcDateStr) => {
        if (!utcDateStr) return null;
        const today = dateUtils.todayStr();
        const todayDate = new Date(today + 'T00:00:00Z');
        const targetDate = new Date(utcDateStr + 'T00:00:00Z');
        if (isNaN(targetDate.getTime())) return null;
        return Math.ceil((targetDate.getTime() - todayDate.getTime()) / 86400000);
      }
    };
    window.dateUtils = dateUtils;
    console.log('✅ 13-00-core-utils.jsx loaded');
})();