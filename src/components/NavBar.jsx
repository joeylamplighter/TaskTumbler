function NavBar({ current, onTabChange, items, hidden }) {
  const handleTabClick = (tabKey) => {
    if (onTabChange) {
      onTabChange(tabKey)
    }
  }

  return (
    <nav 
      className={`navbar ${hidden ? 'navbar-hidden' : ''}`}
      aria-label="Main navigation"
    >
      {items && items.map((item) => {
        const isActive = current === item.key
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
            <div className="nav-label">{item.label}</div>
          </button>
        )
      })}
    </nav>
  )
}

export default NavBar

