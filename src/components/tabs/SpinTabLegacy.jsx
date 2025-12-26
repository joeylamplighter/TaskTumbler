// js/features/13-03-spin.jsx
// Updated: 2025-12-22 (Split: UI + WinnerPopup moved to separate files)
// ===========================================
// SPIN TAB (CORE)
// Requires:
//  - js/features/13-03a-spin-ui.jsx        => window.SpinUI
//  - js/features/13-03b-spin-winner-popup.jsx => window.SpinWinnerPopup
// ===========================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { DateFilterButton, DurationFilterButton, MultiSelectButton, QuickCatDongle } from "./SpinUILegacy";
import WinnerPopup from "./SpinWinnerPopupLegacy";

  // -------------------------------------------
  // Category XP + Multiplier helpers
  // -------------------------------------------
  const getCatXpAdjust = (cat, settings) => {
    const v = settings?.categoryXpAdjust?.[cat];
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0; // can be negative
  };

  const getCatMultiplier = (cat, settings) => {
    const v = settings?.categoryMultipliers?.[cat];
    const n = Number(v);
    return Number.isFinite(n) ? n : 1;
  };

  // ✅ Category eligibility for SpinTab:
  // Rule: If a category has negative XP adjustment, it is NOT eligible for SpinTab.
  // (Also excludes categoryMultipliers < 0 as a safety rule.)
  const isSpinEligibleCategory = (cat, settings) => {
    const key = String(cat || "").trim();
    if (!key) return true;

    const adj = getCatXpAdjust(key, settings);
    if (Number.isFinite(adj) && adj < 0) return false;

    const mult = getCatMultiplier(key, settings);
    if (Number.isFinite(mult) && mult < 0) return false;

    return true;
  };

  // PHYSICS CURVES
  const SPIN_PHYSICS = {
    standard: "cubic-bezier(0.1, 0.7, 0.1, 1)",
    snappy: "cubic-bezier(0.23, 1, 0.32, 1)",
    elastic: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    mystery: "cubic-bezier(0.6, -0.28, 0.735, 0.045)",
    ratchet: "steps(50, end)",
  };

  // ---------- HELPERS ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

  const parseDueDate = (t) => {
    try {
      if (!t) return null;
      const raw =
        t.dueAt ??
        t.due ??
        t.dueDate ??
        t.dueDateTime ??
        t.dueISO ??
        t.due_date ??
        t.due_time ??
        null;
      if (!raw) return null;
      if (typeof raw === "number") return isValidDate(new Date(raw)) ? new Date(raw) : null;
      if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return null;
        if (/^\d+$/.test(s)) {
          const n = parseInt(s, 10);
          return isValidDate(new Date(n)) ? new Date(n) : null;
        }
        return isValidDate(new Date(s)) ? new Date(s) : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const dueMatches = (task, filterDue) => {
    if (!filterDue || filterDue === "Any") return true;
    const due = parseDueDate(task);
    if (!due) return false;
    const now = new Date();
    const diffDays = Math.round((dayStart(due).getTime() - dayStart(now).getTime()) / 86400000);
    if (filterDue === "Overdue") return diffDays < 0;
    if (filterDue === "Today") return diffDays === 0;
    if (filterDue === "Tomorrow") return diffDays === 1;
    if (filterDue === "This Week") return diffDays >= 0 && diffDays <= 7;
    if (filterDue === "Next Week") return diffDays > 7 && diffDays <= 14;
    if (filterDue === "This Month") return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
    return true;
  };

  const computeWeight = (t, settings, useWeighted = true) => {
    if (!useWeighted || !settings) return 10;
    const base = parseInt(t?.weight, 10);
    let w = Number.isFinite(base) ? base : 10;

    const priMult = settings?.priorityMultipliers?.[t?.priority] ?? 1;
    const catMult = settings?.categoryMultipliers?.[t?.category] ?? 1;

    const result = w * priMult * catMult;
    return Number.isFinite(result) ? result : 10;
  };

  const pickWeightedIndex = (items, weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return Math.floor(Math.random() * items.length);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  // ===========================================
  // MAIN COMPONENT
  // ===========================================
  export default function SpinTabLegacy({
    tasks,
    categories,
    onView,
    onFocus,
    onAdd,
    onEdit,
    onComplete,
    settings,
    notify,
    OpenAdd,
    openAdd,
    onStartTimer,
    addActivity,
  }) {
    // SURGICAL FIX: Directly using settings prop for duration and style lookups
    const spinDurationSec = Number.isFinite(parseInt(settings?.duration, 10)) ? parseInt(settings.duration, 10) : 3;
    const activeCurve = SPIN_PHYSICS[settings?.spinStyle] || SPIN_PHYSICS.standard;

    const spinShowWinnerPopup = settings?.spinShowWinnerPopup !== false;
    const spinAutoOpenWinnerTask = !!settings?.spinAutoOpenWinnerTask;
    const spinUseWeighted = settings?.spinUseWeighted !== false;

    const spinCooldownEnabled = !!settings?.spinCooldownEnabled;
    const spinCooldownSpins = Math.max(1, parseInt(settings?.spinCooldownSpins, 10) || 5);

    const rawMin = parseInt(settings?.spinCooldownMinutes, 10);
    const spinCooldownMinutes = Number.isFinite(rawMin) ? rawMin : 0;

    const rawSec = parseInt(settings?.spinCooldownSeconds, 10);
    const spinCooldownSeconds = Number.isFinite(rawSec) ? rawSec : 0;

    const [activeMode, setActiveMode] = useState(() => localStorage.getItem("tt_spin_mode") || "add");
    const [showToolbar, setShowToolbar] = useState(() => localStorage.getItem("tt_spin_show_toolbar") !== "false");
    useEffect(() => localStorage.setItem("tt_spin_show_toolbar", showToolbar), [showToolbar]);

    const [bulkMode, setBulkMode] = useState(false);
    const [aiMode, setAiMode] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [quickText, setQuickText] = useState("");
    const [winner, setWinner] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [showWinner, setShowWinner] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const isRespinRef = useRef(false); // Track if this is a respin
    const [isLocked, setIsLocked] = useState(false);

    const stripRef = useRef(null);
    const spinTokenRef = useRef(0);
    const tickIntervalRef = useRef(null);

    const [filterDue, setFilterDue] = useState("Any");
    const [filterDuration, setFilterDuration] = useState("Any");
    const [filterCats, setFilterCats] = useState([]);
    const [filterPriorities, setFilterPriorities] = useState([]);
    const [filterWeight, setFilterWeight] = useState("Any");
    const [filterHasNotes, setFilterHasNotes] = useState(false);
    const [filterHasSubtasks, setFilterHasSubtasks] = useState(false);
    const [filterHasDueDate, setFilterHasDueDate] = useState(false);
    const [filterHasPeople, setFilterHasPeople] = useState(false);
    const [filterHasLocations, setFilterHasLocations] = useState(false);
    const [showDetailedFilters, setShowDetailedFilters] = useState(false);

    // localCategories = union(categories prop, storage categories)
    const [localCategories, setLocalCategories] = useState(() => {
      try {
        const s = JSON.parse(localStorage.getItem("categories") || "[]");
        return Array.from(new Set([...(categories || []), ...s])).filter(Boolean);
      } catch {
        return categories || [];
      }
    });

    useEffect(() => {
      if (Array.isArray(categories)) {
        setLocalCategories((p) => Array.from(new Set([...(categories || []), ...(p || [])])).filter(Boolean));
      }
    }, [categories]);

    // ✅ Categories visible to SpinTab (penalty categories excluded)
    const visibleCategories = useMemo(() => {
      return (localCategories || []).filter((c) => isSpinEligibleCategory(c, settings));
    }, [localCategories, settings]);

    const defaultCategory = useMemo(() => {
      return visibleCategories.length ? visibleCategories[0] : "General";
    }, [visibleCategories]);

    const [quickCat, setQuickCat] = useState(defaultCategory);

    // keep quickCat valid if settings/categories change
    useEffect(() => {
      if (!isSpinEligibleCategory(quickCat, settings)) setQuickCat(defaultCategory);
    }, [quickCat, settings, defaultCategory]);

    // ✅ HELPER: Shared focus trigger
    const requestFocus = (task, source = "spin") => {
      if (typeof onFocus !== "function") return;
      try {
        onFocus(task, source);
      } catch (e) {
        onFocus(task);
      }
    };

    // --- QUICK ADD ---
    const handleQuickAdd = () => {
      try {
        const title = (quickText || "").trim();
        if (!title) return;

        const proposed = (quickCat || defaultCategory || "General").trim();
        const cat = isSpinEligibleCategory(proposed, settings) ? proposed : defaultCategory;

        onAdd?.({ title, category: cat });
        setQuickText("");
        // Don't notify here - addTask already sends "Task Added" notification
      } catch (e) {
        console.error("SpinTab handleQuickAdd failed:", e);
        notify?.("Quick Add failed", "❌");
      }
    };

    // Cooldown history helpers
    const COOLDOWN_KEY = "tt_spin_history_v2";
    const getSpinHistory = () => {
      try {
        return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || "[]");
      } catch {
        return [];
      }
    };
    const saveSpinHistory = (arr) => {
      try {
        localStorage.setItem(COOLDOWN_KEY, JSON.stringify(arr));
      } catch {}
    };

    const updateCooldownStatus = () => {
      if (!spinCooldownEnabled) {
        setIsLocked(false);
        setCooldownRemaining(0);
        return;
      }
      const now = Date.now();
      const windowMs = spinCooldownMinutes * 60 * 1000 + spinCooldownSeconds * 1000;
      const safeWindowMs = windowMs > 0 ? windowMs : 10000; // minimum window
      let history = getSpinHistory();
      history = history.filter((ts) => now - ts < safeWindowMs);
      saveSpinHistory(history);

      if (history.length >= spinCooldownSpins) {
        const oldest = history[0];
        const unlockTime = oldest + safeWindowMs;
        const remainingMs = unlockTime - now;
        if (remainingMs > 0) {
          setIsLocked(true);
          setCooldownRemaining(Math.ceil(remainingMs / 1000));
        } else {
          setIsLocked(false);
          setCooldownRemaining(0);
        }
      } else {
        setIsLocked(false);
        setCooldownRemaining(0);
      }
    };

    const recordSpin = () => {
      if (!spinCooldownEnabled) return;
      const history = getSpinHistory();
      history.push(Date.now());
      saveSpinHistory(history);
      updateCooldownStatus();
    };

    useEffect(() => {
      updateCooldownStatus();
      const timer = setInterval(updateCooldownStatus, 1000);
      return () => clearInterval(timer);
    }, [spinCooldownEnabled, spinCooldownSpins, spinCooldownMinutes, spinCooldownSeconds, spinning]);

    const openWinnerPopup = () => setShowWinner(true);
    const closeWinnerPopup = () => {
      setShowWinner(false);
      setSpinning(false); // Ensure spinning is stopped when popup closes
    };

    useEffect(() => {
      const onKeyDown = (e) => {
        if (e.key === "Escape") closeWinnerPopup();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const glowStyle = (active) => ({
      background: active ? "rgba(var(--primary-rgb, 255, 107, 53), 0.1)" : "transparent",
      border: "none", 
      cursor: "pointer", 
      display: "inline-flex",
      alignItems: "center", 
      justifyContent: "center", 
      transition: "all 0.2s ease",
      color: active ? "var(--primary)" : "rgba(255, 255, 255, 0.7)",
      borderRadius: 8,
      fontSize: "16px", 
      lineHeight: 1, 
      padding: "6px 8px",
      minWidth: 36,
      height: 36,
      position: "relative"
    });

    // ✅ POOL (penalty categories excluded)
    const pool = useMemo(() => {
      const list = (tasks || []).filter((t) => {
        if (window.canEnterTumbler && !window.canEnterTumbler(t)) return false;

        // ✅ penalty categories never enter SpinTab pool
        if (!isSpinEligibleCategory(t?.category, settings)) return false;

        if (filterCats.length && !filterCats.includes(t.category)) return false;
        if (filterPriorities.length && !filterPriorities.includes(t.priority)) return false;
        if (!dueMatches(t, filterDue)) return false;

        if (filterDuration !== "Any") {
          const est = parseInt(t.estimatedTime, 10) || 0;
          if (filterDuration === "< 5m" && (est === 0 || est >= 5)) return false;
          if (filterDuration === "< 15m" && (est === 0 || est >= 15)) return false;
          if (filterDuration === "< 30m" && (est === 0 || est >= 30)) return false;
          if (filterDuration === "< 60m" && (est === 0 || est >= 60)) return false;
          if (filterDuration === "> 1h" && est < 60) return false;
          if (filterDuration === "None" && est > 0) return false;
        }

        // Weight filter
        if (filterWeight !== "Any") {
          const w = parseInt(t.weight, 10) || 10;
          if (filterWeight === "Low" && w > 10) return false;
          if (filterWeight === "Med" && (w < 11 || w > 25)) return false;
          if (filterWeight === "High" && (w < 26 || w > 50)) return false;
          if (filterWeight === "Max" && w < 50) return false;
        }

        // Toggle filters
        if (filterHasNotes && !(t.notes && t.notes.trim())) return false;
        if (filterHasSubtasks && !(t.subtasks && t.subtasks.length > 0)) return false;
        if (filterHasDueDate && !t.dueDate) return false;
        if (filterHasPeople && !(t.people && t.people.length > 0)) return false;
        if (filterHasLocations && !(t.location || (t.locations && t.locations.length > 0))) return false;

        return true;
      });
      return list;
    }, [tasks, filterCats, filterPriorities, filterDue, filterDuration, filterWeight, filterHasNotes, filterHasSubtasks, filterHasDueDate, filterHasPeople, filterHasLocations, settings]);

    // Stats for odds display
    const stats = useMemo(() => {
      if (!pool || pool.length === 0) return { topChance: 0 };
      const weights = pool.map((t) => computeWeight(t, settings, spinUseWeighted));
      let total = 0;
      for (let i = 0; i < weights.length; i++) total += weights[i] || 0;

      let topIdx = 0;
      let topW = weights[0] || 0;
      for (let i = 1; i < weights.length; i++) {
        if ((weights[i] || 0) > topW) {
          topW = weights[i] || 0;
          topIdx = i;
        }
      }
      const topChance = total > 0 ? Math.round((topW / total) * 100) : 0;
      if (!spinUseWeighted) return { topChance: Math.round(100 / pool.length), topIdx: 0 };
      return { topChance, topIdx };
    }, [pool, settings, spinUseWeighted]);

    // --- BULK IMPORT ---
    const handleBulkImport = async () => {
      const text = (bulkText || "").trim();
      if (!text) return;

      if (aiMode) {
        if (!settings?.geminiApiKey) {
          notify?.("Missing Gemini API Key in Settings", "❌");
          return;
        }
        if (!window.callGemini) {
          notify?.("AI Service Not Loaded", "❌");
          return;
        }

        notify?.("AI Processing...", "🧠");
        const catStr = (visibleCategories || []).join(", ");
        const prompt = `Analyze this text and extract tasks. Return a JSON array of objects with: title, category (one of: ${catStr}), priority (Low/Medium/High/Urgent), estimatedTime (minutes). Text: "${text}"`;

        try {
          const res = await window.callGemini(prompt, settings.geminiApiKey);
          if (res && res.text) {
            const parsedTasks = window.parseAITasks ? window.parseAITasks(res.text, visibleCategories) : [];
            if (parsedTasks.length > 0) {
              parsedTasks.forEach((t) => {
                const cat = isSpinEligibleCategory(t?.category, settings) ? t.category : defaultCategory;
                onAdd?.({ ...t, category: cat });
              });
              setBulkText("");
              setBulkMode(false);
              notify?.(`AI Added ${parsedTasks.length} Tasks`, "✅");
            } else {
              notify?.("AI found no tasks", "⚠️");
            }
          } else {
            throw new Error(res?.error || "Unknown AI error");
          }
        } catch (e) {
          console.error(e);
          notify?.("AI Failed: " + e.message, "❌");
        }
      } else {
        text.split("\n").forEach((l) => {
          const v = (l || "").trim();
          if (v) onAdd?.({ title: v, category: defaultCategory });
        });
        setBulkText("");
        setBulkMode(false);
        notify?.("Tasks Imported", "📦");
      }
    };

    // ----- SPIN LOGIC -----
    const ITEM_H = 50;
    const VISIBLE_H = 160;
    const CENTER_OFFSET = VISIBLE_H / 2 - ITEM_H / 2;

    const buildStripItems = useMemo(() => {
      if (!pool.length) return [];
      const repeats = 22;
      const out = [];
      for (let r = 0; r < repeats; r++) {
        for (let i = 0; i < pool.length; i++) out.push(pool[i]);
      }
      return out;
    }, [pool]);

    const resetStripInstant = () => {
      const el = stripRef.current;
      if (!el) return;
      el.style.transition = "none";
      el.style.transform = "translateY(0px)";
      void el.offsetHeight;

      if (spinDurationSec > 0) {
        el.style.transition = `transform ${spinDurationSec}s ${activeCurve}`;
      }
    };

    useEffect(() => {
      resetStripInstant();
      setWinner(null);
      setSpinning(false);
      // Clean up tick interval when filters change
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }, [filterDue, filterCats, filterPriorities, filterDuration, pool.length, spinDurationSec, settings?.spinStyle]);

    // Cleanup on unmount and when winner popup closes
    useEffect(() => {
      return () => {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        setSpinning(false);
      };
    }, []);
    
    // Also cleanup when showWinner changes (popup closes)
    useEffect(() => {
      if (!showWinner && spinning) {
        // Clean up if winner popup closes while still spinning (shouldn't happen, but safety)
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        setSpinning(false);
      }
    }, [showWinner, spinning]);

    const doSpin = () => {
      if (spinning) return;
      if (isLocked) {
        notify?.(`Cooldown! Wait ${cooldownRemaining}s`, "⏳");
        return;
      }
      if (!pool.length) {
        notify?.("No tasks in pool", "⚠️");
        return;
      }

      // Reset respin flag after using it (will be set again if respin button clicked)
      const wasRespin = isRespinRef.current;
      if (!wasRespin) {
        isRespinRef.current = false; // Ensure it's false for new spins
      }

      recordSpin();
      const token = ++spinTokenRef.current;
      setSpinning(true);
      setWinner(null);

      const weights = pool.map((t) => computeWeight(t, settings, spinUseWeighted));
      const chosenPoolIdx = pickWeightedIndex(pool, weights);
      const chosen = pool[chosenPoolIdx];

      const minLandingRow = Math.max(pool.length * 6, 40);
      const maxLandingRow = Math.max(pool.length * 18, minLandingRow + pool.length * 2);
      const candidates = [];
      for (let i = minLandingRow; i < buildStripItems.length; i++) {
        if (buildStripItems[i] === chosen) candidates.push(i);
        if (i >= maxLandingRow && candidates.length) break;
      }

      let landingRow = candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : clamp(
            Math.floor(minLandingRow + Math.random() * (maxLandingRow - minLandingRow + 1)),
            0,
            buildStripItems.length - 1
          );

      const extra = Math.floor(Math.random() * Math.max(1, pool.length));
      landingRow = clamp(landingRow + extra, 0, buildStripItems.length - 1);

      const el = stripRef.current;
      if (!el) {
        finalizeSpin(chosen);
        return;
      }

      resetStripInstant();
      const targetY = -landingRow * ITEM_H + CENTER_OFFSET;

      // Play tick sounds during spin animation (subtle sounds)
      if (spinDurationSec > 0 && typeof SoundFX !== 'undefined' && settings?.sound !== false && settings?.subtleSounds !== false) {
        SoundFX.init();
        SoundFX.resume();
        // Clear any existing interval
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        // Play tick sounds at regular intervals during the spin
        // Interval adapts to spin duration: faster ticks for shorter spins
        const tickIntervalMs = Math.max(50, Math.min(200, spinDurationSec * 20));
        tickIntervalRef.current = setInterval(() => {
          if (token !== spinTokenRef.current) {
            if (tickIntervalRef.current) {
              clearInterval(tickIntervalRef.current);
              tickIntervalRef.current = null;
            }
            return;
          }
          SoundFX.playTick();
        }, tickIntervalMs);
      }

      requestAnimationFrame(() => {
        if (token !== spinTokenRef.current) {
          if (tickIntervalRef.current) {
            clearInterval(tickIntervalRef.current);
            tickIntervalRef.current = null;
          }
          return;
        }
        if (spinDurationSec === 0) el.style.transition = "none";
        else el.style.transition = `transform ${spinDurationSec}s ${activeCurve}`;
        el.style.transform = `translateY(${targetY}px)`;
      });

      const onEnd = (e) => {
        if (e?.propertyName && e.propertyName !== "transform") return;
        el.removeEventListener("transitionend", onEnd);
        if (token !== spinTokenRef.current) {
          if (tickIntervalRef.current) {
            clearInterval(tickIntervalRef.current);
            tickIntervalRef.current = null;
          }
          return;
        }
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        finalizeSpin(chosen);
      };

      if (spinDurationSec === 0) {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        setTimeout(() => finalizeSpin(chosen), 50);
      } else {
        el.addEventListener("transitionend", onEnd, { once: true });
      }
    };

    const finalizeSpin = (chosenTask) => {
      // Clean up tick interval
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      
      setWinner(chosenTask);
      setSpinning(false);

      if (typeof SoundFX !== 'undefined' && settings?.sound !== false) {
        SoundFX.playWin();
      }
      if (settings?.confetti && typeof window.fireSmartConfetti === "function") {
        window.fireSmartConfetti('celebration', settings);
      }

      notify?.(`🎯 ${chosenTask?.title || "Winner!"}`, "🎉");

      // ✅ LOG SPIN RESULT TO ACTIVITIES/HISTORY
      if (chosenTask && typeof addActivity === "function") {
        try {
          const now = new Date().toISOString();
          const activity = {
            // DataManager normalizeActivity expects: title (or name), category, duration, type, taskId, createdAt
            // IMPORTANT: type must be explicitly set and not empty string
            id: window.generateId ? window.generateId("act") : "act_" + Date.now() + "_" + Math.random().toString(36).slice(2),
            title: chosenTask.title || "Untitled Task",
            category: chosenTask.category || "General",
            duration: 0,
            type: isRespinRef.current ? "respin" : "spin", // Track if this is a respin or initial spin
            taskId: chosenTask.id,
            people: Array.isArray(chosenTask.people) ? chosenTask.people : [],
            location: chosenTask.location || '',
            createdAt: now,
            timestamp: now, // Also include timestamp for compatibility
            priority: chosenTask.priority || "Medium",
          };
          console.log("🎰 Logging spin activity:", JSON.stringify(activity, null, 2));
          const result = addActivity(activity);
          console.log("🎰 Activity add result:", result);
        } catch (e) {
          console.error("Failed to log spin activity:", e);
        }
      } else {
        console.warn("⚠️ addActivity not available in SpinTab", { addActivity: typeof addActivity });
      }

      // Also log to TaskEvents if available
      if (chosenTask && window.TaskEvents && typeof window.TaskEvents.log === "function") {
        try {
          window.TaskEvents.log(chosenTask, "spin_result", {
            category: chosenTask.category,
            priority: chosenTask.priority,
          });
        } catch (e) {
          console.error("Failed to log spin to TaskEvents:", e);
        }
      }

      // Reset respin flag after logging
      isRespinRef.current = false;

      if (spinAutoOpenWinnerTask) {
        setWinner(null);
        setShowWinner(false);
        requestFocus(chosenTask, "spin");
      } else {
        if (spinShowWinnerPopup) setShowWinner(true);
      }
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {showToolbar && (
          <div
            style={{
              height: "56px",
              background: "var(--card)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
              gap: 8,
              marginBottom: 12
            }}
          >
            {/* LEFT: Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                style={glowStyle(bulkMode)} 
                onClick={() => setBulkMode(!bulkMode)} 
                title="Bulk Import"
                onMouseEnter={(e) => !bulkMode && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => !bulkMode && (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>📦</span>
              </button>
              <button 
                style={glowStyle(false)} 
                onClick={() => (openAdd || OpenAdd)?.()} 
                title="Full Add Task"
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>➕</span>
              </button>
            </div>

            <div style={{ width: 1, height: 24, background: "var(--border)", opacity: 0.2, borderRadius: 1 }} />

            {/* MODE TOGGLES */}
            <div style={{ display: "flex", gap: 4, background: "var(--input-bg)", borderRadius: 8, padding: 2 }}>
              <button 
                style={{
                  ...glowStyle(activeMode === "add"),
                  background: activeMode === "add" ? "var(--primary)" : "transparent",
                  color: activeMode === "add" ? "#fff" : "rgba(255,255,255,0.7)",
                  minWidth: 40,
                  height: 32,
                  borderRadius: 6,
                  fontSize: 16,
                  lineHeight: 1
                }} 
                onClick={() => setActiveMode("add")} 
                title="Quick Add"
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>⚡</span>
              </button>
              <button 
                style={{
                  ...glowStyle(activeMode === "filter"),
                  background: activeMode === "filter" ? "var(--primary)" : "transparent",
                  color: activeMode === "filter" ? "#fff" : "rgba(255,255,255,0.7)",
                  minWidth: 40,
                  height: 32,
                  borderRadius: 6,
                  fontSize: 16,
                  lineHeight: 1
                }} 
                onClick={() => setActiveMode("filter")} 
                title="Filters"
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>🔍</span>
              </button>
            </div>

            <div style={{ width: 1, height: 24, background: "var(--border)", opacity: 0.2, borderRadius: 1 }} />

            {/* CENTER: Input/Filter Area */}
            <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", minWidth: 0 }}>
              {activeMode === "add" ? (
                <div style={{ 
                  display: "flex", 
                  width: "100%", 
                  alignItems: "center", 
                  gap: 6,
                  height: "40px",
                  background: "var(--input-bg)",
                  borderRadius: 10,
                  paddingLeft: 6,
                  paddingRight: 6,
                  border: "1px solid rgba(255,255,255,0.05)",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "rgba(var(--primary-rgb, 255, 107, 53), 0.3)"}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
                >
                  {QuickCatDongle ? (
                    <QuickCatDongle
                      value={quickCat}
                      onChange={setQuickCat}
                      categories={visibleCategories}
                      defaultCat={defaultCategory}
                    />
                  ) : null}

                  <input
                    className="f-input"
                    style={{ 
                      background: "transparent", 
                      border: "none", 
                      margin: 0, 
                      flex: 1, 
                      height: "100%",
                      padding: "0 4px",
                      fontSize: 14,
                      color: "var(--text)",
                      outline: "none"
                    }}
                    placeholder="Quick add task..."
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd();
                    }}
                  />

                  {quickText ? (
                    <button
                      onClick={handleQuickAdd}
                      style={{
                        background: "var(--primary)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 12px",
                        height: 28,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    >
                      Add
                    </button>
                  ) : null}
                </div>
              ) : (
                <div 
                  className="filter-buttons-container"
                  style={{ 
                    display: "flex", 
                    gap: 3, 
                    alignItems: "flex-end",
                    alignContent: "flex-end",
                    flexWrap: "nowrap",
                    height: "100%",
                    padding: "4px 0",
                    overflowX: "auto",
                    overflowY: "hidden",
                    minWidth: 0,
                    scrollbarWidth: "none",
                    msOverflowStyle: "none"
                  }}
                >
                  {DateFilterButton ? <DateFilterButton value={filterDue} onChange={setFilterDue} /> : null}

                  {MultiSelectButton ? (
                    <MultiSelectButton
                      icon="📁"
                      title="Category"
                      options={visibleCategories}
                      selected={filterCats}
                      onChange={setFilterCats}
                    />
                  ) : null}

                  {DurationFilterButton ? <DurationFilterButton value={filterDuration} onChange={setFilterDuration} /> : null}

                  {MultiSelectButton ? (
                    <MultiSelectButton
                      icon="🚨"
                      title="Priority"
                      options={["Low", "Medium", "High", "Urgent"]}
                      selected={filterPriorities}
                      onChange={setFilterPriorities}
                    />
                  ) : null}

                  {/* Detailed Filters Button - Next to Priority */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDetailedFilters(true);
                    }}
                    style={{
                      position: "relative",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      padding: 8,
                      borderRadius: 8,
                      color: (filterDue !== "Any" || filterDuration !== "Any" || filterWeight !== "Any" || filterCats.length > 0 || filterPriorities.length > 0 || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations) ? "var(--primary)" : "var(--text)",
                      textShadow: (filterDue !== "Any" || filterDuration !== "Any" || filterWeight !== "Any" || filterCats.length > 0 || filterPriorities.length > 0 || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations) ? "0 0 8px var(--primary)" : "none",
                      filter: (filterDue !== "Any" || filterDuration !== "Any" || filterWeight !== "Any" || filterCats.length > 0 || filterPriorities.length > 0 || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations) ? "drop-shadow(0 0 2px var(--primary))" : "none",
                      transition: "all 0.2s ease",
                      outline: "none",
                      boxShadow: "none",
                      userSelect: "none",
                      flexShrink: 0,
                      alignSelf: "flex-end"
                    }}
                    title="Detailed Filters"
                    onMouseEnter={(e) => {
                      const hasActive = filterDue !== "Any" || filterDuration !== "Any" || filterWeight !== "Any" || filterCats.length > 0 || filterPriorities.length > 0 || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations;
                      if (!hasActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      const hasActive = filterDue !== "Any" || filterDuration !== "Any" || filterWeight !== "Any" || filterCats.length > 0 || filterPriorities.length > 0 || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations;
                      if (!hasActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    ⚙️
                    {(filterDue !== "Any" || filterDuration !== "Any" || filterWeight !== "Any" || filterCats.length > 0 || filterPriorities.length > 0 || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations) && (
                      <span style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        background: "var(--primary)",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 800,
                        minWidth: 14,
                        height: 14,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid var(--card)",
                        pointerEvents: "none",
                        textShadow: "none",
                        filter: "none"
                      }}>
                        {(filterCats.length > 0 ? 1 : 0) + (filterPriorities.length > 0 ? 1 : 0) + (filterDue !== "Any" ? 1 : 0) + (filterDuration !== "Any" ? 1 : 0) + (filterWeight !== "Any" ? 1 : 0) + (filterHasNotes ? 1 : 0) + (filterHasSubtasks ? 1 : 0) + (filterHasDueDate ? 1 : 0) + (filterHasPeople ? 1 : 0) + (filterHasLocations ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Filters Modal */}
        {showDetailedFilters && createPortal(
          <div 
            onClick={() => setShowDetailedFilters(false)} 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.6)', 
              zIndex: 999999, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 16, 
              backdropFilter: 'blur(4px)' 
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              style={{
                background: 'var(--card)',
                borderRadius: 16,
                border: '1px solid var(--border)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                maxWidth: 500,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid var(--border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'var(--input-bg)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🎛️</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>Detailed Filters</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowDetailedFilters(false)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: 24, 
                    cursor: 'pointer', 
                    color: 'var(--text-light)', 
                    lineHeight: 1,
                    padding: 0,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ 
                padding: '16px 20px', 
                overflowY: 'auto',
                flex: 1
              }}>
                {/* Filter Sections */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    📅 Due Date
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Any', 'Overdue', 'Now', 'Tomorrow', 'Week', 'Month'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFilterDue(opt)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: filterDue === opt ? 700 : 500,
                          cursor: 'pointer',
                          background: filterDue === opt ? 'var(--primary)' : 'transparent',
                          color: filterDue === opt ? '#fff' : 'var(--text)',
                          border: filterDue === opt ? '1px solid var(--primary)' : '1px solid var(--border)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    ⏱️ Duration
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Any', '< 5m', '< 15m', '< 30m', '< 60m', '> 1h', 'None'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFilterDuration(opt)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: filterDuration === opt ? 700 : 500,
                          cursor: 'pointer',
                          background: filterDuration === opt ? 'var(--primary)' : 'transparent',
                          color: filterDuration === opt ? '#fff' : 'var(--text)',
                          border: filterDuration === opt ? '1px solid var(--primary)' : '1px solid var(--border)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={filterCats.length === visibleCategories.length && visibleCategories.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterCats([...visibleCategories]);
                          } else {
                            setFilterCats([]);
                          }
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                      <span>📁 Category</span>
                    </label>
                    {filterCats.length > 0 && filterCats.length < visibleCategories.length && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-light)', marginLeft: 'auto' }}>
                        {filterCats.length} selected
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {visibleCategories.map(cat => {
                      const isSelected = filterCats.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFilterCats(filterCats.filter(c => c !== cat));
                            } else {
                              setFilterCats([...filterCats, cat]);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? '#fff' : 'var(--text)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={filterPriorities.length === 4}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterPriorities(['Low', 'Medium', 'High', 'Urgent']);
                          } else {
                            setFilterPriorities([]);
                          }
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                      <span>🚨 Priority</span>
                    </label>
                    {filterPriorities.length > 0 && filterPriorities.length < 4 && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-light)', marginLeft: 'auto' }}>
                        {filterPriorities.length} selected
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Low', 'Medium', 'High', 'Urgent'].map(pri => {
                      const isSelected = filterPriorities.includes(pri);
                      return (
                        <button
                          key={pri}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFilterPriorities(filterPriorities.filter(p => p !== pri));
                            } else {
                              setFilterPriorities([...filterPriorities, pri]);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? '#fff' : 'var(--text)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {pri}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weight Filter */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    ⚖️ Weight
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Any', 'Low', 'Med', 'High', 'Max'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFilterWeight(opt)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: filterWeight === opt ? 700 : 500,
                          cursor: 'pointer',
                          background: filterWeight === opt ? 'var(--primary)' : 'transparent',
                          color: filterWeight === opt ? '#fff' : 'var(--text)',
                          border: filterWeight === opt ? '1px solid var(--primary)' : '1px solid var(--border)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Filters */}
                <div style={{ 
                  marginTop: 8, 
                  marginBottom: 16,
                  background: 'var(--input-bg)', 
                  borderRadius: 8, 
                  padding: '8px 12px'
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    Additional Filters
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>📝</span> Has Notes
                      </span>
                      <input
                        type="checkbox"
                        checked={filterHasNotes}
                        onChange={(e) => setFilterHasNotes(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>☑️</span> Has Subtasks
                      </span>
                      <input
                        type="checkbox"
                        checked={filterHasSubtasks}
                        onChange={(e) => setFilterHasSubtasks(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>📆</span> Has Due Date
                      </span>
                      <input
                        type="checkbox"
                        checked={filterHasDueDate}
                        onChange={(e) => setFilterHasDueDate(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>👥</span> Has People
                      </span>
                      <input
                        type="checkbox"
                        checked={filterHasPeople}
                        onChange={(e) => setFilterHasPeople(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>📍</span> Has Location
                      </span>
                      <input
                        type="checkbox"
                        checked={filterHasLocations}
                        onChange={(e) => setFilterHasLocations(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer',
                          accentColor: 'var(--primary)'
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                padding: '12px 20px', 
                borderTop: '1px solid var(--border)', 
                display: 'flex', 
                gap: 8, 
                background: 'var(--input-bg)',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setFilterDue("Any");
                    setFilterDuration("Any");
                    setFilterWeight("Any");
                    setFilterCats([]);
                    setFilterPriorities([]);
                    setFilterHasNotes(false);
                    setFilterHasSubtasks(false);
                    setFilterHasDueDate(false);
                    setFilterHasPeople(false);
                    setFilterHasLocations(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'var(--text-light)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailedFilters(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showToolbar && window.SimpleModal ? (
          <window.SimpleModal
            open={bulkMode}
            onClose={() => setBulkMode(false)}
            title={aiMode ? "Bulk Import (AI Dump)" : "Bulk Import (CSV)"}
          >
            <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  className={`toggle-icon ${!aiMode ? "active" : ""}`}
                  onClick={() => setAiMode(false)}
                  style={{
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 6,
                    background: !aiMode ? "var(--primary)" : "transparent",
                  }}
                >
                  📄
                </div>
                <div
                  className={`toggle-icon ${aiMode ? "active" : ""}`}
                  onClick={() => setAiMode(true)}
                  style={{
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 6,
                    background: aiMode ? "var(--primary)" : "transparent",
                  }}
                >
                  🧠
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, marginLeft: 6, color: "var(--text)" }}>
                {aiMode ? "AI Dump Mode" : "CSV Import Mode"}
              </span>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8 }}>
              {aiMode ? "Paste unstructured notes/emails here:" : "Format: Title | Category | Priority | Weight | Time | Due"}
            </div>

            <textarea
              className="f-textarea"
              placeholder={aiMode ? "Paste anything..." : "Buy groceries | Personal | Medium | 10 | 30 | 2024-12-20"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              style={{ minHeight: 140 }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button className="btn-orange" onClick={handleBulkImport} style={{ flex: 1 }}>
                {!aiMode ? "📄 Import CSV" : "🧠 Process with AI"}
              </button>
            </div>
          </window.SimpleModal>
        ) : null}

        <div
          style={{
            height: 160,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            className="tumbler-highlight"
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              height: 50,
              left: 0,
              right: 0,
              background: "rgba(255,107,53,0.05)",
              borderTop: "1px solid var(--primary)",
              borderBottom: "1px solid var(--primary)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          <div ref={stripRef} style={{ transition: `transform ${spinDurationSec}s ${activeCurve}` }}>
            {buildStripItems.length ? (
              buildStripItems.map((t, i) => (
                <div
                  key={`${t?.id || t?.title || "t"}_${i}`}
                  style={{
                    height: 50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    padding: "0 12px",
                    textAlign: "center",
                    opacity: spinning ? 0.95 : 1,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "280px",
                      display: "block",
                      minWidth: 0,
                    }}
                  >
                    {t?.title || "(Untitled)"}
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.7,
                  fontWeight: 700,
                }}
              >
                No tasks in pool
              </div>
            )}
          </div>
        </div>

        <button
          className="spin-btn"
          onClick={doSpin}
          disabled={spinning || !pool.length || isLocked}
          style={{
            height: 60,
            borderRadius: 8,
            fontSize: 20,
            fontWeight: 800,
            opacity: spinning || !pool.length || isLocked ? 0.6 : 1,
            cursor: spinning || !pool.length || isLocked ? "not-allowed" : "pointer",
            background: isLocked ? "#444" : undefined,
            transition: "background 0.3s",
          }}
          title={isLocked ? `Cooldown active: ${cooldownRemaining}s` : "Spin"}
        >
          {spinning
            ? "SPINNING…"
            : isLocked
            ? `COOLDOWN (${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, "0")})`
            : "SPIN"}
        </button>

        {WinnerPopup ? (
          <WinnerPopup
            open={!!(winner && showWinner)}
            task={winner}
            onClose={closeWinnerPopup}
            onFocus={(t) => requestFocus(t || winner, "spin")}
            onView={(t) => onView?.(t || winner)}
            onEdit={(t) => onEdit?.(t || winner)}
            onDone={(t) => onComplete?.((t || winner)?.id)}
            onRespin={() => {
              isRespinRef.current = true; // Mark as respin
              setTimeout(() => doSpin(), 0);
            }}
            onStartTimer={
              typeof onStartTimer === "function"
                ? (t) => {
                    try {
                      onStartTimer(t || winner);
                    } catch {
                      onStartTimer();
                    }
                  }
                : null
            }
          />
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: 0.8,
          }}
        >
          <div style={{ display: "flex", gap: 16, fontSize: 11, fontWeight: 900 }}>
            <span style={{ color: "var(--text-light)", letterSpacing: 1 }}>{pool.length} TASKS IN POOL</span>
            {stats ? (
              <span style={{ color: "var(--primary)" }}>
                🎲 {stats.topChance}% ODDS {spinUseWeighted ? "(WEIGHTED)" : "(RANDOM)"}
              </span>
            ) : null}
          </div>

          <button
            onClick={() => setShowToolbar(!showToolbar)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              color: "var(--text-light)",
              opacity: 0.4,
              padding: "4px 20px",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = 1)}
            onMouseLeave={(e) => (e.target.style.opacity = 0.4)}
            title={showToolbar ? "Hide Controls (Zen Mode)" : "Show Controls"}
          >
            {showToolbar ? "▲" : "▼"}
          </button>
        </div>
      </div>
    );
  }

  // Keep window assignment for backward compatibility
  if (typeof window !== 'undefined') {
    window.SpinTab = SpinTabLegacy;
  }

