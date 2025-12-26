// js/features/13-01-controls.jsx
// ===========================================
// SHARED UI CONTROLS: Filters, Selects, Modals
// Portal-enabled dropdowns for overflow:hidden containers
// ===========================================

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// ===========================================
// SIMPLE MODAL
// ===========================================
export function SimpleModal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <div style={{
        width: 'min(520px, 100%)',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-light)', fontSize: 20, lineHeight: 1
            }}
          >×</button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

// ===========================================
// SINGLE SELECT (Portal version)
// ===========================================
export function SingleSelect({
  title = "",
  icon = "",
  options = [],
  value,
  setValue,
  style = {},          
  menuStyle = {},      
  optionStyle = {},    
  iconOnly = false,     
  showTitleInMenu = true 
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedLabel = (value !== undefined && value !== null && String(value).length)
    ? String(value)
    : (safeOptions[0] ? String(safeOptions[0]) : "");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const b = btnRef.current;
      const m = menuRef.current;
      if (!b || !m) return;
      if (b.contains(e.target) || m.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Position (portal-friendly)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  useEffect(() => {
    if (!open) return;
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: r.left,
      width: Math.max(160, r.width),
    });
  }, [open, selectedLabel]);

  // --- RENDER TRIGGER ---
  const renderTriggerContent = () => {
      if (iconOnly) {
          return <span style={{fontSize: 16, lineHeight: 1}}>{icon || '🔽'}</span>;
      }
      return (
        <>
            {icon ? <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span> : null}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                {!!title && (
                <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3, textTransform: 'uppercase' }}>
                    {title}
                </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                {selectedLabel}
                </span>
            </div>
            <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.5 }}>▼</span>
        </>
      );
  };

  const trigger = (
    <button
      ref={btnRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="tt-singleselect-trigger"
      title={title || selectedLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: iconOnly ? "center" : "flex-start",
        gap: 8,
        padding: iconOnly ? "8px" : "6px 10px",
        borderRadius: 8,
        border: style.border !== undefined ? style.border : (iconOnly ? "none" : "1px solid var(--border)"),
        background: style.background !== undefined ? style.background : (iconOnly ? "transparent" : "var(--card)"),
        color: "var(--text)",
        cursor: "pointer",
        userSelect: "none",
        minHeight: 32,
        ...style,
      }}
    >
      {renderTriggerContent()}
    </button>
  );

  const menu = open ? (
    <div
      ref={menuRef}
      className="tt-singleselect-menu"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        padding: 6,
        zIndex: 99999,
        maxHeight: 320,
        overflowY: "auto",
        ...menuStyle,
      }}
    >
        {(showTitleInMenu && title) && (
            <div style={{padding: '8px 10px 4px 10px'}}>
                <div style={{fontSize: 10, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5}}>{title}</div>
                <div style={{height: 1, background: 'var(--border)', marginTop: 6, marginBottom: 2}}></div>
            </div>
        )}

      {safeOptions.map((opt) => {
        const label = String(opt);
        const active = label === String(value);
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              setValue?.(opt);
              setOpen(false);
            }}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: active ? "rgba(255,255,255,0.1)" : "transparent",
              color: active ? "var(--primary)" : "var(--text)",
              padding: "8px 10px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.1s',
              ...optionStyle,
            }}
            onMouseEnter={(e) => e.target.style.background = active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}
            onMouseLeave={(e) => e.target.style.background = active ? "rgba(255,255,255,0.1)" : "transparent"}
          >
            {label}
            {active && <span>✓</span>}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      {trigger}
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}

// ===========================================
// DATE SELECT (New Portal Calendar)
// ===========================================
export function DateSelect({ 
  value, 
  setValue, 
  title = "Due Date", 
  icon = "📅" 
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
      if (open && value) {
          // Convert UTC date string to local date for display
          const localDateStr = window.dateUtils?.utcToLocalDateStr?.(value) || value;
          const [y, m, d] = localDateStr.split('-').map(Number);
          // Fix month index (0-based)
          setViewDate(new Date(y, m - 1, d));
      }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - 260); 
    setPos({ top: r.bottom + 8, left: left });
  }, [open]);

  const getDays = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(i);
      return days;
  };

  const changeMonth = (delta) => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const handleSelect = (day) => {
      const y = viewDate.getFullYear();
      const m = String(viewDate.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const localDateStr = `${y}-${m}-${d}`;
      // Convert local date string to UTC for storage
      const utcDateStr = window.dateUtils?.localToUtcDateStr?.(localDateStr) || localDateStr;
      setValue(utcDateStr);
      setOpen(false);
  };

  // Use global dateUtils if available, else fallback
  const fmt = window.dateUtils?.formatHuman ? window.dateUtils.formatHuman(value) : value;
  const displayLabel = value ? fmt : (title || "Set Date");
  const isSelected = !!value;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="tt-singleselect-trigger"
        title={title}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 10px", borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: isSelected ? "var(--primary)" : "var(--text)",
          cursor: "pointer", userSelect: "none", minHeight: 32,
          minWidth: 120
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1}}>
           <span style={{fontSize: 9, opacity: 0.6, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5}}>{title}</span>
           <span style={{fontSize: 12, fontWeight:700}}>{displayLabel}</span>
        </div>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left,
            width: 250, background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            padding: 12, zIndex: 99999
          }}
        >
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
              <button type="button" onClick={() => changeMonth(-1)} className="btn-white-outline" style={{padding:'4px 8px'}}>◀</button>
              <span style={{fontWeight:800, fontSize: 14, color: 'var(--text)'}}>
                  {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" onClick={() => changeMonth(1)} className="btn-white-outline" style={{padding:'4px 8px'}}>▶</button>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom: 4, textAlign:'center'}}>
              {['S','M','T','W','T','F','S'].map(d => (
                  <span key={d} style={{fontSize: 10, fontWeight:700, color:'var(--text-light)'}}>{d}</span>
              ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 2}}>
              {getDays().map((day, i) => {
                  if (!day) return <div key={i}></div>;
                  const checkStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const active = value === checkStr;
                  const isToday = window.dateUtils?.isToday ? window.dateUtils.isToday(checkStr) : false;

                  return (
                      <button
                          key={i}
                          type="button"
                          onClick={() => handleSelect(day)}
                          style={{
                              aspectRatio: '1', border: 'none', borderRadius: 6,
                              background: active ? 'var(--primary)' : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent'),
                              color: active ? '#fff' : 'var(--text)',
                              fontWeight: active || isToday ? 800 : 400,
                              fontSize: 13, cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => !active && (e.target.style.background = 'var(--input-bg)')}
                          onMouseLeave={(e) => !active && (e.target.style.background = isToday ? 'rgba(255,255,255,0.1)' : 'transparent')}
                      >
                          {day}
                      </button>
                  )
              })}
          </div>
          
          {value && (
              <button 
                  type="button"
                  onClick={() => { setValue(''); setOpen(false); }}
                  style={{width:'100%', marginTop: 10, padding: 8, background:'transparent', border:'1px dashed var(--border)', color:'var(--text-light)', borderRadius: 8, fontSize: 11, cursor:'pointer'}}
              >
                  Clear Date
              </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// ===========================================
// GENERIC MULTI-SELECT (Portal version)
// ===========================================
export function GenericMultiSelect({ title, allItems, selectedItems, setSelectedItems, icon, iconSize }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const items = Array.isArray(allItems) ? allItems : [];
  const selected = Array.isArray(selectedItems) ? selectedItems : [];
  const allSelected = items.length > 0 && selected.length === items.length;
  const displayCount = selected.length > 0 && !allSelected ? selected.length : null;

  const activeIcon = selected.length > 0
    ? String(icon || '').replace('📁', '📂').replace('⭐', '🌟').replace('📅', '🗓️')
    : icon;
  const textColor = selected.length > 0 ? 'var(--primary)' : 'var(--text-light)';

  useEffect(() => {
    const onDown = (e) => {
      if (!isOpen) return;
      const inBtn = btnRef.current && btnRef.current.contains(e.target);
      const inDrop = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inBtn && !inDrop) setIsOpen(false);
    };
    const onKey = (e) => { if (isOpen && e.key === 'Escape') setIsOpen(false); };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setIsOpen(v => !v);
  };

  const handleToggle = (item) => {
    if (selected.includes(item)) setSelectedItems(selected.filter(i => i !== item));
    else setSelectedItems([...selected, item]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked && !allSelected) setSelectedItems([...items]);
    else setSelectedItems([]);
  };

  const TB = typeof getTB === 'function' ? getTB() : { icon: 20, pad: '6px', size: 36, radius: 8, badge: 18, badgeFont: 11 };
  const iconPx = typeof iconSize === 'number' ? iconSize : typeof iconSize === 'string' ? parseInt(iconSize, 10) : TB.icon;

  return (
    <div ref={btnRef} style={{ display: 'inline-block' }}>
      <button
        onClick={handleOpen}
        title={title}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: TB.pad, minWidth: TB.size, minHeight: TB.size,
          borderRadius: TB.radius, color: textColor, fontWeight: 800, lineHeight: 1
        }}
      >
        <span style={{ fontSize: iconPx, lineHeight: 1 }}>{activeIcon}</span>
        {displayCount !== null && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: TB.badge || 18, height: TB.badge || 18,
            marginLeft: 6, padding: '0 6px', borderRadius: 999,
            background: 'var(--primary)', color: '#fff',
            fontSize: TB.badgeFont || 11, fontWeight: 900
          }}>{displayCount}</span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            zIndex: 99999,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 6px 16px rgba(0,0,0,.25)',
            minWidth: 200, padding: 10
          }}
        >
          <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 900, color: 'var(--text)' }}>
              <input type="checkbox" onChange={handleSelectAll} checked={allSelected} style={{ marginRight: 10 }} />
              {title}
            </label>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 2 }}>
            {items.map((item) => (
              <label
                key={item}
                style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer',
                  padding: '8px 2px', fontSize: 14, color: 'var(--text)', fontWeight: 700
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item)}
                  onChange={() => handleToggle(item)}
                  style={{ marginRight: 10 }}
                />
                {item}
              </label>
            ))}
            {items.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-light)', padding: '8px 2px' }}>No options</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ===========================================
// VIEW MODE SELECT (Portal version)
// ===========================================
export function ViewModeSelect({ value, setValue, activeCount = 0, doneCount = 0, iconSize }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const options = [
    { value: 'all', emoji: '🗂️', count: activeCount + doneCount },
    { value: 'active', emoji: '⬜', count: activeCount },
    { value: 'done', emoji: '☑️', count: doneCount },
  ];
  const current = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const onDown = (e) => {
      if (!isOpen) return;
      const inBtn = btnRef.current && btnRef.current.contains(e.target);
      const inDrop = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inBtn && !inDrop) setIsOpen(false);
    };
    const onKey = (e) => { if (isOpen && e.key === 'Escape') setIsOpen(false); };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setIsOpen(v => !v);
  };

  const TB = typeof getTB === 'function' ? getTB() : { icon: 20, pad: '6px', size: 36, radius: 8 };
  const iconPx = typeof iconSize === 'number' ? iconSize : typeof iconSize === 'string' ? parseInt(iconSize, 10) : TB.icon;

  return (
    <div ref={btnRef} style={{ display: 'inline-block' }}>
      <button
        onClick={handleOpen}
        title={`${current.value} (${current.count})`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: TB.pad,
          minWidth: Math.max(TB.size + 24, TB.size), minHeight: TB.size,
          borderRadius: TB.radius, color: 'var(--text-light)',
          fontWeight: 900, fontSize: 13, lineHeight: 1
        }}
      >
        <span style={{ fontSize: iconPx, lineHeight: 1 }}>{current.emoji}</span>
        <span style={{ opacity: 0.9 }}>({current.count})</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            zIndex: 99999,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 20px rgba(0,0,0,.28)',
            minWidth: 140, padding: 6
          }}
        >
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { setValue(opt.value); setIsOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '12px 10px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                  color: 'var(--text)', fontWeight: active ? 900 : 800, fontSize: 14
                }}
              >
                <span style={{ fontSize: Math.max(14, iconPx - 2), lineHeight: 1 }}>{opt.emoji}</span>
                <span style={{ opacity: 0.85 }}>({opt.count})</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ===========================================
// CONFIRM MODAL
// ===========================================
export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel' }) {
  if (!open) return null;
  return (
    <SimpleModal open={open} onClose={onClose} title={title}>
      <p style={{ marginBottom: 20, color: 'var(--text-light)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-white-outline" onClick={onClose} style={{ flex: 1 }}>{cancelText}</button>
        <button className="btn-orange" onClick={() => { onConfirm?.(); onClose(); }} style={{ flex: 1 }}>{confirmText}</button>
      </div>
    </SimpleModal>
  );
}

// Expose on window for backward compatibility
if (typeof window !== 'undefined') {
  window.SimpleModal = SimpleModal;
  window.SingleSelect = SingleSelect;
  window.DateSelect = DateSelect;
  window.GenericMultiSelect = GenericMultiSelect;
  window.ViewModeSelect = ViewModeSelect;
  window.ConfirmModal = ConfirmModal;
}

