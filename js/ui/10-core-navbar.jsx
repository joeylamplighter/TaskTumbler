// js/components/10-core-navbar.jsx
// ===========================================
// BOTTOM DOCK NAVBAR (slides down when hidden)
// Updated: 2025-12-18 - More washed out unselected icons
// ===========================================

function NavBar({ current, set, items, hidden, dockHidden, getCurrentSubtab }) {
  const [openDropdown, setOpenDropdown] = React.useState(null);
  const dropdownRefs = React.useRef({});

  // Hide completely if no items
  if (!items || items.length === 0) {
    return null;
  }

  const isHidden = !!hidden || !!dockHidden;

  // Helper to check if we're on a stats subtab
  const checkSubtab = () => {
    if (typeof getCurrentSubtab === 'function') {
      return getCurrentSubtab();
    }
    const hash = window.location.hash;
    if (hash.includes('subView=people')) return 'people';
    if (hash.includes('subView=charts')) return 'charts';
    if (hash.includes('subView=history')) return 'history';
    if (hash.includes('subView=places')) return 'places';
    if (hash.includes('subView=overview')) return 'overview';
    return null;
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && !Object.values(dropdownRefs.current).some(ref => ref?.contains(e.target))) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

const style = {
  position: 'fixed',
  left: '50%',
  bottom: 'max(10px, env(safe-area-inset-bottom))',
  transform: isHidden ? 'translate(-50%, 140%)' : 'translate(-50%, 0%)',
  opacity: isHidden ? 0 : 1,
  transition: 'transform 300ms cubic-bezier(0.25, 0.9, 0.3, 1), opacity 200ms ease-out',
  willChange: 'transform, opacity',
  zIndex: 999,
  width: 'min(520px, 94vw)',
  padding: 8,

  // almost square
  borderRadius: 3,

  // more opaque to reduce color bleed
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(16px) saturate(100%)',
  WebkitBackdropFilter: 'blur(16px) saturate(100%)',

  // very subtle edge definition
  border: '1px solid rgba(255,255,255,0.08)',

  // lighter shadow so it doesn’t look like a slab
  boxShadow:
    '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',

  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  pointerEvents: isHidden ? 'none' : 'auto',
};

  return (
    <div style={style}>
      {(items || []).filter(item => !item.groupLabel).map((item) => {
        // Filter out items with groupLabel - they should only appear in dropdowns

        // Handle tabs with dropdowns and regular tabs
        let active = false;
        if (item.key.includes(':')) {
          const [parentTab, subtab] = item.key.split(':');
          if (parentTab === 'stats') {
            active = current === 'stats' && checkSubtab() === subtab;
          } else if (parentTab === 'settings') {
            const hash = window.location.hash;
            const match = hash.match(/[?&]view=([^&]+)/);
            const currentSubtab = match ? match[1].toLowerCase() : 'view';
            active = current === 'settings' && currentSubtab === subtab;
          }
        } else {
          active = current === item.key;
        }

        // Check if any dropdown item is active
        const hasActiveChild = item.hasDropdown && item.dropdownItems?.some(childKey => {
          if (childKey.startsWith('stats:')) {
            const subtab = childKey.split(':')[1];
            return current === 'stats' && checkSubtab() === subtab;
          }
          if (childKey.startsWith('settings:')) {
            const subtab = childKey.split(':')[1];
            const hash = window.location.hash;
            const match = hash.match(/[?&]view=([^&]+)/);
            const currentSubtab = match ? match[1].toLowerCase() : 'view';
            return current === 'settings' && currentSubtab === subtab;
          }
          return false;
        });

        const isActive = active || hasActiveChild;

        if (item.hasDropdown) {
          return (
            <div
              key={item.key}
              ref={(el) => { dropdownRefs.current[item.key] = el; }}
              style={{ flex: 1, position: 'relative' }}
            >
              <button
                onClick={() => {
                  if (openDropdown === item.key) {
                    setOpenDropdown(null);
                  } else {
                    setOpenDropdown(item.key);
                  }
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.30)',
                  padding: '10px 6px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  filter: isActive ? 'none' : 'grayscale(100%)',
                  opacity: isActive ? 1 : 0.4,
                  transition: 'all 0.2s ease'
                }}
                title={item.label}
              >
                <div style={{fontSize: 18, lineHeight: '18px'}}>{item.icon}</div>
                <div style={{fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase'}}>
                  {item.displayLabel || item.label}
                </div>
              </button>

              {openDropdown === item.key && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 8,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '8px',
                    minWidth: 160,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 1000
                  }}
                >
                  {(item.dropdownItems || []).map((childKey) => {
                    const childItem = items.find(i => i.key === childKey);
                    if (!childItem) return null;

                    let childActive = false;
                    if (childKey.startsWith('stats:')) {
                      const subtab = childKey.split(':')[1];
                      childActive = current === 'stats' && checkSubtab() === subtab;
                    } else if (childKey.startsWith('settings:')) {
                      const subtab = childKey.split(':')[1];
                      const hash = window.location.hash;
                      const match = hash.match(/[?&]view=([^&]+)/);
                      const currentSubtab = match ? match[1].toLowerCase() : 'view';
                      childActive = current === 'settings' && currentSubtab === subtab;
                    }

                    return (
                      <button
                        key={childKey}
                        onClick={() => {
                          set(childKey);
                          setOpenDropdown(null);
                        }}
                        style={{
                          width: '100%',
                          background: childActive ? 'var(--primary)' : 'transparent',
                          border: 'none',
                          color: 'white',
                          padding: '10px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          marginBottom: 4
                        }}
                        onMouseEnter={(e) => {
                          if (!childActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          if (!childActive) e.currentTarget.style.background = 'transparent';
                        }}
                        title={childItem.label}
                      >
                        <span style={{ fontSize: 16 }}>{childItem.icon}</span>
                        <span>{childItem.displayLabel || childItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.key}
            onClick={() => {
              // Explicitly no sounds on tab changes
              set(item.key);
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: isActive ? 'white' : 'rgba(255,255,255,0.30)',
              padding: '10px 6px',
              borderRadius: 20,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              filter: isActive ? 'none' : 'grayscale(100%)',
              opacity: isActive ? 1 : 0.4,
              transition: 'all 0.2s ease'
            }}
            title={item.label}
          >
            <div style={{fontSize: 18, lineHeight: '18px'}}>{item.icon}</div>
            <div style={{fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase'}}>
              {item.displayLabel || item.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

window.NavBar = NavBar;
console.log('✅ 10-core-navbar.jsx loaded');
