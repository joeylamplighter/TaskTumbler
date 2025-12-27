// js/features/task-form/13-08-modals.jsx
// ===========================================
// MODALS: TaskFormModal & ViewTaskModal
// Updated: 2025-12-20 (View Modal uses 04-modals.css classes)
// ===========================================

function TaskFormModal({ task, categories, onClose, onSave, settings, tasks, goals, notify, updateTask }) {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;

  // FIX #92: Lock scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // ----------------------------
  // Reminders module (optional)
  // ----------------------------
  const R = window.TaskTumblerReminders || {};
  const normalizeReminders = R.normalizeReminders || ((x) => (Array.isArray(x) ? x : []));
  const legacyToReminders = R.legacyToReminders || (() => []);
  const enforceAutoReminders = R.enforceAutoReminders || (() => null);
  const reminderToChipText = R.reminderToChipText || ((r) => {
    if (!r) return "reminder";
    if (r.type === "dayBeforeAt") return `Day before at ${r.atTime || "08:00"}`;
    return `${r.offsetValue ?? 30} ${r.offsetUnit || "minutes"} before ${r.anchor || "due"}`;
  });
  const ReminderRow = R.ReminderRow || null;

  // ----------------------------
  // Local DB loaders
  // ----------------------------
  const [allLocations, setAllLocations] = useState([]);
  const [allPeople, setAllPeople] = useState([]);

  const loadData = () => {
    try {
      const locs =
        (typeof window.getSavedLocationsV1 === "function")
          ? window.getSavedLocationsV1()
          : JSON.parse(localStorage.getItem("savedLocations_v1") || "[]");
      setAllLocations(Array.isArray(locs) ? locs : []);
    } catch (e) {
      console.error("Loc Load Error", e);
      setAllLocations([]);
    }

    try {
      const people =
        (window.DataManager?.people?.getAll?.())
          || JSON.parse(localStorage.getItem("savedPeople") || "[]");
      setAllPeople(Array.isArray(people) ? people : []);
    } catch (e) {
      console.error("People Load Error", e);
      setAllPeople([]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("locations-updated", loadData);
    window.addEventListener("people-updated", loadData);
    return () => {
      window.removeEventListener("locations-updated", loadData);
      window.removeEventListener("people-updated", loadData);
    };
  }, []);

  const updatePeopleGlobally = (newList) => {
    const next = Array.isArray(newList) ? newList : [];
    setAllPeople(next);
    if (window.DataManager?.people?.setAll) window.DataManager.people.setAll(next);
    else {
      localStorage.setItem("savedPeople", JSON.stringify(next));
      window.dispatchEvent(new Event("people-updated"));
    }
  };

  const updateLocationsGlobally = (newList) => {
    const next = Array.isArray(newList) ? newList : [];
    setAllLocations(next);
    if (typeof window.setSavedLocationsV1 === "function") window.setSavedLocationsV1(next);
    else {
      localStorage.setItem("savedLocations_v1", JSON.stringify(next));
      window.dispatchEvent(new Event("locations-updated"));
    }
  };

  // ----------------------------
  // Modal state
  // ----------------------------
  const [showLocManager, setShowLocManager] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLocLoading, setIsLocLoading] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [showReminderEditor, setShowReminderEditor] = useState(false);

  const incoming = task || {};
  const [localCategories] = useState(() => categories || []);
  const visibleCategories = (localCategories || []).filter(
    (c) => (settings?.categoryMultipliers?.[c] ?? 1) >= 0
  );

  const draftKey = useMemo(() => {
    const id = incoming?.id ? String(incoming.id) : "new";
    return `taskFormDraft_v1_${id}`;
  }, [incoming?.id]);

  const loadDraft = () => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const draftSourceId = parsed?._draftSourceId || "new";
      const currentSourceId = incoming?.id ? String(incoming.id) : "new";
      if (draftSourceId !== currentSourceId) return null;
      return parsed;
    } catch { return null; }
  };

  const baseData = useMemo(() => {
    const d = {
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
      reminders: legacyToReminders(incoming),
      autoReminderDisabled: {
        start: !!incoming.autoReminderDisabled?.start,
        due: !!incoming.autoReminderDisabled?.due,
      },
      recurring: incoming.recurring || "None",
      excludeFromTumbler: incoming.excludeFromTumbler || false,
      subtasks: Array.isArray(incoming.subtasks) ? incoming.subtasks : [],
      tags: Array.isArray(incoming.tags) ? incoming.tags : [],
      people: Array.isArray(incoming.people) ? incoming.people : [],
      blockedBy: Array.isArray(incoming.blockedBy) ? incoming.blockedBy : [],
      goalId: incoming.goalId || null,
      location: incoming.location || "",
      locationCoords: incoming.locationCoords || null,
      percentComplete: incoming.percentComplete || 0,
    };
    const draft = loadDraft();
    if (!draft) return d;
    return { ...d, ...draft, _draftSourceId: incoming?.id ? String(incoming.id) : "new" };
  }, []);

  const [data, setData] = useState(baseData);
  const [locationInput, setLocationInput] = useState(baseData.location || "");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(-1);
  const locationInputRef = React.useRef(null);
  const [personInput, setPersonInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [subText, setSubText] = useState("");
// ----------------------------
// PEOPLE: chip UI + inline editor
// ----------------------------
const [expandedPerson, setExpandedPerson] = useState(null);
const [personDraft, setPersonDraft] = useState({ 
  name: "", 
  type: "client", 
  phone: "", 
  email: "", 
  links: "", 
  notes: "", 
  compassCrmLink: "", 
  tags: "", 
  weight: 1,
  locationIds: [],
  locationSearchInput: ""
});

const getPersonRecordByName = (name) => {
  const n = String(name || "").trim().toLowerCase();
  return (Array.isArray(allPeople) ? allPeople : []).find(p => String(p?.name || "").trim().toLowerCase() === n) || null;
};

const openPersonEditor = (name) => {
  const personName = String(name || "").trim();
  if (!personName) return;

  const rec = getPersonRecordByName(personName);
  if (!rec) return; // Only edit saved people

  const linksArray = Array.isArray(rec.links) ? rec.links : (rec.links ? [String(rec.links)] : []);
  const tagsArray = Array.isArray(rec.tags) ? rec.tags : (rec.tags ? [String(rec.tags)] : []);

  setExpandedPerson(personName);
  setPersonDraft({
    name: rec.name || personName,
    type: rec.type || "client",
    phone: rec.phone || "",
    email: rec.email || "",
    links: linksArray.join(", "),
    notes: rec.notes || "",
    compassCrmLink: rec.compassCrmLink || "",
    tags: tagsArray.join(", "),
    weight: rec.weight || 1,
    locationIds: Array.isArray(rec.locationIds) ? rec.locationIds : [],
  });
};

const removePersonFromSession = (name) => {
  const n = String(name || "").trim();
  if (!n) return;
  setData((p) => ({ ...p, people: (p.people || []).filter(x => x !== n) }));
  if (expandedPerson === n) {
    setExpandedPerson(null);
    setPersonDraft({ name: "", type: "client", phone: "", email: "", links: "", notes: "", compassCrmLink: "", tags: "", weight: 1, locationIds: [] });
  }
};

const handleAddPersonChip = () => {
  addPersonValue(personInput);
};

const savePersonDraft = () => {
  const oldName = String(expandedPerson || "").trim();
  const newName = String(personDraft.name || "").trim();
  if (!newName) return notify?.("Name required", "⚠️");

  const existing = getPersonRecordByName(oldName);
  if (!existing) return notify?.("Person not found in saved people", "⚠️");

  // Parse links: split by comma or newline and trim
  const linksArray = (personDraft.links || "")
    .split(/\n|,/g)
    .map(s => s.trim())
    .filter(Boolean);

  // Parse tags: split by comma and trim
  const tagsArray = (personDraft.tags || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // Ensure locationIds is an array
  const locationIds = Array.isArray(personDraft.locationIds) ? personDraft.locationIds.filter(Boolean) : [];

  const nextRec = {
    ...existing,
    id: existing.id,
    name: newName,
    type: personDraft.type || "client",
    phone: String(personDraft.phone || "").trim(),
    email: String(personDraft.email || "").trim(),
    links: linksArray,
    notes: String(personDraft.notes || "").trim(),
    compassCrmLink: String(personDraft.compassCrmLink || "").trim(),
    tags: tagsArray,
    weight: parseInt(personDraft.weight) || 1,
    locationIds: locationIds,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };

  // Update global People DB
  const list = Array.isArray(allPeople) ? allPeople : [];
  const idx = list.findIndex(p => p?.id === existing.id);

  const nextList = (idx >= 0)
    ? list.map((p, i) => (i === idx ? nextRec : p))
    : [...list, nextRec];

  updatePeopleGlobally(nextList);

  // If name changed, also update the task's people array
  if (oldName && newName && oldName !== newName) {
    setData((p) => ({
      ...p,
      people: (p.people || []).map(x => (x === oldName ? newName : x)),
    }));
  }

  notify?.("Person saved", "✅");
  setExpandedPerson(null);
};

  const lastUserLocRef = useRef("");
  useEffect(() => {
    if ((locationInput || "") === (lastUserLocRef.current || "")) {
      if ((data.location || "") !== (locationInput || "")) setLocationInput(data.location || "");
    }
  }, [data.location]);

  useEffect(() => { lastUserLocRef.current = locationInput || ""; }, [locationInput]);

  const draftTimer = useRef(null);
  useEffect(() => {
    try {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        const payload = { ...data, location: locationInput, _draftTs: Date.now(), _draftSourceId: incoming?.id ? String(incoming.id) : "new" };
        sessionStorage.setItem(draftKey, JSON.stringify(payload));
      }, 250);
    } catch {}
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [data, locationInput, draftKey, incoming?.id]);

  const [expanded, setExpanded] = useState(() => {
    const defaults = { schedule: true, spin: false, details: false, context: true, links: false };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem("taskModal_expandedSections_v2") || "{}") };
    } catch { return defaults; }
  });

  const toggleSection = (sec) => {
    setExpanded((p) => {
      const next = { ...p, [sec]: !p[sec] };
      localStorage.setItem("taskModal_expandedSections_v2", JSON.stringify(next));
      return next;
    });
  };

  const callAI = async (prompt, onSuccess) => {
    if (!settings?.geminiApiKey) return notify?.("Add API Key in Settings", "⚠️");
    if (!data.title) return notify?.("Add a title first.", "⚠️");
    setIsAiLoading(true);
    try {
      const res = await window.callGemini(prompt, settings.geminiApiKey);
      if (res?.text) onSuccess(res.text);
      else notify?.("No response from AI.", "🤔");
    } catch { notify?.("AI failed.", "❌"); }
    finally { setIsAiLoading(false); }
  };

  const handleAutoTime = () => callAI(`Estimate minutes for task: "${data.title}". Respond with number only.`, (t) => {
    const m = parseInt((t.match(/\d+/) || ["0"])[0], 10);
    if (m > 0) {
      if (m >= 60) setData((p) => ({ ...p, estimatedTime: Math.round((m/60)*10)/10, estimatedTimeUnit: "hr" }));
      else setData((p) => ({ ...p, estimatedTime: m, estimatedTimeUnit: "min" }));
      notify?.("Time estimated!", "🧠");
    }
  });

  const handleAiSubtasks = () => callAI(`Break down "${data.title}" into 3-5 concise actionable subtasks. Return JSON array of strings.`, (t) => {
    try {
      const match = t.match(/\[[\s\S]*\]/);
      if (!match) throw new Error();
      const s = JSON.parse(match[0]);
      if (Array.isArray(s) && s.length) {
        const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        setData((p) => ({ ...p, subtasks: [...(p.subtasks || []), ...s.map((x) => ({ id: generateId('st'), title: String(x), text: String(x), completed: false }))] }));
        notify?.(`Added ${s.length} steps.`, "🧠");
        setExpanded((p) => ({ ...p, details: true }));
      }
    } catch { notify?.("Could not parse steps.", "🤔"); }
  });

  const handleAiDesc = () => callAI(`Write a 1 sentence description for task: "${data.title}".`, (t) => {
    setData((d) => ({ ...d, description: t }));
    notify?.("Description written.", "✨");
    setExpanded((p) => ({ ...p, details: true }));
  });

  const handleAiCat = () => callAI(`Best category for "${data.title}" from: ${visibleCategories.join(",")}. Return ONE category name.`, (t) => {
    const best = visibleCategories.find((c) => t.toLowerCase().includes(String(c).toLowerCase()));
    if (best) setData((d) => ({ ...d, category: best }));
  });

  const handleAiPriority = () => callAI(`Priority for "${data.title}" (Low, Medium, High, Urgent)? Return ONE word.`, (t) => {
    const p = ["Low", "Medium", "High", "Urgent"].find((x) => t.toLowerCase().includes(x.toLowerCase()));
    if (p) setData((d) => ({ ...d, priority: p }));
  });

  const handleAiTags = () => callAI(`Suggest 3 tags for "${data.title}". Return JSON string array.`, (t) => {
    try {
      const match = t.match(/\[[\s\S]*\]/);
      if (match) {
        const tags = JSON.parse(match[0]);
        if (Array.isArray(tags)) setData((d) => ({ ...d, tags: [...new Set([...(d.tags || []), ...tags.map(String)])] }));
      }
    } catch {}
  });

  const handleMagicFill = async () => {
    if (!settings?.geminiApiKey || !data.title) return notify?.("Add API Key/Title", "⚠️");
    setIsAiLoading(true);
    try {
      const prompt = `Analyze task "${data.title}". Return JSON object with keys: "description", "category" (from: ${visibleCategories.join(",")}), "priority" (Low, Medium, High, Urgent), "estimatedTime" (minutes number), "subtasks" (array of strings), "tags" (array of strings).`;
      const res = await window.callGemini(prompt, settings.geminiApiKey);
      const jsonMatch = res?.text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiData = JSON.parse(jsonMatch[0]);
        setData((p) => ({
          ...p,
          description: p.description || aiData.description || "",
          category: visibleCategories.includes(aiData.category) ? aiData.category : p.category,
          priority: aiData.priority || p.priority,
          estimatedTime: aiData.estimatedTime || p.estimatedTime,
          estimatedTimeUnit: "min",
          subtasks: Array.isArray(aiData.subtasks) ? (() => {
            const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            return [...(p.subtasks || []), ...aiData.subtasks.map((t) => ({ id: generateId('st'), title: String(t), text: String(t), completed: false }))];
          })() : p.subtasks,
          tags: Array.isArray(aiData.tags) ? [...new Set([...(p.tags || []), ...aiData.tags.map(String)])] : p.tags,
        }));
        setExpanded((p) => ({ ...p, details: true }));
        notify?.("Auto-filled!", "✨");
      }
    } catch { notify?.("AI Failed", "❌"); }
    finally { setIsAiLoading(false); }
  };

  const addPersonValue = (nameRaw) => {
    const name = String(nameRaw || "").trim();
    if (!name) return;
    
    // Only allow adding people from saved people list
    const personExists = (allPeople || []).some((p) => (p.name || "").toLowerCase() === name.toLowerCase());
    if (!personExists) {
      notify?.("Person must be selected from saved people. Use People Manager to add new people.", "⚠️");
      return;
    }
    
    // Add to task if not already present
    if (!(data.people || []).includes(name)) {
      setData((prev) => ({ ...prev, people: [...(prev.people || []), name] }));
    }
    setPersonInput("");
  };

  const handleAddPerson = () => addPersonValue(personInput);

  // Location autosuggest logic
  useEffect(() => {
    const query = locationInput.trim().toLowerCase();
    if (!query) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    
    const matches = (allLocations || []).filter(loc => {
      const label = (loc.label || loc.name || '').toLowerCase();
      const address = (loc.address || '').toLowerCase();
      return label.includes(query) || address.includes(query);
    }).slice(0, 5); // Limit to 5 suggestions
    
    setLocationSuggestions(matches);
    setShowLocationSuggestions(matches.length > 0);
  }, [locationInput, allLocations]);

  const selectLocation = useCallback((loc) => {
    const label = loc.label || loc.name || '';
    setLocationInput(label);
    setData(prev => ({
      ...prev,
      location: label,
      locationCoords: (loc.lat !== null && loc.lon !== null) ? { lat: loc.lat, lon: loc.lon } : prev.locationCoords
    }));
    setShowLocationSuggestions(false);
    setSelectedLocationIndex(-1);
    locationInputRef.current?.focus();
  }, []);

  const handleLocationKeyDown = useCallback((e) => {
    if (!showLocationSuggestions || locationSuggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedLocationIndex(prev => 
        prev < locationSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedLocationIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedLocationIndex >= 0) {
      e.preventDefault();
      selectLocation(locationSuggestions[selectedLocationIndex]);
    } else if (e.key === 'Escape') {
      setShowLocationSuggestions(false);
      setSelectedLocationIndex(-1);
    }
  }, [showLocationSuggestions, locationSuggestions, selectedLocationIndex, selectLocation]);

  const saveLocationToTaskAndDB = () => {
    const v = String(locationInput || "").trim();
    if (!v) return;
    
    // Check if it matches an existing location
    const existing = (allLocations || []).find(l => {
      const label = (l.label || l.name || '').toLowerCase();
      return label === v.toLowerCase();
    });
    
    if (existing) {
      // Use existing location
      setData(prev => ({
        ...prev,
        location: existing.label || existing.name,
        locationCoords: (existing.lat !== null && existing.lon !== null) 
          ? { lat: existing.lat, lon: existing.lon } 
          : prev.locationCoords
      }));
      notify?.("Location selected", "📍");
    } else {
      // Create new location (manual entry)
      const newLoc = {
        id: "loc_" + Date.now(),
        label: v,
        name: v, // Backward compatibility
        address: v,
        type: "saved",
        createdAt: new Date().toISOString()
      };
      updateLocationsGlobally([...(allLocations || []), newLoc]);
      setData((p) => ({ ...p, location: v }));
      notify?.("Location Saved to DB", "📍");
    }
  };

  const getTaskLocationOnce = () => {
    if (!navigator.geolocation) return notify?.("Geolocation not supported.", "❌");
    setIsLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lon = parseFloat(pos.coords.longitude.toFixed(6));
      setData((prev) => ({ ...prev, locationCoords: { lat, lon } }));
      try {
        const address = (typeof window.fetchLocationName === "function") ? await window.fetchLocationName(lat, lon) : null;
        const s = address || `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        setLocationInput(s);
        setData((prev) => ({ ...prev, location: s }));
        
        // Optionally save GPS location to database
        const exists = (allLocations || []).some((l) => {
          const lLabel = (l.label || l.name || '').toLowerCase();
          return lLabel === s.toLowerCase();
        });
        if (!exists) {
          const newLoc = {
            id: "loc_" + Date.now(),
            label: s,
            name: s,
            address: address || s,
            type: "saved",
            lat: lat,
            lon: lon,
            createdAt: new Date().toISOString()
          };
          updateLocationsGlobally([...(allLocations || []), newLoc]);
        }
      } catch { } finally { setIsLocLoading(false); }
    }, (err) => { setIsLocLoading(false); notify?.(`GPS failed: ${err.message}`, "⚠️"); });
  };

  const anchorHasDate = (anchor) => (anchor === "start" ? !!data.startDate : anchor === "due" ? !!data.dueDate : false);

  const addManualReminder = () => {
    const anchor = data.dueDate ? "due" : data.startDate ? "start" : "due";
    const r = { id: (R.makeReminderId ? R.makeReminderId() : "r_" + Date.now()), enabled: true, auto: false, anchor, type: "relative", offsetValue: 30, offsetUnit: "minutes", label: "Manual" };
    setData((p) => ({ ...p, reminders: [...normalizeReminders(p.reminders), r] }));
    setEditingReminderId(r.id);
    setShowReminderEditor(true);
    notify?.("Reminder added", "🔔");
  };

  const updateReminder = (id, patch) => {
    setData((p) => {
      const next = normalizeReminders(p.reminders).map((r) => {
        if (r.id !== id) return r;
        if (patch.type && patch.type !== r.type) {
          if (patch.type === "relative") return { ...r, ...patch, offsetValue: 30, offsetUnit: "minutes" };
          if (patch.type === "dayBeforeAt") return { ...r, ...patch, atTime: r.atTime || "08:00" };
        }
        return { ...r, ...patch };
      });
      return { ...p, reminders: next };
    });
  };

  const removeReminder = (id) => {
    setData((p) => {
      const list = normalizeReminders(p.reminders);
      const target = list.find((r) => r.id === id);
      const nextDisabled = { ...(p.autoReminderDisabled || { start: false, due: false }) };
      if (target?.auto && (target.anchor === "start" || target.anchor === "due")) nextDisabled[target.anchor] = true;
      return { ...p, reminders: list.filter((r) => r.id !== id), autoReminderDisabled: nextDisabled };
    });
    if (editingReminderId === id) { setEditingReminderId(null); setShowReminderEditor(false); }
    notify?.("Reminder removed", "🗑️");
  };

  const reEnableAutoForAnchor = (anchor) => {
    if (anchor !== "start" && anchor !== "due") return;
    setData((p) => ({ ...p, autoReminderDisabled: { ...(p.autoReminderDisabled || {}), [anchor]: false } }));
    notify?.("Auto reminder re-enabled", "🔔");
  };

  useEffect(() => {
    setData((prev) => {
      const next = enforceAutoReminders(prev, settings);
      if (!next) return prev;
      return { ...prev, reminders: next };
    });
  }, [data.startDate, data.startTime, data.dueDate, data.dueTime, settings?.autoAddReminders]);

  const handleSave = () => {
    if (!String(data.title || "").trim()) return notify?.("Title required", "⚠️");
    const reminders = normalizeReminders(data.reminders);
    const first = reminders.find((r) => r.enabled !== false) || null;
    let mode = "none", anchor = "due", val = 15, unit = "minutes";
    if (first) {
      mode = "before"; anchor = first.anchor === "start" ? "start" : "due";
      if (first.type === "relative") { val = Number(first.offsetValue ?? 30); unit = first.offsetUnit || "minutes"; }
      else { val = 24; unit = "hours"; }
    }
    try { sessionStorage.removeItem(draftKey); } catch {}
    onSave?.({ ...data, location: locationInput, weight: Number(data.weight), reminders, reminderMode: mode, reminderAnchor: anchor, reminderOffsetValue: val, reminderOffsetUnit: unit });
  };

  const HeaderToggle = ({ title, section, extra }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 4, marginTop: 16, marginBottom: 10, cursor: "pointer", userSelect: "none" }} onClick={() => toggleSection(section)}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-light)" }}>{expanded[section] ? "▼" : "▶"}</span>
        <h4 style={{ fontFamily: "Fredoka", fontSize: 14, margin: 0 }}>{title}</h4>
      </div>
      {extra}
    </div>
  );

  const Chip = ({ text, onClick, onRemove, auto }) => (
    <div onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--input-bg)", color: "white", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
      <span>{text}</span>
      {auto && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(155, 89, 182, 0.15)", color: "var(--primary)" }}>AUTO</span>}
      <button type="button" className="btn-icon" onClick={(e) => { e.stopPropagation(); onRemove?.(); }} style={{ color: "var(--danger)", fontSize: 16, padding: 0 }} aria-label="Remove">×</button>
    </div>
  );

  // ===========================================
  // FIX #98: Z-INDEX CONSTANTS
  // ===========================================
  const Z_INDEX = {
    taskModal: 1000,
    locationsManager: 10050,
    peopleManager: 10100  // Higher than both
  };

  return (
    <React.Fragment>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: Z_INDEX.taskModal }} role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
            <h2 id="task-form-title" style={{ fontFamily: "Fredoka", margin: 0 }}>{task ? "Edit Task" : "New Task"}</h2>
            <button type="button" onClick={onClose} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer" }} aria-label="Close">×</button>
          </div>

          <label className="f-label">Title</label>
          <input className="f-input" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="Task name..." autoFocus />

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="f-label">Category</label>
                <button type="button" onClick={handleAiCat} className="btn-ai-small" aria-label="AI suggest category">✧</button>
              </div>
              <input className="f-input" value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })} list="cat-list" />
              <datalist id="cat-list">{visibleCategories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div style={{ width: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="f-label">Priority</label>
                <button type="button" onClick={handleAiPriority} className="btn-ai-small" aria-label="AI suggest priority">✧</button>
              </div>
              <select className="f-select" value={data.priority} onChange={(e) => setData({ ...data, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label className="f-label">Tags</label>
              <button type="button" onClick={handleAiTags} className="btn-ai-small" aria-label="AI suggest tags">✧</button>
            </div>
            <input className="f-input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); setData((d) => ({ ...d, tags: [...new Set([...(d.tags || []), tagInput.trim()])] })); setTagInput(""); } }} placeholder="Add tag..." />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {(data.tags || []).map((t) => (
                <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--primary)", color: "white" }}>
                  {t}<span onClick={() => setData((d) => ({ ...d, tags: (d.tags || []).filter((x) => x !== t) }))} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f-label">Est. Time</label>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <input type="number" className="f-input" style={{ width: 70, margin: 0 }} value={data.estimatedTime} onChange={(e) => setData({ ...data, estimatedTime: e.target.value })} min="0" />
              <select className="f-select" style={{ width: 70, margin: 0 }} value={data.estimatedTimeUnit} onChange={(e) => setData({ ...data, estimatedTimeUnit: e.target.value })}><option value="min">min</option><option value="hr">hr</option></select>
              <button type="button" onClick={handleAutoTime} className="btn-ai-small" aria-label="AI estimate time">✧</button>
            </div>
          </div>

          <HeaderToggle title="📅 Schedule & Reminders" section="schedule" />
          {expanded.schedule && (
            <div style={{ marginBottom: 15 }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 140px", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Start</div>
                <input type="date" className="f-input" style={{ margin: 0 }} value={window.dateUtils?.utcToLocalDateStr?.(data.startDate) || data.startDate || ""} onChange={(e) => setData({ ...data, startDate: window.dateUtils?.localToUtcDateStr?.(e.target.value) || e.target.value })} />
                <input type="time" className="f-input" style={{ margin: 0, textAlign: "center" }} value={data.startTime} onChange={(e) => setData({ ...data, startTime: e.target.value })} />
                <div style={{ fontSize: 13, fontWeight: 800 }}>Due</div>
                <input type="date" className="f-input" style={{ margin: 0 }} value={window.dateUtils?.utcToLocalDateStr?.(data.dueDate) || data.dueDate || ""} onChange={(e) => setData({ ...data, dueDate: window.dateUtils?.localToUtcDateStr?.(e.target.value) || e.target.value })} />
                <input type="time" className="f-input" style={{ margin: 0, textAlign: "center" }} value={data.dueTime} onChange={(e) => setData({ ...data, dueTime: e.target.value })} />
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>🔔 Reminders</div>
                  <button type="button" className="btn-orange-small" onClick={addManualReminder}>Add</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {normalizeReminders(data.reminders).filter(r => r.enabled !== false).map((r) => (
                    <Chip key={r.id} text={reminderToChipText(r)} auto={r.auto} onClick={() => { setEditingReminderId(r.id); setShowReminderEditor(true); }} onRemove={() => removeReminder(r.id)} />
                  ))}
                </div>
                {showReminderEditor && (
                  <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <button type="button" className="btn-white-outline" onClick={() => setShowReminderEditor(false)} style={{ float: "right" }}>Done</button>
                    {ReminderRow ? <ReminderRow r={normalizeReminders(data.reminders).find(x => x.id === editingReminderId)} updateReminder={updateReminder} removeReminder={removeReminder} anchorHasDate={anchorHasDate} /> : "Reminders module missing"}
                  </div>
                )}
              </div>
            </div>
          )}

          <HeaderToggle title="📝 Details & Steps" section="details" extra={<button type="button" onClick={(e) => { e.stopPropagation(); handleAiDesc(); }} className="btn-ai-small" aria-label="AI write description">✧</button>} />
          {expanded.details && (
            <div style={{ marginBottom: 15 }}>
              <label className="f-label">Description</label>
              <textarea className="f-textarea" rows={2} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <label className="f-label">Subtasks</label>
                <button type="button" onClick={handleAiSubtasks} className="btn-ai-small" aria-label="AI generate subtasks">✧</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input className="f-input" style={{ marginBottom: 0, flex: 1 }} value={subText} onChange={(e) => setSubText(e.target.value)} onKeyDown={(e) => { 
                  if (e.key === "Enter" && subText.trim()) { 
                    e.preventDefault(); 
                    const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                    setData((d) => ({ 
                      ...d, 
                      subtasks: [...(d.subtasks || []), { 
                        id: generateId('st'), 
                        title: subText.trim(), 
                        text: subText.trim(), 
                        completed: false 
                      }] 
                    })); 
                    setSubText(""); 
                  } 
                }} placeholder="Add subtask..." />
                <button type="button" className="btn-orange-small" onClick={() => { 
                  if (subText.trim()) { 
                    const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                    setData((d) => ({ 
                      ...d, 
                      subtasks: [...(d.subtasks || []), { 
                        id: generateId('st'), 
                        title: subText.trim(), 
                        text: subText.trim(), 
                        completed: false 
                      }] 
                    })); 
                    setSubText(""); 
                  } 
                }}>Add</button>
              </div>
              <div style={{ background: "var(--input-bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                {(data.subtasks || []).map((s) => {
                  const subtaskId = s.id || s.title; // Fallback to title if no ID
                  return (
                    <div key={subtaskId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                      <input type="checkbox" checked={!!s.completed} onChange={() => { 
                        const next = (data.subtasks || []).map(st => 
                          (st.id || st.title) === subtaskId ? { ...st, completed: !st.completed } : st
                        ); 
                        setData({ ...data, subtasks: next }); 
                      }} />
                      <span style={{ flex: 1, fontSize: 13 }}>{s.title || s.text}</span>
                      <span onClick={() => setData((d) => ({ ...d, subtasks: (d.subtasks || []).filter(st => (st.id || st.title) !== subtaskId) }))} style={{ color: "var(--danger)", cursor: "pointer" }}>×</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <HeaderToggle title="📍 Context (People & Places)" section="context" extra={
            <div style={{ display: "flex", gap: 12 }}>
              <div onClick={(e) => { e.stopPropagation(); setShowPeopleManager(true); }} style={{ cursor: "pointer", fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>👥 People</div>
              <div onClick={(e) => { e.stopPropagation(); setShowLocManager(true); }} style={{ cursor: "pointer", fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>📍 Places</div>
            </div>
          } />
          {expanded.context && (
            <div style={{ marginBottom: 15 }}>
              <div style={{ position: 'relative', marginBottom: 15 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                      ref={locationInputRef}
                      className="f-input" 
                      style={{ marginBottom: 0, width: '100%' }} 
                      value={locationInput} 
                      onChange={(e) => { 
                        setLocationInput(e.target.value); 
                        setData(p => ({...p, location: e.target.value})); 
                      }}
                      onKeyDown={handleLocationKeyDown}
                      onFocus={() => {
                        if (locationInput.trim() && locationSuggestions.length > 0) {
                          setShowLocationSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on suggestion
                        setTimeout(() => setShowLocationSuggestions(false), 200);
                      }}
                      placeholder="📍 Location (type to search saved locations)..." 
                    />
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {locationSuggestions.map((loc, idx) => {
                          const label = loc.label || loc.name || '';
                          const address = loc.address || '';
                          const hasGPS = loc.lat !== null && loc.lon !== null;
                          return (
                            <div
                              key={loc.id}
                              onClick={() => selectLocation(loc)}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                background: selectedLocationIndex === idx ? 'var(--primary)' : 'transparent',
                                color: selectedLocationIndex === idx ? 'white' : 'var(--text)',
                                borderBottom: '1px solid var(--border)',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={() => setSelectedLocationIndex(idx)}
                            >
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                                {label}
                              </div>
                              {address && (
                                <div style={{ fontSize: 11, opacity: 0.7 }}>
                                  {address}
                                </div>
                              )}
                              {hasGPS && (
                                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                                  📍 {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button type="button" className="btn-white-outline" onClick={saveLocationToTaskAndDB} aria-label="Save location">💾</button>
                  <button type="button" className="btn-white-outline" onClick={getTaskLocationOnce} aria-label="Get current location" disabled={isLocLoading}>{isLocLoading ? "⏳" : "📍"}</button>
                </div>
                {data.locationCoords && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📍</span>
                    <span>GPS: {data.locationCoords.lat?.toFixed(4) || data.locationCoords.lat}, {data.locationCoords.lon?.toFixed(4) || data.locationCoords.lon}</span>
                  </div>
                )}
              </div>
 {/* PEOPLE (chips + editor) */}
<div style={{ marginTop: 10 }}>
  <div style={{ fontWeight: 900, fontSize: 13, color: "var(--text-light)", marginBottom: 10 }}>👥 PEOPLE</div>

  <div
    style={{
      background: "var(--input-bg)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: "10px 12px",
      minHeight: 56,
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }}
  >
    {(Array.isArray(data?.people) ? data.people : []).map((p) => (
      <span
        key={p}
        style={{
          background: "var(--primary)",
          color: "#fff",
          borderRadius: 20,
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 900,
          userSelect: "none",
        }}
      >
        <span
          onDoubleClick={() => openPersonEditor(p)}
          title="Double click to edit details"
          style={{ cursor: "pointer" }}
        >
          {p}
        </span>
        <span
          onClick={() => removePersonFromSession(p)}
          style={{ cursor: "pointer", fontSize: 16, lineHeight: 1 }}
          aria-label={`Remove ${p}`}
          title="Remove"
        >
          ×
        </span>
      </span>
    ))}

    <input
      id="task-people-input"
      value={personInput}
      onChange={(e) => setPersonInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddPersonChip();
        }
      }}
      list="people-list"
      style={{
        border: "none",
        background: "transparent",
        color: "var(--text)",
        flex: 1,
        minWidth: 140,
        outline: "none",
        fontWeight: 700,
      }}
    />
    <datalist id="people-list">
      {(Array.isArray(allPeople) ? allPeople : []).map((p) => (
        <option key={p.id || p.name} value={p.name} />
      ))}
    </datalist>
  </div>

  {expandedPerson && (
    <div
      style={{
        marginTop: 12,
        background: "var(--input-bg)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 12
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, color: "var(--text)" }}>Edit: {expandedPerson}</div>
        <button type="button" className="btn-white-outline" onClick={() => setExpandedPerson(null)} style={{ padding: "6px 10px" }}>
          Close
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="f-label" style={{ marginBottom: 6 }}>Name *</div>
        <input
          className="f-input"
          value={personDraft.name}
          onChange={(e) => {
            const val = e.target.value;
            setPersonDraft((d) => ({ ...d, name: val }));
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
        <div>
          <div className="f-label" style={{ marginBottom: 6 }}>Type</div>
          <select
            className="f-select"
            value={personDraft.type}
            onChange={(e) => setPersonDraft((d) => ({ ...d, type: e.target.value }))}
          >
            <option value="client">Client</option>
            <option value="lead">Lead</option>
            <option value="agent">Agent</option>
            <option value="vendor">Vendor</option>
            <option value="friend">Friend</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <div className="f-label" style={{ marginBottom: 6 }}>Weight</div>
          <input
            type="number"
            min="1"
            className="f-input"
            value={personDraft.weight}
            onChange={(e) => setPersonDraft((d) => ({ ...d, weight: parseInt(e.target.value) || 1 }))}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
        <div>
          <div className="f-label" style={{ marginBottom: 6 }}>Phone</div>
          <input
            className="f-input"
            type="tel"
            value={personDraft.phone}
            onChange={(e) => setPersonDraft((d) => ({ ...d, phone: e.target.value }))}
          />
        </div>
        <div>
          <div className="f-label" style={{ marginBottom: 6 }}>Email</div>
          <input
            className="f-input"
            type="email"
            value={personDraft.email}
            onChange={(e) => setPersonDraft((d) => ({ ...d, email: e.target.value }))}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="f-label" style={{ marginBottom: 6 }}>Connected Places</div>
        {allLocations.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-light)", fontStyle: "italic", padding: 12, background: "var(--bg)", borderRadius: 8 }}>
            No places yet. Add places in the Places tab.
          </div>
        ) : (
          <div>
            <input
              type="text"
              className="f-input"
              list="chip-location-list"
              value={personDraft.locationSearchInput || ""}
              onChange={(e) => setPersonDraft((d) => ({ ...d, locationSearchInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = e.target.value.trim();
                  if (val) {
                    const match = allLocations.find(loc => 
                      loc.name.toLowerCase() === val.toLowerCase() ||
                      loc.name.toLowerCase().includes(val.toLowerCase())
                    );
                    if (match && !personDraft.locationIds.includes(match.id)) {
                      setPersonDraft((d) => ({ ...d, locationIds: [...d.locationIds, match.id], locationSearchInput: "" }));
                    }
                  }
                  e.preventDefault();
                }
              }}
              style={{ marginBottom: 8 }}
            />
            <datalist id="chip-location-list">
              {allLocations.map(loc => (
                <option key={loc.id} value={loc.name} />
              ))}
            </datalist>
            {personDraft.locationIds.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {personDraft.locationIds.map(locId => {
                  const loc = allLocations.find(l => l.id === locId);
                  if (!loc) return null;
                  return (
                    <div
                      key={locId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        background: "var(--primary)",
                        color: "white",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      <span>📍</span>
                      <span>{loc.name}</span>
                      <button
                        type="button"
                        onClick={() => setPersonDraft((d) => ({ ...d, locationIds: d.locationIds.filter(id => id !== locId) }))}
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          border: "none",
                          color: "white",
                          borderRadius: 4,
                          width: 18,
                          height: 18,
                          cursor: "pointer",
                          fontSize: 12,
                          lineHeight: 1,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="f-label" style={{ marginBottom: 6 }}>Tags (comma separated)</div>
        <input
          className="f-input"
          value={personDraft.tags}
          onChange={(e) => setPersonDraft((d) => ({ ...d, tags: e.target.value }))}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="f-label" style={{ marginBottom: 6 }}>Compass CRM Link</div>
        <input
          className="f-input"
          value={personDraft.compassCrmLink}
          onChange={(e) => setPersonDraft((d) => ({ ...d, compassCrmLink: e.target.value }))}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="f-label" style={{ marginBottom: 6 }}>Links</div>
        <input
          className="f-input"
          value={personDraft.links}
          onChange={(e) => setPersonDraft((d) => ({ ...d, links: e.target.value }))}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="f-label" style={{ marginBottom: 6 }}>Notes</div>
        <textarea
          className="f-textarea"
          style={{ minHeight: 64 }}
          value={personDraft.notes}
          onChange={(e) => setPersonDraft((d) => ({ ...d, notes: e.target.value }))}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={savePersonDraft}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 14,
            padding: "10px 12px",
            fontWeight: 900,
            background: "var(--primary)",
            color: "white"
          }}
        >
          ✅ Save Person
        </button>
        <button type="button" onClick={() => setExpandedPerson(null)} className="btn-white-outline" style={{ flex: 1 }}>
          Cancel
        </button>
      </div>
    </div>
  )}
</div>
            </div>
          )}

          <HeaderToggle title="🔗 Links & Goals" section="links" />
          {expanded.links && (
            <div style={{ padding: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <label className="f-label">Link to Goal</label>
              <select className="f-select" value={data.goalId || ""} onChange={(e) => setData(d => ({ ...d, goalId: e.target.value || null }))}>
                <option value="">None</option>
                {(goals || []).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}

          <HeaderToggle title="💫 Spin Mods" section="spin" />
          {expanded.spin && (
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label className="f-label">Weight: {data.weight}</label>
                <input type="range" min="1" max="50" value={data.weight} onChange={(e) => setData({ ...data, weight: parseInt(e.target.value, 10) })} style={{ width: "100%" }} />
              </div>
              <label style={{ cursor: "pointer", textAlign: "center" }}>
                <span className="f-label">Exclude</span>
                <input type="checkbox" checked={!!data.excludeFromTumbler} onChange={(e) => setData({ ...data, excludeFromTumbler: e.target.checked })} style={{ width: 18, height: 18 }} />
              </label>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 15, borderTop: "1px solid var(--border)" }}>
            <button type="button" onClick={handleMagicFill} disabled={!data.title || isAiLoading} className="btn-ai-purple">
              {isAiLoading ? <div className="spinner-small" /> : "🧠"}
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn-white-outline" onClick={onClose}>Cancel</button>
              <button type="button" className="btn-orange" onClick={handleSave}>Save Task</button>
            </div>
          </div>
        </div>
      </div>

      {/* FIX #98: People Manager with explicit high z-index wrapper */}
      {showPeopleManager && window.PeopleManager && (
        ReactDOM.createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.peopleManager }}>
            <window.PeopleManager 
              people={allPeople} 
              setPeople={updatePeopleGlobally} 
              onClose={() => setShowPeopleManager(false)} 
            />
          </div>,
          document.body
        )
      )}
      
      {/* FIX #98: Locations Manager with explicit z-index */}
      {showLocManager && window.LocationsManager && (
        <div className="modal-overlay" style={{ zIndex: Z_INDEX.locationsManager }} onClick={() => setShowLocManager(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <h3>Manage Places</h3>
              <button type="button" onClick={() => setShowLocManager(false)} aria-label="Close">×</button>
            </div>
            <window.LocationsManager locations={allLocations} setLocations={updateLocationsGlobally} notify={notify} />
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

// ===========================================
// VIEW TASK MODAL (READ-ONLY)
// ✅ UPDATED: Uses 04-modals.css classes
// ===========================================
function ViewTaskModal({ task, onClose, onEdit, onComplete, onFocus, goals, settings, updateTask }) {
  const { useState, useEffect } = React;
  
  // Lock scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  if (!task) return null;

  const goalName = task.goalId ? goals?.find(g => g.id === task.goalId)?.title : null;
  const isDone = task.completed;

  // People management state
  const [allPeople, setAllPeople] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [personInput, setPersonInput] = useState("");
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [personDraft, setPersonDraft] = useState({ 
    name: "", 
    type: "client", 
    phone: "", 
    email: "", 
    links: "", 
    notes: "", 
    compassCrmLink: "", 
    tags: "", 
    weight: 1,
    locationIds: [],
    locationSearchInput: ""
  });

  useEffect(() => {
    const loadData = () => {
      try {
        const people = (window.DataManager?.people?.getAll?.()) || JSON.parse(localStorage.getItem("savedPeople") || "[]");
        setAllPeople(Array.isArray(people) ? people : []);
      } catch (e) {
        console.error("People Load Error", e);
        setAllPeople([]);
      }
      try {
        const locs = (typeof window.getSavedLocationsV1 === "function")
          ? window.getSavedLocationsV1()
          : JSON.parse(localStorage.getItem("savedLocations_v1") || "[]");
        setAllLocations(Array.isArray(locs) ? locs : []);
      } catch (e) {
        console.error("Loc Load Error", e);
        setAllLocations([]);
      }
    };
    loadData();
    window.addEventListener("people-updated", loadData);
    window.addEventListener("locations-updated", loadData);
    return () => {
      window.removeEventListener("people-updated", loadData);
      window.removeEventListener("locations-updated", loadData);
    };
  }, []);

  const updatePeopleGlobally = (newList) => {
    const next = Array.isArray(newList) ? newList : [];
    setAllPeople(next);
    if (window.DataManager?.people?.setAll) window.DataManager.people.setAll(next);
    else {
      localStorage.setItem("savedPeople", JSON.stringify(next));
      window.dispatchEvent(new Event("people-updated"));
    }
  };

  const getPersonRecordByName = (name) => {
    const n = String(name || "").trim().toLowerCase();
    return (Array.isArray(allPeople) ? allPeople : []).find(p => String(p?.name || "").trim().toLowerCase() === n) || null;
  };

  const openPersonEditor = (name) => {
    const personName = String(name || "").trim();
    if (!personName) return;
    const rec = getPersonRecordByName(personName);
    if (!rec) return;
    const linksArray = Array.isArray(rec.links) ? rec.links : (rec.links ? [String(rec.links)] : []);
    const tagsArray = Array.isArray(rec.tags) ? rec.tags : (rec.tags ? [String(rec.tags)] : []);
    setExpandedPerson(personName);
    setPersonDraft({
      name: rec.name || personName,
      type: rec.type || "client",
      phone: rec.phone || "",
      email: rec.email || "",
      links: linksArray.join(", "),
      notes: rec.notes || "",
      compassCrmLink: rec.compassCrmLink || "",
      tags: tagsArray.join(", "),
      weight: rec.weight || 1,
      locationIds: Array.isArray(rec.locationIds) ? rec.locationIds : [],
      locationSearchInput: ""
    });
  };

  const removePersonFromTask = (name) => {
    const n = String(name || "").trim();
    if (!n || !updateTask) return;
    const currentPeople = Array.isArray(task.people) ? task.people : [];
    updateTask(task.id, { people: currentPeople.filter(x => x !== n) });
    if (expandedPerson === n) {
      setExpandedPerson(null);
      setPersonDraft({ name: "", type: "client", phone: "", email: "", links: "", notes: "", compassCrmLink: "", tags: "", weight: 1, locationIds: [], locationSearchInput: "" });
    }
  };

  const addPersonToTask = (nameRaw) => {
    const name = String(nameRaw || "").trim();
    if (!name || !updateTask) return;
    const personExists = (allPeople || []).some((p) => (p.name || "").toLowerCase() === name.toLowerCase());
    if (!personExists) return;
    const currentPeople = Array.isArray(task.people) ? task.people : [];
    if (!currentPeople.includes(name)) {
      updateTask(task.id, { people: [...currentPeople, name] });
    }
    setPersonInput("");
  };

  const savePersonDraft = () => {
    const oldName = String(expandedPerson || "").trim();
    const newName = String(personDraft.name || "").trim();
    if (!newName) return;

    const existing = getPersonRecordByName(oldName);
    if (!existing) return;

    const linksArray = (personDraft.links || "").split(/\n|,/g).map(s => s.trim()).filter(Boolean);
    const tagsArray = (personDraft.tags || "").split(",").map(s => s.trim()).filter(Boolean);
    const locationIds = Array.isArray(personDraft.locationIds) ? personDraft.locationIds.filter(Boolean) : [];

    const nextRec = {
      ...existing,
      id: existing.id,
      name: newName,
      type: personDraft.type || "client",
      phone: String(personDraft.phone || "").trim(),
      email: String(personDraft.email || "").trim(),
      links: linksArray,
      notes: String(personDraft.notes || "").trim(),
      compassCrmLink: String(personDraft.compassCrmLink || "").trim(),
      tags: tagsArray,
      weight: parseInt(personDraft.weight) || 1,
      locationIds: locationIds,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    };

    const list = Array.isArray(allPeople) ? allPeople : [];
    const idx = list.findIndex(p => p?.id === existing.id);
    const nextList = (idx >= 0) ? list.map((p, i) => (i === idx ? nextRec : p)) : [...list, nextRec];
    updatePeopleGlobally(nextList);

    if (oldName && newName && oldName !== newName && updateTask) {
      const currentPeople = Array.isArray(task.people) ? task.people : [];
      updateTask(task.id, { people: currentPeople.map(x => (x === oldName ? newName : x)) });
    }

    setExpandedPerson(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ paddingRight: 20 }}>
            <div style={{ 
              fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', 
              color: 'var(--primary)', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <span>{task.category || 'General'}</span>
              {task.priority && <span className={`badge ${task.priority}`}>{task.priority}</span>}
            </div>
            <h2 style={{ 
              fontFamily: 'Fredoka', fontSize: 24, lineHeight: 1.2, margin: 0,
              textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1
            }}>
              {task.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--text-light)', cursor: 'pointer' }}>×</button>
        </div>

        {/* METADATA GRID - Using your custom class */}
        <div className="task-form-effort-grid">
          
          {/* Row 1: Time & Weight */}
          <div className="effort-time-row" style={{ justifyContent: 'space-between', padding: '12px', background: 'var(--input-bg)', borderRadius: 10 }}>
             <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="f-label" style={{ marginBottom: 0 }}>Effort:</span>
                <span style={{ fontWeight: 700 }}>{task.estimatedTime ? `${task.estimatedTime} ${task.estimatedTimeUnit || 'min'}` : '-'}</span>
             </div>
             <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="f-label" style={{ marginBottom: 0 }}>Interest:</span>
                <span style={{ fontWeight: 700 }}>{task.weight || 10}</span>
             </div>
          </div>

          {/* Row 2: Goal Link (if any) */}
          {goalName && (
            <div style={{ background: 'var(--input-bg)', padding: 12, borderRadius: 10 }}>
              <div className="f-label">Linked Goal</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>🎯 {goalName}</div>
            </div>
          )}

          {/* Row 3: Location (if any) */}
          {task.location && (
            <div style={{ background: 'var(--input-bg)', padding: 12, borderRadius: 10, display:'flex', gap:8, alignItems:'center' }}>
              <span style={{fontSize:18}}>📍</span>
              <div style={{flex:1}}>
                <div className="f-label" style={{marginBottom:0}}>Location</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: task.locationCoords ? 4 : 0 }}>{task.location}</div>
                {task.locationCoords && (
                  <div style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>📍</span>
                    <span>GPS: {task.locationCoords.lat?.toFixed(4) || task.locationCoords.lat}, {task.locationCoords.lon?.toFixed(4) || task.locationCoords.lon}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PEOPLE (editable chips) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "var(--text-light)", marginBottom: 10 }}>👥 PEOPLE</div>
          <div
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "10px 12px",
              minHeight: 56,
              display: "flex",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            {(Array.isArray(task?.people) ? task.people : []).map((p) => (
              <span
                key={p}
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  borderRadius: 20,
                  padding: "6px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 900,
                  userSelect: "none",
                }}
              >
                <span
                  onDoubleClick={() => openPersonEditor(p)}
                  title="Double click to edit details"
                  style={{ cursor: "pointer" }}
                >
                  {p}
                </span>
                {updateTask && (
                  <span
                    onClick={() => removePersonFromTask(p)}
                    style={{ cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                    aria-label={`Remove ${p}`}
                    title="Remove"
                  >
                    ×
                  </span>
                )}
              </span>
            ))}

            {updateTask && (
              <>
                <input
                  value={personInput}
                  onChange={(e) => setPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPersonToTask(personInput);
                    }
                  }}
                  list="view-people-list"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--text)",
                    flex: 1,
                    minWidth: 140,
                    outline: "none",
                    fontWeight: 700,
                  }}
                />
                <datalist id="view-people-list">
                  {(Array.isArray(allPeople) ? allPeople : []).map((p) => (
                    <option key={p.id || p.name} value={p.name} />
                  ))}
                </datalist>
              </>
            )}
          </div>

          {expandedPerson && (
            <div
              style={{
                marginTop: 12,
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 900, color: "var(--text)" }}>Edit: {expandedPerson}</div>
                <button type="button" className="btn-white-outline" onClick={() => setExpandedPerson(null)} style={{ padding: "6px 10px" }}>
                  Close
                </button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="f-label" style={{ marginBottom: 6 }}>Name *</div>
                <input
                  className="f-input"
                  value={personDraft.name}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
                <div>
                  <div className="f-label" style={{ marginBottom: 6 }}>Type</div>
                  <select
                    className="f-select"
                    value={personDraft.type}
                    onChange={(e) => setPersonDraft((d) => ({ ...d, type: e.target.value }))}
                  >
                    <option value="client">Client</option>
                    <option value="lead">Lead</option>
                    <option value="agent">Agent</option>
                    <option value="vendor">Vendor</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <div className="f-label" style={{ marginBottom: 6 }}>Weight</div>
                  <input
                    type="number"
                    min="1"
                    className="f-input"
                    value={personDraft.weight}
                    onChange={(e) => setPersonDraft((d) => ({ ...d, weight: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
                <div>
                  <div className="f-label" style={{ marginBottom: 6 }}>Phone</div>
                  <input
                    className="f-input"
                    type="tel"
                    value={personDraft.phone}
                    onChange={(e) => setPersonDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="f-label" style={{ marginBottom: 6 }}>Email</div>
                  <input
                    className="f-input"
                    type="email"
                    value={personDraft.email}
                    onChange={(e) => setPersonDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="f-label" style={{ marginBottom: 6 }}>Connected Places</div>
                {allLocations.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-light)", fontStyle: "italic", padding: 12, background: "var(--bg)", borderRadius: 8 }}>
                    No places yet. Add places in the Places tab.
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="f-input"
                      list="view-chip-location-list"
                      value={personDraft.locationSearchInput || ""}
                      onChange={(e) => setPersonDraft((d) => ({ ...d, locationSearchInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = e.target.value.trim();
                          if (val) {
                            const match = allLocations.find(loc => 
                              loc.name.toLowerCase() === val.toLowerCase() ||
                              loc.name.toLowerCase().includes(val.toLowerCase())
                            );
                            if (match && !personDraft.locationIds.includes(match.id)) {
                              setPersonDraft((d) => ({ ...d, locationIds: [...d.locationIds, match.id], locationSearchInput: "" }));
                            }
                          }
                          e.preventDefault();
                        }
                      }}
                      style={{ marginBottom: 8 }}
                    />
                    <datalist id="view-chip-location-list">
                      {allLocations.map(loc => (
                        <option key={loc.id} value={loc.name} />
                      ))}
                    </datalist>
                    {personDraft.locationIds.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {personDraft.locationIds.map(locId => {
                          const loc = allLocations.find(l => l.id === locId);
                          if (!loc) return null;
                          return (
                            <div
                              key={locId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 10px",
                                background: "var(--primary)",
                                color: "white",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              <span>📍</span>
                              <span>{loc.name}</span>
                              <button
                                type="button"
                                onClick={() => setPersonDraft((d) => ({ ...d, locationIds: d.locationIds.filter(id => id !== locId) }))}
                                style={{
                                  background: "rgba(255,255,255,0.2)",
                                  border: "none",
                                  color: "white",
                                  borderRadius: 4,
                                  width: 18,
                                  height: 18,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  lineHeight: 1,
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="f-label" style={{ marginBottom: 6 }}>Tags (comma separated)</div>
                <input
                  className="f-input"
                  value={personDraft.tags}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, tags: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="f-label" style={{ marginBottom: 6 }}>Compass CRM Link</div>
                <input
                  className="f-input"
                  value={personDraft.compassCrmLink}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, compassCrmLink: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="f-label" style={{ marginBottom: 6 }}>Links</div>
                <input
                  className="f-input"
                  value={personDraft.links}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, links: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="f-label" style={{ marginBottom: 6 }}>Notes</div>
                <textarea
                  className="f-textarea"
                  style={{ minHeight: 64 }}
                  value={personDraft.notes}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={savePersonDraft}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 14,
                    padding: "10px 12px",
                    fontWeight: 900,
                    background: "var(--primary)",
                    color: "white"
                  }}
                >
                  ✅ Save Person
                </button>
                <button type="button" onClick={() => setExpandedPerson(null)} className="btn-white-outline" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DESCRIPTION */}
        {task.description && (
          <div style={{ marginBottom: 20, lineHeight: 1.5, fontSize: 15, color: 'var(--text-light)', whiteSpace: 'pre-wrap' }}>
            {task.description}
          </div>
        )}

        {/* SUBTASKS */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="f-label" style={{ marginBottom: 8 }}>Subtasks</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {task.subtasks.map((st, i) => (
                <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: st.completed ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                  <span style={{ color: st.completed ? 'var(--success)' : 'var(--text-light)' }}>
                    {st.completed ? '☑️' : '⬜'}
                  </span>
                  <span style={{ textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.6 : 1, fontSize: 14 }}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIONS FOOTER */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          {!isDone && (
            <button 
              onClick={() => onFocus(task)} 
              className="btn-ai-purple" 
              style={{ flex: 1, borderRadius: 12, fontSize: 15, fontWeight: 700, width: 'auto' }}
            >
              🎯 Focus
            </button>
          )}
          
          <button 
            onClick={() => onEdit(task)} 
            className="btn-white-outline" 
            style={{ flex: 1, borderColor: 'var(--border)' }}
          >
            ✏️ Edit
          </button>

          <button 
            onClick={() => onComplete(task.id)} 
            className={isDone ? "btn-white-outline" : "btn-orange"} 
            style={{ flex: 1 }}
          >
            {isDone ? '↺ Undo' : '✓ Done'}
          </button>
        </div>

      </div>
    </div>
  );
}

// EXPORT
window.TaskFormModal = TaskFormModal;
window.ViewTaskModal = ViewTaskModal;

console.log('✅ 13-08-modals.jsx loaded (Includes View Popup + CSS Fixes)');