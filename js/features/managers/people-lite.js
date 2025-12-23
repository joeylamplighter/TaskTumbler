// js/components/people-lite.js
window.usePeopleLite = ({ data, setData, notify }) => {
  const [showPeopleManager, setShowPeopleManager] = React.useState(false);
  const [allPeople] = window.usePeople(); // Subscribes to DataManager.people

  const addPersonToTaskAndDB = (name) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) return;

    // Add to current task state if missing
    const currentPeople = data.people || [];
    if (!currentPeople.includes(cleanName)) {
      setData({ ...data, people: [...currentPeople, cleanName] });
    }

    // Add to global DB if new
    const exists = allPeople.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (!exists) {
      window.DataManager?.people?.add({
        name: cleanName,
        type: 'network',
        addedAt: Date.now()
      });
      notify?.(`Added ${cleanName} to People DB`, "👥");
    }
  };

  const removePersonFromTask = (name) => {
    setData({
      ...data,
      people: (data.people || []).filter(p => p !== name)
    });
  };

  return {
    showPeopleManager,
    setShowPeopleManager,
    allPeople,
    addPersonToTaskAndDB,
    removePersonFromTask
  };
};