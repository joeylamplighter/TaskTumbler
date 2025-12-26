// js/features/13-02-kanban.jsx
// ===========================================
// KANBAN TAB - Dedicated Kanban View
// ===========================================

import React from 'react'

(function() {
    const { useState, useEffect, useMemo } = React;

    function KanbanTab({ tasks, onView, onUpdate, categories, settings }) {
        // Get all active tasks (not completed, not archived)
        const TabUtils = window.TabUtils || {};
        const getActiveTasks = TabUtils.getActiveTasks || ((tasks) => (tasks||[]).filter(t => !t.archived && !t.completed));
        
        const activeTasks = useMemo(() => getActiveTasks(tasks), [tasks]);

        if (!window.KanbanView) {
            return (
                <div style={{padding: 20, textAlign: 'center', color: 'var(--text-light)'}}>
                    Kanban view not loaded. Please refresh the page.
                </div>
            );
        }

        return (
            <div style={{padding: '12px', height: 'calc(100vh - 120px)', overflow: 'hidden'}}>
                <div style={{marginBottom: 16}}>
                    <h2 style={{fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0}}>Kanban Board</h2>
                    <div style={{fontSize: 12, color: 'var(--text-light)', marginTop: 4}}>
                        {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <window.KanbanView tasks={activeTasks} onView={onView} onUpdate={onUpdate} />
            </div>
        );
    }

    window.KanbanTab = KanbanTab;
    console.log('✅ 13-02-kanban.jsx loaded');
})();

