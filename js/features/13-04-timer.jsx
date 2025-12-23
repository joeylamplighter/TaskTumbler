// js/13-04-timer.jsx
// Updated: 2025-12-21 18:10 PT
// ===========================================
// TIMER TAB V4 (RECONCILED + PERSISTENT FRIENDLY)
// - Finish works even while running (no forced pause)
// - People chips: double click to expand inline editor (no prompt boxes)
// - Edits persist to Saved People via window.getSavedPeople/window.setSavedPeople or localStorage fallback
// - Location: saved locations autosuggest + optional GPS resolve + save favorite
//
// HERO (smooth):
// - Timer display updates inside a memoized ClockHero only
// - Whole tab no longer re-renders every second
// - Glow only when running, soft, and pulses via opacity (not harsh)
// ===========================================

import React from 'react'

function TimerTab({ timerState, updateTimer, onToggle, onReset, onSave, categories, settings, notify }) {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;

  // Category picker
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerWrapRef = useRef(null);

  // --- DATA LOADING (use shared utilities) ---
  const TabUtils = window.TabUtils || {};
  const getSavedPeopleUtil = TabUtils.getSavedPeople || (() => {
    try {
      if (typeof window.getSavedPeople === "function") return window.getSavedPeople() || [];
      return JSON.parse(localStorage.getItem("savedPeople") || "[]");
    } catch { return []; }
  });
  const getSavedLocationsUtil = TabUtils.getSavedLocations || (() => {
    try {
      if (typeof window.getSavedLocationsV1 === "function") return window.getSavedLocationsV1() || [];
      return JSON.parse(localStorage.getItem("savedLocations_v1") || "[]");
    } catch { return []; }
  });
  const getCategoriesUtil = TabUtils.getCategories || (() => {
    try {
      return JSON.parse(localStorage.getItem("categories") || "[]");
    } catch { return []; }
  });
  const setSavedPeopleUtil = TabUtils.setSavedPeople || ((people) => {
    try {
      if (typeof window.setSavedPeople === "function") return window.setSavedPeople(people);
      localStorage.setItem("savedPeople", JSON.stringify(people));
      window.dispatchEvent(new Event("people-updated"));
      return true;
    } catch { return false; }
  });
  const setSavedLocationsUtil = TabUtils.setSavedLocations || ((locations) => {
    try {
      if (typeof window.setSavedLocationsV1 === "function") return window.setSavedLocationsV1(locations);
      localStorage.setItem("savedLocations_v1", JSON.stringify(locations));
      window.dispatchEvent(new Event("locations-updated"));
      return true;
    } catch { return false; }
  });

  const [allPeople, setAllPeople] = useState(() => getSavedPeopleUtil());
  const [allLocations, setAllLocations] = useState(() => getSavedLocationsUtil());
  const [localCategories, setLocalCategories] = useState(() => getCategoriesUtil());

  // --- LOCAL STATE ---
  const [isLocLoading, setIsLocLoading] = useState(false);
  const [personInput, setPersonInput] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState(null);

  // People inline editor
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [personDraft, setPersonDraft] = useState({ name: "", phone: "", email: "", notes: "", links: "" });

  const isRunning = !!timerState?.isRunning;

  // --- STYLES ---
  const cardStyle = useMemo(
    () => ({
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6,
      padding: 24,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }),
    []
  );

  // --- GLOBAL LISTENERS (use shared utilities) ---
  useEffect(() => {
    const refresh = () => {
      setAllPeople(getSavedPeopleUtil());
      setAllLocations(getSavedLocationsUtil());
      setLocalCategories(getCategoriesUtil());
    };

    window.addEventListener("people-updated", refresh);
    window.addEventListener("locations-updated", refresh);
    window.addEventListener("categories-updated", refresh);

    return () => {
      window.removeEventListener("people-updated", refresh);
      window.removeEventListener("locations-updated", refresh);
      window.removeEventListener("categories-updated", refresh);
    };
  }, []);

  // close picker on outside click
  useEffect(() => {
    if (!isPickerOpen) return;
    const onDown = (e) => {
      if (!pickerWrapRef.current) return;
      if (!pickerWrapRef.current.contains(e.target)) setIsPickerOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [isPickerOpen]);

  // --- HELPERS ---
  const getElapsed = useCallback(() => {
    const stored = timerState?.storedTime || 0;
    if (!timerState?.isRunning) return stored;
    const start = timerState?.startTime || Date.now();
    return stored + Math.floor((Date.now() - start) / 1000);
  }, [timerState?.storedTime, timerState?.isRunning, timerState?.startTime]);

  const fmt = useCallback((s) => (window.formatDuration ? window.formatDuration(s) : String(s)), []);

  const buildFullLabel = (name, address) => {
    const n = (name || "").trim();
    const a = (address || "").trim();
    if (n && a) return `${n} — ${a}`;
    if (a) return a;
    return n || "";
  };

  const getSavedLocs = () => {
    try {
      const raw = getSavedLocationsUtil();
      const migrated = (Array.isArray(raw) ? raw : []).map((l) => {
        const name = (l?.name || l?.label || "").trim();
        const address = (l?.address || l?.addressLabel || l?.formattedAddress || "").trim();
        const gpsLabel = (l?.gpsLabel || l?.fullLabel || "").trim() || buildFullLabel(name, address) || address || name;
        const fullLabel = (l?.fullLabel || "").trim() || gpsLabel;
        return {
          ...l,
          name: name || l?.name || "",
          address: address || l?.address || "",
          addressLabel: address || l?.addressLabel || "",
          gpsLabel,
          fullLabel,
        };
      });
      const changed = JSON.stringify(raw) !== JSON.stringify(migrated);
      if (changed) {
        setSavedLocationsUtil(migrated);
      }
      return migrated;
    } catch {
      return [];
    }
  };

  const setSavedLocs = (list) => {
    setSavedLocationsUtil(list);
    setAllLocations(list);
  };

  const getSavedPeopleList = () => getSavedPeopleUtil();
  const setSavedPeopleList = (list) => {
    setSavedPeopleUtil(list);
    setAllPeople(list);
  };

  const ensurePersonRecord = (name) => {
    const clean = (name || "").trim();
    if (!clean) return null;

    const list = getSavedPeopleList();
    const found = list.find((p) => (p.name || "").toLowerCase() === clean.toLowerCase());
    if (found) return found;

    const newRec = { id: "p_" + Date.now(), name: clean, weight: 1, phone: "", email: "", notes: "", links: "" };
    setSavedPeopleList([...list, newRec]);
    return newRec;
  };

  const openPersonEditor = (name) => {
    const rec = ensurePersonRecord(name);
    if (!rec) return;
    setExpandedPerson(rec.name);
    setPersonDraft({
      name: rec.name || name,
      phone: rec.phone || "",
      email: rec.email || "",
      notes: rec.notes || "",
      links: rec.links || "",
    });
  };

  const savePersonDraft = () => {
    const cleanName = (personDraft.name || "").trim();
    if (!cleanName) return;

    const list = getSavedPeopleList();
    const idx = list.findIndex((p) => (p.name || "").toLowerCase() === (expandedPerson || "").toLowerCase());
    const base = idx >= 0 ? list[idx] : { id: "p_" + Date.now(), name: cleanName, weight: 1 };

    const updated = {
      ...base,
      name: cleanName,
      phone: (personDraft.phone || "").trim(),
      email: (personDraft.email || "").trim(),
      notes: personDraft.notes || "",
      links: (personDraft.links || "").trim(),
    };

    const nextList = idx >= 0 ? list.map((p, i) => (i === idx ? updated : p)) : [...list, updated];
    setSavedPeopleList(nextList);

    const current = Array.isArray(timerState?.people) ? timerState.people : [];
    const nextSession = current.map((p) => (p === expandedPerson ? cleanName : p));
    updateTimer({ people: Array.from(new Set(nextSession)) });

    setExpandedPerson(null);
    notify?.("Person updated", "✅");
  };

  const removePersonFromSession = (name) => {
    const current = Array.isArray(timerState?.people) ? timerState.people : [];
    updateTimer({ people: current.filter((p) => p !== name) });
    if (expandedPerson && name === expandedPerson) setExpandedPerson(null);
  };

  const handleAddPersonChip = () => {
    const raw = (personInput || "").trim();
    if (!raw) return;

    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const current = Array.isArray(timerState?.people) ? timerState.people : [];
    const next = Array.from(new Set([...current, ...parts]));
    updateTimer({ people: next });

    const existing = Array.isArray(allPeople) ? allPeople : [];
    const existingNames = new Set(existing.map((p) => (p.name || "").toLowerCase()));
    const additions = parts
      .filter((n) => !existingNames.has(n.toLowerCase()))
      .map((n) => ({
        id: "p_" + Date.now() + "_" + n.replace(/\s+/g, "_"),
        name: n,
        weight: 1,
        phone: "",
        email: "",
        notes: "",
        links: "",
      }));

    if (additions.length) {
      setSavedPeopleList([...existing, ...additions]);
      notify?.(`Saved ${additions.length} people`, "👤");
    }

    setPersonInput("");
  };

  const attachSavedLocationByName = (name) => {
    const clean = (name || "").trim();
    if (!clean) return;

    const saved = getSavedLocs();
    const match = saved.find((l) => {
      const lower = clean.toLowerCase();
      const n = (l.name || l.label || "").toLowerCase();
      const a = (l.address || l.addressLabel || "").toLowerCase();
      const f = (l.fullLabel || l.gpsLabel || "").toLowerCase();
      return n === lower || a === lower || f === lower;
    });

    if (!match) return;

    updateTimer({
      location: match.fullLabel || match.gpsLabel || match.name || match.addressLabel || clean,
      locationId: match.id || null,
      locationCoords: match.coords || null,
    });

    setResolvedLocation(null);
  };

  const handleLocationInput = (e) => {
    const val = e.target.value;
    updateTimer({ location: val });
    attachSavedLocationByName(val);
  };

  const resetLocation = () => {
    updateTimer({ location: "", locationId: null, locationCoords: null });
    setResolvedLocation(null);
    notify?.("Location reset", "↺");
  };

  const handleFinish = () => {
    const d = getElapsed();
    if (d <= 0) return notify?.("Nothing to save yet", "ℹ️");

    onSave?.({
      title: timerState?.activityName || "Tracked Session",
      category: timerState?.activityCategory || "General",
      duration: d,
      people: Array.isArray(timerState?.people) ? timerState.people : [],
      locationLabel: timerState?.location || "",
      locationCoords: timerState?.locationCoords || null,
      locationId: timerState?.locationId || null,
      notes: timerState?.notes || "",
      type: "timer",
    });

    setResolvedLocation(null);
    setExpandedPerson(null);
  };

  const handleGPS = () => {
    if (resolvedLocation && resolvedLocation.label === (timerState?.location || "")) {
      const saved = getSavedLocs();
      const finalLabel = (resolvedLocation.label || "").trim() || "Saved Place";

      const newLoc = {
        id: "loc_" + Date.now(),
        name: finalLabel,
        address: (resolvedLocation.address || "").trim(),
        addressLabel: (resolvedLocation.address || resolvedLocation.label || "").trim(),
        gpsLabel: (resolvedLocation.gpsLabel || resolvedLocation.full || resolvedLocation.label || "").trim(),
        fullLabel: (resolvedLocation.full || resolvedLocation.gpsLabel || resolvedLocation.label || "").trim() || finalLabel,
        label: (resolvedLocation.full || resolvedLocation.gpsLabel || resolvedLocation.label || "").trim() || finalLabel,
        coords: resolvedLocation.coords || null,
        lat: resolvedLocation.coords?.lat ?? null,
        lon: resolvedLocation.coords?.lon ?? null,
        lng: resolvedLocation.coords?.lon ?? null,
        source: "gps",
        createdAt: new Date().toISOString(),
      };

      setSavedLocs([...saved, newLoc]);
      updateTimer({ location: newLoc.fullLabel || finalLabel, locationId: newLoc.id, locationCoords: newLoc.coords });
      setResolvedLocation(null);
      notify?.("Location saved to favorites", "💾");
      return;
    }

    if (!navigator.geolocation) return notify?.("GPS not supported", "❌");

    setIsLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lon: longitude };

        let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          if (window.fetchLocationName) {
            const maybe = await window.fetchLocationName(latitude, longitude);
            if (maybe) label = typeof maybe === "string" ? maybe : maybe.label || maybe.address || label;
          }
        } catch {}

        updateTimer({ location: label, locationCoords: coords, locationId: null });
        setResolvedLocation({ label, coords, address: label, gpsLabel: label, full: label });
        setIsLocLoading(false);
        notify?.("Resolved. Tap again to save.", "📍");
      },
      () => {
        setIsLocLoading(false);
        notify?.("GPS Failed", "❌");
      },
      { enableHighAccuracy: true }
    );
  };

  // Categories
  const categoryOptions = useMemo(() => {
    const fromLocal = Array.isArray(localCategories) ? localCategories : [];
    const fromProp = Array.isArray(categories) ? categories : [];
    const merged = Array.from(new Set([...fromProp, ...fromLocal])).filter(Boolean);

    const current = (timerState?.activityCategory || "General").trim();
    if (current && !merged.includes(current)) merged.unshift(current);

    return merged.length ? merged : ["General", "Work", "Personal", "Health"];
  }, [localCategories, categories, timerState?.activityCategory]);

  // Keyframes injected once (safe to keep even if unused)
  const heroCSS = useMemo(
    () => `
      @keyframes ttGlowPulseSoft {
        0%   { opacity: 0.18; }
        50%  { opacity: 0.62; }
        100% { opacity: 0.18; }
      }
      @keyframes softGlow {
        0%, 100% { 
          box-shadow: 0 0 60px rgba(255, 107, 53, 0.3),
                      0 0 120px rgba(255, 107, 53, 0.2),
                      0 0 180px rgba(255, 107, 53, 0.1),
                      0 0 240px rgba(255, 107, 53, 0.05);
        }
        50% { 
          box-shadow: 0 0 90px rgba(255, 107, 53, 0.5),
                      0 0 180px rgba(255, 107, 53, 0.3),
                      0 0 270px rgba(255, 107, 53, 0.2),
                      0 0 360px rgba(255, 107, 53, 0.1);
        }
      }
    `,
    []
  );

  // ==========================================
// RENDER
// ==========================================
  return (
    <div style={{ padding: "32px 24px", paddingBottom: 120, maxWidth: 650, margin: "0 auto" }}>
      <style>{heroCSS}</style>

    {/* HERO */}
    <div style={{ marginTop: 12, marginBottom: 32 }}>
      <ClockHero timerState={timerState} getElapsed={getElapsed} fmt={fmt} />

      {/* ACTIVITY NAME (flat) */}
      <div style={{ maxWidth: 620, margin: "24px auto 20px" }}>
        <input
          type="text"
          placeholder="What are you doing?"
          value={timerState?.activityName || ""}
          onChange={(e) => updateTimer({ activityName: e.target.value })}
          style={{
            width: "100%",
            fontSize: 28,
            fontWeight: 900,
            textAlign: "center",
            border: "none",
            background: "transparent",
            color: "var(--text)",
            outline: "none",
            padding: "12px 0",
            textShadow: "none",
            fontFamily: "'Fredoka', sans-serif",
            transition: "opacity 0.2s ease",
          }}
          onFocus={(e) => e.target.style.opacity = "1"}
          onBlur={(e) => e.target.style.opacity = "1"}
        />
      </div>

      {/* CATEGORY (sleek inline) */}
      <div style={{ maxWidth: 540, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.95 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              opacity: 0.45,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            CATEGORY
          </span>

          <div style={{ position: "relative" }}>
            <select
              value={timerState?.activityCategory || "Work"}
              onChange={(e) => updateTimer({ activityCategory: e.target.value })}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.95)",
                padding: "10px 36px 10px 14px",
                borderRadius: 4,
                fontWeight: 900,
                fontSize: 13,
                lineHeight: 1,
                cursor: "pointer",
                outline: "none",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c} style={{ color: "#111" }}>
                  {c}
                </option>
              ))}
            </select>

            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: 11,
                opacity: 0.6,
              }}
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ maxWidth: 540, margin: "0 auto", width: "100%" }}>
        <div style={{ 
          display: "grid", 
          gap: 16, 
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          minWidth: 0,
        }}>
          {(() => {
            // Always show two buttons if timer has been started (isRunning) or has any time
            const hasElapsed = (getElapsed() || 0) > 0;
            const hasStoredTime = (timerState?.storedTime || 0) > 0;
            const hasStartTime = !!timerState?.startTime;
            const shouldShowTwoButtons = hasElapsed || isRunning || hasStoredTime || hasStartTime;
            return shouldShowTwoButtons;
          })() ? (
            <>
              <button
                onClick={onToggle}
                style={{
                  height: 68,
                  borderRadius: 4,
                  fontSize: 18,
                  fontWeight: 900,
                  background: isRunning 
                    ? "rgba(255,255,255,0.08)" 
                    : "var(--primary)",
                  border: isRunning 
                    ? "2px solid rgba(255,255,255,0.15)" 
                    : "2px solid transparent",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: isRunning 
                    ? "0 4px 20px rgba(0,0,0,0.2)" 
                    : "0 6px 24px rgba(255, 107, 53, 0.35)",
                  boxSizing: "border-box",
                }}
              >
                {isRunning ? "⏸ Pause" : "▶ Resume"}
              </button>
              <button
                onClick={handleFinish}
                style={{
                  height: 68,
                  borderRadius: 4,
                  fontSize: 18,
                  fontWeight: 900,
                  background: "var(--success)",
                  border: "2px solid transparent",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 6px 24px rgba(0, 184, 148, 0.35)",
                  boxSizing: "border-box",
                }}
              >
                ✓ Finish
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              style={{
                height: 68,
                borderRadius: 4,
                fontSize: 18,
                fontWeight: 900,
                background: "var(--primary)",
                border: "2px solid transparent",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 6px 24px rgba(255, 107, 53, 0.35)",
                boxSizing: "border-box",
                gridColumn: "1 / -1",
              }}
            >
              ▶ Start
            </button>
          )}
        </div>

        {(getElapsed() || 0) > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              <button
              onClick={onReset}
              className="btn-white-outline"
              style={{ 
                padding: "10px 18px", 
                borderRadius: 4, 
                fontWeight: 900, 
                opacity: 0.85,
                fontSize: 13,
              }}
              title="Reset timer session"
            >
              ↺ Reset Timer
            </button>
            
            {/* Log to Compass Button - Only show when paused or finished */}
            {!isRunning && window.openCompass && (() => {
              const primaryPerson = Array.isArray(timerState?.people) && timerState.people.length > 0 
                ? timerState.people[0] 
                : null;
              
              if (!primaryPerson) return null;
              
              // Get person record
              const getPersonRecord = (name) => {
                try {
                  const list = getSavedPeopleList();
                  return list.find((p) => (p.name || "").toLowerCase() === (name || "").toLowerCase()) || null;
                } catch {
                  return null;
                }
              };
              
              const personRecord = getPersonRecord(primaryPerson);
              
              const handleLogToCompass = () => {
                // Format session notes
                const elapsed = getElapsed();
                const hours = Math.floor(elapsed / 3600);
                const minutes = Math.floor((elapsed % 3600) / 60);
                const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                
                const notes = [
                  `Session: ${timerState?.activityName || 'Tracked Session'}`,
                  `Duration: ${durationText}`,
                  timerState?.location ? `Location: ${timerState.location}` : '',
                  timerState?.notes ? `Notes: ${timerState.notes}` : '',
                  `Date: ${new Date().toLocaleString()}`
                ].filter(Boolean).join('\n');
                
                // Copy to clipboard
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(notes).then(() => {
                    notify?.('Notes copied to clipboard', '📋');
                  }).catch(() => {
                    // Fallback: select text in a temporary textarea
                    const textarea = document.createElement('textarea');
                    textarea.value = notes;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                      document.execCommand('copy');
                      notify?.('Notes copied to clipboard', '📋');
                    } catch (e) {
                      console.warn('Copy failed', e);
                    }
                    document.body.removeChild(textarea);
                  });
                }
                
                // Open Compass notes page
                window.openCompass(personRecord || primaryPerson, 'notes', primaryPerson);
              };
              
              return (
                <button
                  onClick={handleLogToCompass}
                  className="btn-white-outline"
                  style={{ 
                    padding: "10px 18px", 
                    borderRadius: 4, 
                    fontWeight: 900, 
                    fontSize: 13,
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Copy session notes and open Compass CRM"
                >
                  <span>🧭</span>
                  <span>Log to Compass</span>
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>

    {/* PEOPLE */}

      {/* PEOPLE */}
      <div style={{ ...cardStyle, marginTop: 28 }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: "var(--text-light)", marginBottom: 16, letterSpacing: 0.5, opacity: 0.9 }}>👥 PEOPLE</div>

        <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "16px 18px", minHeight: 64, display: "flex", flexWrap: "wrap", gap: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
          {(Array.isArray(timerState?.people) ? timerState.people : []).map((p) => (
            <span
              key={p}
              style={{
                background: "var(--primary)",
                color: "#fff",
                borderRadius: 4,
                padding: "8px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                fontWeight: 900,
                userSelect: "none",
                boxShadow: "0 4px 12px rgba(255, 107, 53, 0.25)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span onDoubleClick={() => openPersonEditor(p)} title="Double click to edit details" style={{ cursor: "pointer" }}>
                {p}
              </span>
              <span onClick={() => removePersonFromSession(p)} style={{ cursor: "pointer", fontSize: 16, lineHeight: 1, opacity: 0.8 }}>
                ×
              </span>
            </span>
          ))}

          <input
            id="timer-people-input"
            value={personInput}
            onChange={(e) => setPersonInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPersonChip();
            }}
            placeholder="Add person..."
            list="timer-saved-people"
            style={{ 
              border: "none", 
              background: "transparent", 
              color: "var(--text)", 
              flex: 1, 
              minWidth: 120, 
              outline: "none",
              fontSize: 14,
              fontWeight: 500,
              padding: "4px 8px",
            }}
          />
          <datalist id="timer-saved-people">
            {(Array.isArray(allPeople) ? allPeople : []).map((p) => (
              <option key={p.id || p.name} value={p.name} />
            ))}
          </datalist>
        </div>

        {expandedPerson && (
          <div style={{ marginTop: 16, background: "rgba(0,0,0,0.18)", border: "none", borderRadius: 4, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 900, color: "var(--text)" }}>Edit: {expandedPerson}</div>
              <button className="btn-white-outline" onClick={() => setExpandedPerson(null)} style={{ padding: "6px 10px" }}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div className="f-label" style={{ marginBottom: 8 }}>Name</div>
                <input className="f-input" value={personDraft.name} onChange={(e) => setPersonDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <div className="f-label" style={{ marginBottom: 8 }}>Phone</div>
                <input className="f-input" value={personDraft.phone} onChange={(e) => setPersonDraft((d) => ({ ...d, phone: e.target.value }))} />
              </div>
              <div>
                <div className="f-label" style={{ marginBottom: 8 }}>Email</div>
                <input className="f-input" value={personDraft.email} onChange={(e) => setPersonDraft((d) => ({ ...d, email: e.target.value }))} />
              </div>
              <div>
                <div className="f-label" style={{ marginBottom: 8 }}>Links</div>
                <input className="f-input" placeholder="Compass link, website, etc." value={personDraft.links} onChange={(e) => setPersonDraft((d) => ({ ...d, links: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="f-label" style={{ marginBottom: 8 }}>Notes</div>
              <textarea className="f-textarea" style={{ minHeight: 72 }} value={personDraft.notes} onChange={(e) => setPersonDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={savePersonDraft} style={{ flex: 1, border: "none", borderRadius: 14, padding: "10px 12px", fontWeight: 900, background: "var(--primary)", color: "white" }}>
                ✅ Save Person
              </button>
              <button onClick={() => setExpandedPerson(null)} className="btn-white-outline" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LOCATION */}
      <div style={{ ...cardStyle, marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "var(--text-light)", letterSpacing: 0.5, opacity: 0.9 }}>📍 LOCATION</div>

          <button
            onClick={handleGPS}
            disabled={isLocLoading}
            className="btn-white-outline"
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 8, 
              padding: "10px 14px", 
              borderRadius: 4, 
              fontWeight: 900, 
              opacity: isLocLoading ? 0.7 : 1,
              fontSize: 13,
            }}
            title="Use GPS to capture your current place"
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{resolvedLocation ? "💾" : "📍"}</span>
            <span>{isLocLoading ? "Locating…" : resolvedLocation ? "Save GPS" : "Use GPS"}</span>
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <input
              className="f-input"
              style={{ width: "100%" }}
              placeholder="Type a place name or choose a saved favorite…"
              value={timerState?.location || ""}
              onChange={handleLocationInput}
              list="loc-list"
            />
            <datalist id="loc-list">
              {(Array.isArray(allLocations) ? allLocations : []).map((l) => {
                const addr = (l.address || l.addressLabel || l.formattedAddress || "").trim();
                const full = (l.fullLabel || "").trim() || (l.name && addr ? `${l.name} — ${addr}` : l.name || addr || l.label || "");
                return <option key={l.id || full} value={full} />;
              })}
            </datalist>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-light)", opacity: 0.9 }}>
            {timerState?.location ? `Selected: ${timerState.location}` : "No location set"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
            <button 
              onClick={resetLocation} 
              className="btn-white-outline" 
              style={{ 
                fontWeight: 900,
                padding: "10px 14px",
                borderRadius: 4,
                fontSize: 13,
              }} 
              title="Clear favorite + coords + text"
            >
              ↺ Reset Location
            </button>

            <button
              onClick={() => updateTimer({ location: "" })}
              className="btn-white-outline"
              style={{ 
                fontWeight: 900, 
                opacity: (timerState?.location || "").length ? 0.85 : 0.45,
                padding: "10px 14px",
                borderRadius: 4,
                fontSize: 13,
              }}
              disabled={!(timerState?.location || "").length}
              title="Clear only the text field"
            >
              × Clear Text
            </button>
          </div>

          <textarea className="f-textarea" style={{ minHeight: 100, marginTop: 10 }} placeholder="Notes…" value={timerState?.notes || ""} onChange={(e) => updateTimer({ notes: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

/** Smooth hero: updates only itself (not the entire tab) */
const ClockHero = React.memo(function ClockHero({ timerState, getElapsed, fmt }) {
  const { useEffect, useState } = React;

  const isRunning = !!timerState?.isRunning;
  const [shownElapsed, setShownElapsed] = useState(() => getElapsed());

  useEffect(() => {
    setShownElapsed(getElapsed());
    if (!isRunning) return;

    const now = Date.now();
    const msToNextSecond = 1000 - (now % 1000);

    let intervalId = null;
    const timeoutId = setTimeout(() => {
      setShownElapsed(getElapsed());
      intervalId = setInterval(() => setShownElapsed(getElapsed()), 1000);
    }, msToNextSecond);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, timerState?.startTime, timerState?.storedTime, getElapsed]);

  const elapsed = shownElapsed;

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center", width: "100%" }}>
      <div
        style={{
          width: "400px",
          maxWidth: "400px",
          height: 200,
          borderRadius: 4,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          animation: isRunning ? "softGlow 8s ease-in-out infinite" : "none",
          boxShadow: isRunning 
            ? "0 0 60px rgba(255, 107, 53, 0.3), 0 0 120px rgba(255, 107, 53, 0.2), 0 0 180px rgba(255, 107, 53, 0.1), 0 0 240px rgba(255, 107, 53, 0.05)"
            : "0 0 60px rgba(255, 107, 53, 0), 0 0 120px rgba(255, 107, 53, 0), 0 0 180px rgba(255, 107, 53, 0), 0 0 240px rgba(255, 107, 53, 0)",
          padding: "20px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: "clamp(88px, 14.5vw, 130px)",
            fontWeight: 900,
            fontFamily: "monospace",
            color: "var(--text)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            letterSpacing: 1,
            textShadow: "none",
            position: "relative",
            zIndex: 2,
            width: "100%",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {fmt(elapsed)}
        </div>
      </div>
    </div>
  );
});

window.TimerTab = TimerTab;
