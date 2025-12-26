// Helper to ensure task has all fields
export const completeTask = (task, locationMap) => {
  const locCoords = task.locationIds?.[0] && locationMap[task.locationIds[0]] 
    ? { lat: locationMap[task.locationIds[0]].lat, lon: locationMap[task.locationIds[0]].lon }
    : null;
  
  return {
    id: task.id,
    title: task.title,
    category: task.category || 'Work',
    subtype: task.subtype || null,
    priority: task.priority || 'Medium',
    estimatedTime: task.estimatedTime || '',
    estimatedTimeUnit: task.estimatedTimeUnit || 'min',
    people: Array.isArray(task.people) ? task.people : [],
    location: task.location || '',
    locationIds: Array.isArray(task.locationIds) ? task.locationIds : [],
    locationCoords: locCoords,
    completed: Boolean(task.completed),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    dueDate: task.dueDate || '',
    dueTime: task.dueTime || '',
    startDate: task.startDate || '',
    startTime: task.startTime || '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    weight: task.weight || 10,
    actualTime: task.actualTime || 0,
    percentComplete: task.percentComplete || 0,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    recurring: task.recurring || 'None',
    reminderMode: task.reminderMode || 'none',
    reminderAnchor: task.reminderAnchor || 'due',
    reminderOffsetValue: task.reminderOffsetValue || 1,
    reminderOffsetUnit: task.reminderOffsetUnit || 'hours',
    blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
    goalId: task.goalId || null,
    excludeFromTumbler: Boolean(task.excludeFromTumbler),
    lastModified: task.lastModified || task.createdAt || new Date().toISOString()
  };
};

// ===========================================
// CENTRALIZED MODAL MANAGEMENT
// Prevents modal stacking and navigation freezes
// ===========================================

import React, { useState, useEffect } from 'react';
import ViewTaskModal from './components/task-form/ViewTaskModal';
import ViewContactModal from './components/contact/ViewContactModal';

// Modal state management
let modalStateListeners = [];
let activeModalPathState = [];

// Notify all listeners of state changes
const notifyListeners = () => {
  modalStateListeners.forEach(listener => listener([...activeModalPathState]));
};

// Global functions for opening/closing modals
export const openModal = (type, id, data = {}) => {
  const modalEntry = { type, id, data };
  
  // Prevent recursion: if opening the same modal type with same ID, don't stack
  const lastModal = activeModalPathState[activeModalPathState.length - 1];
  if (lastModal && lastModal.type === type && String(lastModal.id) === String(id)) {
    // Already at this modal, don't duplicate
    return;
  }
  
  // Stack the new modal (allows task -> contact -> task navigation)
  activeModalPathState = [...activeModalPathState, modalEntry];
  notifyListeners();
  
  // Update URL hash (optional - for bookmarking)
  if (typeof window !== 'undefined') {
    const hash = activeModalPathState.map(m => `${m.type}:${m.id}`).join('/');
    window.history.replaceState(null, '', `#${hash}`);
  }
};

export const closeModal = () => {
  if (activeModalPathState.length > 0) {
    activeModalPathState = activeModalPathState.slice(0, -1);
    notifyListeners();
    
    // Update URL hash
    if (typeof window !== 'undefined') {
      if (activeModalPathState.length > 0) {
        const hash = activeModalPathState.map(m => `${m.type}:${m.id}`).join('/');
        window.history.replaceState(null, '', `#${hash}`);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }
};

export const closeAllModals = () => {
  activeModalPathState = [];
  notifyListeners();
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname);
  }
};

// React component that subscribes to modal state and renders only the top modal
export const ModalRenderer = ({ 
  getTaskById, 
  getPersonById, 
  tasks = [], 
  people = [], 
  locations = [],
  onEditTask,
  onCompleteTask,
  onFocusTask,
  onStartTimer,
  goals = [],
  settings = {},
  updateTask,
  onRespin,
  history = []
}) => {
  const [activeModalPath, setActiveModalPath] = useState([]);

  useEffect(() => {
    // Subscribe to modal state changes
    const listener = (newPath) => {
      setActiveModalPath(newPath);
    };
    modalStateListeners.push(listener);
    
    // Initialize with current state
    setActiveModalPath([...activeModalPathState]);
    
    // Listen to hash changes for initial load
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const parts = hash.split('/');
        const parsedPath = parts.map(part => {
          const [type, id] = part.split(':');
          return { type, id, data: {} };
        }).filter(m => m.type && m.id);
        if (parsedPath.length > 0) {
          activeModalPathState = parsedPath;
          setActiveModalPath(parsedPath);
        }
      }
    }
    
    return () => {
      modalStateListeners = modalStateListeners.filter(l => l !== listener);
    };
  }, []);

  // Render only the top modal
  const topModal = activeModalPath.length > 0 ? activeModalPath[activeModalPath.length - 1] : null;

  if (!topModal) return null;

  const { type, id, data } = topModal;

  // Render task modal
  if (type === 'task') {
    const task = getTaskById ? getTaskById(id) : (tasks.find(t => t.id === id) || data.task);
    if (!task) return null;

    // Modal components already use createPortal internally
    return (
      <ViewTaskModal
        key={`task-${id}`}
        task={task}
        onClose={closeModal}
        onEdit={onEditTask}
        onComplete={onCompleteTask}
        onFocus={onFocusTask}
        onStartTimer={onStartTimer}
        goals={goals}
        settings={settings}
        tasks={tasks}
        updateTask={updateTask}
        onRespin={onRespin}
      />
    );
  }

  // Render contact modal
  if (type === 'contact') {
    const person = getPersonById ? getPersonById(id) : (people.find(p => {
      const personId = p.id || p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
      return String(personId) === String(id);
    }) || data.person);
    if (!person) return null;

    // Modal components already use createPortal internally
    return (
      <ViewContactModal
        key={`contact-${id}`}
        person={person}
        onClose={closeModal}
        tasks={tasks}
        people={people}
        locations={locations}
        history={history}
        ignoreHash={true}
      />
    );
  }

  return null;
};

// Make functions available globally
if (typeof window !== 'undefined') {
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.closeAllModals = closeAllModals;
}