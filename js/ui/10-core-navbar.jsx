// js/components/10-core-navbar.jsx
// ===========================================
// BOTTOM DOCK NAVBAR (slides down when hidden)
// Updated: 2025-12-18 - More washed out unselected icons
// ===========================================

function NavBar({ current, set, items, hidden, dockHidden, getCurrentSubtab }) {
  const [openDropdown, setOpenDropdown] = React.useState(null);
  const dropdownRefs = React.useRef({});
  const [visibleItemCount, setVisibleItemCount] = React.useState(10); // Start with all visible
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const navbarRef = React.useRef(null);

  // Hide completely if no items
  if (!items || items.length === 0) {
    return null;
  }

  const isHidden = !!hidden || !!dockHidden;

  // Filter items to only show non-groupLabel items
  const visibleItems = (items || []).filter(item => !item.groupLabel);
  const totalItems = visibleItems.length;

  // Calculate how many items can fit based on available width
  // Estimate: ~70px per item (icon + label + padding), hamburger button ~80px
  React.useEffect(() => {
    const calculateVisibleCount = () => {
      if (!navbarRef.current) return;
      
      const navbarWidth = navbarRef.current.offsetWidth;
      const padding = 16; // 8px on each side
      const hamburgerButtonWidth = 80; // Space reserved for hamburger button when needed
      
      // Estimate each item needs ~70px
      const itemWidth = 70;
      
      // First, calculate how many items fit without hamburger button
      const availableWidthWithoutHamburger = navbarWidth - padding;
      const maxItemsWithoutHamburger = Math.floor(availableWidthWithoutHamburger / itemWidth);
      
      // If all items fit, show them all
      if (maxItemsWithoutHamburger >= totalItems) {
        setVisibleItemCount(totalItems);
        return;
      }
      
      // Otherwise, reserve space for hamburger and calculate remaining space
      const availableWidthWithHamburger = navbarWidth - padding - hamburgerButtonWidth;
      const maxItemsWithHamburger = Math.floor(availableWidthWithHamburger / itemWidth);
      
      // Ensure at least 1 item visible
      const count = Math.max(1, Math.min(maxItemsWithHamburger, totalItems));
      setVisibleItemCount(count);
    };
    
    // Initial calculation
    const timeoutId = setTimeout(calculateVisibleCount, 100);
    
    // Recalculate on resize
    window.addEventListener('resize', calculateVisibleCount);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateVisibleCount);
    };
  }, [totalItems]);

  // Items to show in navbar vs hamburger menu
  const itemsInNavbar = visibleItems.slice(0, visibleItemCount);
  const itemsInMenu = visibleItems.slice(visibleItemCount);
  const hasOverflow = itemsInMenu.length > 0;

  // Get NavBar appearance settings with real-time updates
  const [settings, setSettings] = React.useState(() => {
    try {
      // Try DataManager first, then localStorage
      if (window.DataManager?.settings?.get) {
        return window.DataManager.settings.get() || {};
      }
      const saved = localStorage.getItem('settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Listen for settings changes
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'settings') {
        try {
          const newSettings = e.newValue ? JSON.parse(e.newValue) : {};
          setSettings(newSettings);
        } catch {}
      }
    };
    
    // Also listen to custom settings-updated event
    const handleSettingsUpdate = () => {
      try {
        // Try DataManager first, then localStorage
        if (window.DataManager?.settings?.get) {
          const newSettings = window.DataManager.settings.get();
          if (newSettings) setSettings(newSettings);
        } else {
          const saved = localStorage.getItem('settings');
          if (saved) {
            setSettings(JSON.parse(saved));
          }
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settings-updated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);
  
  // NavBar appearance settings with defaults
  const dockOpacity = settings?.navBarDockOpacity !== undefined ? settings.navBarDockOpacity : 0.55;
  const inactiveOpacity = settings?.navBarInactiveOpacity !== undefined ? settings.navBarInactiveOpacity : 0.4;
  const grayscaleAmount = settings?.navBarGrayscaleAmount !== undefined ? settings.navBarGrayscaleAmount : 100;
  const themeColor = settings?.navBarThemeColor || null; // null means use CSS variable

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
      // Close hamburger menu when clicking outside
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown, isMenuOpen]);

const style = {
  position: 'fixed',
  left: '50%',
  bottom: 'max(10px, env(safe-area-inset-bottom))',
  transform: isHidden ? 'translate(-50%, 140%)' : 'translate(-50%, 0%)',
  opacity: isHidden ? 0 : 1,
  visibility: isHidden ? 'hidden' : 'visible',
  transition: 'transform 300ms cubic-bezier(0.25, 0.9, 0.3, 1), opacity 200ms ease-out, visibility 0s linear 300ms',
  willChange: 'transform, opacity',
  zIndex: isHidden ? -1 : 999,
  width: 'min(520px, 94vw)',
  padding: 8,

  // almost square
  borderRadius: 3,

  // more opaque to reduce color bleed - use setting if available
  background: `rgba(0,0,0,${dockOpacity})`,
  backdropFilter: 'blur(16px) saturate(100%)',
  WebkitBackdropFilter: 'blur(16px) saturate(100%)',

  // very subtle edge definition - use theme color if set
  border: themeColor ? `1px solid ${themeColor}33` : '1px solid rgba(255,255,255,0.08)',

  // lighter shadow so it doesn't look like a slab
  boxShadow:
    '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',

  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  pointerEvents: isHidden ? 'none' : 'auto',
};

  // Helper function to calculate active state for an item
  const getItemActiveState = (item) => {
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
      } else if (parentTab === 'crm') {
        active = current === subtab;
      } else if (parentTab === 'contacts') {
        active = current === `contacts:${subtab}`;
      }
    } else {
      active = current === item.key;
    }

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
      if (childKey.startsWith('crm:')) {
        const subtab = childKey.split(':')[1];
        return current === subtab;
      }
      if (childKey.startsWith('contacts:')) {
        return current === childKey;
      }
      return false;
    });

    return active || hasActiveChild;
  };

  return (
    <div style={style} ref={(el) => { navbarRef.current = el; menuRef.current = el; }}>
      {/* Regular navbar items that fit */}
      {itemsInNavbar.map((item) => {
        const isActive = getItemActiveState(item);
        
        if (item.hasDropdown) {
          return (
            <div
              key={item.key}
              ref={(el) => { dropdownRefs.current[item.key] = el; }}
              style={{ flex: 1, position: 'relative' }}
            >
              <button
                onClick={() => {
                  if (item.key === 'settings' && current !== 'settings') {
                    set('settings');
                  } else if (item.key === 'stats' && current !== 'stats') {
                    set('stats');
                  } else if (item.key === 'crm') {
                    if (current !== 'people') {
                      set('crm:people');
                    }
                  }
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
                  color: isActive ? (themeColor || 'white') : 'rgba(255,255,255,0.30)',
                  padding: '10px 6px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  filter: isActive ? 'none' : `grayscale(${grayscaleAmount}%)`,
                  opacity: isActive ? 1 : inactiveOpacity,
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
                    } else if (childKey.startsWith('crm:')) {
                      const subtab = childKey.split(':')[1];
                      childActive = current === subtab;
                    } else if (childKey.startsWith('contacts:')) {
                      childActive = current === childKey;
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
                          background: childActive ? (themeColor || 'var(--primary)') : 'transparent',
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
              set(item.key);
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: isActive ? (themeColor || 'white') : 'rgba(255,255,255,0.30)',
              padding: '10px 6px',
              borderRadius: 20,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              filter: isActive ? 'none' : `grayscale(${grayscaleAmount}%)`,
              opacity: isActive ? 1 : inactiveOpacity,
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

      {/* Hamburger menu button for overflow items */}
      {hasOverflow && (
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'white',
              padding: '10px 6px',
              borderRadius: 20,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease'
            }}
            title="More menu items"
          >
            <div style={{fontSize: 18, lineHeight: '18px'}}>
              {isMenuOpen ? '✕' : '☰'}
            </div>
            <div style={{fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase'}}>
              Menu
            </div>
          </button>

          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 8,
                background: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '8px',
                minWidth: 200,
                maxWidth: '90vw',
                maxHeight: '70vh',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 1000
              }}
            >
              {itemsInMenu.map((item) => {
                const isActive = getItemActiveState(item);

                if (item.hasDropdown) {
                  return (
                    <div key={item.key}>
                      <button
                        onClick={() => {
                          if (item.key === 'settings' && current !== 'settings') {
                            set('settings');
                          } else if (item.key === 'stats' && current !== 'stats') {
                            set('stats');
                          } else if (item.key === 'crm') {
                            if (current !== 'people') {
                              set('crm:people');
                            }
                          }
                          setIsMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          background: isActive ? (themeColor || 'var(--primary)') : 'transparent',
                          border: 'none',
                          color: 'white',
                          padding: '12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: 14,
                          fontWeight: 600,
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          marginBottom: 4
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                        title={item.label}
                      >
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <span>{item.displayLabel || item.label}</span>
                      </button>
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
                        } else if (childKey.startsWith('crm:')) {
                          const subtab = childKey.split(':')[1];
                          childActive = current === subtab;
                        } else if (childKey.startsWith('contacts:')) {
                          childActive = current === childKey;
                        }

                        return (
                          <button
                            key={childKey}
                            onClick={() => {
                              set(childKey);
                              setIsMenuOpen(false);
                            }}
                            style={{
                              width: '100%',
                              background: childActive ? (themeColor || 'var(--primary)') : 'transparent',
                              border: 'none',
                              color: 'white',
                              padding: '10px 12px 10px 40px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              fontSize: 13,
                              fontWeight: 500,
                              textAlign: 'left',
                              transition: 'all 0.2s ease',
                              marginBottom: 2
                            }}
                            onMouseEnter={(e) => {
                              if (!childActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
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
                  );
                }

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      set(item.key);
                      setIsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: isActive ? (themeColor || 'var(--primary)') : 'transparent',
                      border: 'none',
                      color: 'white',
                      padding: '12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      marginBottom: 4
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                    title={item.label}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.displayLabel || item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.NavBar = NavBar;
console.log('✅ 10-core-navbar.jsx loaded');
