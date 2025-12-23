// ===========================================
// VIEW TASK MODAL (READ-ONLY) - REDESIGNED
// Matches new design with timer, subtasks, and notes
// ===========================================

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PeopleManager from "../managers/PeopleManager";

export default function ViewTaskModal({ task, onClose, onEdit, onComplete, onFocus, onStartTimer, goals, settings, tasks, updateTask, onRespin }) {
  const [subtaskInput, setSubtaskInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [selectedPersonName, setSelectedPersonName] = useState(null);

  // Load people and locations data
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

  const updateLocationsGlobally = (newList) => {
    const next = Array.isArray(newList) ? newList : [];
    setAllLocations(next);
    if (typeof window.setSavedLocationsV1 === "function") {
      window.setSavedLocationsV1(next);
    } else {
      localStorage.setItem("savedLocations_v1", JSON.stringify(next));
      window.dispatchEvent(new Event("locations-updated"));
    }
  };

  // Handle Escape key to close modal
  useEffect(() => {
    if (!task) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [task, onClose]);

  // Lock scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // Timer functionality - increment every second when running
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  if (!task) return null;

  const goalName = task.goalId ? goals?.find(g => g.id === task.goalId)?.title : null;
  const isDone = task.completed;

  // Format time display for timer (MM:SS)
  const formatTimerTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Format time display
  const formatTime = (mins) => {
    if (!mins) return null;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  // Check if overdue
  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date().setHours(0,0,0,0);

  // Get priority badge text and icon
  const getPriorityBadge = () => {
    if (!task.priority) return null;
    const priorityMap = {
      'Low': { text: 'Low', icon: '⚡' },
      'Medium': { text: 'Medium', icon: '⚡' },
      'High': { text: 'High', icon: '⚡' },
      'Urgent': { text: 'Urgent', icon: '⚡' }
    };
    return priorityMap[task.priority] || { text: task.priority, icon: '⚡' };
  };

  const priorityBadge = getPriorityBadge();
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  // Helper to get display name for person
  const getDisplayName = (person) => {
    if (person.firstName || person.lastName) {
      return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Untitled';
    }
    return person.name || 'Untitled';
  };

  // Helper to get person record by name
  const getPersonRecordByName = (name) => {
    const n = String(name || "").trim().toLowerCase();
    return (Array.isArray(allPeople) ? allPeople : []).find(p => {
      const displayName = getDisplayName(p);
      return String(displayName || "").trim().toLowerCase() === n;
    }) || null;
  };

  // Helper to get location record
  const getLocationRecord = () => {
    if (!task.location) return null;
    const locName = String(task.location || "").trim().toLowerCase();
    return (Array.isArray(allLocations) ? allLocations : []).find(l => {
      const name = (l.name || l.label || "").toLowerCase();
      return name === locName;
    }) || null;
  };

  // Detect action type from category, subcategory, tags, or title
  const getActionType = () => {
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
  
  // Get first person from task for actions
  const firstPerson = task.people && task.people.length > 0 
    ? getPersonRecordByName(task.people[0]) 
    : null;

  // Helper function to add activity logs to the task
  const addLog = (text) => {
    if (!updateTask) return;
    const newLog = {
      id: window.generateId ? window.generateId('log') : 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      text: text,
      timestamp: new Date().toISOString(),
      type: 'system_log'
    };
    const currentActivities = Array.isArray(task.activities) ? task.activities : [];
    updateTask(task.id, { activities: [...currentActivities, newLog] });
  };

  return (
    <>
      {createPortal(
        <div 
          onMouseDown={(e) => {
            e.stopPropagation();
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          style={{ 
            position: 'fixed', inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            zIndex: 10000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: 20,
            pointerEvents: 'auto'
          }}
        >
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: 'var(--card)', 
          borderRadius: 16, 
          width: 'min(480px, 95vw)', 
          maxHeight: '85vh',
          overflow: 'auto',
          border: '1px solid var(--border)',
          boxShadow: '0 0 40px rgba(255,107,53,0.15), 0 20px 60px rgba(0,0,0,0.4)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* HEADER */}
        <div style={{ 
          padding: '16px 16px 12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tags - more compact */}
            <div style={{ 
              display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8
            }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text)',
                padding: '3px 8px',
                borderRadius: 12,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 0.5,
                textTransform: 'uppercase'
              }}>
                {task.category || 'GENERAL'}
              </span>
              {priorityBadge && (
                <span style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}>
                  <span>⚡</span>
                  <span>{priorityBadge.text}</span>
                </span>
              )}
            </div>
            
            {/* Title - More compact */}
            <h2 style={{ 
              fontFamily: 'Fredoka', fontSize: 24, lineHeight: 1.2, margin: 0,
              fontWeight: 900,
              textDecoration: isDone ? 'line-through' : 'none', 
              opacity: isDone ? 0.7 : 1,
              wordBreak: 'break-word',
              color: 'var(--text)'
            }}>
              {task.title}
            </h2>

            {/* Compact action emoji and associated data links */}
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                display: 'flex', 
                gap: 6, 
                flexWrap: 'wrap', 
                marginTop: 6,
                alignItems: 'center',
                pointerEvents: 'auto',
                fontSize: 10,
                color: 'var(--text-light)',
                opacity: 0.8
              }}
            >
              {/* Action emoji - only call or email */}
              {actionType === 'call' && <span>📞</span>}
              {actionType === 'email' && <span>✉️</span>}
              
              {/* People links - compact */}
              {task.people && task.people.length > 0 && task.people.map((personName, idx) => {
                const personRecord = getPersonRecordByName(personName);
                const displayName = personRecord ? getDisplayName(personRecord) : personName;
                const hasCompass = personRecord && (personRecord.compassCrmLink || personRecord.externalId);
                const hasPhone = personRecord && personRecord.phone;
                const hasEmail = personRecord && personRecord.email;
                
                return (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedPersonName(displayName);
                        setShowPeopleManager(true);
                      }}
                      style={{
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        borderBottom: '1px dotted var(--primary)',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 10
                      }}
                      title="Click to view person details"
                    >
                      {displayName}
                    </a>
                    {hasCompass && window.openCompass && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.openCompass && personRecord) {
                            window.openCompass(personRecord, 'profile', displayName);
                          }
                        }}
                        style={{
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontSize: 9,
                          marginLeft: 2,
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                        title="Open in Compass CRM"
                      >
                        🧭
                      </a>
                    )}
                    {actionType === 'call' && hasPhone && (
                      <a
                        href={`tel:${personRecord.phone.replace(/\D/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontSize: 9,
                          marginLeft: 2,
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                        title={`Call ${displayName}`}
                      >
                        📞
                      </a>
                    )}
                    {actionType === 'email' && hasEmail && (
                      <a
                        href={`mailto:${personRecord.email}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontSize: 9,
                          marginLeft: 2,
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                        title={`Email ${displayName}`}
                      >
                        ✉️
                      </a>
                    )}
                  </span>
                );
              })}

              {/* Location link - compact */}
              {task.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {(() => {
                    const locRecord = getLocationRecord();
                    if (locRecord && locRecord.lat && locRecord.lon) {
                      const mapsUrl = `https://www.google.com/maps?q=${locRecord.lat},${locRecord.lon}`;
                      return (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            borderBottom: '1px dotted var(--primary)',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            fontSize: 10
                          }}
                          title="Open in Maps"
                        >
                          {task.location}
                        </a>
                      );
                    }
                    return <span style={{ fontSize: 10 }}>{task.location}</span>;
                  })()}
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              background: 'none', border: 'none', fontSize: 24, 
              color: 'var(--text)', cursor: 'pointer',
              padding: 8, marginTop: -8, marginRight: -8,
              lineHeight: 1,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >×</button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '0 16px', flex: 1, overflowY: 'auto' }}>
          

          {/* TIMER & FOCUS MODE BAR */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(108, 92, 231, 0.2), rgba(162, 155, 254, 0.2))',
            border: '1px solid rgba(108, 92, 231, 0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                fontSize: 18,
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'var(--primary)'
              }}>
                {formatTimerTime(timerSeconds)}
              </div>
              <button
                onClick={() => {
                  const newState = !isTimerRunning;
                  setIsTimerRunning(newState);
                  
                  if (newState) {
                    addLog("Timer Started ⏱️");
                    if (onStartTimer) {
                      onStartTimer(task);
                    }
                  } else {
                    const minutes = Math.floor(timerSeconds / 60);
                    const seconds = timerSeconds % 60;
                    const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
                    addLog(`Timer Paused (Session: ${timeStr})`);
                  }
                }}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  padding: 0,
                  fontSize: 12
                }}
              >
                {isTimerRunning ? '⏸' : '▶'}
              </button>
            </div>
            {onFocus && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFocus(task);
                  onClose();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#fff',
                  padding: '5px 10px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Focus
              </button>
            )}
          </div>

          {/* QUICK LOG & NOTES SECTION */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'var(--text)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span>🕐</span>
              <span>QUICK LOG & NOTES</span>
            </div>
            
            {/* Activities List */}
            <div style={{
              maxHeight: '100px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 8,
              paddingRight: 4
            }}>
              {(task.activities || []).length === 0 ? (
                <div style={{
                  color: 'var(--text-light)',
                  fontStyle: 'italic',
                  fontSize: 11
                }}>
                  No activity recorded yet.
                </div>
              ) : (
                (task.activities || []).slice().reverse().map(log => (
                  <div key={log.id || log.timestamp} style={{
                    fontSize: 11,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start'
                  }}>
                    <span style={{
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: 10,
                      minWidth: 45,
                      paddingTop: 2,
                      flexShrink: 0
                    }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                    <span style={{
                      color: 'var(--text-light)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      flex: 1,
                      fontSize: 11
                    }}>
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note..."
                style={{
                  flex: 1,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 10px',
                  color: 'var(--text)',
                  fontSize: 12,
                  outline: 'none'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && noteInput.trim()) {
                    addLog(noteInput.trim());
                    setNoteInput('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (noteInput.trim()) {
                    addLog(noteInput.trim());
                    setNoteInput('');
                  }
                }}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Log
              </button>
            </div>
          </div>

          {/* SUBTASKS SECTION - MOVED TO LAST */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'var(--text)',
              marginBottom: 8
            }}>
              SUBTASKS ({completedSubtasks}/{subtasks.length})
            </div>
            
            {subtasks.length === 0 ? (
              <div style={{
                color: 'var(--text-light)',
                fontStyle: 'italic',
                fontSize: 11,
                marginBottom: 8
              }}>
                No subtasks yet. Add one below!
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {subtasks.map((st, i) => (
                  <div key={i} style={{
                    padding: '6px 0',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 12
                  }}>
                    <span 
                      onClick={() => {
                        if (updateTask) {
                          const newSubtasks = [...subtasks];
                          newSubtasks[i] = { ...newSubtasks[i], completed: !newSubtasks[i].completed };
                          updateTask(task.id, { subtasks: newSubtasks });
                        }
                      }}
                      style={{ 
                        color: st.completed ? 'var(--success)' : 'var(--text-light)', 
                        fontSize: 14,
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      title={st.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {st.completed ? '☑️' : '⬜'}
                    </span>
                    <span style={{
                      textDecoration: st.completed ? 'line-through' : 'none',
                      opacity: st.completed ? 0.6 : 1
                    }}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <input
              type="text"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              placeholder="+ Add a subtask..."
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: 6,
                padding: '8px 10px',
                color: 'var(--text)',
                fontSize: 12,
                outline: 'none'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && subtaskInput.trim()) {
                  const newSubtasks = [...subtasks, { title: subtaskInput.trim(), completed: false }];
                  if (updateTask) {
                    updateTask(task.id, { subtasks: newSubtasks });
                  }
                  setSubtaskInput('');
                }
              }}
            />
          </div>

        </div>

        {/* ACTIONS FOOTER */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Group 1: View and Edit */}
          <div style={{
            display: 'flex',
            gap: 8
          }}>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // View is just keeping the modal open, so do nothing or refresh
                // This button might not be needed if we're already viewing
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{ 
                flex: 1,
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--input-bg)';
              }}
            >
              View
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onEdit) {
                  // Call onEdit first to replace the modal in the stack
                  onEdit(task);
                  // Don't call onClose() - let onEdit handle the modal replacement
                  // The modal stack will replace viewTask with editTask
                } else {
                  console.warn('onEdit not provided to ViewTaskModal');
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{ 
                flex: 1,
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--input-bg)';
              }}
            >
              Edit
            </button>
          </div>

          {/* Group 2: Respin, Done, Focus */}
          <div style={{
            display: 'flex',
            gap: 8
          }}>
            {onRespin && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRespin();
                  onClose();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ 
                  flex: 1,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--input-bg)';
                }}
              >
                Respin
              </button>
            )}
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDone && settings?.confetti && typeof window.fireSmartConfetti === 'function') {
                  window.fireSmartConfetti('taskComplete', settings);
                }
                onComplete(task.id); 
                onClose(); 
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{ 
                flex: 1,
                background: isDone ? 'var(--input-bg)' : 'var(--primary)',
                border: isDone ? '1px solid var(--border)' : 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isDone) {
                  e.target.style.background = 'var(--primary-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDone) {
                  e.target.style.background = 'var(--primary)';
                }
              }}
            >
              {isDone ? 'Undo' : 'Done'}
            </button>
            {onFocus && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFocus(task);
                  onClose();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ 
                  flex: 1,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--input-bg)';
                }}
              >
                Focus
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
      )}
      {showPeopleManager && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
          <PeopleManager
            people={allPeople || []}
            setPeople={(newPeople) => {
              try {
                if (window.DataManager?.people?.setAll) {
                  window.DataManager.people.setAll(newPeople);
                } else {
                  localStorage.setItem("savedPeople", JSON.stringify(newPeople));
                  window.dispatchEvent(new Event("people-updated"));
                }
                setAllPeople(newPeople);
              } catch (e) {
                console.error("Error updating people", e);
              }
            }}
            onClose={() => {
              setShowPeopleManager(false);
              setSelectedPersonName(null);
            }}
            tasks={tasks}
            onViewTask={(t) => {
              setShowPeopleManager(false);
              if (onEdit) onEdit(t);
            }}
            locations={allLocations}
            setLocations={updateLocationsGlobally}
            setTasks={setTasks}
            initialSelectedPersonName={selectedPersonName}
          />
        </div>,
        document.body
      )}
    </>
  );
}

// Expose on window for backward compatibility
if (typeof window !== 'undefined') {
  window.ViewTaskModal = ViewTaskModal;
}

