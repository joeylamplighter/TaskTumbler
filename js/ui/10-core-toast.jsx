// ===========================================
// CORE: Toast Manager
// ===========================================

const ToastManager = ({ toasts }) => (
    <div className="toast-container">
        {toasts.map(t => (
            <div
                key={t.id}
                className={`toast ${t.className || ''}`}
                onClick={t.onClick}
            >
                <span className="toast-icon">{t.icon}</span>
                <span>{t.msg}</span>
            </div>
        ))}
    </div>
);

window.ToastManager = ToastManager;
