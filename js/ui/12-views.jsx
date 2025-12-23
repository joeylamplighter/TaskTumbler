// js/components/12-views.jsx
// ===========================================
// CORE UI SHELL AND VIEW COMPONENTS
// ===========================================

(function() {
    const { useState, useEffect, useRef } = React;

    // ==========================================
    // VIEW TASK MODAL (Focus + Logging + Subtasks)
    // ==========================================
    function ViewTaskModal({ task, onClose, onEdit, onComplete, updateTask, goals }) {
        const [logInput, setLogInput] = useState('');
        const [newSubtask, setNewSubtask] = useState(''); 
        const [isTimerRunning, setIsTimerRunning] = useState(false);
        const [timerSeconds, setTimerSeconds] = useState(0);
        const [isFocusMode, setIsFocusMode] = useState(false);

        // ----------------------------------------------------
        // LOGIC: Subtask Stats & Actions
        // ----------------------------------------------------
        const totalSubtasks = (task.subtasks || []).length;
        const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
        const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

        const toggleSubtask = (subId) => {
            const updatedSubtasks = (task.subtasks || []).map(s => 
                s.id === subId ? { ...s, completed: !s.completed } : s
            );
            updateTask(task.id, { subtasks: updatedSubtasks });
        };

        const deleteSubtask = (e, subId) => {
            e.stopPropagation();
            // WARNING REMOVED: Instantly deletes the subtask
            const updatedSubtasks = (task.subtasks || []).filter(s => s.id !== subId);
            updateTask(task.id, { subtasks: updatedSubtasks });
        };

        const handleAddSubtask = () => {
            if (!newSubtask.trim()) return;
            const newId = Date.now().toString(); 
            // Saving as both title and text for compatibility
            const newItem = { id: newId, title: newSubtask.trim(), text: newSubtask.trim(), completed: false };
            const currentSubtasks = task.subtasks || [];
            updateTask(task.id, { subtasks: [...currentSubtasks, newItem] });
            setNewSubtask('');
        };

        // ----------------------------------------------------
        // LOGIC: Timer & Logging
        // ----------------------------------------------------
        useEffect(() => {
            let interval = null;
            if (isTimerRunning) {
                interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
            }
            return () => clearInterval(interval);
        }, [isTimerRunning]);

        const formatTime = (secs) => {
            const mins = Math.floor(secs / 60);
            const s = secs % 60;
            return `${mins}:${s < 10 ? '0' : ''}${s}`;
        };

        const getRelativeDate = (dateStr) => {
            if (!dateStr) return '';
            const diff = new Date(dateStr) - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (days === 0) return '(Today)';
            if (days === 1) return '(Tomorrow)';
            if (days < 0) return `(${Math.abs(days)} days ago)`;
            return `(in ${days} days)`;
        };

        const addLog = (text) => {
            const newLog = {
                id: window.generateId ? window.generateId('log') : 'log_' + Date.now(),
                text: text,
                timestamp: new Date().toISOString(),
                type: 'system_log'
            };
            const currentActivities = Array.isArray(task.activities) ? task.activities : [];
            updateTask(task.id, { activities: [...currentActivities, newLog] });
        };

        const handleAddManualLog = () => {
            if (!logInput.trim()) return;
            addLog(logInput.trim());
            setLogInput('');
        };

        const toggleTimer = () => {
            const newState = !isTimerRunning;
            setIsTimerRunning(newState);
            if (newState) {
                addLog("Timer Started ⏱️");
            } else {
                addLog(`Timer Paused (Session: ${formatTime(timerSeconds)})`);
            }
        };

        const toggleFocusMode = (active) => {
            setIsFocusMode(active);
            if (active) {
                addLog("Entered Focus Mode 🧘");
            } else {
                addLog("Exited Focus Mode");
            }
        };

        // ==========================================
        // FOCUS MODE (ZEN DESIGN)
        // ==========================================
        if (isFocusMode) {
            return (
                <div className="modal-overlay" style={{
                    zIndex: 1200, 
                    background: '#0a0a0a', 
                    color: '#fff', 
                    display:'flex', 
                    flexDirection:'column', 
                    alignItems:'center', 
                    justifyContent:'center'
                }}>
                    <div style={{position:'absolute', top: 30, right: 30}}>
                        <button 
                            onClick={() => toggleFocusMode(false)} 
                            style={{
                                background:'transparent', 
                                border:'1px solid rgba(255,255,255,0.2)', 
                                color:'rgba(255,255,255,0.6)', 
                                padding:'8px 20px', 
                                borderRadius: 30, 
                                cursor:'pointer',
                                fontSize: 12,
                                letterSpacing: 1,
                                textTransform: 'uppercase'
                            }}
                        >
                            Exit Focus
                        </button>
                    </div>
                    
                    <div style={{textAlign:'center', marginBottom: 60, opacity: 0.9}}>
                        <div style={{fontSize: 12, color: 'var(--primary)', fontWeight: 700, letterSpacing: 3, marginBottom: 16, textTransform: 'uppercase'}}>
                            Now Focusing On
                        </div>
                        <h1 style={{fontSize: 36, fontFamily:'Fredoka', margin: 0, maxWidth: '800px', lineHeight: 1.4}}>
                            {task.title}
                        </h1>
                    </div>

                    <div style={{fontSize: 120, fontFamily: 'monospace', fontWeight: 400, marginBottom: 60, color: isTimerRunning ? '#fff' : 'rgba(255,255,255,0.3)', textShadow: isTimerRunning ? '0 0 40px rgba(255,255,255,0.1)' : 'none', transition: 'color 0.3s ease'}}>
                        {formatTime(timerSeconds)}
                    </div>

                    <button 
                        onClick={toggleTimer}
                        style={{width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', background: isTimerRunning ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'}}
                    >
                        {isTimerRunning ? '⏸' : '▶'}
                    </button>
                </div>
            );
        }

        // ==========================================
        // STANDARD VIEW MODAL
        // ==========================================
        return (
            <div className="modal-overlay" onClick={onClose} style={{zIndex: 1100, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)'}}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', width: '90%', borderRadius: '24px', padding: 0, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', background: '#1e1e1e', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
                    
                    {/* SCROLLABLE CONTENT AREA */}
                    <div style={{overflowY: 'auto', flex: 1}}>
                        
                        {/* HEADER SECTION */}
                        <div style={{padding: '24px 24px 0 24px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 16}}>
                                <div style={{flex: 1}}>
                                    <div style={{display:'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap'}}>
                                        <span style={{fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: 'var(--text-light)', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px'}}>{(task.category || 'General').toUpperCase()}</span>
                                        <span style={{fontSize: 11, fontWeight: 700, background: task.priority === 'Urgent' ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255, 159, 67, 0.2)', color: task.priority === 'Urgent' ? '#ff7675' : '#ff9f43', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 4}}>{task.priority === 'Urgent' ? '🔥' : '⚡'} {task.priority || 'Medium'}</span>
                                    </div>
                                    <h2 style={{margin: 0, fontFamily: 'Fredoka', fontSize: 24, lineHeight: 1.2, color: 'var(--text)'}}>{task.title}</h2>
                                    <div style={{display:'flex', gap: 16, marginTop: 12, fontSize: 13, color:'var(--text-light)', flexWrap: 'wrap'}}>
                                        {task.location && <div style={{display:'flex', alignItems:'center', gap: 6}}><span>📍</span> {task.location}</div>}
                                        {task.people && (() => {
                                            // Helper to get person record by name
                                            const getPersonRecord = (personName) => {
                                                try {
                                                    const allPeople = window.DataManager?.people?.getAll?.() || 
                                                                    JSON.parse(localStorage.getItem('savedPeople') || '[]');
                                                    const name = typeof personName === 'object' ? personName.name : personName;
                                                    return allPeople.find(p => {
                                                        const displayName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ');
                                                        return displayName.toLowerCase() === name.toLowerCase();
                                                    }) || null;
                                                } catch {
                                                    return null;
                                                }
                                            };
                                            
                                            return (
                                                <div style={{display:'flex', alignItems:'center', gap: 6, flexWrap: 'wrap'}}>
                                                    <span>👥</span>
                                                    {Array.isArray(task.people) ? (
                                                        task.people.map((personName, idx) => {
                                                            const name = typeof personName === 'object' ? personName.name : personName;
                                                            const personRecord = getPersonRecord(name);
                                                            return (
                                                                <span key={idx} style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                                                                    <span
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            if (window.setTab) {
                                                                                window.setTab('stats');
                                                                            }
                                                                            window.location.hash = `#stats?subView=people&person=${encodeURIComponent(name)}`;
                                                                            window.dispatchEvent(new CustomEvent('navigate-to-person', { detail: { personName: name } }));
                                                                            window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                                                                        }}
                                                                        style={{
                                                                            color: 'var(--primary)',
                                                                            fontSize: 13,
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            textDecoration: 'underline',
                                                                            textDecorationColor: 'rgba(255, 107, 53, 0.5)',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.textDecorationColor = 'var(--primary)';
                                                                            e.target.style.opacity = 0.8;
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.textDecorationColor = 'rgba(255, 107, 53, 0.5)';
                                                                            e.target.style.opacity = 1;
                                                                        }}
                                                                        title={`Click to view ${name}'s contact info`}
                                                                    >
                                                                        {name}
                                                                    </span>
                                                                    {(personRecord?.externalId || personRecord?.compassCrmLink) && window.openCompass && (
                                                                        <span
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault();
                                                                                window.openCompass(personRecord, 'profile', name);
                                                                            }}
                                                                            style={{
                                                                                fontSize: 12,
                                                                                cursor: 'pointer',
                                                                                opacity: 0.7,
                                                                                transition: 'all 0.2s',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                width: 18,
                                                                                height: 18,
                                                                                borderRadius: 4,
                                                                                background: 'rgba(255, 107, 53, 0.15)',
                                                                                border: '1px solid rgba(255, 107, 53, 0.3)'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.opacity = 1;
                                                                                e.currentTarget.style.background = 'rgba(255, 107, 53, 0.25)';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.opacity = 0.7;
                                                                                e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                                                                            }}
                                                                            title="Open in Compass CRM"
                                                                        >
                                                                            🧭
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                                                            <span
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    const name = typeof task.people === 'object' ? task.people.name : task.people;
                                                                    if (window.setTab) {
                                                                        window.setTab('stats');
                                                                    }
                                                                    window.location.hash = `#stats?subView=people&person=${encodeURIComponent(name)}`;
                                                                    window.dispatchEvent(new CustomEvent('navigate-to-person', { detail: { personName: name } }));
                                                                    window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                                                                }}
                                                                style={{
                                                                    color: 'var(--primary)',
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    textDecoration: 'underline',
                                                                    textDecorationColor: 'rgba(255, 107, 53, 0.5)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.textDecorationColor = 'var(--primary)';
                                                                    e.target.style.opacity = 0.8;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.textDecorationColor = 'rgba(255, 107, 53, 0.5)';
                                                                    e.target.style.opacity = 1;
                                                                }}
                                                                title={`Click to view ${typeof task.people === 'object' ? task.people.name : task.people}'s contact info`}
                                                            >
                                                                {typeof task.people === 'object' ? task.people.name : task.people}
                                                            </span>
                                                            {(() => {
                                                                const name = typeof task.people === 'object' ? task.people.name : task.people;
                                                                const personRecord = getPersonRecord(name);
                                                                return (personRecord?.externalId || personRecord?.compassCrmLink) && window.openCompass && (
                                                                    <span
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            window.openCompass(personRecord, 'profile', name);
                                                                        }}
                                                                        style={{
                                                                            fontSize: 12,
                                                                            cursor: 'pointer',
                                                                            opacity: 0.7,
                                                                            transition: 'all 0.2s',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            width: 18,
                                                                            height: 18,
                                                                            borderRadius: 4,
                                                                            background: 'rgba(255, 107, 53, 0.15)',
                                                                            border: '1px solid rgba(255, 107, 53, 0.3)'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.opacity = 1;
                                                                            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.25)';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.opacity = 0.7;
                                                                            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                                                                        }}
                                                                        title="Open in Compass CRM"
                                                                    >
                                                                        🧭
                                                                    </span>
                                                                );
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {task.dueDate && <div style={{display:'flex', alignItems:'center', gap: 6}}><span>📅</span> {new Date(task.dueDate).toLocaleDateString()} <span style={{opacity:0.6, fontSize:12}}>{getRelativeDate(task.dueDate)}</span></div>}
                                    </div>
                                </div>
                                <button onClick={onClose} style={{background: 'transparent', border: 'none', color: 'var(--text-light)', fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: 8, marginTop: -8, marginRight: -8}}>×</button>
                            </div>

                            {/* TIMER & FOCUS BAR */}
                            <div style={{background:'linear-gradient(90deg, rgba(108, 92, 231, 0.1), rgba(162, 155, 254, 0.1))', padding: '12px 16px', borderRadius: 12, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20, border: '1px solid rgba(108, 92, 231, 0.2)'}}>
                                <div style={{display:'flex', alignItems:'center', gap: 12}}>
                                    <div style={{fontSize: 20, fontFamily:'monospace', fontWeight: 700, color: 'var(--primary)'}}>{formatTime(timerSeconds)}</div>
                                    <button onClick={toggleTimer} style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)'}}>{isTimerRunning ? '⏸' : '▶'}</button>
                                </div>
                                <button onClick={() => toggleFocusMode(true)} style={{background:'var(--primary)', border:'none', color:'white', padding:'6px 12px', borderRadius: 20, fontSize: 12, fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap: 6}}><span>🧘</span> Focus Mode</button>
                            </div>

                            {task.description && (
                                <div style={{background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginBottom: 24, fontSize: 14, lineHeight: 1.5, color: 'var(--text-light)'}}>
                                    {task.description}
                                </div>
                            )}

                            {/* SUBTASKS SECTION */}
                            <div style={{marginBottom: 24}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
                                    <h4 style={{fontSize: 11, fontWeight: 700, color: 'var(--text-light)', margin:0, textTransform: 'uppercase', letterSpacing: 1}}>Subtasks ({completedSubtasks}/{totalSubtasks})</h4>
                                    {totalSubtasks > 0 && <span style={{fontSize: 11, color: 'var(--primary)', fontWeight: 700}}>{progress}% Done</span>}
                                </div>

                                {totalSubtasks > 0 && (
                                    <div style={{height: 4, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16, overflow:'hidden'}}>
                                        <div style={{height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.3s ease'}}></div>
                                    </div>
                                )}

                                <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12}}>
                                    {(!task.subtasks || task.subtasks.length === 0) && (
                                        <div style={{fontSize: 13, color:'var(--text-light)', fontStyle:'italic', opacity:0.6}}>No subtasks yet. Add one below!</div>
                                    )}
                                    {(task.subtasks || []).map(s => (
                                        <div key={s.id} onClick={() => toggleSubtask(s.id)} style={{display:'flex', alignItems:'center', gap: 10, padding: '10px 12px', cursor:'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'}}>
                                            <div style={{width: 18, height: 18, borderRadius: 6, border: s.completed ? 'none' : '2px solid var(--text-light)', background: s.completed ? 'var(--primary)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                {s.completed && <span style={{fontSize: 12, color:'white', fontWeight:'bold'}}>✓</span>}
                                            </div>
                                            <span style={{fontSize: 14, color: s.completed ? '#888' : '#fff', textDecoration: s.completed ? 'line-through' : 'none', flex: 1, opacity: s.completed ? 0.7 : 1}}>
                                                {s.title || s.text || s.name || '(No Text)'}
                                            </span>
                                            <button 
                                                onClick={(e) => deleteSubtask(e, s.id)} 
                                                style={{background:'transparent', border:'none', cursor:'pointer', fontSize: 14, padding: 4, opacity: 0.5, outline:'none'}} 
                                                title="Delete subtask"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* ADD SUBTASK INPUT */}
                                <div style={{display:'flex', gap: 8}}>
                                    <input 
                                        type="text" 
                                        placeholder="+ Add a subtask..." 
                                        value={newSubtask}
                                        onChange={(e) => setNewSubtask(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                        style={{flex: 1, background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, padding: '8px 12px', color: '#fff', fontSize: 13}}
                                    />
                                    {newSubtask.trim() && (
                                        <button onClick={handleAddSubtask} style={{background:'var(--primary)', border:'none', borderRadius: 8, color:'white', padding:'0 12px', cursor:'pointer', fontSize: 12, fontWeight:'bold'}}>Add</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* LOGS SECTION */}
                        <div style={{background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px'}}>
                            <h4 style={{fontSize: 11, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1}}>🕒 Quick Log & Notes</h4>
                            <div style={{display: 'flex', gap: 10, marginBottom: 16}}>
                                <input 
                                    className="f-input" 
                                    style={{margin: 0, flex: 1, fontSize: 14, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid transparent', padding: '10px 14px', color: 'var(--text)'}} 
                                    placeholder="Add a note..." 
                                    value={logInput}
                                    onChange={e => setLogInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddManualLog()}
                                />
                                <button onClick={handleAddManualLog} style={{padding: '0 20px', background: 'rgba(255,255,255,0.1)', color: 'var(--text)', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer'}}>Log</button>
                            </div>
                            <div style={{maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4}}>
                                {(task.activities || []).length === 0 && <div style={{fontSize: 12, color: 'var(--text-light)', opacity: 0.5, fontStyle: 'italic'}}>No activity recorded yet.</div>}
                                {(task.activities || []).slice().reverse().map(log => (
                                    <div key={log.id} style={{fontSize: 13, display: 'flex', gap: 10}}>
                                        <span style={{color: 'var(--primary)', fontWeight: 700, fontSize: 11, minWidth: 50, paddingTop: 3}}>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span style={{color: 'var(--text-light)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: 8, flex: 1}}>{log.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div style={{padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display:'flex', gap: 12, background: '#1e1e1e', flexShrink: 0}}>
                        <button onClick={() => onEdit(task)} style={{flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)', borderRadius: 12, fontWeight: 600, cursor: 'pointer'}}>Edit Details</button>
                        <button onClick={() => { onComplete(task.id); onClose(); }} style={{flex: 2, padding: '12px', background: 'var(--primary)', boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)', border: 'none', color: 'white', borderRadius: 12, fontWeight: 'bold', fontSize: 14, cursor: 'pointer'}}>✓ Complete Task</button>
                    </div>
                </div>
            </div>
        );
    }
    window.ViewTaskModal = ViewTaskModal;

    // ==========================================
    // CALENDAR VIEW (Unchanged)
    // ==========================================
    function CalendarView({ tasks, onView }) {
        const [date, setDate] = useState(new Date());
        const getDays = () => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const days = [];
            for (let i = 0; i < firstDay; i++) days.push(null);
            for (let i = 1; i <= daysInMonth; i++) {
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                days.push({ day: i, tasks: tasks.filter(t => t.dueDate === dStr) });
            }
            return days;
        };
        const days = getDays();
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        return (
            <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                    <button className="btn-white-outline" style={{padding:'4px 12px'}} onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()-1, 1))}>◀</button>
                    <div style={{fontWeight:700, fontSize:16}}>{monthName}</div>
                    <button className="btn-white-outline" style={{padding:'4px 12px'}} onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()+1, 1))}>▶</button>
                </div>
                <div className="cal-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4}}>
                    {days.map((d, i) => (
                        <div key={i} className={`cal-day ${d?.tasks.length ? 'has-tasks' : ''}`} style={{minHeight: '60px', border: '1px solid var(--border)', padding: 4}} onClick={() => d?.tasks[0] && onView(d.tasks[0])}>
                            <div style={{fontSize: 11, color: 'var(--text-light)'}}>{d?.day}</div>
                            <div style={{display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap'}}>
                                {d?.tasks.slice(0, 4).map(t => (
                                    <div key={t.id} style={{width: 4, height: 4, borderRadius: '50%', background: t.priority === 'Urgent' ? 'var(--danger)' : 'var(--primary)'}} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    window.CalendarView = CalendarView;

    // ==========================================
    // BOARD VIEW (Unchanged)
    // ==========================================
    function BoardView({ tasks, onView }) {
        const cols = ['Urgent', 'High', 'Medium', 'Low'];
        return (
            <div style={{display:'flex', gap:12, overflowX:'auto', paddingBottom:10, height:'calc(100vh - 220px)', alignItems:'flex-start'}}>
                {cols.map(c => (
                    <div key={c} style={{minWidth: '220px', flex: 1, background: 'var(--card)', padding: 12, borderRadius: 16, border: '1px solid var(--border)'}}>
                        <h4 style={{fontSize: 12, marginBottom: 12, color: 'var(--text-light)', fontWeight: 800, letterSpacing: 0.5}}>{c.toUpperCase()}</h4>
                        {tasks.filter(t => t.priority === c && !t.completed).map(t => (
                            <div key={t.id} onClick={() => onView(t)} style={{background: 'var(--input-bg)', padding: 10, marginBottom: 8, borderRadius: 10, cursor: 'pointer', fontSize: 13, border: '1px solid var(--border-light)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                                <div style={{fontWeight: 600, color: 'var(--text)'}}>{t.title}</div>
                                {t.category && <div style={{fontSize: 10, color: 'var(--text-light)', marginTop: 4}}>{t.category}</div>}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
    window.BoardView = BoardView;

    console.log('✅ Views loaded: Subtasks update instant delete (no warn) & clean focus');
})();