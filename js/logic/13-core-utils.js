// 13-00-core-utils.jsx
(function() {
    // 1. Unified Toolbar Config
    function getTB() {
      return { size: 34, pad: '4px 8px', radius: 8, icon: 16, badge: 18, badgeFont: 11 };
    }
    window.getTB = getTB;
    window.TOOLBAR = getTB(); 

    // 2. Unified Date Utilities
    const dateUtils = {
      todayStr: () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      },
      formatHuman: (isoDate) => {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      },
      isPast: (isoDate) => isoDate && isoDate < dateUtils.todayStr(),
      isToday: (isoDate) => isoDate === dateUtils.todayStr(),
      isTomorrow: (isoDate) => {
        if (!isoDate) return false;
        const today = new Date(dateUtils.todayStr());
        const target = new Date(isoDate + 'T00:00:00'); 
        return Math.abs(((target - today) / 86400000) - 1) < 0.1; 
      },
      daysDiff: (isoDate) => {
        if (!isoDate) return null;
        const today = new Date(dateUtils.todayStr());
        const target = new Date(isoDate + 'T00:00:00');
        return Math.ceil((target - today) / 86400000);
      }
    };
    window.dateUtils = dateUtils;
    console.log('✅ 13-00-core-utils.jsx loaded');
})();