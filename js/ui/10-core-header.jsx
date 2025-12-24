// js/components/10-core-header.jsx
// ===========================================
// CORE HEADER (Brand click toggles Dock)
// Updated: 2025-12-21 - Header Right Mode system
// ===========================================

function AppHeader({ 
  userStats, 
  user, 
  syncState, 
  onSyncClick, 
  onBrandClick, 
  dockVisible,
  // New props for header right mode
  headerRightMode = 'none',
  headerQuickNavItems = [],
  headerXpShowValue = true,
  headerXpShowLevel = true,
  headerXpShowProgress = false,
  headerStatusItems = [],
  headerStatusClickable = false,
  headerShowAllNavDropdown = true, // New: Show 4th dropdown option
  allNavItems = [], // All navigation items for dropdown
  // Data props
  currentTab = 'spin',
  timerState = { isRunning: false, storedTime: 0 },
  focusModeActive = false,
  remindersArmed = false,
  // Actions
  onTabChange,
  onSearchClick,
  onStatusClick,
  // Dev/Reset actions
  showDevTools = false,
  onToggleDevTools,
  onReset,
}) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleBrandClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (typeof onBrandClick === 'function') onBrandClick();
  };

  // Quick nav icons mapping
  const quickNavIcons = {
    'spin': '🎰',
    'tasks': '📋',
    'timer': '⏱',
    'lists': '💡',
    'goals': '🎯',
    'stats': '📊',
    'people': '👥',
    'duel': '⚔️',
    'settings': '⚙',
    'search': '🔍',
  };
  
  // Helper to check if we're on a stats subtab
  const getCurrentSubtab = () => {
    const hash = window.location.hash;
    if (hash.includes('subView=people')) return 'people';
    if (hash.includes('subView=charts')) return 'charts';
    if (hash.includes('subView=history')) return 'history';
    if (hash.includes('subView=places')) return 'places';
    if (hash.includes('subView=overview')) return 'overview';
    return null;
  };

  // Status computation
  const statusData = React.useMemo(() => {
    const statuses = [];
    
    if (headerStatusItems.includes('timer') && timerState?.isRunning) {
      const elapsed = timerState.storedTime + (timerState.startTime ? Date.now() - timerState.startTime : 0);
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      statuses.push({
        id: 'timer',
        icon: '⏱',
        label: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        tooltip: 'Timer running',
        onClick: headerStatusClickable ? () => onStatusClick?.('timer') : null,
      });
    }
    
    if (headerStatusItems.includes('sync')) {
      let syncIcon = '☁';
      let syncLabel = '';
      let syncTooltip = 'Sync';
      
      if (syncState === 'syncing') {
        syncIcon = '☁';
        syncLabel = '⋯';
        syncTooltip = 'Syncing...';
      } else if (syncState === 'synced' && user) {
        syncIcon = '☁';
        syncLabel = '✓';
        syncTooltip = 'Synced';
      } else if (syncState === 'error') {
        syncIcon = '☁';
        syncLabel = '!';
        syncTooltip = 'Sync error';
      } else {
        syncIcon = '☁';
        syncLabel = '○';
        syncTooltip = 'Offline';
      }
      
      statuses.push({
        id: 'sync',
        icon: syncIcon,
        label: syncLabel,
        tooltip: syncTooltip,
        onClick: headerStatusClickable ? () => onStatusClick?.('sync') : null,
      });
    }
    
    if (headerStatusItems.includes('focus') && focusModeActive) {
      statuses.push({
        id: 'focus',
        icon: '⚡',
        label: '',
        tooltip: 'Focus mode active',
        onClick: headerStatusClickable ? () => onStatusClick?.('focus') : null,
      });
    }
    
    if (headerStatusItems.includes('reminders') && remindersArmed) {
      statuses.push({
        id: 'reminders',
        icon: '🔔',
        label: '',
        tooltip: 'Reminders armed',
        onClick: headerStatusClickable ? () => onStatusClick?.('reminders') : null,
      });
    }
    
    return statuses;
  }, [headerStatusItems, timerState, syncState, user, focusModeActive, remindersArmed, headerStatusClickable, onStatusClick]);

  // XP/Level display computation
  const xpDisplay = React.useMemo(() => {
    const xp = userStats?.xp || 0;
    const level = userStats?.level || 1;
    
    // Calculate progress to next level
    const LEVELING_CONFIG = window.LEVELING_CONFIG || {
      baseXpPerLevel: 100,
      levelMultiplier: 50,
      getXpForLevel: (lvl) => 100 + lvl * 50,
      getTotalXpForLevel: (lvl) => {
        let total = 0;
        for (let i = 1; i <= lvl; i++) {
          total += 100 + i * 50;
        }
        return total;
      }
    };
    
    const currentLevelXp = LEVELING_CONFIG.getTotalXpForLevel(level - 1);
    const nextLevelXp = LEVELING_CONFIG.getTotalXpForLevel(level);
    const currentLevelProgress = xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPercent = Math.min(100, Math.max(0, (currentLevelProgress / xpNeeded) * 100));
    
    return {
      xp,
      level,
      progressPercent,
      xpNeeded,
      currentLevelProgress,
    };
  }, [userStats]);

  // Get all nav items sorted alphabetically for dropdown, filtered by search
  // Exclude parent tabs that have subtabs (like "Settings" and "Data/Stats")
  // Only show: main tabs with no subtabs + all subtabs (but not their parent tabs)
  const sortedNavItems = React.useMemo(() => {
    if (!Array.isArray(allNavItems) || allNavItems.length === 0) {
      console.warn('AppHeader: allNavItems is empty or not an array', allNavItems);
      return [];
    }
    
    // Find parent tabs that have subtabs
    const parentTabsWithSubtabs = new Set();
    allNavItems.forEach(item => {
      if (item.isSubtab && item.parentTab) {
        parentTabsWithSubtabs.add(item.parentTab);
      }
    });
    
    // Filter: exclude parent tabs that have subtabs, but include all subtabs and main tabs without subtabs
    let items = allNavItems.filter(item => {
      // If it's a subtab, include it
      if (item.isSubtab) return true;
      // If it's a main tab but has subtabs, exclude it
      if (parentTabsWithSubtabs.has(item.key)) return false;
      // Otherwise include it (main tab with no subtabs)
      return true;
    });
    
    // Filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const label = (item.displayLabel || item.label || '').toLowerCase();
        const key = item.key.toLowerCase();
        return label.includes(query) || key.includes(query);
      });
    }
    
    // Sort alphabetically
    return items.sort((a, b) => {
      const labelA = (a.displayLabel || a.label || '').toLowerCase();
      const labelB = (b.displayLabel || b.label || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [allNavItems, searchQuery]);

  // Handle navigation from dropdown
  const handleNavClick = (item) => {
    setDropdownOpen(false);
    setSearchQuery(''); // Clear search when navigating
    if (item.key.includes(':')) {
      const [parentTab, subtab] = item.key.split(':');
      if (parentTab === 'stats') {
        onTabChange?.('stats');
        window.location.hash = `#stats?subView=${subtab}`;
        window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
      } else if (parentTab === 'settings') {
        onTabChange?.('settings');
        window.location.hash = `#settings?view=${subtab}`;
        window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'settings' } }));
      }
    } else if (item.key === 'people') {
      onTabChange?.('stats');
      window.location.hash = '#stats?subView=people';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
    } else {
      onTabChange?.(item.key);
    }
  };

  // Close dropdown when clicking outside
  const dropdownRef = React.useRef(null);
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Render right side based on mode
  const renderRightSide = () => {
    if (headerRightMode === 'none') {
      return null;
    }
    
    if (headerRightMode === 'quickNav') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
          {headerQuickNavItems.slice(0, 3).map((item) => {
            // Special handling for people - it's a subtab of stats
            const isPeople = item === 'people';
            const isActive = isPeople 
              ? (currentTab === 'stats' && getCurrentSubtab() === 'people')
              : item === currentTab;
            const icon = quickNavIcons[item] || '•';
            
            return (
              <button
                key={item}
                onClick={() => {
                  if (item === 'search') {
                    onSearchClick?.();
                  } else if (item === 'people') {
                    // Navigate to stats tab with people subtab
                    onTabChange?.('stats');
                    window.location.hash = '#stats?subView=people';
                    window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                  } else {
                    onTabChange?.(item);
                  }
                }}
                style={{
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '20px',
                  lineHeight: '1',
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.7,
                  transition: 'all 0.2s ease',
                }}
                title={item === 'search' ? 'Search (Cmd/Ctrl+K)' : `Go to ${item}`}
                aria-label={item === 'search' ? 'Search' : `Go to ${item}`}
              >
                {icon}
              </button>
            );
          })}
          
          {/* 4th option: Dropdown with all settings - ALWAYS SHOW */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
              style={{
                background: dropdownOpen ? 'var(--primary-light)' : 'transparent',
                border: '1px solid var(--border)',
                padding: '6px 8px',
                borderRadius: '8px',
                fontSize: '18px',
                lineHeight: '1',
                cursor: 'pointer',
                opacity: dropdownOpen ? 1 : 0.8,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                minHeight: '32px',
                color: 'var(--text)',
              }}
              title="All navigation (alphabetical) - Click to see all tabs"
              aria-label="Show all navigation"
            >
              ⋯
            </button>
              
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '200px',
                    maxWidth: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    zIndex: 1000,
                    padding: '4px 0',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Search box */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search navigation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                  </div>
                  
                  {/* Navigation items */}
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {sortedNavItems.length > 0 ? (
                      sortedNavItems.map((item) => {
                        const isActive = item.key.includes(':')
                          ? (item.key.startsWith('stats:') && currentTab === 'stats' && getCurrentSubtab() === item.key.split(':')[1])
                          || (item.key.startsWith('settings:') && currentTab === 'settings')
                          : item.key === currentTab || (item.key === 'people' && currentTab === 'stats' && getCurrentSubtab() === 'people');
                        
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleNavClick(item)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: isActive ? 'var(--primary-light)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              textAlign: 'left',
                              color: 'var(--text)',
                              transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'var(--input-bg)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'transparent';
                            }}
                            title={item.label}
                          >
                            <span style={{ fontSize: '16px' }}>{item.icon}</span>
                            <span>{item.displayLabel || item.label}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px' }}>
                        No items found
                      </div>
                    )}
                  </div>
                  
                  {/* Actions section - Dev Mode, Reset, etc. */}
                  {(onToggleDevTools || onReset) && (
                    <>
                      <div style={{ 
                        height: '1px', 
                        background: 'var(--border)', 
                        margin: '8px 0' 
                      }} />
                      <div style={{ padding: '4px 0' }}>
                        {onToggleDevTools && (
                          <button
                            onClick={() => {
                              onToggleDevTools();
                              setDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: showDevTools ? 'var(--primary-light)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              textAlign: 'left',
                              color: 'var(--text)',
                              transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!showDevTools) e.currentTarget.style.background = 'var(--input-bg)';
                            }}
                            onMouseLeave={(e) => {
                              if (!showDevTools) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>🛠️</span>
                            <span>Dev Mode</span>
                            {showDevTools && <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>ON</span>}
                          </button>
                        )}
                        {onReset && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                                onReset();
                                setDropdownOpen(false);
                              }
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              textAlign: 'left',
                              color: 'var(--text-danger, #ff4444)',
                              transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--input-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>🗑️</span>
                            <span>Reset All Data</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    if (headerRightMode === 'xp') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          {headerXpShowProgress && (
            <div style={{ 
              width: '60px', 
              height: '4px', 
              background: 'var(--input-bg)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${xpDisplay.progressPercent}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
          {headerXpShowLevel && (
            <span style={{ color: 'var(--text-light)' }}>Lv {xpDisplay.level}</span>
          )}
          {headerXpShowValue && (
            <span style={{ color: 'var(--text)', marginLeft: headerXpShowLevel ? '4px' : 0 }}>
              {xpDisplay.xp.toLocaleString()} XP
            </span>
          )}
        </div>
      );
    }
    
    if (headerRightMode === 'status') {
      if (statusData.length === 0) return null;
      
      return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {statusData.slice(0, 3).map((status) => (
            <div
              key={status.id}
              onClick={status.onClick || undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: status.onClick ? 'pointer' : 'default',
                opacity: 0.8,
                transition: 'opacity 0.2s ease',
              }}
              title={status.tooltip}
              aria-label={status.tooltip}
              onMouseEnter={(e) => {
                if (status.onClick) e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (status.onClick) e.currentTarget.style.opacity = '0.8';
              }}
            >
              <span>{status.icon}</span>
              {status.label && <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>{status.label}</span>}
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div style={{
      padding: '10px 12px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)',
      background: 'var(--card)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '12px',
    }}>
      {/* Left: Brand/Logo */}
      <a
        href="#spin"
        onClick={handleBrandClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none',
          color: 'var(--text)',
          userSelect: 'none'
        }}
        title="Toggle dock"
        aria-label="Toggle navigation dock"
      >
        {/* Flat 2D slot machine - no button background */}
        <span 
          style={{
            fontSize: 32,
            lineHeight: 1,
            display: 'inline-block',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: dockVisible ? 'rotate(0deg)' : 'rotate(90deg)'
          }}
        >
          🎰
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <div style={{ fontFamily: 'Fredoka', fontSize: 18, fontWeight: 900 }}>TaskTumbler</div>
          <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, marginTop: 2 }}>
            Tap to {dockVisible ? 'hide' : 'show'} dock
          </div>
        </div>
      </a>

      {/* Right: Reserved space to prevent layout shift */}
      <div style={{ 
        minWidth: headerRightMode === 'none' ? '0' : '120px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        {renderRightSide()}
      </div>
    </div>
  );
}

window.AppHeader = AppHeader;
console.log('✅ 10-core-header.jsx loaded');
