// src/components/calendar/CalendarSyncSettings.jsx
// ===========================================
// 📅 GOOGLE CALENDAR SYNC SETTINGS UI
// ===========================================

import React, { useState, useEffect } from 'react';
import { 
  initGoogleClient, 
  authenticateGoogle, 
  isAuthenticated, 
  signOut,
  syncAllTasksToCalendar,
  syncCalendarToTasks,
  importCalendarEventsAsTasks
} from '../../utils/calendarSync';
import DataManager from '../../core/dataManager';

export default function CalendarSyncSettings({ settings, setSettings, tasks: tasksProp, updateTask: updateTaskProp, addTask: addTaskProp, notify }) {
  // Get tasks and updateTask from props or DataManager (ES6 import)
  const DM = DataManager;
  const tasks = tasksProp || (DM?.tasks?.getAll?.() || []);
  const updateTask = updateTaskProp || ((id, updates) => {
    const allTasks = DM?.tasks?.getAll?.() || [];
    const task = allTasks.find(t => t.id === id);
    if (task) {
      const updated = { ...task, ...updates, lastModified: new Date().toISOString() };
      const updatedTasks = allTasks.map(t => t.id === id ? updated : t);
      DM?.tasks?.setAll?.(updatedTasks);
    }
  });
  const addTask = addTaskProp || ((newTask) => {
    const allTasks = DM?.tasks?.getAll?.() || [];
    const taskWithId = { ...newTask, id: newTask.id || 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9) };
    DM?.tasks?.setAll?.([...allTasks, taskWithId]);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [apiKey, setApiKey] = useState(settings?.calendarSync?.apiKey || '');
  const [clientId, setClientId] = useState(settings?.calendarSync?.clientId || '');
  const [calendarId, setCalendarId] = useState(settings?.calendarSync?.calendarId || 'primary');
  const [bufferMinutes, setBufferMinutes] = useState(settings?.calendarSync?.bufferMinutes || 15);
  const [autoSync, setAutoSync] = useState(settings?.calendarSync?.autoSync !== false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      if (apiKey && clientId && window.gapi) {
        try {
          await initGoogleClient(apiKey, clientId);
          setIsConnected(isAuthenticated());
        } catch (error) {
          console.error('[CalendarSync] Failed to check auth:', error);
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    };
    checkAuth();
  }, [apiKey, clientId]);

  const handleConnect = async () => {
    if (!apiKey || !clientId) {
      notify?.('Please enter both API Key and Client ID', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await initGoogleClient(apiKey, clientId);
      await authenticateGoogle(clientId);
      setIsConnected(true);
      
      // Save settings
      setSettings({
        ...settings,
        calendarSync: {
          ...settings?.calendarSync,
          apiKey,
          clientId,
          calendarId,
          bufferMinutes,
          autoSync,
        }
      });
      
      notify?.('Successfully connected to Google Calendar!', 'success');
    } catch (error) {
      console.error('[CalendarSync] Connection error:', error);
      notify?.(`Failed to connect: ${error.message}`, 'error');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    signOut();
    setIsConnected(false);
    notify?.('Disconnected from Google Calendar', 'info');
  };

  const handleSyncToCalendar = async () => {
    if (!isConnected) {
      notify?.('Please connect to Google Calendar first', 'error');
      return;
    }

    setIsLoading(true);
    setSyncStatus('Syncing tasks to calendar...');
    
    try {
      const result = await syncAllTasksToCalendar(tasks, settings, async (taskId, updates) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await updateTask(taskId, { ...task, ...updates });
        }
      });
      
      setSyncStatus(`Synced ${result.synced} tasks. ${result.errors.length > 0 ? `${result.errors.length} errors.` : ''}`);
      notify?.(`Synced ${result.synced} tasks to calendar`, 'success');
    } catch (error) {
      console.error('[CalendarSync] Sync error:', error);
      setSyncStatus(`Error: ${error.message}`);
      notify?.(`Sync failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromCalendar = async () => {
    if (!isConnected) {
      notify?.('Please connect to Google Calendar first', 'error');
      return;
    }

    setIsLoading(true);
    setSyncStatus('Syncing calendar to tasks...');
    
    try {
      const result = await syncCalendarToTasks(tasks, settings, async (taskId, updates) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await updateTask(taskId, { ...task, ...updates });
        }
      });
      
      setSyncStatus(`Synced ${result.synced} tasks from calendar. ${result.errors.length > 0 ? `${result.errors.length} errors.` : ''}`);
      notify?.(`Synced ${result.synced} tasks from calendar`, 'success');
    } catch (error) {
      console.error('[CalendarSync] Sync error:', error);
      setSyncStatus(`Error: ${error.message}`);
      notify?.(`Sync failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCalendarEvents = async () => {
    if (!isConnected) {
      notify?.('Please connect to Google Calendar first', 'error');
      return;
    }

    if (!confirm('This will import Google Calendar events as new tasks. Events that are already synced from TaskTumbler will be skipped. Continue?')) {
      return;
    }

    setIsLoading(true);
    setSyncStatus('Importing calendar events as tasks...');
    
    try {
      const result = await importCalendarEventsAsTasks(settings, async (newTask) => {
        // Generate ID for new task if not provided
        const taskId = newTask.id || 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const taskWithId = { ...newTask, id: taskId };
        
        // Add task using addTask callback
        await addTask(taskWithId);
      }, tasks);
      
      setSyncStatus(`Imported ${result.imported} events as tasks. ${result.errors.length > 0 ? `${result.errors.length} errors.` : ''}`);
      notify?.(`Imported ${result.imported} calendar events as tasks`, 'success');
    } catch (error) {
      console.error('[CalendarSync] Import error:', error);
      setSyncStatus(`Error: ${error.message}`);
      notify?.(`Import failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
    setSettings({
      ...settings,
      calendarSync: {
        ...settings?.calendarSync,
        apiKey,
        clientId,
        calendarId,
        bufferMinutes: Number(bufferMinutes) || 15,
        autoSync,
      }
    });
    notify?.('Settings saved', 'success');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>
        📅 Google Calendar Sync
      </h2>
      
      <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary, #1a1a1a)', borderRadius: '8px' }}>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary, #999)' }}>
          Sync your time-blocked tasks with Google Calendar. Tasks with start dates and times will be synced as calendar events.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary, #666)' }}>
          To get started, you'll need to create a Google Cloud project and enable the Calendar API. 
          Get your API Key and OAuth 2.0 Client ID from the Google Cloud Console.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Google API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Google API Key"
          disabled={isConnected}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border, #333)',
            background: 'var(--bg-primary, #0a0a0a)',
            color: 'var(--text-primary, #fff)',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          OAuth 2.0 Client ID
        </label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Enter your OAuth 2.0 Client ID"
          disabled={isConnected}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border, #333)',
            background: 'var(--bg-primary, #0a0a0a)',
            color: 'var(--text-primary, #fff)',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Calendar ID
        </label>
        <input
          type="text"
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          placeholder="primary (or specific calendar ID)"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border, #333)',
            background: 'var(--bg-primary, #0a0a0a)',
            color: 'var(--text-primary, #fff)',
            fontSize: '14px',
          }}
        />
        <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-tertiary, #666)' }}>
          Use "primary" for your main calendar, or enter a specific calendar ID
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Buffer Time (minutes)
        </label>
        <input
          type="number"
          value={bufferMinutes}
          onChange={(e) => setBufferMinutes(Number(e.target.value) || 15)}
          min="0"
          max="120"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border, #333)',
            background: 'var(--bg-primary, #0a0a0a)',
            color: 'var(--text-primary, #fff)',
            fontSize: '14px',
          }}
        />
        <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-tertiary, #666)' }}>
          Time buffer added between tasks in calendar (default: 15 minutes)
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Auto-sync on task changes</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isLoading || !apiKey || !clientId}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent, #ff6b35)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading || !apiKey || !clientId ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect to Google Calendar'}
          </button>
        ) : (
          <>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid var(--border, #333)',
                background: 'transparent',
                color: 'var(--text-primary, #fff)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Disconnect
            </button>
            <button
              onClick={handleSyncToCalendar}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent, #ff6b35)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Syncing...' : 'Sync Tasks → Calendar'}
            </button>
            <button
              onClick={handleSyncFromCalendar}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent, #ff6b35)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Syncing...' : 'Sync Calendar → Tasks'}
            </button>
          </>
        )}
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid var(--border, #333)',
            background: 'transparent',
            color: 'var(--text-primary, #fff)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          Save Settings
        </button>
      </div>

      {isConnected && (
        <div style={{ 
          padding: '12px', 
          background: 'var(--success-bg, rgba(76, 175, 80, 0.1))', 
          borderRadius: '6px',
          color: 'var(--success-text, #4caf50)',
          fontSize: '14px',
        }}>
          ✓ Connected to Google Calendar
        </div>
      )}

      {syncStatus && (
        <div style={{ 
          marginTop: '12px',
          padding: '12px', 
          background: 'var(--info-bg, rgba(33, 150, 243, 0.1))', 
          borderRadius: '6px',
          color: 'var(--info-text, #2196f3)',
          fontSize: '14px',
        }}>
          {syncStatus}
        </div>
      )}
    </div>
  );
}

