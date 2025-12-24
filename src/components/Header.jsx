import { useState, useCallback, useMemo } from 'react'

function Header({ 
  onBrandClick, 
  dockVisible,
  // Right side mode props
  headerRightMode = 'none',
  quickNavItems = [],
  showXpValue = true,
  showLevelLabel = true,
  showXpProgress = false,
  statusItems = [],
  statusClickable = false,
  // Data props
  currentTab = 'spin',
  userStats = { xp: 0, level: 1 },
  timerState = { isRunning: false, storedTime: 0 },
  syncState = 'idle',
  cloudUser = null,
  focusModeActive = false,
  remindersArmed = false,
  // Actions
  onTabChange,
  onSearchClick,
  onStatusClick,
}) {
  const [isRotated, setIsRotated] = useState(false)

  const handleBrandClick = useCallback((e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    setIsRotated(prev => !prev)
    onBrandClick?.()
  }, [onBrandClick])

  // Status computation
  const statusData = useMemo(() => {
    const statuses = []
    
    if (statusItems.includes('timer') && timerState?.isRunning) {
      const elapsed = timerState.storedTime + (timerState.startTime ? Date.now() - timerState.startTime : 0)
      const minutes = Math.floor(elapsed / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      statuses.push({
        id: 'timer',
        icon: '⏱',
        label: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        tooltip: 'Timer running',
        onClick: statusClickable ? () => onStatusClick?.('timer') : null,
      })
    }
    
    if (statusItems.includes('sync')) {
      let syncIcon = '☁'
      let syncLabel = ''
      let syncTooltip = 'Sync'
      
      if (syncState === 'syncing') {
        syncIcon = '☁'
        syncLabel = '⋯'
        syncTooltip = 'Syncing...'
      } else if (syncState === 'synced' && cloudUser) {
        syncIcon = '☁'
        syncLabel = '✓'
        syncTooltip = 'Synced'
      } else if (syncState === 'error') {
        syncIcon = '☁'
        syncLabel = '!'
        syncTooltip = 'Sync error'
      } else {
        syncIcon = '☁'
        syncLabel = '○'
        syncTooltip = 'Offline'
      }
      
      statuses.push({
        id: 'sync',
        icon: syncIcon,
        label: syncLabel,
        tooltip: syncTooltip,
        onClick: statusClickable ? () => onStatusClick?.('sync') : null,
      })
    }
    
    if (statusItems.includes('focus') && focusModeActive) {
      statuses.push({
        id: 'focus',
        icon: '⚡',
        label: '',
        tooltip: 'Focus mode active',
        onClick: statusClickable ? () => onStatusClick?.('focus') : null,
      })
    }
    
    if (statusItems.includes('reminders') && remindersArmed) {
      statuses.push({
        id: 'reminders',
        icon: '🔔',
        label: '',
        tooltip: 'Reminders armed',
        onClick: statusClickable ? () => onStatusClick?.('reminders') : null,
      })
    }
    
    return statuses
  }, [statusItems, timerState, syncState, cloudUser, focusModeActive, remindersArmed, statusClickable, onStatusClick])

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
  }
  
  // Helper to check if we're on a stats subtab
  const getCurrentSubtab = () => {
    const hash = window.location.hash;
    if (hash.includes('subView=people')) return 'people';
    if (hash.includes('subView=charts')) return 'charts';
    if (hash.includes('subView=history')) return 'history';
    if (hash.includes('subView=places')) return 'places';
    if (hash.includes('subView=overview')) return 'overview';
    return null;
  }

  // XP/Level display computation
  const xpDisplay = useMemo(() => {
    const xp = userStats?.xp || 0
    const level = userStats?.level || 1
    
    // Calculate progress to next level
    const LEVELING_CONFIG = window.LEVELING_CONFIG || {
      baseXpPerLevel: 100,
      levelMultiplier: 50,
      getXpForLevel: (lvl) => 100 + lvl * 50,
      getTotalXpForLevel: (lvl) => {
        let total = 0
        for (let i = 1; i <= lvl; i++) {
          total += 100 + i * 50
        }
        return total
      }
    }
    
    const currentLevelXp = LEVELING_CONFIG.getTotalXpForLevel(level - 1)
    const nextLevelXp = LEVELING_CONFIG.getTotalXpForLevel(level)
    const currentLevelProgress = xp - currentLevelXp
    const xpNeeded = nextLevelXp - currentLevelXp
    const progressPercent = Math.min(100, Math.max(0, (currentLevelProgress / xpNeeded) * 100))
    
    return {
      xp,
      level,
      progressPercent,
      xpNeeded,
      currentLevelProgress,
    }
  }, [userStats])

  // Render right side based on mode
  const renderRightSide = () => {
    if (headerRightMode === 'none') {
      return null
    }
    
    if (headerRightMode === 'quickNav') {
      return (
        <div className="header-quick-nav" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {quickNavItems.slice(0, 3).map((item, idx) => {
            // Special handling for people - it's a subtab of stats
            const isPeople = item === 'people';
            const isActive = isPeople 
              ? (currentTab === 'stats' && getCurrentSubtab() === 'people')
              : item === currentTab;
            const icon = quickNavIcons[item] || '•'
            
            return (
              <button
                key={item}
                onClick={() => {
                  if (item === 'search') {
                    onSearchClick?.()
                  } else if (item === 'people') {
                    // Navigate to stats tab with people subtab
                    onTabChange?.('stats');
                    window.location.hash = '#stats?subView=people';
                    window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                  } else {
                    onTabChange?.(item)
                  }
                }}
                className="header-quick-nav-item"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '20px',
                  lineHeight: '1',
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.7,
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                title={item === 'search' ? 'Search (Cmd/Ctrl+K)' : `Go to ${item}`}
                aria-label={item === 'search' ? 'Search' : `Go to ${item}`}
              >
                {icon}
              </button>
            )
          })}
        </div>
      )
    }
    
    if (headerRightMode === 'xp') {
      return (
        <div className="header-xp" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          {showXpProgress && (
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
          {showLevelLabel && (
            <span style={{ color: 'var(--text-light)' }}>Lv {xpDisplay.level}</span>
          )}
          {showXpValue && (
            <span style={{ color: 'var(--text)', marginLeft: showLevelLabel ? '4px' : 0 }}>
              {xpDisplay.xp.toLocaleString()} XP
            </span>
          )}
        </div>
      )
    }
    
    if (headerRightMode === 'status') {
      if (statusData.length === 0) return null
      
      return (
        <div className="header-status" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                if (status.onClick) e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                if (status.onClick) e.currentTarget.style.opacity = '0.8'
              }}
            >
              <span>{status.icon}</span>
              {status.label && <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>{status.label}</span>}
            </div>
          ))}
        </div>
      )
    }
    
    return null
  }

  return (
    <header className="app-header">
      <a
        href="#spin"
        onClick={handleBrandClick}
        className="brand-link"
        aria-label="Toggle navigation dock"
      >
        <span 
          className="brand-icon"
          style={{
            transform: isRotated ? 'rotate(90deg)' : 'rotate(0deg)'
          }}
        >
          🎰
        </span>
        <div className="brand-text">
          <div className="brand-title">TaskTumbler</div>
          <div className="brand-subtitle">
            Tap to {dockVisible ? 'hide' : 'show'} dock
          </div>
        </div>
      </a>
      
      {/* Right side - reserved space to prevent layout shift */}
      <div className="header-right" style={{ 
        minWidth: headerRightMode === 'none' ? '0' : '120px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        {renderRightSide()}
      </div>
    </header>
  )
}

export default Header
