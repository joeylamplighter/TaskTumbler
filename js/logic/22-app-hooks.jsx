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
      
      // Apply sharp edges setting
      if (settings.sharpEdges) {
        document.documentElement.setAttribute('data-sharp-edges', 'true');
      } else {
        document.documentElement.removeAttribute('data-sharp-edges');
      }

      // Apply advanced UI settings
      const advancedUI = settings.advancedUI || {};
      
      // Font Size
      const fontSize = advancedUI.fontSize || 'medium';
      const fontSizeMap = {
        small: '0.875',    // 14px base -> 12.25px
        medium: '1',       // 14px base -> 14px
        large: '1.125',    // 14px base -> 15.75px
        xlarge: '1.25'     // 14px base -> 17.5px
      };
      document.documentElement.style.setProperty('--font-size-multiplier', fontSizeMap[fontSize] || '1');
      document.documentElement.setAttribute('data-font-size', fontSize);
      
      // Border Radius (only if sharp edges is not enabled)
      if (!settings.sharpEdges) {
        const borderRadius = advancedUI.borderRadius || 'normal';
        const radiusMap = {
          sharp: { sm: '0px', md: '0px', lg: '0px', xl: '0px' },
          normal: { sm: '6px', md: '10px', lg: '16px', xl: '20px' },
          rounded: { sm: '8px', md: '12px', lg: '20px', xl: '24px' },
          pill: { sm: '999px', md: '999px', lg: '999px', xl: '999px' }
        };
        const radii = radiusMap[borderRadius] || radiusMap.normal;
        document.documentElement.style.setProperty('--radius-sm', radii.sm);
        document.documentElement.style.setProperty('--radius-md', radii.md);
        document.documentElement.style.setProperty('--radius-lg', radii.lg);
        document.documentElement.style.setProperty('--radius-xl', radii.xl);
        document.documentElement.style.setProperty('--border-radius-sm', radii.sm);
        document.documentElement.style.setProperty('--border-radius-md', radii.md);
        document.documentElement.style.setProperty('--border-radius-lg', radii.lg);
        document.documentElement.style.setProperty('--border-radius-xl', radii.xl);
        document.documentElement.setAttribute('data-border-radius', borderRadius);
      } else {
        // If sharp edges is enabled, remove border radius attribute
        document.documentElement.removeAttribute('data-border-radius');
      }
      
      // Animation Speed
      const animationSpeed = advancedUI.animationSpeed || 'normal';
      const speedMap = {
        instant: '0s',
        fast: '0.1s',
        normal: '0.2s',
        slow: '0.4s'
      };
      document.documentElement.style.setProperty('--transition-speed', speedMap[animationSpeed] || '0.2s');
      document.documentElement.setAttribute('data-animation-speed', animationSpeed);
      
      // Glass Effect
      if (advancedUI.glassEffect) {
        document.documentElement.setAttribute('data-glass-effect', 'true');
      } else {
        document.documentElement.removeAttribute('data-glass-effect');
      }
      
      // Gradients
      if (advancedUI.gradients) {
        document.documentElement.setAttribute('data-gradients', 'true');
      } else {
        document.documentElement.removeAttribute('data-gradients');
      }
      
      // Compact Mode
      if (advancedUI.compactMode) {
        document.documentElement.setAttribute('data-compact-mode', 'true');
      } else {
        document.documentElement.removeAttribute('data-compact-mode');
      }
      
      // Reduced Motion (also check top-level setting)
      if (advancedUI.reducedMotion || settings.reducedMotion) {
        document.documentElement.setAttribute('data-reduced-motion', 'true');
      } else {
        document.documentElement.removeAttribute('data-reduced-motion');
      }
      
      // Font Family
      const fontFamily = advancedUI.fontFamily || 'system';
      const fontMap = {
        system: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fredoka: "'Fredoka', sans-serif",
        inter: "'Inter', sans-serif",
        roboto: "'Roboto', sans-serif",
        poppins: "'Poppins', sans-serif",
        'comic-sans': "'Comic Sans MS', cursive"
      };
      document.documentElement.style.setProperty('--font-family-base', fontMap[fontFamily] || fontMap.system);
      document.documentElement.setAttribute('data-font-family', fontFamily);

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
    }, [settings.theme, settings.customThemes, settings.sharpEdges, settings.advancedUI, settings.reducedMotion]);

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
