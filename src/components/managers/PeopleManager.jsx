// js/features/managers/people-manager.jsx
// ===========================================
// PEOPLE MANAGER (Lite)
// - Single-root JSX (no adjacent JSX errors)
// - Search, Add, Edit, Delete
// - Stores basic fields: name, type, phone, email, notes
// - Closes via X or clicking outside overlay
// ===========================================

import React, { useState, useMemo, useEffect } from "react";

export default function PeopleManager({ people, setPeople, onClose, tasks, onViewTask, locations = [], initialSelectedPersonName = null }) {
  const safePeople = Array.isArray(people) ? people : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    type: 'client',
    phone: '',
    email: '',
    notes: '',
    tags: '',
    weight: 1,
    compassCrmLink: '',
    links: '',
    locationIds: []
  });

  // Helper to split name - handles both old format (name) and new format (firstName/lastName)
  const splitName = (person) => {
    // If already has firstName/lastName, use those
    if (person.firstName || person.lastName) {
      return { firstName: person.firstName || '', lastName: person.lastName || '' };
    }
    // Otherwise split the name field
    if (!person.name) return { firstName: '', lastName: '' };
    const parts = person.name.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts.pop();
    const firstName = parts.join(' ');
    return { firstName, lastName };
  };

  // Helper to get display name - works with both formats
  const getDisplayName = (person) => {
    if (person.firstName || person.lastName) {
      return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Untitled';
    }
    return person.name || 'Untitled';
  };

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
    setViewingId(null);
    setEditId(null);
    setFormData({ 
      firstName: '', 
      lastName: '', 
      type: 'client', 
      phone: '', 
      email: '', 
      notes: '',
      tags: '',
      weight: 1,
      compassCrmLink: '',
      links: '',
      locationIds: []
    });
  };

  const startAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const startView = (p) => {
    if (!p) return;
    setViewingId(p.id);
    setIsEditing(false);
    setEditId(null);
  };

  const startEdit = (p) => {
    if (!p) return;
    setIsEditing(true);
    setViewingId(null);
    setEditId(p.id);
    
    // Auto-split the name
    const nameParts = splitName(p);
    
    // Parse tags and links
    const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '');
    const linksStr = Array.isArray(p.links) ? p.links.join('\n') : (p.links || '');
    
    setFormData({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      type: p.type || 'client',
      phone: p.phone || '',
      email: p.email || '',
      notes: p.notes || '',
      tags: tagsStr,
      weight: p.weight || 1,
      compassCrmLink: p.compassCrmLink || p.compassLink || p.crmLink || '',
      links: linksStr,
      locationIds: Array.isArray(p.locationIds) ? p.locationIds : []
    });
  };

  const handleSave = () => {
    const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
    if (!fullName) return;

    // Parse tags and links
    const parseTags = (raw) => {
      if (Array.isArray(raw)) return raw.filter(Boolean);
      return String(raw || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    };

    const parseLinks = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return [];
      return s
        .split(/\n|,/g)
        .map(x => x.trim())
        .filter(Boolean);
    };

    const next = {
      name: fullName, // Keep name for backward compatibility
      firstName: formData.firstName,
      lastName: formData.lastName,
      type: formData.type || 'client',
      phone: String(formData.phone || '').trim(),
      email: String(formData.email || '').trim(),
      notes: String(formData.notes || '').trim(),
      tags: parseTags(formData.tags),
      weight: parseInt(formData.weight) || 1,
      compassCrmLink: String(formData.compassCrmLink || '').trim(),
      links: parseLinks(formData.links),
      locationIds: Array.isArray(formData.locationIds) ? formData.locationIds.filter(Boolean) : [],
      id: editId || (window.generateId ? window.generateId('p') : ('p_' + Date.now())),
      updatedAt: new Date().toISOString()
    };

    // Preserve createdAt for existing records
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
      else if (viewingId) {
        setViewingId(null);
      } else {
        onClose?.();
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isEditing) {
      handleSave();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', onEditKeyDown);
    return () => window.removeEventListener('keydown', onEditKeyDown);
  });

  // Auto-select person if initialSelectedPersonName is provided
  useEffect(() => {
    if (initialSelectedPersonName && safePeople.length > 0 && !viewingId && !isEditing) {
      const person = safePeople.find(p => {
        const displayName = getDisplayName(p);
        return String(displayName || "").trim().toLowerCase() === String(initialSelectedPersonName || "").trim().toLowerCase();
      });
      if (person) {
        startView(person);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedPersonName, safePeople.length]);

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
              filtered.map(p => {
                const displayName = getDisplayName(p);
                const initials = (p.firstName?.[0] || p.name?.[0] || '?').toUpperCase();
                const isSelected = viewingId === p.id || editId === p.id;
                
                return (
                  <div
                    key={p.id}
                    onClick={() => startView(p)}
                    style={{
                      padding: 14,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: isSelected ? 'rgba(255,107,53,0.1)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--primary)' : 'none'
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--input-bg)', fontWeight: 900
                    }}>
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
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

          {/* VIEW/EDIT PANE */}
          <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
            {viewingId && !isEditing ? (
              <PersonView
                person={safePeople.find(p => p.id === viewingId)}
                onEdit={() => {
                  const person = safePeople.find(p => p.id === viewingId);
                  if (person) startEdit(person);
                }}
                getDisplayName={getDisplayName}
                tasks={tasks || []}
                onViewTask={onViewTask}
              />
            ) : isEditing ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">First Name</label>
                    <input
                      className="f-input"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First name…"
                      autoFocus
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Last Name</label>
                    <input
                      className="f-input"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Last name…"
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

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Weight</label>
                    <input
                      type="number"
                      className="f-input"
                      min="1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Compass CRM Link</label>
                    <input
                      className="f-input"
                      value={formData.compassCrmLink}
                      onChange={(e) => setFormData({ ...formData, compassCrmLink: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="f-label">Tags</label>
                  <input
                    className="f-input"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div>
                  <label className="f-label">Links</label>
                  <textarea
                    className="f-input"
                    value={formData.links}
                    onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                    rows={3}
                    placeholder="One per line or comma-separated"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {locations && locations.length > 0 && (
                  <div>
                    <label className="f-label">Connected Locations</label>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 8, 
                      padding: 10, 
                      background: 'var(--input-bg)', 
                      borderRadius: 8, 
                      border: '1px solid var(--border)',
                      maxHeight: 120,
                      overflowY: 'auto'
                    }}>
                      {locations.map(loc => {
                        const isSelected = Array.isArray(formData.locationIds) && formData.locationIds.includes(loc.id);
                        return (
                          <label
                            key={loc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--text)',
                              borderRadius: 8,
                              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: isSelected ? 700 : 500,
                              userSelect: 'none'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentIds = Array.isArray(formData.locationIds) ? formData.locationIds : [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, locationIds: [...currentIds, loc.id] });
                                } else {
                                  setFormData({ ...formData, locationIds: currentIds.filter(id => id !== loc.id) });
                                }
                              }}
                              style={{ margin: 0, cursor: 'pointer' }}
                            />
                            {loc.name || loc.label || 'Unnamed Location'}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="f-label">Notes</label>
                  <textarea
                    className="f-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={5}
                    placeholder="Anything important…"
                    style={{ resize: 'vertical' }}
                  />
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
            ) : (
              <div style={{ color: 'var(--text-light)', opacity: 0.7, fontStyle: 'italic' }}>
                Select a person to view, or click Add to create a new person.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Person View Component
function PersonView({ person, onEdit, getDisplayName, tasks, onViewTask }) {
  if (!person) return null;

  const displayName = getDisplayName(person);
  const initials = (person.firstName?.[0] || person.name?.[0] || '?').toUpperCase();
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  // Find tasks associated with this person
  const associatedTasks = safeTasks.filter(task => {
    const taskPeople = Array.isArray(task.people) ? task.people : [];
    const personName = person.name || getDisplayName(person);
    return taskPeople.some(p => 
      String(p || '').toLowerCase() === String(personName || '').toLowerCase()
    );
  });

  // Parse links
  const links = Array.isArray(person.links) 
    ? person.links 
    : (person.links ? String(person.links).split(',').map(l => l.trim()).filter(Boolean) : []);

  // Parse tags
  const tags = Array.isArray(person.tags) 
    ? person.tags 
    : (person.tags ? String(person.tags).split(',').map(t => t.trim()).filter(Boolean) : []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--input-bg)', fontWeight: 900, fontSize: 24
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              {displayName}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: 6, 
                background: 'rgba(255,107,53,0.15)',
                fontWeight: 600
              }}>
                {(person.type || 'client').toUpperCase()}
              </span>
              {associatedTasks.length > 0 && (
                <span style={{ fontSize: 12 }}>
                  {associatedTasks.length} {associatedTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="btn-white-outline"
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Edit
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Contact Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {person.email && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                EMAIL
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>
                <a href={`mailto:${person.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {person.email}
                </a>
              </div>
            </div>
          )}

          {person.phone && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                PHONE
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>
                <a href={`tel:${person.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {person.phone}
                </a>
              </div>
            </div>
          )}

          {person.compassCrmLink || person.compassLink || person.crmLink ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                CRM LINK
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>
                <a 
                  href={person.compassCrmLink || person.compassLink || person.crmLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'none' }}
                >
                  View in CRM →
                </a>
              </div>
            </div>
          ) : null}

          {person.createdAt && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                ADDED
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>
                {new Date(person.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Name Breakdown */}
        {(person.firstName || person.lastName) && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
              NAME
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', display: 'flex', gap: 12 }}>
              {person.firstName && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-light)', marginRight: 4 }}>First:</span>
                  <span style={{ fontWeight: 600 }}>{person.firstName}</span>
                </div>
              )}
              {person.lastName && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-light)', marginRight: 4 }}>Last:</span>
                  <span style={{ fontWeight: 600 }}>{person.lastName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
              TAGS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 12,
                    color: 'var(--text)'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
              LINKS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {links.map((link, idx) => {
                const url = link.startsWith('http') ? link : `https://${link}`;
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      fontSize: 13,
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      display: 'inline-block',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {link} →
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {person.notes && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
              NOTES
            </div>
            <div style={{ 
              fontSize: 14, 
              color: 'var(--text)', 
              lineHeight: 1.6,
              padding: 14,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              whiteSpace: 'pre-wrap',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {person.notes}
            </div>
          </div>
        )}

        {/* Associated Tasks */}
        {associatedTasks.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 10, fontWeight: 700, letterSpacing: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>ASSOCIATED TASKS ({associatedTasks.length})</span>
              <span style={{ fontSize: 11, fontWeight: 400 }}>
                {associatedTasks.filter(t => t.completed).length} completed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {associatedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onViewTask?.(task)}
                  style={{
                    padding: '12px 14px',
                    background: task.completed ? 'rgba(0,184,148,0.1)' : 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: task.completed ? '1px solid rgba(0,184,148,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = task.completed ? 'rgba(0,184,148,0.15)' : 'rgba(255,255,255,0.08)';
                    e.target.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = task.completed ? 'rgba(0,184,148,0.1)' : 'rgba(255,255,255,0.05)';
                    e.target.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 16, marginTop: 2 }}>{task.completed ? '✅' : '⭕'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        textDecoration: task.completed ? 'line-through' : 'none', 
                        opacity: task.completed ? 0.7 : 1,
                        marginBottom: 4
                      }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 6, lineHeight: 1.4 }}>
                          {task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-light)', flexWrap: 'wrap' }}>
                        {task.category && <span>📁 {task.category}</span>}
                        {task.priority && <span>⚡ {task.priority}</span>}
                        {task.dueDate && (
                          <span>
                            📅 {new Date(task.dueDate).toLocaleDateString()}
                            {new Date(task.dueDate) < new Date() && !task.completed && (
                              <span style={{ color: 'var(--danger)', marginLeft: 4 }}>⚠️ Overdue</span>
                            )}
                          </span>
                        )}
                        {task.estimatedTime && (
                          <span>⏱️ {task.estimatedTime} {task.estimatedTimeUnit || 'min'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!person.email && !person.phone && !person.notes && !person.firstName && !person.lastName && !person.name && links.length === 0 && tags.length === 0 && associatedTasks.length === 0 && (
          <div style={{ color: 'var(--text-light)', opacity: 0.6, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
            No additional details available.
          </div>
        )}
      </div>
    </div>
  );
}

// Expose on window for backward compatibility
if (typeof window !== 'undefined') {
  window.PeopleManager = PeopleManager;
}

