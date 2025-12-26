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
import AIChatbot from '../../src/components/chatbot/AIChatbot'
import { ModalRenderer } from '../../src/App'

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
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      countdown: 4
    };
    this.interval = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Crash caught:", error, errorInfo);

    // Store error details
    this.setState({
      error,
      errorInfo,
      countdown: 4
    });

    // Track error for debug info
    if (!window.recentErrors) window.recentErrors = [];
    window.recentErrors.push({
      type: 'ErrorBoundary',
      message: error.message || error.toString(),
      stack: error.stack,
      componentStack: errorInfo?.componentStack || '',
      time: new Date().toISOString()
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

  fallbackCopy(text, button) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      } else {
        alert('Failed to copy to clipboard. Please copy manually from the debug info above.');
      }
    } catch (err) {
      console.error('Fallback copy error:', err);
      alert('Failed to copy to clipboard. Please copy manually from the debug info above.');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, countdown } = this.state;

      return (
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center'
          }}>
            {/* Icon and Title */}
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>💥</div>
            <h1 style={{
              fontSize: '28px',
              margin: '0 0 8px 0',
              color: '#ff6b6b'
            }}>
              App Recovering
            </h1>
            <p style={{
              fontSize: '16px',
              margin: '0 0 24px 0',
              color: '#888'
            }}>
              Cleaning up data and restarting in {countdown}...
            </p>

            {/* Countdown Progress Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '32px'
            }}>
              <div style={{
                height: '100%',
                background: '#ff6b6b',
                width: `${(countdown / 4) * 100}%`,
                transition: 'width 1s linear'
              }} />
            </div>

            {/* Debug Info */}
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#ff6b6b',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Debug Information
              </div>
              <div style={{
                fontSize: '13px',
                color: '#ffcccc',
                marginBottom: '8px',
                wordBreak: 'break-word'
              }}>
                <strong>Error:</strong> {error?.toString() || 'Unknown error'}
              </div>
              {error?.stack && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{
                    cursor: 'pointer',
                    color: '#ff9999',
                    fontSize: '12px',
                    marginBottom: '4px'
                  }}>
                    Stack Trace
                  </summary>
                  <pre style={{
                    fontSize: '10px',
                    color: '#ffcccc',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '8px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    marginTop: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {error.stack}
                  </pre>
                </details>
              )}
              {errorInfo?.componentStack && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{
                    cursor: 'pointer',
                    color: '#ff9999',
                    fontSize: '12px',
                    marginBottom: '4px'
                  }}>
                    Component Stack
                  </summary>
                  <pre style={{
                    fontSize: '10px',
                    color: '#ffcccc',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '8px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    marginTop: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={(e) => {
                  const errorText = [
                    'ERROR DETAILS',
                    '=============',
                    '',
                    `Time: ${new Date().toISOString()}`,
                    `Error: ${error?.toString() || 'Unknown error'}`,
                    '',
                    'STACK TRACE:',
                    error?.stack || 'No stack trace available',
                    '',
                    'COMPONENT STACK:',
                    errorInfo?.componentStack || 'No component stack available'
                  ].join('\n');

                  // Try modern clipboard API first
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(errorText).then(() => {
                      const btn = e.target;
                      const originalText = btn.textContent;
                      btn.textContent = 'Copied!';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 2000);
                    }).catch((err) => {
                      console.error('Clipboard error:', err);
                      // Fallback to textarea method
                      this.fallbackCopy(errorText, e.target);
                    });
                  } else {
                    // Fallback for older browsers
                    this.fallbackCopy(errorText, e.target);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Copy Error Details
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch {}
                  window.location.reload();
                }}
                style={{
                  background: '#ff6b6b',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Reload Now
              </button>
            </div>
          </div>
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
  } catch (err) {
    console.warn('Failed to mark app as initialized:', err);
  }
};

const clearInitFlag = () => {
  try {
    localStorage.removeItem(TT_INIT_FLAG);
  } catch (err) {
    console.warn('Failed to clear init flag:', err);
  }
};

// Helper to get the primary tab from the URL hash (e.g., #spin or #settings?view=data -> 'settings')
const initialTab = () => {
  const primaryHash = window.location.hash.slice(1).split("?")[0].toLowerCase();
  const validTabs = ["tasks", "kanban", "calendar", "spin", "timer", "lists", "goals", "stats", "people", "places", "duel", "settings"];
  
  // Handle person routes: #person/name or #people/name -> don't switch tab, just open modal
  // (The modal will be opened by the useEffect that watches for contact permalinks)
  // We return the current tab or default to avoid switching tabs unnecessarily
  if (primaryHash.startsWith("person/") || primaryHash.startsWith("people/")) {
    // Return current tab or default, don't force switch to people tab
    const currentTab = window.location.hash.split('/')[0].replace('#', '');
    return validTabs.includes(currentTab) ? currentTab : "spin";
  }
  
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
    ai: "ai",
    game: "game",
    calendar: "calendar",
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

  // Helper to check if we're on a stats subtab
  const getCurrentSubtab = () => {
    const hash = window.location.hash;
    if (hash.includes('subView=people')) return 'people';
    if (hash.includes('subView=charts')) return 'charts';
    if (hash.includes('subView=history')) return 'history';
    if (hash.includes('subView=places')) return 'places';
    return null;
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

  try {
    const all = JSON.parse(localStorage.getItem('subCategories') || '{}');
    const existing = all[parentCat] || [];
    if (existing.includes(name)) return;

    all[parentCat] = [...existing, name];
    localStorage.setItem('subCategories', JSON.stringify(all));
    setNewSubCatByParent(p => ({ ...p, [parentCat]: "" }));
    window.dispatchEvent(new Event('categories-updated'));
  } catch (err) {
    console.error('Failed to add subcategory:', err);
    // Reset corrupted data
    localStorage.setItem('subCategories', JSON.stringify({ [parentCat]: [name] }));
    window.dispatchEvent(new Event('categories-updated'));
  }
};

const removeSubCategory = (parentCat, subName) => {
  try {
    const all = JSON.parse(localStorage.getItem('subCategories') || '{}');
    all[parentCat] = (all[parentCat] || []).filter(s => s !== subName);
    localStorage.setItem('subCategories', JSON.stringify(all));
    window.dispatchEvent(new Event('categories-updated'));
  } catch (err) {
    console.error('Failed to remove subcategory:', err);
  }
};
  // --- Global Components (loaded in other files) ---
  const TaskFormModal = window.TaskFormModal;
  const ViewTaskModal = window.ViewTaskModal;
  const ViewContactModal = window.ViewContactModal;
  if (!ViewContactModal) {
    console.warn('ViewContactModal not found on window. Check if 13-11-view-contact-modal.jsx is loaded.');
  }
  const SyncModal = window.SyncModal;
  const PeopleManager = window.PeopleManager;

  const AppHeader = window.AppHeader;
  const NavBar = window.NavBar;
  const ToastManager = window.ToastManager;

  const SpinTab = window.SpinTab;
  const TasksTab = window.TasksTab;
  const KanbanTab = window.KanbanTab;
  const CalendarTab = window.CalendarTab;
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
  const KanbanTabComp = SafeComponent(KanbanTab, "KanbanTab");
  const CalendarTabComp = SafeComponent(CalendarTab, "CalendarTab");
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
  const [settingsView, setSettingsView] = React.useState(initialSettingsView);

  // Update settingsView when hash changes (for dropdown navigation)
  React.useEffect(() => {
    const handleHashChange = () => {
      const newView = initialSettingsView();
      setSettingsView(newView);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
  
  // Export to window for use by spin winner popup and other components
  React.useEffect(() => {
    window.setShowPeopleManager = setShowPeopleManager;
    return () => {
      delete window.setShowPeopleManager;
    };
  }, [setShowPeopleManager]);
  
  const [focusTask, setFocusTask] = React.useState(null);
  const [toasts, setToasts] = React.useState([]);
  const [cloudUser, setCloudUser] = React.useState(null);
  const [syncState, setSyncState] = React.useState("idle");

  // DEV / RESET TOOLS (hooks must be declared before UI constants)
  const [resetReady, setResetReady] = React.useState(true);


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

  // Listen for open-contact event to show contact modal
  React.useEffect(() => {
    const handleOpenContact = (e) => {
      const person = e.detail?.person;
      if (person) {
        pushModal({ type: 'viewContact', data: person });
      }
    };
    window.addEventListener('open-contact', handleOpenContact);
    return () => window.removeEventListener('open-contact', handleOpenContact);
  }, [pushModal]);

  // Handle contact permalinks (#people/{id} or #person/{id}) - open contact modal
  React.useEffect(() => {
    // Skip if we're in the middle of closing a modal (prevent reopening loop)
    if (window.__closingContactModal) {
      return;
    }
    
    const checkContactPermalink = () => {
      // Skip if we're closing a modal
      if (window.__closingContactModal) {
        return;
      }
      
      const hash = window.location.hash;
      const match = hash.match(/#(?:people|person)\/([^?]+)/);
      if (match) {
        const personId = decodeURIComponent(match[1]);
        // Find the person by ID or name
        const person = allPeople.find(p => {
          if (p.id === personId) return true;
          const personName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ');
          return personName === personId || 
                 (p.firstName && p.lastName && `${p.firstName} ${p.lastName}` === personId);
        });
        if (person) {
          // Only open if not already open
          const isAlreadyOpen = modalStack.some(m => m.type === 'viewContact' && m.data?.id === person.id);
          if (!isAlreadyOpen) {
            pushModal({ type: 'viewContact', data: person });
          }
        }
      }
    };
    
    // Check on mount and hash changes
    checkContactPermalink();
    window.addEventListener('hashchange', checkContactPermalink);
    return () => window.removeEventListener('hashchange', checkContactPermalink);
  }, [allPeople, pushModal, modalStack]);

  // Theme
  React.useEffect(() => {
    const theme = settings?.theme || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    
    // Apply custom theme if it exists
    const customThemes = settings?.customThemes || {};
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
    
      // UI Element Visibility
      const uiElements = settings?.uiElements || {};
      document.documentElement.setAttribute("data-hide-progress-sliders", (!uiElements.showProgressSliders).toString());
      document.documentElement.setAttribute("data-hide-task-times", (!uiElements.showTaskTimes).toString());
      document.documentElement.setAttribute("data-hide-goal-progress", (!uiElements.showGoalProgress).toString());

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
        // Use custom theme primary color if available
        const customTheme = customThemes[theme];
      const primaryColor = customTheme?.cssVariables?.['--primary'] || colors[theme] || "#ff6b35";
      metaThemeColor.setAttribute("content", primaryColor);
    }
  }, [settings?.theme, settings?.customThemes, settings?.uiElements]);

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

  // Expose notify globally for chatbot and other components
  React.useEffect(() => {
    window.notify = notify;
    return () => {
      delete window.notify;
    };
  }, []);

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
  
  // Expose addActivity to window for use in ViewTaskModal and other components
  if (typeof window !== 'undefined') {
    window.addActivity = addActivity;
  }

  // Actions
  // Calendar sync helper
  const syncTaskToCalendar = async (task) => {
    if (!settings?.calendarSync?.autoSync) return;
    if (!window.CalendarSync?.isAuthenticated?.()) return;
    
    try {
      const event = await window.CalendarSync.syncTaskToCalendar(task, settings);
      if (event && event.id && !task.calendarEventId) {
        // Update task with calendar event ID
        setTasks((p) => p.map(t => 
          t.id === task.id ? { ...t, calendarEventId: event.id } : t
        ));
      }
    } catch (error) {
      console.warn('[CalendarSync] Failed to sync task:', error);
    }
  };

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
    
    // Sync to calendar if task has start date/time
    if (newTask.startDate && settings?.calendarSync?.autoSync) {
      setTimeout(() => syncTaskToCalendar(newTask), 500);
    }
    
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
        
        // Sync to calendar if task has start date/time and auto-sync is enabled
        if (newTask.startDate && settings?.calendarSync?.autoSync) {
          setTimeout(() => syncTaskToCalendar(newTask), 500);
        }
        
        // Atomic Goal Sync: If task has goalId, recalculate goal progress
        if (newTask.goalId && DM?.goals?.getById && DM?.goals?.update) {
          try {
            const goal = DM.goals.getById(newTask.goalId);
            if (goal && goal.id) {
              const allTasksForGoal = updated.filter(t => t.goalId === goal.id);
              const completedTasksCount = allTasksForGoal.filter(t => t.completed).length;
              const totalTasksForGoal = allTasksForGoal.length;
              const percentComplete = totalTasksForGoal > 0 
                ? Math.round((completedTasksCount / totalTasksForGoal) * 100) 
                : 0;
              
              // Update goal in the same execution block
              DM.goals.update(goal.id, { percentComplete });
            }
          } catch (e) {
            console.error("Error syncing goal progress:", e);
          }
        }
      }
      
      return updated;
    });
  };

  const deleteTask = (id) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks((p) => p.filter((t) => t.id !== id));
    
    // Delete from calendar if synced
    if (taskToDelete?.calendarEventId && settings?.calendarSync?.autoSync && window.CalendarSync?.isAuthenticated?.()) {
      setTimeout(async () => {
        try {
          await window.CalendarSync.deleteTaskFromCalendar(taskToDelete, settings);
        } catch (error) {
          console.warn('[CalendarSync] Failed to delete calendar event:', error);
        }
      }, 500);
    }
    
    notify("Task Deleted", "🗑️");
  };

  const completeTask = (id) => {
    setTasks((p) => {
      const updated = p.map((t) => {
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
      });
      
      // Atomic Goal Sync: If completed task has goalId, recalculate goal progress
      const completedTask = updated.find(t => t.id === id);
      if (completedTask?.goalId && DM?.goals?.getById && DM?.goals?.update) {
        try {
          const goal = DM.goals.getById(completedTask.goalId);
          if (goal && goal.id) {
            const allTasksForGoal = updated.filter(t => t.goalId === goal.id);
            const completedTasksCount = allTasksForGoal.filter(t => t.completed).length;
            const totalTasksForGoal = allTasksForGoal.length;
            const percentComplete = totalTasksForGoal > 0 
              ? Math.round((completedTasksCount / totalTasksForGoal) * 100) 
              : 0;
            
            // Update goal in the same execution block
            DM.goals.update(goal.id, { percentComplete });
          }
        } catch (e) {
          console.error("Error syncing goal progress:", e);
        }
      }
      
      return updated;
    });
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

    // Sample People - COMPREHENSIVE with ALL fields filled and special tags demonstrated
    const samplePeople = [
      { 
        id: 'p1', firstName: 'Alice', lastName: 'Client', name: 'Alice Client', 
        type: 'client', phone: '(555) 234-5678', email: 'alice.client@premiumhomes.com', 
        company: 'Premium Homes LLC', jobTitle: 'Real Estate Buyer', 
        address: '1234 Maple Drive', city: 'San Francisco', state: 'CA', zipCode: '94102', country: 'USA',
        website: 'https://aliceclient.com', linkedin: 'https://linkedin.com/in/aliceclient', twitter: '@aliceclient',
        profilePicture: '👩‍💼', profilePictureType: 'emoji',
        notes: 'VIP client looking for 3bd/2ba in downtown area. Budget: $500k-$600k. Prefers modern kitchens and good schools nearby. Very responsive to emails. Prefers morning meetings.', 
        links: ['https://compass.com/alice', 'https://aliceclient.com/portfolio'], 
        compassCrmLink: 'https://compass.com/crm/clients/alice-client-12345', 
        externalId: '61f31f78a1b2c3d4e5f6a7b8', 
        tags: ['vip', 'buyer', 'premium', 'responsive', 'morning-person', 'family-oriented'], 
        weight: 15, locationIds: ['loc1', 'loc2'], 
        isFavorite: true, lastContactDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], 
        groups: ['VIP Clients', 'Active Buyers'], relationships: ['p11'], 
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      { 
        id: 'p2', firstName: 'Bob', lastName: 'Vendor', name: 'Bob Vendor', 
        type: 'vendor', phone: '(555) 345-6789', email: 'bob.vendor@plumbpro.com', 
        company: 'PlumbPro Services', jobTitle: 'Master Plumber', 
        address: '567 Industrial Blvd', city: 'Oakland', state: 'CA', zipCode: '94601', country: 'USA',
        website: 'https://plumbpro.com', linkedin: 'https://linkedin.com/in/bobvendor', twitter: '@bobplumber',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Licensed plumber with 15 years experience. Available weekends and evenings. Specializes in residential and commercial. Emergency service available. Licensed #CA-12345.', 
        links: ['https://plumbpro.com/reviews'], 
        compassCrmLink: '', 
        tags: ['contractor', 'plumbing', 'licensed', 'emergency', 'weekend-available', 'reliable'], 
        weight: 8, locationIds: ['loc7'], 
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      { 
        id: 'p3', firstName: 'Charlie', lastName: 'Lead', name: 'Charlie Lead', 
        type: 'lead', phone: '(555) 456-7890', email: 'charlie.lead@investor.com', 
        company: 'Capital Investments Group', jobTitle: 'Investment Manager', 
        address: '890 Financial District', city: 'San Francisco', state: 'CA', zipCode: '94104', country: 'USA',
        website: 'https://capitalinvestments.com', linkedin: 'https://linkedin.com/in/charlielead', twitter: '@charlieinvests',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Interested in investment properties. Looking for multi-unit buildings and fixer-uppers. Cash buyer, quick closings. Prefers properties in up-and-coming neighborhoods. Follow up scheduled.', 
        links: ['https://capitalinvestments.com/portfolio'], 
        compassCrmLink: 'https://compass.com/crm/leads/charlie-lead-67890', 
        tags: ['investor', 'lead', 'cash-buyer', 'multi-unit', 'fixer-upper', 'hot-lead', 'quick-close'], 
        weight: 12, locationIds: [], 
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      { 
        id: 'p4', firstName: 'Diana', lastName: 'Partner', name: 'Diana Partner', 
        type: 'partner', phone: '(555) 567-8901', email: 'diana.partner@commercialre.com', 
        company: 'Commercial Real Estate Partners', jobTitle: 'Senior Partner', 
        address: '123 Business Plaza, Suite 500', city: 'San Francisco', state: 'CA', zipCode: '94105', country: 'USA',
        website: 'https://commercialre.com', linkedin: 'https://linkedin.com/in/dianapartner', twitter: '@dianacommercial',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Real estate partner specializing in commercial properties. Handles office buildings, retail spaces, and warehouses. Excellent network and connections. 20+ years experience. Prefers video calls.', 
        links: ['https://linkedin.com/diana', 'https://commercialre.com/about'], 
        compassCrmLink: 'https://compass.com/partners/diana-partner', 
        tags: ['partner', 'commercial', 'office', 'retail', 'warehouse', 'experienced', 'network'], 
        weight: 20, locationIds: ['loc1'], 
        isFavorite: true, 
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      { 
        id: 'p5', firstName: 'Eve', lastName: 'Contractor', name: 'Eve Contractor', 
        type: 'vendor', phone: '(555) 678-9012', email: 'eve.contractor@buildright.com', 
        company: 'BuildRight Construction', jobTitle: 'General Contractor', 
        address: '234 Construction Way', city: 'Berkeley', state: 'CA', zipCode: '94704', country: 'USA',
        website: 'https://buildright.com', linkedin: 'https://linkedin.com/in/evecontractor', twitter: '@evebuilds',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'General contractor specializing in renovations and remodels. Licensed and insured. Excellent quality work. Available for projects $50k+. References available. Eco-friendly options.', 
        links: ['https://buildright.com/projects', 'https://buildright.com/reviews'], 
        compassCrmLink: '', 
        tags: ['contractor', 'renovation', 'remodel', 'licensed', 'insured', 'eco-friendly', 'quality'], 
        weight: 10, locationIds: ['loc7'], 
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 7 * 86400000).toISOString()
      },
      { 
        id: 'p6', firstName: 'Frank', lastName: 'Investor', name: 'Frank Investor', 
        type: 'client', phone: '(555) 789-0123', email: 'frank.investor@wealthmgmt.com', 
        company: 'Wealth Management Group', jobTitle: 'Real Estate Investor', 
        address: '456 Investment Tower', city: 'San Francisco', state: 'CA', zipCode: '94111', country: 'USA',
        website: 'https://wealthmgmt.com', linkedin: 'https://linkedin.com/in/frankinvestor', twitter: '@frankinvests',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Looking for rental properties, cash buyer. Focuses on properties with good ROI potential. Prefers properties in good school districts. Quick decision maker. Portfolio of 15+ properties.', 
        links: ['https://wealthmgmt.com/real-estate'], 
        compassCrmLink: 'https://compass.com/crm/clients/frank-investor', 
        tags: ['investor', 'cash-buyer', 'rental', 'roi', 'portfolio', 'quick-decision', 'experienced'], 
        weight: 18, locationIds: ['loc5'], 
        isFavorite: true, 
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      { 
        id: 'p7', firstName: 'Grace', lastName: 'Designer', name: 'Grace Designer', 
        type: 'vendor', phone: '(555) 890-1234', email: 'grace.designer@interiorsbygrace.com', 
        company: 'Interiors by Grace', jobTitle: 'Interior Designer', 
        address: '789 Design Studio', city: 'San Francisco', state: 'CA', zipCode: '94103', country: 'USA',
        website: 'https://interiorsbygrace.com', linkedin: 'https://linkedin.com/in/gracedesigner', twitter: '@gracedesigns',
        profilePicture: '🎨', profilePictureType: 'emoji',
        notes: 'Interior designer available for staging. Specializes in modern and contemporary styles. Can work within budget. Portfolio includes luxury homes. Available for consultations.', 
        links: ['https://interiorsbygrace.com/portfolio'], 
        compassCrmLink: '', 
        tags: ['designer', 'staging', 'modern', 'contemporary', 'luxury', 'budget-friendly', 'consultation'], 
        weight: 9, locationIds: ['loc2'], 
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      { 
        id: 'p8', firstName: 'Henry', lastName: 'Lawyer', name: 'Henry Lawyer', 
        type: 'vendor', phone: '(555) 901-2345', email: 'henry.lawyer@realestatelaw.com', 
        company: 'Real Estate Law Associates', jobTitle: 'Real Estate Attorney', 
        address: '321 Legal Plaza, Suite 200', city: 'San Francisco', state: 'CA', zipCode: '94108', country: 'USA',
        website: 'https://realestatelaw.com', linkedin: 'https://linkedin.com/in/henrylawyer', twitter: '@henrylaw',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Real estate attorney, handles closings, contracts, and disputes. 25+ years experience. Bar #CA-98765. Available for consultations. Specializes in residential and commercial transactions.', 
        links: ['https://realestatelaw.com/services'], 
        compassCrmLink: '', 
        tags: ['attorney', 'legal', 'closings', 'contracts', 'disputes', 'experienced', 'consultation'], 
        weight: 12, locationIds: ['loc1', 'loc8'], 
        createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 86400000).toISOString()
      },
      { 
        id: 'p9', firstName: 'Iris', lastName: 'Inspector', name: 'Iris Inspector', 
        type: 'vendor', phone: '(555) 012-3456', email: 'iris.inspector@certifiedinspect.com', 
        company: 'Certified Home Inspections', jobTitle: 'Certified Home Inspector', 
        address: '654 Inspection Lane', city: 'San Mateo', state: 'CA', zipCode: '94401', country: 'USA',
        website: 'https://certifiedinspect.com', linkedin: 'https://linkedin.com/in/irisinspector', twitter: '@irisinspects',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Home inspector, certified and reliable. ASHI certified. Detailed reports within 24 hours. Available for pre-purchase and pre-listing inspections. Drone inspections available.', 
        links: ['https://certifiedinspect.com/services'], 
        compassCrmLink: '', 
        tags: ['inspector', 'certified', 'ashi', 'detailed-reports', 'drone', 'reliable', 'quick-turnaround'], 
        weight: 10, locationIds: ['loc5', 'loc6'], 
        createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      { 
        id: 'p10', firstName: 'Jack', lastName: 'Lender', name: 'Jack Lender', 
        type: 'vendor', phone: '(555) 123-4567', email: 'jack.lender@mortgagepro.com', 
        company: 'Mortgage Pro Financial', jobTitle: 'Senior Mortgage Broker', 
        address: '987 Finance Center', city: 'San Francisco', state: 'CA', zipCode: '94109', country: 'USA',
        website: 'https://mortgagepro.com', linkedin: 'https://linkedin.com/in/jacklender', twitter: '@jacklends',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'Mortgage broker with competitive rates. Specializes in conventional, FHA, and VA loans. Can close in 30 days. Pre-approval available. Licensed in CA, OR, WA. NMLS #123456.', 
        links: ['https://mortgagepro.com/rates'], 
        compassCrmLink: '', 
        tags: ['lender', 'mortgage', 'competitive-rates', 'fha', 'va', 'conventional', 'quick-close', 'pre-approval'], 
        weight: 11, locationIds: ['loc1'], 
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      { 
        id: 'p11', firstName: 'Karen', lastName: 'Client', name: 'Karen Client', 
        type: 'client', phone: '(555) 234-5678', email: 'karen.client@email.com', 
        company: '', jobTitle: 'Marketing Manager', 
        address: '111 First Time Buyer St', city: 'Oakland', state: 'CA', zipCode: '94607', country: 'USA',
        website: '', linkedin: 'https://linkedin.com/in/karenclient', twitter: '',
        profilePicture: '', profilePictureType: 'initials',
        notes: 'First-time homebuyer, needs guidance through the process. Budget: $400k-$450k. Looking for 2bd/1ba starter home. Prefers quiet neighborhoods. Has pre-approval letter. Referred by Alice Client.', 
        links: [], 
        compassCrmLink: 'https://compass.com/crm/clients/karen-client', 
        tags: ['first-time-buyer', 'starter-home', 'needs-guidance', 'pre-approved', 'referred'], 
        weight: 14, locationIds: ['loc1'], 
        relationships: ['p1'], 
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      { 
        id: 'p12', firstName: 'Larry', lastName: 'Photographer', name: 'Larry Photographer', 
        type: 'vendor', phone: '(555) 345-6789', email: 'larry.photographer@realestatephotos.com', 
        company: 'Real Estate Photography Pro', jobTitle: 'Professional Photographer', 
        address: '222 Photo Studio', city: 'San Francisco', state: 'CA', zipCode: '94110', country: 'USA',
        website: 'https://realestatephotos.com', linkedin: 'https://linkedin.com/in/larryphotographer', twitter: '@larryphotos',
        profilePicture: '📸', profilePictureType: 'emoji',
        notes: 'Real estate photographer, drone shots available. Specializes in luxury homes. 3D virtual tours available. Quick turnaround (24-48 hours). Professional editing included. Portfolio available.', 
        links: ['https://realestatephotos.com/portfolio'], 
        compassCrmLink: '', 
        tags: ['photographer', 'drone', 'luxury', '3d-tours', 'quick-turnaround', 'professional', 'editing'], 
        weight: 7, locationIds: ['loc5', 'loc6'], 
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
      }
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
      // Completed tasks - ALL FIELDS FILLED
      { 
        id: 't1', title: 'Call Alice re: Offer', 
        description: 'Follow up call with Alice Client regarding the offer on the downtown property. Need to discuss counter-offer strategy and timeline. She mentioned being flexible on closing date.',
        category: 'Real Estate', subtype: 'Lead Gen', priority: 'High', 
        estimatedTime: 15, estimatedTimeUnit: 'min', 
        startDate: yesterday, startTime: '09:00', dueDate: yesterday, dueTime: '09:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: ['Alice Client'], location: 'Downtown Office', locationIds: ['loc1'], 
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        completed: true, createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), 
        completedAt: new Date(now.getTime() - 4 * 86400000).toISOString(), 
        tags: ['urgent', 'client', 'offer', 'phone-call', 'follow-up', 'high-priority'], 
        weight: 15, actualTime: 12, percentComplete: 100, 
        subtasks: [{id: 'st1', title: 'Review offer details', completed: true}, {id: 'st2', title: 'Prepare counter-offer points', completed: true}],
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Alice was very receptive. Discussed counter-offer at $525k. She wants to move quickly.'
      },
      { 
        id: 't2', title: 'Morning Run', 
        description: 'Daily morning run for fitness and mental clarity. Route: 3 miles through the park. Track time and distance.',
        category: 'Health', subtype: 'Cardio', priority: 'Low', 
        estimatedTime: 30, estimatedTimeUnit: 'min', 
        startDate: today, startTime: '06:30', dueDate: today, dueTime: '07:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 0, reminderOffsetUnit: 'minutes',
        people: [], location: 'Gym', locationIds: ['loc4'], 
        locationCoords: { lat: 37.7549, lon: -122.4394 },
        completed: true, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), 
        completedAt: new Date(now.getTime() - 1 * 86400000).toISOString(), 
        tags: ['health', 'routine', 'exercise', 'cardio', 'morning', 'fitness'], 
        weight: 5, actualTime: 28, percentComplete: 100, 
        recurring: 'Daily', goalId: 'g6', blockedBy: [], excludeFromTumbler: false,
        notes: 'Great run today! Felt strong and energized.'
      },
      { 
        id: 't3', title: 'Team Meeting Prep', 
        description: 'Prepare agenda and talking points for quarterly team meeting with Diana Partner. Review Q4 performance metrics and discuss Q1 goals.',
        category: 'Work', subtype: 'Meetings', priority: 'High', 
        estimatedTime: 30, estimatedTimeUnit: 'min', 
        startDate: yesterday, startTime: '14:00', dueDate: yesterday, dueTime: '14:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 30, reminderOffsetUnit: 'minutes',
        people: ['Diana Partner'], location: 'Downtown Office', locationIds: ['loc1'], 
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        completed: true, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), 
        completedAt: new Date(now.getTime() - 2 * 86400000).toISOString(), 
        tags: ['work', 'meeting', 'team', 'preparation', 'quarterly', 'important'], 
        weight: 12, actualTime: 25, percentComplete: 100, 
        subtasks: [{id: 'st3', title: 'Review agenda', completed: true}, {id: 'st4', title: 'Prepare talking points', completed: true}],
        goalId: 'g2', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Meeting went well. Diana approved Q1 budget increase.'
      },
      { 
        id: 't4', title: 'Grocery Shopping', 
        description: 'Weekly grocery shopping trip. Need to buy ingredients for meal prep and household essentials. Check pantry first.',
        category: 'Personal', subtype: 'Shopping', priority: 'Medium', 
        estimatedTime: 45, estimatedTimeUnit: 'min', 
        startDate: yesterday, startTime: '16:00', dueDate: yesterday, dueTime: '16:45',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: true, createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(), 
        completedAt: new Date(now.getTime() - 3 * 86400000).toISOString(), 
        tags: ['errands', 'shopping', 'groceries', 'weekly', 'household'], 
        weight: 6, actualTime: 50, percentComplete: 100, 
        recurring: 'Weekly', subtasks: [{id: 'st5', title: 'Make shopping list', completed: true}, {id: 'st6', title: 'Buy groceries', completed: true}],
        goalId: null, blockedBy: [], excludeFromTumbler: false,
        notes: 'Got everything on the list. Spent $125. Remember to check for coupons next time.'
      },
      { 
        id: 't5', title: 'Update Listing Photos', 
        description: 'Coordinate with Grace Designer and Larry Photographer to update photos for Client Home listing. Need new staging photos and drone shots.',
        category: 'Real Estate', subtype: 'Admin', priority: 'Medium', 
        estimatedTime: 45, estimatedTimeUnit: 'min', 
        startDate: new Date(now.getTime() - 6 * 86400000).toISOString().split('T')[0], startTime: '10:00', 
        dueDate: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0], dueTime: '11:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 1, reminderOffsetUnit: 'hours',
        people: ['Grace Designer', 'Larry Photographer'], location: 'Client Home', locationIds: ['loc2'], 
        locationCoords: { lat: 37.7849, lon: -122.4094 },
        completed: true, createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(), 
        completedAt: new Date(now.getTime() - 5 * 86400000).toISOString(), 
        tags: ['marketing', 'photos', 'listing', 'staging', 'drone', 'mls'], 
        weight: 10, actualTime: 40, percentComplete: 100, 
        subtasks: [{id: 'st7', title: 'Schedule photographer', completed: true}, {id: 'st8', title: 'Review photos', completed: true}, {id: 'st9', title: 'Upload to MLS', completed: true}],
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Photos look great! New staging really makes the space pop. Uploaded to MLS successfully.'
      },
      
      // In-progress tasks - ALL FIELDS FILLED
      { 
        id: 't6', title: 'Prepare Q4 Taxes', 
        description: 'Gather all receipts, organize documents, and fill out tax forms for Q4. Need to review deductions and ensure accuracy before filing.',
        category: 'Finance', subtype: 'Taxes', priority: 'Urgent', 
        estimatedTime: 60, estimatedTimeUnit: 'min', 
        startDate: today, startTime: '13:00', dueDate: tomorrow, dueTime: '17:00',
        reminderMode: 'notification', reminderAnchor: 'due', reminderOffsetValue: 2, reminderOffsetUnit: 'hours',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(), 
        tags: ['finance', 'important', 'taxes', 'urgent', 'q4', 'filing', 'deductions'], 
        weight: 20, percentComplete: 65, actualTime: 39, 
        subtasks: [{id: 'st10', title: 'Gather receipts', completed: true}, {id: 'st11', title: 'Organize documents', completed: true}, {id: 'st12', title: 'Fill out tax forms', completed: false}],
        goalId: null, blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Most receipts gathered. Need to organize by category. Forms partially filled out.'
      },
      { 
        id: 't7', title: 'Complete Online Course Module 3', 
        description: 'Finish Module 3 of the Real Estate Investment course. Watch remaining video lectures and complete all exercises and quizzes.',
        category: 'Learning', subtype: 'Courses', priority: 'Low', 
        estimatedTime: 90, estimatedTimeUnit: 'min', 
        startDate: today, startTime: '19:00', dueDate: tomorrow, dueTime: '20:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(), 
        tags: ['learning', 'education', 'course', 'online', 'real-estate', 'investment'], 
        weight: 7, percentComplete: 75, actualTime: 68, 
        subtasks: [{id: 'st13', title: 'Watch video lectures', completed: true}, {id: 'st14', title: 'Complete exercises', completed: false}],
        goalId: 'g7', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Videos are very informative. Need to complete practice exercises to reinforce concepts.'
      },
      { 
        id: 't8', title: 'Write Blog Post on Market Trends', 
        description: 'Research current market trends and write a comprehensive blog post analyzing Q4 real estate market data. Include charts and actionable insights for readers.',
        category: 'Work', subtype: 'Deep Work', priority: 'Medium', 
        estimatedTime: 90, estimatedTimeUnit: 'min', 
        startDate: today, startTime: '10:00', dueDate: tomorrow, dueTime: '12:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 30, reminderOffsetUnit: 'minutes',
        people: [], location: 'Coffee Shop', locationIds: ['loc3'], 
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        completed: false, createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), 
        tags: ['writing', 'content', 'blog', 'market-trends', 'research', 'seo', 'marketing'], 
        weight: 10, percentComplete: 40, actualTime: 36, 
        subtasks: [{id: 'st15', title: 'Research market data', completed: true}, {id: 'st16', title: 'Write draft', completed: false}, {id: 'st17', title: 'Edit and publish', completed: false}],
        goalId: 'g2', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Data research complete. Need to write first draft. Coffee shop is perfect for focused writing.'
      },
      { 
        id: 't9', title: 'Kitchen Renovation Planning', 
        description: 'Plan kitchen renovation project. Get quotes from contractors, choose materials, and schedule timeline. Budget: $25k. Coordinate with Eve Contractor and Grace Designer.',
        category: 'Home Project', subtype: 'Renovation', priority: 'High', 
        estimatedTime: 120, estimatedTimeUnit: 'min', 
        startDate: nextWeek, startTime: '09:00', dueDate: nextWeek, dueTime: '11:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 1, reminderOffsetUnit: 'hours',
        people: ['Eve Contractor', 'Grace Designer'], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(), 
        tags: ['home', 'project', 'renovation', 'kitchen', 'contractor', 'designer', 'planning'], 
        weight: 18, percentComplete: 30, 
        subtasks: [{id: 'st18', title: 'Get quotes from contractors', completed: false}, {id: 'st19', title: 'Choose materials', completed: false}, {id: 'st20', title: 'Schedule timeline', completed: false}], 
        actualTime: 36, goalId: 'g4', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Initial consultation scheduled. Need to finalize design preferences before getting quotes.'
      },
      
      // Overdue tasks - ALL FIELDS FILLED
      { 
        id: 't10', title: 'Review Investment Portfolio', 
        description: 'Review investment portfolio performance with Frank Investor. Analyze returns, adjust allocations if needed, and discuss new opportunities.',
        category: 'Finance', subtype: 'Investments', priority: 'Medium', 
        estimatedTime: 45, estimatedTimeUnit: 'min', 
        startDate: lastWeek, startTime: '15:00', dueDate: lastWeek, dueTime: '15:45',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 1, reminderOffsetUnit: 'hours',
        people: ['Frank Investor'], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 15 * 86400000).toISOString(), 
        tags: ['finance', 'investment', 'portfolio', 'review', 'overdue', 'important'], 
        weight: 8, percentComplete: 0, 
        subtasks: [{id: 'st21', title: 'Review performance', completed: false}, {id: 'st22', title: 'Adjust allocations', completed: false}],
        goalId: null, blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Need to reschedule with Frank. Portfolio is performing well but should review quarterly.'
      },
      { 
        id: 't11', title: 'Follow up with Charlie Lead', 
        description: 'Follow up call with Charlie Lead regarding investment property interest. He mentioned looking at multi-unit buildings. Prepare property recommendations.',
        category: 'Real Estate', subtype: 'Follow-ups', priority: 'High', 
        estimatedTime: 20, estimatedTimeUnit: 'min', 
        startDate: twoWeeksAgo, startTime: '11:00', dueDate: twoWeeksAgo, dueTime: '11:20',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 30, reminderOffsetUnit: 'minutes',
        people: ['Charlie Lead'], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 12 * 86400000).toISOString(), 
        tags: ['lead', 'urgent', 'follow-up', 'hot-lead', 'investor', 'phone-call', 'overdue'], 
        weight: 15, percentComplete: 0, 
        subtasks: [{id: 'st43', title: 'Review last conversation notes', completed: false}, {id: 'st44', title: 'Prepare follow-up questions', completed: false}],
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Hot lead - need to follow up ASAP. Charlie is cash buyer looking for quick deals.'
      },
      { 
        id: 't12', title: 'Schedule Property Inspection', 
        description: 'Schedule property inspection for Property A with Iris Inspector. Need to coordinate with seller and buyer. Inspection should include structural, electrical, and plumbing.',
        category: 'Real Estate', subtype: 'Inspections', priority: 'High', 
        estimatedTime: 30, estimatedTimeUnit: 'min', 
        startDate: yesterday, startTime: '10:00', dueDate: yesterday, dueTime: '10:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 1, reminderOffsetUnit: 'hours',
        people: ['Iris Inspector'], location: 'Property A', locationIds: ['loc5'], 
        locationCoords: { lat: 37.7949, lon: -122.3994 },
        completed: false, createdAt: new Date(now.getTime() - 9 * 86400000).toISOString(), 
        tags: ['inspection', 'property', 'urgent', 'overdue', 'coordination'], 
        weight: 12, percentComplete: 0,
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Need to reschedule. Iris is booked this week. Try for next week.'
      },
      
      // Upcoming tasks - ALL FIELDS FILLED
      { 
        id: 't13', title: 'Client Meeting with Karen', 
        description: 'Initial consultation meeting with Karen Client, first-time homebuyer. Review her preferences, budget, and timeline. Prepare property listings that match her criteria.',
        category: 'Real Estate', subtype: 'Client Calls', priority: 'High', 
        estimatedTime: 60, estimatedTimeUnit: 'min', 
        startDate: tomorrow, startTime: '10:00', dueDate: tomorrow, dueTime: '11:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 30, reminderOffsetUnit: 'minutes',
        people: ['Karen Client'], location: 'Downtown Office', locationIds: ['loc1'], 
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        completed: false, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), 
        tags: ['client', 'meeting', 'consultation', 'first-time-buyer', 'important', 'in-person'], 
        weight: 18, percentComplete: 0, 
        subtasks: [{id: 'st23', title: 'Prepare property listings', completed: false}, {id: 'st24', title: 'Review client preferences', completed: false}],
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Karen is referred by Alice Client. Budget: $400k-$450k. Looking for 2bd/1ba starter home.'
      },
      { 
        id: 't14', title: 'Property Showing - Property B', 
        description: 'Property showing for Property B with Alice Client. Tour the property, answer questions, and discuss next steps. Property is under contract but showing for backup offers.',
        category: 'Real Estate', subtype: 'Showings', priority: 'High', 
        estimatedTime: 45, estimatedTimeUnit: 'min', 
        startDate: nextWeek, startTime: '14:00', dueDate: nextWeek, dueTime: '14:45',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 1, reminderOffsetUnit: 'hours',
        people: ['Alice Client'], location: 'Property B', locationIds: ['loc6'], 
        locationCoords: { lat: 37.8049, lon: -122.3894 },
        completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), 
        tags: ['showing', 'property', 'client', 'backup-offer', 'important'], 
        weight: 15, percentComplete: 0, 
        subtasks: [{id: 'st25', title: 'Prepare property info', completed: false}, {id: 'st26', title: 'Confirm appointment', completed: false}],
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Property is beautiful. Alice might be interested as backup offer. Need to prepare comps.'
      },
      { 
        id: 't15', title: 'Yoga Session', 
        description: 'Weekly yoga session for flexibility and stress relief. Focus on hip openers and back stretches. Bring mat and water bottle.',
        category: 'Health', subtype: 'Yoga', priority: 'Low', 
        estimatedTime: 60, estimatedTimeUnit: 'min', 
        startDate: tomorrow, startTime: '18:00', dueDate: tomorrow, dueTime: '19:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: [], location: 'Gym', locationIds: ['loc4'], 
        locationCoords: { lat: 37.7549, lon: -122.4394 },
        completed: false, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), 
        tags: ['health', 'wellness', 'yoga', 'flexibility', 'stress-relief', 'weekly'], 
        weight: 5, percentComplete: 0, 
        recurring: 'Weekly', goalId: null, blockedBy: [], excludeFromTumbler: false,
        notes: 'Yoga helps with work stress. Try to make this a consistent weekly habit.'
      },
      { 
        id: 't16', title: 'Read Chapter 5 of Real Estate Book', 
        description: 'Read Chapter 5: "Commercial Property Analysis" from the Real Estate Investment Strategies book. Take notes on key concepts and examples.',
        category: 'Learning', subtype: 'Reading', priority: 'Low', 
        estimatedTime: 30, estimatedTimeUnit: 'min', 
        startDate: tomorrow, startTime: '08:00', dueDate: tomorrow, dueTime: '08:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 0, reminderOffsetUnit: 'minutes',
        people: [], location: 'Coffee Shop', locationIds: ['loc3'], 
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        completed: false, createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(), 
        tags: ['reading', 'learning', 'book', 'commercial', 'investment', 'education'], 
        weight: 6, percentComplete: 0,
        goalId: 'g5', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Chapter 4 was very informative. Looking forward to commercial property analysis.'
      },
      { 
        id: 't17', title: 'Pay Monthly Bills', 
        description: 'Review and pay all monthly bills: utilities, credit cards, subscriptions. Set up autopay where possible. Track expenses in budget spreadsheet.',
        category: 'Finance', subtype: 'Bills', priority: 'Medium', 
        estimatedTime: 15, estimatedTimeUnit: 'min', 
        startDate: nextWeek, startTime: '09:00', dueDate: nextWeek, dueTime: '09:15',
        reminderMode: 'notification', reminderAnchor: 'due', reminderOffsetValue: 1, reminderOffsetUnit: 'days',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), 
        tags: ['bills', 'finance', 'monthly', 'utilities', 'budget', 'autopay'], 
        weight: 8, percentComplete: 0, 
        recurring: 'Monthly', subtasks: [{id: 'st27', title: 'Review bills', completed: false}, {id: 'st28', title: 'Pay online', completed: false}],
        goalId: null, blockedBy: [], excludeFromTumbler: false,
        notes: 'Total bills this month: $1,245. Consider canceling unused subscriptions.'
      },
      { 
        id: 't18', title: 'Organize Home Office', 
        description: 'Deep clean and organize home office space. Sort papers, organize files, clean desk, and set up better filing system. Make it a productive workspace.',
        category: 'Home Project', subtype: 'Organization', priority: 'Low', 
        estimatedTime: 120, estimatedTimeUnit: 'min', 
        startDate: nextWeek, startTime: '10:00', dueDate: nextWeek, dueTime: '12:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 30, reminderOffsetUnit: 'minutes',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(), 
        tags: ['organization', 'home', 'office', 'cleaning', 'productivity', 'declutter'], 
        weight: 7, percentComplete: 0, 
        subtasks: [{id: 'st29', title: 'Sort papers', completed: false}, {id: 'st30', title: 'Organize files', completed: false}, {id: 'st31', title: 'Clean desk', completed: false}],
        goalId: null, blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Office is getting cluttered. Need a better filing system. Consider buying new organizers.'
      },
      { 
        id: 't19', title: 'Update CRM with New Leads', 
        description: 'Add new leads to CRM system, including Charlie Lead and other recent inquiries. Update contact information, notes, and tags. Set follow-up reminders.',
        category: 'Work', subtype: 'Admin', priority: 'Medium', 
        estimatedTime: 30, estimatedTimeUnit: 'min', 
        startDate: tomorrow, startTime: '16:00', dueDate: tomorrow, dueTime: '16:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: ['Charlie Lead'], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), 
        tags: ['admin', 'crm', 'leads', 'data-entry', 'follow-up', 'organization'], 
        weight: 8, percentComplete: 0,
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Several new leads from website. Need to prioritize and set follow-up schedule.'
      },
      { 
        id: 't20', title: 'Plan Weekend Trip', 
        description: 'Plan weekend getaway trip. Research destinations, book accommodations, and create itinerary. Budget: $500. Looking for relaxing beach or mountain destination.',
        category: 'Fun', subtype: 'Travel', priority: 'Low', 
        estimatedTime: 60, estimatedTimeUnit: 'min', 
        startDate: nextWeek, startTime: '20:00', dueDate: nextWeek, dueTime: '21:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 0, reminderOffsetUnit: 'minutes',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), 
        tags: ['travel', 'fun', 'weekend', 'vacation', 'planning', 'relaxation'], 
        weight: 5, percentComplete: 0, 
        subtasks: [{id: 'st32', title: 'Research destinations', completed: false}, {id: 'st33', title: 'Book accommodations', completed: false}],
        goalId: null, blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Need a break from work. Considering Napa Valley or Big Sur. Check weather forecast.'
      },
      { 
        id: 't21', title: 'Strength Training', 
        description: 'Weekly strength training session at the gym. Focus on upper body: chest, back, and shoulders. 3 sets of 8-10 reps per exercise.',
        category: 'Health', subtype: 'Strength', priority: 'Low', 
        estimatedTime: 45, estimatedTimeUnit: 'min', 
        startDate: tomorrow, startTime: '07:00', dueDate: tomorrow, dueTime: '07:45',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: [], location: 'Gym', locationIds: ['loc4'], 
        locationCoords: { lat: 37.7549, lon: -122.4394 },
        completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), 
        tags: ['health', 'fitness', 'strength', 'gym', 'upper-body', 'weekly'], 
        weight: 6, percentComplete: 0, 
        recurring: 'Weekly', goalId: null, blockedBy: [], excludeFromTumbler: false,
        notes: 'Alternating with cardio. Building strength helps with overall fitness.'
      },
      { 
        id: 't22', title: 'Review Contract Terms with Henry', 
        description: 'Review contract terms for Property A with Henry Lawyer. Discuss clauses, contingencies, and closing timeline. Prepare list of questions before meeting.',
        category: 'Real Estate', subtype: 'Contracts', priority: 'Urgent', 
        estimatedTime: 45, estimatedTimeUnit: 'min', 
        startDate: today, startTime: '15:00', dueDate: today, dueTime: '15:45',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 30, reminderOffsetUnit: 'minutes',
        people: ['Henry Lawyer'], location: 'Downtown Office', locationIds: ['loc1'], 
        locationCoords: { lat: 37.7749, lon: -122.4194 },
        completed: false, createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), 
        tags: ['contract', 'urgent', 'legal', 'attorney', 'review', 'closing', 'important'], 
        weight: 20, percentComplete: 0, 
        subtasks: [{id: 'st34', title: 'Review contract draft', completed: false}, {id: 'st35', title: 'List questions', completed: false}],
        goalId: 'g1', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Contract looks standard but need to clarify inspection contingency timeline. Henry is very thorough.'
      },
      { 
        id: 't23', title: 'Meal Prep for Week', 
        description: 'Plan and prepare meals for the week. Make shopping list, buy ingredients, and cook/portion meals. Focus on healthy, protein-rich options.',
        category: 'Health', subtype: 'Meal Prep', priority: 'Medium', 
        estimatedTime: 90, estimatedTimeUnit: 'min', 
        startDate: tomorrow, startTime: '14:00', dueDate: tomorrow, dueTime: '15:30',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 1, reminderOffsetUnit: 'hours',
        people: [], location: '', locationIds: [], locationCoords: null,
        completed: false, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), 
        tags: ['health', 'meal', 'prep', 'cooking', 'nutrition', 'weekly', 'protein'], 
        weight: 8, percentComplete: 0, 
        recurring: 'Weekly', subtasks: [{id: 'st36', title: 'Plan meals', completed: false}, {id: 'st37', title: 'Buy ingredients', completed: false}, {id: 'st38', title: 'Cook and portion', completed: false}],
        goalId: null, blockedBy: [], excludeFromTumbler: false,
        notes: 'Meal prep saves time during the week. Focus on chicken, vegetables, and rice this week.'
      },
      { 
        id: 't24', title: 'Research Market Trends', 
        description: 'Research current real estate market trends for blog post and client presentations. Gather data from MLS, industry reports, and local news. Analyze patterns.',
        category: 'Work', subtype: 'Research', priority: 'Medium', 
        estimatedTime: 60, estimatedTimeUnit: 'min', 
        startDate: nextWeek, startTime: '11:00', dueDate: nextWeek, dueTime: '12:00',
        reminderMode: 'notification', reminderAnchor: 'start', reminderOffsetValue: 15, reminderOffsetUnit: 'minutes',
        people: [], location: 'Coffee Shop', locationIds: ['loc3'], 
        locationCoords: { lat: 37.7649, lon: -122.4294 },
        completed: false, createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(), 
        tags: ['research', 'work', 'market', 'trends', 'data', 'analysis', 'mls'], 
        weight: 10, percentComplete: 0, 
        subtasks: [{id: 'st39', title: 'Gather data sources', completed: false}, {id: 'st40', title: 'Analyze trends', completed: false}],
        goalId: 'g2', blockedBy: [], excludeFromTumbler: false, recurring: 'None',
        notes: 'Market is showing interesting trends. Need to dig deeper into Q4 data. Coffee shop is good for focused research.'
      }
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
    { key: "kanban", icon: "📊", label: "Kanban", displayLabel: "Kanban" },
    { key: "calendar", icon: "📅", label: "Calendar", displayLabel: "Calendar" },
    { key: "timer", icon: "⏱️", label: "Track", displayLabel: "Track" },
    { key: "lists", icon: "💡", label: "Ideas", displayLabel: "Ideas" },
    { key: "goals", icon: "🎯", label: "Goals", displayLabel: "Goals" },
    { key: "chatbot", icon: "🤖", label: "AI Assistant", displayLabel: "AI" },
    { key: "crm", icon: "👔", label: "CRM", displayLabel: "CRM", hasDropdown: true, dropdownItems: ["crm:people", "crm:places"] },
    { key: "crm:people", icon: "👥", label: "People", displayLabel: "People", groupLabel: "CRM" },
    { key: "crm:places", icon: "📍", label: "Places", displayLabel: "Places", groupLabel: "CRM" },
    { key: "stats", icon: "📊", label: "Data", displayLabel: "Data", hasDropdown: true, dropdownItems: ["stats:overview", "stats:charts", "stats:history"] },
    { key: "stats:overview", icon: "📊", label: "Overview", displayLabel: "Overview", groupLabel: "Data" },
    { key: "stats:charts", icon: "📈", label: "Charts", displayLabel: "Charts", groupLabel: "Data" },
    { key: "stats:history", icon: "📜", label: "History", displayLabel: "History", groupLabel: "Data" },
    { key: "duel", icon: "⚔️", label: "Duel", displayLabel: "Duel" },
    { key: "settings", icon: "⚙️", label: "Settings", displayLabel: "Settings", hasDropdown: true, dropdownItems: ["settings:view", "settings:logic", "settings:ai", "settings:game", "settings:calendar", "settings:cats", "settings:data"] },
    { key: "settings:view", icon: "👁️", label: "View", displayLabel: "View", groupLabel: "Settings" },
    { key: "settings:logic", icon: "⚙️", label: "Logic", displayLabel: "Logic", groupLabel: "Settings" },
    { key: "settings:ai", icon: "🧠", label: "AI", displayLabel: "AI", groupLabel: "Settings" },
    { key: "settings:game", icon: "🎮", label: "Game", displayLabel: "Game", groupLabel: "Settings" },
    { key: "settings:calendar", icon: "📅", label: "Calendar Settings", displayLabel: "Calendar Settings", groupLabel: "Settings" },
    { key: "settings:cats", icon: "🏷️", label: "Categories", displayLabel: "Cats", groupLabel: "Settings" },
    { key: "settings:data", icon: "💾", label: "Data Settings", displayLabel: "Data", groupLabel: "Settings" },
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
    // Always include items that have groupLabel (dropdown children) so they can be rendered in dropdowns
    // These won't show as navbar buttons but need to be available for dropdown rendering
    if (item.groupLabel) {
      return true;
    }

    // If navBarVisibleItems exists (even if empty), it means user has explicitly configured it
    // In this case, only show items that are explicitly set to true
    // If the object exists but key is missing, treat as false (not visible)
    if (settings?.navBarVisibleItems !== undefined && settings.navBarVisibleItems !== null) {
      // Object exists - check if this key is explicitly set to true
      return settings.navBarVisibleItems[item.key] === true;
    }

    // If navBarVisibleItems doesn't exist at all, fallback to defaults
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
      const defaultNavBarItems = settings?.defaultNavBarItems || defaults.defaultNavBarItems || ["tasks", "spin", "duel", "settings:view", "goals", "people"];
      
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
            people={allPeople}
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
            onReset={handleEmergencyReset}
            onLoadSamples={handleLoadSamples}
            onExport={handleExportBackup}
            onImport={(e) => {
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    if (data.tasks) setTasks(data.tasks || []);
                    if (data.goals) setGoals(data.goals || []);
                    if (data.categories) setCategories(data.categories || []);
                    if (data.activities && setActivitiesInternal) setActivitiesInternal(data.activities || []);
                    if (data.savedNotes && setSavedNotes) setSavedNotes(data.savedNotes || []);
                    if (data.settings) setSettings((prev) => ({ ...(prev || {}), ...(data.settings || {}) }));
                    if (data.userStats && setUserStats) setUserStats(data.userStats || { xp: 0, level: 1 });
                    if (data.savedPeople && DM?.people?.setAll) {
                      DM.people.setAll(data.savedPeople);
                    }
                    notify("Data Imported!", "✅");
                  } catch (err) {
                    console.error(err);
                    notify("Import Failed", "❌");
                  }
                };
                reader.readAsText(file);
              } catch (err) {
                console.error(err);
                notify("Import Failed", "❌");
              }
            }}
            onClearCompleted={handleClearCompleted}
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
                onUpdate={updateTask}
                onAdd={addTask}
                settings={settings}
                openAdd={() => setIsAdding(true)}
              />
            )}

            {tab === "kanban" && (
              <KanbanTabComp
                tasks={tasks}
                onView={setViewTask}
                onUpdate={updateTask}
                categories={categories}
                settings={settings}
              />
            )}

            {tab === "calendar" && (
              <CalendarTabComp
                tasks={tasks}
                onView={setViewTask}
                categories={categories}
                settings={settings}
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
            {tab === "people" && <PeopleTabComp people={allPeople} setPeople={setPeople} tasks={tasks} history={activities} categories={categories} settings={settings} notify={notify} locations={DM?.locations?.getAll?.() || []} setLocations={(newList) => DM?.locations?.setAll?.(newList)} setTasks={setTasks} onViewTask={setViewTask} />}
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
    tasks={tasks}
    updateTask={updateTask}
    addTask={addTask}
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
                  setSettingsView(subtab);
                  window.location.hash = `#settings?view=${subtab}`;
                  window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'settings' } }));
                } else if (parentTab === "crm") {
                  // CRM dropdown items map to existing tabs
                  if (subtab === "people") {
                    setTab("people");
                  } else if (subtab === "places") {
                    setTab("places");
                  }
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
        
        if (modal.type === 'viewContact') {
          if (!ViewContactModal) {
            console.error('ViewContactModal is not available. Check if 13-11-view-contact-modal.jsx loaded correctly.');
            return null;
          }
          const person = modal.data;
          if (!person) {
            console.warn('ViewContactModal: modal.data is missing person');
            return null;
          }
          return (
            <div 
              key={`viewContact-${index}`} 
              style={{ 
                position: 'fixed', 
                inset: 0, 
                zIndex,
                pointerEvents: isTopModal ? 'auto' : 'none'
              }}
            >
              <ViewContactModal
                person={person}
                onClose={() => {
                  setModalStack(prev => prev.filter((_, i) => i !== index));
                }}
                onEdit={(p) => {
                  setModalStack(prev => {
                    const newStack = [...prev];
                    newStack[index] = { type: 'editContact', data: p };
                    return newStack;
                  });
                }}
                tasks={tasks}
                history={activities}
                locations={DM?.locations?.getAll?.() || []}
                people={allPeople}
                setPeople={setPeople}
                onViewTask={(task) => window.openModal('task', task.id, { task })}
                onComplete={completeTask}
                ignoreHash={true}
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

      {/* AI Chatbot - Global Assistant */}
      <AIChatbot />

      {/* URL-based Modal Renderer for task and contact modals */}
      <ModalRenderer
        getTaskById={(id) => tasks.find(t => t.id === id)}
        getPersonById={(id) => allPeople.find(p => p.id === id || p.name === id)}
        tasks={tasks}
        people={allPeople}
        locations={DM?.locations?.getAll?.() || []}
        onEditTask={(task) => {
          pushModal({ type: 'editTask', data: task });
        }}
        onCompleteTask={completeTask}
        onFocusTask={(task) => {
          pushModal({ type: 'focus', data: task });
        }}
        onStartTimer={(task) => {
          if (task) {
            startTimer(task);
          }
        }}
        goals={goals}
        settings={settings}
        updateTask={(task) => {
          setTasks(prev => prev.map(t => t.id === task.id ? task : t));
        }}
        onRespin={() => {
          // Trigger respin
          window.dispatchEvent(new Event('respin-triggered'));
        }}
        history={activities}
      />
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
