// !!TT/js/features/task-form/13-08-reminders.jsx
// ===========================================
// TASK TUMBLER REMINDERS: CORE HELPER MODULE
// ===========================================

(function() {
    const React = window.React;

    // 1. Core Logic & Normalization
    const TaskTumblerReminders = {
        makeReminderId: () => "r_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now(),
        
        normalizeReminders: (list) => {
            if (!Array.isArray(list)) return [];
            return list.map(r => ({
                id: r.id || TaskTumblerReminders.makeReminderId(),
                enabled: r.enabled !== false,
                auto: !!r.auto,
                anchor: r.anchor || "due", // 'due' or 'start'
                type: r.type || "relative", // 'relative' or 'dayBeforeAt'
                offsetValue: Number(r.offsetValue ?? 30),
                offsetUnit: r.offsetUnit || "minutes",
                atTime: r.atTime || "08:00",
                label: r.label || (r.auto ? "Auto" : "Manual")
            }));
        },

        reminderToChipText: (r) => {
            const anchorLabel = r.anchor === 'start' ? 'Start' : 'Due';
            if (r.type === 'dayBeforeAt') return `${anchorLabel} • Day before ${r.atTime}`;
            return `${anchorLabel} • ${r.offsetValue} ${r.offsetUnit} before`;
        },

        // 3. Auto Reminder Enforcement (Schedule & Reminder Overlord)
        // Automatically adds/updates reminders when dates/times are set
        enforceAutoReminders: (data, settings) => {
            if (!data) return null;
            
            // Check if auto reminders are enabled (default to true if not specified)
            const autoAddRemindersEnabled = settings?.autoAddReminders !== false;
            if (!autoAddRemindersEnabled) return null;

            const reminders = TaskTumblerReminders.normalizeReminders(data.reminders || []);
            const autoReminderDisabled = data.autoReminderDisabled || { start: false, due: false };
            let changed = false;

            // Helper to ensure auto reminder for an anchor (start or due)
            const ensureAutoReminder = (anchor) => {
                const dateStr = anchor === "start" ? data.startDate : data.dueDate;
                const timeStr = anchor === "start" ? data.startTime : data.dueTime;
                
                // No date = no reminder needed
                if (!dateStr || !dateStr.trim()) {
                    // Remove auto reminder if date was removed
                    const existingIdx = reminders.findIndex(r => r.auto === true && r.anchor === anchor);
                    if (existingIdx >= 0) {
                        reminders.splice(existingIdx, 1);
                        changed = true;
                    }
                    return;
                }

                // Skip if auto reminder is disabled for this anchor
                if (autoReminderDisabled[anchor]) return;

                // Check if time exists
                const hasTime = timeStr && timeStr.trim() !== "";
                
                // Determine desired reminder settings
                const desiredOffsetValue = hasTime ? 1 : 24;
                const desiredOffsetUnit = "hours";
                const desiredType = "relative";
                const label = anchor === "start" ? "Auto Start" : "Auto Due";

                // Find existing auto reminder for this anchor
                const existingIdx = reminders.findIndex(r => r.auto === true && r.anchor === anchor);

                if (existingIdx >= 0) {
                    // Update existing auto reminder
                    const existing = reminders[existingIdx];
                    const needsUpdate = 
                        existing.type !== desiredType ||
                        existing.offsetValue !== desiredOffsetValue ||
                        existing.offsetUnit !== desiredOffsetUnit ||
                        existing.enabled === false;

                    if (needsUpdate) {
                        reminders[existingIdx] = {
                            ...existing,
                            type: desiredType,
                            offsetValue: desiredOffsetValue,
                            offsetUnit: desiredOffsetUnit,
                            enabled: true,
                            label: label
                        };
                        changed = true;
                    }
                } else {
                    // Create new auto reminder
                    const newReminder = {
                        id: TaskTumblerReminders.makeReminderId(),
                        enabled: true,
                        auto: true,
                        anchor: anchor,
                        type: desiredType,
                        offsetValue: desiredOffsetValue,
                        offsetUnit: desiredOffsetUnit,
                        label: label
                    };
                    reminders.push(newReminder);
                    changed = true;
                }
            };

            // Ensure auto reminders for both start and due dates
            ensureAutoReminder("start");
            ensureAutoReminder("due");

            return changed ? reminders : null;
        },

        // 2. The UI Row Component (Required by 13-08-taskform-schedule.jsx)
        ReminderRow: ({ r, updateReminder, removeReminder, anchorHasDate }) => {
            const hasTargetDate = anchorHasDate(r.anchor);
            
            return (
                <div style={{ 
                    display: 'flex', flexDirection: 'column', gap: 8, 
                    background: 'var(--input-bg)', padding: 10, borderRadius: 8,
                    border: '1px solid var(--border)', marginBottom: 8,
                    opacity: hasTargetDate ? 1 : 0.5
                }}>
                    {!hasTargetDate && (
                        <div style={{fontSize: 10, color: 'var(--danger)', fontWeight: 800}}>
                            ⚠️ Set a {r.anchor} date for this alarm to work
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select 
                            className="f-select-small" 
                            value={r.anchor} 
                            onChange={e => updateReminder(r.id, { anchor: e.target.value })}
                        >
                            <option value="due">Due Date</option>
                            <option value="start">Start Date</option>
                        </select>

                        <select 
                            className="f-select-small" 
                            value={r.type} 
                            onChange={e => updateReminder(r.id, { type: e.target.value })}
                        >
                            <option value="relative">Time Before</option>
                            <option value="dayBeforeAt">Day Before At</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.type === 'relative' ? (
                            <React.Fragment>
                                <input 
                                    type="number" className="f-input-small" style={{width: 60}}
                                    value={r.offsetValue} 
                                    onChange={e => updateReminder(r.id, { offsetValue: parseInt(e.target.value) })} 
                                />
                                <select 
                                    className="f-select-small"
                                    value={r.offsetUnit}
                                    onChange={e => updateReminder(r.id, { offsetUnit: e.target.value })}
                                >
                                    <option value="minutes">Mins</option>
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                </select>
                            </React.Fragment>
                        ) : (
                            <input 
                                type="time" className="f-input-small" style={{flex: 1}}
                                value={r.atTime} 
                                onChange={e => updateReminder(r.id, { atTime: e.target.value })} 
                            />
                        )}
                        <button 
                            type="button" className="btn-icon" 
                            style={{color: 'var(--danger)'}} 
                            onClick={() => removeReminder(r.id)}
                        >🗑️</button>
                    </div>
                </div>
            );
        }
    };

    window.TaskTumblerReminders = TaskTumblerReminders;
    console.log("✅ TaskTumblerReminders Module Loaded");
})();