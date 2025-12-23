// js/logic/14-missing-components.jsx
(function () {
  const React = window.React;

  // Global Add Button - Standardized for the new layout
  window.GlobalAddButton = ({ onClick }) => (
    <button 
      className="spin-btn" 
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        boxShadow: '0 10px 25px rgba(255, 107, 53, 0.4)'
      }}
    >
      +
    </button>
  );

  // Generic Card wrapper used in Goals and Stats
  window.Card = ({ children, className = "" }) => (
    <div className={`goal-card ${className}`}>{children}</div>
  );

  console.log("✅ 14-missing-components.jsx logic synchronized");
})();