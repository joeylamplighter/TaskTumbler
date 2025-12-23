import React from 'react'

function ToastManager({ toasts = [] }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="fade-in"
          style={{
            background: 'var(--card)',
            color: 'var(--text)',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 200,
            pointerEvents: 'auto',
            border: '1px solid var(--border)'
          }}
        >
          <span style={{ fontSize: 20 }}>{toast.icon || 'ℹ️'}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast.msg || ''}</span>
        </div>
      ))}
    </div>
  )
}

export default ToastManager

