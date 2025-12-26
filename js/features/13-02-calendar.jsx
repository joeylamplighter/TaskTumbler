// js/features/13-02-calendar.jsx
// ===========================================
// CALENDAR TAB - Dedicated Calendar View
// ===========================================

import React from 'react'

(function() {
    const { useState, useEffect, useMemo } = React;

    function CalendarTab({ tasks, onView, categories, settings }) {
        // Get all tasks with due dates (not archived)
        const TabUtils = window.TabUtils || {};
        const getActiveTasks = TabUtils.getActiveTasks || ((tasks) => (tasks||[]).filter(t => !t.archived && !t.completed));
        const getCompletedTasks = TabUtils.getCompletedTasks || ((tasks) => (tasks||[]).filter(t => t.completed));
        
        // Show all tasks (active and completed) in calendar
        const allTasks = useMemo(() => {
            const active = getActiveTasks(tasks);
            const completed = getCompletedTasks(tasks);
            // Show tasks with either startDate or dueDate
            return [...active, ...completed].filter(t => {
                return t.startDate || t.dueDate || t.due || t.dueAt || t.dueDateTime;
            });
        }, [tasks]);

        if (!window.CalendarView) {
            return (
                <div style={{padding: 20, textAlign: 'center', color: 'var(--text-light)'}}>
                    Calendar view not loaded. Please refresh the page.
                </div>
            );
        }

        return (
            <div style={{padding: '12px', height: 'calc(100vh - 120px)', overflow: 'auto'}}>
                <div style={{marginBottom: 16}}>
                    <h2 style={{fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0}}>Calendar</h2>
                    <div style={{fontSize: 12, color: 'var(--text-light)', marginTop: 4}}>
                        {allTasks.length} task{allTasks.length !== 1 ? 's' : ''} with due dates
                    </div>
                </div>
                <window.CalendarView tasks={allTasks} onView={onView} />
            </div>
        );
    }

    window.CalendarTab = CalendarTab;
    console.log('✅ 13-02-calendar.jsx loaded');
})();

