// js/features/13-03b-spin-winner-popup.jsx
// Updated: 2025-12-22
// ===========================================
// SPIN UI: Winner Popup
// ===========================================

import React, { useEffect, useRef } from "react";

export default function WinnerPopup({ open, task, onClose, onFocus, onView, onDone, onRespin, onStartTimer, onEdit }) {
  const closeBtnRef = useRef(null);

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
    <div
      onClick={onClose}
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
        opacity: open ? 1 : 0,
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
            {Number(task?.estimatedTime) > 0 ? pill(`${task.estimatedTime}${task.estimatedTimeUnit || "m"}`) : null}
          </div>
        </div>

        <div style={{ padding: 18, paddingTop: 10 }}>
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
                onClose?.();
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
  );
}

