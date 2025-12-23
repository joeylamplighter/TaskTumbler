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
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: 'var(--text-light)' }}>PEOPLE</div>
              <input
                className="f-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search people…"
                style={{ marginBottom: 0 }}
              />
            </div>

            <button
              className="btn-ai-purple"
              onClick={startAdd}
              title="Add person"
              style={{ whiteSpace: 'nowrap' }}
            >
              🧠 Add
            </button>

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
                filtered.map(p => (
                  <div
                    key={p.id}
                    onClick={() => startEdit(p)}
                    style={{
                      padding: 14,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--input-bg)', fontWeight: 900
                    }}>
                      {(p.name || '?').trim().slice(0, 1).toUpperCase()}
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
                ))
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
