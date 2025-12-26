// js/components/13-08-taskform-schedule.jsx
// ===========================================
// TaskFormModal Schedule + Reminders (chips by default)
// Updated: 2025-12-18 09:55 PT
// ===========================================

(function () {
  const React = window.React;
  const { useEffect, useMemo, useState, useCallback } = React;

  const isNonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

  function ScheduleSection({ data, setData, settings, notify }) {
    const Rem = window.TaskTumblerReminders;
    const normalizeReminders = Rem?.normalizeReminders || ((x)=>Array.isArray(x)?x:[]);
    const buildAutoReminderForAnchor = Rem?.buildAutoReminderForAnchor || ((anchor)=>({ id: "r_"+Date.now(), enabled:true, auto:true, anchor, type:"relative", offsetValue:30, offsetUnit:"minutes", atTime:"08:00", label: anchor==="due"?"Auto Due":"Auto Start" }));
    const ReminderRow = Rem?.ReminderRow;

    const autoAddRemindersEnabled = (settings?.autoAddReminders !== false);

    const reminders = useMemo(() => normalizeReminders(data.reminders), [data.reminders, normalizeReminders]);

    const anchorHasDate = useCallback((anchor) => {
      if (anchor === "start") return !!data.startDate;
      if (anchor === "due") return !!data.dueDate;
      return false;
    }, [data.startDate, data.dueDate]);

    // Auto rules: keep AUTO reminder type in sync when time added/removed.
    useEffect(() => {
      if (!autoAddRemindersEnabled) return;

      setData(prev => {
        const list = normalizeReminders(prev.reminders);
        const disabled = prev.autoReminderDisabled || { start:false, due:false };

        const ensureAuto = (anchor) => {
          const dateStr = (anchor === "start") ? prev.startDate : prev.dueDate;
          if (!dateStr) return false;
          if (disabled?.[anchor]) return false;

          const timeStr = (anchor === "start") ? prev.startTime : prev.dueTime;
          const hasTime = isNonEmpty(timeStr);
          const desiredType = hasTime ? "relative" : "dayBeforeAt";

          const idx = list.findIndex(r => r.auto === true && r.anchor === anchor);
          const label = anchor === "due" ? "Auto Due" : "Auto Start";

          if (idx === -1) {
            const base = buildAutoReminderForAnchor(anchor, timeStr);
            list.push({ ...base, anchor, label: base.label || label });
            return true;
          }

          const r = list[idx];
          if (desiredType === "relative") {
            const needsFix =
              r.type !== "relative" ||
              Number(r.offsetValue) !== 30 ||
              r.offsetUnit !== "minutes" ||
              r.enabled === false;

            if (!needsFix) return false;
            list[idx] = { ...r, enabled:true, auto:true, anchor, type:"relative", offsetValue:30, offsetUnit:"minutes", label: r.label || label };
            return true;
          }

          // desired dayBeforeAt
          const needsFix =
            r.type !== "dayBeforeAt" ||
            (r.atTime || "08:00") !== "08:00" ||
            r.enabled === false;

          if (!needsFix) return false;
          list[idx] = { ...r, enabled:true, auto:true, anchor, type:"dayBeforeAt", atTime:"08:00", label: r.label || label };
          return true;
        };

        let changed = false;
        changed = ensureAuto("start") || changed;
        changed = ensureAuto("due") || changed;
        if (!changed) return prev;
        return { ...prev, reminders: list };
      });
    }, [autoAddRemindersEnabled, data.startDate, data.startTime, data.dueDate, data.dueTime, setData, normalizeReminders, buildAutoReminderForAnchor]);

    // Reminder UI state
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const updateReminder = useCallback((id, patch) => {
      setData(prev => {
        const list = normalizeReminders(prev.reminders);
        const next = list.map(r => r.id === id ? { ...r, ...patch } : r);
        return { ...prev, reminders: next };
      });
    }, [setData, normalizeReminders]);

    const removeReminder = useCallback((id) => {
      setData(prev => {
        const list = normalizeReminders(prev.reminders);
        const target = list.find(r => r.id === id);
        const nextList = list.filter(r => r.id !== id);

        const nextDisabled = { ...(prev.autoReminderDisabled || { start:false, due:false }) };
        if (target?.auto && (target.anchor === "start" || target.anchor === "due")) {
          nextDisabled[target.anchor] = true;
        }
        return { ...prev, reminders: nextList, autoReminderDisabled: nextDisabled };
      });
      notify?.("Reminder removed", "🗑️");
    }, [setData, normalizeReminders, notify]);

    const reEnableAutoForAnchor = useCallback((anchor) => {
      if (anchor !== "start" && anchor !== "due") return;
      setData(prev => ({ ...prev, autoReminderDisabled: { ...(prev.autoReminderDisabled || {}), [anchor]: false } }));
      notify?.("Auto reminder re-enabled", "🔔");
    }, [setData, notify]);

    const addManualReminder = useCallback(() => {
      const makeReminderId = Rem?.makeReminderId || (()=>"r_"+Math.random().toString(36).slice(2,10)+"_"+Date.now());
      const anchor = data.dueDate ? "due" : (data.startDate ? "start" : "due");
      const r = {
        id: makeReminderId(),
        enabled: true,
        auto: false,
        anchor,
        type: "relative",
        offsetValue: 30,
        offsetUnit: "minutes",
        atTime: "08:00",
        label: "Manual",
      };
      setData(prev => ({ ...prev, reminders: [...normalizeReminders(prev.reminders), r] }));
      notify?.("Reminder added", "🔔");
      setShowEditor(true);
      setEditingId(r.id);
    }, [Rem, data.startDate, data.dueDate, setData, normalizeReminders, notify]);

    const renderChipText = (r) => {
      const a = r.anchor === "start" ? "Start" : "Due";
      if (r.type === "relative") return `${a} • ${r.offsetValue} ${r.offsetUnit}`;
      return `${a} • Day before ${r.atTime || "08:00"}`;
    };

    const enabledReminders = reminders.filter(r => r.enabled !== false);

    return (
      <div style={{ background: "var(--card)", padding: 10, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 15, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "52px minmax(0, 170px) minmax(0, 150px)", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-light)" }}>Start</div>
          <input type="date" className="f-input" style={{ margin: 0, width: "100%", minWidth: 0 }} value={window.dateUtils?.utcToLocalDateStr?.(data.startDate) || data.startDate || ""} onChange={(e)=>setData({ ...data, startDate: window.dateUtils?.localToUtcDateStr?.(e.target.value) || e.target.value })} />
          <input type="time" className="f-input" style={{ margin: 0, width: "90%", minWidth: 0, textAlign: "center", paddingRight: 14, fontVariantNumeric: "tabular-nums" }} value={data.startTime} onChange={(e)=>setData({ ...data, startTime: e.target.value })} />
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-light)" }}>Due</div>
          <input type="date" className="f-input" style={{ margin: 0, width: "100%", minWidth: 0 }} value={window.dateUtils?.utcToLocalDateStr?.(data.dueDate) || data.dueDate || ""} onChange={(e)=>setData({ ...data, dueDate: window.dateUtils?.localToUtcDateStr?.(e.target.value) || e.target.value })} />
          <input type="time" className="f-input" style={{ margin: 0, width: "90%", minWidth: 0, textAlign: "center", paddingRight: 14, fontVariantNumeric: "tabular-nums" }} value={data.dueTime} onChange={(e)=>setData({ ...data, dueTime: e.target.value })} />
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span>🔔 Reminders</span>
              <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 800, whiteSpace: "nowrap" }}>
                Auto adds when dates set
              </span>
            </div>
            <button className="btn-orange-small" onClick={addManualReminder} style={{ flex: "0 0 auto" }}>Add</button>
          </div>

          {(data.autoReminderDisabled?.start || data.autoReminderDisabled?.due) && (
            <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 10, lineHeight: 1.3 }}>
              Auto suppressed
              {data.autoReminderDisabled?.start && (
                <span style={{ marginLeft: 10, fontWeight: 900 }}>
                  Start
                  <span onClick={() => reEnableAutoForAnchor("start")} style={{ marginLeft: 8, cursor: "pointer", color: "var(--primary)", fontWeight: 900 }}>
                    Re-enable
                  </span>
                </span>
              )}
              {data.autoReminderDisabled?.due && (
                <span style={{ marginLeft: 10, fontWeight: 900 }}>
                  Due
                  <span onClick={() => reEnableAutoForAnchor("due")} style={{ marginLeft: 8, cursor: "pointer", color: "var(--primary)", fontWeight: 900 }}>
                    Re-enable
                  </span>
                </span>
              )}
            </div>
          )}

          {!showEditor && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {enabledReminders.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-light)" }}>No reminders yet. Add a start or due date, or tap Add.</div>
              ) : (
                enabledReminders.map(r => (
                  <div key={"chip_" + r.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "var(--input-bg)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 900, maxWidth: "100%" }}>
                    <span style={{ whiteSpace: "nowrap" }}>{renderChipText(r)}</span>
                    {r.auto && (
                      <span style={{ fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 999, background: "rgba(155, 89, 182, 0.15)", color: "var(--primary)", whiteSpace: "nowrap" }}>AUTO</span>
                    )}
                    <button type="button" className="btn-icon" onClick={() => { setShowEditor(true); setEditingId(r.id); }} title="Edit" style={{ fontSize: 14, opacity: 0.9 }}>✎</button>
                    <button type="button" className="btn-icon" onClick={() => removeReminder(r.id)} title="Remove" style={{ color: "var(--danger)", fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))
              )}
            </div>
          )}

          {showEditor && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10, maxWidth: "100%", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-light)" }}>
                  {editingId ? "Edit reminder" : "Reminders"}
                </div>
                <button className="btn-white-outline" onClick={() => { setShowEditor(false); setEditingId(null); }} style={{ height: 34 }}>Done</button>
              </div>

              {(typeof ReminderRow === "function") ? (
                reminders
                  .filter(r => !editingId || r.id === editingId)
                  .map(r => (
                    <div key={r.id} style={{ maxWidth: "100%", overflow: "hidden" }}>
                      <ReminderRow r={r} updateReminder={updateReminder} removeReminder={removeReminder} anchorHasDate={anchorHasDate} />
                    </div>
                  ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--danger)" }}>
                  Reminders module missing. Ensure <code>13-08-reminders.jsx</code> is loaded before this file.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-light)", lineHeight: 1.3 }}>
            Auto: time set = 30 min before. No time = 8:00 AM day before.
          </div>
        </div>
      </div>
    );
  }

  window.ScheduleSection = ScheduleSection;
})(); 
