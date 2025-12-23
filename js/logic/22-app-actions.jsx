// js/components/22-app-actions.jsx
// Updated: 2025-12-18 10:00 PT
// ===========================================
// APP ACTIONS (handlers + helpers)
// ===========================================

(function () {
  function createNotify(setToasts) {
    return (msg, icon) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, msg, icon }].slice(-3));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
  }

  function createTaskActions({ tasks, setTasks, settings, notify }) {
    const addTask = (t) => {
      const newTask = { ...t, id: window.generateId(), completed: false, createdAt: new Date().toISOString() };
      setTasks(p => [...p, newTask]);
      notify("Task Added", "✅");
    };

    const completeTask = (id) => {
      setTasks(p => p.map(t => t.id === id ? { ...t, completed: true } : t));
      notify("Task Completed!", "🎉");
      if (settings.confetti && typeof window.fireSmartConfetti === 'function') window.fireSmartConfetti('taskComplete', settings);
    };

    const updateTask = (id, u) => setTasks(p => p.map(t => t.id === id ? { ...t, ...u } : t));

    const deleteTask = (id) => {
      setTasks(p => p.filter(t => t.id !== id));
      notify("Task Deleted", "🗑️");
    };

    return { addTask, completeTask, updateTask, deleteTask };
  }

  function createDataActions({ tasks, goals, categories, activities, savedNotes, settings, userStats, allPeople, DM, notify, setTasks, setCategories, setGoals, setSavedNotes, setActivitiesInternal }) {
    const handleExportBackup = () => {
      try {
        const payload = {
          exportedAt: new Date().toISOString(),
          tasks, goals, categories, activities,
          savedNotes, settings, userStats,
          savedPeople: (DM?.people?.getAll?.() || allPeople)
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasktumbler-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        notify('Backup exported', '📥');
      } catch (e) {
        console.error(e);
        notify('Export failed', '❌');
      }
    };

    const handleClearDone = () => {
      setTasks(prev => prev.filter(t => !t.completed));
      notify('Cleared completed tasks', '🧹');
    };

    const handleNukeAll = () => {
      try { localStorage.clear(); } catch {}
      window.location.reload();
    };

    const handleLoadSamples = () => {

      const sampleCats = ['Work', 'Personal', 'Health', 'Finance', 'Real Estate', 'Learning', 'Home Project', 'Fun'];
      const sampleSubs = {
        'Work': ['Deep Work', 'Meetings', 'Admin', 'Client Calls', 'Documentation'],
        'Personal': ['Errands', 'Chores', 'Social', 'Family Time', 'Shopping'],
        'Health': ['Cardio', 'Strength', 'Meal Prep', 'Yoga', 'Meditation'],
        'Finance': ['Budgeting', 'Bills', 'Investments', 'Taxes', 'Expenses'],
        'Real Estate': ['Lead Gen', 'Showings', 'Open House', 'Contracts', 'Follow-ups'],
        'Learning': ['Reading', 'Courses', 'Practice', 'Research', 'Projects'],
        'Home Project': ['Renovation', 'Maintenance', 'Decorating', 'Gardening', 'Organization'],
        'Fun': ['Gaming', 'Movies', 'Hobbies', 'Travel', 'Events']
      };

      setCategories(sampleCats);
      localStorage.setItem('categories', JSON.stringify(sampleCats));
      localStorage.setItem('customSubcategories', JSON.stringify(sampleSubs));
      if (typeof window !== 'undefined') window.SUBCATEGORIES = sampleSubs;

      // Sample People (expanded with more fields)
      const samplePeople = [
        { id: 'p1', name: 'Alice Client', type: 'client', phone: '555-0100', email: 'alice@example.com', notes: 'Looking for 3bd/2ba in downtown area. Budget: $500k', links: 'https://compass.com/alice', compassLink: 'https://compass.com/alice' },
        { id: 'p2', name: 'Bob Vendor', type: 'vendor', phone: '555-0101', email: 'bob@plumbing.com', notes: 'Licensed plumber, available weekends', links: '' },
        { id: 'p3', name: 'Charlie Lead', type: 'lead', email: 'charlie@lead.com', phone: '555-0102', notes: 'Interested in investment properties', links: '' },
        { id: 'p4', name: 'Diana Partner', type: 'partner', phone: '555-0103', email: 'diana@partners.com', notes: 'Real estate partner, handles commercial properties', links: 'https://linkedin.com/diana' },
        { id: 'p5', name: 'Eve Contractor', type: 'vendor', phone: '555-0104', email: 'eve@construction.com', notes: 'General contractor, specializes in renovations', links: '' },
        { id: 'p6', name: 'Frank Investor', type: 'client', phone: '555-0105', email: 'frank@invest.com', notes: 'Looking for rental properties, cash buyer', links: '' },
        { id: 'p7', name: 'Grace Designer', type: 'vendor', phone: '555-0106', email: 'grace@design.com', notes: 'Interior designer, available for staging', links: '' }
      ];

      if (DM?.people?.setAll) {
        DM.people.setAll(samplePeople);
      } else {
        localStorage.setItem('savedPeople', JSON.stringify(samplePeople));
        window.dispatchEvent(new Event('people-updated'));
      }

      // Sample Locations
      const sampleLocations = [
        { id: 'loc1', name: 'Downtown Office', address: '123 Main St, City, ST 12345', addressLabel: '123 Main St, City, ST 12345', gpsLabel: 'Downtown Office — 123 Main St', fullLabel: 'Downtown Office — 123 Main St, City, ST 12345', coords: { lat: 37.7749, lon: -122.4194 }, source: 'manual', createdAt: new Date().toISOString() },
        { id: 'loc2', name: 'Client Home', address: '456 Oak Ave, City, ST 12346', addressLabel: '456 Oak Ave, City, ST 12346', gpsLabel: 'Client Home — 456 Oak Ave', fullLabel: 'Client Home — 456 Oak Ave, City, ST 12346', coords: { lat: 37.7849, lon: -122.4094 }, source: 'manual', createdAt: new Date().toISOString() },
        { id: 'loc3', name: 'Coffee Shop', address: '789 Elm Blvd, City, ST 12347', addressLabel: '789 Elm Blvd, City, ST 12347', gpsLabel: 'Coffee Shop — 789 Elm Blvd', fullLabel: 'Coffee Shop — 789 Elm Blvd, City, ST 12347', coords: { lat: 37.7649, lon: -122.4294 }, source: 'manual', createdAt: new Date().toISOString() },
        { id: 'loc4', name: 'Gym', address: '321 Fitness Way, City, ST 12348', addressLabel: '321 Fitness Way, City, ST 12348', gpsLabel: 'Gym — 321 Fitness Way', fullLabel: 'Gym — 321 Fitness Way, City, ST 12348', coords: { lat: 37.7549, lon: -122.4394 }, source: 'manual', createdAt: new Date().toISOString() }
      ];

      if (typeof window.setSavedLocationsV1 === 'function') {
        window.setSavedLocationsV1(sampleLocations);
      } else {
        localStorage.setItem('savedLocations_v1', JSON.stringify(sampleLocations));
        window.dispatchEvent(new Event('locations-updated'));
      }

      // Sample Tasks (expanded with more variety)
      const now = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      
      const sampleTasks = [
        { id: 't1', title: 'Call Alice re: Offer', category: 'Real Estate', subtype: 'Lead Gen', priority: 'High', estimatedTime: 15, people: ['Alice Client'], location: 'Downtown Office', completed: false, createdAt: now, dueDate: tomorrow, startDate: new Date().toISOString().split('T')[0], tags: ['urgent', 'client'], weight: 15 },
        { id: 't2', title: 'Prepare Q4 Taxes', category: 'Finance', subtype: 'Taxes', priority: 'Medium', estimatedTime: 60, people: [], location: '', completed: false, createdAt: now, dueDate: nextWeek, tags: ['finance', 'important'], weight: 12, percentComplete: 30 },
        { id: 't3', title: 'Morning Run', category: 'Health', subtype: 'Cardio', priority: 'Low', estimatedTime: 30, people: [], location: 'Gym', completed: false, createdAt: now, tags: ['health', 'routine'], weight: 5, recurring: 'Daily' },
        { id: 't4', title: 'Update Listing Photos', category: 'Real Estate', subtype: 'Admin', priority: 'Medium', estimatedTime: 45, people: ['Grace Designer'], location: 'Client Home', completed: false, createdAt: now, tags: ['marketing'], weight: 10 },
        { id: 't5', title: 'Review Investment Portfolio', category: 'Finance', subtype: 'Investments', priority: 'Medium', estimatedTime: 45, people: ['Frank Investor'], location: '', completed: false, createdAt: now, dueDate: tomorrow, tags: ['finance'], weight: 8 },
        { id: 't6', title: 'Complete Online Course Module 3', category: 'Learning', subtype: 'Courses', priority: 'Low', estimatedTime: 90, people: [], location: '', completed: false, createdAt: now, tags: ['learning', 'education'], weight: 7, percentComplete: 50 },
        { id: 't7', title: 'Kitchen Renovation Planning', category: 'Home Project', subtype: 'Renovation', priority: 'High', estimatedTime: 120, people: ['Eve Contractor', 'Grace Designer'], location: '', completed: false, createdAt: now, dueDate: nextWeek, tags: ['home', 'project'], weight: 18, subtasks: ['Get quotes', 'Choose materials', 'Schedule timeline'] },
        { id: 't8', title: 'Team Meeting Prep', category: 'Work', subtype: 'Meetings', priority: 'High', estimatedTime: 30, people: ['Diana Partner'], location: 'Downtown Office', completed: false, createdAt: now, dueDate: new Date().toISOString().split('T')[0], tags: ['work', 'meeting'], weight: 12 },
        { id: 't9', title: 'Grocery Shopping', category: 'Personal', subtype: 'Shopping', priority: 'Medium', estimatedTime: 45, people: [], location: '', completed: false, createdAt: now, tags: ['errands'], weight: 6, recurring: 'Weekly' },
        { id: 't10', title: 'Write Blog Post on Market Trends', category: 'Work', subtype: 'Deep Work', priority: 'Medium', estimatedTime: 90, people: [], location: 'Coffee Shop', completed: false, createdAt: now, tags: ['writing', 'content'], weight: 10, percentComplete: 20 }
      ];

      setTasks(prev => [...prev, ...sampleTasks]);

      // Sample Goals
      if (setGoals) {
        const sampleGoals = [
          { id: 'g1', title: 'Complete 50 Real Estate Deals This Year', description: 'Focus on closing deals and building client relationships', category: 'Real Estate', target: 50, progress: 12, targetType: 'completion', targetValue: 50, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] },
          { id: 'g2', title: 'Log 100 Hours of Focus Time', description: 'Track deep work sessions to improve productivity', category: 'Work', target: 100, progress: 35, targetType: 'time', targetValue: 6000, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
          { id: 'g3', title: 'Save $50,000 for Vacation', description: 'Planning a dream vacation next year', category: 'Finance', target: 50000, progress: 15000, targetType: 'numeric', targetValue: 50000, unit: '$', createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear() + 1, 5, 1).toISOString().split('T')[0] },
          { id: 'g4', title: 'Complete Kitchen Renovation', description: 'Finish the home renovation project', category: 'Home Project', target: 100, progress: 45, targetType: 'manual', targetValue: 1, manualProgress: 45, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
          { id: 'g5', title: 'Read 24 Books This Year', description: 'One book every two weeks', category: 'Learning', target: 24, progress: 8, targetType: 'completion', targetValue: 24, createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] }
        ];
        setGoals(sampleGoals);
      }

      // Sample Activities (various types)
      if (setActivitiesInternal || DM?.activities?.setAll) {
        const sampleActivities = [
          { id: 'a1', title: 'Deep Work Session', category: 'Work', duration: 3600, type: 'focus', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
          { id: 'a2', title: 'Morning Run', category: 'Health', duration: 1800, type: 'completion', taskId: 't3', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
          { id: 'a3', title: 'Client Call with Alice', category: 'Real Estate', duration: 900, type: 'completion', taskId: 't1', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
          { id: 'a4', title: 'Tax Preparation', category: 'Finance', duration: 2700, type: 'focus', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
          { id: 'a5', title: 'Gym Workout', category: 'Health', duration: 2400, type: 'completion', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
          { id: 'a6', title: 'Online Course Study', category: 'Learning', duration: 5400, type: 'focus', taskId: 't6', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
          { id: 'a7', title: 'Team Meeting', category: 'Work', duration: 1800, type: 'completion', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
          { id: 'a8', title: 'Property Showing', category: 'Real Estate', duration: 1800, type: 'completion', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
          { id: 'a9', title: 'Blog Writing', category: 'Work', duration: 3600, type: 'focus', taskId: 't10', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
          { id: 'a10', title: 'Grocery Shopping', category: 'Personal', duration: 1800, type: 'completion', taskId: 't9', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }
        ];

        if (DM?.activities?.setAll) {
          DM.activities.setAll(sampleActivities);
          const allActivities = DM.activities.getAll() || [];
          if (setActivitiesInternal) setActivitiesInternal(allActivities);
        } else if (setActivitiesInternal) {
          setActivitiesInternal(sampleActivities);
          localStorage.setItem('activities', JSON.stringify(sampleActivities));
        }
      }

      // Sample Saved Notes
      if (setSavedNotes) {
        const sampleNotes = [
          { id: 'n1', text: 'Market analysis: Downtown properties are up 15% this quarter. Focus on mid-range homes ($300k-$500k) as they have the best ROI.', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
          { id: 'n2', text: 'Client feedback: Alice prefers properties with modern kitchens and good schools nearby. Budget flexible up to $550k.', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
          { id: 'n3', text: 'Tax tip: Remember to deduct home office expenses and vehicle mileage for real estate work. Keep all receipts organized.', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
          { id: 'n4', text: 'Learning goal: Complete the real estate investment course by end of month. Focus on commercial property analysis module.', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
          { id: 'n5', text: 'Renovation checklist: Get 3 quotes for kitchen, choose cabinet style, select countertop material, schedule contractor meeting.', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
          { id: 'n6', text: 'Health reminder: Morning runs are working well. Consider adding strength training 2x per week for better results.', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() }
        ];
        setSavedNotes(sampleNotes);
      }

      notify('Comprehensive Samples Loaded! 🎲', '✅');
      setTimeout(() => window.location.reload(), 1000);
    };

    return { handleExportBackup, handleClearDone, handleNukeAll, handleLoadSamples };
  }

  window.AppActions = {
    createNotify,
    createTaskActions,
    createDataActions,
  };

  console.log('✅ 22-app-actions.jsx loaded');
})();
