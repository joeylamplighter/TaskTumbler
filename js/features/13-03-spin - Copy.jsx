// js/features/13-03-spin.jsx
// Updated: 2025-12-21 (Fixed Duration Setting + Clean Winner Popup)
// ===========================================
// SPIN TAB
// ===========================================

(function () {
  const { useState, useEffect, useMemo, useRef } = React;
  const ReactDOM = window.ReactDOM;

  // ---------- 1. SHARED GLOW BUTTON COMPONENT ----------
  const useGlowButton = (value, isActive, icon, title, onClick) => {
      const btnRef = useRef(null);
      
      const btnStyle = { 
          position: 'relative',
          background: 'none', 
          border: 'none', cursor: 'pointer', fontSize: 20, padding: 8, borderRadius: 8,
          color: isActive ? 'var(--primary)' : 'var(--text)',
          textShadow: isActive ? '0 0 8px var(--primary)' : 'none',
          filter: isActive ? 'drop-shadow(0 0 2px var(--primary))' : 'none',
          transition: 'all 0.2s ease', outline: 'none', boxShadow: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
      };

      const badgeStyle = {
          position: 'absolute', top: 0, right: 0,
          background: 'var(--primary)', color: '#fff',
          fontSize: 9, fontWeight: 800,
          minWidth: 14, height: 14, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--card)', 
          pointerEvents: 'none',
          textShadow: 'none', filter: 'none' 
      };

      const render = (
          <button ref={btnRef} onClick={onClick} style={btnStyle} title={title}>
              {icon}
              {value && <span style={badgeStyle}>{value}</span>}
          </button>
      );

      return { btnRef, render };
  };

  // ---------- 2. DATE FILTER ----------
  function DateFilterButton({ value, onChange }) {
      const [open, setOpen] = useState(false);
      const { btnRef, render } = useGlowButton(null, value !== 'Any', '📅', `Due: ${value}`, () => setOpen(!open));
      const [pos, setPos] = useState({ top: 0, left: 0 });
      const options = ['Any', 'Overdue', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month'];

      useEffect(() => {
          if (!open || !btnRef.current) return;
          const rect = btnRef.current.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          const clickOut = (e) => { if (!btnRef.current.contains(e.target) && !e.target.closest('.pop-menu')) setOpen(false); };
          window.addEventListener('mousedown', clickOut); return () => window.removeEventListener('mousedown', clickOut);
      }, [open]);

      return (
          <>
              {render}
              {open && ReactDOM.createPortal(
                  <div className="pop-menu" style={{
                      position: 'fixed', top: pos.top, left: pos.left, zIndex: 999999,
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: 140, display:'flex', flexDirection:'column', gap:2
                  }}>
                      {options.map(opt => (
                          <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} 
                              style={{ textAlign:'left', padding:'8px 12px', background: value===opt?'var(--primary)':'transparent', color: value===opt?'#fff':'var(--text)', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight: value===opt?700:500 }}>
                              {opt}
                          </button>
                      ))}
                  </div>, document.body
              )}
          </>
      );
  }

  // ---------- 3. DURATION FILTER ----------
  function DurationFilterButton({ value, onChange }) {
      const [open, setOpen] = useState(false);
      const { btnRef, render } = useGlowButton(null, value !== 'Any', '⏱️', `Time: ${value}`, () => setOpen(!open));
      const [pos, setPos] = useState({ top: 0, left: 0 });
      const options = ['Any', '< 5m', '< 15m', '< 30m', '< 60m', '> 1h'];

      useEffect(() => {
          if (!open || !btnRef.current) return;
          const rect = btnRef.current.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          const clickOut = (e) => { if (!btnRef.current.contains(e.target) && !e.target.closest('.pop-menu')) setOpen(false); };
          window.addEventListener('mousedown', clickOut); return () => window.removeEventListener('mousedown', clickOut);
      }, [open]);

      return (
          <>
              {render}
              {open && ReactDOM.createPortal(
                  <div className="pop-menu" style={{
                      position: 'fixed', top: pos.top, left: pos.left, zIndex: 999999,
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: 120, display:'flex', flexDirection:'column', gap:2
                  }}>
                      {options.map(opt => (
                          <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} 
                              style={{ textAlign:'left', padding:'8px 12px', background: value===opt?'var(--primary)':'transparent', color: value===opt?'#fff':'var(--text)', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight: value===opt?700:500 }}>
                              {opt}
                          </button>
                      ))}
                  </div>, document.body
              )}
          </>
      );
  }

  // ---------- 4. MULTI-SELECT FILTER ----------
  function MultiSelectButton({ icon, title, options, selected, onChange }) {
      const [open, setOpen] = useState(false);
      const count = selected.length > 0 && selected.length < options.length ? selected.length : null;
      const { btnRef, render } = useGlowButton(count, count !== null, icon, title, () => setOpen(!open));
      const [pos, setPos] = useState({ top: 0, left: 0 });

      useEffect(() => {
          if (!open || !btnRef.current) return;
          const rect = btnRef.current.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          const clickOut = (e) => { if (!btnRef.current.contains(e.target) && !e.target.closest('.pop-menu')) setOpen(false); };
          window.addEventListener('mousedown', clickOut); return () => window.removeEventListener('mousedown', clickOut);
      }, [open]);

      const toggle = (item) => {
          if (selected.includes(item)) onChange(selected.filter(i => i !== item));
          else onChange([...selected, item]);
      };

      const selectAll = () => onChange([]); 

      return (
          <>
              {render}
              {open && ReactDOM.createPortal(
                  <div className="pop-menu" style={{
                      position: 'fixed', top: pos.top, left: pos.left, zIndex: 999999,
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: 180, maxHeight: 300, overflowY:'auto'
                  }}>
                      <div style={{display:'flex', justifyContent:'space-between', paddingBottom:6, borderBottom:'1px solid var(--border)', marginBottom:6}}>
                          <span style={{fontSize:11, fontWeight:800, color:'var(--text-light)', textTransform:'uppercase'}}>{title}</span>
                          <button onClick={selectAll} style={{background:'none', border:'none', color:'var(--primary)', fontSize:11, fontWeight:700, cursor:'pointer'}}>RESET</button>
                      </div>
                      {options.map(opt => (
                          <label key={opt} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', cursor:'pointer', borderRadius:6, transition:'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background='var(--input-bg)'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}
                          >
                              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} style={{ accentColor: 'var(--primary)' }} />
                              <span style={{ fontSize:13, fontWeight: selected.includes(opt)?700:400 }}>{opt}</span>
                          </label>
                      ))}
                  </div>, document.body
              )}
          </>
      );
  }

  // ---------- 5. QUICK CATEGORY DONGLE ----------
  function QuickCatDongle({ value, onChange, categories, defaultCat }) {
      const [open, setOpen] = useState(false);
      const isActive = value && value !== defaultCat;
      const { btnRef, render } = useGlowButton(null, isActive, '📁', `Category: ${value}`, () => setOpen(!open));
      const [pos, setPos] = useState({ top: 0, left: 0 });

      useEffect(() => {
          if (!open || !btnRef.current) return;
          const rect = btnRef.current.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          const clickOut = (e) => { if (!btnRef.current.contains(e.target) && !e.target.closest('.pop-menu')) setOpen(false); };
          window.addEventListener('mousedown', clickOut); return () => window.removeEventListener('mousedown', clickOut);
      }, [open]);

      return (
          <>
              {render}
              {open && ReactDOM.createPortal(
                  <div className="pop-menu" style={{
                      position: 'fixed', top: pos.top, left: pos.left, zIndex: 999999,
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: 140, display:'flex', flexDirection:'column', gap:2, maxHeight: 200, overflowY: 'auto'
                  }}>
                      {categories.map(cat => (
                          <button key={cat} onClick={() => { onChange(cat); setOpen(false); }} 
                              style={{ textAlign:'left', padding:'8px 12px', background: value===cat?'var(--primary)':'transparent', color: value===cat?'#fff':'var(--text)', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight: value===cat?700:500 }}>
                              {cat}
                          </button>
                      ))}
                  </div>, document.body
              )}
          </>
      );
  }

  // ---------- HELPERS ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

  const parseDueDate = (t) => {
    try {
      if (!t) return null;
      const raw = t.dueAt ?? t.due ?? t.dueDate ?? t.dueDateTime ?? t.dueISO ?? t.due_date ?? t.due_time ?? null;
      if (!raw) return null;
      if (typeof raw === "number") return isValidDate(new Date(raw)) ? new Date(raw) : null;
      if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return null;
        if (/^\d+$/.test(s)) return isValidDate(new Date(parseInt(s, 10))) ? new Date(parseInt(s, 10)) : null;
        return isValidDate(new Date(s)) ? new Date(s) : null;
      }
      return null;
    } catch { return null; }
  };

  const dueMatches = (task, filterDue) => {
    if (!filterDue || filterDue === "Any") return true;
    const due = parseDueDate(task);
    if (!due) return false;
    const now = new Date();
    const diffDays = Math.round((dayStart(due).getTime() - dayStart(now).getTime()) / 86400000);
    if (filterDue === "Overdue") return diffDays < 0;
    if (filterDue === "Today") return diffDays === 0;
    if (filterDue === "Tomorrow") return diffDays === 1;
    if (filterDue === "This Week") return diffDays >= 0 && diffDays <= 7;
    if (filterDue === "Next Week") return diffDays > 7 && diffDays <= 14;
    if (filterDue === "This Month") return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
    return true;
  };

  const computeWeight = (t, settings, useWeighted = true) => {
    if (!useWeighted) return 10; 
    const base = parseInt(t?.weight, 10);
    let w = Number.isFinite(base) ? base : 10;
    if (settings?.agingPerDay && t?.createdAt) {
      const created = new Date(t.createdAt);
      if (isValidDate(created)) {
        const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > 0) w += (daysOld * parseFloat(settings.agingPerDay));
      }
    }
    const priMult = settings?.priorityMultipliers?.[t?.priority] ?? 1;
    const catMult = settings?.categoryMultipliers?.[t?.category] ?? 1;
    return (w * (Number.isFinite(priMult) ? priMult : 1) * (Number.isFinite(catMult) ? catMult : 1)) || 0;
  };

  const pickWeightedIndex = (items, weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return Math.floor(Math.random() * items.length);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  window.SpinTab = function SpinTab({ tasks, categories, onView, onFocus, onAdd, onComplete, settings, notify, OpenAdd, openAdd, onStartTimer }) {
    const spinCfg = settings;
    const spinDurationSec = parseInt(settings?.duration, 10) || 3;  // ✅ FIXED: Now reads from settings
    const spinShowWinnerPopup = settings?.spinShowWinnerPopup !== false; 
    const spinAutoOpenWinnerTask = !!settings?.spinAutoOpenWinnerTask;   
    const spinUseWeighted = settings?.spinUseWeighted !== false;          
    const spinCooldownEnabled = !!settings?.spinCooldownEnabled;
    const spinCooldownSpins = Math.max(1, parseInt(settings?.spinCooldownSpins, 10) || 5);
    
    // Cooldown Time defaults
    const rawMin = parseInt(settings?.spinCooldownMinutes, 10);
    const spinCooldownMinutes = Number.isFinite(rawMin) ? rawMin : 0; 
    const rawSec = parseInt(settings?.spinCooldownSeconds, 10);
    const spinCooldownSeconds = Number.isFinite(rawSec) ? rawSec : 0;

    const [activeMode, setActiveMode] = useState(() => localStorage.getItem("tt_spin_mode") || "add");
    
    // ✅ ZEN MODE STATE (Persisted)
    const [showToolbar, setShowToolbar] = useState(() => localStorage.getItem('tt_spin_show_toolbar') !== 'false');
    useEffect(() => localStorage.setItem('tt_spin_show_toolbar', showToolbar), [showToolbar]);

    const [bulkMode, setBulkMode] = useState(false);
    const [aiMode, setAiMode] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [quickText, setQuickText] = useState("");
    const [winner, setWinner] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [showWinner, setShowWinner] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0); 
    const [isLocked, setIsLocked] = useState(false);
    const stripRef = useRef(null);
    const spinTokenRef = useRef(0);

    const [filterDue, setFilterDue] = useState("Any");
    const [filterDuration, setFilterDuration] = useState("Any");
    const [filterCats, setFilterCats] = useState([]);
    const [filterPriorities, setFilterPriorities] = useState([]);

    const [localCategories, setLocalCategories] = useState(() => {
      try {
        const s = JSON.parse(localStorage.getItem("categories") || "[]");
        return Array.from(new Set([...(categories || []), ...s])).filter(Boolean);
      } catch { return categories || []; }
    });

    useEffect(() => {
      if (Array.isArray(categories)) {
        setLocalCategories((p) => Array.from(new Set([...(categories || []), ...(p || [])])).filter(Boolean));
      }
    }, [categories]);

    const defaultCategory = (localCategories.length > 0) ? localCategories[0] : 'General';
    const [quickCat, setQuickCat] = useState(defaultCategory);

    const visibleCategories = useMemo(() => {
        return (localCategories || []).filter((c) => settings?.categoryMultipliers?.[c] === undefined || settings.categoryMultipliers[c] >= 0);
    }, [localCategories, settings?.categoryMultipliers]);

    const COOLDOWN_KEY = "tt_spin_history_v2";
    const getSpinHistory = () => { try { return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || "[]"); } catch { return []; } };
    const saveSpinHistory = (arr) => { try { localStorage.setItem(COOLDOWN_KEY, JSON.stringify(arr)); } catch {} };

    const updateCooldownStatus = () => {
      if (!spinCooldownEnabled) { setIsLocked(false); setCooldownRemaining(0); return; }
      const now = Date.now();
      const windowMs = (spinCooldownMinutes * 60 * 1000) + (spinCooldownSeconds * 1000);
      const safeWindowMs = windowMs > 0 ? windowMs : 10000; 
      let history = getSpinHistory();
      history = history.filter(ts => (now - ts) < safeWindowMs);
      saveSpinHistory(history);
      if (history.length >= spinCooldownSpins) {
        const oldest = history[0]; 
        const unlockTime = oldest + safeWindowMs;
        const remainingMs = unlockTime - now;
        if (remainingMs > 0) { setIsLocked(true); setCooldownRemaining(Math.ceil(remainingMs / 1000)); } 
        else { setIsLocked(false); setCooldownRemaining(0); }
      } else { setIsLocked(false); setCooldownRemaining(0); }
    };

    const recordSpin = () => {
      if (!spinCooldownEnabled) return;
      const history = getSpinHistory();
      history.push(Date.now());
      saveSpinHistory(history);
      updateCooldownStatus();
    };

    useEffect(() => {
      updateCooldownStatus(); 
      const timer = setInterval(updateCooldownStatus, 1000);
      return () => clearInterval(timer);
    }, [spinCooldownEnabled, spinCooldownSpins, spinCooldownMinutes, spinCooldownSeconds, spinning]);

    const openWinnerPopup = () => setShowWinner(true);
    const closeWinnerPopup = () => setShowWinner(false);

    useEffect(() => {
      const onKeyDown = (e) => { if (e.key === "Escape") closeWinnerPopup(); };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const glowStyle = (active) => ({
      background: "none", border: "none", cursor: "pointer", display: "inline-flex",
      alignItems: "center", justifyContent: "center", transition: "all 0.3s ease",
      color: active ? "var(--primary)" : "rgba(200, 200, 200, 0.8)",
      textShadow: active ? "0 0 8px var(--primary)" : "none",
      filter: active ? "drop-shadow(0 0 2px var(--primary))" : "grayscale(0.2)",
      fontSize: "20px", lineHeight: 1, padding: "4px 8px", userSelect: "none",
    });

    const pool = useMemo(() => {
      const list = (tasks || []).filter((t) => {
        if (window.canEnterTumbler && !window.canEnterTumbler(t)) return false;
        if (filterCats.length && !filterCats.includes(t.category)) return false;
        if (filterPriorities.length && !filterPriorities.includes(t.priority)) return false;
        if (!dueMatches(t, filterDue)) return false;

        if (filterDuration !== 'Any') {
            const est = parseInt(t.estimatedTime) || 0;
            if (filterDuration === '< 5m' && (est === 0 || est >= 5)) return false;
            if (filterDuration === '< 15m' && (est === 0 || est >= 15)) return false;
            if (filterDuration === '< 30m' && (est === 0 || est >= 30)) return false;
            if (filterDuration === '< 60m' && (est === 0 || est >= 60)) return false;
            if (filterDuration === '> 1h' && est < 60) return false;
        }
        return true;
      });
      return list;
    }, [tasks, filterCats, filterPriorities, filterDue, filterDuration]);

    const stats = useMemo(() => {
      if (!pool.length) return null;
      let total = 0;
      const weights = pool.map((t) => computeWeight(t, settings, spinUseWeighted));
      weights.forEach((w) => (total += w));
      let topIdx = 0; let topW = weights[0] || 0;
      for (let i = 1; i < weights.length; i++) {
        if ((weights[i] || 0) > topW) { topW = weights[i] || 0; topIdx = i; }
      }
      const topChance = total > 0 ? Math.round((topW / total) * 100) : 0;
      if (!spinUseWeighted) return { topChance: Math.round(100 / pool.length) };
      return { topChance };
    }, [pool, settings, spinUseWeighted]);

    // --- BULK IMPORT ---
    const handleBulkImport = async () => {
      const text = (bulkText || "").trim();
      if (!text) return;
      if (aiMode) {
        if (!settings?.geminiApiKey) { notify?.("Missing Gemini API Key in Settings", "❌"); return; }
        if (!window.callGemini) { notify?.("AI Service Not Loaded", "❌"); return; }
        notify?.("AI Processing...", "🧠");
        const catStr = categories.join(', ');
        const prompt = `Analyze this text and extract tasks. Return a JSON array of objects with: title, category (one of: ${catStr}), priority (Low/Medium/High/Urgent), estimatedTime (minutes). Text: "${text}"`;
        try {
            const res = await window.callGemini(prompt, settings.geminiApiKey);
            if (res.text) {
                const parsedTasks = window.parseAITasks ? window.parseAITasks(res.text, categories) : [];
                if (parsedTasks.length > 0) {
                    parsedTasks.forEach(t => onAdd?.(t));
                    setBulkText(""); setBulkMode(false); notify?.(`AI Added ${parsedTasks.length} Tasks`, "✅");
                } else { notify?.("AI found no tasks", "⚠️"); }
            } else { throw new Error(res.error || "Unknown AI error"); }
        } catch (e) { console.error(e); notify?.("AI Failed: " + e.message, "❌"); }
      } else {
        text.split("\n").forEach((l) => { const v = (l || "").trim(); if (v) onAdd?.({ title: v }); });
        setBulkText(""); setBulkMode(false); notify?.("Tasks Imported", "📦");
      }
    };

    // ----- SPIN LOGIC -----
    const ITEM_H = 50;
    const VISIBLE_H = 160;
    const CENTER_OFFSET = (VISIBLE_H / 2) - (ITEM_H / 2);
    const buildStripItems = useMemo(() => {
      if (!pool.length) return [];
      const repeats = 22;
      const out = [];
      for (let r = 0; r < repeats; r++) { for (let i = 0; i < pool.length; i++) out.push(pool[i]); }
      return out;
    }, [pool]);

    const resetStripInstant = () => {
      const el = stripRef.current;
      if (!el) return;
      el.style.transition = "none";
      el.style.transform = "translateY(0px)";
      void el.offsetHeight;
      el.style.transition = `transform ${spinDurationSec}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
    };

    useEffect(() => {
      resetStripInstant(); setWinner(null); setSpinning(false);
    }, [filterDue, filterCats, filterPriorities, filterDuration, pool.length, spinDurationSec]);

    const doSpin = () => {
      if (spinning) return;
      if (isLocked) { notify?.(`Cooldown! Wait ${cooldownRemaining}s`, "⏳"); return; }
      if (!pool.length) { notify?.("No tasks in pool", "⚠️"); return; }
      recordSpin();
      const token = ++spinTokenRef.current;
      setSpinning(true); setWinner(null);
      const weights = pool.map((t) => computeWeight(t, settings, spinUseWeighted));
      const chosenPoolIdx = pickWeightedIndex(pool, weights);
      const chosen = pool[chosenPoolIdx];
      const minLandingRow = Math.max(pool.length * 6, 40);
      const maxLandingRow = Math.max(pool.length * 18, minLandingRow + pool.length * 2);
      const candidates = [];
      for (let i = minLandingRow; i < buildStripItems.length; i++) {
        if (buildStripItems[i] === chosen) candidates.push(i);
        if (i >= maxLandingRow && candidates.length) break;
      }
      let landingRow = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : clamp(Math.floor(minLandingRow + Math.random() * (maxLandingRow - minLandingRow + 1)), 0, buildStripItems.length - 1);
      const extra = Math.floor(Math.random() * pool.length);
      landingRow = clamp(landingRow + extra, 0, buildStripItems.length - 1);
      const el = stripRef.current;
      if (!el) { finalizeSpin(chosen); return; }
      resetStripInstant();
      const targetY = -landingRow * ITEM_H + CENTER_OFFSET;
      requestAnimationFrame(() => {
        if (token !== spinTokenRef.current) return;
        el.style.transform = `translateY(${targetY}px)`;
      });
      const onEnd = (e) => {
        if (e?.propertyName && e.propertyName !== "transform") return;
        el.removeEventListener("transitionend", onEnd);
        if (token !== spinTokenRef.current) return;
        finalizeSpin(chosen);
      };
      el.addEventListener("transitionend", onEnd, { once: true });
    };

    const finalizeSpin = (chosenTask) => {
      setWinner(chosenTask); setSpinning(false);
      if (typeof window.sound === 'function') window.sound("spinWin");
      if (typeof window.confettiBurst === 'function') window.confettiBurst();
      notify?.(`🎯 ${chosenTask?.title || "Winner!"}`, "🎉");
      if (spinAutoOpenWinnerTask) { if (typeof onView === "function") onView(chosenTask); } 
      else { if (spinShowWinnerPopup) { openWinnerPopup(); } }
    };

    const handleQuickAdd = () => {
      const v = (quickText || "").trim();
      if (!v) return;
      onAdd?.({ title: v });
      setQuickText("");
      notify?.("Added", "✅");
    };

    // --- RENDER ---
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ✅ COLLAPSIBLE TOP BAR */}
        {showToolbar && (
            <div style={{
                height: "50px", background: "var(--card)", borderRadius: "8px", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", padding: "0 10px", gap: 10,
            }}>
            {/* 1. Global Buttons (Left) - Packed Tight */}
            <div style={{ display: "flex", gap: 2 }}>
                <button style={glowStyle(bulkMode)} onClick={() => setBulkMode(!bulkMode)} title="Bulk Import">📦</button>
                <button style={glowStyle(false)} onClick={() => (openAdd || OpenAdd)?.()} title="Full Add Task">➕</button>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--border)", opacity: 0.3, margin: "0 4px" }} />

            {/* 2. Toggles */}
            <div style={{ display: "flex", gap: 4 }}>
                <button style={glowStyle(activeMode === "add")} onClick={() => setActiveMode("add")} title="Quick Add">⚡</button>
                <button style={glowStyle(activeMode === "filter")} onClick={() => setActiveMode("filter")} title="Filters">🔍</button>
            </div>
            
            <div style={{ width: 1, height: 20, background: "var(--border)", opacity: 0.3 }} />
            
            {/* 3. Center Content */}
            <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center" }}>
                {activeMode === "add" ? (
                <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 4 }}>
                    {/* DONGLE */}
                    <QuickCatDongle value={quickCat} onChange={setQuickCat} categories={visibleCategories} defaultCat={defaultCategory} />
                    
                    <input className="f-input" style={{ background: "transparent", border: "none", margin: 0, flex: 1, height: "100%" }}
                    placeholder="Quick add..." value={quickText} onChange={(e) => setQuickText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }} />
                    
                    {quickText && <button onClick={handleQuickAdd} style={{ ...glowStyle(true), fontSize: 13, border: "1px solid var(--primary)", borderRadius: 4, padding: "2px 8px" }}>Add</button>}
                </div>
                ) : (
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                    
                    <DateFilterButton value={filterDue} onChange={setFilterDue} />

                    <MultiSelectButton icon="📁" title="Category" options={visibleCategories} selected={filterCats} onChange={setFilterCats} />

                    <DurationFilterButton value={filterDuration} onChange={setFilterDuration} />

                    <MultiSelectButton icon="🚨" title="Priority" options={["Low", "Medium", "High", "Urgent"]} selected={filterPriorities} onChange={setFilterPriorities} />
                </div>
                )}
            </div>
            </div>
        )}

        {/* BULK IMPORT MODAL */}
        {showToolbar && window.SimpleModal && (
            <window.SimpleModal
                open={bulkMode}
                onClose={() => setBulkMode(false)}
                title={aiMode ? 'Bulk Import (AI Dump)' : 'Bulk Import (CSV)'}
            >
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className={`toggle-icon ${!aiMode ? 'active' : ''}`} onClick={() => setAiMode(false)} style={{ cursor: 'pointer', padding: 6, borderRadius: 6, background: !aiMode ? 'var(--primary)' : 'transparent' }}>📄</div>
                        <div className={`toggle-icon ${aiMode ? 'active' : ''}`} onClick={() => setAiMode(true)} style={{ cursor: 'pointer', padding: 6, borderRadius: 6, background: aiMode ? 'var(--primary)' : 'transparent' }}>🧠</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, marginLeft: 6, color: 'var(--text)' }}>{aiMode ? 'AI Dump Mode' : 'CSV Import Mode'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 8 }}>{aiMode ? 'Paste unstructured notes/emails here:' : 'Format: Title | Category | Priority | Weight | Time | Due'}</div>
                <textarea className="f-textarea" placeholder={aiMode ? "Paste anything..." : "Buy groceries | Personal | Medium | 10 | 30 | 2024-12-20"} value={bulkText} onChange={(e) => setBulkText(e.target.value)} style={{ minHeight: 140 }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button className="btn-orange" onClick={handleBulkImport} style={{ flex: 1 }}>{!aiMode ? '📄 Import CSV' : '🧠 Process with AI'}</button>
                </div>
            </window.SimpleModal>
        )}

        {/* TUMBLER AREA */}
        <div style={{ height: 160, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", position: 'relative' }}>
          <div className="tumbler-highlight" style={{
              position: "absolute", top: "50%", transform: "translateY(-50%)", height: 50, left: 0, right: 0,
              background: "rgba(255,107,53,0.05)", borderTop: "1px solid var(--primary)", borderBottom: "1px solid var(--primary)", zIndex: 1, pointerEvents: "none"
            }} />
          <div ref={stripRef} style={{ transition: `transform ${spinDurationSec}s cubic-bezier(0.1, 0.7, 0.1, 1)` }}>
            {buildStripItems.length ? (
              buildStripItems.map((t, i) => (
                <div key={`${t?.id || t?.title || "t"}_${i}`} style={{
                    height: 50, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, padding: "0 12px",
                    textAlign: "center", opacity: spinning ? 0.95 : 1
                  }}>
                  {t?.title || "(Untitled)"}
                </div>
              ))
            ) : (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7, fontWeight: 700 }}>
                No tasks in pool
              </div>
            )}
          </div>
        </div>

        {/* SPIN BUTTON */}
        <button
          className="spin-btn"
          onClick={doSpin}
          disabled={spinning || !pool.length || isLocked}
          style={{
            height: 60, borderRadius: 8, fontSize: 20, fontWeight: 800,
            opacity: (spinning || !pool.length || isLocked) ? 0.6 : 1,
            cursor: (spinning || !pool.length || isLocked) ? "not-allowed" : "pointer",
            background: isLocked ? "#444" : undefined, // visual feedback for lock
            transition: 'background 0.3s'
          }}
          title={isLocked ? `Cooldown active: ${cooldownRemaining}s` : "Spin"}
        >
          {spinning ? "SPINNING…" : isLocked ? `COOLDOWN (${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')})` : "SPIN"}
        </button>

        {/* WINNER POPUP */}
        {winner && showWinner && (
          <div onClick={closeWinnerPopup} style={{
              position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)"
            }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                width: "min(340px, 90%)", background: "var(--card)", borderRadius: 16, overflow: "hidden",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)", border: "1px solid var(--border)"
              }}>
              
              {/* Accent Bar */}
              <div style={{ height: 3, background: "var(--primary)" }} />
              
              {/* Content */}
              <div style={{ padding: 20 }}>
                
                {/* Label */}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "var(--primary)", textTransform: "uppercase", marginBottom: 10 }}>
                  Next Up
                </div>
                
                {/* Title */}
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, color: "var(--text)", marginBottom: 14, wordBreak: "break-word" }}>
                  {winner?.title || "Untitled"}
                </div>
                
                {/* Meta Row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  <span style={{ background: "var(--input-bg)", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: "var(--text-light)" }}>
                    {winner?.category || "General"}
                  </span>
                  {winner?.priority && (
                    <span style={{ 
                      padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: winner.priority === "Urgent" ? "rgba(231,76,60,0.15)" : winner.priority === "High" ? "rgba(255,107,53,0.15)" : "var(--input-bg)", 
                      color: winner.priority === "Urgent" ? "#e74c3c" : winner.priority === "High" ? "var(--primary)" : "var(--text-light)" 
                    }}>
                      {winner.priority}
                    </span>
                  )}
                  {winner?.estimatedTime > 0 && (
                    <span style={{ background: "var(--input-bg)", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: "var(--text-light)" }}>
                      {winner.estimatedTime}m
                    </span>
                  )}
                </div>
                
                {/* Primary: Focus Mode */}
                <button onClick={() => { closeWinnerPopup(); onFocus?.(winner); }}
                  style={{ 
                    width: "100%", height: 44, borderRadius: 10, fontWeight: 700, fontSize: 14, 
                    background: "var(--primary)", border: "none", color: "white", cursor: "pointer", marginBottom: 10
                  }}>
                  Start Focus
                </button>
                
                {/* Secondary Row */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    onClick={() => { closeWinnerPopup(); setTimeout(() => doSpin(), 0); }} 
                    disabled={spinning || isLocked}
                    style={{ 
                      flex: 1, height: 36, borderRadius: 8, fontWeight: 600, fontSize: 12, 
                      background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)", 
                      cursor: (spinning || isLocked) ? "not-allowed" : "pointer", 
                      opacity: (spinning || isLocked) ? 0.5 : 1
                    }}>
                    {isLocked ? `${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')}` : "Respin"}
                  </button>
                  <button onClick={() => { closeWinnerPopup(); onView?.(winner); }}
                    style={{ 
                      flex: 1, height: 36, borderRadius: 8, fontWeight: 600, fontSize: 12, 
                      background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer"
                    }}>
                    View
                  </button>
                  <button onClick={() => { try { onComplete?.(winner); notify?.("Done!", ""); } catch (e) {} finally { closeWinnerPopup(); } }}
                    style={{ 
                      flex: 1, height: 36, borderRadius: 8, fontWeight: 600, fontSize: 12, 
                      background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer"
                    }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* STATS BAR + ZEN MODE TOGGLE */}
        <div style={{ display: "flex", flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.8 }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, fontWeight: 900 }}>
                <span style={{ color: "var(--text-light)", letterSpacing: 1 }}>{pool.length} TASKS IN POOL</span>
                {stats && <span style={{ color: "var(--primary)" }}>🎲 {stats.topChance}% ODDS {spinUseWeighted ? "(WEIGHTED)" : "(RANDOM)"}</span>}
            </div>
            
            {/* 🙈 Zen Mode Toggle (Very Subtle) */}
            <button 
                onClick={() => setShowToolbar(!showToolbar)} 
                style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', 
                    fontSize: 10, color: 'var(--text-light)', opacity: 0.4, 
                    padding: '4px 20px', transition: 'opacity 0.2s' 
                }}
                onMouseEnter={e => e.target.style.opacity = 1}
                onMouseLeave={e => e.target.style.opacity = 0.4}
                title={showToolbar ? "Hide Controls (Zen Mode)" : "Show Controls"}
            >
                {showToolbar ? '▲' : '▼'}
            </button>
        </div>
      </div>
    );
  };

  console.log("✅ 13-03-spin.jsx Loaded (Fixed Duration + Clean Popup)");
})();