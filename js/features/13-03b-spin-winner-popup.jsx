// js/features/13-03b-spin-winner-popup.jsx
// Updated: 2025-12-22
// ===========================================
// SPIN UI: Winner Popup
// Exposes: window.SpinWinnerPopup
// ===========================================

import React from 'react'

(function () {
  const { useEffect, useRef, useState } = React;

  function WinnerPopup({ open, task, onClose, onFocus, onView, onDone, onRespin, onStartTimer }) {
    const closeBtnRef = useRef(null);
    const [allPeople, setAllPeople] = useState([]);

    // Load people data
    useEffect(() => {
      const loadPeople = () => {
        try {
          const people = (window.DataManager?.people?.getAll?.()) || JSON.parse(localStorage.getItem("savedPeople") || "[]");
          setAllPeople(Array.isArray(people) ? people : []);
        } catch (e) {
          console.error("People Load Error", e);
          setAllPeople([]);
        }
      };
      loadPeople();
      window.addEventListener("people-updated", loadPeople);
      return () => window.removeEventListener("people-updated", loadPeople);
    }, []);

    // Helper to get display name
    const getDisplayName = (person) => {
      if (!person) return 'Untitled';
      if (person.firstName || person.lastName) {
        return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Untitled';
      }
      return person.name || 'Untitled';
    };

    // Helper to get person record by name
    const getPersonRecordByName = (name) => {
      if (!name || !Array.isArray(allPeople)) return null;
      const searchName = String(name).trim().toLowerCase();
      return allPeople.find(p => {
        const displayName = getDisplayName(p);
        return String(displayName || "").trim().toLowerCase() === searchName;
      }) || null;
    };

    // Detect action type from category, subcategory, tags, or title
    const getActionType = () => {
      if (!task) return null;
      const category = String(task.category || '').toLowerCase();
      const subcategory = String(task.subcategory || '').toLowerCase();
      const tags = Array.isArray(task.tags) ? task.tags.map(t => String(t).toLowerCase()) : [];
      const title = String(task.title || '').toLowerCase();
      
      const allText = [category, subcategory, ...tags, title].join(' ');
      
      if (/call|phone|ring|dial|telephone/i.test(allText)) {
        return 'call';
      }
      if (/email|mail|send|message/i.test(allText)) {
        return 'email';
      }
      return null;
    };

    const actionType = getActionType();
    const firstPersonName = task?.people && Array.isArray(task.people) && task.people.length > 0 ? task.people[0] : null;
    const firstPerson = firstPersonName ? getPersonRecordByName(firstPersonName) : null;

    useEffect(() => {
      if (!open) return;
      const onKey = (e) => {
        if (e.key === "Escape") onClose?.();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
      if (!open) return;
      setTimeout(() => closeBtnRef.current?.focus?.(), 0);
    }, [open]);

    if (!open || !task) return null;

    // Format time duration - converts to hours/days as needed
    const formatDuration = (value, unit) => {
      if (!value || value === 0) return null;
      const numValue = Number(value);
      if (isNaN(numValue)) return null;
      
      // Convert to minutes first
      let totalMinutes = numValue;
      if (unit === 'hours' || unit === 'h') {
        totalMinutes = numValue * 60;
      } else if (unit === 'days' || unit === 'd') {
        totalMinutes = numValue * 1440;
      } else if (unit !== 'minutes' && unit !== 'm') {
        totalMinutes = numValue; // Assume minutes if unknown
      }
      
      const mins = Math.round(totalMinutes);
      
      // Less than 60 minutes: show minutes
      if (mins < 60) return `${mins}m`;
      
      // Calculate hours and remaining minutes
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      
      // Less than 24 hours: show hours and minutes
      if (hours < 24) {
        if (remainingMins === 0) return `${hours}h`;
        return `${hours}h ${remainingMins}m`;
      }
      
      // 24+ hours: show days and hours
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (remainingHours === 0) return `${days}d`;
      return `${days}d ${remainingHours}h`;
    };

    const pill = (text) => (
      <span
        style={{
          background: "var(--input-bg)",
          padding: "5px 9px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-light)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {text}
      </span>
    );

    const btnBase = {
      height: 42,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: 0.2,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      userSelect: "none",
      transition: "transform 0.08s ease, opacity 0.15s ease, background 0.15s ease",
    };

    const primaryBtn = {
      ...btnBase,
      width: "100%",
      background: "var(--primary)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.16)",
      boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
    };

    const secondaryBtn = {
      ...btnBase,
      background: "rgba(255,255,255,0.06)",
      color: "var(--text)",
    };

    const dangerBtn = {
      ...btnBase,
      background: "rgba(255, 90, 90, 0.12)",
      color: "var(--text)",
      border: "1px solid rgba(255, 90, 90, 0.25)",
    };

    const iconBtn = {
      width: 36,
      height: 36,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.06)",
      color: "var(--text)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      transition: "background 0.15s ease, transform 0.08s ease, opacity 0.15s ease",
      userSelect: "none",
    };

    return (
      <>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        <div
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              onClose?.();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 94vw)",
              background: "var(--card)",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 22px 60px rgba(0,0,0,0.6)",
              border: "1px solid var(--border)",
              position: "relative",
              animation: "slideUp 0.3s ease-out",
            }}
          >
          <div style={{ height: 4, background: "var(--primary)" }} />

          <div style={{ padding: 18, paddingBottom: 14, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 0 0 6px rgba(255,255,255,0.02)",
                    flex: "0 0 auto",
                  }}
                  title="Winner"
                >
                  🏆
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 1.6,
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      opacity: 0.95,
                    }}
                  >
                    Next Up
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-light)", opacity: 0.85, marginTop: 2 }}>
                    Tap outside to close
                  </div>
                </div>
              </div>

              <button
                ref={closeBtnRef}
                onClick={onClose}
                style={iconBtn}
                title="Close"
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.25,
                color: "var(--text)",
                wordBreak: "break-word",
              }}
            >
              {task?.title || "Untitled"}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {pill(task?.category || "General")}
              {task?.priority ? pill(task.priority) : null}
              {formatDuration(task?.estimatedTime, task?.estimatedTimeUnit) && (
                pill(formatDuration(task.estimatedTime, task.estimatedTimeUnit))
              )}
              {task?.location && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    // Try to open location in maps if we have coordinates
                    const locName = task.location;
                    try {
                      const savedLocs = JSON.parse(localStorage.getItem("savedLocations_v1") || "[]");
                      const loc = Array.isArray(savedLocs) ? savedLocs.find(l => 
                        (l.name || l.label || "").toLowerCase() === locName.toLowerCase()
                      ) : null;
                      if (loc && loc.lat && loc.lon) {
                        window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lon}`, '_blank');
                      } else {
                        // Fallback: search for location name
                        window.open(`https://www.google.com/maps/search/${encodeURIComponent(locName)}`, '_blank');
                      }
                    } catch {
                      window.open(`https://www.google.com/maps/search/${encodeURIComponent(locName)}`, '_blank');
                    }
                  }}
                  style={{
                    background: "var(--input-bg)",
                    padding: "5px 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--primary)",
                    border: "1px solid rgba(255,107,53,0.2)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(255,107,53,0.15)";
                    e.target.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "var(--input-bg)";
                    e.target.style.transform = "scale(1)";
                  }}
                  title={`Click to open ${task.location} in Maps`}
                >
                  📍 {task.location}
                </span>
              )}
              {task?.people && Array.isArray(task.people) && task.people.length > 0 && task.people.map((personName, idx) => {
                const personRecord = getPersonRecordByName(personName);
                const displayName = personRecord ? getDisplayName(personRecord) : personName;
                const personId = personRecord?.id;
                
                return (
                  <span
                    key={`person-${idx}-${personId || personName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      
                      // Prevent rapid clicks - check if already opening
                      if (window.__openingContactModal) return;
                      window.__openingContactModal = true;
                      setTimeout(() => { delete window.__openingContactModal; }, 300);
                      
                      // Open ViewContactModal directly with this person
                      if (!personRecord) {
                        console.warn('Person record not found for:', personName);
                        delete window.__openingContactModal;
                        return;
                      }
                      
                      try {
                        // Open ViewContactModal directly
                        if (window.pushModal) {
                          window.pushModal({ type: 'viewContact', data: personRecord });
                        } else {
                          // Fallback: use custom event
                          window.dispatchEvent(new CustomEvent('open-contact', { detail: { person: personRecord } }));
                        }
                      } catch (error) {
                        console.error("Error opening person contact:", error);
                        delete window.__openingContactModal;
                      }
                      // Don't close the popup - keep it open behind
                    }}
                    style={{
                      background: "var(--input-bg)",
                      padding: "5px 9px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--primary)",
                      border: "1px solid rgba(255,107,53,0.2)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      pointerEvents: "auto",
                      position: "relative",
                      zIndex: 1
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(255,107,53,0.15)";
                      e.target.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "var(--input-bg)";
                      e.target.style.transform = "scale(1)";
                    }}
                    title={`Click to view ${displayName}`}
                  >
                    👤 {displayName}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 18, paddingTop: 10 }}>
            {/* Action buttons for call/email if applicable */}
            {actionType && firstPerson && (
              <>
                {actionType === 'call' && firstPerson.phone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const phoneNumber = firstPerson.phone.replace(/\D/g, '');
                      if (phoneNumber) {
                        window.location.href = `tel:${phoneNumber}`;
                        onClose?.();
                      }
                    }}
                    style={{
                      ...primaryBtn,
                      background: "var(--success)",
                      marginBottom: 10
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    title={`Call ${getDisplayName(firstPerson)}`}
                  >
                    📞 Call {getDisplayName(firstPerson)}
                  </button>
                )}
                {actionType === 'email' && firstPerson.email && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (firstPerson.email) {
                        window.location.href = `mailto:${firstPerson.email}`;
                        onClose?.();
                      }
                    }}
                    style={{
                      ...primaryBtn,
                      background: "var(--info)",
                      marginBottom: 10
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    title={`Email ${getDisplayName(firstPerson)}`}
                  >
                    ✉️ Email {getDisplayName(firstPerson)}
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => {
                onClose?.();
                onFocus?.(task);
              }}
              style={primaryBtn}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title="Open Focus Mode"
            >
              Start Focus
            </button>

            <div style={{ height: 10 }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  // Don't close winner popup when opening view - let them stack
                  onView?.(task);
                }}
                style={{ ...secondaryBtn, flex: 1 }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                title="Open task details"
              >
                View
              </button>
            </div>

            <div style={{ height: 10 }} />

            <div style={{ display: "grid", gridTemplateColumns: onStartTimer ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
              {onStartTimer && (
                <button
                  onClick={() => {
                    onClose?.();
                    onStartTimer?.(task);
                  }}
                  style={secondaryBtn}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  title="Start Timer for this task"
                >
                  Start Timer
                </button>
              )}
              <button
                onClick={() => {
                  onClose?.();
                  onRespin?.();
                }}
                style={secondaryBtn}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                title="Spin again"
              >
                Respin
              </button>
              <button
                onClick={() => {
                  onClose?.();
                  onDone?.(task);
                }}
                style={dangerBtn}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                title="Mark done"
              >
                Done
              </button>
            </div>

            <div style={{ height: 12 }} />

            <div
              style={{
                fontSize: 11,
                color: "var(--text-light)",
                opacity: 0.75,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span>Esc closes</span>
              <span>Click outside closes</span>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  window.SpinWinnerPopup = WinnerPopup;

  console.log("✅ 13-03b-spin-winner-popup.jsx Loaded");
})();
