// src/components/tabs/PlacesTab.jsx
// ===========================================
// DEDICATED PLACES TAB
// ===========================================

import React from 'react'

export default function PlacesTab({ 
  tasks = [], 
  history = [], 
  categories = [], 
  settings, 
  notify, 
  locations = [], 
  setLocations = () => {},
  setPeople = () => {},
  setTasks = () => {},
  onViewTask 
}) {
  // Get LocationsManager from window (exported from managers)
  const LocationsManager = window.LocationsManager;

  if (!LocationsManager) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Loading Locations Manager...</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Please ensure stats feature is loaded.</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 20 }}>
      <LocationsManager
        locations={locations}
        setLocations={setLocations}
        notify={notify}
      />
    </div>
  )
}

// Expose on window for backward compatibility
if (typeof window !== 'undefined') {
  window.PlacesTab = PlacesTab;
}

