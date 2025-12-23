// js/components/13-08-taskform-persist.jsx
// ===========================================
// TaskFormModal Draft Persistence (localStorage default)
// Timestamp: 2025-12-19 22:05 PT
// ===========================================

(function () {
  const safeJsonParse = (s, fallback) => {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  const pickStorage = (prefer) => {
    // prefer: "local" | "session"
    try {
      if (prefer === "session") return window.sessionStorage;
      return window.localStorage;
    } catch {
      try { return window.localStorage; } catch {}
      try { return window.sessionStorage; } catch {}
      return null;
    }
  };

  /**
   * useModalDraftPersistence
   * Persists draft data keyed per task id (or "new")
   *
   * Usage (basic):
   *   const persist = window.useModalDraftPersistence({ key, data, setData, enabled:true, notify })
   *
   * Usage (with extras, e.g. locationInput):
   *   const persist = window.useModalDraftPersistence({
   *     key, data, setData, enabled:true, notify,
   *     extras: { locationInput },
   *     applyExtras: (savedExtras) => { setLocationInput(savedExtras.locationInput || "") }
   *   })
   */
  function useModalDraftPersistence({
    key,
    data,
    setData,
    enabled = true,
    notify,

    // Default persistent storage
    storage = "local", // "local" or "session"

    // Optional extras (non data state like locationInput)
    extras = null,
    applyExtras = null,

    // Optional: prevent restoring very old drafts (ms). null disables.
    maxAgeMs = null,
  }) {
    const React = window.React;
    const { useEffect, useMemo, useRef } = React;

    const storageKey = useMemo(() => {
      const k = (key && String(key)) ? String(key) : "taskform_new";
      return "TaskTumbler_draft_v2_" + k;
    }, [key]);

    const store = useMemo(() => pickStorage(storage), [storage]);

    const didHydrateRef = useRef(false);
    const didHydrateKeyRef = useRef("");
    const lastSavedRef = useRef("");

    // Hydrate once per storageKey
    useEffect(() => {
      if (!enabled) return;
      if (!store) return;

      // If key changed, allow re hydrate for the new key
      if (didHydrateKeyRef.current !== storageKey) {
        didHydrateRef.current = false;
        didHydrateKeyRef.current = storageKey;
        lastSavedRef.current = "";
      }

      if (didHydrateRef.current) return;
      didHydrateRef.current = true;

      const raw = store.getItem(storageKey);
      if (!raw) return;

      const saved = safeJsonParse(raw, null);
      if (!saved) return;

      // Back compat: old drafts may be a plain object of fields
      // New format: { _v:2, _ts:number, data:{...}, extras:{...} }
      let savedData = null;
      let savedExtras = null;
      let savedTs = null;

      if (saved && typeof saved === "object" && (saved._v === 2 || saved.data || saved.extras)) {
        savedData = saved.data && typeof saved.data === "object" ? saved.data : null;
        savedExtras = saved.extras && typeof saved.extras === "object" ? saved.extras : null;
        savedTs = typeof saved._ts === "number" ? saved._ts : null;
      } else if (saved && typeof saved === "object") {
        savedData = saved;
        savedExtras = null;
        savedTs = null;
      }

      if (maxAgeMs && savedTs && (Date.now() - savedTs > maxAgeMs)) {
        try { store.removeItem(storageKey); } catch {}
        return;
      }

      if (savedData && typeof savedData === "object") {
        setData((prev) => ({ ...prev, ...savedData }));
      }

      if (savedExtras && typeof applyExtras === "function") {
        try { applyExtras(savedExtras); } catch {}
      }

      notify?.("Draft restored", "💾");
    }, [enabled, store, storageKey, setData, notify, applyExtras, maxAgeMs]);

    // Persist on change (debounced)
    useEffect(() => {
      if (!enabled) return;
      if (!store) return;
      if (!didHydrateRef.current) return;

      const t = setTimeout(() => {
        try {
          const payload = {
            _v: 2,
            _ts: Date.now(),
            data: data || {},
            extras: extras || null,
          };

          const next = JSON.stringify(payload);
          if (next === lastSavedRef.current) return;

          lastSavedRef.current = next;
          store.setItem(storageKey, next);
        } catch {
          // ignore
        }
      }, 150);

      return () => clearTimeout(t);
    }, [enabled, store, storageKey, data, extras]);

    const clearDraft = () => {
      try { window.localStorage.removeItem(storageKey); } catch {}
      try { window.sessionStorage.removeItem(storageKey); } catch {}
    };

    return { storageKey, clearDraft, storage };
  }

  window.useModalDraftPersistence = useModalDraftPersistence;
})();
