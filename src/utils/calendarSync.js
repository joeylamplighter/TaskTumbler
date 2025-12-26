// src/utils/calendarSync.js
// ===========================================
// 📅 GOOGLE CALENDAR TWO-WAY SYNC
// ===========================================

// Google Calendar API configuration
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Load Google API client
let gapiLoaded = false;
let gisLoaded = false;

/**
 * Load Google API client library
 */
export const loadGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    if (gapiLoaded && gisLoaded && window.gapi && window.google) {
      resolve();
      return;
    }

    let gapiResolved = false;
    let gisResolved = false;

    const checkBothLoaded = () => {
      if (gapiResolved && gisResolved) {
        resolve();
      }
    };

    // Load gapi client
    if (!gapiLoaded && !document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        gapiLoaded = true;
        if (window.gapi) {
          window.gapi.load('client', () => {
            gapiResolved = true;
            checkBothLoaded();
          });
        } else {
          gapiResolved = true;
          checkBothLoaded();
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google API'));
      };
      document.head.appendChild(script);
    } else if (gapiLoaded) {
      gapiResolved = true;
      checkBothLoaded();
    }

    // Load gis (Google Identity Services)
    if (!gisLoaded && !document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        gisLoaded = true;
        gisResolved = true;
        checkBothLoaded();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(script);
    } else if (gisLoaded) {
      gisResolved = true;
      checkBothLoaded();
    }
  });
};

/**
 * Initialize Google API client
 */
export const initGoogleClient = async (apiKey, clientId) => {
  try {
    await loadGoogleAPI();
    
    await window.gapi.client.init({
      apiKey: apiKey,
      discoveryDocs: DISCOVERY_DOCS,
    });

    return true;
  } catch (error) {
    console.error('[CalendarSync] Failed to initialize Google client:', error);
    throw error;
  }
};

/**
 * Authenticate user with Google Calendar
 */
export const authenticateGoogle = (clientId) => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return window.gapi?.client?.getToken() !== null;
};

/**
 * Get current access token
 */
export const getAccessToken = () => {
  const token = window.gapi?.client?.getToken();
  return token?.access_token || null;
};

/**
 * Sign out from Google Calendar
 */
export const signOut = () => {
  if (window.gapi?.client?.getToken()) {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
    }
  }
};

/**
 * Convert task time estimate to minutes
 */
const getTaskDurationMinutes = (task) => {
  if (!task.estimatedTime) return 60; // Default 1 hour
  
  const value = Number(task.estimatedTime) || 0;
  const unit = task.estimatedTimeUnit || 'min';
  
  switch (unit) {
    case 'min':
      return value;
    case 'hour':
    case 'hr':
      return value * 60;
    case 'day':
      return value * 24 * 60;
    default:
      return value;
  }
};

/**
 * Calculate buffer time between tasks (in minutes)
 */
const getBufferTime = (settings) => {
  return Number(settings?.calendarSync?.bufferMinutes) || 15; // Default 15 minutes
};

/**
 * Convert date and time strings to ISO datetime
 */
const toISODatetime = (dateStr, timeStr, isEnd = false) => {
  if (!dateStr) return null;
  
  let date = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(date.getTime())) return null;
  
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      date.setUTCHours(hours, minutes, 0, 0);
    }
  } else if (isEnd) {
    // If no end time, default to end of day
    date.setUTCHours(23, 59, 59, 999);
  } else {
    // If no start time, default to start of day
    date.setUTCHours(0, 0, 0, 0);
  }
  
  return date.toISOString();
};

/**
 * Convert task to Google Calendar event
 */
const taskToEvent = (task, settings) => {
  const startDate = task.startDate;
  const startTime = task.startTime;
  
  if (!startDate) return null; // Only sync tasks with start dates
  
  const start = toISODatetime(startDate, startTime, false);
  if (!start) return null;
  
  const durationMinutes = getTaskDurationMinutes(task);
  const bufferMinutes = getBufferTime(settings);
  
  // Calculate end time: start + duration + buffer
  const endDate = new Date(start);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + durationMinutes + bufferMinutes);
  const end = endDate.toISOString();
  
  // Build description with task details
  const descriptionParts = [];
  if (task.description) descriptionParts.push(task.description);
  if (task.category) descriptionParts.push(`Category: ${task.category}`);
  if (task.priority) descriptionParts.push(`Priority: ${task.priority}`);
  if (task.location) descriptionParts.push(`Location: ${task.location}`);
  if (task.people?.length > 0) {
    descriptionParts.push(`People: ${task.people.join(', ')}`);
  }
  descriptionParts.push(`\nTaskTumbler Task ID: ${task.id}`);
  
  const event = {
    summary: task.title,
    description: descriptionParts.join('\n'),
    start: {
      dateTime: start,
      timeZone: 'UTC',
    },
    end: {
      dateTime: end,
      timeZone: 'UTC',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'email', minutes: 30 },
      ],
    },
    extendedProperties: {
      private: {
        taskTumblerTaskId: task.id,
        taskTumblerSync: 'true',
      },
    },
  };
  
  return event;
};

/**
 * Convert Google Calendar event to task update
 */
const eventToTaskUpdate = (event) => {
  const taskId = event.extendedProperties?.private?.taskTumblerTaskId;
  if (!taskId) return null;
  
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  
  if (!start) return null;
  
  const startDate = new Date(start);
  const startDateStr = startDate.toISOString().split('T')[0];
  const startTimeStr = startDate.toTimeString().slice(0, 5);
  
  // Calculate duration from event (subtract buffer)
  let durationMinutes = 60; // Default
  if (end) {
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    durationMinutes = Math.max(1, Math.floor(diffMs / 60000));
    // Subtract buffer (assume 15 min default)
    durationMinutes = Math.max(1, durationMinutes - 15);
  }
  
  return {
    id: taskId,
    title: event.summary || '',
    startDate: startDateStr,
    startTime: startTimeStr,
    description: event.description || '',
    // Update estimated time based on duration
    estimatedTime: durationMinutes,
    estimatedTimeUnit: 'min',
  };
};

/**
 * Create or update calendar event for a task
 */
export const syncTaskToCalendar = async (task, settings) => {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated with Google Calendar');
  }
  
  const event = taskToEvent(task, settings);
  if (!event) {
    return null; // Task doesn't have required fields
  }
  
  try {
    const calendarId = settings?.calendarSync?.calendarId || 'primary';
    const existingEventId = task.calendarEventId;
    
    if (existingEventId) {
      // Update existing event
      const response = await window.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: existingEventId,
        resource: event,
      });
      return response.result;
    } else {
      // Create new event
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
      return response.result;
    }
  } catch (error) {
    console.error('[CalendarSync] Failed to sync task to calendar:', error);
    throw error;
  }
};

/**
 * Delete calendar event for a task
 */
export const deleteTaskFromCalendar = async (task, settings) => {
  if (!isAuthenticated()) {
    return; // Not authenticated, nothing to delete
  }
  
  const eventId = task.calendarEventId;
  if (!eventId) {
    return; // No event to delete
  }
  
  try {
    const calendarId = settings?.calendarSync?.calendarId || 'primary';
    await window.gapi.client.calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
  } catch (error) {
    // Event might already be deleted, ignore error
    console.warn('[CalendarSync] Failed to delete calendar event:', error);
  }
};

/**
 * Convert Google Calendar event to new task (for importing)
 */
const eventToNewTask = (event, settings) => {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return null;
  
  const startDate = new Date(start);
  const startDateStr = startDate.toISOString().split('T')[0];
  const startTimeStr = startDate.toTimeString().slice(0, 5);
  
  // Calculate duration from event (subtract buffer)
  let durationMinutes = 60; // Default
  if (event.end?.dateTime || event.end?.date) {
    const endDate = new Date(event.end.dateTime || event.end.date);
    const diffMs = endDate - startDate;
    durationMinutes = Math.max(1, Math.floor(diffMs / 60000));
    // Subtract buffer
    const bufferMinutes = getBufferTime(settings);
    durationMinutes = Math.max(1, durationMinutes - bufferMinutes);
  }
  
  // Parse description for task details
  const description = event.description || '';
  let category = 'Work';
  let priority = 'Medium';
  let location = '';
  let people = [];
  
  // Try to extract category, priority, location, people from description
  if (description) {
    const categoryMatch = description.match(/Category:\s*([^\n]+)/i);
    if (categoryMatch) category = categoryMatch[1].trim();
    
    const priorityMatch = description.match(/Priority:\s*([^\n]+)/i);
    if (priorityMatch) priority = priorityMatch[1].trim();
    
    const locationMatch = description.match(/Location:\s*([^\n]+)/i);
    if (locationMatch) location = locationMatch[1].trim();
    
    const peopleMatch = description.match(/People:\s*([^\n]+)/i);
    if (peopleMatch) {
      people = peopleMatch[1].split(',').map(p => p.trim()).filter(Boolean);
    }
  }
  
  return {
    title: event.summary || 'Untitled Event',
    description: description.split('\n').filter(line => 
      !line.includes('Category:') && 
      !line.includes('Priority:') && 
      !line.includes('Location:') && 
      !line.includes('People:') &&
      !line.includes('TaskTumbler Task ID:')
    ).join('\n').trim(),
    category,
    priority: ['Urgent', 'High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
    startDate: startDateStr,
    startTime: startTimeStr,
    estimatedTime: durationMinutes,
    estimatedTimeUnit: 'min',
    location,
    people,
    calendarEventId: event.id,
    createdAt: new Date().toISOString(),
    lastModified: event.updated || new Date().toISOString(),
  };
};

/**
 * Fetch calendar events and sync back to tasks
 */
export const syncCalendarToTasks = async (tasks, settings, updateTaskCallback) => {
  if (!isAuthenticated()) {
    return { synced: 0, errors: [] };
  }
  
  try {
    const calendarId = settings?.calendarSync?.calendarId || 'primary';
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
    
    const response = await window.gapi.client.calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    
    const events = response.result.items || [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const existingEventIds = new Set(tasks.filter(t => t.calendarEventId).map(t => t.calendarEventId));
    let synced = 0;
    const errors = [];
    
    for (const event of events) {
      const taskId = event.extendedProperties?.private?.taskTumblerTaskId;
      
      if (taskId) {
        // This is a TaskTumbler-synced event, update existing task
        const taskUpdate = eventToTaskUpdate(event);
        if (!taskUpdate) continue;
        
        const task = taskMap.get(taskUpdate.id);
        if (!task) continue; // Task doesn't exist locally
        
        // Check if event was modified after last sync
        const eventUpdated = new Date(event.updated);
        const taskModified = new Date(task.lastModified || task.createdAt);
        
        if (eventUpdated > taskModified) {
          // Event was modified, update task
          try {
            await updateTaskCallback(taskUpdate.id, {
              ...taskUpdate,
              calendarEventId: event.id,
              lastModified: eventUpdated.toISOString(),
            });
            synced++;
          } catch (error) {
            errors.push({ taskId: taskUpdate.id, error: error.message });
          }
        } else {
          // Update event ID if missing
          if (!task.calendarEventId && event.id) {
            await updateTaskCallback(taskUpdate.id, {
              calendarEventId: event.id,
            });
          }
        }
      }
    }
    
    return { synced, errors };
  } catch (error) {
    console.error('[CalendarSync] Failed to sync calendar to tasks:', error);
    throw error;
  }
};

/**
 * Import Google Calendar events as new tasks
 */
export const importCalendarEventsAsTasks = async (settings, addTaskCallback, tasks = []) => {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated with Google Calendar');
  }
  
  try {
    const calendarId = settings?.calendarSync?.calendarId || 'primary';
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
    
    const response = await window.gapi.client.calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    
    const events = response.result.items || [];
    const existingEventIds = new Set(tasks.filter(t => t.calendarEventId).map(t => t.calendarEventId));
    
    // Filter out events that are already imported or are TaskTumbler-synced
    const eventsToImport = events.filter(event => {
      // Skip if already imported
      if (existingEventIds.has(event.id)) return false;
      
      // Skip if it's a TaskTumbler-synced event
      if (event.extendedProperties?.private?.taskTumblerTaskId) return false;
      
      // Only import events with start times (not all-day events without times)
      const start = event.start?.dateTime || event.start?.date;
      if (!start) return false;
      
      // Only import future or recent events (within last 7 days)
      const startDate = new Date(start);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return startDate >= sevenDaysAgo;
    });
    
    let imported = 0;
    const errors = [];
    
    for (const event of eventsToImport) {
      try {
        const newTask = eventToNewTask(event, settings);
        if (newTask) {
          await addTaskCallback(newTask);
          imported++;
        }
      } catch (error) {
        errors.push({ eventId: event.id, error: error.message });
      }
    }
    
    return { imported, errors, total: eventsToImport.length };
  } catch (error) {
    console.error('[CalendarSync] Failed to import calendar events:', error);
    throw error;
  }
};

/**
 * Sync all time-blocked tasks to calendar
 */
export const syncAllTasksToCalendar = async (tasks, settings, updateTaskCallback) => {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated with Google Calendar');
  }
  
  const timeBlockedTasks = tasks.filter(t => 
    t.startDate && 
    !t.completed && 
    !t.excludeFromTumbler
  );
  
  let synced = 0;
  const errors = [];
  
  for (const task of timeBlockedTasks) {
    try {
      const event = await syncTaskToCalendar(task, settings);
      if (event) {
        await updateTaskCallback(task.id, {
          calendarEventId: event.id,
        });
        synced++;
      }
    } catch (error) {
      errors.push({ taskId: task.id, error: error.message });
    }
  }
  
  return { synced, errors };
};

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
  window.CalendarSync = {
    loadGoogleAPI,
    initGoogleClient,
    authenticateGoogle,
    isAuthenticated,
    getAccessToken,
    signOut,
    syncTaskToCalendar,
    deleteTaskFromCalendar,
    syncCalendarToTasks,
  syncAllTasksToCalendar,
  importCalendarEventsAsTasks,
};
}

export default {
  loadGoogleAPI,
  initGoogleClient,
  authenticateGoogle,
  isAuthenticated,
  getAccessToken,
  signOut,
  syncTaskToCalendar,
  deleteTaskFromCalendar,
  syncCalendarToTasks,
  syncAllTasksToCalendar,
  importCalendarEventsAsTasks,
};

