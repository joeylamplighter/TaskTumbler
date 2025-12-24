// js/02-constants.js
// Updated: 2025-12-22 (Fix: Category XP Adjust + Negative XP Cap + No Redeclare Crashes)
// ===========================================
// CONSTANTS & DEFAULT VALUES
// ===========================================

(function () {
  "use strict";

  // Prevent accidental double initialization when scripts hot reload
  // We still allow re-run safely by overwriting window exports at the end.
  const TT_TAG = "__TT_CONSTANTS_V2__";
  window[TT_TAG] = true;

  // ===========================================
  // DEFAULT SETTINGS
  // ===========================================
  const DEFAULT_SETTINGS = {
    // --- Appearance ---
    theme: "dark",
    showTaskTimes: true,
    reducedMotion: false,
    visibleTabs: {
      tasks: true,
      timer: true,
      lists: true,
      goals: false,
      stats: true,
      duel: true,
      settings: true,
    },
    navItemsOrder: ["spin", "tasks", "timer", "lists", "goals", "people", "places", "stats", "stats:overview", "stats:charts", "stats:history", "duel", "settings", "settings:view", "settings:logic", "settings:game", "settings:cats", "settings:data"], // Custom order for nav bar items (includes subtabs)
    navBarVisibleItems: {
      spin: true,
      tasks: true,
      timer: true,
      lists: true,
      goals: true,
      stats: true,
      "stats:overview": true,
      "stats:charts": true,
      "stats:history": true,
      people: true,
      places: true,
      duel: true,
      settings: true, // Can be hidden, but accessible via #settings URL
      "settings:view": true,
      "settings:logic": true,
      "settings:game": true,
      "settings:cats": true,
      "settings:data": true,
    },
    
    // --- Header Right Mode ---
    headerRightMode: "quickNav", // "none" | "quickNav" | "xp" | "status"
    headerQuickNavItems: ["people", "lists", "settings"], // Array of up to 3: ["spin", "tasks", "timer", "lists", "goals", "stats", "people", "places", "duel", "settings", "search"] - Default quick nav items always loaded on fresh start
    headerShowAllNavDropdown: true, // Show 4th dropdown option with all navigation items in alphabetical order
    
    // --- Default Nav Bar Items (shown when nav bar is empty) ---
    defaultNavBarItems: ["tasks", "spin", "duel", "settings", "goals", "people"], // Default items to show when navbar is empty and user clicks brand
    headerXpShowValue: true,
    headerXpShowLevel: true,
    headerXpShowProgress: false,
    headerStatusItems: [], // Array of up to 3: ["timer", "sync", "focus", "reminders"]
    headerStatusClickable: false,

    // --- Game & Feedback ---
    sound: true,
    subtleSounds: true,  // Subtle ambient sounds for interactions
    confetti: true,
    explosion: true,
    enableHaptics: true,

    // --- Behavior ---
    autoStartTimer: false,
    autoCompleteSubtask: true,
    confirmTaskDeletion: true,
    showDebugInfo: true,
    showDevTools: false,
    enableNotifications: true,
    hideCompletedDelay: 0,

    // --- Logic & Weights ---
    duration: 3,

    // ✅ Cooldown settings (explicit)
    spinCooldownEnabled: false,
    spinCooldownSpins: 5,
    spinCooldownMinutes: 0,
    spinCooldownSeconds: 0,

    // Spin Behavior
    spinUseWeighted: true,
    spinAutoOpenWinnerTask: false,
    spinShowWinnerPopup: true,
    agingPerDay: 0,

    tumblerLength: 20,
    enableWeightClasses: true,
    duelAutoAdvance: true,
    duelShowActionBubbles: true,
    weightMax: 50,

    // ✅ Allows penalties, but prevents insane negative deltas
    negativeXpCap: -10,

    // --- Multipliers / Category tuning ---
    priorityMultipliers: {
      Urgent: 2.0,
      High: 1.5,
      Medium: 1.0,
      Low: 0.5,
    },

    // Used as scaling factors (Spin weighting / XP scaling if you apply it there)
    categoryMultipliers: {},

    // ✅ NEW: per-category XP delta (can be negative)
    categoryXpAdjust: {},

    // Misc / legacy bucket for subcats in settings
    subCategories: {},

    // --- Integrations ---
    geminiApiKey: "",
  };

  // ===========================================
  // Standard Toolbar Styling
  // ===========================================
  const TOOLBAR = {
    pad: "3px",
    gap: "10px",
    size: "30px",
    radius: "12px",
    icon: "20px",
  };

  // ===========================================
  // XP CAPS & LIMITS
  // ===========================================
  const XP_CONFIG = {
    maxXpPerTask: 100,
    baseXpPerTask: 10,
    xpPerSubtask: 2,
    maxDailyBonusXp: 50,
    streakMultiplierPerDay: 0.05,
    maxStreakMultiplier: 1.5,
  };

  // ===========================================
  // LEVELING CURVE CONFIGURATION
  // ===========================================
  const LEVELING_CONFIG = {
    baseXpPerLevel: 100,
    levelMultiplier: 50,

    getXpForLevel: function (level) {
      return this.baseXpPerLevel + level * this.levelMultiplier;
    },

    getTotalXpForLevel: function (level) {
      let total = 0;
      for (let i = 1; i <= level; i++) {
        total += this.getXpForLevel(i);
      }
      return total;
    },
  };

  // ===========================================
  // Default Complex Data
  // ===========================================
  const COMPLEX_TASKS = [];
  const COMPLEX_GOALS = [];
  const COMPLEX_ACTIVITIES = [];
  const COMPLEX_USER_STATS = {
    xp: 0,
    level: 1,
    tasksCompleted: 0,
    totalFocusTime: 0,
    dailyStreak: 0,
    lastCompletionDate: null,
  };

  // ===========================================
  // Options
  // ===========================================
  const timeOptions = ["⏱️", "< 5m", "< 15m", "< 30m", "< 60m", "> 1h"];
  const priOptions = ["🔥", "Urgent", "High", "Medium", "Low"];

  const REMINDER_OPTIONS = [
    { value: 0, label: "At time" },
    { value: 5, label: "5 min before" },
    { value: 15, label: "15 min before" },
    { value: 30, label: "30 min before" },
    { value: 60, label: "1 hour before" },
    { value: 1440, label: "1 day before" },
  ];

  // ===========================================
  // Subcategories (single global, safe)
  // ===========================================
  // IMPORTANT: do not redeclare global const across reloads.
  // Keep one shared object on window.
  const SUBCATEGORIES =
    window.SUBCATEGORIES && typeof window.SUBCATEGORIES === "object"
      ? window.SUBCATEGORIES
      : {};

  // ===========================================
  // XP Helpers (supports negative XP + caps)
  // ===========================================
  const getCatXpAdjust = (cat, settings) => {
    const v = settings?.categoryXpAdjust?.[cat];
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0; // can be negative
  };

  const calculateTaskXp = (task, settings) => {
    if (!task) return 0;

    const xpCfg = window.XP_CONFIG || XP_CONFIG;

    // Base XP
    const baseXpRaw = parseInt(xpCfg.baseXpPerTask, 10);
    const baseXp = Number.isFinite(baseXpRaw) ? baseXpRaw : 10;

    // Multipliers
    const priorityKey = task.priority || "Medium";
    const priorityMultRaw = settings?.priorityMultipliers?.[priorityKey];
    const priorityMult = Number.isFinite(Number(priorityMultRaw))
      ? Number(priorityMultRaw)
      : 1.0;

    const catKey = task.category || "";
    const categoryMultRaw = settings?.categoryMultipliers?.[catKey];
    const categoryMult = Number.isFinite(Number(categoryMultRaw))
      ? Number(categoryMultRaw)
      : 1.0;

    // Category XP adjustment (can be negative)
    const catAdj = getCatXpAdjust(catKey, settings);

    // Core XP
    const raw = Math.round(baseXp * priorityMult * categoryMult);
    let xp = raw + catAdj;

    // Positive cap
    const maxRaw = parseInt(xpCfg.maxXpPerTask, 10);
    const maxXp = Number.isFinite(maxRaw) ? maxRaw : 100;
    xp = Math.min(xp, maxXp);

    // Negative cap
    const negCapRaw = parseInt(settings?.negativeXpCap, 10);
    const negativeCap = Number.isFinite(negCapRaw) ? negCapRaw : -10;
    xp = Math.max(xp, negativeCap);

    return xp;
  };

  // ===========================================
  // Export to window
  // ===========================================
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.TOOLBAR = TOOLBAR;
  window.XP_CONFIG = XP_CONFIG;
  window.LEVELING_CONFIG = LEVELING_CONFIG;

  window.COMPLEX_TASKS = COMPLEX_TASKS;
  window.COMPLEX_GOALS = COMPLEX_GOALS;
  window.COMPLEX_ACTIVITIES = COMPLEX_ACTIVITIES;
  window.COMPLEX_USER_STATS = COMPLEX_USER_STATS;

  window.timeOptions = timeOptions;
  window.priOptions = priOptions;
  window.REMINDER_OPTIONS = REMINDER_OPTIONS;

  window.SUBCATEGORIES = SUBCATEGORIES;

  // XP helpers
  window.getCatXpAdjust = getCatXpAdjust;
  window.calculateTaskXp = calculateTaskXp;

  console.log("✅ 02-constants.js loaded (Defaults Fixed + Category XP Adjust + Safe Globals)");
})();
