// js/components/13-08-taskform-people.jsx
// ===========================================
// People Lite Hook (stub-safe)
// Updated: 2025-12-18 23:59 PT
// ===========================================
// This file is loaded by index.html for compatibility.
// Current TaskFormModal embeds People logic directly.
// Keep this file valid so Babel doesn't fail.

(function(){
  function useTaskFormPeopleLite(){
    const React = window.React;
    const { useState } = React;
    const [noop] = useState(false);
    return { noop };
  }
  window.useTaskFormPeopleLite = useTaskFormPeopleLite;
})();
