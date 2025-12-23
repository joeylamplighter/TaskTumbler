// ===========================================
// VIEW TASK MODAL (READ-ONLY) - FIXED VERSION
// Uses portal, high z-index, emoji placeholder, glow effect
// ===========================================
function ViewTaskModal({ task, onClose, onEdit, onComplete, onFocus, onStartTimer, goals, settings, tasks, updateTask }) {
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

  return ReactDOM.createPortal(
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed', inset: 0, 
        background: 'rgba(0,0,0,0.7)', 
        zIndex: 9999, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        padding: 20 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: 'var(--card)', 
          borderRadius: 16, 
          width: 'min(480px, 95vw)', 
          maxHeight: '85vh',
          overflow: 'auto',
          border: '1px solid var(--border)',
          boxShadow: '0 0 40px rgba(255,107,53,0.15), 0 20px 60px rgba(0,0,0,0.4)',
          position: 'relative'
        }}
      >
        {/* Glow effect behind modal */}
        <div style={{ 
          position: 'absolute', inset: -30, borderRadius: 40, 
          background: 'radial-gradient(circle, rgba(255,107,53,0.1) 0%, transparent 70%)', 
          pointerEvents: 'none', zIndex: -1 
        }} />

        {/* HEADER with emoji */}
        <div style={{ 
          padding: '20px 20px 0 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1 }}>
            {/* Task Emoji - placeholder field for future */}
            <div style={{ 
              fontSize: 40, 
              width: 56, height: 56, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--input-bg)', borderRadius: 12,
              flexShrink: 0
            }}>
              {task.emoji || '📌'}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Category & Priority badges */}
              <div style={{ 
                fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', 
                color: 'var(--primary)', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'
              }}>
                <span>{task.category || 'General'}</span>
                {task.priority && <span className={`badge ${task.priority}`}>{task.priority}</span>}
                {isDone && <span className="badge" style={{ background: 'var(--success)', color: '#fff' }}>DONE</span>}
                {isOverdue && <span className="badge" style={{ background: 'var(--danger)', color: '#fff' }}>OVERDUE</span>}
              </div>
              
              {/* Title */}
              <h2 style={{ 
                fontFamily: 'Fredoka', fontSize: 22, lineHeight: 1.2, margin: 0,
                textDecoration: isDone ? 'line-through' : 'none', 
                opacity: isDone ? 0.7 : 1,
                wordBreak: 'break-word'
              }}>
                {task.title}
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', border: 'none', fontSize: 24, 
              color: 'var(--text-light)', cursor: 'pointer',
              padding: 8, marginTop: -8, marginRight: -8
            }}
          >×</button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: 20 }}>
          
          {/* Quick Stats Row */}
          <div style={{ 
            display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap'
          }}>
            {task.estimatedTime && (
              <div style={{ 
                background: 'var(--input-bg)', padding: '8px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
              }}>
                <span>⏱️</span>
                <span style={{ fontWeight: 600 }}>{formatTime(task.estimatedTime)}</span>
              </div>
            )}
            
            <div style={{ 
              background: 'var(--input-bg)', padding: '8px 12px', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
            }}>
              <span>⚖️</span>
              <span style={{ fontWeight: 600 }}>Weight: {task.weight || 10}</span>
            </div>

            {task.dueDate && (
              <div style={{ 
                background: isOverdue ? 'rgba(255,107,53,0.15)' : 'var(--input-bg)', 
                padding: '8px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                color: isOverdue ? 'var(--danger)' : 'var(--text)'
              }}>
                <span>📅</span>
                <span style={{ fontWeight: 600 }}>{formatDate(task.dueDate)}</span>
                {task.dueTime && <span style={{ opacity: 0.7 }}>@ {task.dueTime}</span>}
              </div>
            )}

            {task.startDate && (
              <div style={{ 
                background: 'var(--input-bg)', padding: '8px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
              }}>
                <span>🚀</span>
                <span style={{ fontWeight: 600 }}>Starts: {formatDate(task.startDate)}</span>
              </div>
            )}
          </div>

          {/* Goal Link */}
          {goalName && (
            <div style={{ 
              background: 'var(--input-bg)', padding: 12, borderRadius: 10, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Linked Goal</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{goalName}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {task.location && (
            <div style={{ 
              background: 'var(--input-bg)', padding: 12, borderRadius: 10, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Location</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{task.location}</div>
              </div>
            </div>
          )}

          {/* People */}
          {task.people && task.people.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>People</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {task.people.map((p, i) => {
                  const personName = typeof p === 'object' ? p.name : p;
                  return (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (window.setTab) {
                          window.setTab('stats');
                        }
                        window.location.hash = `#stats?subView=people&person=${encodeURIComponent(personName)}`;
                        window.dispatchEvent(new CustomEvent('navigate-to-person', { detail: { personName } }));
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
                      title={`Click to view ${personName}'s contact info`}
                    >
                      {personName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>Tags</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {task.tags.map((tag, i) => (
                  <span key={i} style={{ 
                    background: 'rgba(255,107,53,0.1)', 
                    color: 'var(--primary)',
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 12, fontWeight: 600
                  }}>#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>Description</div>
              <div style={{ 
                lineHeight: 1.6, fontSize: 14, color: 'var(--text)', 
                whiteSpace: 'pre-wrap', 
                background: 'var(--input-bg)', padding: 12, borderRadius: 10
              }}>
                {task.description}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>
                Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {task.subtasks.map((st, i) => (
                  <div key={i} style={{ 
                    padding: '10px 12px', 
                    borderBottom: i < task.subtasks.length - 1 ? '1px solid var(--border)' : 'none', 
                    display: 'flex', gap: 10, alignItems: 'center', 
                    background: st.completed ? 'rgba(0,0,0,0.02)' : 'transparent' 
                  }}>
                    <span style={{ color: st.completed ? 'var(--success)' : 'var(--text-light)' }}>
                      {st.completed ? '☑️' : '⬜'}
                    </span>
                    <span style={{ 
                      textDecoration: st.completed ? 'line-through' : 'none', 
                      opacity: st.completed ? 0.6 : 1, 
                      fontSize: 14 
                    }}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring info */}
          {task.recurring && task.recurring !== 'None' && (
            <div style={{ 
              background: 'rgba(74, 144, 226, 0.1)', 
              padding: '8px 12px', borderRadius: 8, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
            }}>
              <span>🔄</span>
              <span style={{ fontWeight: 600 }}>Recurring: {task.recurring}</span>
            </div>
          )}

        </div>

        {/* ACTIONS FOOTER */}
        <div style={{ 
          padding: '16px 20px 20px 20px', 
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexWrap: 'wrap'
        }}>
          {!isDone && onFocus && (
            <button 
              onClick={() => { onFocus(task); onClose(); }}
              className="btn-ai-purple" 
              style={{ flex: 1, minWidth: 100, borderRadius: 10, fontSize: 14, fontWeight: 700, height: 44 }}
            >
              ⏱️ Focus
            </button>
          )}

          {!isDone && onStartTimer && (
            <button 
              onClick={() => { onStartTimer(task); onClose(); }}
              className="btn-white-outline" 
              style={{ flex: 1, minWidth: 100, borderRadius: 10, height: 44 }}
            >
              ▶️ Start Timer
            </button>
          )}
          
          <button 
            onClick={() => { onEdit(task); onClose(); }}
            className="btn-white-outline" 
            style={{ flex: 1, minWidth: 80, borderRadius: 10, height: 44 }}
          >
            ✏️ Edit
          </button>

          <button 
            onClick={() => { onComplete(task.id); onClose(); }}
            className={isDone ? "btn-white-outline" : "btn-orange"} 
            style={{ flex: 1, minWidth: 80, borderRadius: 10, height: 44 }}
          >
            {isDone ? '↺ Undo' : '✓ Done'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

window.ViewTaskModal = ViewTaskModal;
console.log('✅ ViewTaskModal Fixed (Portal + Glow + Emoji)');
