// !!TT/js/features/13-07-settings.jsx
// ===========================================
// SETTINGS TAB (SIMPLIFIED - HOLLOWED OUT FOR DEBUGGING)
// ===========================================

import React from 'react'

(function () {
  function SettingsTab({
    settings = {},
    setSettings,
    categories = [],
    setCategories,
    onExport,
    onImport,
    onLoadSamples,
    onFullReset,
    initialView,
    notify,
  }) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Settings</h2>
        <p>Settings tab is being rebuilt...</p>
      </div>
    );
  }

  window.SettingsTab = SettingsTab;
  console.log("✅ 13-07-settings.jsx loaded (simplified)");
})();
