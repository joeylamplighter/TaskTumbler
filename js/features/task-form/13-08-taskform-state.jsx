// js/components/13-08-taskform-state.jsx
// ===========================================
// TaskFormModal State + Init (includes reminders migration)
// Updated: 2025-12-18 09:55 PT
// ===========================================

(function () {
  const React = window.React;
  const { useState, useMemo } = React;

  const safeJsonParse = (s, fallback) => {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  function useTaskFormState({ task, categories, settings }) {
    const incoming = task || {};

    const [localCategories, setLocalCategories] = useState(() => categories || []);
    const visibleCategories = useMemo(() => {
      const catMult = settings?.categoryMultipliers || {};
      return (localCategories || []).filter(c => (catMult?.[c] ?? 1) >= 0);
    }, [localCategories, settings]);

    const Rem = window.TaskTumblerReminders;
    const normalizeReminders = Rem?.normalizeReminders || ((x)=>Array.isArray(x)?x:[]);
    const makeReminderId = Rem?.makeReminderId || (()=>"r_"+Math.random().toString(36).slice(2,10)+"_"+Date.now());

    const legacyToReminders = () => {
      const hasNew = Array.isArray(incoming.reminders) && incoming.reminders.length > 0;
      if (hasNew) return normalizeReminders(incoming.reminders);

      const legacyOn = incoming.reminderMode === "before";
      if (!legacyOn) return [];

      const anchor = (incoming.reminderAnchor === "start") ? "start" : "due";
      const val = Number(incoming.reminderOffsetValue ?? 15);
      const unit = (incoming.reminderOffsetUnit === "hours" || incoming.reminderOffsetUnit === "days" || incoming.reminderOffsetUnit === "minutes")
        ? incoming.reminderOffsetUnit
        : "minutes";

      return normalizeReminders([{
        id: makeReminderId(),
        enabled: true,
        auto: false,
        anchor,
        type: "relative",
        offsetValue: (Number.isFinite(val) && val > 0) ? val : 15,
        offsetUnit: unit,
        atTime: "08:00",
        label: "Legacy"
      }]);
    };

    const [data, setData] = useState(() => {
      return {
        title: incoming.title || "",
        description: incoming.description || "",
        category: incoming.category || visibleCategories[0] || "Work",
        subtype: incoming.subtype || null,
        priority: incoming.priority || "Medium",
        weight: incoming.weight || 10,
        estimatedTime: incoming.estimatedTime || "",
        estimatedTimeUnit: incoming.estimatedTimeUnit || "min",
        startDate: incoming.startDate || "",
        startTime: incoming.startTime || "",
        dueDate: incoming.dueDate || "",
        dueTime: incoming.dueTime || "",

        // Legacy reminder fields (compat)
        reminderMode: incoming.reminderMode || "none",
        reminderAnchor: incoming.reminderAnchor || "due",
        reminderOffsetValue: incoming.reminderOffsetValue || 15,
        reminderOffsetUnit: incoming.reminderOffsetUnit || "minutes",

        // Reminders V2
        reminders: legacyToReminders(),
        autoReminderDisabled: {
          start: !!incoming.autoReminderDisabled?.start,
          due: !!incoming.autoReminderDisabled?.due,
        },

        recurring: incoming.recurring || "None",
        excludeFromTumbler: incoming.excludeFromTumbler || false,
        subtasks: incoming.subtasks || [],
        tags: incoming.tags || [],
        people: incoming.people || [],
        blockedBy: incoming.blockedBy || [],
        goalId: incoming.goalId || null,
        location: incoming.location || "",
        locationCoords: incoming.locationCoords || null,
        percentComplete: incoming.percentComplete || 0
      };
    });

    const [locationInput, setLocationInput] = useState(() => data.location || "");
    const [personInput, setPersonInput] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [subText, setSubText] = useState("");

    const [expanded, setExpanded] = useState(() => {
      const defaults = { schedule: false, spin: false, details: false, context: true, links: false };
      const saved = safeJsonParse(localStorage.getItem("taskModal_expandedSections_v2") || "{}", {});
      return { ...defaults, ...(saved||{}) };
    });

    const toggleSection = (sec) => {
      setExpanded(p => {
        const next = { ...p, [sec]: !p[sec] };
        localStorage.setItem("taskModal_expandedSections_v2", JSON.stringify(next));
        return next;
      });
    };

    return {
      data, setData,
      localCategories, setLocalCategories,
      visibleCategories,
      locationInput, setLocationInput,
      personInput, setPersonInput,
      tagInput, setTagInput,
      subText, setSubText,
      expanded, toggleSection
    };
  }

  window.useTaskFormState = useTaskFormState;
})(); 
