function NavBar({ current, onTabChange, items, hidden, getCurrentSubtab }) {
  const handleTabClick = (tabKey) => {
    if (onTabChange) {
      onTabChange(tabKey)
    }
  }
  
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
  }

  return (
    <nav
      className={`navbar ${hidden ? 'navbar-hidden' : ''}`}
      aria-label="Main navigation"
    >
      {items && items.map((item) => {
        // Handle subtabs and regular tabs
        let isActive = false;
        if (item.key.includes(':')) {
          const [parentTab, subtab] = item.key.split(':');
          if (parentTab === 'stats') {
            isActive = current === 'stats' && checkSubtab() === subtab;
          } else if (parentTab === 'settings') {
            const hash = window.location.hash;
            const match = hash.match(/[?&]view=([^&]+)/);
            const currentSubtab = match ? match[1].toLowerCase() : 'view';
            isActive = current === 'settings' && currentSubtab === subtab;
          } else if (parentTab === 'crm') {
            // CRM dropdown items map to existing tabs
            isActive = current === subtab;
          } else if (parentTab === 'contacts') {
            isActive = current === `contacts:${subtab}`;
          }
        } else {
          isActive = current === item.key;
        }
        return (
          <button
            key={item.key}
            onClick={() => handleTabClick(item.key)}
            className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
            title={item.label}
            aria-label={`Navigate to ${item.label} tab`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="nav-icon">{item.icon}</div>
            <div className="nav-label">{item.displayLabel || item.label}</div>
          </button>
        )
      })}
    </nav>
  )
}

export default NavBar

