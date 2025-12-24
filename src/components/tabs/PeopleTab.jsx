// src/components/tabs/PeopleTab.jsx
// ===========================================
// DEDICATED PEOPLE TAB
// ===========================================

import React from 'react'

export default function PeopleTab({
  people = [],
  setPeople = () => {},
  tasks = [],
  history = [],
  categories = [],
  settings,
  notify,
  locations = [],
  setLocations = () => {},
  setTasks = () => {},
  onViewTask
}) {
  // Get PeopleManager from window (exported from src/components/managers/PeopleManager.jsx)
  const PeopleManager = window.PeopleManager;

  if (!PeopleManager) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Loading People Manager...</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Please ensure managers are loaded.</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 20 }}>
      <PeopleManager
        people={people}
        setPeople={setPeople}
        notify={notify}
        history={history}
        tasks={tasks}
        locations={locations}
        setLocations={setLocations}
        setTasks={setTasks}
        initialSelectedPersonName={null}
        onViewTask={onViewTask}
      />
    </div>
  )
}

