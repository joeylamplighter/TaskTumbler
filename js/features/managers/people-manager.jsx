// js/features/managers/people-manager.jsx
// ===========================================
// PEOPLE MANAGER (Lite)
// - Single-root JSX (no adjacent JSX errors)
// - Search, Add, Edit, Delete
// - Stores basic fields: name, type, phone, email, notes
// - Closes via X or clicking outside overlay
// ===========================================

(function() {
  const { useState, useMemo, useEffect } = React;

  function PeopleManager({ people, setPeople, onClose }) {
    const safePeople = Array.isArray(people) ? people : [];
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    // Start with all items collapsed (showing just letters)
    const [collapsedItems, setCollapsedItems] = useState(() => {
      const set = new Set();
      safePeople.forEach(p => {
        if (p.id) set.add(p.id);
      });
      return set;
    });

    const [formData, setFormData] = useState({
      name: '',
      type: 'client',
      phone: '',
      email: '',
      notes: '',
      links: '',
      compassCrmLink: ''
    });

    const filtered = useMemo(() => {
      const q = (searchTerm || '').trim().toLowerCase();
      if (!q) return safePeople;
      return safePeople.filter(p => {
        const hay = [
          p?.name, p?.type, p?.phone, p?.email, p?.notes
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }, [safePeople, searchTerm]);

    const resetForm = () => {
      setIsEditing(false);
      setEditId(null);
      setFormData({ name: '', type: 'client', phone: '', email: '', notes: '', links: '', compassCrmLink: '' });
    };

    const startAdd = () => {
      resetForm();
      setIsEditing(true);
    };

    const startEdit = (p) => {
      if (!p) return;
      setIsEditing(true);
      setEditId(p.id);
      const linksArray = Array.isArray(p.links) ? p.links : (p.links ? [String(p.links)] : []);
      setFormData({
        name: p.name || '',
        type: p.type || 'client',
        phone: p.phone || '',
        email: p.email || '',
        notes: p.notes || '',
        links: linksArray.join(', '),
        compassCrmLink: p.compassCrmLink || ''
      });
    };

    const handleSave = () => {
      const name = (formData.name || '').trim();
      if (!name) return;

      // Parse links: split by comma and trim
      const linksArray = (formData.links || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const next = {
        name,
        type: formData.type || 'client',
        phone: (formData.phone || '').trim(),
        email: (formData.email || '').trim(),
        notes: (formData.notes || '').trim(),
        links: linksArray,
        compassCrmLink: (formData.compassCrmLink || '').trim(),
        id: editId || (window.generateId ? window.generateId('p') : ('p_' + Date.now())),
        updatedAt: new Date().toISOString()
      };

      if (editId) {
        const existing = safePeople.find(p => p.id === editId);
        if (existing) {
          next.createdAt = existing.createdAt || new Date().toISOString();
        }
      } else {
        next.createdAt = new Date().toISOString();
      }

      const nextList = editId
        ? safePeople.map(p => (p.id === editId ? next : p))
        : [...safePeople, next];

      setPeople?.(nextList);
      resetForm();
    };

    const handleDelete = (id) => {
      if (!id) return;
      const nextList = safePeople.filter(p => p.id !== id);
      setPeople?.(nextList);
      if (editId === id) resetForm();
    };

    const toggleCollapse = (id, e) => {
      if (e) e.stopPropagation();
      setCollapsedItems(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const expandAll = () => {
      setCollapsedItems(new Set());
    };

    const collapseAll = () => {
      const allIds = new Set();
      filtered.forEach(p => {
        if (p.id) allIds.add(p.id);
      });
      setCollapsedItems(allIds);
    };

    const allCollapsed = filtered.length > 0 && collapsedItems.size === filtered.length;

    const onEditKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditing) resetForm();
        else onClose?.();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    };

    useEffect(() => {
      window.addEventListener('keydown', onEditKeyDown);
      return () => window.removeEventListener('keydown', onEditKeyDown);
    });

    return (
      <div
        className="modal-overlay"
        onClick={() => onClose?.()}
        style={{ zIndex: 3000 }}
      >
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(860px, 96vw)',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}
        >
          {/* HEADER */}
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: 'var(--text-light)' }}>PEOPLE</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {filtered.length > 0 && (
                    <button
                      onClick={allCollapsed ? expandAll : collapseAll}
                      title={allCollapsed ? "Expand All" : "Collapse All"}
                      style={{ 
                        background: 'transparent', 
                        color: 'var(--text-light)', 
                        border: '1px solid var(--border)',
                        padding: '4px 8px', 
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: 0.7
                      }}
                    >
                      {allCollapsed ? '▶▶ Expand All' : '▼▼ Collapse All'}
                    </button>
                  )}
                  <button
                    onClick={startAdd}
                    title="Add person"
                    style={{ 
                      background: 'var(--primary)', 
                      color: 'white', 
                      border: 'none',
                      padding: '6px 12px', 
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>
              <input
                className="f-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search people…"
                style={{ marginBottom: 0 }}
              />
            </div>

            <button
              className="btn-white-outline"
              onClick={() => onClose?.()}
              title="Close"
              style={{ width: 44, height: 44, borderRadius: 12 }}
            >
              ✕
            </button>
          </div>

          {/* BODY */}
          <div style={{ display: 'flex', minHeight: 0, flex: 1 }}>
            {/* LIST */}
            <div style={{ flex: 1.2, borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--text-light)', opacity: 0.7, fontStyle: 'italic' }}>
                  No people yet.
                </div>
              ) : (
                filtered.map(p => {
                  const initials = (p.name || '?').trim().slice(0, 1).toUpperCase();
                  const isCollapsed = collapsedItems.has(p.id);
                  
                  // Collapsed state: just show the letter in a compact horizontal bar
                  if (isCollapsed) {
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(p.id, e);
                        }}
                        onDoubleClick={() => startEdit(p)}
                        style={{
                          padding: '6px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: 8,
                          background: editId === p.id ? 'rgba(255,107,53,0.1)' : 'transparent',
                          borderLeft: editId === p.id ? '3px solid var(--primary)' : 'none',
                          transition: 'all 0.2s ease',
                          minHeight: 32
                        }}
                        title={`${p.name || 'Untitled'} - Click to expand, double-click to edit`}
                      >
                        <span style={{ fontSize: 10, opacity: 0.5, color: 'var(--text-light)' }}>▶</span>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: editId === p.id ? 'var(--primary)' : 'var(--input-bg)', 
                          color: editId === p.id ? 'white' : 'var(--text)',
                          fontWeight: 900,
                          fontSize: 13
                        }}>
                          {initials}
                        </div>
                      </div>
                    );
                  }
                  
                  // Expanded state: show full details
                  return (
                    <div
                      key={p.id}
                      onClick={() => startEdit(p)}
                      style={{
                        padding: 14,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: editId === p.id ? 'rgba(255,107,53,0.1)' : 'transparent',
                        borderLeft: editId === p.id ? '3px solid var(--primary)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <button
                        onClick={(e) => toggleCollapse(p.id, e)}
                        className="btn-white-outline"
                        title="Collapse"
                        style={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: 6, 
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          opacity: 0.6,
                          minWidth: 24,
                          flexShrink: 0
                        }}
                      >
                        ▼
                      </button>

                      <div style={{
                        width: 36, height: 36, borderRadius: 12,
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--input-bg)', fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {initials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name || 'Untitled'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(p.type || 'client').toUpperCase()}
                          {p.email ? ` • ${p.email}` : ''}
                          {p.phone ? ` • ${p.phone}` : ''}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="btn-white-outline"
                        title="Delete"
                        style={{ width: 40, height: 40, borderRadius: 12, opacity: 0.8 }}
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* EDIT PANE */}
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {!isEditing ? (
                <div style={{ color: 'var(--text-light)', opacity: 0.7, fontStyle: 'italic' }}>
                  Select a person to edit, or click Add.
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px' }}>
                      <label className="f-label">Name</label>
                      <input
                        className="f-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter name…"
                      />
                    </div>

                    <div style={{ flex: '0 0 200px' }}>
                      <label className="f-label">Type</label>
                      <select
                        className="f-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="client">Client</option>
                        <option value="lead">Lead</option>
                        <option value="agent">Agent</option>
                        <option value="vendor">Vendor</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px' }}>
                      <label className="f-label">Phone</label>
                      <input
                        className="f-input"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div style={{ flex: '1 1 240px' }}>
                      <label className="f-label">Email</label>
                      <input
                        className="f-input"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="f-label">Notes</label>
                    <textarea
                      className="f-input"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={5}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px' }}>
                      <label className="f-label">Links</label>
                      <input
                        className="f-input"
                        value={formData.links}
                        onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                      />
                    </div>

                    <div style={{ flex: '1 1 240px' }}>
                      <label className="f-label">Compass CRM Link</label>
                      <input
                        className="f-input"
                        value={formData.compassCrmLink}
                        onChange={(e) => setFormData({ ...formData, compassCrmLink: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button type="button" className="btn-white-outline" onClick={resetForm} style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-ai-purple" style={{ flex: 2 }}>
                      🧠 Save
                    </button>
                  </div>

                  <div style={{ marginTop: 10, color: 'var(--text-light)', opacity: 0.6, fontSize: 12 }}>
                    Tip: Ctrl or Cmd + Enter saves. Esc closes.
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.PeopleManager = PeopleManager;
  console.log('✅ PeopleManager loaded (Single-root JSX, stable)');
})();
