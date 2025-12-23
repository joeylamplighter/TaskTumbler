// src/components/tabs/PeopleTab.jsx
// ===========================================
// DEDICATED PEOPLE TAB
// ===========================================

import React from 'react'

export default function PeopleTab({ 
  tasks = [], 
  history = [], 
  categories = [], 
  settings, 
  notify, 
  locations = [], 
  setLocations = () => {},
  onViewTask 
}) {
  // Get PeopleManager from window (exported from 13-09-stats.jsx)
  const PeopleManager = window.PeopleManager;

  if (!PeopleManager) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Loading People Manager...</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Please ensure stats feature is loaded.</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 20 }}>
      <PeopleManager
        notify={notify}
        history={history}
        tasks={tasks}
        locations={locations}
        initialSelectedPersonName={null}
        onPersonSelected={(name) => {}}
        onViewTask={onViewTask}
      />
    </div>
  )
}

