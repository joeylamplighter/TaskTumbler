// js/features/13-02-tasks.jsx
// Updated: 2025-12-21 (Polished Filter UI + Export Modal)
// ===========================================
// TASKS TAB
// ===========================================

import React from 'react'
import ReactDOM from 'react-dom'

(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  // ---------- 1. POLISHED FILTER COMPONENTS ----------
  
  // Single-line filter section with horizontal scroll
  const FilterSection = ({ label, options, value, onChange, multi = false, onAdd = null }) => {
      const safeOptions = Array.isArray(options) ? options : [];
      const safeValue = multi ? (Array.isArray(value) ? value : []) : value;
      const isActive = (opt) => multi ? safeValue.includes(opt) : safeValue === opt;
      
      const handleClick = (opt) => {
          if (multi) {
              if (safeValue.includes(opt)) onChange(safeValue.filter(v => v !== opt));
              else onChange([...safeValue, opt]);
          } else {
              onChange(opt);
          }
      };
      
      // For multi-select, add a "clear all" as first option when items selected
      const showClearChip = multi && safeValue.length > 0;
      
      return (
          <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, paddingLeft: 14 }}>
                  {label}
              </div>
              <div style={{ 
                  display: 'flex', 
                  gap: 5, 
                  overflowX: 'auto', 
                  paddingBottom: 2,
                  paddingLeft: 14,
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
              }}>
                  {showClearChip && (
                      <button type="button" onClick={() => onChange([])}
                          style={{
                              padding: '5px 8px', 
                              borderRadius: 14, 
                              fontSize: 10, 
                              fontWeight: 600, 
                              cursor: 'pointer',
                              background: 'transparent',
                              color: 'var(--primary)',
                              border: '1px dashed var(--primary)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                          }}>
                          ✕ Clear
                      </button>
                  )}
                  {safeOptions.map(opt => {
                      const active = isActive(opt);
                      return (
                          <button key={opt} type="button" onClick={() => handleClick(opt)}
                              style={{
                                  padding: '5px 10px', 
                                  borderRadius: 14, 
                                  fontSize: 10, 
                                  fontWeight: active ? 700 : 500, 
                                  cursor: 'pointer',
                                  background: active ? 'var(--primary)' : 'transparent',
                                  color: active ? '#fff' : 'var(--text)',
                                  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                                  transition: 'all 0.15s ease',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                              }}>
                              {opt}
                          </button>
                      );
                  })}
                  {onAdd && (
                      <button type="button" onClick={onAdd}
                          style={{
                              padding: '5px 10px', 
                              borderRadius: 14, 
                              fontSize: 10, 
                              fontWeight: 600, 
                              cursor: 'pointer',
                              background: 'transparent',
                              color: 'var(--text-light)',
                              border: '1px dashed var(--border)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                          }}>
                          + Add
                      </button>
                  )}
                  <div style={{ minWidth: 14, flexShrink: 0 }} />
              </div>
          </div>
      );
  };

  // Compact toggle row
  const ToggleRow = ({ label, icon, checked, onChange, isLast = false }) => (
      <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '6px 0',
          borderBottom: isLast ? 'none' : '1px solid var(--border)'
      }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>{icon}</span> {label}
          </span>
          <button type="button" onClick={() => onChange(!checked)}
              style={{
                  width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: checked ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s'
              }}>
              <div style={{
                  width: 14, height: 14, borderRadius: '50%', 
                  background: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'absolute', top: 2, 
                  left: checked ? 18 : 2, 
                  transition: 'left 0.2s ease'
              }} />
          </button>
      </div>
  );

  // Export Modal with copyable text
  const ExportModal = ({ open, onClose, tasks, viewMode }) => {
      const [format, setFormat] = useState('csv');
      const [copied, setCopied] = useState(false);
      
      if (!open) return null;
      
      const source = viewMode === 'all' ? tasks : viewMode === 'active' ? tasks.filter(t => !t.completed) : tasks.filter(t => t.completed);
      
      const generateOutput = () => {
          if (format === 'csv') {
              const headers = ["Title", "Category", "Priority", "Weight", "EstTime", "DueDate", "Status"];
              const rows = [headers.join(',')];
              source.forEach(t => {
                  const escape = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
                  rows.push([escape(t.title), escape(t.category), escape(t.priority), t.weight || 10, t.estimatedTime || 0, escape(t.dueDate || ''), t.completed ? 'Done' : 'Active'].join(','));
              });
              return rows.join('\n');
          } else if (format === 'json') {
              return JSON.stringify(source.map(t => ({ title: t.title, category: t.category, priority: t.priority, weight: t.weight, estimatedTime: t.estimatedTime, dueDate: t.dueDate, completed: t.completed })), null, 2);
          } else {
              return source.map(t => `• ${t.title} [${t.category}] - ${t.priority}${t.dueDate ? ` (Due: ${t.dueDate})` : ''}`).join('\n');
          }
      };
      
      const output = generateOutput();
      
      const handleCopy = () => {
          navigator.clipboard.writeText(output).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
          });
      };
      
      const handleDownload = () => {
          const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
          const blob = new Blob([output], { type: 'text/plain;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `TaskTumbler_Export.${ext}`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
      };
      
      return ReactDOM.createPortal(
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 16, width: 'min(480px, 92vw)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--input-bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>📤</span>
                          <span style={{ fontWeight: 800, fontSize: 14 }}>Export {source.length} Tasks</span>
                      </div>
                      <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-light)', lineHeight: 1 }}>×</button>
                  </div>
                  
                  <div style={{ padding: 16 }}>
                      {/* Format Toggle */}
                      <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: 8, padding: 3, marginBottom: 12 }}>
                          {['csv', 'json', 'text'].map(f => (
                              <button key={f} type="button" onClick={() => setFormat(f)}
                                  style={{ 
                                      flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
                                      background: format === f ? 'var(--primary)' : 'transparent',
                                      color: format === f ? '#fff' : 'var(--text-light)',
                                      transition: 'all 0.15s'
                                  }}>
                                  {f}
                              </button>
                          ))}
                      </div>
                      
                      {/* Output */}
                      <textarea readOnly value={output} 
                          style={{ 
                              width: '100%', height: 180, 
                              background: 'var(--input-bg)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 10, 
                              padding: 12, 
                              fontSize: 11, 
                              fontFamily: 'ui-monospace, monospace', 
                              color: 'var(--text)', 
                              resize: 'none',
                              lineHeight: 1.5
                          }} 
                      />
                  </div>
                  
                  {/* Footer */}
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--input-bg)' }}>
                      <button type="button" onClick={handleCopy} 
                          style={{ 
                              flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              background: copied ? 'var(--success)' : 'transparent', 
                              border: '1px solid var(--border)', 
                              color: copied ? '#fff' : 'var(--text)'
                          }}>
                          {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                      </button>
                      <button type="button" onClick={handleDownload} className="btn-orange" style={{ flex: 1, padding: '10px', fontSize: 12, fontWeight: 700 }}>
                          ⬇️ Download File
                      </button>
                  </div>
              </div>
          </div>, document.body
      );
  };

  // ---------- 3. QUICK CATEGORY DONGLE ----------
  const useGlowButton = (value, isActive, icon, title, onClick) => {
      const btnRef = useRef(null);
      const btnStyle = { 
          position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, borderRadius: 8,
          color: isActive ? 'var(--primary)' : 'var(--text)',
          textShadow: isActive ? '0 0 8px var(--primary)' : 'none',
          filter: isActive ? 'drop-shadow(0 0 2px var(--primary))' : 'none',
          transition: 'all 0.2s ease', outline: 'none', boxShadow: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          width: 32, 
          height: 32
          // No marginLeft - container padding handles spacing
      };
      const render = (
          <button type="button" ref={btnRef} onClick={onClick} style={btnStyle} title={title}>{icon}</button>
      );
      return { btnRef, render };
  };

  function QuickCatDongle({ value, onChange, categories, defaultCat, onAddCategory }) {
      const [open, setOpen] = useState(false);
      const isActive = value && value !== defaultCat;
      const { btnRef, render } = useGlowButton(null, isActive, '📁', `Category: ${value}`, () => setOpen(!open));
      const [pos, setPos] = useState({ top: 0, left: 0 });

      useEffect(() => {
          if (!open || !btnRef.current) return;
          const rect = btnRef.current.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          const clickOut = (e) => { if (!btnRef.current.contains(e.target) && !e.target.closest('.pop-menu')) setOpen(false); };
          window.addEventListener('mousedown', clickOut); return () => window.removeEventListener('mousedown', clickOut);
      }, [open]);

      const handleAdd = () => {
          const newCat = prompt('Enter new category name:');
          if (newCat && newCat.trim()) {
              onAddCategory?.(newCat.trim());
              onChange(newCat.trim());
          }
          setOpen(false);
      };

      return (
          <>
              {render}
              {open && ReactDOM.createPortal(
                  <div className="pop-menu" style={{
                      position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999999,
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: 140, display:'flex', flexDirection:'column', gap:2, maxHeight: 240, overflowY: 'auto'
                  }}>
                      {categories.map(cat => (
                          <button type="button" key={cat} onClick={() => { onChange(cat); setOpen(false); }} 
                              style={{ textAlign:'left', padding:'8px 12px', background: value===cat?'var(--primary)':'transparent', color: value===cat?'#fff':'var(--text)', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight: value===cat?700:500 }}>
                              {cat}
                          </button>
                      ))}
                      {onAddCategory && (
                          <>
                              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                              <button type="button" onClick={handleAdd}
                                  style={{ textAlign:'left', padding:'8px 12px', background:'transparent', color:'var(--text-light)', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight: 600 }}>
                                  + Add Category
                              </button>
                          </>
                      )}
                  </div>, document.body
              )}
          </>
      );
  }

  // ---------- 4. SIMPLE TASK ROW (1-line with columns) ----------
  function SimpleTaskRow({ task, onView, onComplete, onDelete, onUpdate, showProgress = true, urgencyStyle = {}, priClass = '', settings = {} }) {
    const [offset, setOffset] = useState(0);
    const startX = useRef(null);
    const isDragging = useRef(false);
    
    const safeCall = (fn, ...args) => { if (typeof fn === 'function') try { fn(...args); } catch (e) {} };
    const onTouchStart = (e) => { startX.current = e.touches[0].clientX; isDragging.current = true; };
    const onTouchMove = (e) => { 
      if (!isDragging.current) return;
      const diffX = e.touches[0].clientX - startX.current;
      if (Math.abs(diffX) > 10) setOffset(diffX);
    };
    const onTouchEnd = () => { 
      isDragging.current = false;
      if (offset > 100) safeCall(onComplete, task.id); 
      else if (offset < -100) safeCall(onView, task); 
      setOffset(0); 
    };

    const handleProgressChange = (e) => {
      e.stopPropagation();
      const newProgress = parseInt(e.target.value) || 0;
      safeCall(onUpdate, task.id, { progress: newProgress, percentComplete: newProgress });
    };

    const progress = task.progress !== undefined ? task.progress : (task.percentComplete !== undefined ? task.percentComplete : (task.completed ? 100 : 0));
    const fmtTime = (secs) => { 
      if (!secs) return null; 
      const min = Math.round(secs / 60);
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h}h${m>0?` ${m}m`:''}` : `${m}m`;
    };

    let bg = offset > 0 ? { background: 'var(--success)', justifyContent: 'flex-start' } : { background: '#ff7675', justifyContent: 'flex-end' };
    let icon = offset > 0 ? (task.completed ? '↺' : '✓') : '✎';

    return (
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--card)' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 24px', ...bg, color:'white', fontWeight:700, fontSize:20 }}>
          {Math.abs(offset) > 30 && icon}
        </div>
        <div className="task-row" style={{ ...urgencyStyle, transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: showProgress && !task.completed ? 'auto 1fr auto auto auto auto auto' : 'auto 1fr auto auto auto auto', gap: '8px', alignItems: 'center', padding: '8px 12px' }}
          onClick={() => { if (Math.abs(offset) < 5) safeCall(onView, task); }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <input type="checkbox" className="task-check" checked={!!task.completed} onChange={e => { e.stopPropagation(); safeCall(onComplete, task.id); }} onClick={e => e.stopPropagation()} style={{ margin: 0 }} />
          <div style={{ opacity: task.completed ? 0.6 : 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: 14, textDecoration: task.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
          </div>
          {showProgress && !task.completed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 60 }}>
              <div style={{ flex: 1, position: 'relative', height: 4, borderRadius: 2, background: 'var(--input-bg)', minWidth: 40 }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: 2,
                  background: 'var(--primary)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleProgressChange}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    zIndex: 2,
                    margin: 0,
                    padding: 0,
                    opacity: 0
                  }}
                />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-light)', minWidth: 28, textAlign: 'right' }}>
                {progress}%
              </span>
            </div>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{(task.category || 'General').toUpperCase()}</span>
          <span style={{ fontSize: 10, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{task.priority || 'Medium'}</span>
          {task.dueDate && <span style={{ fontSize: 10, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>📅 {task.dueDate}</span>}
          <span style={{ fontSize: 18, color: '#666', padding: '4px 8px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); safeCall(onDelete, task.id); }}>×</span>
        </div>
      </div>
    );
  }

  // ---------- 4. TASK ROW (Detailed) ----------
  function SwipeableTaskRow({ task, onView, onComplete, onDelete, onUpdate, urgencyStyle = {}, priClass = '', settings = {} }) {
    const [offset, setOffset] = useState(0);
    const startX = useRef(null);
    const isDragging = useRef(false);
    
    const safeCall = (fn, ...args) => { if (typeof fn === 'function') try { fn(...args); } catch (e) {} };
    const onTouchStart = (e) => { startX.current = e.touches[0].clientX; isDragging.current = true; };
    const onTouchMove = (e) => { 
      if (!isDragging.current) return;
      const diffX = e.touches[0].clientX - startX.current;
      if (Math.abs(diffX) > 10) setOffset(diffX);
    };
    const onTouchEnd = () => { 
      isDragging.current = false;
      if (offset > 100) safeCall(onComplete, task.id); 
      else if (offset < -100) safeCall(onView, task); 
      setOffset(0); 
    };

    const fmtTime = (secs) => { 
      if (!secs) return null; 
      const min = Math.round(secs / 60);
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h}h${m>0?` ${m}m`:''}` : `${m}m`;
    };

    const handleProgressChange = (e) => {
      e.stopPropagation();
      const newProgress = parseInt(e.target.value) || 0;
      // Update both progress and percentComplete for compatibility
      safeCall(onUpdate, task.id, { progress: newProgress, percentComplete: newProgress });
    };

    const progress = task.progress !== undefined ? task.progress : (task.percentComplete !== undefined ? task.percentComplete : (task.completed ? 100 : 0));

    let bg = offset > 0 ? { background: 'var(--success)', justifyContent: 'flex-start' } : { background: '#ff7675', justifyContent: 'flex-end' };
    let icon = offset > 0 ? (task.completed ? '↺' : '✓') : '✎';

    return (
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--card)' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 24px', ...bg, color:'white', fontWeight:700, fontSize:20 }}>
          {Math.abs(offset) > 30 && icon}
        </div>
        <div className="task-row" style={{ ...urgencyStyle, transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 2 }}
          onClick={() => { if (Math.abs(offset) < 5) safeCall(onView, task); }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <input type="checkbox" className="task-check" checked={!!task.completed} onChange={e => { e.stopPropagation(); safeCall(onComplete, task.id); }} onClick={e => e.stopPropagation()} />
          <div style={{ flex: 1, marginLeft: 10, opacity: task.completed ? 0.6 : 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
            {/* Progress Slider */}
            {!task.completed && (
              <div style={{ marginTop: 6, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 6,
                      borderRadius: 3,
                      background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progress}%, var(--input-bg) ${progress}%, var(--input-bg) 100%)`,
                      pointerEvents: 'none',
                      zIndex: 1
                    }} />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={handleProgressChange}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        background: 'transparent',
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        zIndex: 2,
                        margin: 0,
                        padding: 0
                      }}
                      onMouseMove={(e) => {
                        if (e.buttons === 1) e.stopPropagation();
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-light)', minWidth: 35, textAlign: 'right' }}>
                    {progress}%
                  </span>
                </div>
              </div>
            )}
            {!!settings?.showTaskTimes && (task.estimatedTime || task.actualTime > 0) && (
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                {task.estimatedTime && <span style={{marginRight:8}}>⏱️ {task.estimatedTime}m</span>}
                {task.actualTime > 0 && <span>⏳ {fmtTime(task.actualTime)}</span>}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, display: 'flex', gap: 6 }}>
              <span className="badge badge-gray">{(task.category || 'General').toUpperCase()}</span>
              <span className={`badge ${priClass}`}>{task.priority || 'Medium'}</span>
              {task.dueDate && <span className="badge">📅 {task.dueDate}</span>}
            </div>
          </div>
          <span style={{ fontSize: 20, color: '#666', padding: 10 }} onClick={(e) => { e.stopPropagation(); safeCall(onDelete, task.id); }}>×</span>
        </div>
      </div>
    );
  }
  window.SwipeableTaskRow = SwipeableTaskRow;

  // --- TASKS TAB MAIN ---
  function TasksTab({ tasks, onView, onComplete, onDelete, onUpdate, categories, onAdd, openAdd, notify, settings }) {
    const [viewMode, setViewMode] = useState('active'); // Filter mode: active, done, all
    const [layoutStyle, setLayoutStyle] = useState(() => {
      try {
        const saved = localStorage.getItem('taskLayoutStyle');
        return saved || 'detailed';
      } catch {
        return 'detailed';
      }
    }); // Layout style: detailed, simple, simple-no-progress
    const [searchText, setSearchText] = useState('');
    
    // Command Bar State
    const [activeMode, setActiveMode] = useState('filter'); // Default to search/filter mode
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [aiMode, setAiMode] = useState(false);
    const [quickText, setQuickText] = useState('');
    const [showFilterGrid, setShowFilterGrid] = useState(false);

    // Filters
    const [filterTime, setFilterTime] = useState('Any');
    const [filterDuration, setFilterDuration] = useState('Any');
    const [filterCats, setFilterCats] = useState([]);
    const [filterPriorities, setFilterPriorities] = useState([]);
    const [filterSort, setFilterSort] = useState('Default');
    const [filterWeight, setFilterWeight] = useState('Any');
    const [filterHasNotes, setFilterHasNotes] = useState(false);
    const [filterHasSubtasks, setFilterHasSubtasks] = useState(false);
    const [filterHasDueDate, setFilterHasDueDate] = useState(false);
    const [filterHasPeople, setFilterHasPeople] = useState(false);
    const [filterHasLocations, setFilterHasLocations] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    const [localCategories, setLocalCategories] = useState(() => {
      try { const s = JSON.parse(localStorage.getItem('categories') || '[]'); return Array.from(new Set([...(categories||[]), ...s])).filter(Boolean); } catch { return categories||[]; }
    });
    useEffect(() => { if(Array.isArray(categories)) setLocalCategories(p=>Array.from(new Set([...categories,...p])).filter(Boolean)); }, [categories]);
    const visibleCategories = localCategories.filter(c => (settings?.categoryMultipliers?.[c] === undefined || settings.categoryMultipliers[c] >= 0));
    const [quickCat, setQuickCat] = useState(visibleCategories[0] || 'General');
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [isVeryNarrow, setIsVeryNarrow] = useState(false);
    const actionMenuRef = useRef(null);

    // Check if screen is very narrow (for collapsing export/bulk/add into hamburger)
    useEffect(() => {
      const checkWidth = () => {
        setIsVeryNarrow(window.innerWidth < 400);
      };
      checkWidth();
      window.addEventListener('resize', checkWidth);
      return () => window.removeEventListener('resize', checkWidth);
    }, []);

    // Close action menu when clicking outside
    useEffect(() => {
      if (!showActionMenu) return;
      const handleClickOutside = (e) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(e.target) && 
            !e.target.closest('.action-menu-dropdown')) {
          setShowActionMenu(false);
        }
      };
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [showActionMenu]);

    // --- FILTERING (use shared utilities) ---
    const TabUtils = window.TabUtils || {};
    const getActiveTasks = TabUtils.getActiveTasks || ((tasks) => (tasks||[]).filter(t => !t.archived && !t.completed));
    const getCompletedTasks = TabUtils.getCompletedTasks || ((tasks) => (tasks||[]).filter(t => t.completed));
    const filterTasks = TabUtils.filterTasks || ((tasks, filters) => tasks);
    const dueMatches = TabUtils.dueMatches || ((task, filterDue) => true);
    
    const activeTasks = getActiveTasks(tasks);
    const doneTasks = getCompletedTasks(tasks);
    
    // Pick Source
    const sourceList = viewMode === 'active' ? activeTasks : viewMode === 'done' ? doneTasks : [...activeTasks, ...doneTasks];

    // Apply Filters (use shared filterTasks utility + additional filters)
    const displayTasks = useMemo(() => {
        // Use shared filterTasks utility for basic filtering
        let filtered = filterTasks(sourceList, {
            searchText,
            categories: filterCats,
            priorities: filterPriorities,
            dueDate: filterTime,
            duration: filterDuration,
            completed: viewMode === 'done' ? true : viewMode === 'active' ? false : null
        });
        
        // Apply additional filters not in shared utility
        filtered = filtered.filter(t => {
            // Weight filter
            if (filterWeight !== 'Any') {
                const w = parseInt(t.weight) || 10;
                if (filterWeight === 'Low' && w > 10) return false;
                if (filterWeight === 'Med' && (w < 11 || w > 25)) return false;
                if (filterWeight === 'High' && (w < 26 || w > 50)) return false;
                if (filterWeight === 'Max' && w < 50) return false;
            }
            
            // Toggle filters
            if (filterHasNotes && !(t.notes && t.notes.trim())) return false;
            if (filterHasSubtasks && !(t.subtasks && t.subtasks.length > 0)) return false;
            if (filterHasDueDate && !t.dueDate) return false;
            if (filterHasPeople && !(t.people && t.people.length > 0)) return false;
            if (filterHasLocations && !(t.location || (t.locations && t.locations.length > 0))) return false;
            
            return true;
        });
        
        // Sorting
        if (filterSort !== 'Default') {
            filtered = [...filtered].sort((a, b) => {
                if (filterSort === 'Priority') {
                    const order = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                    return (order[a.priority] || 2) - (order[b.priority] || 2);
                }
                if (filterSort === 'Due Date') {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                if (filterSort === 'Weight') return (b.weight || 10) - (a.weight || 10);
                if (filterSort === 'Name A-Z') return (a.title || '').localeCompare(b.title || '');
                if (filterSort === 'Name Z-A') return (b.title || '').localeCompare(a.title || '');
                if (filterSort === 'Newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                if (filterSort === 'Oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                if (filterSort === 'Duration') return (a.estimatedTime || 999) - (b.estimatedTime || 999);
                return 0;
            });
        }
        
        return filtered;
    }, [sourceList, searchText, filterCats, filterPriorities, filterTime, filterDuration, filterWeight, filterSort, filterHasNotes, filterHasSubtasks, filterHasDueDate, filterHasPeople, filterHasLocations]);

    const handleQuickAdd = () => {
        if(!quickText.trim()) return;
        onAdd({ title: quickText.trim(), category: quickCat, priority: 'Medium', weight: 10, completed: false, id: 't_'+Date.now() });
        setQuickText('');
        // Don't notify here - addTask already sends "Task Added" notification
    };

    const handleBulkImport = async () => {
        const text = (bulkText || "").trim();
        if (!text) return;
        if (aiMode) {
            if (!settings?.geminiApiKey) { notify?.("Missing API Key", "❌"); return; }
            if (!window.callGemini) { notify?.("AI Service Missing", "❌"); return; }
            notify?.("AI Processing...", "🧠");
            const catStr = categories.join(', ');
            const prompt = `Extract tasks. Return JSON array: [{title, category (one of: ${catStr}), priority, estimatedTime}]. Text: "${text}"`;
            try {
                const res = await window.callGemini(prompt, settings.geminiApiKey);
                if (res.text && window.parseAITasks) {
                    const parsed = window.parseAITasks(res.text, categories);
                    parsed.forEach(t => onAdd?.(t));
                    setBulkText(""); setShowBulkAdd(false); notify?.(`AI Added ${parsed.length} Tasks`, "✅");
                } else throw new Error("AI Parsing Failed");
            } catch (e) { notify?.("AI Error", "❌"); }
        } else {
            text.split('\n').forEach(l=>{ if(l.trim()) onAdd({title:l.trim(), category:quickCat, priority:'Medium', weight:10, id:'t_'+Date.now()+Math.random()})});
            setBulkText(''); setShowBulkAdd(false); notify?.('Imported!', '✅');
        }
    };

    // --- STYLES ---
    const glowStyle = (active) => ({
      background: active ? "rgba(var(--primary-rgb, 255, 107, 53), 0.1)" : "transparent",
      border: "none", 
      cursor: "pointer", 
      display: "inline-flex",
      alignItems: "center", 
      justifyContent: "center", 
      transition: "all 0.2s ease",
      color: active ? "var(--primary)" : "rgba(255, 255, 255, 0.7)",
      borderRadius: 8,
      fontSize: "16px", 
      lineHeight: 1, 
      padding: "6px 8px",
      minWidth: 36,
      height: 36,
      position: "relative"
    });

    const isFilterActive = filterTime !== 'Any' || filterDuration !== 'Any' || filterCats.length > 0 || filterPriorities.length > 0 || viewMode !== 'active' || filterSort !== 'Default' || filterWeight !== 'Any' || filterHasNotes || filterHasSubtasks || filterHasDueDate || filterHasPeople || filterHasLocations;
    
    const activeFilterCount = [
        filterTime !== 'Any',
        filterDuration !== 'Any', 
        filterCats.length > 0,
        filterPriorities.length > 0,
        filterWeight !== 'Any',
        filterSort !== 'Default',
        filterHasNotes,
        filterHasSubtasks,
        filterHasDueDate,
        filterHasPeople,
        filterHasLocations
    ].filter(Boolean).length;

    return (
      <div>
        {/* TOP BAR - IMPROVED UI */}
        <div style={{
            minHeight: "56px", 
            background: "var(--card)", 
            borderRadius: "12px", 
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex", 
            flexWrap: "wrap",
            alignItems: "center", 
            padding: "8px", 
            gap: 8, 
            marginBottom: 12
          }}>
          
          {/* TOP ROW: Export, Bulk, Add (or hamburger when very narrow), Mode Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Export, Bulk, Add buttons or Hamburger */}
            {isVeryNarrow ? (
              <div style={{ position: 'relative' }}>
                <button
                  ref={actionMenuRef}
                  type="button"
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  style={{
                    padding: '6px 10px',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: showActionMenu ? 'var(--primary)' : 'transparent',
                    color: showActionMenu ? '#fff' : 'var(--text-light)',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Actions"
                >
                  ☰
                </button>
                
                {/* Action Menu Dropdown */}
                {showActionMenu && ReactDOM.createPortal(
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'fixed',
                      top: actionMenuRef.current ? actionMenuRef.current.getBoundingClientRect().bottom + 8 : 100,
                      left: actionMenuRef.current ? actionMenuRef.current.getBoundingClientRect().left : 0,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      zIndex: 10000,
                      minWidth: '140px'
                    }}
                    className="action-menu-dropdown"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportModal(true);
                        setShowActionMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text)',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left'
                      }}
                    >
                      <span>📤</span>
                      <span>Export Tasks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkAdd(!showBulkAdd);
                        setShowActionMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: showBulkAdd ? 'var(--primary)' : 'transparent',
                        color: showBulkAdd ? '#fff' : 'var(--text)',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left'
                      }}
                    >
                      <span>📦</span>
                      <span>Bulk Import</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openAdd();
                        setShowActionMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text)',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left'
                      }}
                    >
                      <span>➕</span>
                      <span>Full Add Task</span>
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
              <>
                {/* EXPORT BUTTON */}
                <button 
                  type="button" 
                  style={{ 
                    ...glowStyle(false), 
                    padding: 4, 
                    minWidth: 36, 
                    height: 36, 
                    flexShrink: 0 
                  }} 
                  onClick={() => setShowExportModal(true)} 
                  title="Export Tasks"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>📤</span>
                </button>

                <div style={{ width: 1, height: 24, background: "var(--border)", opacity: 0.2, borderRadius: 1 }} />

                <button 
                  type="button" 
                  style={glowStyle(showBulkAdd)} 
                  onClick={() => setShowBulkAdd(!showBulkAdd)} 
                  title="Bulk Import"
                  onMouseEnter={(e) => !showBulkAdd && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => !showBulkAdd && (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>📦</span>
                </button>
                <button 
                  type="button" 
                  style={glowStyle(false)} 
                  onClick={openAdd} 
                  title="Full Add Task"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>➕</span>
                </button>
              </>
            )}

            <div style={{ width: 1, height: 24, background: "var(--border)", opacity: 0.2, borderRadius: 1 }} />

            {/* MODE TOGGLES */}
            <div style={{ display: "flex", gap: 4, background: "var(--input-bg)", borderRadius: 8, padding: 2, flexShrink: 0 }}>
              <button 
                type="button" 
                style={{
                  ...glowStyle(activeMode === "add"),
                  background: activeMode === "add" ? "var(--primary)" : "transparent",
                  color: activeMode === "add" ? "#fff" : "rgba(255,255,255,0.7)",
                  minWidth: 40,
                  height: 32,
                  borderRadius: 6,
                  fontSize: 16,
                  lineHeight: 1
                }} 
                onClick={() => setActiveMode("add")} 
                title="Quick Add"
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>⚡</span>
              </button>
              <button 
                type="button" 
                style={{
                  ...glowStyle(activeMode === "filter"),
                  background: activeMode === "filter" ? "var(--primary)" : "transparent",
                  color: activeMode === "filter" ? "#fff" : "rgba(255,255,255,0.7)",
                  minWidth: 40,
                  height: 32,
                  borderRadius: 6,
                  fontSize: 16,
                  lineHeight: 1
                }} 
                onClick={() => setActiveMode("filter")} 
                title="Search & Filter"
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>🔍</span>
              </button>
            </div>
          </div>
          
          {/* BOTTOM ROW: Input Box (wraps when narrow) */}
          <div style={{ flex: "1 1 100%", minWidth: 0, height: "40px", display: "flex", alignItems: "center" }}>
            <div style={{ 
                flex: 1, 
                height: '40px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                background: 'var(--input-bg)', 
                borderRadius: 10, 
                paddingLeft: 6, 
                paddingRight: 6, 
                minWidth: 0,
                border: "1px solid rgba(255,255,255,0.05)",
                transition: "border-color 0.2s ease"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "rgba(var(--primary-rgb, 255, 107, 53), 0.3)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
            >
                {activeMode === 'add' ? (
                    <>
                        <QuickCatDongle value={quickCat} onChange={setQuickCat} categories={visibleCategories} defaultCat="General" onAddCategory={(newCat) => {
                            if (!visibleCategories.includes(newCat)) {
                                const updated = [...localCategories, newCat];
                                setLocalCategories(updated);
                                try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
                            }
                        }} />
                        <input 
                          className="naked-input" 
                          style={{ 
                            background: "transparent", 
                            border: "none", 
                            outline:'none', 
                            margin: 0, 
                            flex: 1, 
                            height: "100%", 
                            padding: '0 8px', 
                            minWidth: 0,
                            fontSize: 14,
                            color: "var(--text)"
                          }}
                          placeholder="Quick add task..." 
                          value={quickText} 
                          onChange={(e) => setQuickText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }} 
                        />
                        {quickText && (
                          <button 
                            type="button" 
                            onClick={handleQuickAdd} 
                            style={{ 
                              background: "var(--primary)", 
                              color: "#fff",
                              border: "none", 
                              borderRadius: 6, 
                              padding: "4px 12px", 
                              marginLeft: 4, 
                              height: 28, 
                              flexShrink: 0,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          >
                            Add
                          </button>
                        )}
                    </>
                ) : (
                    <>
                        {/* FILTER BUTTON - Inside input, to the left of text */}
                        <button 
                          type="button" 
                          style={{ 
                            ...glowStyle(isFilterActive), 
                            padding: 4, 
                            width: 32, 
                            height: 32, 
                            flexShrink: 0, 
                            position: 'relative',
                            borderRadius: 6
                          }} 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFilterGrid(true); }} 
                          title="Filters"
                          onMouseEnter={(e) => !isFilterActive && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                          onMouseLeave={(e) => !isFilterActive && (e.currentTarget.style.background = "transparent")}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>🎛️</span>
                          {activeFilterCount > 0 && (
                              <span style={{ 
                                position: 'absolute', 
                                top: -4, 
                                right: -4, 
                                background: 'var(--primary)', 
                                color: '#fff', 
                                fontSize: 10, 
                                fontWeight: 800, 
                                minWidth: 16, 
                                height: 16, 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                border: "2px solid var(--card)",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                              }}>
                                {activeFilterCount}
                              </span>
                          )}
                        </button>
                        <input 
                          className="naked-input" 
                          style={{ 
                            background: "transparent", 
                            border: "none", 
                            outline:'none', 
                            margin: 0, 
                            flex: 1, 
                            height: "100%", 
                            padding: '0 4px', 
                            minWidth: 0,
                            fontSize: 14,
                            color: "var(--text)"
                          }}
                          placeholder="Search tasks..." 
                          value={searchText} 
                          onChange={(e) => setSearchText(e.target.value)} 
                        />
                    </>
                )}
            </div>
          </div>
          
        </div>

        {/* ✅ COMPACT FILTER MODAL */}
        {showFilterGrid && ReactDOM.createPortal(
            <div onClick={() => setShowFilterGrid(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
                <div onClick={e => e.stopPropagation()} style={{ 
                    background: 'var(--card)', 
                    borderRadius: 14, 
                    width: 'min(380px, 92vw)', 
                    overflow: 'hidden',
                    border: '1px solid var(--border)', 
                    boxShadow: '0 25px 60px rgba(0,0,0,0.4)' 
                }}>
                    {/* Header */}
                    <div style={{ 
                        padding: '10px 14px', 
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'var(--input-bg)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>🎛️</span>
                            <span style={{ fontWeight: 800, fontSize: 13 }}>Filters</span>
                            {activeFilterCount > 0 && (
                                <span style={{ background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 8 }}>{activeFilterCount}</span>
                            )}
                        </div>
                        <button type="button" onClick={() => setShowFilterGrid(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-light)', lineHeight: 1 }}>×</button>
                    </div>
                    
                    {/* Content */}
                    <div style={{ padding: '12px 0', maxHeight: '60vh', overflowY: 'auto' }}>
                        
                        {/* VIEW + SORT ROW */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, padding: '0 14px' }}>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, textTransform: 'uppercase' }}>View</div>
                                <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: 6, padding: 2 }}>
                                    {['active', 'done', 'all'].map(v => (
                                        <button key={v} type="button" onClick={() => setViewMode(v)}
                                            style={{ 
                                                flex: 1, padding: '4px 0', border: 'none', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer',
                                                background: viewMode === v ? 'var(--primary)' : 'transparent',
                                                color: viewMode === v ? '#fff' : 'var(--text-light)',
                                                transition: 'all 0.15s'
                                            }}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, textTransform: 'uppercase' }}>Sort</div>
                                <select value={filterSort} onChange={e => setFilterSort(e.target.value)}
                                    style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                    {['Default', 'Priority', 'Due Date', 'Weight', 'Duration', 'Name A-Z', 'Name Z-A', 'Newest', 'Oldest'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* LAYOUT STYLE ROW */}
                        <div style={{ marginBottom: 12, padding: '0 14px' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, textTransform: 'uppercase' }}>Layout</div>
                            <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: 6, padding: 2, gap: 2 }}>
                                {[
                                    { value: 'detailed', label: 'Detailed' },
                                    { value: 'simple', label: 'Simple' },
                                    { value: 'simple-no-progress', label: 'Simple (No Progress)' }
                                ].map(l => (
                                    <button key={l.value} type="button" onClick={() => {
                                        setLayoutStyle(l.value);
                                        try { localStorage.setItem('taskLayoutStyle', l.value); } catch {}
                                    }}
                                        style={{ 
                                            flex: 1, padding: '4px 0', border: 'none', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer',
                                            background: layoutStyle === l.value ? 'var(--primary)' : 'transparent',
                                            color: layoutStyle === l.value ? '#fff' : 'var(--text-light)',
                                            transition: 'all 0.15s'
                                        }}>
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* FILTER SECTIONS - Single Line Each */}
                        <FilterSection label="📅 Due Date" options={['Any', 'Overdue', 'Now', 'Tomorrow', 'Week', 'Month']} value={filterTime} onChange={setFilterTime} />
                        <FilterSection label="⏱️ Duration" options={['Any', '< 5m', '< 15m', '< 30m', '< 60m', '> 1h', 'None']} value={filterDuration} onChange={setFilterDuration} />
                        <FilterSection label="⚖️ Weight" options={['Any', 'Low', 'Med', 'High', 'Max']} value={filterWeight} onChange={setFilterWeight} />
                        <FilterSection label="🚨 Priority" options={['Urgent', 'High', 'Medium', 'Low']} value={filterPriorities} onChange={setFilterPriorities} multi={true} />
                        <FilterSection label="📁 Category" options={visibleCategories} value={filterCats} onChange={setFilterCats} multi={true} onAdd={() => {
                            const newCat = prompt('Enter new category name:');
                            if (newCat && newCat.trim()) {
                                const trimmed = newCat.trim();
                                if (!visibleCategories.includes(trimmed)) {
                                    const updated = [...localCategories, trimmed];
                                    setLocalCategories(updated);
                                    try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
                                }
                            }
                        }} />
                        
                        {/* TOGGLES - Compact */}
                        <div style={{ background: 'var(--input-bg)', borderRadius: 8, padding: '2px 10px', marginTop: 6, marginLeft: 14, marginRight: 14 }}>
                            <ToggleRow label="Has Notes" icon="📝" checked={filterHasNotes} onChange={setFilterHasNotes} />
                            <ToggleRow label="Has Subtasks" icon="☑️" checked={filterHasSubtasks} onChange={setFilterHasSubtasks} />
                            <ToggleRow label="Has Due Date" icon="📆" checked={filterHasDueDate} onChange={setFilterHasDueDate} />
                            <ToggleRow label="Has People" icon="👥" checked={filterHasPeople} onChange={setFilterHasPeople} />
                            <ToggleRow label="Has Location" icon="📍" checked={filterHasLocations} onChange={setFilterHasLocations} isLast={true} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--input-bg)' }}>
                        <button type="button" onClick={() => { 
                            setFilterTime('Any'); setFilterDuration('Any'); setFilterCats([]); setFilterPriorities([]); 
                            setViewMode('active'); setFilterSort('Default'); setFilterWeight('Any');
                            setFilterHasNotes(false); setFilterHasSubtasks(false); setFilterHasDueDate(false);
                            setFilterHasPeople(false); setFilterHasLocations(false);
                        }} 
                            style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--text-light)' }}>
                            Reset
                        </button>
                        <button type="button" onClick={() => setShowFilterGrid(false)} className="btn-orange" style={{ flex: 1.5, padding: '8px', fontSize: 11, fontWeight: 700 }}>
                            Show {displayTasks.length} Tasks
                        </button>
                    </div>
                </div>
            </div>, document.body
        )}
        
        {/* EXPORT MODAL */}
        <ExportModal open={showExportModal} onClose={() => setShowExportModal(false)} tasks={tasks} viewMode={viewMode} />

        {/* BULK IMPORT MODAL */}
        {window.SimpleModal && (
            <window.SimpleModal open={showBulkAdd} onClose={() => setShowBulkAdd(false)} title={aiMode ? 'Bulk Import (AI Dump)' : 'Bulk Import (CSV)'}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className={`toggle-icon ${!aiMode ? 'active' : ''}`} onClick={() => setAiMode(false)} style={{ cursor: 'pointer', padding: 6, borderRadius: 6, background: !aiMode ? 'var(--primary)' : 'transparent' }}>📄</div>
                        <div className={`toggle-icon ${aiMode ? 'active' : ''}`} onClick={() => setAiMode(true)} style={{ cursor: 'pointer', padding: 6, borderRadius: 6, background: aiMode ? 'var(--primary)' : 'transparent' }}>🧠</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, marginLeft: 6, color: 'var(--text)' }}>{aiMode ? 'AI Dump Mode' : 'CSV Import Mode'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 8 }}>{aiMode ? 'Paste unstructured notes/emails here:' : 'Format: Title | Category | Priority | Weight | Time | Due'}</div>
                <textarea className="f-textarea" placeholder={aiMode ? "Paste anything..." : "Buy groceries | Personal | Medium | 10 | 30 | 2024-12-20"} value={bulkText} onChange={(e) => setBulkText(e.target.value)} style={{ minHeight: 140 }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button className="btn-orange" onClick={handleBulkImport} style={{ flex: 1 }}>{!aiMode ? '📄 Import CSV' : '🧠 Process with AI'}</button>
                </div>
            </window.SimpleModal>
        )}

        {/* VIEW CONTENT */}
        <div className="task-list">
          {displayTasks.map(t => {
            if (layoutStyle === 'simple') {
              return <SimpleTaskRow key={t.id} task={t} onView={onView} onComplete={onComplete} onDelete={onDelete} onUpdate={onUpdate} showProgress={true} settings={settings} />;
            } else if (layoutStyle === 'simple-no-progress') {
              return <SimpleTaskRow key={t.id} task={t} onView={onView} onComplete={onComplete} onDelete={onDelete} onUpdate={onUpdate} showProgress={false} settings={settings} />;
            } else {
              return <SwipeableTaskRow key={t.id} task={t} onView={onView} onComplete={onComplete} onDelete={onDelete} onUpdate={onUpdate} settings={settings} />;
            }
          })}
          {displayTasks.length === 0 && <div style={{textAlign:'center', padding:20, opacity:0.5}}>No tasks found.</div>}
        </div>
      </div>
    );
  }
  window.TasksTab = TasksTab;
  console.log('✅ 13-02-tasks.jsx loaded (Polished Filter UI)');
})();