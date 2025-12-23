// js/13-09-stats.jsx
// ===========================================
// DATA TAB (SIMPLIFIED - HOLLOWED OUT FOR DEBUGGING)
// ===========================================

import React from 'react'

function StatsTab({ tasks = [], history = [], categories = [], settings, notify, locations: locationsProp, setLocations: setLocationsProp, onViewTask }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Stats</h2>
      <p>Stats tab is being rebuilt...</p>
    </div>
  );
}

window.StatsTab = StatsTab;
console.log('✅ 13-09-stats.jsx loaded (simplified)');
