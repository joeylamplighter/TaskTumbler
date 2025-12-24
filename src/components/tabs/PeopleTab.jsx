// src/components/tabs/PeopleTab.jsx
// ===========================================
// DEDICATED PEOPLE TAB
// ===========================================

import React, { useState, useEffect } from 'react'

// Helper to get person ID from hash
const getPersonIdFromHash = () => {
  const hash = window.location.hash;
  // Support both #person/id and #people/id formats
  const match = hash.match(/#(?:person|people)\/([^?]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
};

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
  const [selectedPersonId, setSelectedPersonId] = useState(() => getPersonIdFromHash());

  // Listen for hash changes and update selectedPersonId
  useEffect(() => {
    const handleHashChange = () => {
      const personId = getPersonIdFromHash();
      setSelectedPersonId(personId);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Check initial hash
    const initialPersonId = getPersonIdFromHash();
    if (initialPersonId) {
      setSelectedPersonId(initialPersonId);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Also watch for hash changes when tab becomes active (in case hash was set programmatically)
  useEffect(() => {
    const personId = getPersonIdFromHash();
    if (personId && personId !== selectedPersonId) {
      setSelectedPersonId(personId);
    }
  }, [selectedPersonId]);

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
        initialSelectedPersonId={selectedPersonId}
        onViewTask={onViewTask}
      />
    </div>
  )
}

