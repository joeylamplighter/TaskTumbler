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
  // Data props
  currentTab = 'spin',
  timerState = { isRunning: false, storedTime: 0 },
  focusModeActive = false,
  remindersArmed = false,
  // Actions
  onTabChange,
  onSearchClick,
  onStatusClick,
}) {
  const [isRotated, setIsRotated] = React.useState(false);

  const handleBrandClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    // Trigger rotation animation
    setIsRotated(r => !r);
    
    if (typeof onBrandClick === 'function') onBrandClick();
  };

  // Quick nav icons mapping
  const quickNavIcons = {
    'spin': '🎰',
    'tasks': '📋',
    'timer': '⏱',
    'stats': '📊',
    'settings': '⚙',
    'search': '🔍',
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

  // Render right side based on mode
  const renderRightSide = () => {
    if (headerRightMode === 'none') {
      return null;
    }
    
    if (headerRightMode === 'quickNav') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {headerQuickNavItems.slice(0, 3).map((item) => {
            const isActive = item === currentTab;
            const icon = quickNavIcons[item] || '•';
            
            return (
              <button
                key={item}
                onClick={() => {
                  if (item === 'search') {
                    onSearchClick?.();
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
            transform: isRotated ? 'rotate(90deg)' : 'rotate(0deg)'
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
