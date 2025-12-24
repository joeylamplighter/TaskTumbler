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
  people = [], // People/contacts for search
  // Actions
  onTabChange,
  onSearchClick,
  onStatusClick,
  // Reset actions
  onReset,
  onLoadSamples,
  // Additional actions
  onExport,
  onImport,
  onClearCompleted,
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
    'places': '📍',
    'duel': '⚔️',
    'settings': '⚙',
    'search': '🔍',
    'sync': '☁️',
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

  // Get filtered contacts based on search query
  const filteredContacts = React.useMemo(() => {
    if (!Array.isArray(people) || people.length === 0) return [];
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return people.filter(person => {
      const name = (person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || '').toLowerCase();
      const email = (person.email || '').toLowerCase();
      const phone = (person.phone || '').toLowerCase();
      const company = (person.company || '').toLowerCase();
      const tags = Array.isArray(person.tags) ? person.tags.join(' ').toLowerCase() : '';
      
      return name.includes(query) || 
             email.includes(query) || 
             phone.includes(query) || 
             company.includes(query) ||
             tags.includes(query);
    }).slice(0, 10); // Limit to 10 results
  }, [people, searchQuery]);

  // Get all nav items sorted alphabetically for dropdown, filtered by search
  // All items are now independent tabs (no parent/child relationships)
  const sortedNavItems = React.useMemo(() => {
    if (!Array.isArray(allNavItems) || allNavItems.length === 0) {
      console.warn('AppHeader: allNavItems is empty or not an array', allNavItems);
      return [];
    }

    let items = [...allNavItems];

    // Filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const label = (item.displayLabel || item.label || '').toLowerCase();
        const key = item.key.toLowerCase();
        const group = (item.groupLabel || '').toLowerCase();
        return label.includes(query) || key.includes(query) || group.includes(query);
      });
    }

    // Sort: Group by groupLabel, then alphabetically
    return items.sort((a, b) => {
      const groupA = a.groupLabel || '';
      const groupB = b.groupLabel || '';

      // If both have same group, sort by label
      if (groupA === groupB) {
        const labelA = (a.displayLabel || a.label || '').toLowerCase();
        const labelB = (b.displayLabel || b.label || '').toLowerCase();
        return labelA.localeCompare(labelB);
      }

      // Items without groups come first, then alphabetically by group
      if (!groupA) return -1;
      if (!groupB) return 1;
      return groupA.localeCompare(groupB);
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
      } else if (parentTab === 'crm') {
        // CRM dropdown items map to existing tabs
        if (subtab === 'people') {
          onTabChange?.('people');
        } else if (subtab === 'places') {
          onTabChange?.('places');
        }
      }
    } else {
      onTabChange?.(item.key);
    }
  };

  // Handle contact click - open contact modal
  const handleContactClick = (person) => {
    setDropdownOpen(false);
    setSearchQuery('');
    
    // Dispatch event to open contact modal (app component will handle it)
    window.dispatchEvent(new CustomEvent('open-contact', { detail: { person } }));
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

  // Render hamburger menu button (always shown)
  const renderHamburgerMenu = () => {
    return (
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
          style={{
            background: dropdownOpen ? 'var(--primary-light)' : 'transparent',
            border: '1px solid var(--border)',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            opacity: dropdownOpen ? 1 : 0.8,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '36px',
            minHeight: '36px',
            color: 'var(--text)',
          }}
          title="All navigation - Click to see all tabs"
          aria-label="Show all navigation"
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            width: '18px'
          }}>
            <div style={{
              width: '100%',
              height: '2px',
              background: 'currentColor',
              borderRadius: '1px'
            }}></div>
            <div style={{
              width: '100%',
              height: '2px',
              background: 'currentColor',
              borderRadius: '1px'
            }}></div>
            <div style={{
              width: '100%',
              height: '2px',
              background: 'currentColor',
              borderRadius: '1px'
            }}></div>
          </div>
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '280px',
              maxHeight: '500px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--border-radius-md, 12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 1000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                placeholder="Search tabs and contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--border-radius-sm, 8px)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Contact results (shown first if search query exists) */}
            {searchQuery.trim() && filteredContacts.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <div style={{
                  padding: '8px 12px 4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-light)',
                  opacity: 0.7,
                  letterSpacing: 0.8,
                }}>
                  Contacts
                </div>
                {filteredContacts.map((person) => {
                  const personName = person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unnamed';
                  const personEmail = person.email || '';
                  const personPhone = person.phone || '';
                  
                  return (
                    <button
                      key={person.id || personName}
                      onClick={() => handleContactClick(person)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        textAlign: 'left',
                        color: 'var(--text)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--input-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title={`View ${personName}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span style={{ fontSize: '16px' }}>👤</span>
                        <span style={{ fontWeight: 600, flex: 1 }}>{personName}</span>
                      </div>
                      {(personEmail || personPhone) && (
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', paddingLeft: '24px', opacity: 0.8 }}>
                          {personEmail && <span>{personEmail}</span>}
                          {personEmail && personPhone && <span> • </span>}
                          {personPhone && <span>{personPhone}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation items */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {sortedNavItems.length > 0 ? (
                (() => {
                  let lastGroup = null;
                  // Filter out parent dropdown menus (crm, settings, stats) - they're just organizational headers
                  const clickableItems = sortedNavItems.filter(item => {
                    // Exclude parent dropdown items (crm, settings, stats with hasDropdown)
                    // Their children (with groupLabel) will still be shown
                    if (item.hasDropdown && (item.key === 'crm' || item.key === 'settings' || item.key === 'stats')) {
                      return false;
                    }
                    return true;
                  });
                  
                  return clickableItems.map((item, index) => {
                    const isActive = item.key.includes(':')
                      ? (item.key.startsWith('stats:') && currentTab === 'stats' && getCurrentSubtab() === item.key.split(':')[1])
                      || (item.key.startsWith('settings:') && currentTab === 'settings')
                      || (item.key.startsWith('crm:') && currentTab === item.key.split(':')[1])
                      : item.key === currentTab;

                    const showGroupHeader = item.groupLabel && item.groupLabel !== lastGroup;
                    if (item.groupLabel) lastGroup = item.groupLabel;

                    return (
                      <React.Fragment key={item.key}>
                        {showGroupHeader && (
                          <div style={{
                            padding: '8px 12px 4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--text-light)',
                            opacity: 0.7,
                            letterSpacing: 0.8,
                            marginTop: index > 0 ? '8px' : 0
                          }}>
                            {item.groupLabel}
                          </div>
                        )}
                        <button
                          onClick={() => handleNavClick(item)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            paddingLeft: item.groupLabel ? '20px' : '12px',
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
                      </React.Fragment>
                    );
                  });
                })()
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px' }}>
                  No items found
                </div>
              )}
            </div>

            {/* Actions section */}
            {(onLoadSamples || onReset || onExport || onImport || onClearCompleted) && (
              <>
                <div style={{
                  height: '1px',
                  background: 'var(--border)',
                  margin: '8px 0'
                }} />
                <div style={{ padding: '4px 0' }}>
                  {/* Data Management - Only show when searched */}
                  {(onExport || onImport || onClearCompleted) && searchQuery.trim() && (
                    <>
                      {onExport && 'export'.includes(searchQuery.toLowerCase()) && (
                        <button
                          onClick={() => {
                            onExport();
                            setDropdownOpen(false);
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
                            color: 'var(--text)',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--input-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>📥</span>
                          <span>Export Data</span>
                        </button>
                      )}
                      {onImport && 'import'.includes(searchQuery.toLowerCase()) && (
                        <label
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
                            color: 'var(--text)',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--input-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>📤</span>
                          <span>Import Data</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                onImport(e);
                                setDropdownOpen(false);
                              }
                              e.target.value = ''; // Reset input
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                      {onClearCompleted && ('clear'.includes(searchQuery.toLowerCase()) || 'completed'.includes(searchQuery.toLowerCase())) && (
                        <button
                          onClick={() => {
                            onClearCompleted();
                            setDropdownOpen(false);
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
                            color: 'var(--text)',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--input-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>🧹</span>
                          <span>Clear Completed Tasks</span>
                        </button>
                      )}
                    </>
                  )}

                  {onLoadSamples && searchQuery.trim() && ('load'.includes(searchQuery.toLowerCase()) || 'sample'.includes(searchQuery.toLowerCase())) && (
                    <button
                      onClick={() => {
                        onLoadSamples();
                        setDropdownOpen(false);
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
                        color: 'var(--text)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--input-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>🎲</span>
                      <span>Load Sample Data</span>
                    </button>
                  )}
                  {onReset && searchQuery.trim() && 'reset'.includes(searchQuery.toLowerCase()) && (
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

                  {/* Stats Section - Always visible at bottom */}
                  {userStats && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '12px',
                        marginTop: '8px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                        padding: '0 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}>
                        <span style={{ color: 'var(--text)', opacity: 0.7 }}>Level {userStats.level || 1}</span>
                        <span style={{ color: 'var(--primary)' }}>{userStats.xp || 0} XP</span>
                      </div>
                      {/* Progress Bar */}
                      <div style={{
                        width: 'calc(100% - 24px)',
                        margin: '0 12px',
                        height: '6px',
                        background: 'var(--input-bg)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                          borderRadius: '3px',
                          width: `${(() => {
                            const level = userStats.level || 1;
                            const xp = userStats.xp || 0;
                            const xpForLevel = level * 100;
                            const xpForNextLevel = (level + 1) * 100;
                            const currentLevelXp = xp - xpForLevel;
                            const xpNeeded = xpForNextLevel - xpForLevel;
                            return Math.min(100, Math.max(0, (currentLevelXp / xpNeeded) * 100));
                          })()}%`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render right side based on mode
  const renderRightSide = () => {
    if (headerRightMode === 'none') {
      return renderHamburgerMenu();
    }

    if (headerRightMode === 'quickNav') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
          {headerQuickNavItems.slice(0, 3).map((item) => {
            const isActive = item === currentTab;
            const icon = quickNavIcons[item] || '•';
            
            return (
              <button
                key={item}
                onClick={() => {
                  if (item === 'search') {
                    onSearchClick?.();
                  } else if (item === 'sync') {
                    onSyncClick?.();
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
                title={item === 'search' ? 'Search (Cmd/Ctrl+K)' : item === 'sync' ? 'Cloud Sync' : `Go to ${item}`}
                aria-label={item === 'search' ? 'Search' : item === 'sync' ? 'Cloud Sync' : `Go to ${item}`}
              >
                {icon}
              </button>
            );
          })}

          {/* Hamburger menu */}
          {renderHamburgerMenu()}
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
          {renderHamburgerMenu()}
        </div>
      );
    }

    if (headerRightMode === 'status') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          {renderHamburgerMenu()}
        </div>
      );
    }

    if (headerRightMode === 'syncButton') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {window.SyncButton && onSyncClick && (
            <window.SyncButton 
              user={user}
              syncState={syncState}
              onOpenModal={onSyncClick}
            />
          )}
          {renderHamburgerMenu()}
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

      {/* Center/Right: Standalone Sync Button (default) + Right side content */}
      <div style={{ 
        minWidth: headerRightMode === 'none' ? '0' : '120px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Standalone Sync Button - Visible by default, hidden when mode is "syncButton" */}
        {window.SyncButton && onSyncClick && headerRightMode !== 'syncButton' && (
          <window.SyncButton 
            user={user}
            syncState={syncState}
            onOpenModal={onSyncClick}
          />
        )}
        {renderRightSide()}
      </div>
    </div>
  );
}

window.AppHeader = AppHeader;
console.log('✅ 10-core-header.jsx loaded');
