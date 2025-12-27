// js/components/12-views.jsx
// ===========================================
// CORE UI SHELL AND VIEW COMPONENTS
// ===========================================

(function() {
    // Wait for React to be available (main.jsx sets window.React after imports are processed)
    function initViews() {
        if (typeof window === 'undefined' || !window.React) {
            // Retry after a short delay
            setTimeout(initViews, 50);
            return;
        }
        
        const React = window.React;
        const { useState, useEffect, useRef, useMemo } = React;

        // Constants for debouncing (inside initViews scope, accessible to all components)
        const TOGGLE_DEBOUNCE_MS = 150; // 150ms debounce (just enough to prevent double-clicks)
        const COMPLETION_ACTIVITY_COOLDOWN_MS = 2000; // 2 second cooldown for completion activities

        // ==========================================
        // VIEW TASK MODAL (Focus + Logging + Subtasks)
        // ==========================================
        function ViewTaskModal({ task, onClose, onEdit, onComplete, updateTask, goals, tasks, settings }) {
            // Debug: Check if updateTask is available
            if (!updateTask) {
                console.warn('[ViewTaskModal] updateTask prop is missing! Subtasks will not work.');
            }
            const [logInput, setLogInput] = useState('');
            const [newSubtask, setNewSubtask] = useState(''); 
            const [isTimerRunning, setIsTimerRunning] = useState(false);
            const [timerSeconds, setTimerSeconds] = useState(0);
            const [isFocusMode, setIsFocusMode] = useState(false);
            
            // Refs to prevent rapid-fire toggles and duplicate completion activities
            const lastToggleRef = useRef({ subId: null, timestamp: 0 });
            const completionActivityRef = useRef({ taskId: null, timestamp: 0 });
            // Ref to track the latest subtasks state to avoid race conditions
            const latestSubtasksRef = useRef([]);
            // Ref to track the actual completion state we've set (to avoid stale currentTask.completed)
            const taskCompletionStateRef = useRef(false);

            // Get the latest task from tasks array to ensure we have the most up-to-date data
            // Use useMemo to ensure it updates when tasks array changes
            // CRITICAL: Only depend on 'tasks' array, NOT 'task' prop, otherwise updates won't trigger re-render
            const currentTask = useMemo(() => {
                if (tasks && Array.isArray(tasks) && task?.id) {
                    return tasks.find(t => t.id === task.id) || task;
                }
                return task;
            }, [tasks, task?.id]);
            
            // Update refs when currentTask changes to keep them in sync
            useEffect(() => {
                if (currentTask?.subtasks) {
                    // Ensure all subtasks have stable IDs - add IDs to any that are missing
                    // These IDs will be persisted when the next updateTask call happens
                    const subtasksWithIds = currentTask.subtasks.map((s, index) => {
                        // If subtask has no id, title, or text, generate a stable ID based on index
                        if (!s.id && !s.title && !s.text) {
                            const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                            return { ...s, id: generateId('sub'), title: `Subtask ${index + 1}`, text: `Subtask ${index + 1}` };
                        }
                        // If subtask has title/text but no id, generate one based on content
                        if (!s.id && (s.title || s.text)) {
                            const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                            return { ...s, id: generateId('sub') };
                        }
                        return s;
                    });
                    latestSubtasksRef.current = subtasksWithIds;
                } else {
                    latestSubtasksRef.current = [];
                }
                if (currentTask?.completed !== undefined) {
                    taskCompletionStateRef.current = currentTask.completed;
                } else {
                    // Initialize from task prop if currentTask doesn't have completed yet
                    taskCompletionStateRef.current = task?.completed || false;
                }
            }, [currentTask?.subtasks, currentTask?.completed, task?.completed]);

            // ----------------------------------------------------
            // LOGIC: Subtask Stats & Actions
            // ----------------------------------------------------
            const totalSubtasks = (currentTask.subtasks || []).length;
            const completedSubtasks = (currentTask.subtasks || []).filter(s => s.completed).length;
            const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

            // Helper function to calculate progress based on subtasks
            const calculateProgressFromSubtasks = (subtasks) => {
                if (!subtasks || subtasks.length === 0) return 0;
                const completed = subtasks.filter(s => s.completed).length;
                return Math.round((completed / subtasks.length) * 100);
            };

            const toggleSubtask = (subId, e) => {
                // Stop event propagation to prevent any parent handlers
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                
                // Debounce: prevent rapid-fire toggles of the SAME subtask only
                // Allow different subtasks to be toggled quickly
                const now = Date.now();
                const lastToggle = lastToggleRef.current;
                if (lastToggle.subId === subId && 
                    (now - lastToggle.timestamp) < TOGGLE_DEBOUNCE_MS) {
                    console.log('[ViewTaskModal] Toggle debounced for same subtask:', subId);
                    return;
                }
                // Update ref for this subtask
                lastToggleRef.current = { subId, timestamp: now };
                
                console.log('[ViewTaskModal] toggleSubtask called:', { subId, updateTask: !!updateTask, currentTask: currentTask?.id });
                
                if (!updateTask) {
                    console.error('[ViewTaskModal] updateTask is not defined!');
                    return;
                }
                
                if (!currentTask || !currentTask.id) {
                    console.error('[ViewTaskModal] currentTask or currentTask.id is missing!');
                    return;
                }
                
                // Use ref to get the most up-to-date subtasks (avoids race conditions with rapid clicks)
                // Always prefer the ref, but fallback to currentTask.subtasks if ref is empty
                let currentSubtasks = latestSubtasksRef.current.length > 0 
                    ? latestSubtasksRef.current 
                    : (currentTask.subtasks || []);
                
                // Ensure we have the latest from currentTask if ref seems stale
                // This helps catch the last subtask that might not be in the ref yet
                if (currentTask.subtasks && currentTask.subtasks.length > currentSubtasks.length) {
                    currentSubtasks = currentTask.subtasks;
                    // Update ref immediately
                    latestSubtasksRef.current = currentSubtasks;
                }
                
                console.log('[ViewTaskModal] Current subtasks:', currentSubtasks, 'Looking for:', subId);
                
                // Find the subtask to toggle - try multiple matching strategies
                let subtaskToToggle = currentSubtasks.find(s => {
                    const sId = s.id || s.title || s.text;
                    return sId === subId;
                });
                
                // If not found by exact match, try finding by index (for last item edge cases)
                if (!subtaskToToggle && currentSubtasks.length > 0) {
                    // Try to match by checking if it's the last item
                    const lastIndex = currentSubtasks.length - 1;
                    const lastSubtask = currentSubtasks[lastIndex];
                    const lastSubtaskId = lastSubtask.id || lastSubtask.title || lastSubtask.text;
                    if (lastSubtaskId === subId || (!lastSubtaskId && lastIndex === currentSubtasks.length - 1)) {
                        subtaskToToggle = lastSubtask;
                    }
                }
                
                // Prevent toggling if subtask not found
                if (!subtaskToToggle) {
                    console.warn('[ViewTaskModal] Subtask not found:', subId);
                    return;
                }
                
                const updatedSubtasks = currentSubtasks.map(s => {
                    const sId = s.id || s.title || s.text;
                    if (sId === subId) {
                        const newCompleted = !s.completed;
                        console.log('[ViewTaskModal] Toggling subtask:', sId, 'from', s.completed, 'to', newCompleted);
                        return { ...s, completed: newCompleted };
                    }
                    return s;
                });
                console.log('[ViewTaskModal] Updated subtasks array:', JSON.stringify(updatedSubtasks));
                // Update ref immediately to prevent race conditions
                latestSubtasksRef.current = updatedSubtasks;
                const newProgress = calculateProgressFromSubtasks(updatedSubtasks);
                
                // Check if all subtasks are now completed
                const completedCount = updatedSubtasks.filter(s => s.completed).length;
                const allSubtasksCompleted = updatedSubtasks.length > 0 && completedCount === updatedSubtasks.length;
                
                console.log('[ViewTaskModal] Completion check:', {
                    totalSubtasks: updatedSubtasks.length,
                    completedCount,
                    allSubtasksCompleted,
                    currentTaskCompleted: currentTask.completed
                });
                
                // Check if auto-complete setting is enabled (defaults to true if not set)
                const autoCompleteEnabled = settings?.autoCompleteSubtask !== false;
                
                // Prepare the update object with subtasks and progress
                const taskUpdates = {
                    subtasks: updatedSubtasks,
                    progress: newProgress,
                    percentComplete: newProgress
                };
                
                // Handle auto-completion based on subtask state (only if setting enabled)
                // Use ref to get the actual completion state (avoids stale currentTask.completed)
                const wasCompleted = taskCompletionStateRef.current;
                
                if (autoCompleteEnabled) {
                    if (allSubtasksCompleted && !wasCompleted) {
                        // All subtasks are done → auto-complete the main task
                        console.log('[ViewTaskModal] Auto-completing task because all subtasks are done');
                        taskUpdates.completed = true;
                        taskUpdates.completedAt = new Date().toISOString();
                        // Update ref immediately to track the new state
                        taskCompletionStateRef.current = true;
                    } else if (!allSubtasksCompleted && wasCompleted) {
                        // At least one subtask is incomplete → uncomplete the main task
                        console.log('[ViewTaskModal] Uncompleting task because not all subtasks are done');
                        taskUpdates.completed = false;
                        taskUpdates.completedAt = null;
                        // Update ref immediately to track the new state
                        taskCompletionStateRef.current = false;
                        // Reset completion activity ref when uncompleting to allow new completion activity
                        completionActivityRef.current = { taskId: null, timestamp: 0 };
                    }
                } else {
                    console.log('[ViewTaskModal] Auto-complete is disabled');
                }
                
                // Update task with all changes in a single call
                console.log('[ViewTaskModal] Calling updateTask with:', { taskId: currentTask.id, updates: taskUpdates });
                updateTask(currentTask.id, taskUpdates);
                console.log('[ViewTaskModal] updateTask called successfully');
                
                // Trigger completion effects manually if we're completing the task (not uncompleting)
                // Use cooldown to prevent duplicate completion activities
                const shouldTriggerCompletion = allSubtasksCompleted && !wasCompleted && autoCompleteEnabled;
                const canAddCompletionActivity = !completionActivityRef.current.taskId || 
                    completionActivityRef.current.taskId !== currentTask.id ||
                    (now - completionActivityRef.current.timestamp) >= COMPLETION_ACTIVITY_COOLDOWN_MS;
                
                console.log('[ViewTaskModal] Completion activity check:', {
                    shouldTriggerCompletion,
                    canAddCompletionActivity,
                    lastActivityTaskId: completionActivityRef.current.taskId,
                    lastActivityTime: completionActivityRef.current.timestamp,
                    timeSinceLastActivity: now - completionActivityRef.current.timestamp
                });
                
                if (shouldTriggerCompletion && canAddCompletionActivity) {
                    completionActivityRef.current = { taskId: currentTask.id, timestamp: now };
                    
                    // Defer effects to next tick to avoid interfering with checkbox click
                    setTimeout(() => {
                        // Trigger notification and sound manually (don't call onComplete as it toggles)
                        if (window.notify) {
                            window.notify("Task Completed!", "🎉");
                        }
                        if (settings?.sound !== false && typeof window.SoundFX !== 'undefined') {
                            window.SoundFX.playComplete();
                        }
                        if (settings?.confetti && typeof window.fireSmartConfetti === 'function') {
                            window.fireSmartConfetti('taskComplete', settings);
                        }
                        // Add activity log (only once per cooldown period)
                        if (window.addActivity) {
                            window.addActivity({
                                taskId: currentTask.id,
                                title: currentTask.title,
                                type: "complete",
                                duration: 0,
                                timestamp: new Date().toISOString(),
                                people: Array.isArray(currentTask.people) ? currentTask.people : [],
                                category: currentTask.category || 'General',
                            });
                        }
                    }, 100); // Small delay to ensure checkbox click completes
                }
            };

        const deleteSubtask = (e, subId) => {
            e.stopPropagation();
            e.preventDefault();
            // Use ref to get most up-to-date subtasks, but fallback to currentTask
            let currentSubtasks = latestSubtasksRef.current.length > 0 
                ? latestSubtasksRef.current 
                : (currentTask.subtasks || []);
            
            // Ensure we have the latest
            if (currentTask.subtasks && currentTask.subtasks.length > currentSubtasks.length) {
                currentSubtasks = currentTask.subtasks;
            }
            
            // WARNING REMOVED: Instantly deletes the subtask
            const updatedSubtasks = currentSubtasks.filter(s => {
                const sId = s.id || s.title || s.text;
                return sId !== subId;
            });
            
            // Update ref immediately
            latestSubtasksRef.current = updatedSubtasks;
            
            const newProgress = calculateProgressFromSubtasks(updatedSubtasks);
            // Update both progress and percentComplete for compatibility
            updateTask(currentTask.id, { 
                subtasks: updatedSubtasks,
                progress: newProgress,
                percentComplete: newProgress
            });
        };

        const handleAddSubtask = () => {
            if (!newSubtask.trim()) return;
            const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            const newId = generateId('sub');
            // Saving as both title and text for compatibility
            const newItem = { id: newId, title: newSubtask.trim(), text: newSubtask.trim(), completed: false };
            // Use ref to get most up-to-date subtasks
            const currentSubtasks = latestSubtasksRef.current.length > 0 
                ? latestSubtasksRef.current 
                : (currentTask.subtasks || []);
            const updatedSubtasks = [...currentSubtasks, newItem];
            
            // Update ref immediately to prevent race conditions
            latestSubtasksRef.current = updatedSubtasks;
            
            // Recalculate progress when adding a new subtask (progress decreases if we had completed subtasks)
            const newProgress = calculateProgressFromSubtasks(updatedSubtasks);
            updateTask(currentTask.id, { 
                subtasks: updatedSubtasks,
                progress: newProgress,
                percentComplete: newProgress
            });
            setNewSubtask('');
        };

        // ----------------------------------------------------
        // LOGIC: Timer & Logging
        // ----------------------------------------------------
        useEffect(() => {
            let interval = null;
            if (isTimerRunning) {
                interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
            }
            return () => clearInterval(interval);
        }, [isTimerRunning]);

        const formatTime = (secs) => {
            const mins = Math.floor(secs / 60);
            const s = secs % 60;
            return `${mins}:${s < 10 ? '0' : ''}${s}`;
        };

        const getRelativeDate = (dateStr) => {
            if (!dateStr) return '';
            const diff = new Date(dateStr) - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (days === 0) return '(Today)';
            if (days === 1) return '(Tomorrow)';
            if (days < 0) return `(${Math.abs(days)} days ago)`;
            return `(in ${days} days)`;
        };

        const addLog = (text) => {
            const newLog = {
                id: window.generateId ? window.generateId('log') : 'log_' + Date.now(),
                text: text,
                timestamp: new Date().toISOString(),
                type: 'system_log'
            };
            const currentActivities = Array.isArray(currentTask.activities) ? currentTask.activities : [];
            updateTask(currentTask.id, { activities: [...currentActivities, newLog] });
        };

        const handleAddManualLog = () => {
            if (!logInput.trim()) return;
            addLog(logInput.trim());
            setLogInput('');
        };

        const toggleTimer = () => {
            const newState = !isTimerRunning;
            setIsTimerRunning(newState);
            if (newState) {
                addLog("Timer Started ⏱️");
            } else {
                addLog(`Timer Paused (Session: ${formatTime(timerSeconds)})`);
            }
        };

        const toggleFocusMode = (active) => {
            setIsFocusMode(active);
            if (active) {
                addLog("Entered Focus Mode 🧘");
            } else {
                addLog("Exited Focus Mode");
            }
        };

        // ==========================================
        // FOCUS MODE (ZEN DESIGN)
        // ==========================================
        if (isFocusMode) {
            return (
                <div className="modal-overlay" style={{
                    zIndex: 1200, 
                    background: 'var(--bg)', 
                    color: 'var(--text)', 
                    display:'flex', 
                    flexDirection:'column', 
                    alignItems:'center', 
                    justifyContent:'center'
                }}>
                    <div style={{position:'absolute', top: 30, right: 30}}>
                        <button 
                            onClick={() => toggleFocusMode(false)} 
                            style={{
                                background:'transparent', 
                                border:'1px solid var(--border)', 
                                color:'var(--text-light)', 
                                padding:'8px 20px', 
                                borderRadius: 30, 
                                cursor:'pointer',
                                fontSize: 12,
                                letterSpacing: 1,
                                textTransform: 'uppercase'
                            }}
                        >
                            Exit Focus
                        </button>
                    </div>
                    
                    <div style={{textAlign:'center', marginBottom: 60, opacity: 0.9}}>
                        <div style={{fontSize: 12, color: 'var(--primary)', fontWeight: 700, letterSpacing: 3, marginBottom: 16, textTransform: 'uppercase'}}>
                            Now Focusing On
                        </div>
                        <h1 style={{fontSize: 36, fontFamily:'Fredoka', margin: 0, maxWidth: '800px', lineHeight: 1.4, color: 'var(--text)'}}>
                            {currentTask.title}
                        </h1>
                    </div>

                    <div style={{fontSize: 120, fontFamily: 'monospace', fontWeight: 400, marginBottom: 60, color: isTimerRunning ? 'var(--text)' : 'var(--text-light)', textShadow: isTimerRunning ? '0 0 40px var(--primary-glow)' : 'none', transition: 'color 0.3s ease'}}>
                        {formatTime(timerSeconds)}
                    </div>

                    <button 
                        onClick={toggleTimer}
                        style={{width: 80, height: 80, borderRadius: '50%', border: '1px solid var(--border)', background: isTimerRunning ? 'var(--primary-light)' : 'transparent', color: 'var(--text)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'}}
                    >
                        {isTimerRunning ? '⏸' : '▶'}
                    </button>
                </div>
            );
        }

        // ==========================================
        // STANDARD VIEW MODAL
        // ==========================================
        return (
            <div className="modal-overlay" onClick={onClose} style={{zIndex: 1100, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)'}}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', width: '90%', borderRadius: '24px', padding: 0, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: 'var(--card)', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
                    
                    {/* SCROLLABLE CONTENT AREA */}
                    <div style={{overflowY: 'auto', flex: 1}}>
                        
                        {/* HEADER SECTION */}
                        <div style={{padding: '24px 24px 0 24px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 16}}>
                                <div style={{flex: 1}}>
                                    <div style={{display:'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap'}}>
                                        <span style={{fontSize: 11, fontWeight: 700, background: 'var(--input-bg)', color: 'var(--text-light)', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px'}}>{(currentTask.category || 'General').toUpperCase()}</span>
                                        <span style={{fontSize: 11, fontWeight: 700, background: currentTask.priority === 'Urgent' ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255, 159, 67, 0.2)', color: currentTask.priority === 'Urgent' ? '#ff7675' : '#ff9f43', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 4}}>{currentTask.priority === 'Urgent' ? '🔥' : '⚡'} {currentTask.priority || 'Medium'}</span>
                                    </div>
                                    <h2 style={{margin: 0, fontFamily: 'Fredoka', fontSize: 24, lineHeight: 1.2, color: 'var(--text)'}}>{currentTask.title}</h2>
                                    <div style={{display:'flex', gap: 16, marginTop: 12, fontSize: 13, color:'var(--text-light)', flexWrap: 'wrap'}}>
                                        {currentTask.location && <div style={{display:'flex', alignItems:'center', gap: 6}}><span>📍</span> {currentTask.location}</div>}
                                        {currentTask.people && (() => {
                                            // Helper to get person record by name
                                            const getPersonRecord = (personName) => {
                                                try {
                                                    const allPeople = window.DataManager?.people?.getAll?.() || 
                                                                    JSON.parse(localStorage.getItem('savedPeople') || '[]');
                                                    const name = typeof personName === 'object' ? personName.name : personName;
                                                    return allPeople.find(p => {
                                                        const displayName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ');
                                                        return displayName.toLowerCase() === name.toLowerCase();
                                                    }) || null;
                                                } catch {
                                                    return null;
                                                }
                                            };
                                            
                                            return (
                                                <div style={{display:'flex', alignItems:'center', gap: 6, flexWrap: 'wrap'}}>
                                                    <span>👥</span>
                                                    {Array.isArray(currentTask.people) ? (
                                                        currentTask.people.map((personName, idx) => {
                                                            const name = typeof personName === 'object' ? personName.name : personName;
                                                            const personRecord = getPersonRecord(name);
                                                            return (
                                                                <span key={idx} style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                                                                    <span
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            if (window.setTab) {
                                                                                window.setTab('stats');
                                                                            }
                                                                            window.location.hash = `#stats?subView=people&person=${encodeURIComponent(name)}`;
                                                                            window.dispatchEvent(new CustomEvent('navigate-to-person', { detail: { personName: name } }));
                                                                            window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                                                                        }}
                                                                        style={{
                                                                            color: 'var(--primary)',
                                                                            fontSize: 13,
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            textDecoration: 'underline',
                                                                            textDecorationColor: 'rgba(255, 107, 53, 0.5)',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.textDecorationColor = 'var(--primary)';
                                                                            e.target.style.opacity = 0.8;
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.textDecorationColor = 'rgba(255, 107, 53, 0.5)';
                                                                            e.target.style.opacity = 1;
                                                                        }}
                                                                        title={`Click to view ${name}'s contact info`}
                                                                    >
                                                                        {name}
                                                                    </span>
                                                                    {(personRecord?.externalId || personRecord?.compassCrmLink) && window.openCompass && (
                                                                        <span
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault();
                                                                                window.openCompass(personRecord, 'profile', name);
                                                                            }}
                                                                            style={{
                                                                                fontSize: 12,
                                                                                cursor: 'pointer',
                                                                                opacity: 0.7,
                                                                                transition: 'all 0.2s',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                width: 18,
                                                                                height: 18,
                                                                                borderRadius: 4,
                                                                                background: 'rgba(255, 107, 53, 0.15)',
                                                                                border: '1px solid rgba(255, 107, 53, 0.3)'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.opacity = 1;
                                                                                e.currentTarget.style.background = 'rgba(255, 107, 53, 0.25)';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.opacity = 0.7;
                                                                                e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                                                                            }}
                                                                            title="Open in Compass CRM"
                                                                        >
                                                                            🧭
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span style={{display:'inline-flex', alignItems:'center', gap: 4}}>
                                                            <span
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    const name = typeof currentTask.people === 'object' ? currentTask.people.name : currentTask.people;
                                                                    if (window.setTab) {
                                                                        window.setTab('stats');
                                                                    }
                                                                    window.location.hash = `#stats?subView=people&person=${encodeURIComponent(name)}`;
                                                                    window.dispatchEvent(new CustomEvent('navigate-to-person', { detail: { personName: name } }));
                                                                    window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
                                                                }}
                                                                style={{
                                                                    color: 'var(--primary)',
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    textDecoration: 'underline',
                                                                    textDecorationColor: 'rgba(255, 107, 53, 0.5)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.textDecorationColor = 'var(--primary)';
                                                                    e.target.style.opacity = 0.8;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.textDecorationColor = 'rgba(255, 107, 53, 0.5)';
                                                                    e.target.style.opacity = 1;
                                                                }}
                                                                title={`Click to view ${typeof currentTask.people === 'object' ? currentTask.people.name : currentTask.people}'s contact info`}
                                                            >
                                                                {typeof currentTask.people === 'object' ? currentTask.people.name : currentTask.people}
                                                            </span>
                                                            {(() => {
                                                                const name = typeof currentTask.people === 'object' ? currentTask.people.name : currentTask.people;
                                                                const personRecord = getPersonRecord(name);
                                                                return (personRecord?.externalId || personRecord?.compassCrmLink) && window.openCompass && (
                                                                    <span
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            window.openCompass(personRecord, 'profile', name);
                                                                        }}
                                                                        style={{
                                                                            fontSize: 12,
                                                                            cursor: 'pointer',
                                                                            opacity: 0.7,
                                                                            transition: 'all 0.2s',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            width: 18,
                                                                            height: 18,
                                                                            borderRadius: 4,
                                                                            background: 'rgba(255, 107, 53, 0.15)',
                                                                            border: '1px solid rgba(255, 107, 53, 0.3)'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.opacity = 1;
                                                                            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.25)';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.opacity = 0.7;
                                                                            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                                                                        }}
                                                                        title="Open in Compass CRM"
                                                                    >
                                                                        🧭
                                                                    </span>
                                                                );
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {currentTask.dueDate && <div style={{display:'flex', alignItems:'center', gap: 6}}><span>📅</span> {new Date(currentTask.dueDate).toLocaleDateString()} <span style={{opacity:0.6, fontSize:12}}>{getRelativeDate(currentTask.dueDate)}</span></div>}
                                    </div>
                                </div>
                                <button onClick={onClose} style={{background: 'transparent', border: 'none', color: 'var(--text-light)', fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: 8, marginTop: -8, marginRight: -8}}>×</button>
                            </div>

                            {/* TIMER & FOCUS BAR */}
                            <div style={{background:'linear-gradient(90deg, rgba(108, 92, 231, 0.1), rgba(162, 155, 254, 0.1))', padding: '12px 16px', borderRadius: 12, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20, border: '1px solid rgba(108, 92, 231, 0.2)'}}>
                                <div style={{display:'flex', alignItems:'center', gap: 12}}>
                                    <div style={{fontSize: 20, fontFamily:'monospace', fontWeight: 700, color: 'var(--primary)'}}>{formatTime(timerSeconds)}</div>
                                    <button onClick={toggleTimer} style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)'}}>{isTimerRunning ? '⏸' : '▶'}</button>
                                </div>
                                <button onClick={() => toggleFocusMode(true)} style={{background:'var(--primary)', border:'none', color:'white', padding:'6px 12px', borderRadius: 20, fontSize: 12, fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap: 6}}><span>🧘</span> Focus Mode</button>
                            </div>

                            {currentTask.description && (
                                <div style={{background: 'var(--input-bg)', border: '1px solid var(--border)', padding: 16, borderRadius: 16, marginBottom: 24, fontSize: 14, lineHeight: 1.5, color: 'var(--text-light)'}}>
                                    {currentTask.description}
                                </div>
                            )}

                            {/* SUBTASKS SECTION */}
                            <div style={{marginBottom: 24}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
                                    <h4 style={{fontSize: 11, fontWeight: 700, color: 'var(--text-light)', margin:0, textTransform: 'uppercase', letterSpacing: 1}}>Subtasks ({completedSubtasks}/{totalSubtasks})</h4>
                                    {totalSubtasks > 0 && <span style={{fontSize: 11, color: 'var(--primary)', fontWeight: 700}}>{progress}% Done</span>}
                                </div>

                                {totalSubtasks > 0 && (
                                    <div style={{height: 4, width: '100%', background: 'var(--input-bg)', borderRadius: 2, marginBottom: 16, overflow:'hidden'}}>
                                        <div style={{height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.3s ease'}}></div>
                                    </div>
                                )}

                                <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12}}>
                                    {(!currentTask.subtasks || currentTask.subtasks.length === 0) && (
                                        <div style={{fontSize: 13, color:'var(--text-light)', fontStyle:'italic', opacity:0.6}}>No subtasks yet. Add one below!</div>
                                    )}
                                    {(currentTask.subtasks || []).map((s, index) => {
                                        // Use stable ID - prefer id, then title, then text, then generate stable one based on index
                                        let subtaskId = s.id || s.title || s.text;
                                        if (!subtaskId) {
                                            // Generate a stable ID based on index to avoid random IDs on re-render
                                            const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                                            subtaskId = generateId('sub');
                                            // Also update the subtask in the array if possible (but don't mutate directly)
                                            // The useEffect will handle this on next render
                                        }
                                        // Use index as part of key for React stability, but use subtaskId for the click handler
                                        const stableKey = s.id || `subtask_${index}_${s.title || s.text || 'unnamed'}`;
                                        return (
                                        <div 
                                            key={stableKey} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                toggleSubtask(subtaskId, e);
                                            }} 
                                            style={{
                                                display:'flex', 
                                                alignItems:'center', 
                                                gap: 10, 
                                                padding: '10px 12px', 
                                                cursor:'pointer', 
                                                background: 'var(--input-bg)', 
                                                borderRadius: 12, 
                                                border: '1px solid var(--border)',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <div 
                                                style={{
                                                    width: 18, 
                                                    height: 18, 
                                                    borderRadius: 6, 
                                                    border: s.completed ? 'none' : '2px solid var(--text-light)', 
                                                    background: s.completed ? 'var(--primary)' : 'transparent', 
                                                    display:'flex', 
                                                    alignItems:'center', 
                                                    justifyContent:'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {s.completed && <span style={{fontSize: 12, color:'white', fontWeight:'bold'}}>✓</span>}
                                            </div>
                                            <span style={{
                                                fontSize: 14, 
                                                color: s.completed ? 'var(--text-muted)' : 'var(--text)', 
                                                textDecoration: s.completed ? 'line-through' : 'none', 
                                                flex: 1, 
                                                opacity: s.completed ? 0.7 : 1,
                                                pointerEvents: 'none'
                                            }}>
                                                {s.title || s.text || s.name || '(No Text)'}
                                            </span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    deleteSubtask(e, subtaskId);
                                                }} 
                                                style={{
                                                    background:'transparent', 
                                                    border:'none', 
                                                    cursor:'pointer', 
                                                    fontSize: 14, 
                                                    padding: 4, 
                                                    opacity: 0.5, 
                                                    outline:'none',
                                                    flexShrink: 0
                                                }} 
                                                title="Delete subtask"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>

                                {/* ADD SUBTASK INPUT */}
                                <div style={{display:'flex', gap: 8}}>
                                    <input 
                                        type="text" 
                                        placeholder="+ Add a subtask..." 
                                        value={newSubtask}
                                        onChange={(e) => setNewSubtask(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                        style={{flex: 1, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 12, padding: '8px 12px', color: 'var(--text)', fontSize: 13}}
                                    />
                                    {newSubtask.trim() && (
                                        <button onClick={handleAddSubtask} style={{background:'var(--primary)', border:'none', borderRadius: 8, color:'white', padding:'0 12px', cursor:'pointer', fontSize: 12, fontWeight:'bold'}}>Add</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* LOGS SECTION */}
                        <div style={{background: 'var(--input-bg)', borderTop: '1px solid var(--border)', padding: '20px 24px'}}>
                            <h4 style={{fontSize: 11, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1}}>🕒 Quick Log & Notes</h4>
                            <div style={{display: 'flex', gap: 10, marginBottom: 16}}>
                                <input 
                                    className="f-input" 
                                    style={{margin: 0, flex: 1, fontSize: 14, borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border)', padding: '10px 14px', color: 'var(--text)'}} 
                                    placeholder="Add a note..." 
                                    value={logInput}
                                    onChange={e => setLogInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddManualLog()}
                                />
                                <button onClick={handleAddManualLog} style={{padding: '0 20px', background: 'var(--primary)', color: 'var(--text)', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer'}}>Log</button>
                            </div>
                            <div style={{maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4}}>
                                {(currentTask.activities || []).length === 0 && <div style={{fontSize: 12, color: 'var(--text-light)', opacity: 0.5, fontStyle: 'italic'}}>No activity recorded yet.</div>}
                                {(currentTask.activities || []).slice().reverse().map(log => (
                                    <div key={log.id} style={{fontSize: 13, display: 'flex', gap: 10}}>
                                        <span style={{color: 'var(--primary)', fontWeight: 700, fontSize: 11, minWidth: 50, paddingTop: 3}}>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span style={{color: 'var(--text-light)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: 8, flex: 1}}>{log.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div style={{padding: '20px 24px', borderTop: '1px solid var(--border)', display:'flex', gap: 12, background: 'var(--card)', flexShrink: 0}}>
                        <button onClick={() => onEdit(currentTask)} style={{flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)', borderRadius: 12, fontWeight: 600, cursor: 'pointer'}}>Edit Details</button>
                        <button onClick={() => { onComplete(currentTask.id); onClose(); }} style={{flex: 2, padding: '12px', background: 'var(--primary)', boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)', border: 'none', color: 'white', borderRadius: 12, fontWeight: 'bold', fontSize: 14, cursor: 'pointer'}}>✓ Complete Task</button>
                    </div>
                </div>
            </div>
        );
    }
    window.ViewTaskModal = ViewTaskModal;

    // ==========================================
    // CALENDAR VIEW
    // ==========================================
    function CalendarView({ tasks, onView }) {
        const [date, setDate] = useState(new Date());
        const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
        
        const today = new Date();
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const getTasksForDate = (dateStr) => {
            return tasks.filter(t => {
                // Check both startDate and dueDate
                const taskDate = t.startDate || t.dueDate || t.due || t.dueAt || t.dueDateTime;
                if (!taskDate) return false;
                
                // Handle different date formats
                let taskDateStr = '';
                if (typeof taskDate === 'string') {
                    // Extract YYYY-MM-DD from various formats
                    const match = taskDate.match(/(\d{4}-\d{2}-\d{2})/);
                    if (match) {
                        taskDateStr = match[1];
                    } else {
                        // Try parsing as date
                        const d = new Date(taskDate);
                        if (!isNaN(d.getTime())) {
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            taskDateStr = `${year}-${month}-${day}`;
                        }
                    }
                } else if (typeof taskDate === 'number') {
                    const d = new Date(taskDate);
                    if (!isNaN(d.getTime())) {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        taskDateStr = `${year}-${month}-${day}`;
                    }
                } else if (taskDate instanceof Date) {
                    const year = taskDate.getFullYear();
                    const month = String(taskDate.getMonth() + 1).padStart(2, '0');
                    const day = String(taskDate.getDate()).padStart(2, '0');
                    taskDateStr = `${year}-${month}-${day}`;
                }
                
                return taskDateStr === dateStr;
            });
        };
        
        const isToday = (d) => {
            return formatDate(d) === formatDate(today);
        };
        
        // Month view
        const getMonthDays = () => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const firstDay = new Date(year, month, 1);
            const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            const days = [];
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < firstDayOfWeek; i++) {
                days.push(null);
            }
            // Add all days of the month
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                const dateStr = formatDate(d);
                days.push({
                    date: d,
                    day: i,
                    tasks: getTasksForDate(dateStr),
                    isToday: isToday(d),
                    dateStr: dateStr
                });
            }
            return days;
        };
        
        // Week view
        const getWeekDays = () => {
            const startOfWeek = new Date(date);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day; // Get Sunday of this week
            startOfWeek.setDate(diff);
            
            const weekDays = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                const dateStr = formatDate(d);
                weekDays.push({
                    date: d,
                    day: d.getDate(),
                    dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    tasks: getTasksForDate(dateStr),
                    isToday: isToday(d),
                    dateStr: dateStr
                });
            }
            return weekDays;
        };
        
        // Day view
        const getDayData = () => {
            const dateStr = formatDate(date);
            return {
                date: date,
                day: date.getDate(),
                dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
                tasks: getTasksForDate(dateStr),
                isToday: isToday(date),
                dateStr: dateStr
            };
        };
        
        const navigate = (delta) => {
            if (viewMode === 'month') {
                setDate(new Date(date.getFullYear(), date.getMonth() + delta, 1));
            } else if (viewMode === 'week') {
                const newDate = new Date(date);
                newDate.setDate(date.getDate() + (delta * 7));
                setDate(newDate);
            } else { // day
                const newDate = new Date(date);
                newDate.setDate(date.getDate() + delta);
                setDate(newDate);
            }
        };
        
        const goToToday = () => {
            setDate(new Date());
        };
        
        const renderMonthView = () => {
            const days = getMonthDays();
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            return (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 0,
                        borderBottom: '1px solid var(--border)',
                        marginBottom: 0
                    }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <div key={idx} style={{
                                textAlign: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--text-light)',
                                padding: '12px 8px',
                                borderRight: idx < 6 ? '1px solid var(--border)' : 'none'
                            }}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 0
                    }}>
                        {days.map((d, i) => {
                            if (!d) {
                                return (
                                    <div key={`empty-${i}`} style={{
                                        minHeight: '100px',
                                        minWidth: 0,
                                        width: '100%',
                                        borderRight: (i % 7) < 6 ? '1px solid var(--border)' : 'none',
                                        borderBottom: '1px solid var(--border)'
                                    }} />
                                );
                            }
                            
                            const col = i % 7;
                            return (
                                <div
                                    key={i}
                                    onClick={() => d.tasks.length > 0 && d.tasks[0] && onView(d.tasks[0])}
                                    style={{
                                        minHeight: '120px',
                                        minWidth: 0,
                                        width: '100%',
                                        padding: '10px',
                                        borderRight: col < 6 ? '1px solid var(--border)' : 'none',
                                        borderBottom: '1px solid var(--border)',
                                        background: d.isToday ? 'rgba(255, 107, 53, 0.08)' : 'transparent',
                                        cursor: d.tasks.length > 0 ? 'pointer' : 'default',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (d.tasks.length > 0) {
                                            e.currentTarget.style.background = d.isToday 
                                                ? 'rgba(255, 107, 53, 0.15)' 
                                                : 'var(--input-bg)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = d.isToday 
                                            ? 'rgba(255, 107, 53, 0.1)' 
                                            : 'transparent';
                                    }}
                                >
                                    <div style={{
                                        fontSize: 15,
                                        fontWeight: d.isToday ? 800 : 600,
                                        color: d.isToday ? 'var(--primary)' : 'var(--text)',
                                        marginBottom: '8px',
                                        lineHeight: '1.2'
                                    }}>
                                        {d.day}
                                    </div>
                                    {d.tasks.length > 0 && (
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            {d.tasks.slice(0, 3).map(t => (
                                                <div
                                                    key={t.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onView(t);
                                                    }}
                                                    style={{
                                                        fontSize: 11,
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        background: t.priority === 'Urgent' 
                                                            ? 'rgba(255, 118, 117, 0.25)' 
                                                            : t.priority === 'High'
                                                            ? 'rgba(255, 159, 67, 0.25)'
                                                            : 'rgba(255, 159, 67, 0.15)',
                                                        color: 'var(--text)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'pointer',
                                                        border: `1px solid ${t.priority === 'Urgent' ? 'rgba(255, 118, 117, 0.4)' : t.priority === 'High' ? 'rgba(255, 159, 67, 0.4)' : 'rgba(255, 159, 67, 0.3)'}`,
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'scale(1.02)';
                                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                                    }}
                                                    title={t.title}
                                                >
                                                    {t.title}
                                                </div>
                                            ))}
                                            {d.tasks.length > 3 && (
                                                <div style={{
                                                    fontSize: 9,
                                                    color: 'var(--text-light)',
                                                    textAlign: 'center',
                                                    padding: '2px'
                                                }}>
                                                    +{d.tasks.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            );
        };
        
        const renderWeekView = () => {
            const weekDays = getWeekDays();
            const weekRange = `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            
            return (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '12px',
                    height: 'calc(100vh - 250px)'
                }}>
                    {weekDays.map((d, i) => (
                        <div
                            key={i}
                            style={{
                                border: `2px solid ${d.isToday ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: '8px',
                                padding: '12px',
                                background: d.isToday ? 'rgba(255, 107, 53, 0.1)' : 'var(--card)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--text-light)',
                                marginBottom: '4px'
                            }}>
                                {d.dayName}
                            </div>
                            <div style={{
                                fontSize: 18,
                                fontWeight: d.isToday ? 800 : 600,
                                color: d.isToday ? 'var(--primary)' : 'var(--text)',
                                marginBottom: '12px'
                            }}>
                                {d.day}
                            </div>
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                {d.tasks.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => onView(t)}
                                        style={{
                                            fontSize: 11,
                                            padding: '8px',
                                            borderRadius: '6px',
                                            background: t.priority === 'Urgent' 
                                                ? 'rgba(255, 118, 117, 0.2)' 
                                                : t.priority === 'High'
                                                ? 'rgba(255, 159, 67, 0.2)'
                                                : 'var(--input-bg)',
                                            color: 'var(--text)',
                                            cursor: 'pointer',
                                            border: `1px solid ${t.priority === 'Urgent' ? 'rgba(255, 118, 117, 0.3)' : 'var(--border-light)'}`
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.title}</div>
                                        {t.category && (
                                            <div style={{ fontSize: 9, color: 'var(--text-light)' }}>{t.category}</div>
                                        )}
                                    </div>
                                ))}
                                {d.tasks.length === 0 && (
                                    <div style={{
                                        fontSize: 11,
                                        color: 'var(--text-light)',
                                        textAlign: 'center',
                                        padding: '20px 0',
                                        opacity: 0.5
                                    }}>
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        };
        
        const renderDayView = () => {
            const dayData = getDayData();
            const dayName = dayData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            
            return (
                <div style={{
                    padding: '20px',
                    height: 'calc(100vh - 250px)',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: 'var(--text)',
                        marginBottom: '20px'
                    }}>
                        {dayName}
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {dayData.tasks.map(t => (
                            <div
                                key={t.id}
                                onClick={() => onView(t)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    background: t.priority === 'Urgent' 
                                        ? 'rgba(255, 118, 117, 0.15)' 
                                        : t.priority === 'High'
                                        ? 'rgba(255, 159, 67, 0.15)'
                                        : 'var(--card)',
                                    border: `1px solid ${t.priority === 'Urgent' ? 'rgba(255, 118, 117, 0.3)' : 'var(--border)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                    marginBottom: '8px'
                                }}>
                                    {t.title}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    {t.category && (
                                        <span style={{
                                            fontSize: 11,
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-light)'
                                        }}>
                                            {t.category}
                                        </span>
                                    )}
                                    {t.priority && (
                                        <span style={{
                                            fontSize: 11,
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            background: t.priority === 'Urgent' 
                                                ? 'rgba(255, 118, 117, 0.2)' 
                                                : 'rgba(255, 159, 67, 0.2)',
                                            color: t.priority === 'Urgent' ? '#ff7675' : '#ff9f43',
                                            fontWeight: 600
                                        }}>
                                            {t.priority}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {dayData.tasks.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                color: 'var(--text-light)',
                                opacity: 0.5
                            }}>
                                No tasks for this day
                            </div>
                        )}
                    </div>
                </div>
            );
        };
        
        const getTitle = () => {
            if (viewMode === 'month') {
                return date.toLocaleString('default', { month: 'long', year: 'numeric' });
            } else if (viewMode === 'week') {
                const weekDays = getWeekDays();
                return `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            } else {
                return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            }
        };

        return (
            <div style={{
                padding: '20px',
                background: 'var(--bg)',
                minHeight: 'calc(100vh - 120px)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                            onClick={() => navigate(-1)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--card)',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 600
                            }}
                        >
                            ←
                        </button>
                        <h2 style={{
                            margin: 0,
                            fontSize: 20,
                            fontWeight: 700,
                            color: 'var(--text)',
                            minWidth: '200px',
                            textAlign: 'center'
                        }}>
                            {getTitle()}
                        </h2>
                        <button 
                            onClick={() => navigate(1)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--card)',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 600
                            }}
                        >
                            →
                        </button>
                    </div>
                    
                    {/* View switcher */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'var(--input-bg)',
                        padding: '4px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                    }}>
                        {['day', 'week', 'month'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: viewMode === mode ? 'var(--primary)' : 'transparent',
                                    color: viewMode === mode ? '#fff' : 'var(--text)',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        onClick={goToToday}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                        }}
                    >
                        Today
                    </button>
                </div>

                {/* Calendar content */}
                <div style={{
                    background: 'var(--card)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    overflow: 'hidden'
                }}>
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'day' && renderDayView()}
                </div>
            </div>
        );
    }
    window.CalendarView = CalendarView;

    // ==========================================
    // KANBAN VIEW (Status-based columns)
    // ==========================================
    function KanbanView({ tasks, onView, onUpdate }) {
        const cols = [
            { id: 'todo', label: 'To Do', status: null },
            { id: 'inprogress', label: 'In Progress', status: 'inprogress' },
            { id: 'done', label: 'Done', status: 'done' }
        ];

        const getTasksForColumn = (col) => {
            if (col.id === 'done') {
                return tasks.filter(t => t.completed);
            } else if (col.id === 'inprogress') {
                return tasks.filter(t => !t.completed && (t.status === 'inprogress' || t.percentComplete > 0 && t.percentComplete < 100));
            } else {
                return tasks.filter(t => !t.completed && t.status !== 'inprogress' && (!t.percentComplete || t.percentComplete === 0));
            }
        };

        const handleDragStart = (e, task) => {
            e.dataTransfer.setData('taskId', task.id);
            e.dataTransfer.effectAllowed = 'move';
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = (e, targetCol) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('taskId');
            const task = tasks.find(t => t.id === taskId);
            if (!task || !onUpdate) return;

            if (targetCol.id === 'done') {
                onUpdate(taskId, { completed: true });
            } else if (targetCol.id === 'inprogress') {
                onUpdate(taskId, { completed: false, status: 'inprogress', percentComplete: 50 });
            } else {
                onUpdate(taskId, { completed: false, status: null, percentComplete: 0 });
            }
        };

        return (
            <div style={{display:'flex', gap:12, overflowX:'auto', paddingBottom:10, height:'calc(100vh - 220px)', alignItems:'flex-start', padding: '12px'}}>
                {cols.map(col => {
                    const colTasks = getTasksForColumn(col);
                    return (
                        <div 
                            key={col.id} 
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col)}
                            style={{
                                minWidth: '280px', 
                                flex: 1, 
                                background: 'var(--card)', 
                                padding: 12, 
                                borderRadius: 16, 
                                border: '1px solid var(--border)',
                                maxHeight: '100%',
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                                <h4 style={{fontSize: 13, color: 'var(--text)', fontWeight: 800, letterSpacing: 0.5, margin: 0}}>{col.label}</h4>
                                <span style={{fontSize: 11, color: 'var(--text-light)', background: 'var(--input-bg)', padding: '2px 8px', borderRadius: 12}}>{colTasks.length}</span>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                                {colTasks.map(t => (
                                    <div 
                                        key={t.id} 
                                        draggable={!!onUpdate}
                                        onDragStart={(e) => handleDragStart(e, t)}
                                        onClick={() => onView(t)} 
                                        style={{
                                            background: 'var(--input-bg)', 
                                            padding: 12, 
                                            borderRadius: 10, 
                                            cursor: 'pointer', 
                                            fontSize: 13, 
                                            border: '1px solid var(--border-light)', 
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }}
                                    >
                                        <div style={{fontWeight: 600, color: 'var(--text)', marginBottom: 6}}>{t.title}</div>
                                        {t.category && (
                                            <div style={{fontSize: 10, color: 'var(--text-light)', marginBottom: 4, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                                                <span style={{background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4}}>{t.category}</span>
                                                {t.priority && (
                                                    <span style={{
                                                        background: t.priority === 'Urgent' ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255, 159, 67, 0.2)',
                                                        color: t.priority === 'Urgent' ? '#ff7675' : '#ff9f43',
                                                        padding: '2px 6px', 
                                                        borderRadius: 4,
                                                        fontSize: 9,
                                                        fontWeight: 700
                                                    }}>{t.priority}</span>
                                                )}
                                            </div>
                                        )}
                                        {t.dueDate && (
                                            <div style={{fontSize: 10, color: 'var(--text-light)', marginTop: 4}}>📅 {t.dueDate}</div>
                                        )}
                                    </div>
                                ))}
                                {colTasks.length === 0 && (
                                    <div style={{fontSize: 11, color: 'var(--text-light)', textAlign: 'center', padding: 20, opacity: 0.5}}>No tasks</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
    window.KanbanView = KanbanView;

    // ==========================================
    // BOARD VIEW (Priority-based - kept for backward compatibility)
    // ==========================================
    function BoardView({ tasks, onView }) {
        const cols = ['Urgent', 'High', 'Medium', 'Low'];
        return (
            <div style={{display:'flex', gap:12, overflowX:'auto', paddingBottom:10, height:'calc(100vh - 220px)', alignItems:'flex-start', padding: '12px'}}>
                {cols.map(c => (
                    <div key={c} style={{minWidth: '220px', flex: 1, background: 'var(--card)', padding: 12, borderRadius: 16, border: '1px solid var(--border)'}}>
                        <h4 style={{fontSize: 12, marginBottom: 12, color: 'var(--text-light)', fontWeight: 800, letterSpacing: 0.5}}>{c.toUpperCase()}</h4>
                        {tasks.filter(t => t.priority === c && !t.completed).map(t => (
                            <div key={t.id} onClick={() => onView(t)} style={{background: 'var(--input-bg)', padding: 10, marginBottom: 8, borderRadius: 10, cursor: 'pointer', fontSize: 13, border: '1px solid var(--border-light)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                                <div style={{fontWeight: 600, color: 'var(--text)'}}>{t.title}</div>
                                {t.category && <div style={{fontSize: 10, color: 'var(--text-light)', marginTop: 4}}>{t.category}</div>}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
    window.BoardView = BoardView;

    console.log('✅ Views loaded: Subtasks update instant delete (no warn) & clean focus');
    } // End of initViews function
    
    // Start initialization (will retry if React not ready)
    initViews();
})();