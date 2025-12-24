// js/components/22-app-hooks.jsx
// Updated: 2025-12-18 10:00 PT
// ===========================================
// APP HOOKS (data state + persistence)
// ===========================================

(function () {
  const { useEffect, useState } = React;

  function useAppData(DM) {
    // Data States
    const [tasks, setTasksInternal] = useState(() => DM?.tasks?.getAll() || []);
    const [goals, setGoalsInternal] = useState(() => DM?.goals?.getAll() || []);
    const [categories, setCategoriesInternal] = useState(() => DM?.categories?.getAll() || []);
    const [userStats, setUserStatsInternal] = useState(() => DM?.userStats?.get() || { xp: 0, level: 1 });
    const [activities, setActivitiesInternal] = useState(() => DM?.activities?.getAll() || []);
    const [scratchpad, setScratchpadInternal] = useState(() => DM?.scratchpad?.get() || '');
    const [savedNotes, setSavedNotesInternal] = useState(() => DM?.savedNotes?.getAll() || []);
    const [settings, setSettingsInternal] = useState(() => DM?.settings?.get() || window.DEFAULT_SETTINGS);
    const [timerState, setTimerStateInternal] = useState(() => DM?.timerState?.get() || {
      isRunning: false, startTime: null, storedTime: 0, activityName: 'Tracked Session'
    });

    // People
    const [allPeople, setAllPeople] = useState(() => {
      if (DM?.people?.getAll?.()) return DM.people.getAll();
      try { return JSON.parse(localStorage.getItem('savedPeople') || '[]'); } catch { return []; }
    });

    // Helper Setters (persist through DM)
    const setTasks = (val) => {
      const newVal = (typeof val === 'function') ? val(tasks) : val;
      setTasksInternal(newVal);
      DM?.tasks?.setAll?.(newVal);
    };

    const setGoals = (val) => {
      const newVal = (typeof val === 'function') ? val(goals) : val;
      setGoalsInternal(newVal);
      DM?.goals?.setAll?.(newVal);
    };

    const setCategories = (val) => {
      const newVal = (typeof val === 'function') ? val(categories) : val;
      setCategoriesInternal(newVal);
      DM?.categories?.setAll?.(newVal);
    };

    const setUserStats = (val) => {
      const newVal = (typeof val === 'function') ? val(userStats) : val;
      setUserStatsInternal(newVal);
      DM?.userStats?.set?.(newVal);
    };

    const setActivities = (val) => {
      const newVal = (typeof val === 'function') ? val(activities) : val;
      setActivitiesInternal(newVal);
      DM?.activities?.setAll?.(newVal);
    };

    const setScratchpad = (val) => {
      const newVal = (typeof val === 'function') ? val(scratchpad) : val;
      setScratchpadInternal(newVal);
      DM?.scratchpad?.set?.(newVal);
    };

    const setSavedNotes = (val) => {
      const newVal = (typeof val === 'function') ? val(savedNotes) : val;
      setSavedNotesInternal(newVal);
      DM?.savedNotes?.setAll?.(newVal);
    };

    const setSettings = (val) => {
      const newVal = (typeof val === 'function') ? val(settings) : val;
      setSettingsInternal(newVal);
      DM?.settings?.set?.(newVal);
    };

    const setTimerState = (val) => {
      const newVal = (typeof val === 'function') ? val(timerState) : val;
      setTimerStateInternal(newVal);
      DM?.timerState?.set?.(newVal);
    };

    const setPeople = (val) => {
      const newVal = (typeof val === 'function') ? val(allPeople) : val;
      setAllPeople(newVal);

      if (DM?.people?.setAll) {
        DM.people.setAll(newVal);
      } else {
        localStorage.setItem('savedPeople', JSON.stringify(newVal));
        window.dispatchEvent(new Event('people-updated'));
      }
    };

    // Keep people in sync with global events (TaskForm + People Manager, etc.)
    useEffect(() => {
      const refreshPeople = () => {
        if (DM?.people?.getAll) setAllPeople(DM.people.getAll());
        else {
          try { setAllPeople(JSON.parse(localStorage.getItem('savedPeople') || '[]')); }
          catch { setAllPeople([]); }
        }
      };
      window.addEventListener('people-updated', refreshPeople);
      return () => window.removeEventListener('people-updated', refreshPeople);
    }, [DM]);

    // Theme application
    useEffect(() => {
      const theme = settings.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);

      // Apply custom theme if it exists
      const customThemes = settings.customThemes || {};
      if (customThemes[theme]) {
        // Remove any existing custom theme style
        const existingStyle = document.getElementById('custom-theme-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        // Inject custom theme CSS
        const style = document.createElement('style');
        style.id = 'custom-theme-style';
        const cssVars = customThemes[theme].cssVariables || {};
        const cssText = Object.entries(cssVars)
          .map(([key, value]) => `  ${key}: ${value};`)
          .join('\n');
        style.textContent = `[data-theme="${theme}"] {\n${cssText}\n}`;
        document.head.appendChild(style);
      } else {
        // Remove custom theme style if switching to a built-in theme
        const existingStyle = document.getElementById('custom-theme-style');
        if (existingStyle) {
          existingStyle.remove();
        }
      }

      const metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (metaThemeColor) {
        const colors = {
          dark: '#ff6b35',
          light: '#ff6b35',
          midnight: '#38bdf8',
          forest: '#4ade80',
          synthwave: '#d946ef',
          coffee: '#d4a373'
        };
        // Use custom theme primary color if available
        const customTheme = customThemes[theme];
        const primaryColor = customTheme?.cssVariables?.['--primary'] || colors[theme] || '#ff6b35';
        metaThemeColor.setAttribute("content", primaryColor);
      }
    }, [settings.theme, settings.customThemes]);

    return {
      tasks, setTasks,
      goals, setGoals,
      categories, setCategories,
      userStats, setUserStats,
      activities, setActivities,
      scratchpad, setScratchpad,
      savedNotes, setSavedNotes,
      settings, setSettings,
      timerState, setTimerState,
      allPeople, setPeople,
    };
  }

  window.useAppData = useAppData;

  console.log('✅ 22-app-hooks.jsx loaded');
})();
