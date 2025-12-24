
import React from "react";

export default function SettingsTabLegacy(props) {
  try {
    const {
      settings,
      setSettings,
      categories,
      setCategories,
      onExport,
      onImport,
      onLoadSamples,
      onFullReset,
      initialView,
      notify,
    } = props;

    const { useState, useEffect, useMemo, useRef, useCallback } = React;
    const [foldRename, setFoldRename] = useState(false);
    const [foldScore, setFoldScore] = useState(false);
    const [foldSubs, setFoldSubs] = useState(true); // usually the only one you need open
    
    // Subtabs collapse state (persisted in localStorage)
    const [subTabsCollapsed, setSubTabsCollapsed] = useState(() => {
      try {
        const saved = localStorage.getItem('settings_subTabsCollapsed');
        return saved === 'true';
      } catch {
        return false;
      }
    });
    
    // Persist collapse state to localStorage
    const toggleSubTabsCollapsed = useCallback(() => {
      setSubTabsCollapsed(prev => {
        const newValue = !prev;
        try {
          localStorage.setItem('settings_subTabsCollapsed', String(newValue));
        } catch {}
        return newValue;
      });
    }, []);
    
    // Game Settings section collapse states
    const [gameSections, setGameSections] = useState({
      xp: true,
      spin: false,
      duel: false,
      feedback: false
    });
    
    const toggleGameSection = useCallback((section) => {
      setGameSections(prev => ({ ...prev, [section]: !prev[section] }));
    }, []);

    // Advanced settings: History filter defaults
    const allPossibleHistoryTypes = [
      'Completed',
      'Sessions',
      'focus',
      'timer',
      'log',
      'spin',
      'respin',
      'duel',
      'task_created',
      'task_edited',
      'contact_created',
      'contact_edited',
      'location_created',
      'location_edited',
      'completion',
      'spin_result'
    ];

    const getHistoryTypeDisplayLabel = (type) => {
      const labelMap = {
        'Completed': '✅ Task Completed',
        'complete': '✅ Task Completed',
        'Sessions': '⏱️ Timed Sessions',
        'focus': '🎯 Focus Session',
        'timer': '⏱️ Timer Session',
        'log': '📝 Log Entry',
        'spin': '🎰 Spin Result',
        'respin': '🔄 Respin',
        'duel': '⚔️ Duel',
        'task_created': '➕ Task Created',
        'task_edited': '✏️ Task Edited',
        'contact_created': '👤 Contact Created',
        'contact_edited': '✏️ Contact Edited',
        'location_created': '📍 Location Created',
        'location_edited': '✏️ Location Edited',
        'completion': '✅ Completion',
        'spin_result': '🎰 Spin Result'
      };
      return labelMap[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const defaultHistoryTypesFromStorage = (() => {
      try {
        const stored = localStorage.getItem('historyFilterDefaults');
        if (stored) {
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return ['Completed', 'Sessions', 'focus', 'timer', 'log', 'spin', 'respin'];
    })();

    const [selectedHistoryDefaults, setSelectedHistoryDefaults] = useState(defaultHistoryTypesFromStorage);

    const handleHistoryDefaultTypeToggle = useCallback((type) => {
      setSelectedHistoryDefaults(prev => {
        const newSelection = prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type];
        localStorage.setItem('historyFilterDefaults', JSON.stringify(newSelection));
        return newSelection;
      });
    }, []);

    const handleSelectAllHistoryDefaults = useCallback(() => {
      setSelectedHistoryDefaults([...allPossibleHistoryTypes]);
      localStorage.setItem('historyFilterDefaults', JSON.stringify([...allPossibleHistoryTypes]));
    }, [allPossibleHistoryTypes]);

    const handleClearAllHistoryDefaults = useCallback(() => {
      setSelectedHistoryDefaults([]);
      localStorage.setItem('historyFilterDefaults', JSON.stringify([]));
    }, []);

    const handleResetHistoryDefaults = useCallback(() => {
      const defaults = ['Completed', 'Sessions', 'focus', 'timer', 'log', 'spin', 'respin'];
      setSelectedHistoryDefaults(defaults);
      localStorage.setItem('historyFilterDefaults', JSON.stringify(defaults));
    }, []);

    // ===========================================
    // Notify
    // ===========================================
    const safeNotify = useCallback(
      (msg, icon) => {
        try {
          if (typeof notify === "function") notify(msg, icon);
          else if (typeof window.notify === "function") window.notify(msg, icon);
          else console.log(icon ? `${icon} ${msg}` : msg);
        } catch {}
      },
      [notify]
    );

    // ===========================================
    // Normalize view names (hash shortcuts)
    // ===========================================
    const normalizeView = useCallback((view) => {
      const mapping = {
        look: "view",
        general: "view",
        xp: "game",
        behavior: "logic",
        adv: "logic",
        power: "data",
        cats: "cats",
      };
      return mapping[view] || view;
    }, []);

    const [settingsView, setSettingsView] = useState(normalizeView(initialView) || "view");

    // Sync with initialView prop when it changes (for navigation from dropdown)
    useEffect(() => {
      const normalized = normalizeView(initialView) || "view";
      setSettingsView(normalized);
    }, [initialView, normalizeView]);

    // Sync state with localStorage when component mounts or when settingsView changes to 'data'
    useEffect(() => {
      if (settingsView === 'data') {
        try {
          const stored = localStorage.getItem('historyFilterDefaults');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setSelectedHistoryDefaults(parsed);
            }
          }
        } catch {}
      }
    }, [settingsView]);

    // ===========================================
    // Derived values + safe defaults
    // ===========================================
    const spinDuration = Number.isFinite(parseInt(settings?.duration, 10)) ? parseInt(settings.duration, 10) : 3;

    const spinCooldownEnabled = !!settings?.spinCooldownEnabled;
    const spinCooldownSpins = Math.max(1, parseInt(settings?.spinCooldownSpins, 10) || 5);

    const rawMin = parseInt(settings?.spinCooldownMinutes, 10);
    const spinCooldownMinutes = Number.isFinite(rawMin) ? rawMin : 0;

    const rawSec = parseInt(settings?.spinCooldownSeconds, 10);
    const spinCooldownSeconds = Number.isFinite(rawSec) ? rawSec : 0;

    const spinUseWeighted = settings?.spinUseWeighted !== false;
    const spinAutoOpenWinnerTask = !!settings?.spinAutoOpenWinnerTask;
    const spinShowWinnerPopup = settings?.spinShowWinnerPopup !== false;
    const agingPerDay = Number.isFinite(parseFloat(settings?.agingPerDay)) ? parseFloat(settings.agingPerDay) : 0;

    // ===========================================
    // Shared setters
    // ===========================================
    const handleToggle = useCallback(
      (key) => {
        setSettings?.((p) => ({ ...p, [key]: !p?.[key] }));
      },
      [setSettings]
    );

    const handleChange = useCallback(
      (key, val) => {
        setSettings?.((p) => ({ ...p, [key]: val }));
      },
      [setSettings]
    );

    const handleTabToggle = useCallback(
      (tabId) => {
        setSettings?.((p) => {
          const currentTabs = p?.visibleTabs || {};
          const defaultValue = currentTabs[tabId] === undefined ? true : currentTabs[tabId];
          return { ...p, visibleTabs: { ...currentTabs, [tabId]: !defaultValue } };
        });
      },
      [setSettings]
    );

    const fileInputRef = useRef(null);

    // ===========================================
    // AI Key test
    // ===========================================
    const [aiTestStatus, setAiTestStatus] = useState("idle");
    const testAiKey = useCallback(async () => {
      if (!settings?.geminiApiKey) return safeNotify("Enter a key first", "⚠️");
      setAiTestStatus("testing");
      try {
        if (!window.callGemini) throw new Error("AI Service unavailable");
        const res = await window.callGemini("Reply with 'OK'", settings.geminiApiKey);
        if (res && res.text) {
          setAiTestStatus("success");
          safeNotify("API Key is working!", "✅");
          setTimeout(() => setAiTestStatus("idle"), 2500);
        } else {
          throw new Error("No response");
        }
      } catch (e) {
        setAiTestStatus("error");
        safeNotify("Test failed: " + (e?.message || "Unknown error"), "❌");
        setTimeout(() => setAiTestStatus("idle"), 3000);
      }
    }, [settings?.geminiApiKey, safeNotify]);

    // ===========================================
    // CATEGORIES: state
    // ===========================================
    const [newCat, setNewCat] = useState("");
    const [expandedCat, setExpandedCat] = useState(null);
    const [minimizedCats, setMinimizedCats] = useState(new Set());

    // Search
    const [catSearch, setCatSearch] = useState("");

    // Filter: hide penalty categories (negative XP Adjust)
    const [hideNoSpin, setHideNoSpin] = useState(true);

    // per-parent subcat input
    const [newSubCatByParent, setNewSubCatByParent] = useState({});

    // rename input (MUST be top-level hook)
    const [renameDraft, setRenameDraft] = useState("");
    
    // Drag and drop state for nav bar ordering
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
	

    // Canonical category list from props; defensive clean mirror
    const localCategories = useMemo(() => (Array.isArray(categories) ? categories.filter(Boolean) : []), [categories]);

    // Settings maps
    const categoryMultipliers = settings?.categoryMultipliers || {};
    const categoryXpAdjust = settings?.categoryXpAdjust || {};
    const subCategories = settings?.subCategories || {};

    const norm = useCallback((s) => String(s || "").toLowerCase().trim(), []);

    // ===========================================
    // CATS UI: per-category collapsible state (stored in settings.catsUi)
    // ===========================================
    const catsUi = settings?.catsUi || {};
    const ensureCatsUiFor = useCallback(
      (cat) => {
        if (!cat) return;
        setSettings?.((p) => {
          const next = { ...(p || {}) };
          const ui = { ...(next.catsUi || {}) };
          if (!ui[cat]) {
            ui[cat] = { renameOpen: false, tuningOpen: true, subsOpen: true };
            next.catsUi = ui;
            return next;
          }
          if (ui[cat].renameOpen === undefined || ui[cat].tuningOpen === undefined || ui[cat].subsOpen === undefined) {
            ui[cat] = {
              renameOpen: ui[cat].renameOpen ?? false,
              tuningOpen: ui[cat].tuningOpen ?? true,
              subsOpen: ui[cat].subsOpen ?? true,
            };
            next.catsUi = ui;
            return next;
          }
          return p;
        });
      },
      [setSettings]
    );

    const getCatUi = useCallback(
      (cat) => {
        const ui = catsUi?.[cat];
        return {
          renameOpen: ui?.renameOpen ?? false,
          tuningOpen: ui?.tuningOpen ?? true,
          subsOpen: ui?.subsOpen ?? true,
        };
      },
      [catsUi]
    );

    const toggleCatUi = useCallback(
      (cat, key) => {
        if (!cat) return;
        setSettings?.((p) => {
          const next = { ...(p || {}) };
          const uiAll = { ...(next.catsUi || {}) };
          const cur = uiAll[cat] || {};
          uiAll[cat] = { ...cur, [key]: !(cur?.[key] ?? (key === "tuningOpen" || key === "subsOpen")) };
          next.catsUi = uiAll;
          return next;
        });
      },
      [setSettings]
    );

    // Persist categories helper
    const persistCategories = useCallback(
      (next) => {
        const clean = Array.from(new Set((next || []).map((x) => String(x || "").trim()).filter(Boolean)));
        try {
          localStorage.setItem("categories", JSON.stringify(clean));
        } catch {}
        try {
          window.dispatchEvent(new Event("categories-updated"));
        } catch {}
        setCategories?.(clean);
        return clean;
      },
      [setCategories]
    );

    // Ensure defaults for a category exist in settings
    const ensureCategoryDefaults = useCallback(
      (cat) => {
        setSettings?.((p) => {
          const next = { ...(p || {}) };

          const cm = { ...(next.categoryMultipliers || {}) };
          if (cm[cat] === undefined) cm[cat] = 1.0;

          const cx = { ...(next.categoryXpAdjust || {}) };
          if (cx[cat] === undefined) cx[cat] = 0;

          const sc = { ...(next.subCategories || {}) };
          if (!Array.isArray(sc[cat])) sc[cat] = Array.isArray(subCategories?.[cat]) ? subCategories[cat].filter(Boolean) : [];

          next.categoryMultipliers = cm;
          next.categoryXpAdjust = cx;
          next.subCategories = sc;

          // UI defaults too
          const ui = { ...(next.catsUi || {}) };
          if (!ui[cat]) ui[cat] = { renameOpen: false, tuningOpen: true, subsOpen: true };
          next.catsUi = ui;

          return next;
        });
      },
      [setSettings, subCategories]
    );

    // Add category
    const handleAddCategory = useCallback(() => {
      const clean = (newCat || "").trim();
      if (!clean) return;

      const exists = localCategories.some((c) => norm(c) === norm(clean));
      if (exists) {
        setNewCat("");
        safeNotify("Category already exists", "⚠️");
        return;
      }

      persistCategories([...localCategories, clean]);
      ensureCategoryDefaults(clean);

      setNewCat("");
      setExpandedCat(clean);
      safeNotify("Category added", "✅");
    }, [newCat, localCategories, persistCategories, ensureCategoryDefaults, safeNotify, norm]);

    // Remove category
    const handleRemoveCategory = useCallback(
      (cat) => {
        if (!cat) return;
        const ok = window.confirm ? window.confirm(`Delete category "${cat}"?`) : true;
        if (!ok) return;

        persistCategories(localCategories.filter((c) => c !== cat));

        setSettings?.((p) => {
          const next = { ...(p || {}) };
          const cm = { ...(next.categoryMultipliers || {}) };
          const cx = { ...(next.categoryXpAdjust || {}) };
          const sc = { ...(next.subCategories || {}) };
          const ui = { ...(next.catsUi || {}) };

          delete cm[cat];
          delete cx[cat];
          delete sc[cat];
          delete ui[cat];

          next.categoryMultipliers = cm;
          next.categoryXpAdjust = cx;
          next.subCategories = sc;
          next.catsUi = ui;

          return next;
        });

        setNewSubCatByParent((prev) => {
          const n = { ...(prev || {}) };
          delete n[cat];
          return n;
        });

        if (expandedCat === cat) setExpandedCat(null);
        safeNotify("Category removed", "🗑️");
      },
      [localCategories, persistCategories, setSettings, expandedCat, safeNotify]
    );

    // Set multiplier
    const setCategoryMultiplier = useCallback(
      (cat, val) => {
        const n = Number(val);
        const safe = Number.isFinite(n) ? n : 1.0;
        setSettings?.((p) => ({
          ...(p || {}),
          categoryMultipliers: { ...(p?.categoryMultipliers || {}), [cat]: safe },
        }));
        try {
          window.dispatchEvent(new Event("categories-updated"));
        } catch {}
      },
      [setSettings]
    );

    // Set XP Adjust (can be negative)
    const setCategoryXpAdjust = useCallback(
      (cat, val) => {
        const n = parseInt(val, 10);
        const safe = Number.isFinite(n) ? n : 0;
        setSettings?.((p) => ({
          ...(p || {}),
          categoryXpAdjust: { ...(p?.categoryXpAdjust || {}), [cat]: safe },
        }));
        try {
          window.dispatchEvent(new Event("categories-updated"));
        } catch {}
      },
      [setSettings]
    );

    const getSubs = useCallback(
      (cat) => {
        const arr = subCategories?.[cat];
        return Array.isArray(arr) ? arr.filter(Boolean) : [];
      },
      [subCategories]
    );

    // Add subcategory
    const addSubCategory = useCallback(
      (parentCat) => {
        const text = (newSubCatByParent?.[parentCat] || "").trim();
        if (!text) return;

        setSettings?.((p) => {
          const next = { ...(p || {}) };
          const sc = { ...(next.subCategories || {}) };
          const cur = Array.isArray(sc[parentCat]) ? sc[parentCat].filter(Boolean) : [];

          const exists = cur.some((s) => norm(s) === norm(text));
          if (!exists) sc[parentCat] = [...cur, text];

          next.subCategories = sc;
          return next;
        });

        setNewSubCatByParent((prev) => ({ ...(prev || {}), [parentCat]: "" }));
        safeNotify("Subcategory added", "✅");
      },
      [newSubCatByParent, setSettings, safeNotify, norm]
    );

    // Remove subcategory
    const removeSubCategory = useCallback(
      (parentCat, sub) => {
        setSettings?.((p) => {
          const next = { ...(p || {}) };
          const sc = { ...(next.subCategories || {}) };
          const cur = Array.isArray(sc[parentCat]) ? sc[parentCat].filter(Boolean) : [];
          sc[parentCat] = cur.filter((s) => s !== sub);
          next.subCategories = sc;
          return next;
        });
      },
      [setSettings]
    );

    // ===========================================
    // CATS: derived lists
    // ===========================================
    const catsAll = useMemo(() => {
      const arr = Array.isArray(localCategories) ? localCategories.slice() : [];
      arr.sort((a, b) => String(a).localeCompare(String(b)));
      return arr;
    }, [localCategories]);

    const catsFiltered = useMemo(() => {
      const q = norm(catSearch);
      const cx = settings?.categoryXpAdjust || {};
      const sc = settings?.subCategories || {};

      return catsAll.filter((cat) => {
        const xpVal = Number.isFinite(parseInt(cx?.[cat], 10)) ? parseInt(cx[cat], 10) : 0;
        if (hideNoSpin && xpVal < 0) return false;

        if (!q) return true;

        if (norm(cat).includes(q)) return true;
        const subs = Array.isArray(sc?.[cat]) ? sc[cat].filter(Boolean) : [];
        return subs.some((s) => norm(s).includes(q));
      });
    }, [catsAll, catSearch, hideNoSpin, settings?.categoryXpAdjust, settings?.subCategories, norm]);

    const catsSelectedCat = useMemo(() => {
      // Only return a selected category if one is actually expanded
      if (expandedCat && catsAll.includes(expandedCat)) return expandedCat;
      return null;
    }, [expandedCat, catsAll]);

    useEffect(() => {
      if (settingsView !== "cats") return;
      setRenameDraft(catsSelectedCat || "");
    }, [settingsView, catsSelectedCat]);

    // Ensure UI defaults exist for selected category
    useEffect(() => {
      if (settingsView !== "cats") return;
      if (!catsSelectedCat) return;
      ensureCatsUiFor(catsSelectedCat);
    }, [settingsView, catsSelectedCat, ensureCatsUiFor]);

    // Rename support (moves settings keys too)
    const renameCategory = useCallback(
      (oldName, nextNameRaw) => {
        const nextName = String(nextNameRaw || "").trim();
        if (!oldName) return;
        if (!nextName) return safeNotify("Enter a category name", "⚠️");
        if (norm(oldName) === norm(nextName)) return;

        const exists = catsAll.some((c) => norm(c) === norm(nextName));
        if (exists) return safeNotify("That category already exists", "⚠️");

        // Update categories list
        const nextCats = catsAll.map((c) => (c === oldName ? nextName : c));
        persistCategories(nextCats);

        // Move settings maps + UI
        setSettings?.((p) => {
          const next = { ...(p || {}) };

          const cm = { ...(next.categoryMultipliers || {}) };
          const cx = { ...(next.categoryXpAdjust || {}) };
          const sc = { ...(next.subCategories || {}) };
          const ui = { ...(next.catsUi || {}) };

          if (cm[oldName] !== undefined) {
            cm[nextName] = cm[oldName];
            delete cm[oldName];
          }
          if (cx[oldName] !== undefined) {
            cx[nextName] = cx[oldName];
            delete cx[oldName];
          }
          if (sc[oldName] !== undefined) {
            sc[nextName] = sc[oldName];
            delete sc[oldName];
          }
          if (ui[oldName] !== undefined) {
            ui[nextName] = ui[oldName];
            delete ui[oldName];
          }

          next.categoryMultipliers = cm;
          next.categoryXpAdjust = cx;
          next.subCategories = sc;
          next.catsUi = ui;

          return next;
        });

        // Move sub input state
        setNewSubCatByParent((prev) => {
          const n = { ...(prev || {}) };
          if (n[oldName] !== undefined) {
            n[nextName] = n[oldName];
            delete n[oldName];
          }
          return n;
        });

        setExpandedCat(nextName);
        safeNotify("Category renamed", "✅");
      },
      [catsAll, persistCategories, setSettings, safeNotify, norm]
    );

    // Keep localStorage categories mirrored
    useEffect(() => {
      try {
        if (Array.isArray(categories)) localStorage.setItem("categories", JSON.stringify(categories));
      } catch {}
    }, [categories]);

    // CATS helpers for render
    const getXp = useCallback(
      (cat) => (Number.isFinite(parseInt(categoryXpAdjust?.[cat], 10)) ? parseInt(categoryXpAdjust[cat], 10) : 0),
      [categoryXpAdjust]
    );

    const getMult = useCallback(
      (cat) => (Number.isFinite(Number(categoryMultipliers?.[cat])) ? Number(categoryMultipliers[cat]) : 1),
      [categoryMultipliers]
    );

    const isPenalty = useCallback((cat) => getXp(cat) < 0, [getXp]);

    // ===========================================
    // UI: Collapsible card component (no hooks)
    // ===========================================
    function CollapsibleCard({ title, right, open, onToggle, children, danger }) {
      return (
        <div className="ttCatsCard">
          <div
            className="ttCatsCardHead"
            role="button"
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onToggle?.();
            }}
            title="Collapse / expand"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="ttCatsChevron">{open ? "▼" : "▶"}</span>
              <div className="ttCatsCardTitle" style={{ color: danger ? "rgba(255,140,140,0.95)" : undefined }}>
                {title}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
          </div>

          {open ? <div className="ttCatsCardBody">{children}</div> : null}
        </div>
      );
    }
function Fold({ title, right, open, onToggle, children }) {
  return (
    <div className="ttCatsFold">
      <div className="ttCatsFoldHead" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" ") onToggle?.(); }}>
        <div className="ttCatsFoldLeft">
          <div className="ttCatsChevron">{open ? "▼" : "▶"}</div>
          <div className="ttCatsFoldTitle">{title}</div>
        </div>
        <div className="ttCatsFoldRight">{right}</div>
      </div>

      {open ? <div className="ttCatsFoldBody">{children}</div> : null}
    </div>
  );
}

    // ===========================================
    // RENDER
    // ===========================================
    return (
      <div className="fade-in" style={{ paddingBottom: 20 }}>
        <style>{`
          .tt-seg { display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 14px; }
          .tt-seg .sc-btn { user-select:none; }

          /* ---------- CATS UI ---------- */
          .ttCatsPanel{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          }

          /* Mobile-first: Categories grid stacks vertically */
          .ttCatsGrid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0;
          }

          /* Desktop: Two columns when screen is wide enough */
          @media (min-width: 768px) {
            .ttCatsGrid {
              grid-template-columns: minmax(280px, 360px) 1fr;
            }
          }

          /* Fade-in animation for expanded content */
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Category Chips Grid */
          .ttCatsChipGrid {
            gap: 8px !important;
          }

          .ttCatsChipGrid > div {
            margin-bottom: 0 !important;
          }

          /* Expanded category takes full width */
          .ttCatsChipGrid > div[style*="grid-column: 1 / -1"] {
            margin-bottom: 8px !important;
          }

          /* Responsive columns */
          @media (max-width: 600px) {
            .ttCatsChipGrid {
              grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
            }
          }

          @media (min-width: 900px) {
            .ttCatsChipGrid {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
            }
          }

          /* Mobile: Category list and editor stack */
          @media (max-width: 767px) {
            .ttCatsList {
              border-right: none !important;
              border-bottom: 1px solid var(--border);
              max-height: 300px;
              min-height: 200px;
            }

            .ttCatsEditor {
              padding: 12px !important;
              min-height: 300px;
            }

            .ttCatsInputRow {
              flex-direction: column;
            }

            .ttCatsInputRow > div {
              width: 100%;
            }

            .ttCatsInputRow input {
              width: 100% !important;
              min-width: 0 !important;
            }

            /* Make header more compact on mobile */
            .ttCatsHeader {
              padding: 12px 16px !important;
            }

            /* Stack header elements on mobile */
            .ttCatsHeaderTop {
              flex-direction: column;
              align-items: flex-start !important;
              gap: 12px;
            }

            .ttCatsHeaderTop > div:last-child {
              width: 100%;
              justify-content: flex-start;
              flex-wrap: wrap;
            }

            /* Make filter buttons smaller on mobile */
            .ttCatsHeaderTop > div:last-child > button,
            .ttCatsHeaderTop > div:last-child > div {
              font-size: 10px !important;
              padding: 4px 8px !important;
            }

            /* Reduce font sizes in category cards on mobile */
            .ttCatsList > div > div {
              padding: 10px !important;
            }

            .ttCatsList > div > div > div:first-child > div:first-child {
              font-size: 13px !important;
            }

            .ttCatsList > div > div > div:first-child > div:last-child {
              font-size: 10px !important;
            }
          }

          .ttCatsTop{
            padding: 14px 14px 12px 14px;
            border-bottom: 1px solid var(--border-light);
          }

          .ttCatsTopRow1{
            display:flex;
            align-items:flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }

          .ttCatsTitleWrap{
            min-width: 0;
            display:flex;
            flex-direction: column;
            gap: 4px;
          }

          .ttCatsTitle{
            font-family: Fredoka;
            font-size: 18px;
            font-weight: 950;
            color: var(--text);
            margin: 0;
            line-height: 1.1;
            display:flex;
            align-items:center;
            gap: 8px;
          }

          .ttCatsSubtitle{
            font-size: 12px;
            opacity: 0.72;
            line-height: 1.35;
          }

          .ttCatsTopRight{
            display:flex;
            align-items:center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .ttCatsChip{
            display:inline-flex;
            align-items:center;
            gap: 8px;
            height: 32px;
            padding: 0 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: rgba(255,255,255,0.04);
            color: var(--text);
            font-weight: 900;
            font-size: 12px;
            user-select: none;
            white-space: nowrap;
          }

          .ttCatsChipToggle{ cursor: pointer; }
          .ttCatsChipToggle.active{ background: rgba(255,255,255,0.08); }

          .ttCatsDot{
            width: 10px;
            height: 10px;
            border-radius: 3px;
            background: rgba(255,255,255,0.18);
          }
          .ttCatsDot.active{ background: var(--primary); }

          .ttCatsInputs{
            display:grid;
            grid-template-columns: 1fr 110px 1.3fr;
            gap: 10px;
            align-items: center;
          }
          .ttCatsInputs .f-input{ margin-bottom: 0 !important; border-radius: 14px; }
          .ttCatsAddBtn{ height: 42px; border-radius: 14px; font-weight: 950; }

          .ttCatsBody{
            display: grid;
            grid-template-columns: minmax(260px, 340px) minmax(620px, 1fr);
            min-height: 460px;
          }

          .ttCatsLeft{
            border-right: 1px solid var(--border-light);
            background: rgba(255,255,255,0.01);
            display:flex;
            flex-direction: column;
            min-width: 0;
          }

          .ttCatsLeftScroll{
            flex: 1;
            overflow: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .ttCatsItem{
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
            border-radius: 14px;
            padding: 10px 10px;
            cursor: pointer;
            display:flex;
            align-items:flex-start;
            justify-content: space-between;
            gap: 10px;
          }
          .ttCatsItem:hover{ background: rgba(255,255,255,0.05); }
          .ttCatsItem.active{
            background: rgba(255,255,255,0.08);
            border-color: rgba(255,255,255,0.14);
            box-shadow: 0 10px 20px rgba(0,0,0,0.14);
          }

          .ttCatsItemMain{
            min-width: 0;
            display:flex;
            flex-direction: column;
            gap: 6px;
          }

          .ttCatsItemName{
            font-weight: 950;
            font-size: 14px;
            color: var(--text);
            overflow:hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .ttCatsItemSub{
            font-size: 12px;
            opacity: 0.65;
            overflow:hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .ttCatsItemMeta{
            display:flex;
            gap: 6px;
            flex-wrap: wrap;
            align-items:center;
            justify-content: flex-end;
            flex-shrink: 0;
          }

          .ttCatsBadge{
            font-size: 11px;
            font-weight: 950;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.10);
            color: var(--text);
            white-space: nowrap;
            line-height: 12px;
          }
          .ttCatsBadgeDanger{
            background: rgba(255,80,80,0.10);
            border: 1px solid rgba(255,80,80,0.22);
            color: rgba(255,140,140,0.95);
          }

          .ttCatsEmpty{
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px 10px;
          }

          .ttCatsEmptyCard{
            width: min(520px, 92%);
            border: 1px dashed rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.03);
            border-radius: 16px;
            padding: 18px 16px;
            text-align: center;
          }

          .ttCatsEmptyCard .title{ font-family: Fredoka; font-size: 18px; font-weight: 950; margin-bottom: 6px; }
          .ttCatsEmptyCard .desc{ font-size: 12px; opacity: 0.75; line-height: 1.4; }

          /* ===== Right editor + collapsible cards ===== */
          .ttCatsRight{ min-width:0; padding: 10px; display:flex; flex-direction:column; gap: 10px; }

          .ttCatsCard{
            border: 1px solid var(--border-light);
            background: rgba(0,0,0,0.10);
            border-radius: 14px;
            padding: 0;
            overflow: hidden;
          }

          .ttCatsCardHead{
            padding: 10px;
            display:flex;
            align-items:center;
            justify-content: space-between;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            background: rgba(255,255,255,0.02);
          }

          .ttCatsCardHead:hover{ background: rgba(255,255,255,0.04); }

          .ttCatsChevron{
            font-size: 11px;
            opacity: 0.75;
            width: 16px;
            text-align: center;
          }

          .ttCatsCardTitle{
            font-family: Fredoka;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: 0.2px;
            overflow:hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .ttCatsCardBody{ padding: 10px; }

          .ttCatsLabelSm{ font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; opacity: .7; }
          .ttCatsHelpSm{ font-size: 11px; opacity: .65; line-height: 1.2; margin-top: 6px; }

          .ttCatsMiniRow{
            display:grid;
            grid-template-columns: 88px 1fr 64px;
            gap: 8px;
            align-items: center;
          }

          .ttCatsMiniRow .f-input{
            margin: 0 !important;
            height: 30px;
            border-radius: 12px;
            font-weight: 950;
            text-align: center;
            padding: 0 8px;
          }

          .ttCatsMiniRow input[type="range"]{ width: 100%; margin: 0; height: 26px; }

          .ttCatsChipsRow{ display:flex; flex-wrap:wrap; gap: 6px; }

          .ttCatsSubChip{
            display:inline-flex;
            align-items:center;
            gap: 8px;
            padding: 6px 9px;
            border-radius: 999px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
            font-size: 12px;
            font-weight: 900;
          }

          .ttCatsSubChip button{
            width: 22px;
            height: 22px;
            border-radius: 8px;
            border: 1px solid rgba(255,80,80,0.22);
            background: rgba(255,80,80,0.10);
            color: rgba(255,140,140,0.95);
            font-weight: 900;
            cursor:pointer;
            line-height: 20px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
          }
/* Compact Rename row */
.ttCatsRenameRow{
  display: grid;
  grid-template-columns: 1fr 78px;
  gap: 8px;
  align-items: center;
}

.ttCatsRenameInput{
  margin: 0 !important;
  height: 32px;
  border-radius: 12px;
  padding: 0 10px;
  font-weight: 900;
}

.ttCatsRenameBtn{
  height: 32px;
  border-radius: 12px;
  font-weight: 950;
  padding: 0 10px;
}
/* ===== Compact collapsible cards ===== */
.ttCatsFold{
  border: 1px solid var(--border-light);
  background: rgba(0,0,0,0.10);
  border-radius: 14px;
  overflow: hidden;
}

.ttCatsFoldHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}

.ttCatsFoldLeft{
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ttCatsChevron{
  width: 18px;
  opacity: 0.75;
  flex: 0 0 auto;
}

.ttCatsFoldTitle{
  font-weight: 950;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
}

.ttCatsFoldRight{
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.ttCatsMiniPill{
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  font-size: 11px;
  font-weight: 950;
  opacity: 0.9;
  display: inline-flex;
  align-items: center;
}

.ttCatsFoldBody{
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

          @media (max-width: 1120px){
            .ttCatsBody{ grid-template-columns: 1fr; }
            .ttCatsLeft{ border-right: none; border-bottom: 1px solid var(--border-light); }
          }

          @media (max-width: 720px){
            .ttCatsInputs{ grid-template-columns: 1fr; }
            .ttCatsAddBtn{ width: 100%; }
          }
		  /* Top header tighter on small screens */
@media (max-width: 720px){
  .ttCatsTop{ padding: 10px 10px 8px; }
  .ttCatsTopRow1{ margin-bottom: 8px; }
  .ttCatsSubtitle{ display:none; } /* remove the 2-line explanation */
  .ttCatsChip{ height: 28px; padding: 0 10px; font-size: 11px; }
  .ttCatsInputs{ gap: 8px; }
  .ttCatsInputs .f-input{ height: 38px; }
  .ttCatsAddBtn{ height: 38px; }
}

        `}</style>

        {/* VIEW TAB */}
        {settingsView === "view" && (
          <div className="fade-in-up">
            <h3 style={{ fontFamily: "Fredoka", fontSize: 18, marginBottom: 16 }}>🎨 Appearance</h3>
            <div style={{ background: "var(--card)", padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <select className="f-select" style={{ width: "100%", marginBottom: 12 }} value={settings?.theme || "dark"} onChange={(e) => handleChange("theme", e.target.value)}>
                <option value="dark">🌙 Dark Default</option>
                <option value="light">☀️ Light Theme</option>
                <option value="midnight">🌌 Midnight Blue</option>
                <option value="forest">🌲 Deep Forest</option>
                <option value="synthwave">👾 Synthwave</option>
                <option value="coffee">☕ Warm Coffee</option>
              </select>

              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span>Show Task Times</span>
                <input type="checkbox" checked={!!settings?.showTaskTimes} onChange={() => handleToggle("showTaskTimes")} />
              </label>
            </div>

            {/* Navigation Bar Configuration */}
            <h4 style={{ fontFamily: "Fredoka", fontSize: 16, marginBottom: 12, marginTop: 24 }}>Navigation Bar</h4>
            <div style={{ background: "var(--card)", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                Choose which items appear in the main navigation bar and their order
              </p>
              
              {/* Nav Bar Visibility */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "var(--text-light)" }}>Visible Items</div>
                <div style={{ background: "var(--card)", padding: 12, borderRadius: 8 }}>
                  {(() => {
                    const allNavItems = [
                      { key: "spin", icon: "🎰", label: "Spin", displayLabel: "Spin" },
                      { key: "tasks", icon: "📋", label: "Tasks", displayLabel: "Tasks" },
                      { key: "timer", icon: "⏱️", label: "Track", displayLabel: "Track" },
                      { key: "lists", icon: "💡", label: "Ideas", displayLabel: "Ideas" },
                      { key: "goals", icon: "🎯", label: "Goals", displayLabel: "Goals" },
                      { key: "people", icon: "👥", label: "People", displayLabel: "People" },
                      { key: "places", icon: "📍", label: "Places", displayLabel: "Places" },
                      { key: "stats", icon: "📊", label: "Data", displayLabel: "Data" },
                      { key: "stats:overview", icon: "📊", label: "Data: Overview", displayLabel: "Overview", isSubtab: true },
                      { key: "stats:charts", icon: "📈", label: "Data: Charts", displayLabel: "Charts", isSubtab: true },
                      { key: "stats:history", icon: "📜", label: "Data: History", displayLabel: "History", isSubtab: true },
                      { key: "duel", icon: "⚔️", label: "Duel", displayLabel: "Duel" },
                      { key: "settings", icon: "⚙️", label: "Settings", displayLabel: "Settings" },
                      { key: "settings:view", icon: "👁️", label: "Settings: View", displayLabel: "View", isSubtab: true },
                      { key: "settings:logic", icon: "🧠", label: "Settings: Logic", displayLabel: "Logic", isSubtab: true },
                      { key: "settings:game", icon: "🎮", label: "Settings: Game", displayLabel: "Game", isSubtab: true },
                      { key: "settings:cats", icon: "🏷️", label: "Settings: Categories", displayLabel: "Categories", isSubtab: true },
                      { key: "settings:data", icon: "💾", label: "Settings: Data", displayLabel: "Data", isSubtab: true },
                    ];
                    
                    // Get current order
                    const currentOrder = settings?.navItemsOrder || allNavItems.map(item => item.key);
                    const orderedItems = [...allNavItems].sort((a, b) => {
                      const aIndex = currentOrder.indexOf(a.key);
                      const bIndex = currentOrder.indexOf(b.key);
                      if (aIndex === -1 && bIndex === -1) return 0;
                      if (aIndex === -1) return 1;
                      if (bIndex === -1) return -1;
                      return aIndex - bIndex;
                    });
                    
                    const defaults = window.DEFAULT_SETTINGS || {};
                    const defaultNavBarVisibleItems = defaults.navBarVisibleItems || {};
                    return orderedItems.map((item) => {
                      const isVisible = settings?.navBarVisibleItems?.[item.key] ?? defaultNavBarVisibleItems[item.key] ?? false;
                      
                      return (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                            cursor: "pointer",
                            paddingLeft: item.isSubtab ? 16 : 0,
                          }}
                          title={item.label}
                        >
                          <span style={{ fontWeight: item.isSubtab ? 400 : 500, color: item.isSubtab ? "var(--text-light)" : "var(--text)", fontSize: item.isSubtab ? 13 : 14 }}>
                            {item.icon} {item.displayLabel || item.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => {
                              setSettings((p) => {
                                const current = p?.navBarVisibleItems || {};
                                return {
                                  ...p,
                                  navBarVisibleItems: {
                                    ...current,
                                    [item.key]: !isVisible,
                                  },
                                };
                              });
                            }}
                          />
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Nav Bar Order */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "var(--text-light)" }}>Item Order</div>
                <div style={{ background: "var(--input-bg)", padding: 12, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                    Drag items to reorder. Only visible items are shown.
                  </p>
                  {(() => {
                    const allNavItems = [
                      { key: "spin", icon: "🎰", label: "Spin", displayLabel: "Spin", isSubtab: false },
                      { key: "tasks", icon: "📋", label: "Tasks", displayLabel: "Tasks", isSubtab: false },
                      { key: "timer", icon: "⏱️", label: "Track", displayLabel: "Track", isSubtab: false },
                      { key: "lists", icon: "💡", label: "Ideas", displayLabel: "Ideas", isSubtab: false },
                      { key: "goals", icon: "🎯", label: "Goals", displayLabel: "Goals", isSubtab: false },
                      { key: "people", icon: "👥", label: "People", displayLabel: "People", isSubtab: false },
                      { key: "places", icon: "📍", label: "Places", displayLabel: "Places", isSubtab: false },
                      { key: "stats", icon: "📊", label: "Data", displayLabel: "Data", isSubtab: false },
                      { key: "stats:overview", icon: "📊", label: "Data: Overview", displayLabel: "Overview", isSubtab: true },
                      { key: "stats:charts", icon: "📈", label: "Data: Charts", displayLabel: "Charts", isSubtab: true },
                      { key: "stats:history", icon: "📜", label: "Data: History", displayLabel: "History", isSubtab: true },
                      { key: "duel", icon: "⚔️", label: "Duel", displayLabel: "Duel", isSubtab: false },
                      { key: "settings", icon: "⚙️", label: "Settings", displayLabel: "Settings", isSubtab: false },
                      { key: "settings:view", icon: "👁️", label: "Settings: View", displayLabel: "View", isSubtab: true },
                      { key: "settings:logic", icon: "🧠", label: "Settings: Logic", displayLabel: "Logic", isSubtab: true },
                      { key: "settings:game", icon: "🎮", label: "Settings: Game", displayLabel: "Game", isSubtab: true },
                      { key: "settings:cats", icon: "🏷️", label: "Settings: Categories", displayLabel: "Categories", isSubtab: true },
                      { key: "settings:data", icon: "💾", label: "Settings: Data", displayLabel: "Data", isSubtab: true },
                    ];
                    
                    const currentOrder = settings?.navItemsOrder || allNavItems.map(item => item.key);
                    // Filter to only show visible items
                    const visibleItems = allNavItems.filter((item) => {
                      return settings?.navBarVisibleItems?.[item.key] === true;
                    });
                    const orderedItems = [...visibleItems].sort((a, b) => {
                      const aIndex = currentOrder.indexOf(a.key);
                      const bIndex = currentOrder.indexOf(b.key);
                      if (aIndex === -1 && bIndex === -1) return 0;
                      if (aIndex === -1) return 1;
                      if (bIndex === -1) return -1;
                      return aIndex - bIndex;
                    });
                    
                    const handleDragStart = (e, index) => {
                      setDraggedIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/html', e.target);
                      e.target.style.opacity = '0.5';
                    };
                    
                    const handleDragEnd = (e) => {
                      e.target.style.opacity = '1';
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    };
                    
                    const handleDragOver = (e, index) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverIndex(index);
                    };
                    
                    const handleDrop = (e, dropIndex) => {
                      e.preventDefault();
                      if (draggedIndex === null || draggedIndex === dropIndex) {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                        return;
                      }
                      
                      const newOrder = [...currentOrder];
                      const draggedKey = orderedItems[draggedIndex].key;
                      const dropKey = orderedItems[dropIndex].key;
                      
                      const draggedOrderIndex = newOrder.indexOf(draggedKey);
                      const dropOrderIndex = newOrder.indexOf(dropKey);
                      
                      // Remove dragged item
                      newOrder.splice(draggedOrderIndex, 1);
                      // Insert at new position
                      newOrder.splice(dropOrderIndex, 0, draggedKey);
                      
                      setSettings((p) => ({ ...p, navItemsOrder: newOrder }));
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    };
                    
                    return orderedItems.map((item, index) => {
                      const isDragging = draggedIndex === index;
                      const isDragOver = dragOverIndex === index;
                      
                      return (
                        <div
                          key={item.key}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px",
                            marginBottom: 4,
                            background: isDragOver ? "var(--primary-light)" : "var(--card)",
                            borderRadius: 6,
                            cursor: "grab",
                            opacity: isDragging ? 0.5 : 1,
                            border: isDragOver ? "2px dashed var(--primary)" : "1px solid transparent",
                            transition: "all 0.2s",
                          }}
                          title={item.label}
                        >
                          <span style={{ fontSize: 16, color: "var(--text-muted)", cursor: "grab" }}>⋮⋮</span>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: item.isSubtab ? 400 : 500, paddingLeft: item.isSubtab ? 16 : 0, color: item.isSubtab ? "var(--text-light)" : "var(--text)" }}>
                            {item.icon} {item.displayLabel || item.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            
            {/* Header Right Mode Configuration */}
            <h4 style={{ fontFamily: "Fredoka", fontSize: 16, marginBottom: 12, marginTop: 24 }}>Header Right Mode</h4>
            <div style={{ background: "var(--card)", padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 16 }}>
                Control what appears on the top right of the header (slot icon always visible on left)
              </p>
              
              {/* Mode Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-light)" }}>
                  Mode
                </label>
                <select
                  value={settings?.headerRightMode || "none"}
                  onChange={(e) => {
                    setSettings((p) => ({ ...p, headerRightMode: e.target.value }));
                  }}
                  className="f-select"
                  style={{ width: "100%", marginBottom: 0 }}
                >
                  <option value="none">None</option>
                  <option value="quickNav">Quick Nav</option>
                  <option value="xp">XP + Level</option>
                  <option value="status">Status</option>
                </select>
              </div>
              
              {/* Quick Nav Configuration */}
              {settings?.headerRightMode === "quickNav" && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--input-bg)", borderRadius: 8 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-light)" }}>
                    Quick Nav Items (up to 3)
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(() => {
                      const quickNavOptions = [
                        { key: "spin", icon: "🎰", label: "Spin" },
                        { key: "tasks", icon: "📋", label: "Tasks" },
                        { key: "timer", icon: "⏱️", label: "Track" },
                        { key: "lists", icon: "💡", label: "Ideas" },
                        { key: "goals", icon: "🎯", label: "Goals" },
                        { key: "stats", icon: "📊", label: "Data" },
                        { key: "duel", icon: "⚔️", label: "Duel" },
                        { key: "settings", icon: "⚙️", label: "Settings" },
                        { key: "search", icon: "🔍", label: "Search (Cmd/Ctrl+K)" },
                      ];
                      
                      return quickNavOptions.map((option) => {
                        const isSelected = (settings?.headerQuickNavItems || []).includes(option.key);
                        const currentItems = settings?.headerQuickNavItems || [];
                        const canAdd = isSelected || currentItems.length < 3;
                        
                        return (
                          <label
                            key={option.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: canAdd ? "pointer" : "not-allowed",
                              opacity: canAdd ? 1 : 0.5,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!canAdd && !isSelected}
                              onChange={(e) => {
                                setSettings((p) => {
                                  const current = p?.headerQuickNavItems || [];
                                  const newItems = e.target.checked
                                    ? [...current, option.key].slice(0, 3)
                                    : current.filter((i) => i !== option.key);
                                  return { ...p, headerQuickNavItems: newItems };
                                });
                              }}
                              style={{ cursor: canAdd ? "pointer" : "not-allowed" }}
                            />
                            <span style={{ fontSize: 14 }}>
                              {option.icon} {option.label}
                            </span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                    Selected: {((settings?.headerQuickNavItems || []).length || 0)} / 3
                  </p>
                </div>
              )}
              
              {/* XP Configuration */}
              {settings?.headerRightMode === "xp" && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--input-bg)", borderRadius: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings?.headerXpShowValue !== false}
                        onChange={(e) => {
                          setSettings((p) => ({ ...p, headerXpShowValue: e.target.checked }));
                        }}
                      />
                      <span style={{ fontSize: 14 }}>Show XP Value</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings?.headerXpShowLevel !== false}
                        onChange={(e) => {
                          setSettings((p) => ({ ...p, headerXpShowLevel: e.target.checked }));
                        }}
                      />
                      <span style={{ fontSize: 14 }}>Show Level Label</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings?.headerXpShowProgress || false}
                        onChange={(e) => {
                          setSettings((p) => ({ ...p, headerXpShowProgress: e.target.checked }));
                        }}
                      />
                      <span style={{ fontSize: 14 }}>Show Progress Bar</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Status Configuration */}
              {settings?.headerRightMode === "status" && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--input-bg)", borderRadius: 8 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-light)" }}>
                    Status Items (up to 3, only active ones shown)
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { id: "timer", label: "⏱ Timer running" },
                      { id: "sync", label: "☁ Sync state" },
                      { id: "focus", label: "⚡ Focus mode active" },
                      { id: "reminders", label: "🔔 Reminders armed" },
                    ].map((item) => {
                      const isSelected = (settings?.headerStatusItems || []).includes(item.id);
                      const currentItems = settings?.headerStatusItems || [];
                      const canAdd = isSelected || currentItems.length < 3;
                      
                      return (
                        <label
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: canAdd ? "pointer" : "not-allowed",
                            opacity: canAdd ? 1 : 0.5,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canAdd && !isSelected}
                            onChange={(e) => {
                              setSettings((p) => {
                                const current = p?.headerStatusItems || [];
                                const newItems = e.target.checked
                                  ? [...current, item.id].slice(0, 3)
                                  : current.filter((i) => i !== item.id);
                                return { ...p, headerStatusItems: newItems };
                              });
                            }}
                            style={{ cursor: canAdd ? "pointer" : "not-allowed" }}
                          />
                          <span style={{ fontSize: 14 }}>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={settings?.headerStatusClickable || false}
                      onChange={(e) => {
                        setSettings((p) => ({ ...p, headerStatusClickable: e.target.checked }));
                      }}
                    />
                    <span style={{ fontSize: 14 }}>Allow clicking status items to navigate</span>
                  </label>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                    Selected: {((settings?.headerStatusItems || []).length || 0)} / 3
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGIC TAB */}
        {settingsView === "logic" && (
          <div className="fade-in-up">
            <h3 style={{ fontFamily: "Fredoka", fontSize: 18, marginBottom: 16 }}>⚙️ App Behavior & AI</h3>

            <div style={{ background: "var(--card)", padding: 12, borderRadius: 12, marginBottom: 16, borderLeft: "4px solid #8a2be2" }}>
              <label className="f-label">GEMINI API KEY</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="text" className="f-input" style={{ marginBottom: 0, flex: 1 }} placeholder="Paste API key..." value={settings?.geminiApiKey || ""} onChange={(e) => handleChange("geminiApiKey", e.target.value)} />
                <button className="btn-white-outline" onClick={testAiKey} style={{ minWidth: 80 }}>
                  {aiTestStatus === "testing" ? "..." : aiTestStatus === "success" ? "✔" : "🧠 Test"}
                </button>
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>Tip: this key is stored locally in your browser storage unless you sync settings to cloud.</div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: "var(--primary)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 600,
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.opacity = "0.8"}
                onMouseLeave={(e) => e.target.style.opacity = "1"}
              >
                🔗 Get Gemini API Key →
              </a>
            </div>

            <div style={{ background: "var(--card)", padding: 12, borderRadius: 12 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, cursor: "pointer" }}>
                <span>🔔 System Notifications</span>
                <input type="checkbox" checked={!!settings?.enableNotifications} onChange={() => handleToggle("enableNotifications")} />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, cursor: "pointer" }}>
                <span>⏰ Auto reminders</span>
                <input type="checkbox" checked={settings?.autoAddReminders !== false} onChange={() => handleToggle("autoAddReminders")} />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span>🛠️ Dev Tools</span>
                <input type="checkbox" checked={settings?.showDevTools !== false} onChange={() => handleToggle("showDevTools")} />
              </label>
            </div>
          </div>
        )}

        {/* GAME TAB */}
        {settingsView === "game" && (
          <div className="fade-in-up">
            <style>{`
              .game-section {
                background: var(--card);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              }
              .game-section-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-light);
              }
              .game-section-title {
                font-family: Fredoka;
                font-size: 14px;
                font-weight: 800;
                color: var(--text);
                margin: 0;
              }
              .game-section-icon {
                font-size: 16px;
                line-height: 1;
              }
              .game-section-desc {
                font-size: 10px;
                color: var(--text-light);
                opacity: 0.65;
                margin-top: 2px;
                line-height: 1.3;
              }
              .game-setting-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.04);
              }
              .game-setting-row:last-child {
                border-bottom: none;
              }
              .game-setting-label {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
              }
              .game-setting-label-text {
                font-weight: 600;
                font-size: 12px;
                color: var(--text);
              }
              .game-setting-label-hint {
                font-size: 10px;
                color: var(--text-light);
                opacity: 0.55;
              }
              .game-setting-control {
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .game-setting-value {
                font-size: 11px;
                font-weight: 700;
                color: var(--primary);
                min-width: 45px;
                text-align: right;
              }
              .game-range-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
              }
              .game-range-input {
                flex: 1;
                height: 5px;
                border-radius: 3px;
                background: var(--input-bg);
                outline: none;
                -webkit-appearance: none;
              }
              .game-range-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary);
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(255,107,53,0.3);
              }
              .game-range-input::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary);
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 4px rgba(255,107,53,0.3);
              }
              .game-number-input {
                width: 70px;
                text-align: center;
                font-weight: 700;
                font-size: 12px;
                padding: 6px 8px;
                height: 32px;
              }
              .game-toggle {
                position: relative;
                width: 44px;
                height: 24px;
                background: var(--input-bg);
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.2s;
                border: 2px solid var(--border);
              }
              .game-toggle.active {
                background: var(--primary);
                border-color: var(--primary);
              }
              .game-toggle::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: white;
                transition: transform 0.2s;
                box-shadow: 0 2px 3px rgba(0,0,0,0.2);
              }
              .game-toggle.active::after {
                transform: translateX(20px);
              }
              .game-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px;
                margin-top: 8px;
              }
              .game-grid-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .game-grid-label {
                font-size: 10px;
                font-weight: 700;
                color: var(--text-light);
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              .game-section-collapsed {
                max-height: 0;
                overflow: hidden;
                opacity: 0;
                transition: max-height 0.3s ease, opacity 0.2s ease, padding 0.3s ease;
                padding: 0 14px;
              }
              .game-section-expanded {
                max-height: 5000px;
                opacity: 1;
                transition: max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease;
                padding: 14px;
              }
              .game-section-toggle {
                cursor: pointer;
                user-select: none;
                transition: all 0.2s ease;
              }
              .game-section-toggle:hover {
                opacity: 0.8;
              }
              .game-section-toggle-icon {
                transition: transform 0.3s ease;
                display: inline-block;
                margin-left: 8px;
                font-size: 10px;
              }
              .game-section-toggle-icon.rotated {
                transform: rotate(90deg);
              }
              .game-quick-nav {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                padding: 12px;
                background: var(--card);
                border-radius: 12px;
                border: 1px solid var(--border);
              }
              .game-quick-nav-btn {
                padding: 8px 14px;
                border-radius: 8px;
                border: 1px solid var(--border);
                background: var(--input-bg);
                color: var(--text);
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
              }
              .game-quick-nav-btn:hover {
                background: rgba(255,107,53,0.1);
                border-color: var(--primary);
              }
              .game-quick-nav-btn.active {
                background: var(--primary);
                color: white;
                border-color: var(--primary);
              }
            `}</style>

            <h3 style={{ fontFamily: "Fredoka", fontSize: 18, marginBottom: 16, fontWeight: 900 }}>⚔️ Gamification Settings</h3>

            {/* Quick Navigation */}
            <div className="game-quick-nav">
              <button
                className={`game-quick-nav-btn ${gameSections.xp ? "active" : ""}`}
                onClick={() => {
                  const xpSection = document.getElementById('game-section-xp');
                  if (xpSection) {
                    xpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (!gameSections.xp) toggleGameSection('xp');
                  }
                }}
              >
                ⭐ XP & Leveling
              </button>
              <button
                className={`game-quick-nav-btn ${gameSections.spin ? "active" : ""}`}
                onClick={() => {
                  const spinSection = document.getElementById('game-section-spin');
                  if (spinSection) {
                    spinSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (!gameSections.spin) toggleGameSection('spin');
                  }
                }}
              >
                🎰 Spin Settings
              </button>
              <button
                className={`game-quick-nav-btn ${gameSections.duel ? "active" : ""}`}
                onClick={() => {
                  const duelSection = document.getElementById('game-section-duel');
                  if (duelSection) {
                    duelSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (!gameSections.duel) toggleGameSection('duel');
                  }
                }}
              >
                ⚔️ Duel Settings
              </button>
              <button
                className={`game-quick-nav-btn ${gameSections.feedback ? "active" : ""}`}
                onClick={() => {
                  const feedbackSection = document.getElementById('game-section-feedback');
                  if (feedbackSection) {
                    feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (!gameSections.feedback) toggleGameSection('feedback');
                  }
                }}
              >
                🔊 Feedback & Sounds
              </button>
            </div>

            {/* XP & Leveling Section */}
            <div id="game-section-xp" className="game-section">
              <div 
                className="game-section-header game-section-toggle"
                onClick={() => toggleGameSection('xp')}
              >
                <span className="game-section-icon">⭐</span>
                <div style={{ flex: 1 }}>
                  <h4 className="game-section-title">XP & Leveling</h4>
                  <div className="game-section-desc">Configure how experience points are earned and levels are calculated</div>
                </div>
                <span className={`game-section-toggle-icon ${gameSections.xp ? "rotated" : ""}`}>▶</span>
              </div>
              <div className={gameSections.xp ? "game-section-expanded" : "game-section-collapsed"}>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Base XP per Task</span>
                  <span className="game-setting-label-hint">Default XP awarded for completing a task</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">{settings?.baseXpPerTask ?? 10}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="1"
                    max="100"
                    value={settings?.baseXpPerTask ?? 10}
                    onChange={(e) => handleChange("baseXpPerTask", parseInt(e.target.value, 10) || 10)}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">XP per Subtask</span>
                  <span className="game-setting-label-hint">Bonus XP for each completed subtask</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">{settings?.xpPerSubtask ?? 2}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="0"
                    max="20"
                    value={settings?.xpPerSubtask ?? 2}
                    onChange={(e) => handleChange("xpPerSubtask", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Max XP per Task</span>
                  <span className="game-setting-label-hint">Maximum XP that can be earned from a single task</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">{settings?.maxXpPerTask ?? 100}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="10"
                    max="500"
                    value={settings?.maxXpPerTask ?? 100}
                    onChange={(e) => handleChange("maxXpPerTask", parseInt(e.target.value, 10) || 100)}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Negative XP Cap</span>
                  <span className="game-setting-label-hint">Minimum XP penalty (prevents extreme negative values)</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">{settings?.negativeXpCap ?? -10}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="-50"
                    max="0"
                    value={settings?.negativeXpCap ?? -10}
                    onChange={(e) => handleChange("negativeXpCap", parseInt(e.target.value, 10) || -10)}
                  />
                </div>
              </div>
              </div>
            </div>

            {/* Spin Settings Section */}
            <div id="game-section-spin" className="game-section">
              <div 
                className="game-section-header game-section-toggle"
                onClick={() => toggleGameSection('spin')}
              >
                <span className="game-section-icon">🎰</span>
                <div style={{ flex: 1 }}>
                  <h4 className="game-section-title">Spin Settings</h4>
                  <div className="game-section-desc">Customize the spin wheel behavior and appearance</div>
                </div>
                <span className={`game-section-toggle-icon ${gameSections.spin ? "rotated" : ""}`}>▶</span>
              </div>
              <div className={gameSections.spin ? "game-section-expanded" : "game-section-collapsed"}>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Spin Style</span>
                  <span className="game-setting-label-hint">Animation style for the spin wheel</span>
                </div>
                <div className="game-setting-control">
                  <select
                    className="f-select"
                    style={{ minWidth: 180, fontSize: 12, padding: "6px 10px", height: 32 }}
                    value={settings?.spinStyle || "standard"}
                    onChange={(e) => handleChange("spinStyle", e.target.value)}
                  >
                    <option value="standard">Standard (Smooth)</option>
                    <option value="snappy">Snappy (Hard Stop)</option>
                    <option value="elastic">Elastic (Bounce Back)</option>
                    <option value="mystery">Mystery (Slow Start)</option>
                    <option value="ratchet">Ratchet (Mechanical Steps)</option>
                  </select>
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Spin Duration</span>
                  <span className="game-setting-label-hint">How long the spin animation lasts (seconds)</span>
                </div>
                <div className="game-setting-control">
                  <div className="game-range-wrapper">
                    <input
                      type="range"
                      className="game-range-input"
                      min="0"
                      max="40"
                      value={spinDuration}
                      onChange={(e) => handleChange("duration", parseInt(e.target.value, 10))}
                    />
                    <span className="game-setting-value">{spinDuration}s</span>
                  </div>
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Weighted Chances</span>
                  <span className="game-setting-label-hint">Use task weights to influence spin results</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${spinUseWeighted ? "active" : ""}`}
                    onClick={() => handleToggle("spinUseWeighted")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Show Winner Popup</span>
                  <span className="game-setting-label-hint">Display popup when spin completes</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${spinShowWinnerPopup ? "active" : ""}`}
                    onClick={() => handleToggle("spinShowWinnerPopup")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Auto-Open Winner</span>
                  <span className="game-setting-label-hint">Automatically open the winning task</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${spinAutoOpenWinnerTask ? "active" : ""}`}
                    onClick={() => handleToggle("spinAutoOpenWinnerTask")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Task Aging</span>
                  <span className="game-setting-label-hint">Interest increase per day (affects spin weighting)</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">{agingPerDay}</span>
                  <input
                    type="number"
                    step="0.5"
                    className="f-input game-number-input"
                    value={agingPerDay}
                    onChange={(e) => handleChange("agingPerDay", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
                <div className="game-setting-row" style={{ paddingTop: 0 }}>
                  <div className="game-setting-label">
                    <span className="game-setting-label-text">Spin Cooldown</span>
                    <span className="game-setting-label-hint">Limit spins to prevent overuse</span>
                  </div>
                  <div className="game-setting-control">
                    <div
                      className={`game-toggle ${spinCooldownEnabled ? "active" : ""}`}
                      onClick={() => handleToggle("spinCooldownEnabled")}
                    />
                  </div>
                </div>

                {spinCooldownEnabled && (
                  <div className="game-grid" style={{ marginTop: 10 }}>
                    <div className="game-grid-item">
                      <label className="game-grid-label">Spins Limit</label>
                      <input
                        type="number"
                        className="f-input"
                        min="1"
                        value={spinCooldownSpins}
                        onChange={(e) => handleChange("spinCooldownSpins", parseInt(e.target.value, 10) || 5)}
                      />
                    </div>
                    <div className="game-grid-item">
                      <label className="game-grid-label">Minutes</label>
                      <input
                        type="number"
                        className="f-input"
                        min="0"
                        value={spinCooldownMinutes}
                        onChange={(e) => handleChange("spinCooldownMinutes", parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    <div className="game-grid-item">
                      <label className="game-grid-label">Seconds</label>
                      <input
                        type="number"
                        className="f-input"
                        min="0"
                        max="59"
                        value={spinCooldownSeconds}
                        onChange={(e) => handleChange("spinCooldownSeconds", parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* Duel Settings Section */}
            <div id="game-section-duel" className="game-section">
              <div 
                className="game-section-header game-section-toggle"
                onClick={() => toggleGameSection('duel')}
              >
                <span className="game-section-icon">⚔️</span>
                <div style={{ flex: 1 }}>
                  <h4 className="game-section-title">Duel Settings</h4>
                  <div className="game-section-desc">Configure task dueling mechanics and weight adjustments</div>
                </div>
                <span className={`game-section-toggle-icon ${gameSections.duel ? "rotated" : ""}`}>▶</span>
              </div>
              <div className={gameSections.duel ? "game-section-expanded" : "game-section-collapsed"}>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Weight Classes</span>
                  <span className="game-setting-label-hint">Only match tasks with similar weights (within 10 points)</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.enableWeightClasses !== false ? "active" : ""}`}
                    onClick={() => handleToggle("enableWeightClasses")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Auto Advance</span>
                  <span className="game-setting-label-hint">Automatically start next duel after winner is chosen</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.duelAutoAdvance !== false ? "active" : ""}`}
                    onClick={() => handleToggle("duelAutoAdvance")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Action Bubbles</span>
                  <span className="game-setting-label-hint">Show action text bubbles (💥 BOOM!, 😢 OOF!, etc.)</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.duelShowActionBubbles !== false ? "active" : ""}`}
                    onClick={() => handleToggle("duelShowActionBubbles")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Win Boost</span>
                  <span className="game-setting-label-hint">Weight increase for the winning task</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">+{settings?.duelWinBoost ?? 10}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="1"
                    max="50"
                    value={settings?.duelWinBoost ?? 10}
                    onChange={(e) => handleChange("duelWinBoost", parseInt(e.target.value, 10) || 10)}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Loss Penalty</span>
                  <span className="game-setting-label-hint">Weight decrease for the losing task</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">-{settings?.duelLossPenalty ?? 5}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="1"
                    max="50"
                    value={settings?.duelLossPenalty ?? 5}
                    onChange={(e) => handleChange("duelLossPenalty", parseInt(e.target.value, 10) || 5)}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Max Weight</span>
                  <span className="game-setting-label-hint">Maximum weight value a task can reach</span>
                </div>
                <div className="game-setting-control">
                  <span className="game-setting-value">{settings?.weightMax ?? 100}</span>
                  <input
                    type="number"
                    className="f-input game-number-input"
                    min="10"
                    max="500"
                    value={settings?.weightMax ?? 100}
                    onChange={(e) => handleChange("weightMax", parseInt(e.target.value, 10) || 100)}
                  />
                </div>
              </div>
              </div>
            </div>

            {/* Feedback & Sounds Section */}
            <div id="game-section-feedback" className="game-section">
              <div 
                className="game-section-header game-section-toggle"
                onClick={() => toggleGameSection('feedback')}
              >
                <span className="game-section-icon">🔊</span>
                <div style={{ flex: 1 }}>
                  <h4 className="game-section-title">Feedback & Sounds</h4>
                  <div className="game-section-desc">Audio feedback and visual effects for task interactions</div>
                </div>
                <span className={`game-section-toggle-icon ${gameSections.feedback ? "rotated" : ""}`}>▶</span>
              </div>
              <div className={gameSections.feedback ? "game-section-expanded" : "game-section-collapsed"}>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Sound Effects</span>
                  <span className="game-setting-label-hint">Play sounds for task completion, spins, and other actions</span>
                </div>
                <div className="game-setting-control" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof SoundFX !== 'undefined') {
                        SoundFX.init();
                        SoundFX.resume();
                        // Play a sequence of sounds to test
                        SoundFX.playClick();
                        setTimeout(() => SoundFX.playComplete(), 200);
                        setTimeout(() => SoundFX.playWin(), 400);
                        safeNotify("Testing sounds...", "🔊");
                      } else {
                        safeNotify("Sound system not loaded", "⚠️");
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--primary)",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      transition: "all 0.2s",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                  >
                    🔊 Test
                  </button>
                  <div
                    className={`game-toggle ${settings?.sound !== false ? "active" : ""}`}
                    onClick={() => handleToggle("sound")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Subtle Sounds</span>
                  <span className="game-setting-label-hint">Very quiet ambient sounds for interactions (can be disabled separately)</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.subtleSounds !== false ? "active" : ""}`}
                    onClick={() => handleToggle("subtleSounds")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Confetti</span>
                  <span className="game-setting-label-hint">Celebrate task completions with confetti</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.confetti !== false ? "active" : ""}`}
                    onClick={() => handleToggle("confetti")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Explosion Effects</span>
                  <span className="game-setting-label-hint">Visual explosion effects for dramatic moments</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.explosion !== false ? "active" : ""}`}
                    onClick={() => handleToggle("explosion")}
                  />
                </div>
              </div>

              <div className="game-setting-row">
                <div className="game-setting-label">
                  <span className="game-setting-label-text">Haptic Feedback</span>
                  <span className="game-setting-label-hint">Vibration feedback on mobile devices</span>
                </div>
                <div className="game-setting-control">
                  <div
                    className={`game-toggle ${settings?.enableHaptics !== false ? "active" : ""}`}
                    onClick={() => handleToggle("enableHaptics")}
                  />
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {settingsView === "cats" &&
          (() => {
            const shownCount = catsFiltered.length;
            const totalCount = catsAll.length;

            return (
              <div className="fade-in-up">
                <div className="ttCatsPanel" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                  {/* Modern Header */}
                  <div className="ttCatsHeader" style={{ 
                    padding: "16px 20px", 
                    borderBottom: "1px solid var(--border)",
                    background: "var(--input-bg)"
                  }}>
                    <div className="ttCatsHeaderTop" style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 12
                    }}>
                      <div>
                        <div style={{ 
                          fontFamily: "Fredoka", 
                          fontSize: 20, 
                          fontWeight: 900, 
                          color: "var(--text)",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}>
                          <span style={{ fontSize: 20 }}>📁</span>
                          Categories
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-light)", opacity: 0.7 }}>
                          Click the circle to edit • Negative Score = No Spin
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setHideNoSpin((p) => !p)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: hideNoSpin ? "rgba(var(--primary-rgb, 255, 107, 53), 0.1)" : "transparent",
                            color: hideNoSpin ? "var(--primary)" : "var(--text)",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 600,
                            transition: "all 0.2s"
                          }}
                          title="Hide categories excluded from SpinTab"
                        >
                          <span style={{ 
                            width: 10, 
                            height: 10, 
                            borderRadius: 3, 
                            background: hideNoSpin ? "var(--primary)" : "rgba(255,255,255,0.18)" 
                          }} />
                          Hide No Spin
                        </button>

                        <div style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-light)"
                        }}>
                          <span style={{ color: "var(--text)", fontWeight: 900 }}>{shownCount}</span> shown
                        </div>

                        <div style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-light)"
                        }}>
                          <span style={{ color: "var(--text)", fontWeight: 900 }}>{totalCount}</span> total
                        </div>
                      </div>
                    </div>

                    {/* Input Row */}
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      gap: 8, 
                      alignItems: "stretch"
                    }}
                    className="ttCatsInputRow"
                    >
                      <div style={{ 
                        display: "flex", 
                        gap: 8, 
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}>
                        <input 
                          className="f-input" 
                          placeholder="New category name..." 
                          value={newCat} 
                          onChange={(e) => setNewCat(e.target.value)} 
                          onKeyDown={(e) => (e.key === "Enter" ? handleAddCategory() : null)}
                          style={{ 
                            flex: "1 1 200px",
                            minWidth: 0,
                            marginBottom: 0,
                            borderRadius: 8,
                            height: 40
                          }}
                        />
                        <button 
                          className="btn-orange" 
                          onClick={handleAddCategory}
                          style={{ 
                            height: 40,
                            borderRadius: 8,
                            fontWeight: 700,
                            padding: "0 20px",
                            flexShrink: 0,
                            minWidth: 80
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <input 
                        className="f-input" 
                        placeholder="🔍 Search..." 
                        value={catSearch} 
                        onChange={(e) => setCatSearch(e.target.value)}
                        style={{ 
                          width: "100%",
                          marginBottom: 0,
                          borderRadius: 8,
                          height: 40
                        }}
                      />
                    </div>
                  </div>

                  {/* Category Chips Grid */}
                  <div style={{ 
                    padding: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 8,
                    maxHeight: "calc(100vh - 300px)",
                    overflowY: "auto",
                    overflowX: "hidden"
                  }}
                  className="ttCatsChipGrid"
                  >
                        {catsFiltered.length === 0 ? (
                          <div style={{ 
                            gridColumn: "1 / -1",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            padding: 40,
                            color: "var(--text-light)",
                            opacity: 0.4,
                            fontSize: 13,
                            fontStyle: "italic"
                          }}>
                            empty
                          </div>
                        ) : (
                          catsFiltered.map((cat) => {
                            const xpVal = getXp(cat);
                            const multVal = getMult(cat);
                            const subs = getSubs(cat);
                            const penalty = xpVal < 0;
                            const isExpanded = expandedCat === cat;
                            const subDraft = newSubCatByParent?.[cat] || "";
                            const subPreview = subs.length ? subs.slice(0, 2).join(", ") + (subs.length > 2 ? ` +${subs.length - 2}` : "") : "No subcategories";
                            
                            return (
                              <div
                                key={cat}
                                style={{
                                  gridColumn: isExpanded ? "1 / -1" : "auto",
                                  border: `2px solid ${isExpanded ? "var(--primary)" : "rgba(255,255,255,0.12)"}`,
                                  background: isExpanded ? "rgba(var(--primary-rgb, 255, 107, 53), 0.15)" : "rgba(255,255,255,0.05)",
                                  borderRadius: 8,
                                  overflow: "visible",
                                  transition: "all 0.2s",
                                  boxShadow: isExpanded ? "0 4px 16px rgba(255, 107, 53, 0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
                                  position: "relative",
                                  zIndex: isExpanded ? 10 : 1
                                }}
                              >
                                {/* Category Chip - Compact */}
                                {!isExpanded && (
                                  <div
                                    onClick={() => {
                                      setExpandedCat(cat);
                                      setRenameDraft(cat);
                                      ensureCatsUiFor(cat);
                                    }}
                                    style={{
                                      padding: "8px 10px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4,
                                      cursor: "pointer",
                                      minHeight: 60
                                    }}
                                  >
                                    <div style={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      justifyContent: "space-between",
                                      gap: 6
                                    }}>
                                      <div style={{ 
                                        fontWeight: 700, 
                                        fontSize: 12, 
                                        color: "var(--text)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        flex: 1
                                      }}>
                                        {cat}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedCat(cat);
                                          setRenameDraft(cat);
                                          ensureCatsUiFor(cat);
                                        }}
                                        style={{
                                          width: 20,
                                          height: 20,
                                          borderRadius: "50%",
                                          border: "1px solid var(--primary)",
                                          background: "transparent",
                                          color: "var(--primary)",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: 10,
                                          flexShrink: 0,
                                          padding: 0
                                        }}
                                        title="Edit"
                                      >
                                        +
                                      </button>
                                    </div>
                                    
                                    <div style={{ 
                                      display: "flex", 
                                      gap: 4, 
                                      flexWrap: "wrap",
                                      alignItems: "center"
                                    }}>
                                      {penalty && (
                                        <span style={{
                                          fontSize: 8,
                                          fontWeight: 700,
                                          padding: "2px 6px",
                                          borderRadius: 4,
                                          background: "rgba(255,80,80,0.2)",
                                          color: "rgba(255,140,140,0.95)",
                                        }}>
                                          No Spin
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        background: "rgba(255,255,255,0.1)",
                                        color: "var(--text)",
                                      }}>
                                        {xpVal}
                                      </span>
                                      <span style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        background: "rgba(255,255,255,0.1)",
                                        color: "var(--text)",
                                      }}>
                                        {multVal}×
                                      </span>
                                      {subs.length > 0 && (
                                        <span style={{
                                          fontSize: 8,
                                          opacity: 0.7,
                                          color: "var(--text-light)",
                                        }}>
                                          {subs.length} sub
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Expanded Editor Content */}
                                {isExpanded && (
                                  <div 
                                    data-expanded-content
                                    onClick={(e) => e.stopPropagation()} 
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onPointerUp={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                  >
                                    {/* Expanded Header */}
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Toggle minimize when clicking header
                                        setMinimizedCats(prev => {
                                          const next = new Set(prev);
                                          if (next.has(cat)) {
                                            next.delete(cat);
                                          } else {
                                            next.add(cat);
                                          }
                                          return next;
                                        });
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      style={{
                                        padding: "10px 12px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        borderBottom: "1px solid var(--border)",
                                        background: "rgba(0,0,0,0.2)",
                                        cursor: "pointer"
                                      }}
                                    >
                                      <div style={{ 
                                        fontWeight: 700, 
                                        fontSize: 14, 
                                        color: "var(--text)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8
                                      }}>
                                        <span style={{ fontSize: 10, opacity: 0.6 }}>
                                          {minimizedCats.has(cat) ? '▶' : '▼'}
                                        </span>
                                        <span>{cat}</span>
                                      </div>
                                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMinimizedCats(prev => {
                                              const next = new Set(prev);
                                              if (next.has(cat)) {
                                                next.delete(cat);
                                              } else {
                                                next.add(cat);
                                              }
                                              return next;
                                            });
                                          }}
                                          style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: "50%",
                                            border: "1px solid var(--border)",
                                            background: "rgba(255,255,255,0.1)",
                                            color: "var(--text)",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 12,
                                            padding: 0
                                          }}
                                          title={minimizedCats.has(cat) ? "Expand" : "Minimize"}
                                        >
                                          {minimizedCats.has(cat) ? '⬇' : '⬆'}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedCat(null);
                                          }}
                                          style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: "50%",
                                            border: "1px solid var(--primary)",
                                            background: "var(--primary)",
                                            color: "#fff",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 14,
                                            padding: 0
                                          }}
                                          title="Close"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Editor Content */}
                                    {!minimizedCats.has(cat) && (
                                    <div style={{ 
                                      padding: "12px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 12,
                                      animation: "fadeIn 0.2s ease-in"
                                    }}>
                                      {/* Rename - No header, just inline */}
                                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                                        <input
                                          className="f-input"
                                          value={renameDraft}
                                          onChange={(e) => setRenameDraft(e.target.value)}
                                          onKeyDown={(e) => { if (e.key === "Enter") renameCategory(cat, renameDraft); }}
                                          placeholder="Category name"
                                          style={{ 
                                            flex: 1,
                                            marginBottom: 0,
                                            borderRadius: 6,
                                            height: 32,
                                            fontSize: 12
                                          }}
                                        />
                                        <button 
                                          className="btn-white-outline" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            renameCategory(cat, renameDraft);
                                          }}
                                          style={{ 
                                            height: 32,
                                            borderRadius: 6,
                                            fontWeight: 700,
                                            padding: "0 12px",
                                            fontSize: 12,
                                            flexShrink: 0
                                          }}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCategory(cat);
                                          }}
                                          title="Delete category"
                                          style={{ 
                                            height: 32, 
                                            width: 32,
                                            borderRadius: 6,
                                            fontSize: 14,
                                            padding: 0,
                                            border: "1px solid rgba(255,80,80,0.35)", 
                                            background: "transparent",
                                            color: "rgba(255,140,140,0.95)",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 0.2s",
                                            flexShrink: 0
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(255,80,80,0.1)";
                                            e.currentTarget.style.borderColor = "rgba(255,80,80,0.5)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.borderColor = "rgba(255,80,80,0.35)";
                                          }}
                                        >
                                          🗑️
                                        </button>
                                      </div>

                                  {/* Score + Multiplier - Always visible */}
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{ 
                                      padding: "10px",
                                      background: "rgba(255,255,255,0.03)",
                                      borderRadius: 6,
                                      border: "1px solid var(--border)"
                                    }}
                                  >
                                    <div style={{ 
                                      fontSize: 9, 
                                      fontWeight: 700, 
                                      color: "var(--text-light)",
                                      textTransform: "uppercase",
                                      letterSpacing: 0.5,
                                      marginBottom: 10,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6
                                    }}>
                                      SCORE & MULTIPLIER
                                      {penalty && (
                                        <span style={{ 
                                          color: "rgba(255,140,140,0.95)", 
                                          fontSize: 8,
                                          padding: "2px 4px",
                                          background: "rgba(255,80,80,0.15)",
                                          borderRadius: 3
                                        }}>
                                          (No Spin)
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* SCORE */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", minWidth: 50 }}>
                                        Score:
                                      </div>
                                      <input
                                        type="number"
                                        className="f-input"
                                        min={-10}
                                        max={10}
                                        step={1}
                                        style={{
                                          width: 100,
                                          marginBottom: 0,
                                          borderRadius: 6,
                                          height: 32,
                                          fontSize: 12,
                                          background: penalty ? "rgba(255,80,80,0.10)" : "var(--input-bg)",
                                          border: penalty ? "1px solid rgba(255,80,80,0.22)" : undefined,
                                          color: penalty ? "rgba(255,140,140,0.95)" : undefined,
                                        }}
                                        value={xpVal}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setCategoryXpAdjust(cat, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                      />
                                    </div>

                                    {/* MULT */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", minWidth: 50 }}>
                                        Mult:
                                      </div>
                                      <input
                                        type="number"
                                        className="f-input"
                                        min={0.5}
                                        max={2}
                                        step={0.05}
                                        style={{
                                          width: 100,
                                          marginBottom: 0,
                                          borderRadius: 6,
                                          height: 32,
                                          fontSize: 12
                                        }}
                                        value={multVal}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setCategoryMultiplier(cat, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>

                                  {/* Subcategories - Always visible */}
                                  <div style={{ 
                                    padding: "10px",
                                    background: "rgba(255,255,255,0.03)",
                                    borderRadius: 6,
                                    border: "1px solid var(--border)"
                                  }}>
                                    <div style={{ 
                                      fontSize: 9, 
                                      fontWeight: 700, 
                                      color: "var(--text-light)",
                                      textTransform: "uppercase",
                                      letterSpacing: 0.5,
                                      marginBottom: 8
                                    }}>
                                      SUBCATEGORIES ({subs.length})
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                                      <input
                                        className="f-input"
                                        style={{ 
                                          flex: 1,
                                          marginBottom: 0, 
                                          borderRadius: 6, 
                                          height: 32,
                                          fontSize: 12
                                        }}
                                        placeholder="Add subcategory"
                                        value={subDraft}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setNewSubCatByParent((p) => ({ ...(p || {}), [cat]: e.target.value }));
                                        }}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === "Enter") addSubCategory(cat);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <button 
                                        className="btn-white-outline" 
                                        style={{ 
                                          height: 32, 
                                          borderRadius: 6, 
                                          fontWeight: 700,
                                          padding: "0 12px",
                                          fontSize: 12,
                                          flexShrink: 0
                                        }} 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addSubCategory(cat);
                                        }}
                                      >
                                        Add
                                      </button>
                                    </div>

                                    {subs.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {subs.map((sub) => (
                                          <div 
                                            key={sub} 
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: 6,
                                              padding: "6px 10px",
                                              borderRadius: 8,
                                              background: "rgba(255,255,255,0.05)",
                                              border: "1px solid var(--border)",
                                              fontSize: 12,
                                              fontWeight: 600
                                            }}
                                          >
                                            <span>{sub}</span>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeSubCategory(cat, sub);
                                              }} 
                                              title="Remove subcategory"
                                              style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-light)",
                                                cursor: "pointer",
                                                fontSize: 16,
                                                lineHeight: 1,
                                                padding: 0,
                                                width: 18,
                                                height: 18,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderRadius: 4,
                                                transition: "all 0.2s"
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "rgba(255,80,80,0.2)";
                                                e.currentTarget.style.color = "#ff6b6b";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                                e.currentTarget.style.color = "var(--text-light)";
                                              }}
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 12, opacity: 0.65, padding: "8px 0" }}>No subcategories yet</div>
                                    )}
                                  </div>
                                    </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                  </div>
                </div>
              </div>
            );
          })()}

        {/* DATA TAB */}
        {settingsView === "data" && (
          <div className="fade-in-up">
            <h3 style={{ fontFamily: "Fredoka", fontSize: 18, marginBottom: 16 }}>💾 Data Management</h3>

            <div style={{ background: "var(--card)", padding: 12, borderRadius: 12, marginBottom: 24 }}>
              <button className="btn-white-outline" style={{ width: "100%", marginBottom: 12 }} onClick={onExport}>
                📥 Export Backup
              </button>

              <button className="btn-white-outline" style={{ width: "100%", marginBottom: 12 }} onClick={() => fileInputRef.current?.click()}>
                📤 Import Backup
              </button>

              <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={onImport} />

              <button className="btn-white-outline" style={{ width: "100%", borderColor: "var(--success)", color: "var(--success)" }} onClick={onLoadSamples}>
                🎲 Load Sample Data
              </button>
            </div>

            <h3 style={{ fontFamily: "Fredoka", fontSize: 18, marginBottom: 16, marginTop: 32 }}>⚡ Advanced / Power User Settings</h3>

            <div style={{ background: "var(--card)", padding: 12, borderRadius: 12, marginBottom: 24, borderLeft: "4px solid #8a2be2" }}>
              <h4 style={{ fontFamily: "Fredoka", fontSize: 14, marginBottom: 12, fontWeight: 600 }}>📊 History Filter Defaults</h4>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                Configure which activity types are included in the "Default" filter button in the Stats tab History section.
              </div>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={handleSelectAllHistoryDefaults}
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      color: 'var(--text)'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllHistoryDefaults}
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      color: 'var(--text)'
                    }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleResetHistoryDefaults}
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      color: 'var(--text)'
                    }}
                  >
                    Reset to Default
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                  {allPossibleHistoryTypes.map(type => {
                    const isSelected = selectedHistoryDefaults.includes(type);
                    return (
                      <label
                        key={type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          cursor: 'pointer',
                          borderRadius: 6,
                          background: isSelected ? 'rgba(138, 43, 226, 0.1)' : 'transparent',
                          border: isSelected ? '1px solid rgba(138, 43, 226, 0.3)' : '1px solid transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleHistoryDefaultTypeToggle(type)}
                          style={{ marginRight: 10 }}
                        />
                        <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400 }}>
                          {getHistoryTypeDisplayLabel(type)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(255, 107, 107, 0.1)", padding: 12, borderRadius: 12, border: "1px solid rgba(255, 107, 107, 0.3)" }}>
              <button className="btn-white-outline" style={{ width: "100%", borderColor: "#ff6b6b", color: "#ff6b6b" }} onClick={onFullReset}>
                🔄 Factory Reset
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('SettingsTabLegacy render error:', error);
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h3>Settings Error</h3>
        <p>Something went wrong. Please refresh the page.</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error?.message || 'Unknown error'}</p>
      </div>
    );
  }
}

