// js/13-09-stats.jsx
// ===========================================
// DATA TAB - Uses StatsTabLegacy from src/components/tabs
// ===========================================

import React from 'react'
import StatsTabLegacy from '../../src/components/tabs/StatsTabLegacy.jsx'

function StatsTab({ tasks = [], history = [], categories = [], settings, notify, locations: locationsProp, setLocations: setLocationsProp, onViewTask, userStats }) {
  // Map props from legacy app to StatsTabLegacy
  // Legacy app passes: tasks, history (as activities), userStats, onViewTask
  // StatsTabLegacy expects: tasks, history, categories, settings, notify, locations, setLocations, onViewTask
  
  // Get categories from DataManager if not provided
  const finalCategories = (() => {
    if (categories && Array.isArray(categories) && categories.length > 0) {
      return categories;
    }
    try {
      return window.DataManager?.categories?.getAll?.() || [];
    } catch {
      return [];
    }
  })();
  
  // Get settings from DataManager if not provided
  const finalSettings = (() => {
    if (settings && typeof settings === 'object') {
      return settings;
    }
    try {
      return window.DataManager?.settings?.get?.() || window.DEFAULT_SETTINGS || { theme: "dark", visibleTabs: {} };
    } catch {
      return { theme: "dark", visibleTabs: {} };
    }
  })();
  
  // Get notify function
  const finalNotify = (msg, icon) => {
    if (typeof notify === 'function') {
      notify(msg, icon);
    } else if (window.ToastManager && typeof window.ToastManager.show === 'function') {
      window.ToastManager.show(msg, icon || '📊');
    } else {
      console.log(`${icon || '📊'} ${msg}`);
    }
  };
  
  // Get locations from localStorage if not provided
  const finalLocations = (() => {
    if (locationsProp && Array.isArray(locationsProp) && locationsProp.length > 0) {
      return locationsProp;
    }
    try {
      if (typeof window.getSavedLocationsV1 === 'function') {
        return window.getSavedLocationsV1();
      }
      return JSON.parse(localStorage.getItem('savedLocations_v1') || '[]');
    } catch {
      return [];
    }
  })();
  
  const handleSetLocations = (newLocs) => {
    const val = typeof newLocs === 'function' ? newLocs(finalLocations) : newLocs;
    
    if (typeof setLocationsProp === 'function') {
      setLocationsProp(val);
    }
    try {
      if (typeof window.setSavedLocationsV1 === 'function') {
        window.setSavedLocationsV1(val);
      } else {
        localStorage.setItem('savedLocations_v1', JSON.stringify(val));
      }
      window.dispatchEvent(new Event('locations-updated'));
    } catch (e) {
      console.error('Error saving locations:', e);
    }
  };
  
  return (
    <StatsTabLegacy 
      tasks={tasks || []}
      history={history || []}
      categories={finalCategories}
      settings={finalSettings}
      notify={finalNotify}
      locations={finalLocations}
      setLocations={handleSetLocations}
      onViewTask={onViewTask}
    />
  );
}

window.StatsTab = StatsTab;
console.log('✅ 13-09-stats.jsx loaded (using StatsTabLegacy)');
