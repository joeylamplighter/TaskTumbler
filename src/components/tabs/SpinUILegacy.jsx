// js/features/13-03a-spin-ui.jsx
// Updated: 2025-12-22
// ===========================================
// SPIN UI: Glow buttons + filter popovers
// ===========================================

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const useGlowButton = (value, isActive, icon, title, onClick) => {
  const btnRef = useRef(null);

  const btnStyle = {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 20,
    padding: 8,
    borderRadius: 8,
    color: isActive ? "var(--primary)" : "var(--text)",
    textShadow: isActive ? "0 0 8px var(--primary)" : "none",
    filter: isActive ? "drop-shadow(0 0 2px var(--primary))" : "none",
    transition: "all 0.2s ease",
    outline: "none",
    boxShadow: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
  };

  const badgeStyle = {
    position: "absolute",
    top: 0,
    right: 0,
    background: "var(--primary)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 800,
    minWidth: 14,
    height: 14,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--card)",
    pointerEvents: "none",
    textShadow: "none",
    filter: "none",
  };

  const render = (
    <button ref={btnRef} onClick={onClick} style={btnStyle} title={title}>
      {icon}
      {value ? <span style={badgeStyle}>{value}</span> : null}
    </button>
  );

  return { btnRef, render };
};

export function DateFilterButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const { btnRef, render } = useGlowButton(null, value !== "Any", "📅", `Due: ${value}`, () => setOpen(!open));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const options = ["Any", "Overdue", "Today", "Tomorrow", "This Week", "Next Week", "This Month"];

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });

    const clickOut = (e) => {
      if (!btnRef.current.contains(e.target) && !e.target.closest(".pop-menu")) setOpen(false);
    };
    window.addEventListener("mousedown", clickOut);
    return () => window.removeEventListener("mousedown", clickOut);
  }, [open]);

  return (
    <>
      {render}
      {open &&
        createPortal(
          <div
            className="pop-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 999999,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              minWidth: 140,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  background: value === opt ? "var(--primary)" : "transparent",
                  color: value === opt ? "#fff" : "var(--text)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: value === opt ? 700 : 500,
                }}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export function DurationFilterButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const { btnRef, render } = useGlowButton(null, value !== "Any", "⏱️", `Time: ${value}`, () => setOpen(!open));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const options = ["Any", "< 5m", "< 15m", "< 30m", "< 60m", "> 1h"];

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });

    const clickOut = (e) => {
      if (!btnRef.current.contains(e.target) && !e.target.closest(".pop-menu")) setOpen(false);
    };
    window.addEventListener("mousedown", clickOut);
    return () => window.removeEventListener("mousedown", clickOut);
  }, [open]);

  return (
    <>
      {render}
      {open &&
        createPortal(
          <div
            className="pop-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 999999,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              minWidth: 120,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  background: value === opt ? "var(--primary)" : "transparent",
                  color: value === opt ? "#fff" : "var(--text)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: value === opt ? 700 : 500,
                }}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export function MultiSelectButton({ icon, title, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const count = selected.length > 0 && selected.length < options.length ? selected.length : null;
  const { btnRef, render } = useGlowButton(count, count !== null, icon, title, () => setOpen(!open));
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });

    const clickOut = (e) => {
      if (!btnRef.current.contains(e.target) && !e.target.closest(".pop-menu")) setOpen(false);
    };
    window.addEventListener("mousedown", clickOut);
    return () => window.removeEventListener("mousedown", clickOut);
  }, [open]);

  const toggle = (item) => {
    if (selected.includes(item)) onChange(selected.filter((i) => i !== item));
    else onChange([...selected, item]);
  };

  const selectAll = () => onChange([]); // empty means "all"

  return (
    <>
      {render}
      {open &&
        createPortal(
          <div
            className="pop-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 999999,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              minWidth: 180,
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingBottom: 6,
                borderBottom: "1px solid var(--border)",
                marginBottom: 6,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  userSelect: "none",
                  flex: 1
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.length === options.length && options.length > 0}
                  ref={(el) => {
                    if (el) {
                      const someSelected = selected.length > 0 && selected.length < options.length;
                      el.indeterminate = someSelected;
                    }
                  }}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...options]); // Select all
                    } else {
                      selectAll(); // Clear all
                    }
                  }}
                  style={{ 
                    accentColor: "var(--primary)",
                    cursor: "pointer"
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text-light)",
                    textTransform: "uppercase",
                  }}
                >
                  {title}
                </span>
              </label>
              {selected.length > 0 && selected.length < options.length && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "var(--primary)",
                  marginLeft: "auto"
                }}>
                  {selected.length} selected
                </span>
              )}
            </div>

            {options.map((opt) => (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  borderRadius: 6,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  style={{ accentColor: "var(--primary)" }}
                />
                <span style={{ fontSize: 13, fontWeight: selected.includes(opt) ? 700 : 400 }}>{opt}</span>
              </label>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export function QuickCatDongle({ value, onChange, categories, defaultCat }) {
  const [open, setOpen] = useState(false);
  const isActive = value && value !== defaultCat;
  const { btnRef, render } = useGlowButton(null, isActive, "📁", `Category: ${value}`, () => setOpen(!open));
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });

    const clickOut = (e) => {
      if (!btnRef.current.contains(e.target) && !e.target.closest(".pop-menu")) setOpen(false);
    };
    window.addEventListener("mousedown", clickOut);
    return () => window.removeEventListener("mousedown", clickOut);
  }, [open]);

  return (
    <>
      {render}
      {open &&
        createPortal(
          <div
            className="pop-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 999999,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              minWidth: 140,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {(categories || []).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onChange(cat);
                  setOpen(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  background: value === cat ? "var(--primary)" : "transparent",
                  color: value === cat ? "#fff" : "var(--text)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: value === cat ? 700 : 500,
                }}
              >
                {cat}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

// Export as named object for compatibility
export const SpinUI = {
  useGlowButton,
  DateFilterButton,
  DurationFilterButton,
  MultiSelectButton,
  QuickCatDongle,
};

