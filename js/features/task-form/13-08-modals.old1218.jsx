// js/13-08-modals.jsx
// ===========================================
// MODALS & STATS: TaskFormModal (FULL RESTORATION)
// Updated: 2025-12-18 21:45 PT
// ===========================================

function TaskFormModal({ task, categories, onClose, onSave, settings, tasks, goals, notify, updateTask }) {

  const [isAiLoading, setIsAiLoading] = React.useState(false);

  const {
    data, setData,
    visibleCategories,
    locationInput, setLocationInput,
    personInput, setPersonInput,
    tagInput, setTagInput,
    subText, setSubText,
    expanded, toggleSection
  } = window.useTaskFormState({ task, categories, settings });

  // 1. Restore Subcategory Hook
  const [subCategories] = window.useSubCategories(data.category);

  // 2. Restore Draft Persistence
  const draftKey = task?.id ? ("task_" + task.id) : "new";
  const persist = window.useModalDraftPersistence?.({
    key: draftKey,
    data,
    setData,
    enabled: true,
    notify
  });

  // Expanded setter for AI
  const setExpanded = (fn) => {
    try {
      const current = JSON.parse(localStorage.getItem("taskModal_expandedSections_v2") || "{}");
      const next = typeof fn === "function" ? fn({ ...current }) : fn;
      localStorage.setItem("taskModal_expandedSections_v2", JSON.stringify(next));
    } catch {}
  };

  const ai = window.useTaskFormAI({
    data, setData, visibleCategories, settings, notify, setExpanded, setIsAiLoading
  });

  const people = window.usePeopleLite({ data, setData, notify });
  const locs = window.useLocationsLite({ data, setData, locationInput, setLocationInput, notify });

  const HeaderToggle = ({ title, section, extra }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 4, marginTop: 20, marginBottom: 10, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => toggleSection(section)}>
        <span style={{ fontSize: 12, color: "var(--text-light)" }}>{expanded[section] ? "▼" : "▶"}</span>
        <h4 style={{ fontFamily: "Fredoka", fontSize: 14, margin: 0 }}>{title}</h4>
      </div>
      <div style={{ display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>{extra}</div>
    </div>
  );

  const handleSave = () => {
    if (!data.title?.trim()) return notify?.("Title required", "⚠️");

    // Math: Factor in Priority Multipliers from Constants
    const baseWeight = Number(data.weight || 10);
    const multiplier = settings.priorityMultipliers?.[data.priority] || 1.0;

    const Rem = window.TaskTumblerReminders;
    const reminders = (Rem?.normalizeReminders || ((x)=>Array.isArray(x)?x:[]))(data.reminders);
    const firstEnabled = reminders.find(r => r.enabled !== false) || null;

    try { persist?.clearDraft?.(); } catch {}

    onSave?.({
      ...data,
      location: locationInput,
      weight: baseWeight * multiplier, // Resulting Weight
      excludeFromTumbler: !!data.excludeFromTumbler,
      reminders,
      reminderMode: firstEnabled ? "before" : "none"
    });
  };

  return (
    <React.Fragment>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
            <h2 style={{ fontFamily: "Fredoka", margin: 0 }}>{task ? "Edit Task" : "New Task"}</h2>
            <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer" }}>×</button>
          </div>

          <label className="f-label">Title</label>
          <input className="f-input" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="Task name..." autoFocus />

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><label className="f-label">Category</label><button onClick={ai.handleAiCat} className="btn-ai-small">✧</button></div>
              <input className="f-input" value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })} list="cat-list" />
              <datalist id="cat-list">{visibleCategories.map(c => <option key={c} value={c} />)}</datalist>
              
              {/* RESTORED: Subcategories logic */}
              {subCategories.length > 0 && (
                <select className="f-select" style={{ marginTop: 8 }} value={data.subCategory || ""} onChange={(e) => setData({ ...data, subCategory: e.target.value })}>
                  <option value="">-- Subcategory --</option>
                  {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
            <div style={{ width: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><label className="f-label">Priority</label><button onClick={ai.handleAiPriority} className="btn-ai-small">✧</button></div>
              <select className="f-select" value={data.priority} onChange={(e) => setData({ ...data, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><label className="f-label">Tags</label><button onClick={ai.handleAiTags} className="btn-ai-small">✧</button></div>
            <input className="f-input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput) { setData(d => ({ ...d, tags: [...(d.tags||[]), tagInput] })); setTagInput(""); } }} placeholder="Add tag..." />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {(data.tags || []).map(t => (
                <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--primary)", color: "white" }}>
                  {t} <span onClick={() => setData(d => ({ ...d, tags: (d.tags||[]).filter(x => x !== t) }))} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f-label">Est. Time</label>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <input type="number" className="f-input" style={{ marginBottom: 0, width: 80 }} value={data.estimatedTime} onChange={(e) => setData({ ...data, estimatedTime: e.target.value })} />
              <select className="f-select" style={{ width: 70, marginBottom: 0 }} value={data.estimatedTimeUnit} onChange={(e) => setData({ ...data, estimatedTimeUnit: e.target.value })}><option value="min">Min</option><option value="hr">Hrs</option></select>
              <button type="button" className="btn-ai-purple" onClick={ai.handleAutoTime} disabled={!data.title || isAiLoading}>{isAiLoading ? <div className="spinner-small" /> : "🧠"}</button>
            </div>
          </div>

          <HeaderToggle title="📅 Schedule" section="schedule" />
          {expanded.schedule && <window.ScheduleSection data={data} setData={setData} settings={settings} notify={notify} />}

          <HeaderToggle title="📝 Details & Steps" section="details" extra={<button onClick={ai.handleAiDesc} className="btn-ai-small">✧</button>} /> 
          {expanded.details && (
            <div style={{ marginBottom: 15 }}>
              <label className="f-label">Description</label>
              <textarea className="f-textarea" rows={2} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}><label className="f-label">Subtasks</label><button onClick={ai.handleAiSubtasks} className="btn-ai-small">✧</button></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input className="f-input" style={{ marginBottom: 0, flex: 1 }} value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Add subtask..." />
                <button className="btn-orange-small" onClick={() => { if (subText.trim()) { setData(d => ({ ...d, subtasks: [...(d.subtasks||[]), { title: subText.trim(), completed: false }] })); setSubText(""); } }}>Add</button>
              </div>
              {(data.subtasks || []).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                  <input type="checkbox" checked={!!s.completed} onChange={() => { const next = [...(data.subtasks || [])]; next[i] = { ...next[i], completed: !next[i].completed }; setData({ ...data, subtasks: next }); }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{s.title}</span>
                  <span onClick={() => setData(d => ({ ...d, subtasks: (d.subtasks || []).filter((_, idx) => idx !== i) }))} style={{ color: "var(--danger)", cursor: "pointer" }}>×</span>
                </div>
              ))}
            </div>
          )}

          <HeaderToggle title="📍 Context" section="context" extra={
            <div style={{ display: "flex", gap: 12 }}>
              <div onClick={() => people.setShowPeopleManager(true)} style={{ cursor: "pointer", fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>👥 People DB</div>
              <div onClick={() => locs.setShowLocManager(true)} style={{ cursor: "pointer", fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>📍 Places DB</div>
            </div>
          } />
          {expanded.context && (
            <div style={{ marginBottom: 15 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
                <input className="f-input" style={{ marginBottom: 0, flex: 1 }} value={locationInput} onChange={(e) => setLocationInput(e.target.value)} list="loc-list" placeholder="📍 Location..." />
                <datalist id="loc-list">{(locs.allLocations || []).map(l => <option key={l.id} value={l.name} />)}</datalist>
                <button className="btn-white-outline" onClick={locs.saveLocationToTaskAndDB}>💾</button>
                <button className="btn-white-outline" onClick={locs.getTaskLocationOnce}>{locs.isLocLoading ? "⏳" : "📍"}</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input className="f-input" style={{ marginBottom: 0, flex: 1 }} value={personInput} onChange={(e) => setPersonInput(e.target.value)} list="people-list" placeholder="👤 Person..." />
                <datalist id="people-list">{(people.allPeople || []).map(p => <option key={p.id} value={p.name} />)}</datalist>
                <button className="btn-orange-small" onClick={() => { people.addPersonToTaskAndDB(personInput); setPersonInput(""); }}>Add</button>
              </div>
              {(data.people || []).map(name => (
                <div key={name} style={{ width: "100%", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}>
                    <span style={{ fontWeight: 800, flex: 1 }}>👤 {name}</span>
                    <button className="btn-white-outline" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => people.beginEditPerson(name)}>Edit</button>
                    <span onClick={() => people.removePersonFromTask(name)} style={{ cursor: "pointer", marginLeft: 5, color: "var(--danger)" }}>×</span>
                  </div>
                  {people.editingPersonName === name && (
                    <div style={{ marginTop: 8, padding: 12, background: "var(--input-bg)", borderRadius: 8, border: "1px solid var(--primary)" }}>
                       <label className="f-label">Type</label>
                       <select className="f-select" value={people.editPersonData.type} onChange={(e) => people.setEditPersonData({...people.editPersonData, type: e.target.value})}>
                          <option value="client">Client</option><option value="lead">Lead</option><option value="vendor">Vendor</option><option value="network">Network</option>
                       </select>
                       <label className="f-label">Phone</label>
                       <input className="f-input" value={people.editPersonData.phone} onChange={(e) => people.setEditPersonData({...people.editPersonData, phone: e.target.value})} />
                       <button className="btn-orange" onClick={people.saveEditPerson}>Save Details</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. RESTORED: Links & Goals */}
          <HeaderToggle title="🔗 Links & Goals" section="links" />
          {expanded.links && (
            <div style={{ background: "var(--card)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 15 }}>
              <label className="f-label">Link to Goal</label>
              <select className="f-select" value={data.goalId || ""} onChange={(e) => setData(d => ({ ...d, goalId: e.target.value || null }))}>
                <option value="">None</option>
                {(goals || []).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              {/* RESTORED: Dependencies logic */}
              <label className="f-label" style={{ marginTop: 10 }}>Dependency (Task)</label>
              <select className="f-select" value={data.dependsOn || ""} onChange={(e) => setData(d => ({ ...d, dependsOn: e.target.value || null }))}>
                 <option value="">No Dependency</option>
                 {tasks.filter(t => t.id !== task?.id).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          )}

          {/* 4. RESTORED: Spin Mods & Exclude */}
          <HeaderToggle title="💫 Spin Mods" section="spin" />
          {expanded.spin && (
            <div style={{ marginBottom: 15, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label className="f-label">Weight</label>
                  <span style={{ fontWeight: "bold", fontSize: 15, color: `hsl(${120 - (((data.weight - 1) / ((settings.weightMax ?? 50) - 1)) * 120)}, 70%, 45%)` }}>{data.weight}</span>
                </div>
                <input type="range" min="1" max="50" value={data.weight} onChange={(e) => setData({ ...data, weight: parseInt(e.target.value, 10) })} style={{ width: "100%", accentColor: "var(--primary)" }} />
              </div>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                <span className="f-label">Exclude</span>
                <input type="checkbox" checked={!!data.excludeFromTumbler} onChange={(e) => setData({ ...data, excludeFromTumbler: e.target.checked })} style={{ width: 18, height: 18 }} />
              </label>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 15, borderTop: "1px solid var(--border)" }}>
            <button type="button" onClick={ai.handleMagicFill} disabled={!data.title || isAiLoading} className="btn-ai-purple">
              {isAiLoading ? <div className="spinner-small" /> : "🧠 Magic Fill"}
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-white-outline" onClick={onClose}>Cancel</button>
              <button className="btn-orange" onClick={handleSave}>Save Task</button>
            </div>
          </div>

        </div>
      </div>

      {/* PORTAL RENDERING: Renders OUTSIDE main modal flow */}
      {people.showPeopleManager && (
        <window.PeopleManager 
          people={people.allPeople} 
          setPeople={(newList) => window.DataManager?.people?.setAll(newList)}
          onClose={() => people.setShowPeopleManager(false)} 
        />
      )}
      {locs.LocationsOverlay && locs.LocationsOverlay()}

    </React.Fragment>
  );
}

window.TaskFormModal = TaskFormModal;