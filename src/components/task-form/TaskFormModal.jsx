// js/features/task-form/13-08-modals.jsx
// ===========================================
// MODALS: TaskFormModal
// Updated: 2025-12-20 (View Modal uses 04-modals.css classes)
// ===========================================

import React, { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import TaskTumblerReminders from "./TaskTumblerReminders";
import PeopleManager from "../managers/PeopleManager";

export default function TaskFormModal({ task, categories, onClose, onSave, settings, tasks, goals, notify, updateTask }) {
  // FIX #92: Lock scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // ----------------------------
  // Reminders module (optional)
  // ----------------------------
  const R = TaskTumblerReminders || window.TaskTumblerReminders || {};
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
      subcategory: incoming.subcategory || incoming.subCategory || "",
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
      progress: incoming.progress !== undefined ? incoming.progress : (incoming.percentComplete || 0),
    };
    const draft = loadDraft();
    if (!draft) return d;
    return { ...d, ...draft, _draftSourceId: incoming?.id ? String(incoming.id) : "new" };
  }, []);

  const [data, setData] = useState(baseData);
  const [locationInput, setLocationInput] = useState(baseData.location || "");
  const [resolvedLocationData, setResolvedLocationData] = useState(null); // Store resolved address data
  const [showLocationNameDialog, setShowLocationNameDialog] = useState(false);
  const [locationNameInput, setLocationNameInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [subText, setSubText] = useState("");

  // Get subcategories for current category
  const subCategories = useMemo(() => {
    const cat = data.category || "";
    if (!cat) return [];
    const subs = settings?.subCategories?.[cat];
    return Array.isArray(subs) ? subs.filter(Boolean) : [];
  }, [data.category, settings?.subCategories]);

  // Clear subcategory when category changes if it's not valid for the new category
  useEffect(() => {
    if (data.subcategory) {
      // Clear if new category has no subcategories OR if current subcategory is not in the list
      if (subCategories.length === 0 || !subCategories.includes(data.subcategory)) {
        setData((prev) => ({ ...prev, subcategory: "" }));
      }
    }
  }, [data.category, subCategories]);
  // ----------------------------
  // PEOPLE: chip UI + inline editor
  // ----------------------------
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [personDraft, setPersonDraft] = useState({ 
    firstName: "", 
    lastName: "", 
    type: "client",
    phone: "", 
    email: "", 
    tags: "", 
    weight: 1, 
    compassCrmLink: "", 
    links: "", 
    notes: "",
    locationIds: []
  });

  // Helper to split name - handles both old format (name) and new format (firstName/lastName)
  const splitName = (person) => {
    // If already has firstName/lastName, use those
    if (person.firstName || person.lastName) {
      return { firstName: person.firstName || '', lastName: person.lastName || '' };
    }
    // Otherwise split the name field
    if (!person.name) return { firstName: '', lastName: '' };
    const parts = String(person.name).trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts.pop();
    const firstName = parts.join(' ');
    return { firstName, lastName };
  };

  // Helper to get display name - works with both formats
  const getDisplayName = (person) => {
    if (person.firstName || person.lastName) {
      return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Untitled';
    }
    return person.name || 'Untitled';
  };

  const getPersonRecordByName = (name) => {
    const n = String(name || "").trim().toLowerCase();
    return (Array.isArray(allPeople) ? allPeople : []).find(p => {
      const displayName = getDisplayName(p);
      return String(displayName || "").trim().toLowerCase() === n;
    }) || null;
  };

  const openPersonEditor = (name) => {
    const personName = String(name || "").trim();
    if (!personName) return;

    const rec = getPersonRecordByName(personName) || { 
      id: null, 
      name: personName, 
      firstName: "",
      lastName: "",
      type: "client",
      phone: "", 
      email: "", 
      tags: [], 
      weight: 1, 
      compassCrmLink: "", 
      links: [], 
      notes: "",
      locationIds: []
    };

    // Auto-split the name
    const nameParts = splitName(rec);

    setExpandedPerson(personName);
    setPersonDraft({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      type: rec.type || "client",
      phone: rec.phone || "",
      email: rec.email || "",
      tags: Array.isArray(rec.tags) ? rec.tags.join(", ") : (rec.tags || ""),
      weight: rec.weight || 1,
      compassCrmLink: rec.compassCrmLink || "",
      links: Array.isArray(rec.links) ? rec.links.join("\n") : (rec.links || ""),
      notes: rec.notes || "",
      locationIds: Array.isArray(rec.locationIds) ? rec.locationIds : [],
    });
  };

  const removePersonFromSession = (name) => {
    const n = String(name || "").trim();
    if (!n) return;
    setData((p) => ({ ...p, people: (p.people || []).filter(x => x !== n) }));
    if (expandedPerson === n) {
      setExpandedPerson(null);
      setPersonDraft({ 
        firstName: "", 
        lastName: "", 
        type: "client",
        phone: "", 
        email: "", 
        tags: "", 
        weight: 1, 
        compassCrmLink: "", 
        links: "", 
        notes: "",
        locationIds: []
      });
    }
  };

  const handleAddPersonChip = () => {
    addPersonValue(personInput);
  };

  const savePersonDraft = () => {
    const oldName = String(expandedPerson || "").trim();
    const fullName = [personDraft.firstName, personDraft.lastName].filter(Boolean).join(' ').trim();
    if (!fullName) return notify?.("First or last name required", "⚠️");

    const existing = getPersonRecordByName(oldName) || getPersonRecordByName(fullName);
    const id = existing?.id || ("p_" + Date.now());

    // Parse tags and links
    const parseTags = (raw) => {
      if (Array.isArray(raw)) return raw.filter(Boolean);
      return String(raw || "")
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
    };

    const parseLinks = (raw) => {
      const s = String(raw || "").trim();
      if (!s) return [];
      return s
        .split(/\n|,/g)
        .map(x => x.trim())
        .filter(Boolean);
    };

    const nextRec = {
      ...(existing || {}),
      id,
      name: fullName, // Keep name for backward compatibility
      firstName: String(personDraft.firstName || "").trim(),
      lastName: String(personDraft.lastName || "").trim(),
      type: personDraft.type || "client",
      phone: String(personDraft.phone || "").trim(),
      email: String(personDraft.email || "").trim(),
      tags: parseTags(personDraft.tags),
      weight: parseInt(personDraft.weight) || 1,
      compassCrmLink: String(personDraft.compassCrmLink || "").trim(),
      links: parseLinks(personDraft.links),
      notes: String(personDraft.notes || "").trim(),
      locationIds: Array.isArray(personDraft.locationIds) ? personDraft.locationIds.filter(Boolean) : [],
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    // Update global People DB (replace by id if possible, else by name match)
    const list = Array.isArray(allPeople) ? allPeople : [];
    const idxById = list.findIndex(p => p?.id && p.id === id);
    const idxByName = list.findIndex(p => String(p?.name || "").trim().toLowerCase() === String(oldName || "").trim().toLowerCase());
    const idx = idxById >= 0 ? idxById : idxByName;

    const nextList = (idx >= 0)
      ? list.map((p, i) => (i === idx ? nextRec : p))
      : [...list, nextRec];

    updatePeopleGlobally(nextList);

    // If name changed, also update the task's people array
    if (oldName && fullName && oldName !== fullName) {
      setData((p) => ({
        ...p,
        people: (p.people || []).map(x => (x === oldName ? fullName : x)),
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
        setData((p) => ({ ...p, subtasks: [...(p.subtasks || []), ...s.map((x) => ({ title: String(x), completed: false }))] }));
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
          subtasks: Array.isArray(aiData.subtasks) ? [...(p.subtasks || []), ...aiData.subtasks.map((t) => ({ title: String(t), completed: false }))] : p.subtasks,
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
    
    // Check if person exists in global DB using same logic as getPersonRecordByName
    const existingPerson = getPersonRecordByName(name);
    
    // Use the stored name format if person exists, otherwise use the entered name
    const nameToStore = existingPerson ? (existingPerson.name || getDisplayName(existingPerson)) : name;
    
    // Check if person already exists in task (using stored name format)
    // Check both exact match and case-insensitive match
    const currentPeople = data.people || [];
    const alreadyExists = currentPeople.some(p => {
      const pName = String(p || '').trim();
      const nameToStoreLower = nameToStore.toLowerCase();
      const pNameLower = pName.toLowerCase();
      return pName === nameToStore || pNameLower === nameToStoreLower;
    });
    
    if (!alreadyExists) {
      setData((prev) => ({ ...prev, people: [...(prev.people || []), nameToStore] }));
    }
    
    if (!existingPerson) {
      // Split name into firstName/lastName
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      
      updatePeopleGlobally([...(allPeople || []), { 
        id: "p_" + Date.now(), 
        name, // Keep name for backward compatibility
        firstName,
        lastName,
        type: "client",
        phone: "",
        email: "",
        tags: [],
        weight: 1,
        compassCrmLink: "",
        links: [],
        notes: "",
        locationIds: [],
        createdAt: new Date().toISOString() 
      }]);
      notify?.(`Added ${name} to Database`, "👤");
    }
    setPersonInput("");
  };

  const handleAddPerson = () => addPersonValue(personInput);

  const saveLocationToTaskAndDB = () => {
    const v = String(locationInput || "").trim();
    if (!v) return;
    
    // If we have resolved location data with GPS, show dialog to name it
    if (resolvedLocationData && resolvedLocationData.lat && resolvedLocationData.lon) {
      setLocationNameInput(v); // Pre-fill with resolved address
      setShowLocationNameDialog(true);
      return;
    }
    
    // Otherwise, save as before
    setData((p) => ({ ...p, location: v }));
    const exists = (allLocations || []).some((l) => (l.name || "").toLowerCase() === v.toLowerCase());
    if (!exists) {
      updateLocationsGlobally([...(allLocations || []), { id: "loc_" + Date.now(), name: v, address: v, type: "saved" }]);
      notify?.("Location Saved to DB", "📍");
    }
  };

  const handleSaveLocationWithName = () => {
    const name = String(locationNameInput || "").trim();
    if (!name) return notify?.("Name required", "⚠️");
    
    const address = resolvedLocationData?.resolvedAddress || locationInput;
    const shortAddress = resolvedLocationData?.shortAddress || locationInput;
    const lat = resolvedLocationData?.lat || data.locationCoords?.lat;
    const lon = resolvedLocationData?.lon || data.locationCoords?.lon;
    
    const newLoc = {
      id: "loc_" + Date.now(),
      name: name,
      address: address,
      resolvedAddress: resolvedLocationData?.resolvedAddress || null,
      shortAddress: shortAddress,
      lat: lat ? parseFloat(lat) : null,
      lon: lon ? parseFloat(lon) : null,
      coords: (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null,
      type: "saved",
      createdAt: new Date().toISOString()
    };
    
    setData((p) => ({ ...p, location: name }));
    updateLocationsGlobally([...(allLocations || []), newLoc]);
    setShowLocationNameDialog(false);
    setLocationNameInput("");
    setResolvedLocationData(null);
    notify?.("Location Saved with Custom Name", "📍");
  };

  const getTaskLocationOnce = () => {
    if (!navigator.geolocation) return notify?.("Geolocation not supported.", "❌");
    setIsLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(5));
      const lon = parseFloat(pos.coords.longitude.toFixed(5));
      setData((prev) => ({ ...prev, locationCoords: { lat, lon } }));
      try {
        const addressResult = (typeof window.fetchLocationName === "function") ? await window.fetchLocationName(lat, lon) : null;
        let addressStr = `${lat}, ${lon}`;
        let resolvedData = null;
        
        if (addressResult) {
          // Handle both string and object returns
          if (typeof addressResult === 'string') {
            addressStr = addressResult;
            resolvedData = {
              resolvedAddress: addressResult,
              shortAddress: addressResult,
              lat,
              lon
            };
          } else if (typeof addressResult === 'object') {
            addressStr = addressResult.shortAddress || addressResult.resolvedAddress || addressStr;
            resolvedData = {
              resolvedAddress: addressResult.resolvedAddress || addressStr,
              shortAddress: addressResult.shortAddress || addressStr,
              lat,
              lon
            };
          }
        }
        
        setLocationInput(addressStr);
        setData((prev) => ({ ...prev, location: addressStr }));
        setResolvedLocationData(resolvedData); // Store resolved data for saving
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
    try {
      sessionStorage.removeItem(draftKey);
    } catch (err) {
      console.warn('Failed to clear draft from sessionStorage:', err);
    }
    // Explicitly ensure people array is included and is an array
    const peopleArray = Array.isArray(data.people) ? data.people.filter(Boolean) : [];
    onSave?.({ 
      ...data, 
      people: peopleArray, // Explicitly include people array
      location: locationInput, 
      weight: Number(data.weight), 
      progress: data.progress !== undefined ? data.progress : (data.percentComplete || 0),
      percentComplete: data.progress !== undefined ? data.progress : (data.percentComplete || 0), // Keep both for backward compatibility
      reminders, 
      reminderMode: mode, 
      reminderAnchor: anchor, 
      reminderOffsetValue: val, 
      reminderOffsetUnit: unit 
    });
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
    <Fragment>
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
              {subCategories.length > 0 && (
                <>
                  <input className="f-input" style={{ marginTop: 8 }} value={data.subcategory || ""} onChange={(e) => setData({ ...data, subcategory: e.target.value })} list="subcat-list" />
                  <datalist id="subcat-list">{subCategories.map((s) => <option key={s} value={s} />)}</datalist>
                </>
              )}
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
                <input className="f-input" style={{ marginBottom: 0, flex: 1 }} value={subText} onChange={(e) => setSubText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && subText.trim()) { e.preventDefault(); setData((d) => ({ ...d, subtasks: [...(d.subtasks || []), { title: subText.trim(), completed: false }] })); setSubText(""); } }} placeholder="Add subtask..." />
                <button type="button" className="btn-orange-small" onClick={() => { if (subText.trim()) { setData((d) => ({ ...d, subtasks: [...(d.subtasks || []), { title: subText.trim(), completed: false }] })); setSubText(""); } }}>Add</button>
              </div>
              <div style={{ background: "var(--input-bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                {(data.subtasks || []).map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                    <input type="checkbox" checked={!!s.completed} onChange={() => { const next = [...(data.subtasks || [])]; next[i] = { ...next[i], completed: !next[i].completed }; setData({ ...data, subtasks: next }); }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{s.title}</span>
                    <span onClick={() => setData((d) => ({ ...d, subtasks: (d.subtasks || []).filter((_, idx) => idx !== i) }))} style={{ color: "var(--danger)", cursor: "pointer" }}>×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <HeaderToggle title="📍 Context (People & Places)" section="context" />
          {expanded.context && (
            <div style={{ marginBottom: 15 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    className="f-input" 
                    style={{ marginBottom: 0, width: '100%' }} 
                    value={locationInput} 
                    onChange={(e) => { 
                      setLocationInput(e.target.value); 
                      setData(p => ({...p, location: e.target.value}));
                      // Clear resolved data when manually editing
                      if (resolvedLocationData) setResolvedLocationData(null);
                    }} 
                    list="loc-list" 
                    placeholder="📍 Location..." 
                  />
                  {resolvedLocationData && locationInput && (
                    <div 
                      onClick={() => {
                        setLocationNameInput(locationInput);
                        setShowLocationNameDialog(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'var(--primary)',
                        fontWeight: 700,
                        padding: '2px 8px',
                        background: 'rgba(255, 107, 53, 0.1)',
                        borderRadius: 4,
                        userSelect: 'none'
                      }}
                      title="Click to save with custom name"
                    >
                      Save as...
                    </div>
                  )}
                </div>
                <datalist id="loc-list">{(allLocations || []).map(l => <option key={l.id} value={l.name} />)}</datalist>
                <button type="button" className="btn-white-outline" onClick={saveLocationToTaskAndDB} aria-label="Save location">💾</button>
                <button type="button" className="btn-white-outline" onClick={getTaskLocationOnce} aria-label="Get current location">{isLocLoading ? "⏳" : "📍"}</button>
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
                  {(Array.isArray(data?.people) ? data.people : []).map((p) => {
                    const personRecord = getPersonRecordByName(p);
                    const displayName = personRecord ? getDisplayName(personRecord) : p;
                    const hasCompass = personRecord && (personRecord.compassCrmLink || personRecord.externalId);
                    const hasPhone = personRecord && personRecord.phone;
                    
                    return (
                      <span
                        key={p}
                        style={{
                          background: "var(--primary)",
                          color: "#fff",
                          borderRadius: 20,
                          padding: "6px 12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
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
                          {displayName}
                        </span>
                        {/* Subtle clickable links */}
                        {hasCompass && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (personRecord.compassCrmLink) {
                                window.open(personRecord.compassCrmLink, '_blank', 'noopener,noreferrer');
                              } else if (personRecord.externalId && window.openCompass) {
                                window.openCompass(personRecord, 'profile', displayName);
                              }
                            }}
                            style={{
                              cursor: "pointer",
                              fontSize: 11,
                              opacity: 0.8,
                              padding: '2px 4px',
                              borderRadius: 4,
                              background: 'rgba(255,255,255,0.2)',
                              lineHeight: 1
                            }}
                            title="Open in Compass CRM"
                          >
                            🧭
                          </span>
                        )}
                        {hasPhone && (
                          <a
                            href={`tel:${personRecord.phone.replace(/\D/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              cursor: "pointer",
                              fontSize: 11,
                              opacity: 0.8,
                              padding: '2px 4px',
                              borderRadius: 4,
                              background: 'rgba(255,255,255,0.2)',
                              lineHeight: 1,
                              textDecoration: 'none',
                              color: '#fff'
                            }}
                            title={`Call ${displayName}`}
                          >
                            📞
                          </a>
                        )}
                        <span
                          onClick={() => removePersonFromSession(p)}
                          style={{ cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                          aria-label={`Remove ${p}`}
                          title="Remove"
                        >
                          ×
                        </span>
                      </span>
                    );
                  })}

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
                    placeholder="Add person..."
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
                    {(Array.isArray(allPeople) ? allPeople : []).map((p) => {
                      const displayName = getDisplayName(p);
                      return <option key={p.id || p.name} value={displayName} />;
                    })}
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

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                      <div>
                        <div className="f-label" style={{ marginBottom: 6 }}>First Name</div>
                        <input
                          className="f-input"
                          value={personDraft.firstName}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, firstName: e.target.value }))}
                          placeholder="First name..."
                          autoFocus
                        />
                      </div>
                      <div>
                        <div className="f-label" style={{ marginBottom: 6 }}>Last Name</div>
                        <input
                          className="f-input"
                          value={personDraft.lastName}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, lastName: e.target.value }))}
                          placeholder="Last name..."
                        />
                      </div>
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
                          className="f-input"
                          min="1"
                          value={personDraft.weight}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, weight: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div>
                        <div className="f-label" style={{ marginBottom: 6 }}>Phone</div>
                        <input
                          className="f-input"
                          type="tel"
                          value={personDraft.phone}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <div className="f-label" style={{ marginBottom: 6 }}>Email</div>
                        <input
                          className="f-input"
                          type="email"
                          value={personDraft.email}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, email: e.target.value }))}
                          placeholder="name@email.com"
                        />
                      </div>
                      <div>
                        <div className="f-label" style={{ marginBottom: 6 }}>Compass CRM Link</div>
                        <input
                          className="f-input"
                          placeholder="https://..."
                          value={personDraft.compassCrmLink}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, compassCrmLink: e.target.value }))}
                        />
                      </div>
                      <div>
                        <div className="f-label" style={{ marginBottom: 6 }}>Tags</div>
                        <input
                          className="f-input"
                          placeholder="tag1, tag2, tag3"
                          value={personDraft.tags}
                          onChange={(e) => setPersonDraft((d) => ({ ...d, tags: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div className="f-label" style={{ marginBottom: 6 }}>Connected Locations</div>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 8, 
                        padding: 10, 
                        background: 'var(--input-bg)', 
                        borderRadius: 8, 
                        border: '1px solid var(--border)',
                        maxHeight: 120,
                        overflowY: 'auto'
                      }}>
                        {allLocations.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic' }}>
                            No locations saved yet
                          </div>
                        ) : (
                          allLocations.map(loc => {
                            const isSelected = Array.isArray(personDraft.locationIds) && personDraft.locationIds.includes(loc.id);
                            return (
                              <label
                                key={loc.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 10px',
                                  background: isSelected ? 'var(--primary)' : 'transparent',
                                  color: isSelected ? 'white' : 'var(--text)',
                                  borderRadius: 8,
                                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: isSelected ? 700 : 500,
                                  userSelect: 'none'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const currentIds = Array.isArray(personDraft.locationIds) ? personDraft.locationIds : [];
                                    if (e.target.checked) {
                                      setPersonDraft((d) => ({ ...d, locationIds: [...currentIds, loc.id] }));
                                    } else {
                                      setPersonDraft((d) => ({ ...d, locationIds: currentIds.filter(id => id !== loc.id) }));
                                    }
                                  }}
                                  style={{ margin: 0, cursor: 'pointer' }}
                                />
                                {loc.name || loc.label || 'Unnamed Location'}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div className="f-label" style={{ marginBottom: 6 }}>Links</div>
                      <textarea
                        className="f-textarea"
                        style={{ minHeight: 60 }}
                        placeholder="One per line or comma-separated"
                        value={personDraft.links}
                        onChange={(e) => setPersonDraft((d) => ({ ...d, links: e.target.value }))}
                      />
                    </div>

                    <div style={{ marginTop: 10 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              <div>
                <label className="f-label">Progress: {data.progress !== undefined ? data.progress : (data.percentComplete || 0)}%</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={data.progress !== undefined ? data.progress : (data.percentComplete || 0)} 
                  onChange={(e) => {
                    const progress = parseInt(e.target.value, 10);
                    setData({ ...data, progress, percentComplete: progress }); // Update both for backward compatibility
                  }} 
                  style={{ width: "100%" }} 
                />
              </div>
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
      {showPeopleManager && PeopleManager && (
        createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.peopleManager }}>
            <PeopleManager 
              people={allPeople} 
              setPeople={updatePeopleGlobally} 
              onClose={() => {
                console.log('Closing PeopleManager...');
                setShowPeopleManager(false);
              }} 
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

      {/* Location Name Dialog */}
      {showLocationNameDialog && (
        createPortal(
          <div 
            className="modal-overlay" 
            style={{ zIndex: Z_INDEX.peopleManager + 1 }} 
            onClick={() => setShowLocationNameDialog(false)}
          >
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>Save Location</h3>
                <button type="button" onClick={() => setShowLocationNameDialog(false)} aria-label="Close">×</button>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label className="f-label">Location Name</label>
                <input 
                  className="f-input" 
                  value={locationNameInput}
                  onChange={(e) => setLocationNameInput(e.target.value)}
                  placeholder="Enter a name for this location..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveLocationWithName();
                    } else if (e.key === 'Escape') {
                      setShowLocationNameDialog(false);
                    }
                  }}
                />
              </div>
              
              {resolvedLocationData && (
                <div style={{ 
                  background: 'var(--input-bg)', 
                  padding: 12, 
                  borderRadius: 8, 
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--text-light)'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Address:</div>
                  <div>{resolvedLocationData.resolvedAddress || resolvedLocationData.shortAddress}</div>
                  {resolvedLocationData.lat && resolvedLocationData.lon && (
                    <div style={{ marginTop: 4, fontSize: 11 }}>
                      GPS: {resolvedLocationData.lat}, {resolvedLocationData.lon}
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ display: "flex", gap: 10 }}>
                <button 
                  type="button" 
                  className="btn-white-outline" 
                  onClick={() => setShowLocationNameDialog(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-orange" 
                  onClick={handleSaveLocationWithName}
                  style={{ flex: 1 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </Fragment>
  );
}

// Expose on window for backward compatibility
if (typeof window !== 'undefined') {
  window.TaskFormModal = TaskFormModal;
}

