// Helper to ensure task has all fields
export const completeTask = (task, locationMap) => {
  // Safely get location coordinates with proper null checking
  let locCoords = null;
  if (task.locationIds?.[0] && locationMap) {
    const location = locationMap[task.locationIds[0]];
    if (location && location.lat !== undefined && location.lon !== undefined) {
      locCoords = { lat: location.lat, lon: location.lon };
    }
  }
  
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
let isUpdatingFromHash = false; // Prevent circular updates
const MAX_MODAL_STACK_DEPTH = 5; // Maximum number of modals that can be stacked

// Check if user has disabled the stack depth warning
const isStackWarningDisabled = () => {
  try {
    return localStorage.getItem('disableModalStackWarning') === 'true';
  } catch {
    return false;
  }
};

// Notify all listeners of state changes
const notifyListeners = () => {
  modalStateListeners.forEach(listener => listener([...activeModalPathState]));
};

// Global functions for opening/closing modals
export const openModal = (type, id, data = {}) => {
  const modalEntry = { type, id, data };
  const stackLength = activeModalPathState.length;

  // 1. Prevent exact duplicate at the top
  const lastModal = activeModalPathState[stackLength - 1];
  if (lastModal && lastModal.type === type && String(lastModal.id) === String(id)) {
    console.log('[Modal Stack] Preventing duplicate at top:', type, id);
    return;
  }

  // 2. SMART TOGGLE: If the modal we are opening is already the "Parent" (one level back),
  // just close the current top modal to "go back" to it.
  // This handles: Task -> Contact -> (Click Task Link) -> Back to Task
  const parentModal = activeModalPathState[stackLength - 2];
  if (parentModal && parentModal.type === type && String(parentModal.id) === String(id)) {
    console.log('[Modal Stack] Smart toggle detected - going back to parent:', type, id);
    closeModal();
    return;
  }

  console.log('[Modal Stack] Opening modal:', type, id, 'Stack before:', activeModalPathState.map(m => `${m.type}:${m.id}`));

  // 3. Check maximum stack depth
  if (stackLength >= MAX_MODAL_STACK_DEPTH) {
    // If warning is disabled, automatically proceed
    if (isStackWarningDisabled()) {
      activeModalPathState = [...activeModalPathState.slice(1), modalEntry];
      notifyListeners();
    } else {
      // Show custom confirmation with "Don't ask again" option
      const message =
        `You have ${stackLength} modals open.\nOpening another will close the oldest modal.\n\n` +
        `Current: ${activeModalPathState.map(m => m.type).join(' → ')}\n\n` +
        `Click OK to continue, or Cancel to stay.\n\n` +
        `Tip: Hold SHIFT while clicking OK to disable this warning.`;

      if (typeof window !== 'undefined' && window.event?.shiftKey) {
        // Shift+Click = Don't ask again
        try {
          localStorage.setItem('disableModalStackWarning', 'true');
          console.log('Modal stack warning disabled. Re-enable in Settings > Advanced.');
        } catch (e) {
          console.warn('Could not save preference:', e);
        }
        activeModalPathState = [...activeModalPathState.slice(1), modalEntry];
        notifyListeners();
      } else {
        const shouldContinue = confirm(message);
        if (!shouldContinue) {
          return;
        }
        activeModalPathState = [...activeModalPathState.slice(1), modalEntry];
        notifyListeners();
      }
      return; // Exit early after handling
    }
  } else {
    // Otherwise, stack the new modal normally
    activeModalPathState = [...activeModalPathState, modalEntry];
    notifyListeners();
  }

  // Update URL hash (use pushState for browser history support)
  if (typeof window !== 'undefined' && !isUpdatingFromHash) {
    // Preserve the current tab/page in the hash (e.g., #tasks, #settings)
    const currentHash = window.location.hash.slice(1);
    const baseTab = currentHash.split('/')[0].split('?')[0]; // Extract tab name before modals or query params
    const modalHash = activeModalPathState.map(m => `${m.type}:${m.id}`).join('/');
    const newHash = baseTab && !baseTab.includes(':') ? `${baseTab}/${modalHash}` : modalHash;
    window.history.pushState(null, '', `#${newHash}`);
  }
};

export const closeModal = () => {
  if (activeModalPathState.length > 0) {
    activeModalPathState = activeModalPathState.slice(0, -1);
    notifyListeners();

    // Update URL hash (use pushState for browser history support)
    if (typeof window !== 'undefined' && !isUpdatingFromHash) {
      const currentHash = window.location.hash.slice(1);
      const baseTab = currentHash.split('/')[0].split('?')[0]; // Extract tab name

      if (activeModalPathState.length > 0) {
        const modalHash = activeModalPathState.map(m => `${m.type}:${m.id}`).join('/');
        const newHash = baseTab && !baseTab.includes(':') ? `${baseTab}/${modalHash}` : modalHash;
        window.history.pushState(null, '', `#${newHash}`);
      } else {
        // When closing all modals, return to the tab page
        window.history.pushState(null, '', baseTab ? `#${baseTab}` : window.location.pathname);
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

    // Parse hash and update modal stack
    const parseHashAndUpdateModals = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        // No hash = close all modals
        if (activeModalPathState.length > 0) {
          isUpdatingFromHash = true;
          activeModalPathState = [];
          notifyListeners();
          isUpdatingFromHash = false;
        }
        return;
      }

      // Parse modal stack from hash
      // Format: #tasks or #tasks/task:123/contact:456
      // The first part might be a tab name (tasks, settings, etc.)
      // Modal entries always have the format "type:id"
      const parts = hash.split('/').filter(p => p.includes(':'));
      const parsedPath = parts.map(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex === -1) return null;
        const type = part.substring(0, colonIndex);
        const id = part.substring(colonIndex + 1);
        return { type, id, data: {} };
      }).filter(m => m && m.type && m.id);

      // Update modal stack if different
      const currentHash = activeModalPathState.map(m => `${m.type}:${m.id}`).join('/');
      const newHash = parsedPath.map(m => `${m.type}:${m.id}`).join('/');

      if (currentHash !== newHash) {
        isUpdatingFromHash = true;
        activeModalPathState = parsedPath;
        notifyListeners();
        isUpdatingFromHash = false;
      }
    };

    // Parse initial hash
    parseHashAndUpdateModals();

    // Listen for browser back/forward navigation
    const handleHashChange = () => {
      parseHashAndUpdateModals();
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      modalStateListeners = modalStateListeners.filter(l => l !== listener);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Render only the top modal
  const topModal = activeModalPath.length > 0 ? activeModalPath[activeModalPath.length - 1] : null;

  if (!topModal) return null;

  const { type, id, data } = topModal;

  // Generate breadcrumb for modal stack (clickable chips)
  const generateBreadcrumb = () => {
    if (activeModalPath.length <= 1) return null;

    const isNearLimit = activeModalPath.length >= MAX_MODAL_STACK_DEPTH - 1;
    const isAtLimit = activeModalPath.length >= MAX_MODAL_STACK_DEPTH;

    // Handler to jump to a specific modal in the stack
    const handleBreadcrumbClick = (targetIndex) => {
      if (targetIndex === activeModalPath.length - 1) return; // Already at this modal

      // Truncate stack to the clicked modal
      isUpdatingFromHash = true;
      activeModalPathState = activeModalPathState.slice(0, targetIndex + 1);
      notifyListeners();
      isUpdatingFromHash = false;

      // Update URL
      if (typeof window !== 'undefined') {
        const currentHash = window.location.hash.slice(1);
        const baseTab = currentHash.split('/')[0].split('?')[0];
        const modalHash = activeModalPathState.map(m => `${m.type}:${m.id}`).join('/');
        const newHash = baseTab && !baseTab.includes(':') ? `${baseTab}/${modalHash}` : modalHash;
        window.history.pushState(null, '', `#${newHash}`);
      }
    };

    // Improved styling - clickable chips
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 10001,
        background: isAtLimit ? 'rgba(239, 68, 68, 0.95)' : isNearLimit ? 'rgba(251, 146, 60, 0.95)' : 'rgba(30, 41, 59, 0.95)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '600',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.2s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {activeModalPath.map((modal, index) => {
          const isActive = index === activeModalPath.length - 1;
          const isClickable = !isActive;

          return (
            <React.Fragment key={`${modal.type}-${modal.id}-${index}`}>
              {index > 0 && (
                <span style={{
                  opacity: 0.4,
                  fontSize: '10px',
                  margin: '0 -2px',
                  pointerEvents: 'none'
                }}>›</span>
              )}
              <span
                onClick={() => isClickable && handleBreadcrumbClick(index)}
                style={{
                  opacity: isActive ? 1 : 0.7,
                  fontWeight: isActive ? '700' : '500',
                  textTransform: 'capitalize',
                  letterSpacing: '0.3px',
                  cursor: isClickable ? 'pointer' : 'default',
                  pointerEvents: 'auto',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.15s ease',
                  background: isClickable ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
                  ...(isClickable && {
                    ':hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      opacity: 1
                    }
                  })
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '0.7';
                  }
                }}
              >
                {modal.type}
              </span>
            </React.Fragment>
          );
        })}
        {(isAtLimit || isNearLimit) && (
          <span style={{
            marginLeft: '4px',
            fontSize: '10px',
            opacity: 0.8,
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: '700',
            pointerEvents: 'none'
          }}>
            {isAtLimit ? 'MAX' : `${activeModalPath.length}/${MAX_MODAL_STACK_DEPTH}`}
          </span>
        )}
      </div>
    );
  };

  // Render task modal
  if (type === 'task') {
    const task = getTaskById ? getTaskById(id) : (tasks.find(t => t.id === id) || data.task);
    if (!task) return null;

    // Modal components already use createPortal internally
    return (
      <>
        {generateBreadcrumb()}
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
      </>
    );
  }

  // Render contact modal
  if (type === 'contact') {
    const person = getPersonById ? getPersonById(id) : (people.find(p => {
      // Use consistent ID matching - import getPersonId from utils
      const personId = p.id || p.name || (p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '');
      const match = String(personId) === String(id);
      console.log('[ModalRenderer] Checking person match:', { personId, searchId: id, match, person: p });
      return match;
    }) || data.person);
    console.log('[ModalRenderer] Contact modal person:', person, 'for id:', id);
    if (!person) return null;

    // Modal components already use createPortal internally
    return (
      <>
        {generateBreadcrumb()}
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
      </>
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