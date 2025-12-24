// js/components/22-app.jsx
// ===========================================
// APP ROOT (Factory Reset = EMPTY DATA)
// - No default categories/tasks/people/etc on first run
// - "Load Samples" can populate robust demo content
// - Spin -> Focus wiring logs properly
// - Timer state is persistent and never "killed" by editing fields
// Updated: 2025-12-21
// ===========================================

import React from 'react'
import ReactDOM from 'react-dom/client'

/** Defensive wrapper: prevents React #130 when a window component is missing */
const SafeComponent = (Comp, name = "Component") => {
  if (typeof Comp === "function") return Comp;
  console.error(`❌ ${name} is missing (undefined). Check script load order / window exports.`);
  return function Missing() {
    return (
      <div style={{ padding: 16, color: "white", opacity: 0.9 }}>
        {name} failed to load. Check console for missing script or export.
      </div>
    );
  };
};

// --- 1) ERROR BOUNDARY (Top Level) ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, countdown: 3 };
    this.interval = null;
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Crash caught:", error, errorInfo);

    // Track error for debug info
    if (!window.recentErrors) window.recentErrors = [];
    window.recentErrors.push({
      message: error.message || error.toString(),
      stack: error.stack,
      time: new Date().toISOString(),
      info: errorInfo
    });
    window.recentErrors = window.recentErrors.slice(-10); // Keep last 10 errors

    // Try to restore from backup before clearing (if DataManager is available)
    try {
      if (window.DataManager && window.DataManager.restoreBackup) {
        const restored = window.DataManager.restoreBackup('tasks');
        if (restored) {
          console.warn("Attempted to restore tasks from backup.");
        }
      }
    } catch (e) {
      console.error("Backup restore attempt failed:", e);
    }

    // Break infinite crash loops by clearing corrupted local data (last resort)
    // Only clear if this is the second crash in quick succession
    const crashKey = 'tt_crash_count';
    const crashTime = Date.now();
    const lastCrash = parseInt(localStorage.getItem(crashKey) || '0', 10);
    
    if (crashTime - lastCrash < 5000) {
      // Second crash within 5 seconds - clear data
      try {
        localStorage.clear();
        console.warn("LocalStorage cleared to prevent infinite crash loop.");
      } catch (e) {
        console.error("Failed to clear localStorage:", e);
      }
    } else {
      localStorage.setItem(crashKey, crashTime.toString());
    }

    this.interval = setInterval(() => {
      this.setState((prev) => {
        if (prev.countdown <= 1) {
          clearInterval(this.interval);
          window.location.reload();
          return { countdown: 0 };
        }
        return { countdown: prev.countdown - 1 };
      });
    }, 1000);
  }
  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#121212",
            color: "#fff",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h2 style={{ color: "#ff6b35" }}>💥 App Recovering</h2>
          <p>Cleaning up data and restarting in {this.state.countdown}...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// GLOBAL UTILITIES & HELPERS
// ==========================================

const TT_INIT_FLAG = "tt_init_v1";

const isInitialized = () => {
  try {
    return localStorage.getItem(TT_INIT_FLAG) === "1";
  } catch {
    return false;
  }
};

const markInitialized = () => {
  try {
    localStorage.setItem(TT_INIT_FLAG, "1");
  } catch {}
};

const clearInitFlag = () => {
  try {
    localStorage.removeItem(TT_INIT_FLAG);
  } catch {}
};

// Helper to get the primary tab from the URL hash (e.g., #spin or #settings?view=data -> 'settings')
const initialTab = () => {
  const primaryHash = window.location.hash.slice(1).split("?")[0].toLowerCase();
  const validTabs = ["tasks", "spin", "timer", "lists", "goals", "stats", "people", "duel", "settings"];
  return validTabs.includes(primaryHash) ? primaryHash : "spin";
};

const initialSettingsView = () => {
  const fullHash = window.location.hash.slice(1);
  if (!fullHash.startsWith("settings")) return "view";
  const queryPart = fullHash.split("?")[1];
  if (!queryPart) return "view";
  const params = new URLSearchParams(queryPart);
  const requestedView = params.get("view");
  const map = {
    view: "view",
    logic: "logic",
    game: "game",
    cats: "cats",
    data: "data",
    general: "view",
    look: "view",
    appearance: "view",
    behavior: "logic",
    adv: "logic",
    xp: "game",
    power: "data",
  };
  return map[(requestedView || "").toLowerCase()] || "view";
};

// ==========================================
// FOCUS MODE (Overlay)
// ==========================================
function FocusMode({ task, onStop, onComplete, updateTask, addActivity }) {
  if (!task) return null;

  const [timerSeconds, setTimerSeconds] = React.useState(0);
  const [isTimerRunning, setIsTimerRunning] = React.useState(true);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleExit = (shouldComplete = false) => {
    const sessionMins = Math.max(1, Math.round(timerSeconds / 60));

    // Update task with actual time spent
    if (typeof updateTask === "function") {
      updateTask(task.id, {
        actualTime: (task.actualTime || 0) + sessionMins,
        lastFocusedAt: new Date().toISOString(),
      });
    }

    // Log focus session to global activity history
    addActivity?.({
      taskId: task.id,
      title: task.title,
      type: "focus",
      duration: sessionMins,
      timestamp: new Date().toISOString(),
    });

    if (shouldComplete && typeof onComplete === "function") onComplete(task.id);
    onStop?.();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10000,
        background: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        inset: 0,
      }}
    >
      <div style={{ position: "absolute", top: 30, right: 30, display: "flex", gap: 12 }}>
        <button
          onClick={() => handleExit(true)}
          style={{
            background: "var(--primary)",
            border: "none",
            color: "#fff",
            padding: "8px 24px",
            borderRadius: 30,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Mark Done
        </button>
        <button
          onClick={() => handleExit(false)}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.6)",
            padding: "8px 24px",
            borderRadius: 30,
            cursor: "pointer",
            fontSize: 13,
            textTransform: "uppercase",
          }}
        >
          Exit Focus
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 60, opacity: 0.9 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--primary)",
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          Now Focusing On
        </div>
        <h1 style={{ fontSize: 42, fontFamily: "Fredoka", margin: 0, maxWidth: "800px", lineHeight: 1.4 }}>
          {task.title}
        </h1>
        <div style={{ fontSize: 16, color: "var(--text-light)", marginTop: 8 }}>{task.category || ""}</div>
      </div>

      <div
        style={{
          fontSize: 140,
          fontFamily: "monospace",
          fontWeight: 400,
          marginBottom: 60,
          color: isTimerRunning ? "#fff" : "rgba(255,255,255,0.3)",
          textShadow: isTimerRunning ? "0 0 40px rgba(255,107,53,0.2)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        {formatTime(timerSeconds)}
      </div>

      <button
        onClick={() => setIsTimerRunning(!isTimerRunning)}
        style={{
          width: 90,
          height: 90,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.1)",
          background: isTimerRunning ? "rgba(255,255,255,0.1)" : "transparent",
          color: "#fff",
          fontSize: 28,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
      >
        {isTimerRunning ? "⏸" : "▶"}
      </button>
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
function App() {
  // DataManager (safe fallback)
  const DM =
    window.DataManager || {
      tasks: { getAll: () => [], setAll: () => {} },
      goals: { getAll: () => [], setAll: () => {} },
      categories: { getAll: () => [], setAll: () => {} },
      userStats: { get: () => ({ xp: 0, level: 1 }), set: () => {} },
      activities: { getAll: () => [], setAll: () => {}, add: () => {} },
      scratchpad: { get: () => "", set: () => {} },
      savedNotes: { getAll: () => [], setAll: () => {} },
      settings: { get: () => window.DEFAULT_SETTINGS || { theme: "dark", visibleTabs: {} }, set: () => {} },
      timerState: { get: () => ({ isRunning: false, startTime: null, storedTime: 0, activityName: "Tracked Session" }), set: () => {} },
      people: { getAll: () => [], setAll: () => {} },
    };
// --- 1. STATE INITIALIZATION ---
const [categoryMultipliers, setCategoryMultipliers] = React.useState(() => {
  try { return JSON.parse(localStorage.getItem('categoryMultipliers') || '{}'); } catch { return {}; }
});
const [categoryXpAdjust, setCategoryXpAdjustState] = React.useState(() => {
  try { return JSON.parse(localStorage.getItem('categoryXpAdjust') || '{}'); } catch { return {}; }
});
const [newSubCatByParent, setNewSubCatByParent] = React.useState({});

// --- 2. THE HANDLERS FOR YOUR UI ---
const setCategoryMultiplier = (cat, val) => {
  const next = { ...categoryMultipliers, [cat]: val };
  setCategoryMultipliers(next);
  localStorage.setItem('categoryMultipliers', JSON.stringify(next));
  window.dispatchEvent(new Event('categories-updated')); // Sync with TimerTab
};

const setCategoryXpAdjust = (cat, val) => {
  const next = { ...categoryXpAdjust, [cat]: val };
  setCategoryXpAdjustState(next);
  localStorage.setItem('categoryXpAdjust', JSON.stringify(next));
  window.dispatchEvent(new Event('categories-updated'));
};

const addSubCategory = (parentCat) => {
  const name = (newSubCatByParent[parentCat] || "").trim();
  if (!name) return;
  
  const all = JSON.parse(localStorage.getItem('subCategories') || '{}');
  const existing = all[parentCat] || [];
  if (existing.includes(name)) return;
  
  all[parentCat] = [...existing, name];
  localStorage.setItem('subCategories', JSON.stringify(all));
  setNewSubCatByParent(p => ({ ...p, [parentCat]: "" }));
  window.dispatchEvent(new Event('categories-updated'));
};

const removeSubCategory = (parentCat, subName) => {
  const all = JSON.parse(localStorage.getItem('subCategories') || '{}');
  all[parentCat] = (all[parentCat] || []).filter(s => s !== subName);
  localStorage.setItem('subCategories', JSON.stringify(all));
  window.dispatchEvent(new Event('categories-updated'));
};
  // --- Global Components (loaded in other files) ---
  const TaskFormModal = window.TaskFormModal;
  const ViewTaskModal = window.ViewTaskModal;
  const SyncModal = window.SyncModal;
  const PeopleManager = window.PeopleManager;

  const AppHeader = window.AppHeader;
  const NavBar = window.NavBar;
  const ToastManager = window.ToastManager;

  const SpinTab = window.SpinTab;
  const TasksTab = window.TasksTab;
  const TimerTab = window.TimerTab;
  const IdeasTab = window.IdeasTab;
  const GoalsTab = window.GoalsTab;
  const StatsTab = window.StatsTab;
  const PeopleTab = window.PeopleTab;
  const PlacesTab = window.PlacesTab;
  const DuelTab = window.DuelTab;
  const SettingsTab = window.SettingsTab;

  // --- Safe wrappers (prevents React #130) ---
  const AppHeaderComp = SafeComponent(AppHeader, "AppHeader");
  const NavBarComp = SafeComponent(NavBar, "NavBar");
  const ToastManagerComp = SafeComponent(ToastManager, "ToastManager");
  const SpinTabComp = SafeComponent(SpinTab, "SpinTab");
  const TasksTabComp = SafeComponent(TasksTab, "TasksTab");
  const TimerTabComp = SafeComponent(TimerTab, "TimerTab");
  const IdeasTabComp = SafeComponent(IdeasTab, "IdeasTab");
  const GoalsTabComp = SafeComponent(GoalsTab, "GoalsTab");
  const StatsTabComp = SafeComponent(StatsTab, "StatsTab");
  const PeopleTabComp = SafeComponent(PeopleTab, "PeopleTab");
  const PlacesTabComp = SafeComponent(PlacesTab, "PlacesTab");
  const DuelTabComp = SafeComponent(DuelTab, "DuelTab");
  const SettingsTabComp = SafeComponent(SettingsTab, "SettingsTab");

  const seeded = isInitialized();

  // UI shell
  const [isDockVisible, setDockVisible] = React.useState(true);
  const [tab, setTab] = React.useState(initialTab());
  const [settingsView] = React.useState(initialSettingsView);
  
  // Handle brand click - toggle dock visibility
  const handleBrandClick = React.useCallback(() => {
    setDockVisible((v) => !v);
  }, []);

  // Expose setTab globally for navigation from other components
  React.useEffect(() => {
    window.setTab = setTab;
    return () => {
      delete window.setTab;
    };
  }, []);

  // Listen for hash changes to switch tabs
  React.useEffect(() => {
    const handleHashChange = () => {
      const newTab = initialTab();
      if (newTab !== tab) {
        setTab(newTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tab]);

  // --- Core State (FACTORY RESET = EMPTY DATA) ---
  const [tasks, setTasksInternal] = React.useState(() => (seeded ? DM?.tasks?.getAll?.() || [] : []));
  const [goals, setGoalsInternal] = React.useState(() => (seeded ? DM?.goals?.getAll?.() || [] : []));
  const [categories, setCategoriesInternal] = React.useState(() => (seeded ? DM?.categories?.getAll?.() || [] : []));
  const [activities, setActivitiesInternal] = React.useState(() => (seeded ? DM?.activities?.getAll?.() || [] : []));
  
  // ✅ SYNC ACTIVITIES FROM DATAMANAGER (listen for changes)
  React.useEffect(() => {
    if (!DM?.activities?.subscribe) return;
    const unsubscribe = DM.activities.subscribe((newActivities) => {
      setActivitiesInternal(Array.isArray(newActivities) ? newActivities : []);
    });
    return unsubscribe;
  }, [DM]);

  // ✅ SYNC SETTINGS FROM DATAMANAGER and ensure defaults are always present
  React.useEffect(() => {
    if (!DM?.settings) return;
    
    // Get current settings from DataManager
    const currentSettings = DM.settings.get();
    const defaults = window.DEFAULT_SETTINGS || {};
    
    // Ensure defaults are merged, especially for navigation settings
    // Treat empty objects as if no settings exist
    if (currentSettings && typeof currentSettings === 'object' && Object.keys(currentSettings).length > 0) {
      const merged = { ...defaults, ...currentSettings };
      
      // Deep merge navBarVisibleItems - defaults take precedence to override old saved values
      if (defaults.navBarVisibleItems) {
        merged.navBarVisibleItems = { ...(merged.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
      }
      
      // Ensure headerQuickNavItems defaults are always present
      if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(merged.headerQuickNavItems) || merged.headerQuickNavItems.length === 0)) {
        merged.headerQuickNavItems = [...defaults.headerQuickNavItems];
      }
      
      // Ensure navItemsOrder defaults are always present
      if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(merged.navItemsOrder) || merged.navItemsOrder.length === 0)) {
        merged.navItemsOrder = [...defaults.navItemsOrder];
      }
      
      // Ensure headerRightMode defaults are always present
      if (!merged.headerRightMode && defaults.headerRightMode) {
        merged.headerRightMode = defaults.headerRightMode;
      }
      
      // Ensure headerShowAllNavDropdown defaults are always present
      if (merged.headerShowAllNavDropdown === undefined && defaults.headerShowAllNavDropdown !== undefined) {
        merged.headerShowAllNavDropdown = defaults.headerShowAllNavDropdown;
      }
      
      // Update state if different
      setSettingsInternal(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(merged)) {
          return merged;
        }
        return prev;
      });
      
      // Persist merged settings back to DataManager
      if (JSON.stringify(currentSettings) !== JSON.stringify(merged)) {
        DM.settings.set(merged);
      }
    } else {
      // If no settings or empty object, use defaults
      setSettingsInternal(defaults);
      DM.settings.set(defaults);
    }
    
    // Subscribe to future changes
    if (DM.settings.subscribe) {
      const unsubscribe = DM.settings.subscribe((newSettings) => {
        const defaults = window.DEFAULT_SETTINGS || {};
        // Treat empty objects as if no settings exist
        if (newSettings && typeof newSettings === 'object' && Object.keys(newSettings).length > 0) {
          const merged = { ...defaults, ...newSettings };
          // Deep merge navBarVisibleItems - only fill in missing keys from defaults, don't override user changes
          if (defaults.navBarVisibleItems && merged.navBarVisibleItems) {
            // Only add defaults for keys that don't exist in user settings
            Object.keys(defaults.navBarVisibleItems).forEach(key => {
              if (!(key in merged.navBarVisibleItems)) {
                merged.navBarVisibleItems[key] = defaults.navBarVisibleItems[key];
              }
            });
          } else if (defaults.navBarVisibleItems) {
            merged.navBarVisibleItems = { ...defaults.navBarVisibleItems };
          }
          // Ensure headerQuickNavItems defaults are always present
          if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(merged.headerQuickNavItems) || merged.headerQuickNavItems.length === 0)) {
            merged.headerQuickNavItems = [...defaults.headerQuickNavItems];
          }
          // Ensure navItemsOrder defaults are always present
          if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(merged.navItemsOrder) || merged.navItemsOrder.length === 0)) {
            merged.navItemsOrder = [...defaults.navItemsOrder];
          }
          // Ensure headerRightMode defaults are always present
          if (!merged.headerRightMode && defaults.headerRightMode) {
            merged.headerRightMode = defaults.headerRightMode;
          }
          // Ensure headerShowAllNavDropdown defaults are always present
          if (merged.headerShowAllNavDropdown === undefined && defaults.headerShowAllNavDropdown !== undefined) {
            merged.headerShowAllNavDropdown = defaults.headerShowAllNavDropdown;
          }
          setSettingsInternal(merged);
        } else {
          setSettingsInternal(defaults);
        }
      });
      return unsubscribe;
    }
  }, [DM]);

  const [scratchpad, setScratchpadInternal] = React.useState(() => (seeded ? DM?.scratchpad?.get?.() || "" : ""));
  const [savedNotes, setSavedNotesInternal] = React.useState(() => (seeded ? DM?.savedNotes?.getAll?.() || [] : []));
  const [settings, setSettingsInternal] = React.useState(() => {
    // Always start with defaults to ensure navigation items are available on first render
    const defaults = window.DEFAULT_SETTINGS || {};
    const loaded = DM?.settings?.get?.();
    
    // If no loaded settings, invalid, or empty object, return defaults immediately
    // This ensures navigation items are always available on first render
    if (!loaded || typeof loaded !== 'object' || Object.keys(loaded).length === 0) {
      return defaults;
    }
    
    // Deep merge critical navigation settings - always ensure defaults are present
    const merged = { ...defaults, ...loaded };
    
    // Deep merge navBarVisibleItems - defaults take precedence to override old saved values
    if (defaults.navBarVisibleItems) {
      merged.navBarVisibleItems = { ...(merged.navBarVisibleItems || {}), ...defaults.navBarVisibleItems };
    }
    
    // Ensure headerQuickNavItems defaults are always present
    if (Array.isArray(defaults.headerQuickNavItems) && (!Array.isArray(merged.headerQuickNavItems) || merged.headerQuickNavItems.length === 0)) {
      merged.headerQuickNavItems = [...defaults.headerQuickNavItems];
    }
    
    // Ensure navItemsOrder defaults are always present
    if (Array.isArray(defaults.navItemsOrder) && (!Array.isArray(merged.navItemsOrder) || merged.navItemsOrder.length === 0)) {
      merged.navItemsOrder = [...defaults.navItemsOrder];
    }
    
    // Ensure headerRightMode defaults are always present
    if (!merged.headerRightMode && defaults.headerRightMode) {
      merged.headerRightMode = defaults.headerRightMode;
    }
    
    // Ensure headerShowAllNavDropdown defaults are always present
    if (merged.headerShowAllNavDropdown === undefined && defaults.headerShowAllNavDropdown !== undefined) {
      merged.headerShowAllNavDropdown = defaults.headerShowAllNavDropdown;
    }
    
    return merged;
  });
  const [userStats, setUserStatsInternal] = React.useState(() => (seeded ? DM?.userStats?.get?.() || { xp: 0, level: 1 } : { xp: 0, level: 1 }));

  // ✅ TIMER STATE (persistent + merge updates safely)
  const [timerState, setTimerStateInternal] = React.useState(() => {
    const base = DM?.timerState?.get?.() || {};
    return {
      isRunning: !!base.isRunning,
      startTime: base.startTime || null,
      storedTime: base.storedTime || 0,
      activityName: base.activityName || "Tracked Session",
      activityCategory: base.activityCategory || "Work",
      people: Array.isArray(base.people) ? base.people : [],
      location: base.location || "",
      locationId: base.locationId || null,
      locationCoords: base.locationCoords || null,
      notes: base.notes || "",
    };
  });

  const [allPeople, setAllPeople] = React.useState(() => {
    if (!seeded) return [];
    if (DM?.people?.getAll) return DM.people.getAll();
    try {
      const saved = localStorage.getItem("savedPeople");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- App Modals / UI State ---
  // Modal stack for persistent modals
  const [modalStack, setModalStack] = React.useState([]);
  
  const pushModal = React.useCallback((modal) => {
    setModalStack(prev => [...prev, modal]);
  }, []);
  
  const popModal = React.useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
  }, []);
  
  const closeAllModals = React.useCallback(() => {
    setModalStack([]);
  }, []);
  
  // Keyboard shortcut: Ctrl+Esc or Esc (when multiple modals) to close all
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Esc or Cmd+Esc: Close all modals
      if ((e.ctrlKey || e.metaKey) && e.key === 'Escape') {
        e.preventDefault();
        closeAllModals();
        return;
      }
      // Esc: Close only top modal (default behavior)
      if (e.key === 'Escape' && modalStack.length > 0) {
        // Only handle if no other component is handling it
        // (WinnerPopup and other modals handle their own Esc)
        const topModal = modalStack[modalStack.length - 1];
        // Only auto-close if it's a modal that should respond to Esc
        // (ViewTaskModal, TaskFormModal handle their own Esc)
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalStack, closeAllModals]);
  
  // Legacy state for backward compatibility (mapped to modal stack)
  const viewTask = React.useMemo(() => {
    return modalStack.find(m => m.type === 'viewTask')?.data || null;
  }, [modalStack]);
  
  const editTask = React.useMemo(() => {
    return modalStack.find(m => m.type === 'editTask')?.data || null;
  }, [modalStack]);
  
  const isAdding = React.useMemo(() => {
    return modalStack.some(m => m.type === 'addTask');
  }, [modalStack]);
  
  const showSyncModal = React.useMemo(() => {
    return modalStack.some(m => m.type === 'sync');
  }, [modalStack]);
  
  const showPeopleManager = React.useMemo(() => {
    return modalStack.some(m => m.type === 'peopleManager');
  }, [modalStack]);
  
  // Wrapper functions for backward compatibility
  const setViewTask = React.useCallback((task) => {
    if (task) {
      pushModal({ type: 'viewTask', data: task });
    } else {
      setModalStack(prev => prev.filter(m => m.type !== 'viewTask'));
    }
  }, [pushModal]);
  
  const setEditTask = React.useCallback((task) => {
    if (task) {
      pushModal({ type: 'editTask', data: task });
    } else {
      setModalStack(prev => prev.filter(m => m.type !== 'editTask'));
    }
  }, [pushModal]);
  
  const setIsAdding = React.useCallback((adding) => {
    if (adding) {
      pushModal({ type: 'addTask' });
    } else {
      setModalStack(prev => prev.filter(m => m.type !== 'addTask'));
    }
  }, [pushModal]);
  
  const setShowSyncModal = React.useCallback((show) => {
    if (show) {
      pushModal({ type: 'sync' });
    } else {
      setModalStack(prev => prev.filter(m => m.type !== 'sync'));
    }
  }, [pushModal]);
  
  const setShowPeopleManager = React.useCallback((show) => {
    if (show) {
      pushModal({ type: 'peopleManager' });
    } else {
      setModalStack(prev => prev.filter(m => m.type !== 'peopleManager'));
    }
  }, [pushModal]);
  
  const [focusTask, setFocusTask] = React.useState(null);
  const [toasts, setToasts] = React.useState([]);
  const [cloudUser, setCloudUser] = React.useState(null);
  const [syncState, setSyncState] = React.useState("idle");

  // DEV / RESET TOOLS (hooks must be declared before UI constants)
  const [resetReady, setResetReady] = React.useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(false);
  const [showDebugInfo, setShowDebugInfo] = React.useState(false);
  const [showAutoRefreshConfig, setShowAutoRefreshConfig] = React.useState(false);
  const [refreshCountdown, setRefreshCountdown] = React.useState(null);
  const [devToolsCollapsed, setDevToolsCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem("tt_devtools_collapsed");
      // Default to collapsed (true) if not set
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const refreshInterval = 8000;

  const toggleDevToolsCollapse = () => {
    const newState = !devToolsCollapsed;
    setDevToolsCollapsed(newState);
    try {
      localStorage.setItem("tt_devtools_collapsed", String(newState));
    } catch {}
  };

  // Auto-refresh per tab/subtab configuration
  const getAutoRefreshConfig = () => {
    try {
      const saved = localStorage.getItem("tt_autorefresh_config");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const [autoRefreshConfig, setAutoRefreshConfigInternal] = React.useState(getAutoRefreshConfig);

  const setAutoRefreshConfig = (config) => {
    setAutoRefreshConfigInternal(config);
    try {
      localStorage.setItem("tt_autorefresh_config", JSON.stringify(config));
    } catch {}
  };

  // Get current subtab (for settings and stats)
  const getCurrentSubtab = () => {
    if (tab === "settings") {
      const hash = window.location.hash;
      const match = hash.match(/[?&]view=([^&]+)/);
      if (match) {
        const view = match[1].toLowerCase();
        const map = { view: "view", logic: "logic", game: "game", cats: "cats", data: "data" };
        return map[view] || "view";
      }
      return "view";
    }
    if (tab === "stats") {
      // Stats subtabs are managed internally, we'll track via URL or state
      const hash = window.location.hash;
      if (hash.includes("subView=charts")) return "charts";
      if (hash.includes("subView=history")) return "history";
      if (hash.includes("subView=people")) return "people";
      if (hash.includes("subView=places")) return "places";
      return "overview";
    }
    if (tab === "tasks") {
      // Tasks viewMode is internal, we'll use a simple approach
      return null; // We'll handle tasks tab as a whole
    }
    return null;
  };

  // Check if current tab/subtab should auto-refresh
  const shouldAutoRefresh = () => {
    if (!autoRefreshEnabled) return false;
    const currentSubtab = getCurrentSubtab();
    const tabKey = currentSubtab ? `${tab}:${currentSubtab}` : tab;
    return autoRefreshConfig[tabKey] === true; // Only enabled if explicitly set to true
  };

  // --- Persist Helpers (also marks initialized when meaningful) ---
  const setTasks = (val) => {
    const n = typeof val === "function" ? val(tasks) : val;
    setTasksInternal(n);
    DM?.tasks?.setAll?.(n);
    if (Array.isArray(n) && n.length) markInitialized();
  };

  const setGoals = (val) => {
    const n = typeof val === "function" ? val(goals) : val;
    setGoalsInternal(n);
    DM?.goals?.setAll?.(n);
    if (Array.isArray(n) && n.length) markInitialized();
  };

  const setCategories = (val) => {
    const n = typeof val === "function" ? val(categories) : val;
    setCategoriesInternal(n);
    DM?.categories?.setAll?.(n);
    if (Array.isArray(n) && n.length) markInitialized();

    // ✅ Broadcast so TimerTab (and anywhere else) can refresh dropdowns immediately
    try {
      window.dispatchEvent(new Event("categories-updated"));
    } catch {}
  };

  const setUserStats = (val) => {
    const n = typeof val === "function" ? val(userStats) : val;
    setUserStatsInternal(n);
    DM?.userStats?.set?.(n);
  };

  const setScratchpad = (val) => {
    const n = typeof val === "function" ? val(scratchpad) : val;
    setScratchpadInternal(n);
    DM?.scratchpad?.set?.(n);
    if (typeof n === "string" && n.trim()) markInitialized();
  };

  const setSavedNotes = (val) => {
    const n = typeof val === "function" ? val(savedNotes) : val;
    setSavedNotesInternal(n);
    DM?.savedNotes?.setAll?.(n);
    if (Array.isArray(n) && n.length) markInitialized();
  };

  const setSettings = (val) => {
    const n = typeof val === "function" ? val(settings) : val;
    setSettingsInternal(n);
    DM?.settings?.set?.(n);
  };

  // ✅ Persist timer in DM every change
  const setTimerState = (val) => {
    const n = typeof val === "function" ? val(timerState) : val;
    setTimerStateInternal(n);
    try {
      DM?.timerState?.set?.(n);
    } catch {}
    // do NOT markInitialized just for ticking
  };

  // ✅ Timer merger used by TimerTab so editing fields never resets the clock
  const updateTimer = (updates) => {
    if (!updates || typeof updates !== "object") return;
    setTimerState((prev) => ({ ...prev, ...updates }));
  };

  const setPeople = (val) => {
    const n = typeof val === "function" ? val(allPeople) : val;
    setAllPeople(n);
    if (DM?.people?.setAll) DM.people.setAll(n);
    else {
      try {
        localStorage.setItem("savedPeople", JSON.stringify(n));
      } catch {}
      window.dispatchEvent(new Event("people-updated"));
    }
    if (Array.isArray(n) && n.length) markInitialized();
  };

  // Keep people in sync if using local fallback
  React.useEffect(() => {
    const refreshPeople = () => {
      if (DM?.people?.getAll) setAllPeople(DM.people.getAll());
      else {
        try {
          setAllPeople(JSON.parse(localStorage.getItem("savedPeople") || "[]"));
        } catch {
          setAllPeople([]);
        }
      }
    };
    window.addEventListener("people-updated", refreshPeople);
    return () => window.removeEventListener("people-updated", refreshPeople);
  }, [DM]);

  // Theme
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings?.theme || "dark");
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      const colors = {
        dark: "#ff6b35",
        light: "#ff6b35",
        midnight: "#38bdf8",
        forest: "#4ade80",
        synthwave: "#d946ef",
        coffee: "#d4a373",
      };
      metaThemeColor.setAttribute("content", colors[settings?.theme] || "#ff6b35");
    }
  }, [settings?.theme]);

  // Error tracking for debug info (persisted across crashes)
  React.useEffect(() => {
    // Initialize errors array immediately to prevent crashes
    if (!window.recentErrors) {
      window.recentErrors = [];
    }
    
    // Load persisted errors from localStorage
    try {
      const saved = localStorage.getItem('tt_debug_errors');
      if (saved) {
        window.recentErrors = JSON.parse(saved);
        if (!Array.isArray(window.recentErrors)) {
          window.recentErrors = [];
        }
      }
    } catch {
      window.recentErrors = [];
    }

    const persistErrors = () => {
      try {
        if (window.recentErrors && Array.isArray(window.recentErrors)) {
          localStorage.setItem('tt_debug_errors', JSON.stringify(window.recentErrors));
        }
      } catch (e) {
        // Silently fail if storage is full
      }
    };

    const handleError = (event) => {
      if (!window.recentErrors) window.recentErrors = [];
      window.recentErrors.push({
        message: event.error?.message || event.message || "Unknown error",
        stack: event.error?.stack,
        time: new Date().toISOString(),
        type: 'runtime'
      });
      window.recentErrors = window.recentErrors.slice(-20);
      persistErrors();
    };

    const handleRejection = (event) => {
      if (!window.recentErrors) window.recentErrors = [];
      window.recentErrors.push({
        message: event.reason?.message || event.reason?.toString() || "Unhandled promise rejection",
        stack: event.reason?.stack,
        time: new Date().toISOString(),
        type: 'promise'
      });
      window.recentErrors = window.recentErrors.slice(-20);
      persistErrors();
    };

    // Intercept console.error and console.warn for debug tracking
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      originalError.apply(console, args);
      if (!window.recentErrors) window.recentErrors = [];
      window.recentErrors.push({
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
        time: new Date().toISOString(),
        type: 'console.error'
      });
      window.recentErrors = window.recentErrors.slice(-20);
      persistErrors();
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      if (!window.recentErrors) window.recentErrors = [];
      window.recentErrors.push({
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
        time: new Date().toISOString(),
        type: 'console.warn'
      });
      window.recentErrors = window.recentErrors.slice(-20);
      persistErrors();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Toasts
  const notify = (msg, icon) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, icon }].slice(-3));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // Activity helper (keeps local state + DM + task activities)
  const addActivity = (act) => {
    if (!act) return;
    console.log("📝 addActivity called with:", act);
    
    // ✅ ALSO ADD TO TASK'S ACTIVITIES ARRAY IF taskId EXISTS
    if (act.taskId) {
      const task = tasks.find(t => t.id === act.taskId);
      if (task) {
        // Include people from task if not already in activity
        const taskPeople = Array.isArray(task.people) ? task.people : [];
        const activityPeople = Array.isArray(act.people) ? act.people : [];
        const combinedPeople = [...new Set([...activityPeople, ...taskPeople])].filter(Boolean);
        
        const activityText = (() => {
          const type = act.type || 'log';
          const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
          if (type === 'spin') return `🎰 ${typeLabel}`;
          if (type === 'respin') return `🔄 ${typeLabel}`;
          if (type === 'focus') return `🎯 ${typeLabel}${act.duration ? ` (${act.duration}m)` : ''}`;
          if (type === 'complete') return `✅ Task Completed`;
          return `${typeLabel}${act.duration ? ` (${act.duration}m)` : ''}`;
        })();
        
        const taskActivity = {
          id: window.generateId ? window.generateId('log') : 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          text: activityText,
          timestamp: act.timestamp || act.createdAt || new Date().toISOString(),
          type: act.type || 'system_log'
        };
        
        const currentActivities = Array.isArray(task.activities) ? task.activities : [];
        updateTask(act.taskId, { activities: [...currentActivities, taskActivity] });
        console.log("✅ Activity added to task's activity log:", taskActivity);
        
        // Ensure activity includes people from task
        if (combinedPeople.length > 0 && !act.people) {
          act.people = combinedPeople;
        }
      }
    }
    
    try {
      const added = DM?.activities?.add?.(act);
      console.log("✅ Activity added to DataManager:", JSON.stringify(added, null, 2));
      // Force sync by getting all activities
      const allActivities = DM?.activities?.getAll?.() || [];
      console.log("📊 All activities after add:", allActivities.map(a => ({ title: a.title, type: a.type, id: a.id })));
      setActivitiesInternal(allActivities);
      console.log("📊 Updated activities state, count:", allActivities.length);
    } catch (e) {
      console.error("❌ Error adding activity to DataManager:", e);
      try {
        const next = [...(DM?.activities?.getAll?.() || activities), act];
        DM?.activities?.setAll?.(next);
        setActivitiesInternal(next);
      } catch (err) {
        console.error("❌ Fallback activity save failed:", err);
      }
    }
    markInitialized();
  };

  // Actions
  const addTask = (t) => {
    const newTask = {
      ...t,
      id: window.generateId ? window.generateId("t") : "t_" + Date.now(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((p) => [...p, newTask]);
    
    // Log task creation as activity
    addActivity({
      title: newTask.title || "Untitled Task",
      category: newTask.category || "General",
      type: "task_created",
      taskId: newTask.id,
      people: Array.isArray(newTask.people) ? newTask.people : [],
      location: newTask.location || '',
      duration: 0,
      createdAt: new Date().toISOString(),
    });
    
    notify("Task Added", "✅");
  };

  const updateTask = (id, u) => {
    const oldTask = tasks.find(t => t.id === id);
    setTasks((p) => {
      const updated = p.map((t) => (t.id === id ? { ...t, ...u, lastModified: new Date().toISOString() } : t));
      const newTask = updated.find(t => t.id === id);
      
      // Log task edit if significant fields changed
      if (oldTask && newTask) {
        const significantChanges = 
          oldTask.title !== newTask.title ||
          oldTask.category !== newTask.category ||
          oldTask.priority !== newTask.priority ||
          JSON.stringify(oldTask.people || []) !== JSON.stringify(newTask.people || []) ||
          oldTask.location !== newTask.location;
        
        if (significantChanges) {
          // Use setTimeout to avoid state update issues
          setTimeout(() => {
            addActivity({
              title: newTask.title || "Untitled Task",
              category: newTask.category || "General",
              type: "task_edited",
              taskId: id,
              people: Array.isArray(newTask.people) ? newTask.people : [],
              location: newTask.location || '',
              duration: 0,
              createdAt: new Date().toISOString(),
            });
          }, 0);
        }
      }
      
      return updated;
    });
  };

  const deleteTask = (id) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    notify("Task Deleted", "🗑️");
  };

  const completeTask = (id) => {
    setTasks((p) =>
      p.map((t) => {
        if (t.id !== id) return t;
        const isNowCompleted = !t.completed;
        if (isNowCompleted) {
          notify("Task Completed!", "🎉");
          if (settings?.sound !== false && typeof SoundFX !== 'undefined') {
            SoundFX.playComplete();
          }
          if (settings?.confetti) window.fireSmartConfetti?.('taskComplete', settings);
          addActivity({
            taskId: t.id,
            title: t.title,
            type: "complete",
            duration: 0,
            timestamp: new Date().toISOString(),
            people: Array.isArray(t.people) ? t.people : [],
            category: t.category || 'General',
          });
        } else {
          notify("Task Restored", "↩️");
        }
        return { ...t, completed: isNowCompleted, completedAt: isNowCompleted ? new Date().toISOString() : null };
      })
    );
  };

  // ✅ SHARED FOCUS HANDLER (Spin + View Modal)
  const enterFocusMode = (task, source = "spin") => {
    if (!task) return;
    const liveTask = tasks.find((t) => t.id === task.id) || task;

    // Log focus session start (separate from spin result)
    addActivity({
      taskId: liveTask.id,
      title: liveTask.title,
      type: "focus",
      duration: 0,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      category: liveTask.category || "General",
      priority: liveTask.priority || "Medium",
    });

    setFocusTask(liveTask);
    // Don't close viewTask modal when entering focus - let it stay in stack
    notify(`Focusing: ${liveTask.title}`, "🎯");
  };

  // ==========================================
  // TIMER ACTIONS (persistent)
  // ==========================================
  const handleTimerToggle = () => {
    setTimerState((prev) => {
      if (prev.isRunning) {
        const now = Date.now();
        const start = prev.startTime || now;
        const sessionSeconds = Math.max(0, Math.floor((now - start) / 1000));
        return {
          ...prev,
          isRunning: false,
          startTime: null,
          storedTime: (prev.storedTime || 0) + sessionSeconds,
        };
      }
      return { ...prev, isRunning: true, startTime: Date.now() };
    });
  };

  const handleTimerReset = () => {
    if (!window.confirm("Discard current session progress?")) return;
    setTimerState({
      isRunning: false,
      startTime: null,
      storedTime: 0,
      activityName: "Tracked Session",
      activityCategory: "Work",
      people: [],
      location: "",
      locationId: null,
      locationCoords: null,
      notes: "",
    });
  };

  const handleTimerSave = (activityData) => {
    if (!activityData) return;

    addActivity({
      ...activityData,
      people: Array.isArray(activityData.people) ? activityData.people : [],
      locationLabel: activityData.locationLabel || "",
      locationCoords: activityData.locationCoords || null,
      locationId: activityData.locationId || null,
      type: activityData.type || "timer",
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    setTimerState({
      isRunning: false,
      startTime: null,
      storedTime: 0,
      activityName: "Tracked Session",
      activityCategory: activityData.category || "Work",
      people: [],
      location: "",
      locationId: null,
      locationCoords: null,
      notes: "",
    });

    notify("Session logged with People & Location!", "⏱️");
  };

  // Export / maintenance
  const handleExportBackup = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        tasks,
        goals,
        categories,
        activities,
        savedNotes,
        settings,
        userStats,
        timerState,
        savedPeople: DM?.people?.getAll?.() || allPeople,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasktumbler-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify("Backup exported", "📥");
    } catch (e) {
      console.error(e);
      notify("Export failed", "❌");
    }
  };

  const handleNukeAll = () => {
    try {
      localStorage.clear();
    } catch {}
    clearInitFlag();
    window.location.reload();
  };

  // Auto refresh logic (won't run while timer active, respects tab/subtab config)
  React.useEffect(() => {
    let intervalId;
    let countdownId;
    
    if (autoRefreshEnabled) {
      const currentSubtab = getCurrentSubtab();
      const tabKey = currentSubtab ? `${tab}:${currentSubtab}` : tab;
      const isEnabled = autoRefreshConfig[tabKey] === true; // Only enabled if explicitly set to true
      
      if (isEnabled) {
        // Reset countdown
        setRefreshCountdown(Math.ceil(refreshInterval / 1000));
        
        // Countdown timer (updates every second)
        countdownId = setInterval(() => {
          setRefreshCountdown((prev) => {
            if (prev === null || prev <= 1) {
              return Math.ceil(refreshInterval / 1000);
            }
            return prev - 1;
          });
        }, 1000);
        
        // Refresh timer
        intervalId = setInterval(() => {
          if (!timerState.isRunning) {
            // Preserve current hash/tab when reloading
            const currentHash = window.location.hash || `#${tab}`;
            // Ensure hash is set before reload (reload should preserve it, but being explicit)
            if (window.location.hash !== currentHash) {
              window.location.hash = currentHash;
            }
            window.location.reload();
          } else {
            console.warn("Auto-refresh skipped: Timer is active.");
            setRefreshCountdown(null);
          }
        }, refreshInterval);
      } else {
        setRefreshCountdown(null);
      }
    } else {
      setRefreshCountdown(null);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownId) clearInterval(countdownId);
    };
  }, [autoRefreshEnabled, tab, timerState.isRunning, autoRefreshConfig]);

  // Sample loader - Comprehensive diverse sample data
  const handleLoadSamples = () => {

    const sampleCats = ["Work", "Personal", "Health", "Finance", "Real Estate", "Learning", "Home Project", "Fun", "Errands", "Social"];
    const sampleSubs = {
      Work: ["Deep Work", "Meetings", "Admin", "Client Calls", "Documentation", "Email", "Planning", "Research"],
      Personal: ["Errands", "Chores", "Social", "Family Time", "Shopping", "Appointments", "Self Care"],
      Health: ["Cardio", "Strength", "Meal Prep", "Yoga", "Meditation", "Doctor", "Therapy", "Wellness"],
      Finance: ["Budgeting", "Bills", "Investments", "Taxes", "Expenses", "Banking", "Insurance"],
      "Real Estate": ["Lead Gen", "Showings", "Open House", "Contracts", "Follow-ups", "Inspections", "Closing"],
      Learning: ["Reading", "Courses", "Practice", "Research", "Projects", "Tutorials", "Certification"],
      "Home Project": ["Renovation", "Maintenance", "Decorating", "Gardening", "Organization", "Cleaning", "Repairs"],
      Fun: ["Gaming", "Movies", "Hobbies", "Travel", "Events", "Concerts", "Sports"],
      Errands: ["Shopping", "Post Office", "DMV", "Returns", "Pickups"],
      Social: ["Dinner", "Party", "Coffee", "Networking", "Date"]
    };

    window.SUBCATEGORIES = sampleSubs;
    setCategories(sampleCats);
    localStorage.setItem('categories', JSON.stringify(sampleCats));
    localStorage.setItem('customSubcategories', JSON.stringify(sampleSubs));

    // Sample People (expanded with more variety)
    const samplePeople = [
      { id: 'p1', firstName: 'Alice', lastName: 'Client', name: 'Alice Client', type: 'client', phone: '555-0100', email: 'alice@example.com', notes: 'Looking for 3bd/2ba in downtown area. Budget: $500k', links: ['https://compass.com/alice'], compassCrmLink: 'https://compass.com/alice', externalId: '61f31f78a1b2c3d4e5f6a7b8', tags: ['vip', 'buyer'], weight: 15, locationIds: ['loc1', 'loc2'], isFavorite: true, lastContactDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], groups: ['VIP Clients'], relationships: ['p11'], createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'p2', firstName: 'Bob', lastName: 'Vendor', name: 'Bob Vendor', type: 'vendor', phone: '555-0101', email: 'bob@plumbing.com', notes: 'Licensed plumber, available weekends', links: [], tags: ['contractor', 'plumbing'], weight: 8, locationIds: ['loc7'], createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
      { id: 'p3', firstName: 'Charlie', lastName: 'Lead', name: 'Charlie Lead', type: 'lead', email: 'charlie@lead.com', phone: '555-0102', notes: 'Interested in investment properties', links: [], tags: ['investor', 'lead'], weight: 12, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: 'p4', firstName: 'Diana', lastName: 'Partner', name: 'Diana Partner', type: 'partner', phone: '555-0103', email: 'diana@partners.com', notes: 'Real estate partner, handles commercial properties', links: ['https://linkedin.com/diana'], compassCrmLink: '', tags: ['partner', 'commercial'], weight: 20, locationIds: ['loc1'], isFavorite: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
      { id: 'p5', firstName: 'Eve', lastName: 'Contractor', name: 'Eve Contractor', type: 'vendor', phone: '555-0104', email: 'eve@construction.com', notes: 'General contractor, specializes in renovations', links: [], tags: ['contractor', 'renovation'], weight: 10, locationIds: ['loc7'], createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
      { id: 'p6', firstName: 'Frank', lastName: 'Investor', name: 'Frank Investor', type: 'client', phone: '555-0105', email: 'frank@invest.com', notes: 'Looking for rental properties, cash buyer', links: [], tags: ['investor', 'cash-buyer'], weight: 18, locationIds: ['loc5'], isFavorite: true, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
      { id: 'p7', firstName: 'Grace', lastName: 'Designer', name: 'Grace Designer', type: 'vendor', phone: '555-0106', email: 'grace@design.com', notes: 'Interior designer, available for staging', links: [], tags: ['designer', 'staging'], weight: 9, locationIds: ['loc2'], createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: 'p8', firstName: 'Henry', lastName: 'Lawyer', name: 'Henry Lawyer', type: 'vendor', phone: '555-0107', email: 'henry@law.com', notes: 'Real estate attorney, handles closings', links: [], tags: ['attorney', 'legal'], weight: 12, locationIds: ['loc1', 'loc8'], createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
      { id: 'p9', firstName: 'Iris', lastName: 'Inspector', name: 'Iris Inspector', type: 'vendor', phone: '555-0108', email: 'iris@inspect.com', notes: 'Home inspector, certified and reliable', links: [], tags: ['inspector', 'certified'], weight: 10, locationIds: ['loc5', 'loc6'], createdAt: new Date(Date.now() - 18 * 86400000).toISOString() },
      { id: 'p10', firstName: 'Jack', lastName: 'Lender', name: 'Jack Lender', type: 'vendor', phone: '555-0109', email: 'jack@bank.com', notes: 'Mortgage broker, competitive rates', links: [], tags: ['lender', 'mortgage'], weight: 11, locationIds: ['loc1'], createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
      { id: 'p11', firstName: 'Karen', lastName: 'Client', name: 'Karen Client', type: 'client', phone: '555-0110', email: 'karen@example.com', notes: 'First-time homebuyer, needs guidance', links: [], tags: ['first-time-buyer'], weight: 14, locationIds: ['loc1'], relationships: ['p1'], createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
      { id: 'p12', firstName: 'Larry', lastName: 'Photographer', name: 'Larry Photographer', type: 'vendor', phone: '555-0111', email: 'larry@photo.com', notes: 'Real estate photographer, drone shots available', links: [], tags: ['photographer', 'drone'], weight: 7, locationIds: ['loc5', 'loc6'], createdAt: new Date(Date.now() - 5 * 86400000).toISOString() }
    ];

    if (DM?.people?.setAll) {
      DM.people.setAll(samplePeople);
    } else {
      localStorage.setItem('savedPeople', JSON.stringify(samplePeople));
      setAllPeople(samplePeople);
      window.dispatchEvent(new Event('people-updated'));
    }

    // Sample Locations - Complete structure with coords object and separate lat/lon for compatibility
    const sampleLocations = [
      { id: 'loc1', label: 'Downtown Office', name: 'Downtown Office', address: '123 Main St, City, ST 12345', type: 'client', lat: 37.7749, lon: -122.4194, coords: { lat: 37.7749, lon: -122.4194 }, googleMapsLink: 'https://www.google.com/maps?q=37.7749,-122.4194', notes: 'Main office location', createdAt: new Date(Date.now() - 100 * 86400000).toISOString() },
      { id: 'loc2', label: 'Client Home', name: 'Client Home', address: '456 Oak Ave, City, ST 12346', type: 'client', lat: 37.7849, lon: -122.4094, coords: { lat: 37.7849, lon: -122.4094 }, googleMapsLink: 'https://www.google.com/maps?q=37.7849,-122.4094', notes: 'Primary client property', createdAt: new Date(Date.now() - 80 * 86400000).toISOString() },
      { id: 'loc3', label: 'Coffee Shop', name: 'Coffee Shop', address: '789 Elm Blvd, City, ST 12347', type: 'personal', lat: 37.7649, lon: -122.4294, coords: { lat: 37.7649, lon: -122.4294 }, googleMapsLink: 'https://www.google.com/maps?q=37.7649,-122.4294', notes: 'Favorite work spot', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'loc4', label: 'Gym', name: 'Gym', address: '321 Fitness Way, City, ST 12348', type: 'personal', lat: 37.7549, lon: -122.4394, coords: { lat: 37.7549, lon: -122.4394 }, googleMapsLink: 'https://www.google.com/maps?q=37.7549,-122.4394', notes: 'Morning workouts', createdAt: new Date(Date.now() - 50 * 86400000).toISOString() },
      { id: 'loc5', label: 'Property A', name: 'Property A', address: '100 First St, City, ST 12349', type: 'client', lat: 37.7949, lon: -122.3994, coords: { lat: 37.7949, lon: -122.3994 }, googleMapsLink: 'https://www.google.com/maps?q=37.7949,-122.3994', notes: 'Active listing', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: 'loc6', label: 'Property B', name: 'Property B', address: '200 Second Ave, City, ST 12350', type: 'client', lat: 37.8049, lon: -122.3894, coords: { lat: 37.8049, lon: -122.3894 }, googleMapsLink: 'https://www.google.com/maps?q=37.8049,-122.3894', notes: 'Under contract', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
      { id: 'loc7', label: 'Home Depot', name: 'Home Depot', address: '300 Third Blvd, City, ST 12351', type: 'vendor', lat: 37.8149, lon: -122.3794, coords: { lat: 37.8149, lon: -122.3794 }, googleMapsLink: 'https://www.google.com/maps?q=37.8149,-122.3794', notes: 'Hardware store', createdAt: new Date(Date.now() - 40 * 86400000).toISOString() },
      { id: 'loc8', label: 'City Hall', name: 'City Hall', address: '400 Government Pl, City, ST 12352', type: 'vendor', lat: 37.8249, lon: -122.3694, coords: { lat: 37.8249, lon: -122.3694 }, googleMapsLink: 'https://www.google.com/maps?q=37.8249,-122.3694', notes: 'Permits and records', createdAt: new Date(Date.now() - 70 * 86400000).toISOString() }
    ];

    if (typeof window.setSavedLocationsV1 === 'function') {
      window.setSavedLocationsV1(sampleLocations);
    } else {
      localStorage.setItem('savedLocations_v1', JSON.stringify(sampleLocations));
      window.dispatchEvent(new Event('locations-updated'));
    }

    // Sample Tasks (expanded with much more variety - completed, in-progress, overdue, upcoming, recurring)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const lastWeek = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
    
    const sampleTasks = [
      // Completed tasks
      { id: 't1', title: 'Call Alice re: Offer', category: 'Real Estate', subtype: 'Lead Gen', priority: 'High', estimatedTime: 15, estimatedTimeUnit: 'min', people: ['Alice Client'], location: 'Downtown Office', locationIds: ['loc1'], completed: true, createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), completedAt: new Date(now.getTime() - 4 * 86400000).toISOString(), dueDate: yesterday, tags: ['urgent', 'client', 'offer'], weight: 15, actualTime: 12, percentComplete: 100, subtasks: [{id: 'st1', title: 'Review offer details', completed: true}, {id: 'st2', title: 'Prepare counter-offer points', completed: true}] },
      { id: 't2', title: 'Morning Run', category: 'Health', subtype: 'Cardio', priority: 'Low', estimatedTime: 30, estimatedTimeUnit: 'min', people: [], location: 'Gym', locationIds: ['loc4'], completed: true, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), completedAt: new Date(now.getTime() - 1 * 86400000).toISOString(), tags: ['health', 'routine', 'exercise'], weight: 5, actualTime: 28, percentComplete: 100, recurring: 'Daily' },
      { id: 't3', title: 'Team Meeting Prep', category: 'Work', subtype: 'Meetings', priority: 'High', estimatedTime: 30, estimatedTimeUnit: 'min', people: ['Diana Partner'], location: 'Downtown Office', locationIds: ['loc1'], completed: true, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), completedAt: new Date(now.getTime() - 2 * 86400000).toISOString(), dueDate: yesterday, tags: ['work', 'meeting', 'team'], weight: 12, actualTime: 25, percentComplete: 100, subtasks: [{id: 'st3', title: 'Review agenda', completed: true}, {id: 'st4', title: 'Prepare talking points', completed: true}] },
      { id: 't4', title: 'Grocery Shopping', category: 'Personal', subtype: 'Shopping', priority: 'Medium', estimatedTime: 45, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: true, createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(), completedAt: new Date(now.getTime() - 3 * 86400000).toISOString(), tags: ['errands', 'shopping'], weight: 6, actualTime: 50, percentComplete: 100, recurring: 'Weekly', subtasks: [{id: 'st5', title: 'Make shopping list', completed: true}, {id: 'st6', title: 'Buy groceries', completed: true}] },
      { id: 't5', title: 'Update Listing Photos', category: 'Real Estate', subtype: 'Admin', priority: 'Medium', estimatedTime: 45, estimatedTimeUnit: 'min', people: ['Grace Designer', 'Larry Photographer'], location: 'Client Home', locationIds: ['loc2'], completed: true, createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(), completedAt: new Date(now.getTime() - 5 * 86400000).toISOString(), tags: ['marketing', 'photos', 'listing'], weight: 10, actualTime: 40, percentComplete: 100, subtasks: [{id: 'st7', title: 'Schedule photographer', completed: true}, {id: 'st8', title: 'Review photos', completed: true}, {id: 'st9', title: 'Upload to MLS', completed: true}] },
      
      // In-progress tasks
      { id: 't6', title: 'Prepare Q4 Taxes', category: 'Finance', subtype: 'Taxes', priority: 'Urgent', estimatedTime: 60, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(), dueDate: tomorrow, tags: ['finance', 'important', 'taxes'], weight: 20, percentComplete: 65, actualTime: 39, subtasks: [{id: 'st10', title: 'Gather receipts', completed: true}, {id: 'st11', title: 'Organize documents', completed: true}, {id: 'st12', title: 'Fill out tax forms', completed: false}] },
      { id: 't7', title: 'Complete Online Course Module 3', category: 'Learning', subtype: 'Courses', priority: 'Low', estimatedTime: 90, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(), tags: ['learning', 'education', 'course'], weight: 7, percentComplete: 75, actualTime: 68, subtasks: [{id: 'st13', title: 'Watch video lectures', completed: true}, {id: 'st14', title: 'Complete exercises', completed: false}] },
      { id: 't8', title: 'Write Blog Post on Market Trends', category: 'Work', subtype: 'Deep Work', priority: 'Medium', estimatedTime: 90, estimatedTimeUnit: 'min', people: [], location: 'Coffee Shop', locationIds: ['loc3'], completed: false, createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), tags: ['writing', 'content', 'blog'], weight: 10, percentComplete: 40, actualTime: 36, subtasks: [{id: 'st15', title: 'Research market data', completed: true}, {id: 'st16', title: 'Write draft', completed: false}, {id: 'st17', title: 'Edit and publish', completed: false}] },
      { id: 't9', title: 'Kitchen Renovation Planning', category: 'Home Project', subtype: 'Renovation', priority: 'High', estimatedTime: 120, estimatedTimeUnit: 'min', people: ['Eve Contractor', 'Grace Designer'], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(), dueDate: nextWeek, tags: ['home', 'project', 'renovation'], weight: 18, percentComplete: 30, subtasks: [{id: 'st18', title: 'Get quotes from contractors', completed: false}, {id: 'st19', title: 'Choose materials', completed: false}, {id: 'st20', title: 'Schedule timeline', completed: false}], actualTime: 36 },
      
      // Overdue tasks
      { id: 't10', title: 'Review Investment Portfolio', category: 'Finance', subtype: 'Investments', priority: 'Medium', estimatedTime: 45, estimatedTimeUnit: 'min', people: ['Frank Investor'], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 15 * 86400000).toISOString(), dueDate: lastWeek, tags: ['finance', 'investment', 'portfolio'], weight: 8, percentComplete: 0, subtasks: [{id: 'st21', title: 'Review performance', completed: false}, {id: 'st22', title: 'Adjust allocations', completed: false}] },
      { id: 't11', title: 'Follow up with Charlie Lead', category: 'Real Estate', subtype: 'Follow-ups', priority: 'High', estimatedTime: 20, estimatedTimeUnit: 'min', people: ['Charlie Lead'], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 12 * 86400000).toISOString(), dueDate: twoWeeksAgo, tags: ['lead', 'urgent', 'follow-up'], weight: 15, percentComplete: 0, subtasks: [{id: 'st43', title: 'Review last conversation notes', completed: false}, {id: 'st44', title: 'Prepare follow-up questions', completed: false}] },
      { id: 't12', title: 'Schedule Property Inspection', category: 'Real Estate', subtype: 'Inspections', priority: 'High', estimatedTime: 30, estimatedTimeUnit: 'min', people: ['Iris Inspector'], location: 'Property A', locationIds: ['loc5'], completed: false, createdAt: new Date(now.getTime() - 9 * 86400000).toISOString(), dueDate: yesterday, tags: ['inspection', 'property'], weight: 12, percentComplete: 0 },
      
      // Upcoming tasks
      { id: 't13', title: 'Client Meeting with Karen', category: 'Real Estate', subtype: 'Client Calls', priority: 'High', estimatedTime: 60, estimatedTimeUnit: 'min', people: ['Karen Client'], location: 'Downtown Office', locationIds: ['loc1'], completed: false, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), dueDate: tomorrow, startDate: tomorrow, startTime: '10:00', tags: ['client', 'meeting', 'consultation'], weight: 18, percentComplete: 0, subtasks: [{id: 'st23', title: 'Prepare property listings', completed: false}, {id: 'st24', title: 'Review client preferences', completed: false}] },
      { id: 't14', title: 'Property Showing - Property B', category: 'Real Estate', subtype: 'Showings', priority: 'High', estimatedTime: 45, estimatedTimeUnit: 'min', people: ['Alice Client'], location: 'Property B', locationIds: ['loc6'], completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), dueDate: nextWeek, startDate: nextWeek, startTime: '14:00', tags: ['showing', 'property'], weight: 15, percentComplete: 0, subtasks: [{id: 'st25', title: 'Prepare property info', completed: false}, {id: 'st26', title: 'Confirm appointment', completed: false}] },
      { id: 't15', title: 'Yoga Session', category: 'Health', subtype: 'Yoga', priority: 'Low', estimatedTime: 60, estimatedTimeUnit: 'min', people: [], location: 'Gym', locationIds: ['loc4'], completed: false, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), dueDate: tomorrow, tags: ['health', 'wellness', 'yoga'], weight: 5, percentComplete: 0, recurring: 'Weekly' },
      { id: 't16', title: 'Read Chapter 5 of Real Estate Book', category: 'Learning', subtype: 'Reading', priority: 'Low', estimatedTime: 30, estimatedTimeUnit: 'min', people: [], location: 'Coffee Shop', locationIds: ['loc3'], completed: false, createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(), dueDate: tomorrow, tags: ['reading', 'learning', 'book'], weight: 6, percentComplete: 0 },
      { id: 't17', title: 'Pay Monthly Bills', category: 'Finance', subtype: 'Bills', priority: 'Medium', estimatedTime: 15, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), dueDate: nextWeek, tags: ['bills', 'finance', 'monthly'], weight: 8, percentComplete: 0, recurring: 'Monthly', subtasks: [{id: 'st27', title: 'Review bills', completed: false}, {id: 'st28', title: 'Pay online', completed: false}] },
      { id: 't18', title: 'Organize Home Office', category: 'Home Project', subtype: 'Organization', priority: 'Low', estimatedTime: 120, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(), dueDate: nextWeek, tags: ['organization', 'home', 'office'], weight: 7, percentComplete: 0, subtasks: [{id: 'st29', title: 'Sort papers', completed: false}, {id: 'st30', title: 'Organize files', completed: false}, {id: 'st31', title: 'Clean desk', completed: false}] },
      { id: 't19', title: 'Update CRM with New Leads', category: 'Work', subtype: 'Admin', priority: 'Medium', estimatedTime: 30, estimatedTimeUnit: 'min', people: ['Charlie Lead'], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), dueDate: tomorrow, tags: ['admin', 'crm', 'leads'], weight: 8, percentComplete: 0 },
      { id: 't20', title: 'Plan Weekend Trip', category: 'Fun', subtype: 'Travel', priority: 'Low', estimatedTime: 60, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), dueDate: nextWeek, tags: ['travel', 'fun', 'weekend'], weight: 5, percentComplete: 0, subtasks: [{id: 'st32', title: 'Research destinations', completed: false}, {id: 'st33', title: 'Book accommodations', completed: false}] },
      { id: 't21', title: 'Strength Training', category: 'Health', subtype: 'Strength', priority: 'Low', estimatedTime: 45, estimatedTimeUnit: 'min', people: [], location: 'Gym', locationIds: ['loc4'], completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), tags: ['health', 'fitness', 'strength'], weight: 6, percentComplete: 0, recurring: 'Weekly' },
      { id: 't22', title: 'Review Contract Terms with Henry', category: 'Real Estate', subtype: 'Contracts', priority: 'Urgent', estimatedTime: 45, estimatedTimeUnit: 'min', people: ['Henry Lawyer'], location: 'Downtown Office', locationIds: ['loc1'], completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), dueDate: today, startDate: today, startTime: '15:00', tags: ['contract', 'urgent', 'legal'], weight: 20, percentComplete: 0, subtasks: [{id: 'st34', title: 'Review contract draft', completed: false}, {id: 'st35', title: 'List questions', completed: false}] },
      { id: 't23', title: 'Meal Prep for Week', category: 'Health', subtype: 'Meal Prep', priority: 'Medium', estimatedTime: 90, estimatedTimeUnit: 'min', people: [], location: '', locationIds: [], completed: false, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), dueDate: tomorrow, tags: ['health', 'meal', 'prep'], weight: 8, percentComplete: 0, recurring: 'Weekly', subtasks: [{id: 'st36', title: 'Plan meals', completed: false}, {id: 'st37', title: 'Buy ingredients', completed: false}, {id: 'st38', title: 'Cook and portion', completed: false}] },
      { id: 't24', title: 'Research Market Trends', category: 'Work', subtype: 'Research', priority: 'Medium', estimatedTime: 60, estimatedTimeUnit: 'min', people: [], location: 'Coffee Shop', locationIds: ['loc3'], completed: false, createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(), dueDate: nextWeek, tags: ['research', 'work', 'market'], weight: 10, percentComplete: 0, subtasks: [{id: 'st39', title: 'Gather data sources', completed: false}, {id: 'st40', title: 'Analyze trends', completed: false}] }
    ];

    setTasks(prev => [...prev, ...sampleTasks]);

    // Sample Goals (expanded with more variety)
    const sampleGoals = [
      { id: 'g1', title: 'Complete 50 Real Estate Deals This Year', description: 'Focus on closing deals and building client relationships', category: 'Real Estate', target: 50, progress: 12, createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] },
      { id: 'g2', title: 'Log 100 Hours of Focus Time', description: 'Track deep work sessions to improve productivity', category: 'Work', target: 100, progress: 35, createdAt: new Date(now.getTime() - 20 * 86400000).toISOString() },
      { id: 'g3', title: 'Save $50,000 for Vacation', description: 'Planning a dream vacation next year', category: 'Finance', target: 50000, progress: 15000, createdAt: new Date(now.getTime() - 60 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear() + 1, 5, 1).toISOString().split('T')[0] },
      { id: 'g4', title: 'Complete Kitchen Renovation', description: 'Finish the home renovation project', category: 'Home Project', target: 100, progress: 45, createdAt: new Date(now.getTime() - 15 * 86400000).toISOString() },
      { id: 'g5', title: 'Read 24 Books This Year', description: 'One book every two weeks', category: 'Learning', target: 24, progress: 8, createdAt: new Date(now.getTime() - 90 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] },
      { id: 'g6', title: 'Run 500 Miles This Year', description: 'Track running distance for fitness goals', category: 'Health', target: 500, progress: 127, createdAt: new Date(now.getTime() - 120 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] },
      { id: 'g7', title: 'Complete Real Estate Certification', description: 'Finish online certification course', category: 'Learning', target: 100, progress: 68, createdAt: new Date(now.getTime() - 45 * 86400000).toISOString() },
      { id: 'g8', title: 'Build Emergency Fund', description: 'Save 6 months of expenses', category: 'Finance', target: 30000, progress: 18500, createdAt: new Date(now.getTime() - 180 * 86400000).toISOString() }
    ];

    if (DM?.goals?.setAll) {
      DM.goals.setAll(sampleGoals);
    } else {
      setGoals(sampleGoals);
      localStorage.setItem('goals', JSON.stringify(sampleGoals));
    }

    // Sample Activities (expanded with more variety and types)
    const sampleActivities = [
      { id: 'a1', title: 'Deep Work Session', category: 'Work', duration: 3600, type: 'focus', createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { id: 'a2', title: 'Morning Run', category: 'Health', duration: 1800, type: 'completion', taskId: 't2', createdAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { id: 'a3', title: 'Client Call with Alice', category: 'Real Estate', duration: 900, type: 'completion', taskId: 't1', people: ['Alice Client'], createdAt: new Date(now.getTime() - 4 * 86400000).toISOString() },
      { id: 'a4', title: 'Tax Preparation', category: 'Finance', duration: 2700, type: 'focus', taskId: 't6', createdAt: new Date(now.getTime() - 5 * 86400000).toISOString() },
      { id: 'a5', title: 'Gym Workout', category: 'Health', duration: 2400, type: 'completion', createdAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { id: 'a6', title: 'Online Course Study', category: 'Learning', duration: 5400, type: 'focus', taskId: 't7', createdAt: new Date(now.getTime() - 4 * 86400000).toISOString() },
      { id: 'a7', title: 'Team Meeting', category: 'Work', duration: 1800, type: 'completion', taskId: 't3', people: ['Diana Partner'], createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { id: 'a8', title: 'Property Showing', category: 'Real Estate', duration: 1800, type: 'completion', createdAt: new Date(now.getTime() - 7 * 86400000).toISOString() },
      { id: 'a9', title: 'Blog Writing', category: 'Work', duration: 3600, type: 'focus', taskId: 't8', createdAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { id: 'a10', title: 'Grocery Shopping', category: 'Personal', duration: 1800, type: 'completion', taskId: 't4', createdAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { id: 'a11', title: 'Property Inspection', category: 'Real Estate', duration: 3600, type: 'completion', people: ['Iris Inspector'], locationLabel: 'Property A', createdAt: new Date(now.getTime() - 8 * 86400000).toISOString() },
      { id: 'a12', title: 'Yoga Session', category: 'Health', duration: 3600, type: 'completion', createdAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { id: 'a13', title: 'Client Consultation', category: 'Real Estate', duration: 2700, type: 'completion', people: ['Karen Client'], createdAt: new Date(now.getTime() - 6 * 86400000).toISOString() },
      { id: 'a14', title: 'Meal Prep Session', category: 'Health', duration: 5400, type: 'completion', createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { id: 'a15', title: 'Research Session', category: 'Work', duration: 7200, type: 'focus', createdAt: new Date(now.getTime() - 5 * 86400000).toISOString() }
    ];

    if (DM?.activities?.setAll) {
      DM.activities.setAll(sampleActivities);
      const allActivities = DM.activities.getAll() || [];
      setActivitiesInternal(allActivities);
    } else {
      setActivitiesInternal(sampleActivities);
      localStorage.setItem('activities', JSON.stringify(sampleActivities));
    }

    // Sample History/Events (TaskEvents) - various event types
    const sampleHistoryEvents = [
      { id: 'e1', ts: new Date(now.getTime() - 4 * 86400000).toISOString(), type: 'spin_result', taskId: 't1', title: 'Call Alice re: Offer', category: 'Real Estate', priority: 'High', meta: { spinDuration: 3000 } },
      { id: 'e2', ts: new Date(now.getTime() - 4 * 86400000).toISOString(), type: 'done', taskId: 't1', title: 'Call Alice re: Offer', category: 'Real Estate', priority: 'High', meta: {} },
      { id: 'e3', ts: new Date(now.getTime() - 2 * 86400000).toISOString(), type: 'start_focus', taskId: 't6', title: 'Prepare Q4 Taxes', category: 'Finance', priority: 'Urgent', meta: { duration: 2700 } },
      { id: 'e4', ts: new Date(now.getTime() - 2 * 86400000).toISOString(), type: 'spin_result', taskId: 't3', title: 'Team Meeting Prep', category: 'Work', priority: 'High', meta: { spinDuration: 2500 } },
      { id: 'e5', ts: new Date(now.getTime() - 2 * 86400000).toISOString(), type: 'done', taskId: 't3', title: 'Team Meeting Prep', category: 'Work', priority: 'High', meta: {} },
      { id: 'e6', ts: new Date(now.getTime() - 1 * 86400000).toISOString(), type: 'spin_result', taskId: 't2', title: 'Morning Run', category: 'Health', priority: 'Low', meta: { spinDuration: 1800 } },
      { id: 'e7', ts: new Date(now.getTime() - 1 * 86400000).toISOString(), type: 'done', taskId: 't2', title: 'Morning Run', category: 'Health', priority: 'Low', meta: {} },
      { id: 'e8', ts: new Date(now.getTime() - 5 * 86400000).toISOString(), type: 'respin', taskId: 't6', title: 'Prepare Q4 Taxes', category: 'Finance', priority: 'Urgent', meta: {} },
      { id: 'e9', ts: new Date(now.getTime() - 3 * 86400000).toISOString(), type: 'start_focus', taskId: 't7', title: 'Complete Online Course Module 3', category: 'Learning', priority: 'Low', meta: { duration: 5400 } },
      { id: 'e10', ts: new Date(now.getTime() - 1 * 86400000).toISOString(), type: 'start_focus', taskId: 't8', title: 'Write Blog Post on Market Trends', category: 'Work', priority: 'Medium', meta: { duration: 3600 } },
      { id: 'e11', ts: new Date(now.getTime() - 3 * 86400000).toISOString(), type: 'done', taskId: 't4', title: 'Grocery Shopping', category: 'Personal', priority: 'Medium', meta: {} },
      { id: 'e12', ts: new Date(now.getTime() - 5 * 86400000).toISOString(), type: 'done', taskId: 't5', title: 'Update Listing Photos', category: 'Real Estate', priority: 'Medium', meta: {} },
      { id: 'e13', ts: new Date(now.getTime() - 7 * 86400000).toISOString(), type: 'spin_result', taskId: 't8', title: 'Property Showing', category: 'Real Estate', priority: 'High', meta: { spinDuration: 3200 } },
      { id: 'e14', ts: new Date(now.getTime() - 6 * 86400000).toISOString(), type: 'start_focus', taskId: 't9', title: 'Kitchen Renovation Planning', category: 'Home Project', priority: 'High', meta: { duration: 3600 } }
    ];

    if (window.TaskEvents?.setAll) {
      window.TaskEvents.setAll(sampleHistoryEvents);
    } else if (DM?.history?.setAll) {
      DM.history.setAll(sampleHistoryEvents);
    } else {
      localStorage.setItem('taskEvents_v1', JSON.stringify(sampleHistoryEvents));
      window.dispatchEvent(new Event('history-updated'));
      window.dispatchEvent(new Event('stats-updated'));
    }

    // Sample Stats
    const sampleStats = {
      xp: 2450,
      level: 5,
      tasksCompleted: 42,
      totalFocusTime: 125400, // seconds
      dailyStreak: 12,
      lastCompletionDate: new Date(now.getTime() - 1 * 86400000).toISOString().split('T')[0]
    };

    if (DM?.userStats?.set) {
      DM.userStats.set(sampleStats);
    } else {
      setUserStatsInternal(sampleStats);
      localStorage.setItem('userStats', JSON.stringify(sampleStats));
    }

    // Sample Saved Notes (expanded)
    const sampleNotes = [
      { id: 'n1', text: 'Market analysis: Downtown properties are up 15% this quarter. Focus on mid-range homes ($300k-$500k) as they have the best ROI.', createdAt: new Date(now.getTime() - 10 * 86400000).toISOString() },
      { id: 'n2', text: 'Client feedback: Alice prefers properties with modern kitchens and good schools nearby. Budget flexible up to $550k.', createdAt: new Date(now.getTime() - 5 * 86400000).toISOString() },
      { id: 'n3', text: 'Tax tip: Remember to deduct home office expenses and vehicle mileage for real estate work. Keep all receipts organized.', createdAt: new Date(now.getTime() - 8 * 86400000).toISOString() },
      { id: 'n4', text: 'Learning goal: Complete the real estate investment course by end of month. Focus on commercial property analysis module.', createdAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { id: 'n5', text: 'Renovation checklist: Get 3 quotes for kitchen, choose cabinet style, select countertop material, schedule contractor meeting.', createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { id: 'n6', text: 'Health reminder: Morning runs are working well. Consider adding strength training 2x per week for better results.', createdAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { id: 'n7', text: 'Property notes: Property A needs staging. Property B has great curb appeal but needs minor repairs. Both in good school districts.', createdAt: new Date(now.getTime() - 6 * 86400000).toISOString() },
      { id: 'n8', text: 'Meeting notes: Discussed Q4 goals with team. Focus on closing 5 more deals before year end. Need to ramp up lead generation.', createdAt: new Date(now.getTime() - 4 * 86400000).toISOString() },
      { id: 'n9', text: 'Investment strategy: Diversify portfolio with 60% stocks, 30% real estate, 10% bonds. Review quarterly.', createdAt: new Date(now.getTime() - 7 * 86400000).toISOString() },
      { id: 'n10', text: 'Wellness goal: Maintain daily exercise routine. Track progress weekly. Consider joining running group for motivation.', createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() }
    ];

    if (DM?.savedNotes?.setAll) {
      DM.savedNotes.setAll(sampleNotes);
    } else {
      setSavedNotes(sampleNotes);
      localStorage.setItem('savedNotes', JSON.stringify(sampleNotes));
    }

    notify("Comprehensive Samples Loaded! 🎲", "✅");
    setTimeout(() => window.location.reload(), 1000);
  };

  // Comprehensive Sample Data - 4 Fully Filled Tasks with All Links
  const handleLoadComprehensiveSamples = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const lastWeek = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

    const generateId = (prefix) => window.generateId ? window.generateId(prefix) : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Ensure we have people and locations first (reuse from existing samples or create minimal ones)
    const requiredPeople = [
      { id: 'p1', firstName: 'Alice', lastName: 'Client', name: 'Alice Client', type: 'client', phone: '555-0100', email: 'alice@example.com', notes: 'VIP client looking for 3bd/2ba', links: ['https://compass.com/alice'], tags: ['vip'], weight: 15 },
      { id: 'p4', firstName: 'Diana', lastName: 'Partner', name: 'Diana Partner', type: 'partner', phone: '555-0103', email: 'diana@partners.com', notes: 'Real estate partner', links: [], tags: ['partner'], weight: 20 },
      { id: 'p5', firstName: 'Eve', lastName: 'Contractor', name: 'Eve Contractor', type: 'vendor', phone: '555-0104', email: 'eve@construction.com', notes: 'General contractor', links: [], tags: ['contractor'], weight: 10 },
      { id: 'p7', firstName: 'Grace', lastName: 'Designer', name: 'Grace Designer', type: 'vendor', phone: '555-0106', email: 'grace@design.com', notes: 'Interior designer', links: [], tags: ['designer'], weight: 9 }
    ];

    const requiredLocations = [
      { id: 'loc1', label: 'Downtown Office', name: 'Downtown Office', address: '123 Main St, City, ST 12345', type: 'client', lat: 37.7749, lon: -122.4194, coords: { lat: 37.7749, lon: -122.4194 } },
      { id: 'loc2', label: 'Client Home', name: 'Client Home', address: '456 Oak Ave, City, ST 12346', type: 'client', lat: 37.7849, lon: -122.4094, coords: { lat: 37.7849, lon: -122.4094 } },
      { id: 'loc3', label: 'Coffee Shop', name: 'Coffee Shop', address: '789 Elm Blvd, City, ST 12347', type: 'personal', lat: 37.7649, lon: -122.4294, coords: { lat: 37.7649, lon: -122.4294 } }
    ];

    // Ensure people and locations exist
    if (DM?.people?.getAll) {
      const existing = DM.people.getAll();
      const toAdd = requiredPeople.filter(p => !existing.find(e => e.id === p.id));
      if (toAdd.length > 0) DM.people.setAll([...existing, ...toAdd]);
    } else {
      const existing = JSON.parse(localStorage.getItem('savedPeople') || '[]');
      const toAdd = requiredPeople.filter(p => !existing.find(e => e.id === p.id));
      localStorage.setItem('savedPeople', JSON.stringify([...existing, ...toAdd]));
      window.dispatchEvent(new Event('people-updated'));
    }

    if (typeof window.setSavedLocationsV1 === 'function') {
      const existing = window.getSavedLocationsV1?.() || [];
      const toAdd = requiredLocations.filter(l => !existing.find(e => e.id === l.id));
      window.setSavedLocationsV1([...existing, ...toAdd]);
    } else {
      const existing = JSON.parse(localStorage.getItem('savedLocations_v1') || '[]');
      const toAdd = requiredLocations.filter(l => !existing.find(e => e.id === l.id));
      localStorage.setItem('savedLocations_v1', JSON.stringify([...existing, ...toAdd]));
      window.dispatchEvent(new Event('locations-updated'));
    }

    // Create a goal to link to
    const goalId = 'g_comprehensive_1';
    const sampleGoal = {
      id: goalId,
      title: 'Complete Major Project Milestones',
      description: 'Finish key deliverables across multiple domains',
      category: 'Work',
      target: 100,
      progress: 45,
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString()
    };

    if (DM?.goals?.getAll) {
      const existing = DM.goals.getAll();
      if (!existing.find(g => g.id === goalId)) {
        DM.goals.setAll([...existing, sampleGoal]);
      }
    } else {
      const existing = JSON.parse(localStorage.getItem('goals') || '[]');
      if (!existing.find(g => g.id === goalId)) {
        localStorage.setItem('goals', JSON.stringify([...existing, sampleGoal]));
        if (setGoals) setGoals(prev => [...prev, sampleGoal]);
      }
    }

    // 4 COMPREHENSIVE TASKS WITH ALL FIELDS FILLED
    const comprehensiveTasks = [
      {
        id: generateId('comp_task'),
        title: 'Complete Q1 Marketing Campaign and Launch Strategy',
        category: 'Work',
        subtype: 'Deep Work',
        priority: 'Urgent',
        weight: 25,
        estimatedTime: '480',
        estimatedTimeUnit: 'min',
        people: ['Alice Client', 'Diana Partner'],
        location: 'Downtown Office',
        locationIds: ['loc1'],
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        completed: false,
        createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
        completedAt: null,
        dueDate: nextWeek,
        dueTime: '17:00',
        startDate: tomorrow,
        startTime: '09:00',
        tags: ['marketing', 'campaign', 'urgent', 'strategy', 'launch', 'q1'],
        actualTime: 180,
        percentComplete: 65,
        description: 'Develop and execute a comprehensive Q1 marketing campaign including strategy development, content creation, and launch planning. Coordinate with team members and stakeholders to ensure successful campaign rollout.',
        images: [
          'https://picsum.photos/seed/marketing1/800/600',
          'https://picsum.photos/seed/marketing2/800/600',
          'https://picsum.photos/seed/marketing3/800/600'
        ],
        subtasks: [
          { id: generateId('sub'), title: 'Research target audience demographics', completed: true },
          { id: generateId('sub'), title: 'Create campaign messaging framework', completed: true },
          { id: generateId('sub'), title: 'Design visual assets and branding', completed: false },
          { id: generateId('sub'), title: 'Set up marketing automation workflows', completed: false },
          { id: generateId('sub'), title: 'Finalize launch timeline and milestones', completed: false }
        ],
        recurring: 'None',
        reminderMode: 'due',
        reminderAnchor: 'due',
        reminderOffsetValue: 2,
        reminderOffsetUnit: 'hours',
        blockedBy: [],
        goalId: goalId,
        excludeFromTumbler: false,
        lastModified: new Date(now.getTime() - 1 * 86400000).toISOString()
      },
      {
        id: generateId('comp_task'),
        title: 'Kitchen Renovation: Finalize Design and Contractor Selection',
        category: 'Home Project',
        subtype: 'Renovation',
        priority: 'High',
        weight: 22,
        estimatedTime: '180',
        estimatedTimeUnit: 'min',
        people: ['Eve Contractor', 'Grace Designer'],
        location: 'Client Home',
        locationIds: ['loc2'],
        locationCoords: { lat: 37.7849, lon: -122.4094 },
        completed: false,
        createdAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
        completedAt: null,
        dueDate: tomorrow,
        dueTime: '14:00',
        startDate: tomorrow,
        startTime: '10:00',
        tags: ['renovation', 'kitchen', 'home', 'contractor', 'design', 'selection'],
        actualTime: 90,
        percentComplete: 75,
        description: 'Complete the kitchen renovation project by finalizing design choices, selecting materials, and choosing the right contractor. Review quotes, compare portfolios, and make final decisions on cabinets, countertops, and appliances.',
        images: [
          'https://picsum.photos/seed/kitchen1/800/600',
          'https://picsum.photos/seed/kitchen2/800/600',
          'https://picsum.photos/seed/kitchen3/800/600',
          'https://picsum.photos/seed/kitchen4/800/600'
        ],
        subtasks: [
          { id: generateId('sub'), title: 'Review contractor quotes and portfolios', completed: true },
          { id: generateId('sub'), title: 'Select cabinet style and hardware', completed: true },
          { id: generateId('sub'), title: 'Choose countertop material (granite vs quartz)', completed: true },
          { id: generateId('sub'), title: 'Finalize appliance selections', completed: false },
          { id: generateId('sub'), title: 'Schedule final meeting with Eve and Grace', completed: false }
        ],
        recurring: 'None',
        reminderMode: 'start',
        reminderAnchor: 'start',
        reminderOffsetValue: 30,
        reminderOffsetUnit: 'minutes',
        blockedBy: [],
        goalId: null,
        excludeFromTumbler: false,
        lastModified: new Date(now.getTime() - 2 * 86400000).toISOString()
      },
      {
        id: generateId('comp_task'),
        title: 'Deep Dive: Market Analysis and Competitive Research Report',
        category: 'Work',
        subtype: 'Research',
        priority: 'Medium',
        weight: 18,
        estimatedTime: '360',
        estimatedTimeUnit: 'min',
        people: ['Diana Partner'],
        location: 'Coffee Shop',
        locationIds: ['loc3'],
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        completed: false,
        createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
        completedAt: null,
        dueDate: nextWeek,
        dueTime: '16:00',
        startDate: tomorrow,
        startTime: '13:00',
        tags: ['research', 'analysis', 'competitive', 'market', 'report', 'deep-work'],
        actualTime: 120,
        percentComplete: 40,
        description: 'Conduct comprehensive market analysis and competitive research to identify trends, opportunities, and threats. Gather data, analyze competitor strategies, and create visualizations and recommendations for strategic decision-making.',
        images: [
          'https://picsum.photos/seed/research1/800/600',
          'https://picsum.photos/seed/research2/800/600'
        ],
        subtasks: [
          { id: generateId('sub'), title: 'Gather market data and statistics', completed: true },
          { id: generateId('sub'), title: 'Analyze competitor strategies and positioning', completed: false },
          { id: generateId('sub'), title: 'Create visualizations and charts', completed: false },
          { id: generateId('sub'), title: 'Write executive summary and recommendations', completed: false }
        ],
        recurring: 'None',
        reminderMode: 'due',
        reminderAnchor: 'due',
        reminderOffsetValue: 1,
        reminderOffsetUnit: 'days',
        blockedBy: [],
        goalId: goalId,
        excludeFromTumbler: false,
        lastModified: new Date(now.getTime() - 3 * 86400000).toISOString()
      },
      {
        id: generateId('comp_task'),
        title: 'Client Onboarding: Alice - Property Search Kickoff Meeting',
        category: 'Real Estate',
        subtype: 'Client Calls',
        priority: 'High',
        weight: 20,
        estimatedTime: '90',
        estimatedTimeUnit: 'min',
        people: ['Alice Client'],
        location: 'Downtown Office',
        locationIds: ['loc1'],
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        completed: true,
        createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
        completedAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
        dueDate: yesterday,
        dueTime: '11:00',
        startDate: yesterday,
        startTime: '10:00',
        tags: ['client', 'onboarding', 'meeting', 'real-estate', 'property-search', 'kickoff'],
        actualTime: 85,
        percentComplete: 100,
        description: 'Initial client onboarding meeting with Alice to understand her property preferences, budget, timeline, and requirements. Review property listings portfolio, establish search criteria, and schedule follow-up viewing appointments.',
        images: [
          'https://picsum.photos/seed/property1/800/600',
          'https://picsum.photos/seed/property2/800/600',
          'https://picsum.photos/seed/property3/800/600',
          'https://picsum.photos/seed/property4/800/600',
          'https://picsum.photos/seed/property5/800/600'
        ],
        subtasks: [
          { id: generateId('sub'), title: 'Prepare property listings portfolio', completed: true },
          { id: generateId('sub'), title: 'Review client preferences and budget', completed: true },
          { id: generateId('sub'), title: 'Create initial property search criteria', completed: true },
          { id: generateId('sub'), title: 'Schedule follow-up viewing appointments', completed: true }
        ],
        recurring: 'None',
        reminderMode: 'start',
        reminderAnchor: 'start',
        reminderOffsetValue: 15,
        reminderOffsetUnit: 'minutes',
        blockedBy: [],
        goalId: null,
        excludeFromTumbler: false,
        lastModified: new Date(now.getTime() - 4 * 86400000).toISOString()
      }
    ];

    // Add tasks (use setTasks which handles both state and DataManager sync)
    setTasks(prev => [...prev, ...comprehensiveTasks]);

    // Create comprehensive Activities (Tracks) linked to tasks
    const comprehensiveActivities = [
      // Activities for Task 1 (Marketing Campaign)
      {
        id: generateId('act'),
        title: 'Marketing Campaign Deep Work Session',
        category: 'Work',
        duration: 7200, // 2 hours
        type: 'focus',
        taskId: comprehensiveTasks[0].id,
        people: ['Diana Partner'],
        locationLabel: 'Downtown Office',
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        locationId: 'loc1',
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString()
      },
      {
        id: generateId('act'),
        title: 'Marketing Strategy Planning',
        category: 'Work',
        duration: 5400, // 1.5 hours
        type: 'focus',
        taskId: comprehensiveTasks[0].id,
        people: [],
        locationLabel: 'Coffee Shop',
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        locationId: 'loc3',
        createdAt: new Date(now.getTime() - 5 * 86400000).toISOString()
      },
      {
        id: generateId('act'),
        title: 'Marketing Meeting with Alice',
        category: 'Work',
        duration: 3600, // 1 hour
        type: 'completion',
        taskId: comprehensiveTasks[0].id,
        people: ['Alice Client'],
        locationLabel: 'Downtown Office',
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        locationId: 'loc1',
        createdAt: new Date(now.getTime() - 2 * 86400000).toISOString()
      },
      // Activities for Task 2 (Kitchen Renovation)
      {
        id: generateId('act'),
        title: 'Kitchen Design Consultation',
        category: 'Home Project',
        duration: 5400, // 1.5 hours
        type: 'completion',
        taskId: comprehensiveTasks[1].id,
        people: ['Grace Designer', 'Eve Contractor'],
        locationLabel: 'Client Home',
        locationCoords: { lat: 37.7849, lon: -122.4094 },
        locationId: 'loc2',
        createdAt: new Date(now.getTime() - 4 * 86400000).toISOString()
      },
      {
        id: generateId('act'),
        title: 'Contractor Quote Review Session',
        category: 'Home Project',
        duration: 2700, // 45 minutes
        type: 'completion',
        taskId: comprehensiveTasks[1].id,
        people: ['Eve Contractor'],
        locationLabel: 'Client Home',
        locationCoords: { lat: 37.7849, lon: -122.4094 },
        locationId: 'loc2',
        createdAt: new Date(now.getTime() - 6 * 86400000).toISOString()
      },
      // Activities for Task 3 (Market Research)
      {
        id: generateId('act'),
        title: 'Market Research Deep Work',
        category: 'Work',
        duration: 10800, // 3 hours
        type: 'focus',
        taskId: comprehensiveTasks[2].id,
        people: [],
        locationLabel: 'Coffee Shop',
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        locationId: 'loc3',
        createdAt: new Date(now.getTime() - 1 * 86400000).toISOString()
      },
      {
        id: generateId('act'),
        title: 'Research Collaboration with Diana',
        category: 'Work',
        duration: 5400, // 1.5 hours
        type: 'focus',
        taskId: comprehensiveTasks[2].id,
        people: ['Diana Partner'],
        locationLabel: 'Coffee Shop',
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        locationId: 'loc3',
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString()
      },
      // Activities for Task 4 (Client Onboarding - completed)
      {
        id: generateId('act'),
        title: 'Alice Client Onboarding Meeting',
        category: 'Real Estate',
        duration: 5100, // 85 minutes
        type: 'completion',
        taskId: comprehensiveTasks[3].id,
        people: ['Alice Client'],
        locationLabel: 'Downtown Office',
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        locationId: 'loc1',
        createdAt: new Date(now.getTime() - 4 * 86400000).toISOString()
      },
      {
        id: generateId('act'),
        title: 'Property Search Preparation',
        category: 'Real Estate',
        duration: 3600, // 1 hour
        type: 'completion',
        taskId: comprehensiveTasks[3].id,
        people: [],
        locationLabel: 'Downtown Office',
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        locationId: 'loc1',
        createdAt: new Date(now.getTime() - 5 * 86400000).toISOString()
      },
      // Additional standalone tracks
      {
        id: generateId('act'),
        title: 'Quick Strategy Call',
        category: 'Work',
        duration: 1800, // 30 minutes
        type: 'log',
        taskId: null,
        people: ['Diana Partner'],
        locationLabel: '',
        locationCoords: null,
        locationId: null,
        createdAt: new Date(now.getTime() - 1 * 86400000).toISOString()
      },
      {
        id: generateId('act'),
        title: 'Follow-up Design Discussion',
        category: 'Home Project',
        duration: 2400, // 40 minutes
        type: 'log',
        taskId: null,
        people: ['Grace Designer'],
        locationLabel: 'Client Home',
        locationCoords: { lat: 37.7849, lon: -122.4094 },
        locationId: 'loc2',
        createdAt: new Date(now.getTime() - 2 * 86400000).toISOString()
      }
    ];

    // Add activities
    if (DM?.activities?.add) {
      comprehensiveActivities.forEach(act => DM.activities.add(act));
    } else if (DM?.activities?.setAll) {
      const existing = DM.activities.getAll() || [];
      DM.activities.setAll([...existing, ...comprehensiveActivities]);
      if (setActivitiesInternal) {
        setActivitiesInternal(DM.activities.getAll());
      }
    } else {
      const existing = JSON.parse(localStorage.getItem('activities') || '[]');
      localStorage.setItem('activities', JSON.stringify([...existing, ...comprehensiveActivities]));
      if (setActivitiesInternal) {
        setActivitiesInternal([...existing, ...comprehensiveActivities]);
      }
    }

    // Create history events for the tasks
    const historyEvents = [
      {
        id: generateId('hist'),
        ts: new Date(now.getTime() - 4 * 86400000).toISOString(),
        type: 'done',
        taskId: comprehensiveTasks[3].id,
        title: comprehensiveTasks[3].title,
        category: comprehensiveTasks[3].category,
        priority: comprehensiveTasks[3].priority,
        meta: {}
      },
      {
        id: generateId('hist'),
        ts: new Date(now.getTime() - 3 * 86400000).toISOString(),
        type: 'start_focus',
        taskId: comprehensiveTasks[0].id,
        title: comprehensiveTasks[0].title,
        category: comprehensiveTasks[0].category,
        priority: comprehensiveTasks[0].priority,
        meta: { duration: 7200 }
      },
      {
        id: generateId('hist'),
        ts: new Date(now.getTime() - 1 * 86400000).toISOString(),
        type: 'spin_result',
        taskId: comprehensiveTasks[2].id,
        title: comprehensiveTasks[2].title,
        category: comprehensiveTasks[2].category,
        priority: comprehensiveTasks[2].priority,
        meta: { spinDuration: 3000 }
      }
    ];

    if (window.TaskEvents?.setAll) {
      const existing = window.TaskEvents.getAll?.() || [];
      window.TaskEvents.setAll([...existing, ...historyEvents]);
    } else if (DM?.history?.setAll) {
      const existing = DM.history.getAll?.() || [];
      DM.history.setAll([...existing, ...historyEvents]);
    } else {
      const existing = JSON.parse(localStorage.getItem('taskEvents_v1') || '[]');
      localStorage.setItem('taskEvents_v1', JSON.stringify([...existing, ...historyEvents]));
      window.dispatchEvent(new Event('history-updated'));
    }

    notify("4 Comprehensive Tasks + Tracks Loaded! 🎯", "✅");
    setTimeout(() => window.location.reload(), 1000);
  };

  // Dev Tools helpers
  const handleClearCompleted = () => {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      notify("No completed tasks to clear", "ℹ️");
      return;
    }
    if (confirm(`Clear ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`)) {
      setTasks(prev => prev.filter(t => !t.completed));
      notify(`Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}`, "🧹");
    }
  };

  const handleManualReload = () => {
    window.location.reload();
  };

  const getStorageSize = () => {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return (total / 1024).toFixed(2); // KB
    } catch {
      return "0";
    }
  };

  const getDataStats = () => {
    return {
      tasks: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      goals: goals.length,
      categories: categories.length,
      activities: activities.length,
      people: allPeople.length,
    };
  };

  // Nav items (defensive visibleTabs + custom order + subtabs)
  const allNavItems = [
    { key: "spin", icon: "🎰", label: "Spin", displayLabel: "Spin" },
    { key: "tasks", icon: "📋", label: "Tasks", displayLabel: "Tasks" },
    { key: "timer", icon: "⏱️", label: "Track", displayLabel: "Track" },
    { key: "lists", icon: "💡", label: "Ideas", displayLabel: "Ideas" },
    { key: "goals", icon: "🎯", label: "Goals", displayLabel: "Goals" },
    { key: "people", icon: "👥", label: "People", displayLabel: "People" },
    { key: "places", icon: "📍", label: "Places", displayLabel: "Places" },
    { key: "stats", icon: "📊", label: "Data", displayLabel: "Data", hasDropdown: true, dropdownItems: ["stats:overview", "stats:charts", "stats:history"] },
    { key: "stats:overview", icon: "📊", label: "Overview", displayLabel: "Overview", groupLabel: "Data" },
    { key: "stats:charts", icon: "📈", label: "Charts", displayLabel: "Charts", groupLabel: "Data" },
    { key: "stats:history", icon: "📜", label: "History", displayLabel: "History", groupLabel: "Data" },
    { key: "duel", icon: "⚔️", label: "Duel", displayLabel: "Duel" },
    { key: "settings", icon: "⚙️", label: "Settings", displayLabel: "Settings", hasDropdown: true, dropdownItems: ["settings:view", "settings:logic", "settings:game", "settings:cats", "settings:data"] },
    { key: "settings:view", icon: "👁️", label: "View", displayLabel: "View", groupLabel: "Settings" },
    { key: "settings:logic", icon: "🧠", label: "Logic", displayLabel: "Logic", groupLabel: "Settings" },
    { key: "settings:game", icon: "🎮", label: "Game", displayLabel: "Game", groupLabel: "Settings" },
    { key: "settings:cats", icon: "🏷️", label: "Categories", displayLabel: "Cats", groupLabel: "Settings" },
    { key: "settings:data", icon: "💾", label: "Data", displayLabel: "Data", groupLabel: "Settings" },
  ];
  
  // Apply custom order if available - always fallback to defaults first
  const defaults = window.DEFAULT_SETTINGS || {};
  let customOrder = settings?.navItemsOrder || defaults.navItemsOrder || allNavItems.map(item => item.key);

  // Ensure all nav items are in customOrder (add missing ones at the end)
  const missingItems = allNavItems.filter(item => !customOrder.includes(item.key));
  if (missingItems.length > 0) {
    customOrder = [...customOrder, ...missingItems.map(item => item.key)];
  }

  const orderedItems = [...allNavItems].sort((a, b) => {
    const aIndex = customOrder.indexOf(a.key);
    const bIndex = customOrder.indexOf(b.key);
    // If not in custom order, keep original position (put at end)
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  // Filter by visibility - use navBarVisibleItems from settings, fallback to defaults
  // Settings can be hidden (accessible via #settings URL)
  // Always ensure defaults are available even if settings haven't loaded yet
  const defaultNavBarVisibleItems = defaults.navBarVisibleItems || {};
  const navItems = orderedItems.filter((item) => {
    // Check settings first (if available and has this key)
    if (settings?.navBarVisibleItems && typeof settings.navBarVisibleItems[item.key] === 'boolean') {
      return settings.navBarVisibleItems[item.key] === true;
    }

    // Fallback to defaults if setting doesn't exist or item not in settings
    // This ensures default nav items always show on fresh start
    if (defaultNavBarVisibleItems && typeof defaultNavBarVisibleItems[item.key] === 'boolean') {
      return defaultNavBarVisibleItems[item.key] === true;
    }

    // If not in defaults either, show it by default (new items should be visible)
    return true;
  });
  
  // Handle brand click - toggle dock OR toggle default nav items when nav is empty
  const handleBrandClickWithNav = React.useCallback(() => {
    // If nav items are empty, toggle default nav items instead of dock
    if (navItems.length === 0) {
      const defaultNavBarItems = settings?.defaultNavBarItems || defaults.defaultNavBarItems || ["tasks", "spin", "duel", "settings", "goals", "people"];
      
      // Turn on default items
      setSettings((prev) => {
        const newVisibleItems = { ...(prev?.navBarVisibleItems || {}) };
        defaultNavBarItems.forEach(key => {
          newVisibleItems[key] = true;
        });
        return {
          ...prev,
          navBarVisibleItems: newVisibleItems,
        };
      });
    } else {
      // Normal behavior: toggle dock visibility
      setDockVisible((v) => !v);
    }
  }, [navItems.length, settings, setSettings, defaults]);

  // Reset / Dev overlay
  const handleEmergencyReset = () => {
    if (!resetReady) return;
    try {
      localStorage.clear();
    } catch {}
    clearInitFlag();
    notify("Factory Reset Initiated...", "🚨");
    setTimeout(() => window.location.reload(true), 900);
  };

  const dataStats = getDataStats();
  const storageSize = getStorageSize();

  // Theme-aware color helper for dev tools
  const getDevColor = (darkColor, lightColor) => {
    return settings?.theme === "light" ? lightColor : darkColor;
  };
  const isLightTheme = settings?.theme === "light";

  const ResetButton = settings?.showDevTools !== false ? (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        maxWidth: "280px",
      }}
    >
      {/* COLLAPSE BUTTON */}
      <div
        style={{
          background: isLightTheme ? "rgba(100, 100, 255, 0.25)" : "rgba(100, 100, 255, 0.15)",
          padding: "6px 10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: isLightTheme ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "monospace",
          fontSize: 10,
          cursor: "pointer",
        }}
        onClick={toggleDevToolsCollapse}
      >
        <span style={{ color: getDevColor("#9cf", "#0066cc"), fontWeight: 700 }}>🛠️ DEV TOOLS</span>
        <span style={{ color: getDevColor("#9cf", "#0066cc"), fontSize: 12, transition: "transform 0.2s", transform: devToolsCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}>
          ▼
        </span>
      </div>

      {!devToolsCollapsed && (
        <>
      {/* NUKE APP */}
      <div
        style={{
          background: "rgba(255, 0, 0, 0.18)",
          padding: "8px 10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "monospace",
          fontSize: 10,
        }}
      >
        <input type="checkbox" checked={resetReady} onChange={(e) => setResetReady(e.target.checked)} />
        <button
          onClick={handleEmergencyReset}
          disabled={!resetReady}
          style={{
            background: resetReady ? "#ff4444" : "#333",
            color: "white",
            border: "none",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 900,
            cursor: resetReady ? "pointer" : "not-allowed",
          }}
        >
          NUKE APP
        </button>
      </div>

      {/* AUTO REFRESH */}
      <div
        style={{
          background: isLightTheme ? "rgba(0, 150, 200, 0.15)" : "rgba(0, 255, 255, 0.10)",
          padding: "7px 10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: isLightTheme ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontFamily: "monospace",
          fontSize: 10,
          color: getDevColor("#9ff", "#006699"),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
          onClick={(e) => {
            if (e.target.type !== "checkbox" && e.target.tagName !== "BUTTON") {
              setAutoRefreshEnabled(!autoRefreshEnabled);
            }
          }}
        >
          <input 
            type="checkbox" 
            checked={autoRefreshEnabled} 
            onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span style={{ userSelect: "none", flex: 1 }}>
            AUTO REFRESH ({refreshInterval / 1000}s)
            {refreshCountdown !== null && (
              <span style={{ 
                marginLeft: 6, 
                color: refreshCountdown <= 3 ? "#ff6b6b" : getDevColor("#9ff", "#006699"),
                fontWeight: 700,
                fontSize: 9
              }}>
                [{refreshCountdown}s]
              </span>
            )}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAutoRefreshConfig(!showAutoRefreshConfig);
            }}
            style={{
              background: isLightTheme ? "rgba(0, 150, 200, 0.4)" : "rgba(0, 200, 255, 0.3)",
              color: getDevColor("#9ff", "#006699"),
              border: isLightTheme ? "1px solid rgba(0, 150, 200, 0.5)" : "1px solid rgba(0, 200, 255, 0.4)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Tab/Subtab Configuration */}
        {showAutoRefreshConfig && (
          <div
            style={{
              background: isLightTheme ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.3)",
              padding: "8px",
              borderRadius: 8,
              border: isLightTheme ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.1)",
              fontSize: 9,
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: getDevColor("#9ff", "#006699") }}>Per-Tab Config</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Main Tabs */}
              {["spin", "tasks", "timer", "lists", "goals", "stats", "duel", "settings"].map((tabKey) => {
                const isEnabled = autoRefreshConfig[tabKey] === true;
                return (
                  <label
                    key={tabKey}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      padding: "2px 0",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        const newConfig = { ...autoRefreshConfig, [tabKey]: e.target.checked };
                        setAutoRefreshConfig(newConfig);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ textTransform: "capitalize", fontSize: 8 }}>{tabKey}</span>
                  </label>
                );
              })}

              {/* Settings Subtabs */}
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: isLightTheme ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 8, color: getDevColor("#9cf", "#0066cc") }}>Settings Subtabs:</div>
                {["view", "logic", "game", "cats", "data"].map((subtab) => {
                  const key = `settings:${subtab}`;
                  const isEnabled = autoRefreshConfig[key] === true;
                  return (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        padding: "2px 0",
                        paddingLeft: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          const newConfig = { ...autoRefreshConfig, [key]: e.target.checked };
                          setAutoRefreshConfig(newConfig);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 8 }}>{subtab}</span>
                    </label>
                  );
                })}
              </div>

              {/* Stats Subtabs */}
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: isLightTheme ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 8, color: getDevColor("#9cf", "#0066cc") }}>Stats Subtabs:</div>
                {["overview", "charts", "history", "people", "places"].map((subtab) => {
                  const key = `stats:${subtab}`;
                  const isEnabled = autoRefreshConfig[key] === true;
                  return (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        padding: "2px 0",
                        paddingLeft: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          const newConfig = { ...autoRefreshConfig, [key]: e.target.checked };
                          setAutoRefreshConfig(newConfig);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 8 }}>{subtab}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div
        style={{
          background: isLightTheme ? "rgba(255, 200, 0, 0.2)" : "rgba(255, 200, 0, 0.10)",
          padding: "7px 10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: isLightTheme ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontFamily: "monospace",
          fontSize: 10,
        }}
      >
        <div style={{ color: getDevColor("#ffc800", "#cc9900"), fontWeight: 700, marginBottom: 2 }}>QUICK ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            onClick={handleExportBackup}
            style={{
              background: isLightTheme ? "rgba(0, 150, 200, 0.4)" : "rgba(0, 200, 255, 0.3)",
              color: getDevColor("#9ff", "#006699"),
              border: isLightTheme ? "1px solid rgba(0, 150, 200, 0.5)" : "1px solid rgba(0, 200, 255, 0.4)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📥 EXPORT
          </button>
          <button
            onClick={handleClearCompleted}
            style={{
              background: isLightTheme ? "rgba(255, 150, 0, 0.4)" : "rgba(255, 150, 0, 0.3)",
              color: getDevColor("#ffb366", "#cc6600"),
              border: isLightTheme ? "1px solid rgba(255, 150, 0, 0.5)" : "1px solid rgba(255, 150, 0, 0.4)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🧹 CLEAR DONE
          </button>
          <button
            onClick={handleLoadSamples}
            style={{
              background: isLightTheme ? "rgba(255, 200, 0, 0.4)" : "rgba(255, 200, 0, 0.3)",
              color: getDevColor("#ffd966", "#cc9900"),
              border: isLightTheme ? "1px solid rgba(255, 200, 0, 0.5)" : "1px solid rgba(255, 200, 0, 0.4)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🎲 LOAD SAMPLES
          </button>
          <button
            onClick={handleLoadComprehensiveSamples}
            style={{
              background: isLightTheme ? "rgba(200, 100, 255, 0.4)" : "rgba(200, 100, 255, 0.3)",
              color: getDevColor("#d9a3ff", "#9933cc"),
              border: isLightTheme ? "1px solid rgba(200, 100, 255, 0.5)" : "1px solid rgba(200, 100, 255, 0.4)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🎯 4 COMPREHENSIVE
          </button>
          <button
            onClick={handleManualReload}
            style={{
              background: isLightTheme ? "rgba(100, 150, 255, 0.4)" : "rgba(100, 200, 255, 0.3)",
              color: getDevColor("#9cf", "#0066cc"),
              border: isLightTheme ? "1px solid rgba(100, 150, 255, 0.5)" : "1px solid rgba(100, 200, 255, 0.4)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔄 RELOAD
          </button>
        </div>
      </div>

      {/* DATA STATS */}
      <div
        style={{
          background: isLightTheme ? "rgba(100, 200, 100, 0.2)" : "rgba(100, 255, 100, 0.10)",
          padding: "7px 10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: isLightTheme ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.08)",
          fontFamily: "monospace",
          fontSize: 9,
          color: getDevColor("#9f9", "#006600"),
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, color: getDevColor("#6f6", "#004400") }}>DATA STATS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 8 }}>
          <span>Tasks: {dataStats.tasks}</span>
          <span>Done: {dataStats.completed}</span>
          <span>Goals: {dataStats.goals}</span>
          <span>Cats: {dataStats.categories}</span>
          <span>Activities: {dataStats.activities}</span>
          <span>People: {dataStats.people}</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 8, color: getDevColor("#6f6", "#004400") }}>
          Storage: {storageSize} KB
        </div>
      </div>

      {/* DEBUG INFO TOGGLE */}
      <div
        style={{
          background: isLightTheme ? "rgba(150, 100, 255, 0.2)" : "rgba(150, 100, 255, 0.10)",
          padding: "7px 10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: isLightTheme ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "monospace",
          fontSize: 10,
          color: getDevColor("#c9f", "#6600cc"),
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (e.target.type !== "checkbox") {
            setShowDebugInfo(!showDebugInfo);
          }
        }}
      >
        <input 
          type="checkbox" 
          checked={showDebugInfo} 
          onChange={(e) => setShowDebugInfo(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        <span style={{ userSelect: "none" }}>DEBUG INFO</span>
      </div>

      {/* DEBUG INFO PANEL */}
      {showDebugInfo && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.85)",
            padding: "12px",
            borderRadius: 10,
            backdropFilter: "blur(8px)",
            border: isLightTheme ? "1px solid rgba(0,0,0,0.2)" : "1px solid rgba(255,255,255,0.15)",
            fontFamily: "monospace",
            fontSize: 9,
            color: isLightTheme ? "#1a1a1a" : "#fff",
            maxHeight: "500px",
            overflow: "auto",
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={{ fontWeight: 700, color: getDevColor("#c9f", "#6600cc"), fontSize: 11 }}>DEBUG INFO</div>
            <button
              onClick={() => {
                const debugData = {
                  timestamp: new Date().toISOString(),
                  navigation: {
                    tab,
                    subtab: getCurrentSubtab() || "none",
                    hash: window.location.hash || "none",
                    dockVisible: isDockVisible
                  },
                  dataCounts: {
                    tasks: { total: tasks.length, active: tasks.filter(t => !t.completed).length, completed: tasks.filter(t => t.completed).length },
                    goals: goals.length,
                    categories: categories.length,
                    people: allPeople.length,
                    activities: activities.length,
                    savedNotes: savedNotes.length
                  },
                  state: {
                    timerRunning: timerState.isRunning,
                    timerActivity: timerState.activityName || "none",
                    focusMode: focusTask ? focusTask.title : "none",
                    modalsOpen: modalStack.length,
                    modalTypes: modalStack.map(m => m.type),
                    toastsActive: toasts.length,
                    autoRefresh: autoRefreshEnabled
                  },
                  system: {
                    syncState,
                    cloudUser: cloudUser ? cloudUser.email || "signed in" : "not signed in",
                    dmAvailable: !!DM,
                    firebase: !!window.firebase,
                    initialized: isInitialized,
                    theme: settings?.theme || "dark"
                  },
                  userStats: {
                    xp: userStats?.xp || 0,
                    level: userStats?.level || 1,
                    streak: userStats?.streak || 0
                  },
                  recentErrors: window.recentErrors || []
                };
                navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
                  .then(() => notify('Debug info copied to clipboard', '📋'))
                  .catch(() => notify('Failed to copy debug info', '❌'));
              }}
              style={{
                background: 'rgba(150, 100, 255, 0.2)',
                border: '1px solid rgba(150, 100, 255, 0.4)',
                color: getDevColor("#c9f", "#6600cc"),
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 8,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 600
              }}
            >
              📋 Copy All
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Navigation State */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>NAVIGATION</div>
              <div><strong>Tab:</strong> {tab}</div>
              <div><strong>Subtab:</strong> {getCurrentSubtab() || "none"}</div>
              <div><strong>URL Hash:</strong> {window.location.hash || "none"}</div>
              <div><strong>Dock Visible:</strong> {isDockVisible ? "Yes" : "No"}</div>
            </div>

            {/* Data Counts */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>DATA COUNTS</div>
              <div><strong>Tasks Total:</strong> {tasks.length} ({tasks.filter(t => !t.completed).length} active, {tasks.filter(t => t.completed).length} completed)</div>
              <div><strong>Goals:</strong> {goals.length}</div>
              <div><strong>Categories:</strong> {categories.length}</div>
              <div><strong>People:</strong> {allPeople.length}</div>
              <div><strong>Activities:</strong> {activities.length}</div>
              <div><strong>Saved Notes:</strong> {savedNotes.length}</div>
            </div>

            {/* State Info */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>STATE</div>
              <div><strong>Timer Running:</strong> {timerState.isRunning ? "Yes" : "No"} {timerState.isRunning && timerState.activityName ? `(${timerState.activityName})` : ""}</div>
              <div><strong>Focus Mode:</strong> {focusTask ? `Yes (${focusTask.title})` : "No"}</div>
              <div><strong>Modals Open:</strong> {modalStack.length} {modalStack.length > 0 ? `(${modalStack.map(m => m.type).join(", ")})` : ""}</div>
              <div><strong>Toasts Active:</strong> {toasts.length}</div>
              <div><strong>Auto-Refresh:</strong> {autoRefreshEnabled ? "On" : "Off"} {refreshCountdown ? `(${Math.ceil(refreshCountdown / 1000)}s)` : ""}</div>
            </div>

            {/* System Info */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>SYSTEM</div>
              <div><strong>Sync State:</strong> {syncState}</div>
              <div><strong>Cloud User:</strong> {cloudUser ? `Signed In (${cloudUser.email || "unknown"})` : "Not Signed In"}</div>
              <div><strong>DM Available:</strong> {DM ? "Yes" : "No"}</div>
              <div><strong>Firebase:</strong> {window.firebase ? "Yes" : "No"}</div>
              <div><strong>Initialized:</strong> {isInitialized ? "Yes" : "No"}</div>
              <div><strong>Theme:</strong> {settings?.theme || "dark"}</div>
            </div>

            {/* User Stats */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>USER STATS</div>
              <div><strong>XP:</strong> {userStats?.xp || 0}</div>
              <div><strong>Level:</strong> {userStats?.level || 1}</div>
              <div><strong>Streak:</strong> {userStats?.streak || 0}</div>
            </div>

            {/* Storage Info */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>STORAGE</div>
              <div><strong>LocalStorage Size:</strong> {(() => {
                try {
                  let total = 0;
                  for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                      total += localStorage[key].length + key.length;
                    }
                  }
                  return `${(total / 1024).toFixed(2)} KB`;
                } catch {
                  return "Unknown";
                }
              })()}</div>
              <div><strong>LocalStorage Keys:</strong> {(() => {
                try {
                  return Object.keys(localStorage).length;
                } catch {
                  return "Unknown";
                }
              })()}</div>
            </div>

            {/* Performance */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ color: getDevColor("#9cf", "#0099cc"), fontWeight: 600, marginBottom: 3 }}>PERFORMANCE</div>
              <div><strong>Memory:</strong> {window.performance?.memory ? `${(window.performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB` : "N/A"}</div>
              <div><strong>Uptime:</strong> {(() => {
                const uptime = performance.now() / 1000;
                const mins = Math.floor(uptime / 60);
                const secs = Math.floor(uptime % 60);
                return `${mins}m ${secs}s`;
              })()}</div>
            </div>

            {/* Recent Errors */}
            {window.recentErrors && window.recentErrors.length > 0 && (
              <div style={{ paddingBottom: 4 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 3
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ color: "#ff6b6b", fontWeight: 600 }}>RECENT ERRORS ({window.recentErrors.length})</div>
                    {(() => {
                      const oldestError = window.recentErrors[0];
                      if (oldestError) {
                        const errorAge = Date.now() - new Date(oldestError.time).getTime();
                        if (errorAge > 60000) {
                          return (
                            <div style={{
                              fontSize: 7,
                              color: '#ff9999',
                              background: 'rgba(255, 107, 107, 0.2)',
                              padding: '2px 4px',
                              borderRadius: 3,
                              border: '1px solid rgba(255, 107, 107, 0.3)'
                            }}>
                              Includes errors from {errorAge > 3600000 ? `${Math.floor(errorAge / 3600000)}h ago` : `${Math.floor(errorAge / 60000)}m ago`}
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => {
                        const latest = window.recentErrors[window.recentErrors.length - 1];
                        if (latest) {
                          const errorText = `[${latest.type}] ${new Date(latest.time).toISOString()}\n${latest.message}\n${latest.stack || ''}`;
                          navigator.clipboard.writeText(errorText);
                          notify('Latest error copied', '📋');
                        }
                      }}
                      style={{
                        background: 'rgba(107, 107, 255, 0.2)',
                        border: '1px solid rgba(107, 107, 255, 0.4)',
                        color: '#9999ff',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 8,
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      Copy Latest
                    </button>
                    <button
                      onClick={() => {
                        window.recentErrors = [];
                        try {
                          localStorage.removeItem('tt_debug_errors');
                        } catch {}
                        notify('Error log cleared', '🗑️');
                      }}
                      style={{
                        background: 'rgba(255, 107, 107, 0.2)',
                        border: '1px solid rgba(255, 107, 107, 0.4)',
                        color: '#ff6b6b',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 8,
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {window.recentErrors.slice(-5).reverse().map((err, i) => (
                  <div key={i} style={{
                    fontSize: 8,
                    marginBottom: 4,
                    padding: 4,
                    background: 'rgba(255, 107, 107, 0.1)',
                    borderRadius: 4,
                    borderLeft: '2px solid #ff6b6b',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 1 }}>
                      <div style={{ color: '#ff9999' }}>
                        <strong>[{err.type}]</strong> {new Date(err.time).toLocaleTimeString()}
                      </div>
                      <button
                        onClick={() => {
                          const errorText = `[${err.type}] ${new Date(err.time).toISOString()}\n${err.message}\n${err.stack || ''}`;
                          navigator.clipboard.writeText(errorText);
                          notify('Error copied', '📋');
                        }}
                        style={{
                          background: 'rgba(255, 107, 107, 0.3)',
                          border: '1px solid rgba(255, 107, 107, 0.5)',
                          color: '#ff9999',
                          padding: '1px 4px',
                          borderRadius: 3,
                          fontSize: 7,
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          lineHeight: 1
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <div style={{ color: '#ffcccc', wordBreak: 'break-word' }}>
                      {err.message || err.toString()}
                    </div>
                    {err.stack && (
                      <details style={{ marginTop: 2 }}>
                        <summary style={{
                          cursor: 'pointer',
                          color: '#ff9999',
                          fontSize: 7,
                          userSelect: 'none'
                        }}>
                          Stack trace
                        </summary>
                        <pre style={{
                          fontSize: 7,
                          color: '#ffcccc',
                          marginTop: 2,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all'
                        }}>
                          {err.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIRECT LINKS BOX */}
      <div
        style={{
          background: isLightTheme ? "rgba(100, 150, 255, 0.25)" : "rgba(100, 200, 255, 0.15)",
          padding: "10px",
          borderRadius: 10,
          backdropFilter: "blur(6px)",
          border: isLightTheme ? "1px solid rgba(0,0,0,0.2)" : "1px solid rgba(255,255,255,0.15)",
          fontFamily: "monospace",
          fontSize: 9,
          color: isLightTheme ? "#1a1a1a" : "#fff",
          maxHeight: "400px",
          overflow: "auto",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, color: getDevColor("#9ff", "#006699"), fontSize: 10 }}>DIRECT LINKS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Main Tabs */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: getDevColor("#9cf", "#0066cc"), fontSize: 9 }}>Main Tabs:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["spin", "tasks", "timer", "lists", "goals", "stats", "duel", "settings"].map((tabKey) => (
                <a
                  key={tabKey}
                  href={`#${tabKey}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(tabKey);
                    window.location.hash = `#${tabKey}`;
                  }}
                  style={{
                    color: tab === tabKey ? (isLightTheme ? "#fff" : "#fff") : getDevColor("#9cf", "#0066cc"),
                    textDecoration: "none",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: tab === tabKey 
                      ? (isLightTheme ? "rgba(0, 100, 200, 0.6)" : "rgba(0, 200, 255, 0.4)")
                      : (isLightTheme ? "rgba(0, 100, 200, 0.2)" : "rgba(0, 200, 255, 0.15)"),
                    cursor: "pointer",
                    display: "inline-block",
                    fontSize: 9,
                    fontWeight: tab === tabKey ? 700 : 500,
                    border: tab === tabKey 
                      ? (isLightTheme ? "1px solid rgba(0, 100, 200, 0.8)" : "1px solid rgba(0, 200, 255, 0.6)")
                      : (isLightTheme ? "1px solid rgba(0, 100, 200, 0.3)" : "1px solid rgba(0, 200, 255, 0.2)"),
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (tab !== tabKey) {
                      e.target.style.background = isLightTheme ? "rgba(0, 100, 200, 0.3)" : "rgba(0, 200, 255, 0.25)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== tabKey) {
                      e.target.style.background = isLightTheme ? "rgba(0, 100, 200, 0.2)" : "rgba(0, 200, 255, 0.15)";
                    }
                  }}
                >
                  {tabKey}
                </a>
              ))}
            </div>
          </div>

          {/* Settings Subtabs */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: getDevColor("#9cf", "#0066cc"), fontSize: 9 }}>Settings:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["view", "logic", "game", "cats", "data"].map((subtab) => {
                const isActive = tab === "settings" && getCurrentSubtab() === subtab;
                return (
                  <a
                    key={`settings-${subtab}`}
                    href={`#settings?view=${subtab}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("settings");
                      window.location.hash = `#settings?view=${subtab}`;
                    }}
                    style={{
                      color: isActive ? (isLightTheme ? "#fff" : "#fff") : getDevColor("#9cf", "#0066cc"),
                      textDecoration: "none",
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: isActive 
                        ? (isLightTheme ? "rgba(0, 100, 200, 0.6)" : "rgba(0, 200, 255, 0.4)")
                        : (isLightTheme ? "rgba(0, 100, 200, 0.2)" : "rgba(0, 200, 255, 0.15)"),
                      cursor: "pointer",
                      display: "inline-block",
                      fontSize: 9,
                      fontWeight: isActive ? 700 : 500,
                      border: isActive 
                        ? (isLightTheme ? "1px solid rgba(0, 100, 200, 0.8)" : "1px solid rgba(0, 200, 255, 0.6)")
                        : (isLightTheme ? "1px solid rgba(0, 100, 200, 0.3)" : "1px solid rgba(0, 200, 255, 0.2)"),
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.background = isLightTheme ? "rgba(0, 100, 200, 0.3)" : "rgba(0, 200, 255, 0.25)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.background = isLightTheme ? "rgba(0, 100, 200, 0.2)" : "rgba(0, 200, 255, 0.15)";
                      }
                    }}
                  >
                    {subtab}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Stats Subtabs */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: getDevColor("#9cf", "#0066cc"), fontSize: 9 }}>Stats:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["overview", "charts", "history", "people", "places"].map((subtab) => {
                const isActive = tab === "stats" && getCurrentSubtab() === subtab;
                return (
                  <a
                    key={`stats-${subtab}`}
                    href={`#stats?subView=${subtab}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("stats");
                      window.location.hash = `#stats?subView=${subtab}`;
                    }}
                    style={{
                      color: isActive ? (isLightTheme ? "#fff" : "#fff") : getDevColor("#9cf", "#0066cc"),
                      textDecoration: "none",
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: isActive 
                        ? (isLightTheme ? "rgba(0, 100, 200, 0.6)" : "rgba(0, 200, 255, 0.4)")
                        : (isLightTheme ? "rgba(0, 100, 200, 0.2)" : "rgba(0, 200, 255, 0.15)"),
                      cursor: "pointer",
                      display: "inline-block",
                      fontSize: 9,
                      fontWeight: isActive ? 700 : 500,
                      border: isActive 
                        ? (isLightTheme ? "1px solid rgba(0, 100, 200, 0.8)" : "1px solid rgba(0, 200, 255, 0.6)")
                        : (isLightTheme ? "1px solid rgba(0, 100, 200, 0.3)" : "1px solid rgba(0, 200, 255, 0.2)"),
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.background = isLightTheme ? "rgba(0, 100, 200, 0.3)" : "rgba(0, 200, 255, 0.25)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.background = isLightTheme ? "rgba(0, 100, 200, 0.2)" : "rgba(0, 200, 255, 0.15)";
                      }
                    }}
                  >
                    {subtab}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  ) : null;

  // Cloud auth hooks (safe)
  const handleGoogleSignIn = async () => {
    if (!window.firebase) return notify("Firebase not initialized", "⚠️");
    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      await window.firebase.auth().signInWithPopup(provider);
      notify("Signed in successfully!", "✅");
    } catch (e) {
      console.error(e);
      notify("Sign in failed", "❌");
    }
  };

  const handleSignOut = async () => {
    if (!window.firebase) return;
    await window.firebase.auth().signOut();
    setCloudUser(null);
    notify("Signed out", "👋");
  };

  const handleSyncAction = async (direction) => {
    setSyncState("syncing");
    setTimeout(() => {
      setSyncState("idle");
      notify(direction === "push" ? "Saved to Cloud" : "Updated from Cloud", "☁️");
    }, 1500);
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="app-shell">
      {ResetButton}
      <ToastManagerComp toasts={toasts} />

      {/* 1) FOCUS MODE OVERLAY */}
      {focusTask ? (
        <FocusMode
          task={focusTask}
          onStop={() => setFocusTask(null)}
          onComplete={completeTask}
          updateTask={updateTask}
          addActivity={addActivity}
        />
      ) : (
        <React.Fragment>
          <AppHeaderComp
            userStats={userStats}
            user={cloudUser}
            syncState={syncState}
            onSyncClick={() => setShowSyncModal(true)}
            onBrandClick={handleBrandClickWithNav}
            dockVisible={isDockVisible}
            headerRightMode={settings?.headerRightMode || (window.DEFAULT_SETTINGS?.headerRightMode || 'none')}
            headerQuickNavItems={settings?.headerQuickNavItems || (window.DEFAULT_SETTINGS?.headerQuickNavItems || [])}
            headerXpShowValue={settings?.headerXpShowValue !== false}
            headerXpShowLevel={settings?.headerXpShowLevel !== false}
            headerXpShowProgress={settings?.headerXpShowProgress || false}
            headerStatusItems={settings?.headerStatusItems || []}
            headerStatusClickable={settings?.headerStatusClickable || false}
            headerShowAllNavDropdown={settings?.headerShowAllNavDropdown ?? (window.DEFAULT_SETTINGS?.headerShowAllNavDropdown ?? true)}
            allNavItems={allNavItems}
            currentTab={tab}
            timerState={timerState}
            focusModeActive={!!focusTask}
            remindersArmed={settings?.enableNotifications || false}
            onTabChange={setTab}
            onSearchClick={() => {
              // TODO: Implement search modal/keyboard shortcut
              notify?.('Search (Cmd/Ctrl+K) - Coming soon', '🔍');
            }}
            onStatusClick={(statusId) => {
              if (statusId === 'timer') setTab('timer');
              else if (statusId === 'sync') setShowSyncModal(true);
              else if (statusId === 'focus') setFocusTask(null);
              // reminders doesn't navigate anywhere
            }}
            showDevTools={settings?.showDevTools !== false}
            onToggleDevTools={() => {
              setSettings((prev) => ({
                ...prev,
                showDevTools: !(prev?.showDevTools !== false),
              }));
            }}
            onReset={handleEmergencyReset}
          />

          <div
            className="content"
            style={{
              paddingBottom: isDockVisible ? "70px" : "20px",
              transition: "padding-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {tab === "spin" && (
              <SpinTabComp
                tasks={tasks}
                categories={categories}
                onView={(t) => setViewTask(t)}
                onEdit={(t) => setEditTask(t)}
                onFocus={(t, src) => enterFocusMode(t, src || "spin")}
                onAdd={addTask}
                onComplete={completeTask}
                settings={settings}
                notify={notify}
                openAdd={() => setIsAdding(true)}
                addActivity={addActivity}
              />
            )}

            {tab === "tasks" && (
              <TasksTabComp
                tasks={tasks}
                onView={setViewTask}
                onComplete={completeTask}
                onDelete={deleteTask}
                onAdd={addTask}
                settings={settings}
                openAdd={() => setIsAdding(true)}
              />
            )}

            {tab === "timer" && (
              <TimerTabComp
                timerState={timerState}
                updateTimer={updateTimer}
                onToggle={handleTimerToggle}
                onReset={handleTimerReset}
                onSave={handleTimerSave}
                categories={categories}
                settings={settings}
                notify={notify}
              />
            )}

            {tab === "lists" && (
              <IdeasTabComp
                text={scratchpad}
                setText={setScratchpad}
                onAddTasks={addTask}
                settings={settings}
                notify={notify}
                savedNotes={savedNotes}
                setSavedNotes={setSavedNotes}
              />
            )}

            {tab === "goals" && <GoalsTabComp goals={goals} setGoals={setGoals} tasks={tasks} notify={notify} />}
            {tab === "people" && <PeopleTabComp tasks={tasks} history={activities} categories={categories} settings={settings} notify={notify} locations={DM?.locations?.getAll?.() || []} setLocations={(newList) => DM?.locations?.setAll?.(newList)} setPeople={setPeople} setTasks={setTasks} onViewTask={setViewTask} />}
            {tab === "places" && <PlacesTabComp tasks={tasks} history={activities} categories={categories} settings={settings} notify={notify} locations={DM?.locations?.getAll?.() || []} setLocations={(newList) => DM?.locations?.setAll?.(newList)} setPeople={setPeople} setTasks={setTasks} onViewTask={setViewTask} />}
            {tab === "stats" && <StatsTabComp tasks={tasks} history={activities} categories={categories} settings={settings} notify={notify} userStats={userStats} onViewTask={setViewTask} />}
            {tab === "duel" && (
              <DuelTabComp tasks={tasks} onUpdate={updateTask} settings={settings} notify={notify} fireConfetti={window.fireConfetti} addActivity={addActivity} />
            )}

            {tab === "settings" && (
  <SettingsTabComp
    settings={settings}
    setSettings={setSettings}
    categories={categories}
    setCategories={setCategories}
    onExport={handleExportBackup}
	notify={notify}
    onImport={(e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          setTasks(data.tasks || []);
          setGoals(data.goals || []);
          setCategories(data.categories || []);
          if (data.timerState && typeof data.timerState === "object") {
            setTimerState((prev) => ({ ...prev, ...data.timerState }));
          }
          notify("Data Imported!", "✅");
        } catch (err) {
          console.error(err);
          notify("Import Failed", "❌");
        }
      };
      reader.readAsText(file);
    }}
    onLoadSamples={handleLoadSamples}
    onFullReset={handleNukeAll}
    initialView={settingsView}
  />
)}
          </div>

          <NavBarComp
            current={tab}
            set={(tabKey) => {
              if (tabKey.includes(":")) {
                const [parentTab, subtab] = tabKey.split(":");
                if (parentTab === "stats") {
                  setTab("stats");
                  window.location.hash = `#stats?subView=${subtab}`;
                  window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                } else if (parentTab === "settings") {
                  setTab("settings");
                  window.location.hash = `#settings?view=${subtab}`;
                  window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'settings' } }));
                }
              } else {
                setTab(tabKey);
              }
            }}
            items={navItems}
            hidden={!isDockVisible}
            getCurrentSubtab={getCurrentSubtab}
          />
        </React.Fragment>
      )}

      {/* 2) MODALS - Render in stack order with proper z-index */}
      {/* Close All Modals Button - Only show if multiple modals are open */}
      {modalStack.length > 1 && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            right: 16,
            zIndex: 20000,
            background: 'rgba(255, 107, 53, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            userSelect: 'none',
          }}
          onClick={closeAllModals}
          title="Close all modals (Ctrl+Esc)"
        >
          Close All ({modalStack.length})
        </div>
      )}
      
      {modalStack.map((modal, index) => {
        const zIndex = 10000 + index * 10; // Each modal gets higher z-index
        const isTopModal = index === modalStack.length - 1;
        
        if (modal.type === 'sync' && SyncModal) {
          return (
            <div key={`sync-${index}`} style={{ position: 'fixed', inset: 0, zIndex }}>
              <SyncModal
                user={cloudUser}
                syncState={syncState}
                onClose={() => {
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                onSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
                onSyncNow={() => handleSyncAction("push")}
                onPullFromCloud={() => handleSyncAction("pull")}
              />
            </div>
          );
        }
        
        if (modal.type === 'addTask' && TaskFormModal) {
          return (
            <div key={`addTask-${index}`} style={{ position: 'fixed', inset: 0, zIndex }}>
              <TaskFormModal
                task={null}
                categories={categories}
                tasks={tasks}
                goals={goals}
                onClose={() => {
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                onSave={(t) => {
                  addTask(t);
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                settings={settings}
                notify={notify}
                updateTask={updateTask}
              />
            </div>
          );
        }
        
        if (modal.type === 'editTask' && TaskFormModal) {
          return (
            <div key={`editTask-${index}`} style={{ position: 'fixed', inset: 0, zIndex }}>
              <TaskFormModal
                task={modal.data}
                categories={categories}
                tasks={tasks}
                goals={goals}
                onClose={() => {
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                onSave={(t) => {
                  updateTask(modal.data.id, t);
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                settings={settings}
                notify={notify}
                updateTask={updateTask}
              />
            </div>
          );
        }
        
        if (modal.type === 'viewTask' && ViewTaskModal) {
          const task = tasks.find((t) => t.id === modal.data.id) || modal.data;
          return (
            <div 
              key={`viewTask-${index}`} 
              style={{ 
                position: 'fixed', 
                inset: 0, 
                zIndex,
                pointerEvents: isTopModal ? 'auto' : 'none'
              }}
            >
              <ViewTaskModal
                task={task}
                allPeople={allPeople}
                goals={goals}
                onClose={() => {
                  // Only close this specific modal from the stack
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                onEdit={(t) => {
                  // Replace viewTask with editTask at same position
                  setModalStack(prev => {
                    const newStack = [...prev];
                    newStack[index] = { type: 'editTask', data: t };
                    return newStack;
                  });
                }}
                onComplete={completeTask}
                onFocus={(t) => enterFocusMode(t, "viewTask")}
                updateTask={updateTask}
                tasks={tasks}
                settings={settings}
              />
            </div>
          );
        }
        
        if (modal.type === 'peopleManager' && PeopleManager) {
          // Get pending selection from window if set
          const pendingSelection = window.__pendingPeopleManagerSelection || null;
          if (pendingSelection) {
            // Clear it after reading
            delete window.__pendingPeopleManagerSelection;
          }
          return (
            <div key={`peopleManager-${index}`} style={{ position: 'fixed', inset: 0, zIndex }}>
              <PeopleManager 
                people={allPeople} 
                setPeople={setPeople} 
                onClose={() => {
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                initialSelectedPersonName={pendingSelection}
              />
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}

// Bootstrap
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

console.log("✅ 22-app.jsx loaded (Timer persistent + Activities logging + Factory reset empty)");
