// js/features/13-10-people-tab.jsx
// ===========================================
// PEOPLE TAB - Standalone tab for People management
// ===========================================

import React from 'react'

(function() {
    // Access PeopleManager from stats feature
    function PeopleTab({ tasks = [], history = [], categories = [], settings, notify, locations = [], setLocations = () => {}, onViewTask }) {
        const PeopleManager = window.PeopleManager;
        
        if (!PeopleManager) {
            return React.createElement('div', {
                style: { padding: 40, textAlign: 'center', color: 'var(--text-light)' }
            }, [
                React.createElement('div', { key: 'msg', style: { fontSize: 16, marginBottom: 12 } }, 'Loading People Manager...'),
                React.createElement('div', { key: 'hint', style: { fontSize: 12, opacity: 0.7 } }, 'Please ensure stats feature is loaded.')
            ]);
        }
        
        return React.createElement('div', { className: 'fade-in', style: { paddingBottom: 20 } },
            React.createElement(PeopleManager, {
                notify,
                history,
                tasks,
                locations,
                initialSelectedPersonName: null,
                onPersonSelected: () => {},
                onViewTask
            })
        );
    }
    
    window.PeopleTab = PeopleTab;
    console.log('✅ 13-10-people-tab.jsx loaded');
})();

