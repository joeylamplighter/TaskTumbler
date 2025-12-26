// StatsTabLegacy - Migrated from legacy 13-09-stats.jsx
// Updated: 2025-12-17 10:08 PT
// ===========================================
// DATA TAB (Insights + Database)
// Includes: LocationsManager, PeopleManager, Charts, History (Journal Style)
// ===========================================

import React from "react";
import ReactDOM from "react-dom";
import { getDisplayName, getInitials } from "../../utils/personUtils";

// --- INTERNAL COMPONENT: PEOPLE MANAGER ---
// Adds: Compass CRM link, extra links, notes, and People analytics + per-person history
function PeopleManager({ notify, history = [], tasks = [], onViewTask }) {
    const [people, setPeople] = React.useState(() => {
        try { return JSON.parse(localStorage.getItem('savedPeople') || '[]'); } catch { return []; }
    });

    const [isEditing, setIsEditing] = React.useState(false);
    const [editId, setEditId] = React.useState(null);

    const [formData, setFormData] = React.useState({
        firstName: '',
        lastName: '',
        name: '', // Keep for backward compatibility, auto-generated from firstName/lastName
        type: 'client',
        phone: '',
        email: '',
        contact: '', // legacy support
        tags: '',
        weight: 1,
        compassCrmLink: '',
        links: '',
        notes: '',
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
        const parts = String(person.name).trim().split(/\s+/);
        if (parts.length === 1) return { firstName: parts[0], lastName: '' };
        const lastName = parts.pop();
        const firstName = parts.join(' ');
        return { firstName, lastName };
    };


    const [searchText, setSearchText] = React.useState('');
    const [selectedPersonId, setSelectedPersonId] = React.useState(null); // detail view
    const [viewMode, setViewMode] = React.useState('summary'); // 'summary' or 'detailed'
    const [listViewMode, setListViewMode] = React.useState('cards'); // 'cards', 'list', 'table', 'compact'
    
    // Listen for person selection events from history clicks
    React.useEffect(() => {
        const handleSelectPerson = (event) => {
            if (event.detail && event.detail.personId) {
                setSelectedPersonId(event.detail.personId);
            }
        };
        window.addEventListener('select-person', handleSelectPerson);
        return () => window.removeEventListener('select-person', handleSelectPerson);
    }, []);
    
    // Also check for pending selection from window variable
    React.useEffect(() => {
        if (window.__pendingPeopleSelection && people.length > 0) {
            const personId = window.__pendingPeopleSelection;
            const person = people.find(p => p.id === personId);
            if (person) {
                setSelectedPersonId(personId);
                window.__pendingPeopleSelection = null;
            }
        }
    }, [people]);
    
    // Smart time formatting - converts units with rounding up
    const formatTimeSmart = (minutes) => {
        if (!minutes || minutes === 0) return '0m';
        const mins = Math.ceil(minutes); // Round up
        
        // Less than 60 seconds? Show seconds (if applicable)
        if (mins < 1) return '<1m';
        
        // Less than 60 minutes? Show minutes
        if (mins < 60) return `${mins}m`;
        
        // Calculate hours (round up)
        const hours = Math.ceil(mins / 60);
        
        // Less than 24 hours? Show hours
        if (hours < 24) return `${hours}h`;
        
        // Calculate days (round up)
        const days = Math.ceil(hours / 24);
        
        // Less than 7 days? Show days
        if (days < 7) return `${days}d`;
        
        // Calculate weeks (round up)
        const weeks = Math.ceil(days / 7);
        
        // Less than 4 weeks? Show weeks
        if (weeks < 4) return `${weeks}w`;
        
        // Calculate months (approximate, round up)
        const months = Math.ceil(days / 30);
        
        // Less than 12 months? Show months
        if (months < 12) return `${months}mo`;
        
        // Show years (round up)
        const years = Math.ceil(days / 365);
        return `${years}y`;
    };
    
    // Helper to get initials
    const getInitialsForPerson = (person) => {
        if (person.profilePicture && person.profilePictureType === 'emoji') return null; // Don't show initials for emoji
        try {
            return getInitials(person);
        } catch {
            // Fallback if getInitials fails
            const name = getDisplayName(person);
            if (!name) return '?';
            const parts = name.trim().split(/\s+/);
            if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
    };
    
    // Helper to get profile picture display
    const getProfilePictureDisplay = (person, size = 80) => {
        const picType = person.profilePictureType || 'initials';
        const pic = person.profilePicture;
        const initials = getInitialsForPerson(person);
        
        if (picType === 'emoji' && pic) {
            return (
                <div style={{
                    width: size,
                    height: size,
                    borderRadius: size <= 40 ? '50%' : 20,
                    border: '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--input-bg)',
                    fontSize: size * 0.6
                }}>
                    {pic}
                </div>
            );
        } else if ((picType === 'upload' || picType === 'ai') && pic) {
            return (
                <div style={{
                    width: size,
                    height: size,
                    borderRadius: size <= 40 ? '50%' : 20,
                    border: '2px solid var(--border)',
                    overflow: 'hidden',
                    background: 'var(--input-bg)'
                }}>
                    <img 
                        src={pic} 
                        alt={getDisplayName(person)}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                </div>
            );
        } else {
            // Default to initials
            return (
                <div style={{
                    width: size,
                    height: size,
                    borderRadius: size <= 40 ? '50%' : 20,
                    border: '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--input-bg)',
                    fontWeight: 900,
                    fontSize: size <= 40 ? size * 0.4 : size * 0.35
                }}>
                    {initials || '?'}
                </div>
            );
        }
    };

    // Listen for updates from other components
    React.useEffect(() => {
        const handlePeopleUpdate = () => {
            try {
                const fresh = JSON.parse(localStorage.getItem('savedPeople') || '[]');
                setPeople(fresh);
            } catch {}
        };
        window.addEventListener('people-updated', handlePeopleUpdate);
        return () => window.removeEventListener('people-updated', handlePeopleUpdate);
    }, []);

    const persistPeople = (newList) => {
        setPeople(newList);
        localStorage.setItem('savedPeople', JSON.stringify(newList));
        window.dispatchEvent(new Event('people-updated'));
    };

    const parseTags = (raw) => {
        if (Array.isArray(raw)) return raw.filter(Boolean);
        return String(raw || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    };

    const parseLinks = (raw) => {
        // Accept comma OR newline separated
        const s = String(raw || '').trim();
        if (!s) return [];
        return s
            .split(/\n|,/g)
            .map(x => x.trim())
            .filter(Boolean);
    };

    const handleSave = () => {
        // Auto-generate name from firstName/lastName if not provided
        const fullName = formData.name.trim() || [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
        if (!fullName) return;

        const tagsArray = parseTags(formData.tags);
        const linksArray = parseLinks(formData.links);
        const locationIds = Array.isArray(formData.locationIds) ? formData.locationIds.filter(Boolean) : [];

        // Merge contact field (legacy) with phone/email
        const phone = formData.phone || (formData.contact && formData.contact.match(/[\d\s\-\(\)]+/) ? formData.contact : '');
        const email = formData.email || (formData.contact && formData.contact.includes('@') ? formData.contact : '');

        // Auto-split name if firstName/lastName not provided
        const nameParts = splitName({ 
            firstName: formData.firstName, 
            lastName: formData.lastName, 
            name: fullName 
        });

        if (editId) {
            const updated = people.map(p => p.id === editId ? {
                ...p,
                name: fullName, // Keep name for backward compatibility
                firstName: nameParts.firstName,
                lastName: nameParts.lastName,
                type: formData.type || 'client',
                phone: phone.trim(),
                email: email.trim(),
                contact: (formData.contact || '').trim(), // Keep for backward compatibility
                tags: tagsArray,
                weight: parseInt(formData.weight) || 1,
                compassCrmLink: (formData.compassCrmLink || '').trim(),
                links: linksArray,
                notes: (formData.notes || '').trim(),
                locationIds: locationIds,
                updatedAt: new Date().toISOString()
            } : p);
            persistPeople(updated);
            notify?.("Person Updated", "✨");
        } else {
            const newPerson = {
                id: 'person_' + Date.now(),
                name: fullName, // Keep name for backward compatibility
                firstName: nameParts.firstName,
                lastName: nameParts.lastName,
                type: formData.type || 'client',
                phone: phone.trim(),
                email: email.trim(),
                contact: (formData.contact || '').trim(), // Keep for backward compatibility
                tags: tagsArray,
                weight: parseInt(formData.weight) || 1,
                compassCrmLink: (formData.compassCrmLink || '').trim(),
                links: linksArray,
                notes: (formData.notes || '').trim(),
                locationIds: locationIds,
                createdAt: new Date().toISOString()
            };
            persistPeople([...people, newPerson]);
            notify?.("Person Added", "✅");
        }
        resetForm();
    };

    const handleEdit = (person) => {
        // Auto-split the name
        const nameParts = splitName(person);
        
        setFormData({
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            name: person.name || '', // Keep for backward compatibility
            type: person.type || 'client',
            phone: person.phone || '',
            email: person.email || '',
            contact: person.contact || person.phone || person.email || '', // Legacy support
            tags: Array.isArray(person.tags) ? person.tags.join(', ') : (person.tags || ''),
            weight: person.weight || 1,
            compassCrmLink: person.compassCrmLink || person.compassLink || '',
            links: Array.isArray(person.links) ? person.links.join('\n') : (person.links || ''),
            notes: person.notes || '',
            locationIds: Array.isArray(person.locationIds) ? person.locationIds : []
        });
        setEditId(person.id);
        setIsEditing(true);
        setSelectedPersonId(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm("Remove this person?")) {
            persistPeople(people.filter(p => p.id !== id));
            if (selectedPersonId === id) setSelectedPersonId(null);
            notify?.("Deleted", "🗑");
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            name: '',
            type: 'client',
            phone: '',
            email: '',
            contact: '',
            tags: '',
            weight: 1,
            compassCrmLink: '',
            links: '',
            notes: '',
            locationIds: []
        });
        setEditId(null);
        setIsEditing(false);
    };

    const safeHistory = Array.isArray(history) ? history : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    const normalizePeopleInItem = (item) => {
        const arr = Array.isArray(item?.people) ? item.people : [];
        return arr.map(p => String(p || '').trim()).filter(Boolean);
    };

    const normalizeDuration = (item) => {
        const v = Number(item?.duration);
        return isFinite(v) ? v : 0;
    };

    // People analytics from tasks + history
    const peopleStats = React.useMemo(() => {
        const map = {}; // name -> { count, minutes, lastSeen }
        const touch = (name, dur, when) => {
            const key = String(name || '').trim();
            if (!key) return;
            if (!map[key]) map[key] = { name: key, count: 0, minutes: 0, lastSeen: 0 };
            map[key].count += 1;
            map[key].minutes += (Number(dur) || 0);
            const t = new Date(when || Date.now()).getTime();
            if (t > map[key].lastSeen) map[key].lastSeen = t;
        };

        // history
        safeHistory.forEach(h => {
            const who = normalizePeopleInItem(h);
            if (!who.length) return;
            const dur = normalizeDuration(h);
            const when = h.createdAt || h.completedAt || Date.now();
            who.forEach(n => touch(n, dur, when));
        });

        // active tasks (optional analytics)
        safeTasks.forEach(t => {
            const who = normalizePeopleInItem(t);
            if (!who.length) return;
            const when = t.createdAt || t.updatedAt || Date.now();
            who.forEach(n => touch(n, 0, when));
        });

        return map;
    }, [safeHistory, safeTasks]);

    const filteredPeople = people.filter(p => {
        const q = (searchText || '').toLowerCase();
        const displayName = getDisplayName(p);
        return displayName.toLowerCase().includes(q) ||
               (p.firstName || '').toLowerCase().includes(q) ||
               (p.lastName || '').toLowerCase().includes(q) ||
               (p.phone || '').toLowerCase().includes(q) ||
               (p.email || '').toLowerCase().includes(q) ||
               (p.contact || '').toLowerCase().includes(q) ||
               (p.compassCrmLink || '').toLowerCase().includes(q) ||
               (p.type || '').toLowerCase().includes(q) ||
               (Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '')).toLowerCase().includes(q);
    });

    const selectedPerson = React.useMemo(() => {
        if (!selectedPersonId) return null;
        return (people || []).find(p => p.id === selectedPersonId) || null;
    }, [selectedPersonId, people]);

    const selectedPersonName = selectedPerson ? getDisplayName(selectedPerson) : '';
    const selectedPersonHistory = React.useMemo(() => {
        if (!selectedPersonName) return [];
        const key = selectedPersonName.toLowerCase();
        return safeHistory
            .filter(h => normalizePeopleInItem(h).some(n => n.toLowerCase() === key))
            .slice()
            .sort((a, b) => {
                const ta = new Date(a?.createdAt || a?.completedAt || a?.ts || 0).getTime();
                const tb = new Date(b?.createdAt || b?.completedAt || b?.ts || 0).getTime();
                return tb - ta;
            });
    }, [safeHistory, selectedPersonName]);
    
    // Find tasks associated with selected person
    const selectedPersonTasks = React.useMemo(() => {
        if (!selectedPersonName) return [];
        const key = selectedPersonName.toLowerCase();
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        return safeTasks.filter(task => {
            const taskPeople = Array.isArray(task.people) ? task.people : [];
            return taskPeople.some(p => {
                const personName = typeof p === 'object' ? (p.name || '') : String(p || '');
                return personName.toLowerCase() === key;
            });
        });
    }, [tasks, selectedPersonName]);

    // --- PERSON DETAIL VIEW (analytics + history) ---
    if (selectedPerson) {
        const stat = peopleStats[selectedPersonName] || { count: 0, minutes: 0, lastSeen: 0 };
        const lastSeenTxt = stat.lastSeen ? new Date(stat.lastSeen).toLocaleString() : '—';
        const timeDisplay = formatTimeSmart(stat.minutes);
        const onViewTask = window.onViewTask || (() => {});

        return (
            <div className="fade-in-up" style={{background:'var(--card)', borderRadius:16, padding:24, border:'1px solid var(--border)', boxShadow:'0 8px 30px rgba(0,0,0,0.15)'}}>
                {/* Header with Profile Picture */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, gap:16}}>
                    <div style={{display:'flex', alignItems:'flex-start', gap:16, flex:1}}>
                        {getProfilePictureDisplay(selectedPerson, 80)}
                        <div style={{flex:1}}>
                            <div style={{fontFamily:'Fredoka', fontSize:24, fontWeight:800, marginBottom:6}}>{getDisplayName(selectedPerson)}</div>
                            <div style={{fontSize:12, color:'var(--text-light)', marginBottom:8}}>Last seen: {lastSeenTxt}</div>
                            {(selectedPerson.jobTitle || selectedPerson.company) && (
                                <div style={{fontSize:13, color:'var(--text-light)', marginBottom:4}}>
                                    {selectedPerson.jobTitle}{selectedPerson.jobTitle && selectedPerson.company ? ' at ' : ''}{selectedPerson.company}
                                </div>
                            )}
                            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    background: 'rgba(255,107,53,0.15)',
                                    fontWeight: 600,
                                    fontSize: 11,
                                    textTransform: 'uppercase'
                                }}>
                                    {(selectedPerson.type || 'client')}
                                </span>
                                {selectedPersonTasks.length > 0 && (
                                    <span style={{fontSize:12, color:'var(--text-light)'}}>
                                        📋 {selectedPersonTasks.length} {selectedPersonTasks.length === 1 ? 'task' : 'tasks'}
                                    </span>
                                )}
                                {selectedPersonHistory.length > 0 && (
                                    <span style={{fontSize:12, color:'var(--text-light)'}}>
                                        📜 {selectedPersonHistory.length} {selectedPersonHistory.length === 1 ? 'activity' : 'activities'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{display:'flex', gap:10, flexDirection:'column', alignItems:'flex-end'}}>
                        <div style={{display:'flex', gap:8}}>
                            <button 
                                className={viewMode === 'summary' ? 'btn-primary' : 'btn-white-outline'} 
                                style={{height:36, fontSize:12, padding:'0 12px'}} 
                                onClick={() => setViewMode('summary')}
                            >
                                Summary
                            </button>
                            <button 
                                className={viewMode === 'detailed' ? 'btn-primary' : 'btn-white-outline'} 
                                style={{height:36, fontSize:12, padding:'0 12px'}} 
                                onClick={() => setViewMode('detailed')}
                            >
                                Detailed
                            </button>
                        </div>
                        <div style={{display:'flex', gap:10}}>
                            <button 
                                className="btn-white-outline" 
                                style={{height:40}} 
                                onClick={() => generateAIPhoto(selectedPerson)}
                                title="Generate AI Profile Picture"
                            >
                                🎨 Gen Pic
                            </button>
                            <button className="btn-white-outline" style={{height:40}} onClick={() => setSelectedPersonId(null)}>Back</button>
                            <button className="btn-primary" style={{height:40}} onClick={() => handleEdit(selectedPerson)}>Edit</button>
                        </div>
                    </div>
                </div>

                <div style={{display:'flex', gap:12, marginBottom:16}}>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 12px', flex:1, textAlign:'center'}}>
                        <div style={{fontSize:22, fontWeight:900, color:'var(--primary)'}}>{stat.count}</div>
                        <div style={{fontSize:10, opacity:0.65, fontWeight:800, textTransform:'uppercase'}}>Mentions</div>
                    </div>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 12px', flex:1, textAlign:'center'}}>
                        <div style={{fontSize:22, fontWeight:900, color:'var(--primary)'}}>{timeDisplay}</div>
                        <div style={{fontSize:10, opacity:0.65, fontWeight:800, textTransform:'uppercase'}}>Time Tracked</div>
                    </div>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 12px', flex:1, textAlign:'center'}}>
                        <div style={{fontSize:22, fontWeight:900, color:'var(--primary)'}}>{selectedPerson.weight || 1}</div>
                        <div style={{fontSize:10, opacity:0.65, fontWeight:800, textTransform:'uppercase'}}>Weight</div>
                    </div>
                </div>

                {/* Contact Information - Show in detailed view */}
                {viewMode === 'detailed' && (
                    <div style={{marginBottom:20}}>
                        <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', marginBottom:12, letterSpacing:0.5, textTransform:'uppercase'}}>Contact Information</div>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16}}>
                            {selectedPerson.email && (
                                <div>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>📧 EMAIL</div>
                                    <a href={`mailto:${selectedPerson.email}`} style={{color:'var(--primary)', textDecoration:'none', fontSize:14}}>
                                        {selectedPerson.email}
                                    </a>
                                </div>
                            )}
                            {selectedPerson.phone && (
                                <div>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>📞 PHONE</div>
                                    <a href={`tel:${selectedPerson.phone}`} style={{color:'var(--primary)', textDecoration:'none', fontSize:14}}>
                                        {selectedPerson.phone}
                                    </a>
                                </div>
                            )}
                            {selectedPerson.company && (
                                <div>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>🏢 COMPANY</div>
                                    <div style={{fontSize:14, fontWeight:600}}>{selectedPerson.company}</div>
                                </div>
                            )}
                            {selectedPerson.website && (
                                <div>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>🌐 WEBSITE</div>
                                    <a href={selectedPerson.website.startsWith('http') ? selectedPerson.website : `https://${selectedPerson.website}`} target="_blank" rel="noreferrer" style={{color:'var(--primary)', textDecoration:'none', fontSize:14}}>
                                        {selectedPerson.website} →
                                    </a>
                                </div>
                            )}
                            {selectedPerson.linkedin && (
                                <div>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>💼 LINKEDIN</div>
                                    <a href={selectedPerson.linkedin.startsWith('http') ? selectedPerson.linkedin : `https://${selectedPerson.linkedin}`} target="_blank" rel="noreferrer" style={{color:'var(--primary)', textDecoration:'none', fontSize:14}}>
                                        View Profile →
                                    </a>
                                </div>
                            )}
                            {selectedPerson.compassCrmLink && (
                                <div>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>🧭 CRM LINK</div>
                                    <a href={selectedPerson.compassCrmLink} target="_blank" rel="noreferrer" style={{color:'var(--primary)', textDecoration:'none', fontSize:14}}>
                                        View in CRM →
                                    </a>
                                </div>
                            )}
                            {(selectedPerson.address || selectedPerson.city || selectedPerson.state || selectedPerson.zipCode) && (
                                <div style={{gridColumn:'1 / -1'}}>
                                    <div style={{fontSize:11, color:'var(--text-light)', marginBottom:6, fontWeight:700}}>📍 ADDRESS</div>
                                    <div style={{fontSize:14, lineHeight:1.6}}>
                                        {[selectedPerson.address, selectedPerson.city, selectedPerson.state, selectedPerson.zipCode, selectedPerson.country].filter(Boolean).join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>
                        {(selectedPerson.compassCrmLink || (Array.isArray(selectedPerson.links) && selectedPerson.links.length > 0)) && (
                            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginTop:16}}>
                                <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:8}}>Additional Links</div>
                                {Array.isArray(selectedPerson.links) && selectedPerson.links.length > 0 && (
                                    <div style={{display:'grid', gap:6}}>
                                        {selectedPerson.links.map((u, idx) => (
                                            <a key={idx} href={u.startsWith('http') ? u : `https://${u}`} target="_blank" rel="noreferrer" style={{color:'var(--primary)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                {u} →
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedPerson.notes && (
                            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginTop:16}}>
                                <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:6}}>Notes</div>
                                <div style={{fontSize:12, whiteSpace:'pre-wrap', lineHeight:1.5}}>{selectedPerson.notes}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tasks Section */}
                {selectedPersonTasks.length > 0 && (
                    <div style={{marginBottom:20}}>
                        <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', marginBottom:12, letterSpacing:0.5, textTransform:'uppercase', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span>📋 ASSOCIATED TASKS ({selectedPersonTasks.length})</span>
                            <span style={{fontSize:11, fontWeight:400, textTransform:'none'}}>
                                {selectedPersonTasks.filter(t => t.completed).length} completed
                            </span>
                        </div>
                        <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', maxHeight:300, overflowY:'auto'}}>
                            {selectedPersonTasks.slice(0, 20).map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => onViewTask?.(task)}
                                    style={{
                                        padding:'12px 16px',
                                        borderBottom:'1px solid var(--border)',
                                        cursor:'pointer',
                                        background: task.completed ? 'rgba(0,184,148,0.05)' : 'transparent',
                                        transition:'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = task.completed ? 'rgba(0,184,148,0.1)' : 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = task.completed ? 'rgba(0,184,148,0.05)' : 'transparent';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                                        <span style={{fontSize:16}}>{task.completed ? '✅' : '⭕'}</span>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontSize:14, fontWeight:600, textDecoration:task.completed ? 'line-through' : 'none', opacity:task.completed ? 0.7 : 1, marginBottom:4}}>
                                                {task.title || 'Untitled Task'}
                                            </div>
                                            <div style={{fontSize:11, color:'var(--text-light)'}}>
                                                {task.category && `📁 ${task.category} `}
                                                {task.priority && `⚡ ${task.priority} `}
                                                {task.dueDate && `📅 ${new Date(task.dueDate).toLocaleDateString()}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* History Section */}
                <div>
                    <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', marginBottom:12, letterSpacing:0.5, textTransform:'uppercase'}}>
                        📜 ACTIVITY HISTORY ({selectedPersonHistory.length})
                    </div>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', maxHeight:viewMode === 'detailed' ? 500 : 300, overflowY:'auto'}}>
                        {selectedPersonHistory.length === 0 ? (
                            <div style={{padding:40, opacity:0.65, textAlign:'center'}}>No history entries referencing this person yet.</div>
                        ) : (
                            selectedPersonHistory.slice(0, viewMode === 'detailed' ? 200 : 100).map((h, i) => {
                                const when = new Date(h?.createdAt || h?.completedAt || h?.ts || Date.now());
                                const title = h?.title || h?.taskName || h?.text || 'Untitled';
                                const cat = h?.category || 'General';
                                const type = h?.type || (h?.completedAt ? 'Completed' : 'Sessions');
                                const dur = Number(h?.duration) || 0;
                                const valueText = dur ? `${Math.round(dur)}m` : (h?.value != null ? String(h.value) : '');
                                const taskId = h?.taskId || h?.raw?.taskId;
                                const relatedTask = taskId ? (Array.isArray(tasks) ? tasks.find(t => t.id === taskId) : null) : null;
                                const isClickable = relatedTask || taskId;
                                
                                const getHistoryIcon = () => {
                                    if (type.includes('complete') || type.includes('done')) return '✅';
                                    if (type.includes('focus') || type.includes('timer')) return '🎯';
                                    if (type.includes('spin')) return '🎰';
                                    if (type.includes('create')) return '➕';
                                    if (type.includes('edit')) return '✏️';
                                    return '📝';
                                };

                                return (
                                    <div
                                        key={h?.id || i}
                                        onClick={() => {
                                            if (relatedTask && onViewTask) {
                                                onViewTask(relatedTask);
                                            } else if (taskId && onViewTask) {
                                                // Try to find task
                                                const task = Array.isArray(tasks) ? tasks.find(t => t.id === taskId) : null;
                                                if (task) onViewTask(task);
                                            }
                                        }}
                                        style={{
                                            padding:'12px 16px',
                                            borderBottom:'1px solid var(--border)',
                                            display:'flex',
                                            justifyContent:'space-between',
                                            alignItems:'center',
                                            cursor: isClickable ? 'pointer' : 'default',
                                            background: 'transparent',
                                            transition:'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (isClickable) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                e.currentTarget.style.borderLeft = '3px solid var(--primary)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (isClickable) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.borderLeft = 'none';
                                            }
                                        }}
                                    >
                                        <div style={{display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0}}>
                                            <span style={{fontSize:18, flexShrink:0}}>{getHistoryIcon()}</span>
                                            <div style={{minWidth:0, flex:1}}>
                                                <div style={{fontSize:13, fontWeight:650, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4}}>
                                                    {title}
                                                    {isClickable && <span style={{fontSize:11, color:'var(--primary)', marginLeft:6}}>→</span>}
                                                </div>
                                                <div style={{fontSize:10, color:'var(--text-light)'}}>
                                                    {when.toLocaleString()} • {cat} • {type}
                                                </div>
                                            </div>
                                        </div>
                                        {valueText && (
                                            <div style={{fontSize:13, fontWeight:800, color:'var(--primary)', marginLeft:12}}>{valueText}</div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- EDIT FORM ---
    if (isEditing) {
        return (
            <div className="fade-in-up" style={{background: 'var(--card)', borderRadius: 16, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid var(--border)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                    <h3 style={{fontFamily:'Fredoka', margin:0, fontSize:20}}>{editId ? '✏️ Edit Person' : '👤 New Person'}</h3>
                    <button onClick={resetForm} style={{background:'none', border:'none', fontSize:24, cursor:'pointer', opacity:0.5}}>×</button>
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">NAME *</label>
                    <div style={{display:'flex', gap:10}}>
                        <div style={{flex:1}}>
                            <input className="f-input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="First name" autoFocus />
                        </div>
                        <div style={{flex:1}}>
                            <input className="f-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Last name" />
                        </div>
                    </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
                    <div>
                        <label className="f-label">PHONE</label>
                        <input className="f-input" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(555) 123-4567" />
                    </div>
                    <div>
                        <label className="f-label">EMAIL</label>
                        <input className="f-input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="name@email.com" />
                    </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
                    <div>
                        <label className="f-label">TYPE</label>
                        <select className="f-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                            <option value="client">Client</option>
                            <option value="lead">Lead</option>
                            <option value="agent">Agent</option>
                            <option value="vendor">Vendor</option>
                            <option value="friend">Friend</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="f-label">WEIGHT</label>
                        <input type="number" min="1" className="f-input" value={formData.weight} onChange={e => setFormData({...formData, weight: parseInt(e.target.value) || 1})} />
                    </div>
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">TAGS (comma separated)</label>
                    <input className="f-input" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="e.g. client, contractor" />
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">COMPASS CRM LINK</label>
                    <input className="f-input" value={formData.compassCrmLink} onChange={e => setFormData({...formData, compassCrmLink: e.target.value})} placeholder="Paste Compass contact permalink..." />
                    <div style={{fontSize:10, color:'var(--text-light)', marginTop:6}}>
                        Tip: this lets you keep TaskTumbler "lite" while jumping to Compass for full CRM.
                    </div>
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">OTHER LINKS (comma or new line separated)</label>
                    <textarea
                        className="f-input"
                        style={{minHeight:72, resize:'none', fontFamily:'inherit'}}
                        value={formData.links}
                        onChange={e => setFormData({...formData, links: e.target.value})}
                        placeholder={"Website\nGoogle Drive folder\nInstagram\netc."}
                    />
                </div>

                <div style={{marginBottom:18}}>
                    <label className="f-label">NOTES</label>
                    <textarea
                        className="f-input"
                        style={{minHeight:84, resize:'none', fontFamily:'inherit'}}
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="Any extra context (keep it light)..."
                    />
                </div>

                <div style={{display:'flex', gap:10}}>
                    <button className="btn-primary" style={{flex:1, height:44}} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Person'}</button>
                    <button className="btn-white-outline" style={{height:44}} onClick={resetForm}>Cancel</button>
                </div>
            </div>
        );
    }

    // AI Photo Generation using UI Avatars or DiceBear
    const generateAIPhoto = async (person) => {
        try {
            const displayName = getDisplayName(person);
            const initials = getInitialsForPerson(person) || '?';
            
            // Use DiceBear API for AI-generated avatars
            const style = 'avataaars'; // Options: avataaars, personas, identicon, bottts, etc.
            const seed = displayName.toLowerCase().replace(/\s+/g, '-');
            const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
            
            // Convert SVG to base64 or use URL directly
            // For now, we'll store the URL - could also fetch and convert to base64
            const updatedPeople = people.map(p => 
                p.id === person.id 
                    ? { ...p, profilePicture: avatarUrl, profilePictureType: 'ai', updatedAt: new Date().toISOString() }
                    : p
            );
            persistPeople(updatedPeople);
            notify?.('AI profile picture generated!', '✨');
            
            // Also update selected person if viewing
            if (selectedPersonId === person.id) {
                setSelectedPersonId(null);
                setTimeout(() => setSelectedPersonId(person.id), 100);
            }
        } catch (error) {
            console.error('Error generating AI photo:', error);
            notify?.('Failed to generate AI photo. Please try again.', '❌');
        }
    };

    // --- LIST VIEW ---
    return (
        <div className="fade-in">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12}}>
                <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', letterSpacing:1}}>MY PEOPLE ({people.length})</div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    {/* View Mode Selector */}
                    <div style={{display:'flex', gap:4, background:'var(--bg)', padding:4, borderRadius:8, border:'1px solid var(--border)'}}>
                        <button
                            onClick={() => setListViewMode('cards')}
                            className={listViewMode === 'cards' ? 'btn-primary' : 'btn-white-outline'}
                            style={{padding:'4px 10px', fontSize:11, height:28, minWidth:50}}
                            title="Card View"
                        >
                            🎴
                        </button>
                        <button
                            onClick={() => setListViewMode('list')}
                            className={listViewMode === 'list' ? 'btn-primary' : 'btn-white-outline'}
                            style={{padding:'4px 10px', fontSize:11, height:28, minWidth:50}}
                            title="List View"
                        >
                            📋
                        </button>
                        <button
                            onClick={() => setListViewMode('table')}
                            className={listViewMode === 'table' ? 'btn-primary' : 'btn-white-outline'}
                            style={{padding:'4px 10px', fontSize:11, height:28, minWidth:50}}
                            title="Table View"
                        >
                            📊
                        </button>
                        <button
                            onClick={() => setListViewMode('compact')}
                            className={listViewMode === 'compact' ? 'btn-primary' : 'btn-white-outline'}
                            style={{padding:'4px 10px', fontSize:11, height:28, minWidth:50}}
                            title="Compact View"
                        >
                            ⚡
                        </button>
                    </div>
                    <button className="btn-orange-small" onClick={() => { setSelectedPersonId(null); setIsEditing(true); }} style={{padding:'6px 12px', fontSize:12}}>+ Add New</button>
                </div>
            </div>

            <input className="f-input" placeholder="Search people..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{marginBottom:16}} />

            {filteredPeople.length === 0 ? (
                <div style={{textAlign:'center', padding:40, background:'var(--card)', borderRadius:16, border:'2px dashed var(--border)', opacity:0.8}}>
                    <div style={{fontSize:40, marginBottom:10, opacity:0.5}}>👥</div>
                    <div style={{fontWeight:700, fontSize:16}}>{people.length === 0 ? 'No People Yet' : 'No matches'}</div>
                </div>
            ) : (
                (() => {
                    // Cards View
                    if (listViewMode === 'cards') {
                        return (
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10}}>
                                {filteredPeople.map(p => {
                                    const stat = (peopleStats[(getDisplayName(p) || '').trim()] || { count: 0, minutes: 0, lastSeen: 0 });
                                    const timeTracked = formatTimeSmart(stat.minutes);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedPersonId(p.id)}
                                            style={{
                                                background:'var(--card)',
                                                borderRadius:12,
                                                padding:14,
                                                cursor:'pointer',
                                                border:'1px solid transparent',
                                                transition:'all 0.2s',
                                                position:'relative'
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor='var(--primary)'; }}
                                            onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='transparent'; }}
                                        >
                                            <div style={{display:'flex', justifyContent:'center', marginBottom:8}}>
                                                {getProfilePictureDisplay(p, 40)}
                                            </div>

                                            <div style={{fontWeight:750, fontSize:14, marginBottom:4, textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                                {getDisplayName(p)}
                                            </div>

                                            {p.contact && (
                                                <div style={{fontSize:10, color:'var(--text-light)', textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                                    {p.contact}
                                                </div>
                                            )}

                                            <div style={{display:'flex', justifyContent:'center', gap:10, marginTop:10}}>
                                                <div style={{fontSize:10, opacity:0.7, fontWeight:800}}>🔁 {stat.count}</div>
                                                <div style={{fontSize:10, fontWeight:800, color:'var(--primary)'}}>
                                                    ⏱ {timeTracked}
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(e, p.id); }}
                                                style={{position:'absolute', top:8, right:8, background:'none', border:'none', fontSize:12, cursor:'pointer', opacity:0.3}}
                                                onMouseOver={e => e.target.style.opacity=1}
                                                onMouseOut={e => e.target.style.opacity=0.3}
                                                title="Delete"
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }
                    
                    // List View
                    if (listViewMode === 'list') {
                        return (
                            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                                {filteredPeople.map(p => {
                                    const stat = (peopleStats[(getDisplayName(p) || '').trim()] || { count: 0, minutes: 0, lastSeen: 0 });
                                    const timeTracked = formatTimeSmart(stat.minutes);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedPersonId(p.id)}
                                            style={{
                                                background:'var(--card)',
                                                borderRadius:12,
                                                padding:12,
                                                cursor:'pointer',
                                                border:'1px solid var(--border)',
                                                transition:'all 0.2s',
                                                display:'flex',
                                                alignItems:'center',
                                                gap:12,
                                                position:'relative'
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='rgba(255,107,53,0.05)'; }}
                                            onMouseOut={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--card)'; }}
                                        >
                                            {getProfilePictureDisplay(p, 48)}
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontWeight:750, fontSize:15, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                    {getDisplayName(p)}
                                                </div>
                                                <div style={{fontSize:12, color:'var(--text-light)', display:'flex', gap:12, flexWrap:'wrap'}}>
                                                    {p.email && <span>📧 {p.email}</span>}
                                                    {p.phone && <span>📞 {p.phone}</span>}
                                                    {p.company && <span>🏢 {p.company}</span>}
                                                    <span>🔁 {stat.count}</span>
                                                    <span>⏱ {timeTracked}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(e, p.id); }}
                                                style={{background:'none', border:'none', fontSize:14, cursor:'pointer', opacity:0.3, padding:8}}
                                                onMouseOver={e => e.target.style.opacity=1}
                                                onMouseOut={e => e.target.style.opacity=0.3}
                                                title="Delete"
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }
                    
                    // Table View
                    if (listViewMode === 'table') {
                        return (
                            <div style={{background:'var(--card)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden'}}>
                                <div style={{display:'grid', gridTemplateColumns:'40px 2fr 1.5fr 1fr 100px 80px 40px', gap:12, padding:'12px 16px', background:'var(--bg)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-light)', textTransform:'uppercase'}}>
                                    <div></div>
                                    <div>Name</div>
                                    <div>Contact</div>
                                    <div>Type</div>
                                    <div>Mentions</div>
                                    <div>Time</div>
                                    <div></div>
                                </div>
                                <div style={{maxHeight:600, overflowY:'auto'}}>
                                    {filteredPeople.map(p => {
                                        const stat = (peopleStats[(getDisplayName(p) || '').trim()] || { count: 0, minutes: 0, lastSeen: 0 });
                                        const timeTracked = formatTimeSmart(stat.minutes);
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedPersonId(p.id)}
                                                style={{
                                                    display:'grid',
                                                    gridTemplateColumns:'40px 2fr 1.5fr 1fr 100px 80px 40px',
                                                    gap:12,
                                                    padding:'12px 16px',
                                                    cursor:'pointer',
                                                    borderBottom:'1px solid var(--border)',
                                                    transition:'all 0.2s',
                                                    alignItems:'center'
                                                }}
                                                onMouseOver={e => { e.currentTarget.style.background='rgba(255,107,53,0.05)'; }}
                                                onMouseOut={e => { e.currentTarget.style.background='transparent'; }}
                                            >
                                                <div>{getProfilePictureDisplay(p, 32)}</div>
                                                <div style={{fontWeight:650, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{getDisplayName(p)}</div>
                                                <div style={{fontSize:12, color:'var(--text-light)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                    {p.email || p.phone || '—'}
                                                </div>
                                                <div style={{fontSize:12, textTransform:'capitalize'}}>{(p.type || 'client')}</div>
                                                <div style={{fontSize:13, fontWeight:600}}>{stat.count}</div>
                                                <div style={{fontSize:13, fontWeight:600, color:'var(--primary)'}}>{timeTracked}</div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(e, p.id); }}
                                                    style={{background:'none', border:'none', fontSize:12, cursor:'pointer', opacity:0.3}}
                                                    onMouseOver={e => e.target.style.opacity=1}
                                                    onMouseOut={e => e.target.style.opacity=0.3}
                                                    title="Delete"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }
                    
                    // Compact View
                    return (
                        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                            {filteredPeople.map(p => {
                                const stat = (peopleStats[(getDisplayName(p) || '').trim()] || { count: 0, minutes: 0, lastSeen: 0 });
                                const timeTracked = formatTimeSmart(stat.minutes);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedPersonId(p.id)}
                                        style={{
                                            background:'var(--card)',
                                            borderRadius:8,
                                            padding:'8px 12px',
                                            cursor:'pointer',
                                            border:'1px solid var(--border)',
                                            transition:'all 0.2s',
                                            display:'flex',
                                            alignItems:'center',
                                            gap:8
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor='var(--primary)'; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor='var(--border)'; }}
                                    >
                                        {getProfilePictureDisplay(p, 28)}
                                        <div style={{fontWeight:650, fontSize:13}}>{getDisplayName(p)}</div>
                                        <div style={{fontSize:11, color:'var(--text-light)', marginLeft:4}}>• {timeTracked}</div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()
            )}
        </div>
    );
}

// --- INTERNAL COMPONENT: LOCATIONS MANAGER ---
// Adds: show stored GPS coords + addressLabel (if present), and keeps existing structure
function LocationsManager({ locations, setLocations, notify }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editId, setEditId] = React.useState(null);

    const [formData, setFormData] = React.useState({
        name: '',
        address: '',
        type: 'client',
        notes: '',
        addressLabel: '',
        coords: null
    });

    const getTypeIcon = (type) => {
        switch(type) {
            case 'client': return '🏢';
            case 'vendor': return '🚚';
            case 'personal': return '🏠';
            case 'project': return '🏗️';
            default: return '📍';
        }
    };

    const getTypeColor = (type) => {
        switch(type) {
            case 'client': return 'var(--primary)';
            case 'vendor': return '#FF9800';
            case 'personal': return '#2196F3';
            case 'project': return '#9C27B0';
            default: return 'var(--text-light)';
        }
    };

    // Persist locations via storage helper
    const persistLocations = (newLocs) => {
        setLocations(newLocs);
        if (typeof window.setSavedLocationsV1 === 'function') {
            window.setSavedLocationsV1(newLocs);
        } else {
            localStorage.setItem('savedLocations_v1', JSON.stringify(newLocs));
        }
        window.dispatchEvent(new Event('locations-updated'));
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;

        if (editId) {
            const updated = (locations || []).map(loc => loc.id === editId ? {
                ...loc,
                ...formData,
                name: (formData.name || '').trim(),
                address: (formData.address || '').trim(),
                notes: (formData.notes || '').trim(),
                addressLabel: (formData.addressLabel || '').trim(),
                updatedAt: new Date().toISOString()
            } : loc);

            persistLocations(updated);
            notify?.("Location Updated", "✨");
        } else {
            const newLoc = {
                id: 'loc_' + Date.now(),
                ...formData,
                name: (formData.name || '').trim(),
                address: (formData.address || '').trim(),
                notes: (formData.notes || '').trim(),
                addressLabel: (formData.addressLabel || '').trim(),
                coords: formData.coords || null,
                createdAt: new Date().toISOString()
            };
            persistLocations([...(locations || []), newLoc]);
            notify?.("Location Added", "✅");
        }

        resetForm();
    };

    const handleEdit = (loc) => {
        setFormData({
            name: loc.name || '',
            address: loc.address || '',
            type: loc.type || 'client',
            notes: loc.notes || '',
            addressLabel: loc.addressLabel || loc.label || '',
            coords: loc.coords || null
        });
        setEditId(loc.id);
        setIsEditing(true);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm("Remove this location?")) {
            persistLocations((locations || []).filter(l => l.id !== id));
            notify?.("Deleted", "🗑");
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', type: 'client', notes: '', addressLabel: '', coords: null });
        setEditId(null);
        setIsEditing(false);
    };

    const formatCoords = (coords) => {
        if (!coords) return '';
        const lat = (coords.lat != null) ? Number(coords.lat) : null;
        const lon = (coords.lon != null) ? Number(coords.lon) : null;
        if (lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) return '';
        return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    };

    if (isEditing) {
        return (
            <div className="fade-in-up" style={{background: 'var(--card)', borderRadius: 16, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid var(--border)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                    <h3 style={{fontFamily:'Fredoka', margin:0, fontSize:20}}>{editId ? '✏️ Edit Place' : '📍 New Place'}</h3>
                    <button onClick={resetForm} style={{background:'none', border:'none', fontSize:24, cursor:'pointer', opacity:0.5}}>×</button>
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">NAME</label>
                    <input className="f-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Headquarters" autoFocus />
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
                    <div>
                        <label className="f-label">TYPE</label>
                        <select className="f-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                            <option value="client">🏢 Client</option>
                            <option value="vendor">🚚 Vendor</option>
                            <option value="personal">🏠 Personal</option>
                            <option value="project">🏗️ Project</option>
                        </select>
                    </div>
                    <div>
                        <label className="f-label">ADDRESS</label>
                        <input className="f-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street address..." />
                    </div>
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">GPS LABEL (from reverse geocode, optional)</label>
                    <input
                        className="f-input"
                        value={formData.addressLabel}
                        onChange={e => setFormData({...formData, addressLabel: e.target.value})}
                        placeholder="Auto label captured by GPS..."
                    />
                </div>

                <div style={{marginBottom:14}}>
                    <label className="f-label">GPS COORDS (read only)</label>
                    <input className="f-input" value={formatCoords(formData.coords) || '—'} readOnly style={{opacity:0.85}} />
                    <div style={{fontSize:10, color:'var(--text-light)', marginTop:6}}>
                        Coords are stored when captured via GPS in the Timer tab.
                    </div>
                </div>

                <div style={{marginBottom:18}}>
                    <label className="f-label">NOTES</label>
                    <textarea className="f-input" style={{minHeight:84, resize:'none', fontFamily:'inherit'}} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Gate codes, parking info..." />
                </div>

                <div style={{display:'flex', gap:10}}>
                    <button className="btn-primary" style={{flex:1, height:44}} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Location'}</button>
                    <button className="btn-white-outline" style={{height:44}} onClick={resetForm}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', letterSpacing:1}}>MY PLACES ({(locations||[]).length})</div>
                <button className="btn-orange-small" onClick={() => setIsEditing(true)} style={{padding:'6px 12px', fontSize:12}}>+ Add New</button>
            </div>

            {(locations||[]).length === 0 ? (
                <div style={{textAlign:'center', padding:'40px 20px', background:'var(--card)', borderRadius:16, border:'2px dashed var(--border)', opacity:0.8}}>
                    <div style={{fontSize:40, marginBottom:10, opacity:0.5}}>🗺️</div>
                    <div style={{fontWeight:700, fontSize:16}}>No places yet</div>
                </div>
            ) : (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12}}>
                    {(locations||[]).map(loc => {
                        const hasCoords = loc?.coords && loc.coords.lat != null && loc.coords.lon != null;
                        const coordsTxt = hasCoords ? `${Number(loc.coords.lat).toFixed(4)}, ${Number(loc.coords.lon).toFixed(4)}` : '';
                        const labelTxt = (loc.addressLabel || loc.label || '').trim();

                        return (
                            <div key={loc.id} onClick={() => handleEdit(loc)} style={{background: 'var(--card)', borderRadius: 16, padding: 14, cursor: 'pointer', border: '1px solid transparent', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition:'all 0.2s'}}
                                 onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor='var(--primary)'; }}
                                 onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='transparent'; }}>
                                <div style={{width: 36, height: 36, borderRadius: '50%', background: 'rgba(var(--bg-rgb), 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10, border: '1px solid var(--border-light)'}}>
                                    {getTypeIcon(loc.type)}
                                </div>

                                <div style={{fontWeight: 750, fontSize: 14, marginBottom: 4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                    {loc.name}
                                </div>

                                <div style={{fontSize: 11, color: 'var(--text-light)', marginBottom: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                    {loc.address || 'No address'}
                                </div>

                                {labelTxt && (
                                    <div style={{fontSize: 10, color:'var(--text-light)', marginBottom: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                        🏷 {labelTxt}
                                    </div>
                                )}

                                {hasCoords && (
                                    <div style={{fontSize: 10, color:'var(--primary)', marginBottom: 10, fontWeight:700}}>
                                        📡 {coordsTxt}
                                    </div>
                                )}

                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: getTypeColor(loc.type), background: 'rgba(var(--bg-rgb), 0.8)', padding: '2px 6px', borderRadius: 6}}>
                                        {loc.type}
                                    </span>
                                    <button onClick={(e) => handleDelete(e, loc.id)} style={{background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', opacity: 0.3}}>🗑</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ===========================================
// MAIN COMPONENT: STATS TAB
// ===========================================
export default function StatsTabLegacy({ tasks = [], history = [], categories = [], settings, notify, locations: locationsProp, setLocations: setLocationsProp, onViewTask }) {

    // Internal locations state that syncs with localStorage
    const [internalLocations, setInternalLocations] = React.useState(() => {
        if (typeof window.getSavedLocationsV1 === 'function') {
            return window.getSavedLocationsV1();
        }
        try {
            return JSON.parse(localStorage.getItem('savedLocations_v1') || '[]');
        } catch { return []; }
    });

    // Use prop if provided, otherwise use internal state
    const locations = (Array.isArray(locationsProp) && locationsProp.length > 0) ? locationsProp : internalLocations;

    const setLocations = (newLocs) => {
        const val = typeof newLocs === 'function' ? newLocs(locations) : newLocs;

        setInternalLocations(val);

        if (typeof window.setSavedLocationsV1 === 'function') {
            window.setSavedLocationsV1(val);
        } else {
            localStorage.setItem('savedLocations_v1', JSON.stringify(val));
        }

        if (typeof setLocationsProp === 'function') {
            setLocationsProp(val);
        }

        window.dispatchEvent(new Event('locations-updated'));
    };

    // Listen for location updates from other components
    React.useEffect(() => {
        const handleLocationUpdate = () => {
            const fresh = typeof window.getSavedLocationsV1 === 'function'
                ? window.getSavedLocationsV1()
                : JSON.parse(localStorage.getItem('savedLocations_v1') || '[]');
            setInternalLocations(fresh);
        };
        window.addEventListener('locations-updated', handleLocationUpdate);
        window.addEventListener('storage', (e) => {
            if (e.key === 'savedLocations_v1') handleLocationUpdate();
        });
        return () => {
            window.removeEventListener('locations-updated', handleLocationUpdate);
        };
    }, []);

    const [subView, setSubView] = React.useState(() => {
        // Only check URL hash - no localStorage persistence to allow permalinks
        const hash = window.location.hash;
        if (hash.includes('subView=charts')) return 'charts';
        if (hash.includes('subView=history')) return 'history';
        if (hash.includes('subView=people')) return 'people';
        if (hash.includes('subView=places')) return 'places';
        if (hash.includes('subView=overview')) return 'overview';
        
        return 'overview';
    });

    // Subtabs collapse state (persisted in localStorage)
    const [subTabsCollapsed, setSubTabsCollapsed] = React.useState(() => {
        try {
            const saved = localStorage.getItem('stats_subTabsCollapsed');
            return saved === 'true';
        } catch {
            return false;
        }
    });
    
    // Persist collapse state to localStorage
    const toggleSubTabsCollapsed = React.useCallback(() => {
        setSubTabsCollapsed(prev => {
            const newValue = !prev;
            try {
                localStorage.setItem('stats_subTabsCollapsed', String(newValue));
            } catch {}
            return newValue;
        });
    }, []);

    // Update subView and URL hash only (no localStorage persistence for permalinks)
    const updateSubView = (newSubView) => {
        setSubView(newSubView);
        
        // Update URL hash only - no localStorage to allow permalinks
        const currentHash = window.location.hash;
        const baseHash = currentHash.split('?')[0];
        const params = new URLSearchParams(currentHash.split('?')[1] || '');
        params.set('subView', newSubView);
        const newHash = `${baseHash}?${params.toString()}`;
        window.history.replaceState(null, '', newHash);
    };

    // Listen for hash changes to sync subView
    React.useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            let newSubView = 'overview';
            if (hash.includes('subView=charts')) newSubView = 'charts';
            else if (hash.includes('subView=history')) newSubView = 'history';
            else if (hash.includes('subView=people')) newSubView = 'people';
            else if (hash.includes('subView=places')) newSubView = 'places';
            else if (hash.includes('subView=overview')) newSubView = 'overview';
            
            if (newSubView !== subView) {
                setSubView(newSubView);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [subView]);

    const [timeRange, setTimeRange] = React.useState(7);
    const [unit, setUnit] = React.useState('minutes');
    const [chartType, setChartType] = React.useState('bar');
    const [chartCategoryFilter, setChartCategoryFilter] = React.useState('All');
    const [chartLocationFilter, setChartLocationFilter] = React.useState('All');
    const [chartTypeFilter, setChartTypeFilter] = React.useState('All');
    const [showChartFilters, setShowChartFilters] = React.useState(false);

    // Handle Escape key to close chart filters modal
    React.useEffect(() => {
        if (!showChartFilters) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowChartFilters(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [showChartFilters]);

    const [historyRange, setHistoryRange] = React.useState('week');
    const [historyType, setHistoryType] = React.useState([]); // Changed to array for multi-select
    const [historyFilter, setHistoryFilter] = React.useState('All');
    const [historySearch, setHistorySearch] = React.useState('');
    const [showTypeDropdown, setShowTypeDropdown] = React.useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = React.useState(null);

    const [peopleSearch, setPeopleSearch] = React.useState('');
    const [streak, setStreak] = React.useState(0);

    const safeHistory = Array.isArray(history) ? history : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    // Local categories state that syncs with prop AND localStorage
    const [localCategories, setLocalCategories] = React.useState(() => {
        try {
            const fromStore = JSON.parse(localStorage.getItem('categories') || '[]');
            const fromProp = Array.isArray(categories) ? categories : [];
            return Array.from(new Set([...fromProp, ...fromStore])).filter(Boolean);
        } catch { return Array.isArray(categories) ? categories : []; }
    });

    // Sync when prop changes
    React.useEffect(() => {
        if (Array.isArray(categories) && categories.length) {
            setLocalCategories(prev => Array.from(new Set([...categories, ...prev])).filter(Boolean));
        }
    }, [categories]);

    // Listen for categories-updated event
    React.useEffect(() => {
        const handleCategoryUpdate = () => {
            try {
                const fromStore = JSON.parse(localStorage.getItem('categories') || '[]');
                const fromProp = Array.isArray(categories) ? categories : [];
                setLocalCategories(Array.from(new Set([...fromProp, ...fromStore])).filter(Boolean));
            } catch {}
        };
        window.addEventListener('categories-updated', handleCategoryUpdate);
        return () => window.removeEventListener('categories-updated', handleCategoryUpdate);
    }, [categories]);

    const safeCategories = localCategories.filter(Boolean);

    const safeDate = (v) => {
        const d = new Date(v || Date.now());
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const rangeStart = (rangeKey) => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0,0,0,0);
        if (rangeKey === 'day') return start;
        if (rangeKey === 'week') { start.setDate(start.getDate() - 6); return start; }
        if (rangeKey === 'month') { start.setDate(start.getDate() - 29); return start; }
        if (rangeKey === 'year') { start.setDate(start.getDate() - 364); return start; }
        if (rangeKey === 'ytd') { return new Date(now.getFullYear(), 0, 1); }
        return new Date(0);
    };

    // Format minutes to readable hours/days
    const formatDuration = (minutes) => {
        if (!minutes || minutes === 0) return '';
        const mins = Math.round(minutes);
        
        // If less than 60 minutes, show minutes
        if (mins < 60) return `${mins}m`;
        
        // Calculate hours and remaining minutes
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        
        // If less than 24 hours, show hours and minutes
        if (hours < 24) {
            if (remainingMins === 0) return `${hours}h`;
            return `${hours}h ${remainingMins}m`;
        }
        
        // If 24+ hours, show days and hours
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        if (remainingHours === 0) return `${days}d`;
        return `${days}d ${remainingHours}h`;
    };

    // --- NORMALIZATION ---
    const normalizeActivity = (h) => {
        const title = (h?.title || h?.taskName || 'Untitled');
        const category = (h?.category || 'General');
        const createdAt = (h?.createdAt || h?.completedAt || Date.now());
        const minutes = Number(h?.duration) || 0;

        let type = (h?.type || '').toString();
        if (!type) {
            if (h?.completedAt || h?.taskName) type = 'Completed';
            else type = 'All';
        }

        let valueText = '';
        if (type === 'Completed' || type === 'Sessions' || type === 'focus') {
            valueText = formatDuration(minutes);
        } else if (typeof h?.value !== 'undefined' && h?.value !== null) {
            valueText = String(h.value);
        } else if (minutes) {
            valueText = formatDuration(minutes);
        }

        const people = Array.isArray(h?.people) ? h.people.map(p => String(p || '').trim()).filter(Boolean) : [];
        const locationLabel = (h?.locationLabel || h?.location || '').toString();
        const locationId = (h?.locationId || '').toString();
        const coords = h?.locationCoords || h?.coords || null;
        const notes = (h?.notes || '').toString();

        return { raw: h, title, category, type, duration: minutes, createdAt, valueText, people, locationLabel, locationId, coords, notes };
    };

    // Define all possible activity types that can be logged
    const allPossibleTypes = [
        'Completed',
        'Sessions',
        'focus',
        'timer',
        'log',
        'spin',
        'respin',
        'duel',
        'task_created',
        'task_edited',
        'contact_created',
        'contact_edited',
        'location_created',
        'location_edited',
        'completion',
        'spin_result'
    ];

    // Default/important types (most commonly used) - read from localStorage or use fallback
    const defaultImportantTypes = React.useMemo(() => {
        try {
            const stored = localStorage.getItem('historyFilterDefaults');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to parse historyFilterDefaults from localStorage', e);
        }
        // Fallback to default
        return ['Completed', 'Sessions', 'focus', 'timer', 'log', 'spin', 'respin'];
    }, []);

    // Get types that actually exist in history
    const existingTypes = React.useMemo(() => {
        const types = new Set();
        safeHistory.forEach(h => {
            const normalized = normalizeActivity(h);
            if (normalized.type) {
                types.add(normalized.type);
            }
        });
        return types;
    }, [safeHistory]);

    // Combine: show all possible types, but mark which ones exist
    const allHistoryTypes = React.useMemo(() => {
        const combined = new Set([...allPossibleTypes, ...existingTypes]);
        return Array.from(combined).sort();
    }, [existingTypes]);

    // Function to get nice display label for a type
    const getTypeDisplayLabel = (type) => {
        const labelMap = {
            'Completed': '✅ Task Completed',
            'complete': '✅ Task Completed',
            'Sessions': '⏱️ Timed Sessions',
            'focus': '🎯 Focus Session',
            'timer': '⏱️ Timer Session',
            'log': '📝 Log Entry',
            'spin': '🎰 Spin Result',
            'respin': '🔄 Respin',
            'duel': '⚔️ Duel',
            'task_created': '➕ Task Created',
            'task_edited': '✏️ Task Edited',
            'contact_created': '👤 Contact Created',
            'contact_edited': '✏️ Contact Edited',
            'location_created': '📍 Location Created',
            'location_edited': '✏️ Location Edited',
            'completion': '✅ Completion',
            'spin_result': '🎰 Spin Result',
            'subtask_added': '➕ Subtask Added',
            'subtask_completed': '✅ Subtask Completed',
            'subtask_deleted': '🗑️ Subtask Deleted',
            'subtask_uncompleted': '↩️ Subtask Uncompleted'
        };
        return labelMap[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getFilteredHistory = () => {
        const start = rangeStart(historyRange);
        const q = historySearch.trim().toLowerCase();

        return safeHistory
            .map(normalizeActivity)
            .filter(act => safeDate(act.createdAt) >= start)
            .filter(act => {
                // If no types selected, show all
                if (historyType.length === 0) return true;
                // Check if activity type matches any selected type
                // Also handle aliases: Sessions includes 'focus' and 'Sessions', Completed includes 'complete'
                return historyType.some(selectedType => {
                    if (act.type === selectedType) return true;
                    if (selectedType === 'Sessions' && (act.type === 'focus' || act.type === 'Sessions' || act.type === 'timer' || act.type === 'log')) return true;
                    if (selectedType === 'Completed' && (act.type === 'complete' || act.type === 'Completed')) return true;
                    if (selectedType === 'spin' && (act.type === 'spin' || act.type === 'respin')) return true;
                    return false;
                });
            })
            .filter(act => historyFilter === 'All' || act.category === historyFilter)
            .filter(act => {
                if (!q) return true;
                const hay = `${act.title} ${act.category} ${act.type} ${(act.people||[]).join(' ')} ${act.locationLabel}`.toLowerCase();
                return hay.includes(q);
            })
            .sort((a,b) => safeDate(b.createdAt) - safeDate(a.createdAt));
    };

    const historyRows = getFilteredHistory();

    // --- EXPORT HELPERS ---
    const csvEscape = (v) => {
        const s = String(v ?? '');
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };

    const downloadTextFile = (filename, text, mime = 'text/plain;charset=utf-8') => {
        try {
            const blob = new Blob([text], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1200);
        } catch (e) {
            notify?.('Export failed.', '❌');
        }
    };

    // ✅ FIXED: Raw CSV export includes People + Location + GPS
    const exportCSVNow = () => {
        const rows = historyRows;

        const header = [
            'Date',
            'Time',
            'Title',
            'Category',
            'Type',
            'DurationMin',
            'Value',
            'People',
            'LocationLabel',
            'LocationId',
            'Lat',
            'Lon',
            'Notes'
        ];

        const lines = [header.join(',')];

        rows.forEach(r => {
            const d = safeDate(r.createdAt);
            const lat = (r.coords && r.coords.lat != null) ? Number(r.coords.lat) : '';
            const lon = (r.coords && r.coords.lon != null) ? Number(r.coords.lon) : '';
            const people = Array.isArray(r.people) ? r.people.join(' | ') : '';

            lines.push([
                csvEscape(d.toLocaleDateString()),
                csvEscape(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })),
                csvEscape(r.title),
                csvEscape(r.category),
                csvEscape(r.type),
                csvEscape(r.duration || 0),
                csvEscape(r.valueText || ''),
                csvEscape(people),
                csvEscape(r.locationLabel || ''),
                csvEscape(r.locationId || ''),
                csvEscape(lat === '' ? '' : lat.toFixed(6)),
                csvEscape(lon === '' ? '' : lon.toFixed(6)),
                csvEscape(r.notes || '')
            ].join(','));
        });

        downloadTextFile(`tasktumbler_raw.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
        notify?.('Raw CSV exported.', '✅');
    };

    // ✅ FIXED: Journal export includes People + Location + Notes
    const exportJournalNow = (granularity = 'daily') => {
        const rows = historyRows.slice().sort((a,b) => safeDate(a.createdAt) - safeDate(b.createdAt));

        const pad2 = (n) => String(n).padStart(2, '0');
        const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
        const minutesToHM = (mins) => {
            const m = Math.max(0, Math.round(Number(mins) || 0));
            const h = Math.floor(m / 60);
            const r = m % 60;
            return `${h}h ${r}m`;
        };

        const buckets = {};
        rows.forEach(r => {
            let k = ymd(safeDate(r.createdAt));
            if (granularity === 'weekly') {
                const d = safeDate(r.createdAt); d.setHours(0,0,0,0);
                const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diff));
                k = ymd(monday);
            } else if (granularity === 'monthly') {
                const d = safeDate(r.createdAt);
                k = `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
            }
            (buckets[k] ||= []).push(r);
        });

        if (rows.length === 0 && historyRange === 'day') {
            buckets[ymd(new Date())] = [];
        }

        const bucketKeys = Object.keys(buckets).sort();
        let out = '';

        const fmtWhoWhere = (r) => {
            const who = Array.isArray(r.people) && r.people.length ? ` • People: ${r.people.join(', ')}` : '';
            const where = (r.locationLabel || '').trim() ? ` • Location: ${r.locationLabel}` : '';
            const coords = (r.coords && r.coords.lat != null && r.coords.lon != null)
                ? ` • GPS: ${Number(r.coords.lat).toFixed(4)}, ${Number(r.coords.lon).toFixed(4)}`
                : '';
            return `${who}${where}${coords}`;
        };

        bucketKeys.forEach((key, index) => {
            const bucket = buckets[key];
            const dateObj = new Date(key);

            let headerTitle = dateObj.toDateString();
            if (granularity === 'weekly') headerTitle = `Week of ${dateObj.toDateString()}`;
            if (granularity === 'monthly') headerTitle = dateObj.toLocaleDateString(undefined, {month:'long', year:'numeric'});

            out += `TASKTUMBLER ${granularity.toUpperCase()} JOURNAL - ${headerTitle}\n`;
            out += `====================================\n\n`;

            const completed = bucket.filter(r => (r.type || '') === 'Completed');
            out += `--- TASKS COMPLETED ---\n`;
            if (completed.length === 0) out += `No tasks completed ${granularity === 'daily' ? 'today' : 'in this period'}.\n`;
            else {
                completed.forEach(r => {
                    out += `• ${r.title} (${Math.round(r.duration)}m) – ${r.category}${fmtWhoWhere(r)}\n`;
                    if ((r.notes || '').trim()) out += `  Notes: ${String(r.notes).trim()}\n`;
                });
            }
            out += `\n`;

            const sessions = bucket.filter(r => (r.type || '') === 'Sessions' || (r.type || '') === 'focus');
            out += `--- TIMED SESSIONS ---\n`;
            if (sessions.length === 0) out += `No timed sessions logged ${granularity === 'daily' ? 'today' : 'in this period'}.\n`;
            else {
                sessions.forEach(r => {
                    out += `• ${r.title} (${Math.round(r.duration)}m) – ${r.category}${fmtWhoWhere(r)}\n`;
                    if ((r.notes || '').trim()) out += `  Notes: ${String(r.notes).trim()}\n`;
                });
            }
            out += `\n`;

            const other = bucket.filter(r => r.type !== 'Completed' && r.type !== 'Sessions' && r.type !== 'focus');
            if (other.length > 0) {
                out += `--- OTHER ACTIVITY ---\n`;
                other.forEach(r => out += `• ${r.type}: ${r.title}\n`);
                out += `\n`;
            }

            const totalMins = bucket.reduce((acc, r) => acc + (r.duration||0), 0);
            out += `====================================\n`;
            out += `TOTAL TIME TRACKED: ${minutesToHM(totalMins)}\n`;

            if (index < bucketKeys.length - 1) out += `\n\n`;
        });

        if (rows.length === 0 && Object.keys(buckets).length === 0) {
            out = `TASKTUMBLER JOURNAL\n====================================\n\nNo activity found for this period.\n`;
        }

        downloadTextFile(`tasktumbler_journal.txt`, out, 'text/plain;charset=utf-8');
        notify?.('Journal exported.', '📄');
    };

    // --- CALCULATIONS ---
    React.useEffect(() => {
        if (!safeHistory || safeHistory.length === 0) { setStreak(0); return; }
        const sorted = [...safeHistory].sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt));
        let currentStreak = 0;
        let lastDate = null;
        const today = new Date().toDateString();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);

        for (let task of sorted) {
            if(!task.completedAt) continue;
            const taskDate = new Date(task.completedAt).toDateString();
            if (taskDate !== lastDate) {
                if (lastDate === null && (taskDate === today || taskDate === yesterday.toDateString())) {
                    currentStreak = 1;
                } else if (lastDate) {
                    const diff = (new Date(lastDate) - new Date(taskDate)) / (86400000);
                    if (diff <= 1.5) currentStreak++; else break;
                }
                lastDate = taskDate;
            }
        }
        setStreak(currentStreak);
    }, [history]);

    const levelInfo = (() => {
        const totalXP = safeHistory.length * 10 + (safeHistory.reduce((a,b)=>a+(b.duration||0),0));
        const level = Math.floor(Math.sqrt(totalXP) / 5) + 1;
        const nextLevelXP = Math.pow((level) * 5, 2);
        const prevLevelXP = Math.pow((level-1) * 5, 2);
        const current = totalXP - prevLevelXP;
        const max = nextLevelXP - prevLevelXP;
        return { level, current, max, progress: Math.min(100, Math.max(0, (current/max)*100)) };
    })();

    const totalMin = safeHistory.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalHrs = (totalMin / 60).toFixed(1);

    const getChartData = (days) => {
        try {
            const data = {};
            const now = new Date();
            for (let i = 0; i < days; i++) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                data[d.toDateString()] = 0;
            }
            safeHistory.forEach(h => {
                try {
                    const normalized = normalizeActivity(h);
                    if (!normalized) return;
                    // Apply filters
                    if (chartCategoryFilter !== 'All' && normalized.category !== chartCategoryFilter) return;
                    if (chartLocationFilter !== 'All' && normalized.locationLabel !== chartLocationFilter) return;
                    if (chartTypeFilter !== 'All' && normalized.type !== chartTypeFilter) return;
                    
                    // REPLACE dateKey logic: Handle Date objects and invalid dates
                    const rawDate = normalized.createdAt || Date.now();
                    const dObj = (rawDate instanceof Date) ? rawDate : new Date(rawDate);
                    const dateKey = isNaN(dObj.getTime()) ? new Date().toDateString() : dObj.toDateString();
                    if (data[dateKey] !== undefined) {
                        const duration = Number(normalized.duration) || 0;
                        data[dateKey] += (unit === 'hours' ? duration / 60 : duration);
                    }
                } catch (e) {
                    console.warn('Error processing history item for chart:', e);
                }
            });
            return Object.entries(data).reverse().map(([date, value]) => {
                try {
                    return {
                        date: new Date(date).toLocaleDateString(undefined, {weekday:'short'}),
                        value: parseFloat(Number(value).toFixed(1)) || 0
                    };
                } catch (e) {
                    return { date: date, value: 0 };
                }
            });
        } catch (e) {
            console.error('Error generating chart data:', e);
            return [];
        }
    };

    const chartData = React.useMemo(() => getChartData(timeRange), [safeHistory.length, chartCategoryFilter, chartLocationFilter, chartTypeFilter, timeRange, unit]);
    const maxChartVal = React.useMemo(() => {
        if (chartData.length === 0) return 10;
        const values = chartData.map(d => Number(d.value) || 0).filter(v => isFinite(v));
        return values.length > 0 ? Math.max(...values, 10) : 10;
    }, [chartData]);

    // Category stats for pie chart
    const categoryStats = React.useMemo(() => {
        try {
            const map = {};
            safeHistory.forEach(h => {
                try {
                    const normalized = normalizeActivity(h);
                    if (!normalized) return;
                    if (chartLocationFilter !== 'All' && normalized.locationLabel !== chartLocationFilter) return;
                    if (chartTypeFilter !== 'All' && normalized.type !== chartTypeFilter) return;
                    
                    const cat = normalized.category || 'Uncategorized';
                    if (!map[cat]) map[cat] = { name: cat, minutes: 0, count: 0 };
                    map[cat].minutes += (Number(normalized.duration) || 0);
                    map[cat].count += 1;
                } catch (e) {
                    console.warn('Error processing history item for category stats:', e);
                }
            });
            return Object.values(map).sort((a, b) => (Number(b.minutes) || 0) - (Number(a.minutes) || 0));
        } catch (e) {
            console.error('Error generating category stats:', e);
            return [];
        }
    }, [safeHistory.length, chartLocationFilter, chartTypeFilter]);

    // Location stats for location filter dropdown
    const locationStats = React.useMemo(() => {
        try {
            const map = {};
            safeHistory.forEach(h => {
                try {
                    const normalized = normalizeActivity(h);
                    if (!normalized) return;
                    const loc = normalized.locationLabel || 'No Location';
                    if (!map[loc]) map[loc] = { name: loc, minutes: 0, count: 0 };
                    map[loc].minutes += (Number(normalized.duration) || 0);
                    map[loc].count += 1;
                } catch (e) {
                    console.warn('Error processing history item for location stats:', e);
                }
            });
            return Object.values(map).sort((a, b) => (Number(b.minutes) || 0) - (Number(a.minutes) || 0));
        } catch (e) {
            console.error('Error generating location stats:', e);
            return [];
        }
    }, [safeHistory]);

    // Type stats for type filter dropdown
    const typeStats = React.useMemo(() => {
        try {
            const map = {};
            safeHistory.forEach(h => {
                try {
                    const normalized = normalizeActivity(h);
                    if (!normalized) return;
                    const type = normalized.type || 'Unknown';
                    if (!map[type]) map[type] = { name: type, minutes: 0, count: 0 };
                    map[type].minutes += (Number(normalized.duration) || 0);
                    map[type].count += 1;
                } catch (e) {
                    console.warn('Error processing history item for type stats:', e);
                }
            });
            return Object.values(map).sort((a, b) => (Number(b.minutes) || 0) - (Number(a.minutes) || 0));
        } catch (e) {
            console.error('Error generating type stats:', e);
            return [];
        }
    }, [safeHistory.length, chartCategoryFilter, chartLocationFilter, chartTypeFilter, timeRange, unit]);

    const peopleData = (() => {
        const map = {};
        [...safeTasks, ...safeHistory].forEach(item => {
            if (item.people) item.people.forEach(p => {
                const name = String(p).trim();
                if (!map[name]) map[name] = { name: name, count: 0 };
                map[name].count++;
            });
        });
        return Object.values(map)
            .filter(p => p.name.toLowerCase().includes((peopleSearch || '').toLowerCase()))
            .sort((a,b) => b.count - a.count);
    })();

    const QuickStat = ({ label, value, color }) => (
        <div style={{background: 'var(--card)', padding: '15px', borderRadius: 16, textAlign: 'center', flex:1, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize: 24, fontWeight: 800, color: color, marginBottom: 4}}>{value}</div>
            <div style={{fontSize: 11, fontWeight: 700, opacity:0.6, textTransform: 'uppercase'}}>{label}</div>
        </div>
    );

    // History Detail Modal
    const HistoryDetailModal = ({ item, onClose }) => {
        if (!item) return null;
        const when = safeDate(item.createdAt);
        const who = Array.isArray(item.people) && item.people.length ? item.people : [];
        const hasTask = item.raw?.taskId ? safeTasks.find(t => t.id === item.raw.taskId) : null;

        return (
            <div 
                style={{
                    position:'fixed',
                    inset:0,
                    background:'rgba(0,0,0,0.85)',
                    zIndex:2000,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    padding:20,
                    animation:'fadeIn 0.2s'
                }}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div 
                    style={{
                        background:'var(--card)',
                        borderRadius:20,
                        padding:24,
                        maxWidth:480,
                        width:'100%',
                        maxHeight:'85vh',
                        overflowY:'auto',
                        border:'1px solid var(--border)',
                        boxShadow:'0 20px 50px rgba(0,0,0,0.5)',
                        animation:'slideUp 0.3s'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
                        <div style={{flex:1}}>
                            <div style={{fontSize:11, fontWeight:800, color:'var(--primary)', marginBottom:8, textTransform:'uppercase'}}>
                                {item.category} • {item.type ? getTypeDisplayLabel(item.type) : 'Activity'}
                            </div>
                            <h3 style={{fontFamily:'Fredoka', fontSize:22, fontWeight:800, margin:0, marginBottom:12}}>
                                {item.title}
                            </h3>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                                background:'none',
                                border:'none',
                                fontSize:28,
                                color:'var(--text-light)',
                                cursor:'pointer',
                                padding:0,
                                width:32,
                                height:32,
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                opacity:0.7,
                                transition:'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                        >
                            ×
                        </button>
                    </div>

                    <div style={{display:'grid', gap:16, marginBottom:20}}>
                        <div style={{background:'var(--bg)', padding:14, borderRadius:12, border:'1px solid var(--border)'}}>
                            <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Date & Time</div>
                            <div style={{fontSize:15, fontWeight:700}}>
                                {when.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                            </div>
                            <div style={{fontSize:13, color:'var(--text-light)', marginTop:4}}>
                                {when.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' })}
                            </div>
                        </div>

                        {item.duration > 0 && (
                            <div style={{background:'var(--bg)', padding:14, borderRadius:12, border:'1px solid var(--border)'}}>
                                <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Duration</div>
                                <div style={{fontSize:20, fontWeight:800, color:'var(--primary)'}}>
                                    {formatDuration(item.duration)}
                                </div>
                                <div style={{fontSize:12, color:'var(--text-light)', marginTop:4}}>
                                    {Math.round(item.duration)} minutes total
                                </div>
                            </div>
                        )}

                        {who.length > 0 && (
                            <div style={{background:'var(--bg)', padding:14, borderRadius:12, border:'1px solid var(--border)'}}>
                                <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>People</div>
                                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                                    {who.map((personName, idx) => {
                                        // Helper to find person by name and open them
                                        const handlePersonClick = (e) => {
                                            e.stopPropagation();
                                            try {
                                                const allPeople = JSON.parse(localStorage.getItem('savedPeople') || '[]');
                                                const person = allPeople.find(p => {
                                                    const displayName = getDisplayName(p);
                                                    return displayName.toLowerCase() === String(personName || '').toLowerCase();
                                                });
                                                if (person && person.id) {
                                                    // Switch to people view and select the person
                                                    updateSubView('people');
                                                    window.__pendingPeopleSelection = person.id;
                                                    window.dispatchEvent(new CustomEvent('select-person', { detail: { personId: person.id } }));
                                                    onClose(); // Close the modal
                                                } else {
                                                    notify?.('Person not found in contacts', 'ℹ️');
                                                }
                                            } catch (error) {
                                                console.error('Error opening person:', error);
                                                notify?.('Error opening person', '❌');
                                            }
                                        };
                                        
                                        return (
                                            <a
                                            key={idx}
                                            href="#"
                                            onClick={handlePersonClick}
                                            style={{
                                                padding:'6px 12px',
                                                background:'var(--primary)',
                                                color:'white',
                                                borderRadius:20,
                                                textDecoration:'none',
                                                cursor:'pointer',
                                                transition:'all 0.2s',
                                                display:'inline-block'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = 'rgba(255,107,53,0.9)';
                                                e.target.style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'var(--primary)';
                                                e.target.style.transform = 'scale(1)';
                                            }}
                                            title={`Click to view ${personName}`}
                                        >
                                            👤 {personName}
                                        </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {item.locationLabel && (
                            <div style={{background:'var(--bg)', padding:14, borderRadius:12, border:'1px solid var(--border)'}}>
                                <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Location</div>
                                <div style={{fontSize:14, fontWeight:700}}>📍 {item.locationLabel}</div>
                                {item.coords && item.coords.lat && (
                                    <div style={{fontSize:11, color:'var(--text-light)', marginTop:4}}>
                                        GPS: {Number(item.coords.lat).toFixed(4)}, {Number(item.coords.lon).toFixed(4)}
                                    </div>
                                )}
                            </div>
                        )}

                        {item.notes && (
                            <div style={{background:'var(--bg)', padding:14, borderRadius:12, border:'1px solid var(--border)'}}>
                                <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Notes</div>
                                <div style={{fontSize:13, whiteSpace:'pre-wrap', lineHeight:1.6}}>{item.notes}</div>
                            </div>
                        )}

                        {hasTask && onViewTask && (
                            <button
                                onClick={() => {
                                    onViewTask(hasTask);
                                    onClose();
                                }}
                                style={{
                                    width:'100%',
                                    padding:14,
                                    background:'var(--primary)',
                                    color:'white',
                                    border:'none',
                                    borderRadius:12,
                                    fontSize:14,
                                    fontWeight:800,
                                    cursor:'pointer',
                                    marginTop:8,
                                    transition:'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ff8c42';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--primary)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                🔗 View Related Task
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{paddingBottom: 20}}>
            {selectedHistoryItem && (
                <HistoryDetailModal 
                    item={selectedHistoryItem} 
                    onClose={() => setSelectedHistoryItem(null)} 
                />
            )}

            {subView === 'overview' && (
                <div className="fade-in">
                    <div style={{display:'flex', gap:12, marginBottom:20}}>
                        <QuickStat label="Level" value={levelInfo.level} color="#FF9F43" />
                        <QuickStat label="Streak" value={`${streak}🔥`} color="#FF6B6B" />
                        <QuickStat label="Total Hours" value={totalHrs} color="#54A0FF" />
                        <QuickStat label="Entries" value={safeHistory.length} color="#1DD1A1" />
                    </div>
                    <div style={{background:'var(--card)', padding:20, borderRadius:16, border:'1px solid var(--border)', marginBottom:20}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13, fontWeight:700}}>
                            <span>Level Progress</span>
                            <span>{Math.round(levelInfo.current)} / {Math.round(levelInfo.max)} XP</span>
                        </div>
                        <div style={{height:12, width:'100%', background:'var(--bg)', borderRadius:6, overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${levelInfo.progress}%`, background:'linear-gradient(90deg, #FF9F43, #FF6B6B)', transition:'width 0.5s ease'}} />
                        </div>
                    </div>
                </div>
            )}

            {subView === 'charts' && (
                <div className="fade-in">
                    {/* Top Controls Bar */}
                    <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:16}}>
                        {/* Chart Type Selector */}
                        <div style={{display:'flex', gap:3, background:'var(--bg)', padding:4, borderRadius:10, border:'1px solid var(--border)', flex:1}}>
                            {['bar', 'line', 'area', 'pie', 'heatmap'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    style={{
                                        padding:'8px 12px',
                                        fontSize:12,
                                        fontWeight:700,
                                        textTransform:'capitalize',
                                        border:'none',
                                        background: chartType === type ? 'var(--primary)' : 'transparent',
                                        color: chartType === type ? 'white' : 'var(--text-light)',
                                        borderRadius:8,
                                        cursor:'pointer',
                                        transition:'all 0.2s',
                                        flex:1,
                                        whiteSpace:'nowrap'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Filter Button */}
                        {(() => {
                            const hasActiveFilters = chartCategoryFilter !== 'All' || chartLocationFilter !== 'All' || chartTypeFilter !== 'All' || timeRange !== 7 || unit !== 'minutes';
                            const activeFilterCount = [
                                chartCategoryFilter !== 'All',
                                chartLocationFilter !== 'All',
                                chartTypeFilter !== 'All',
                                timeRange !== 7,
                                unit !== 'minutes'
                            ].filter(Boolean).length;
                            
                            return (
                                <button
                                    onClick={() => setShowChartFilters(true)}
                                    style={{
                                        padding:'8px 14px',
                                        fontSize:12,
                                        fontWeight:700,
                                        border:'1px solid var(--border)',
                                        borderRadius:10,
                                        background: hasActiveFilters ? 'var(--primary)' : 'var(--card)',
                                        color: hasActiveFilters ? 'white' : 'var(--text)',
                                        cursor:'pointer',
                                        transition:'all 0.2s',
                                        display:'flex',
                                        alignItems:'center',
                                        gap:6
                                    }}
                                >
                                    🎛️ Filters
                                    {activeFilterCount > 0 && (
                                        <span style={{
                                            background: hasActiveFilters ? 'rgba(255,255,255,0.3)' : 'var(--primary)',
                                            color: 'white',
                                            fontSize:9,
                                            fontWeight:700,
                                            padding:'2px 6px',
                                            borderRadius:8,
                                            minWidth:18,
                                            textAlign:'center'
                                        }}>
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })()}
                    </div>

                    {/* Chart Filters Modal */}
                    {showChartFilters && ReactDOM.createPortal(
                        <div 
                            onMouseDown={(e) => {
                                if (e.target === e.currentTarget) {
                                    setShowChartFilters(false);
                                }
                            }}
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setShowChartFilters(false);
                                }
                            }}
                            style={{ 
                                position: 'fixed', 
                                inset: 0, 
                                background: 'rgba(0,0,0,0.6)', 
                                zIndex: 999999, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                padding: 16, 
                                backdropFilter: 'blur(4px)' 
                            }}
                        >
                            <div 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()} 
                                style={{ 
                                    background: 'var(--card)', 
                                    borderRadius: 14, 
                                    width: 'min(400px, 92vw)', 
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)', 
                                    boxShadow: '0 25px 60px rgba(0,0,0,0.4)' 
                                }}
                            >
                                <div style={{ 
                                    padding: '12px 16px', 
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    background: 'var(--input-bg)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>🎛️</span>
                                        <span style={{ fontWeight: 800, fontSize: 14 }}>Chart Filters</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowChartFilters(false);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            fontSize: 20, 
                                            cursor: 'pointer', 
                                            color: 'var(--text-light)', 
                                            lineHeight: 1,
                                            padding: 0,
                                            width: 24,
                                            height: 24,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div style={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                                    <div style={{display:'flex', flexDirection:'column', gap:14}}>
                                        <div>
                                            <label className="f-label" style={{fontSize:11, marginBottom:6}}>Time Range</label>
                                            <select className="f-select" value={timeRange} onChange={e=>setTimeRange(Number(e.target.value))}>
                                                <option value={7}>Last 7 Days</option>
                                                <option value={14}>Last 14 Days</option>
                                                <option value={30}>Last 30 Days</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="f-label" style={{fontSize:11, marginBottom:6}}>Unit</label>
                                            <select className="f-select" value={unit} onChange={e=>setUnit(e.target.value)}>
                                                <option value="minutes">Minutes</option>
                                                <option value="hours">Hours</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="f-label" style={{fontSize:11, marginBottom:6}}>Category</label>
                                            <select className="f-select" value={chartCategoryFilter} onChange={e=>setChartCategoryFilter(e.target.value)}>
                                                <option value="All">All Categories</option>
                                                {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="f-label" style={{fontSize:11, marginBottom:6}}>Location</label>
                                            <select className="f-select" value={chartLocationFilter} onChange={e=>setChartLocationFilter(e.target.value)}>
                                                <option value="All">All Locations</option>
                                                {locationStats.map(loc => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="f-label" style={{fontSize:11, marginBottom:6}}>Type</label>
                                            <select className="f-select" value={chartTypeFilter} onChange={e=>setChartTypeFilter(e.target.value)}>
                                                <option value="All">All Types</option>
                                                {typeStats.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                    
                    {/* Bar Chart */}
                    {chartType === 'bar' && (
                        <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16}}>
                            {chartData.length === 0 ? (
                                <div style={{height:240, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.5, fontSize:13}}>No data available</div>
                            ) : (
                                <div style={{height:240, display:'flex', alignItems:'flex-end', gap:4, padding:'12px 4px 8px 4px'}}>
                                    {chartData.map((d, i) => (
                                        <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, position:'relative'}}>
                                            {d.value > 0 && (
                                                <div style={{position:'absolute', top:-20, fontSize:9, fontWeight:700, opacity:0.9, whiteSpace:'nowrap'}}>
                                                    {unit === 'hours' ? d.value.toFixed(1) + 'h' : Math.round(d.value) + 'm'}
                                                </div>
                                            )}
                                            <div style={{ width:'100%', background: 'linear-gradient(180deg, var(--primary), #ff9f43)', borderRadius: '6px 6px 0 0', height: `${Math.max(4, (d.value / maxChartVal) * 100)}%`, minHeight: 4, transition: 'height 0.3s', boxShadow:'0 2px 8px rgba(255,107,53,0.3)' }} />
                                            <div style={{fontSize:10, opacity:0.7, textAlign:'center', fontWeight:500}}>{d.date}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Line Chart */}
                    {chartType === 'line' && (
                        <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16}}>
                            {chartData.length === 0 ? (
                                <div style={{height:240, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.5, fontSize:13}}>No data available</div>
                            ) : (
                                <div style={{height:240, position:'relative', padding:'20px 0 30px 0'}}>
                                    <svg width="100%" height="100%" style={{position:'absolute', top:0, left:0}}>
                                        <defs>
                                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {chartData.length > 1 && chartData.map((d, i) => {
                                            if (i === 0) return null;
                                            const prev = chartData[i - 1];
                                            const divisor = Math.max(1, chartData.length - 1);
                                            const x1 = ((i - 1) / divisor) * 100;
                                            const y1 = 100 - ((prev.value / maxChartVal) * 100);
                                            const x2 = (i / divisor) * 100;
                                            const y2 = 100 - ((d.value / maxChartVal) * 100);
                                            return (
                                                <line
                                                    key={i}
                                                    x1={`${x1}%`}
                                                    y1={`${y1}%`}
                                                    x2={`${x2}%`}
                                                    y2={`${y2}%`}
                                                    stroke="var(--primary)"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                />
                                            );
                                        })}
                                        {chartData.length > 0 && chartData.map((d, i) => {
                                            const divisor = Math.max(1, chartData.length - 1);
                                            const x = (i / divisor) * 100;
                                            const y = 100 - ((d.value / maxChartVal) * 100);
                                            return (
                                                <circle
                                                    key={i}
                                                    cx={`${x}%`}
                                                    cy={`${y}%`}
                                                    r="5"
                                                    fill="var(--primary)"
                                                    stroke="var(--card)"
                                                    strokeWidth="2"
                                                />
                                            );
                                        })}
                                    </svg>
                                    <div style={{display:'flex', justifyContent:'space-between', marginTop:'auto', fontSize:9, opacity:0.6}}>
                                        {chartData.map((d, i) => (
                                            <div key={i} style={{flex:1, textAlign:'center'}}>{d.date}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Area Chart */}
                    {chartType === 'area' && (
                        <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16}}>
                            {chartData.length === 0 ? (
                                <div style={{height:240, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.5, fontSize:13}}>No data available</div>
                            ) : (
                                <div style={{height:240, position:'relative', padding:'20px 0 30px 0'}}>
                                    <svg width="100%" height="100%" style={{position:'absolute', top:0, left:0}}>
                                        <defs>
                                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {chartData.length > 0 && (
                                            <>
                                                <path
                                                    d={`M 0,100 ${chartData.map((d, i) => {
                                                        const divisor = Math.max(1, chartData.length - 1);
                                                        const x = (i / divisor) * 100;
                                                        const y = 100 - ((d.value / maxChartVal) * 100);
                                                        return `L ${x},${y}`;
                                                    }).join(' ')} L 100,100 Z`}
                                                    fill="url(#areaGradient)"
                                                />
                                                {chartData.length > 1 && chartData.map((d, i) => {
                                                    if (i === 0) return null;
                                                    const prev = chartData[i - 1];
                                                    const divisor = Math.max(1, chartData.length - 1);
                                                    const x1 = ((i - 1) / divisor) * 100;
                                                    const y1 = 100 - ((prev.value / maxChartVal) * 100);
                                                    const x2 = (i / divisor) * 100;
                                                    const y2 = 100 - ((d.value / maxChartVal) * 100);
                                                    return (
                                                        <line
                                                            key={i}
                                                            x1={`${x1}%`}
                                                            y1={`${y1}%`}
                                                            x2={`${x2}%`}
                                                            y2={`${y2}%`}
                                                            stroke="var(--primary)"
                                                            strokeWidth="3"
                                                            strokeLinecap="round"
                                                        />
                                                    );
                                                })}
                                                {chartData.map((d, i) => {
                                                    const divisor = Math.max(1, chartData.length - 1);
                                                    const x = (i / divisor) * 100;
                                                    const y = 100 - ((d.value / maxChartVal) * 100);
                                                    return (
                                                        <circle
                                                            key={i}
                                                            cx={`${x}%`}
                                                            cy={`${y}%`}
                                                            r="4"
                                                            fill="var(--primary)"
                                                            stroke="var(--card)"
                                                            strokeWidth="2"
                                                        />
                                                    );
                                                })}
                                            </>
                                        )}
                                    </svg>
                                    <div style={{display:'flex', justifyContent:'space-between', marginTop:'auto', fontSize:9, opacity:0.6}}>
                                        {chartData.map((d, i) => (
                                            <div key={i} style={{flex:1, textAlign:'center'}}>{d.date}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pie Chart for Categories */}
                    {chartType === 'pie' && (
                        <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16}}>
                            {categoryStats.length === 0 ? (
                                <div style={{minHeight:280, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.5, fontSize:13}}>No category data available</div>
                            ) : (
                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:280, gap:24, flexWrap:'wrap'}}>
                                    <div style={{position:'relative', width:200, height:200}}>
                                        <svg width="200" height="200" viewBox="0 0 200 200" style={{transform:'rotate(-90deg)'}}>
                                            {(() => {
                                                let currentAngle = 0;
                                                const totalMinForPie = categoryStats.reduce((sum, cat) => sum + (Number(cat.minutes) || 0), 0);
                                                return categoryStats.slice(0, 8).map((cat, idx) => {
                                                    const minutes = Number(cat.minutes) || 0;
                                                    const pct = totalMinForPie > 0 ? (minutes / totalMinForPie) : 0;
                                                    const angle = pct * 360;
                                                    const startAngle = currentAngle;
                                                    const endAngle = currentAngle + angle;
                                                    currentAngle += angle;
                                                    
                                                    const startAngleRad = (startAngle * Math.PI) / 180;
                                                    const endAngleRad = (endAngle * Math.PI) / 180;
                                                    const largeArc = angle > 180 ? 1 : 0;
                                                    const x1 = 100 + 80 * Math.cos(startAngleRad);
                                                    const y1 = 100 + 80 * Math.sin(startAngleRad);
                                                    const x2 = 100 + 80 * Math.cos(endAngleRad);
                                                    const y2 = 100 + 80 * Math.sin(endAngleRad);
                                                    
                                                    const hue = (idx * 60) % 360;
                                                    return (
                                                        <path
                                                            key={idx}
                                                            d={`M 100,100 L ${x1},${y1} A 80,80 0 ${largeArc},1 ${x2},${y2} Z`}
                                                            fill={`hsl(${hue}, 70%, 50%)`}
                                                            stroke="var(--card)"
                                                            strokeWidth="2"
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                    </div>
                                    <div style={{flex:1, minWidth:150}}>
                                        {(() => {
                                            try {
                                                const totalMinForPie = categoryStats.reduce((sum, cat) => sum + (Number(cat.minutes) || 0), 0);
                                                return categoryStats.slice(0, 8).map((cat, idx) => {
                                                    const minutes = Number(cat.minutes) || 0;
                                                    const pct = totalMinForPie > 0 ? ((minutes / totalMinForPie) * 100).toFixed(1) : '0.0';
                                                    const hue = (idx * 60) % 360;
                                                    return (
                                                        <div key={idx} style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                                                            <div style={{width:16, height:16, borderRadius:4, background:`hsl(${hue}, 70%, 50%)`}} />
                                                            <div style={{flex:1, fontSize:12, fontWeight:700}}>{cat.name || 'Unknown'}</div>
                                                            <div style={{fontSize:11, fontWeight:800, color:'var(--text-light)'}}>{pct}%</div>
                                                        </div>
                                                    );
                                                });
                                            } catch (e) {
                                                console.error('Error rendering pie chart legend:', e);
                                                return <div style={{opacity:0.6}}>Error rendering chart</div>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Heatmap Chart */}
                    {chartType === 'heatmap' && (
                        <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16}}>
                            <div style={{display:'flex', flexDirection:'column', gap:4}}>
                                {(() => {
                                    try {
                                        const heatmapData = {};
                                        const now = new Date();
                                        for (let i = 0; i < 30; i++) {
                                            const d = new Date(now);
                                            d.setDate(now.getDate() - i);
                                            const key = d.toDateString();
                                            heatmapData[key] = { date: d, count: 0, minutes: 0 };
                                        }
                                        safeHistory.forEach(h => {
                                            try {
                                                const normalized = normalizeActivity(h);
                                                if (!normalized) return;
                                                if (chartCategoryFilter !== 'All' && normalized.category !== chartCategoryFilter) return;
                                                if (chartLocationFilter !== 'All' && normalized.locationLabel !== chartLocationFilter) return;
                                                if (chartTypeFilter !== 'All' && normalized.type !== chartTypeFilter) return;
                                                
                                                const date = safeDate(normalized.createdAt);
                                                const key = date.toDateString();
                                                if (heatmapData[key]) {
                                                    heatmapData[key].count += 1;
                                                    heatmapData[key].minutes += (Number(normalized.duration) || 0);
                                                }
                                            } catch (e) {
                                                console.warn('Error processing history item for heatmap:', e);
                                            }
                                        });
                                        
                                        const maxMinutes = Math.max(...Object.values(heatmapData).map(d => d.minutes), 1);
                                        const days = Object.values(heatmapData).reverse();
                                        
                                        return (
                                            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4}}>
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                    <div key={day} style={{fontSize:9, fontWeight:700, textAlign:'center', opacity:0.6, padding:4}}>
                                                        {day}
                                                    </div>
                                                ))}
                                                {days.map((day, idx) => {
                                                    const intensity = maxMinutes > 0 ? Math.min(1, day.minutes / maxMinutes) : 0;
                                                    const hue = 120 - (intensity * 120);
                                                    const saturation = 50 + (intensity * 30);
                                                    const lightness = 40 + (intensity * 20);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                aspectRatio:1,
                                                                background: day.minutes > 0 
                                                                    ? `hsl(${hue}, ${saturation}%, ${lightness}%)`
                                                                    : 'var(--bg)',
                                                                borderRadius:4,
                                                                border:'1px solid var(--border)',
                                                                position:'relative',
                                                                cursor:'pointer',
                                                                transition:'transform 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform='scale(1.1)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform='scale(1)'}
                                                            title={`${day.date.toLocaleDateString()}: ${day.count} entries, ${Math.round(day.minutes)}m`}
                                                        >
                                                            {day.minutes > 0 && (
                                                                <div style={{
                                                                    position:'absolute',
                                                                    top:'50%',
                                                                    left:'50%',
                                                                    transform:'translate(-50%, -50%)',
                                                                    fontSize:8,
                                                                    fontWeight:800,
                                                                    color: intensity > 0.5 ? 'white' : 'var(--text)'
                                                                }}>
                                                                    {day.count}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    } catch (e) {
                                        console.error('Error generating heatmap:', e);
                                        return <div style={{opacity:0.6, padding:20, textAlign:'center'}}>Error generating heatmap</div>;
                                    }
                                })()}
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, fontSize:10, opacity:0.6}}>
                                <span>Less</span>
                                <div style={{display:'flex', gap:2}}>
                                    {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
                                        const hue = 120 - (val * 120);
                                        const saturation = 50 + (val * 30);
                                        const lightness = 40 + (val * 20);
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    width:12,
                                                    height:12,
                                                    background:`hsl(${hue}, ${saturation}%, ${lightness}%)`,
                                                    borderRadius:2
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <span>More</span>
                            </div>
                        </div>
                    )}

                    {/* People Mentions Section */}
                    <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                            <div style={{fontSize:14, fontWeight:700}}>People Mentions</div>
                            <input className="f-input" style={{width:180, margin:0, padding:'8px 12px', fontSize:13}} placeholder="Search people..." value={peopleSearch} onChange={e=>setPeopleSearch(e.target.value)} />
                        </div>
                        {peopleData.length === 0 ? (
                            <div style={{opacity:0.6, fontSize:12}}>No people activity yet.</div>
                        ) : (
                            <div style={{display:'grid', gap:8}}>
                                {peopleData.slice(0, 10).map((p, idx) => (
                                    <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px'}}>
                                        <div style={{fontWeight:700, fontSize:13}}>{p.name}</div>
                                        <div style={{fontWeight:900, color:'var(--primary)'}}>{p.count}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {subView === 'history' && (
                <div className="fade-in">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:10, marginBottom:14 }}>
                        <h4 style={{ fontFamily:'Fredoka', fontSize:14, margin:0 }}>History</h4>

                        {/* ✅ FIXED: Export actions export directly (no async state race) */}
                        <div style={{ display:'flex', gap:12, alignItems:'center', fontSize:12 }}>
                            <span
                                style={{ cursor:'pointer', color:'var(--primary)', fontWeight:650 }}
                                onClick={() => exportJournalNow('daily')}
                                title="Download journal style report"
                            >
                                Export Journal
                            </span>
                            <span style={{ opacity:0.3 }}>•</span>
                            <span
                                style={{ cursor:'pointer', color:'var(--text)', opacity:0.7, fontWeight:650 }}
                                onClick={() => exportCSVNow()}
                                title="Download raw CSV"
                            >
                                Raw CSV
                            </span>
                        </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                        <div>
                            <label className="f-label">Range</label>
                            <select className="f-select" value={historyRange} onChange={e => setHistoryRange(e.target.value)}>
                                <option value="day">Day</option>
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                                <option value="year">Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label className="f-label">Type</label>
                            <div 
                                className="f-select" 
                                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                style={{ 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    minHeight: '40px',
                                    padding: '8px 12px'
                                }}
                            >
                                <span style={{ fontSize: 13, color: historyType.length === 0 ? 'var(--text-light)' : 'var(--text)' }}>
                                    {historyType.length === 0 ? 'All Types' : `${historyType.length} selected`}
                                </span>
                                <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
                            </div>
                            {showTypeDropdown && (
                                <>
                                    <div 
                                        style={{ 
                                            position: 'fixed', 
                                            top: 0, 
                                            left: 0, 
                                            right: 0, 
                                            bottom: 0, 
                                            zIndex: 998 
                                        }} 
                                        onClick={() => setShowTypeDropdown(false)}
                                    />
                                    <div 
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            width: 280,
                                            marginTop: 6,
                                            background: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 12,
                                            padding: 8,
                                            maxHeight: 400,
                                            overflowY: 'auto',
                                            zIndex: 999,
                                            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    >
                                        {(() => {
                                            const defaultTypes = defaultImportantTypes.filter(t => allHistoryTypes.includes(t));
                                            const isDefaultActive = defaultTypes.length > 0 && 
                                                defaultTypes.length === historyType.length &&
                                                defaultTypes.every(t => historyType.includes(t));
                                            return (
                                                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryType(defaultTypes);
                                                        }}
                                                        style={{
                                                            padding: '6px 6px 6px 8px',
                                                            background: isDefaultActive ? 'var(--primary)' : 'var(--bg)',
                                                            color: isDefaultActive ? 'white' : 'var(--text)',
                                                            border: isDefaultActive ? 'none' : '1px solid var(--border)',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isDefaultActive) {
                                                                e.currentTarget.style.background = 'var(--primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.borderColor = 'var(--primary)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isDefaultActive) {
                                                                e.currentTarget.style.background = 'var(--bg)';
                                                                e.currentTarget.style.color = 'var(--text)';
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                            }
                                                        }}
                                                    >
                                                        {isDefaultActive ? '✓ Default' : 'Default'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryType([...allHistoryTypes]);
                                                        }}
                                                        style={{
                                                            padding: '6px 6px 6px 8px',
                                                            background: historyType.length === allHistoryTypes.length && allHistoryTypes.length > 0
                                                                ? 'linear-gradient(135deg, var(--primary) 0%, #764ba2 100%)' 
                                                                : 'var(--bg)',
                                                            color: historyType.length === allHistoryTypes.length && allHistoryTypes.length > 0 ? 'white' : 'var(--text)',
                                                            border: historyType.length === allHistoryTypes.length && allHistoryTypes.length > 0 ? 'none' : '1px solid var(--border)',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s',
                                                            boxShadow: historyType.length === allHistoryTypes.length && allHistoryTypes.length > 0 ? '0 2px 8px rgba(118, 75, 162, 0.3)' : 'none',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (historyType.length !== allHistoryTypes.length || allHistoryTypes.length === 0) {
                                                                e.currentTarget.style.background = 'var(--primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.borderColor = 'var(--primary)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (historyType.length !== allHistoryTypes.length || allHistoryTypes.length === 0) {
                                                                e.currentTarget.style.background = 'var(--bg)';
                                                                e.currentTarget.style.color = 'var(--text)';
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                            }
                                                        }}
                                                    >
                                                        {historyType.length === allHistoryTypes.length && allHistoryTypes.length > 0 ? '✓ All' : 'All'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryType([]);
                                                        }}
                                                        style={{
                                                            padding: '6px 6px 6px 8px',
                                                            background: historyType.length === 0 ? 'var(--primary)' : 'var(--bg)',
                                                            color: historyType.length === 0 ? 'white' : 'var(--text)',
                                                            border: historyType.length === 0 ? 'none' : '1px solid var(--border)',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (historyType.length > 0) {
                                                                e.currentTarget.style.background = 'var(--primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.borderColor = 'var(--primary)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (historyType.length > 0) {
                                                                e.currentTarget.style.background = 'var(--bg)';
                                                                e.currentTarget.style.color = 'var(--text)';
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                            }
                                                        }}
                                                    >
                                                        {historyType.length === 0 ? '✓ None' : 'None'}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {allHistoryTypes.map(type => {
                                                const isSelected = historyType.includes(type);
                                                const displayLabel = getTypeDisplayLabel(type);
                                                return (
                                                    <label
                                                        key={type}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '6px 0 6px 10px',
                                                            cursor: 'pointer',
                                                            borderRadius: 8,
                                                            transition: 'all 0.2s',
                                                            background: isSelected ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                                                            border: isSelected ? '1px solid var(--primary)' : '1px solid transparent'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.background = 'var(--bg)';
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.background = 'transparent';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setHistoryType([...historyType, type]);
                                                                } else {
                                                                    setHistoryType(historyType.filter(t => t !== type));
                                                                }
                                                            }}
                                                            style={{ 
                                                                position: 'absolute',
                                                                opacity: 0,
                                                                width: 0,
                                                                height: 0
                                                            }}
                                                        />
                                                        <div style={{
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 4,
                                                            border: '2px solid',
                                                            borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                                                            background: isSelected ? 'var(--primary)' : 'transparent',
                                                            marginRight: 10,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            transition: 'all 0.2s',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            {isSelected && (
                                                                <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>✓</span>
                                                            )}
                                                        </div>
                                                        <span style={{ 
                                                            fontSize: 12, 
                                                            fontWeight: isSelected ? 700 : 500, 
                                                            color: isSelected ? 'var(--primary)' : 'var(--text)'
                                                        }}>
                                                            {displayLabel}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <label className="f-label">Category</label>
                            <select className="f-select" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} style={{ width: '100%', maxWidth: '100%' }}>
                                <option value="All">All Categories</option>
                                {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <input
                        className="f-input"
                        placeholder="Search history (title, people, location)..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        style={{marginBottom:12}}
                    />

                    <div style={{ background:'var(--card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden', maxHeight:520, overflowY:'auto' }}>
                        {historyRows.length === 0 ? (
                            <div style={{padding:40, textAlign:'center', opacity:0.6}}>No History Found</div>
                        ) : (
                            historyRows.slice(0, 150).map((act, i) => {
                                const when = safeDate(act.createdAt);
                                const peopleList = Array.isArray(act.people) && act.people.length ? act.people : [];
                                const where = (act.locationLabel || '').trim() ? ` • ${act.locationLabel}` : '';
                                
                                // Find related task if available
                                const relatedTask = act.raw?.taskId ? safeTasks.find(t => t.id === act.raw.taskId) : null;
                                const hasClickableTask = relatedTask && onViewTask;
                                
                                // Helper to find person by name and open them
                                const handlePersonClick = (personName, e) => {
                                    if (e) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                    console.log('handlePersonClick called for:', personName);
                                    try {
                                        // Try multiple ways to get people data
                                        const allPeople = window.DataManager?.people?.getAll?.() || 
                                                         JSON.parse(localStorage.getItem('savedPeople') || '[]');
                                        
                                        console.log('Found', allPeople.length, 'people in database');
                                        
                                        const searchName = String(personName || '').trim().toLowerCase();
                                        console.log('Searching for person with name:', searchName);
                                        
                                        // Try to find person - check multiple name formats
                                        const person = allPeople.find(p => {
                                            if (!p) return false;
                                            
                                            // Check display name
                                            const displayName = getDisplayName(p);
                                            if (displayName.toLowerCase() === searchName) return true;
                                            
                                            // Check name field directly
                                            if (p.name && String(p.name).toLowerCase() === searchName) return true;
                                            
                                            // Check firstName + lastName
                                            const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
                                            if (fullName === searchName) return true;
                                            
                                            // Check if search name is contained in any name field (partial match)
                                            if (displayName.toLowerCase().includes(searchName) || 
                                                searchName.includes(displayName.toLowerCase())) return true;
                                            
                                            return false;
                                        });
                                        
                                        if (person && person.id) {
                                            console.log('Found person:', person, 'ID:', person.id);
                                            // Switch to people view and select the person
                                            if (typeof updateSubView === 'function') {
                                                console.log('Calling updateSubView("people")');
                                                updateSubView('people');
                                            } else {
                                                console.warn('updateSubView is not a function!', typeof updateSubView);
                                            }
                                            // Store the person ID to be selected when PeopleManager loads
                                            window.__pendingPeopleSelection = person.id;
                                            // Trigger a custom event that PeopleManager can listen to
                                            console.log('Dispatching select-person event for ID:', person.id);
                                            window.dispatchEvent(new CustomEvent('select-person', { detail: { personId: person.id } }));
                                            // Also try to trigger after a short delay to ensure the view has switched
                                            setTimeout(() => {
                                                console.log('Dispatching delayed select-person event');
                                                window.dispatchEvent(new CustomEvent('select-person', { detail: { personId: person.id } }));
                                            }, 100);
                                            if (notify) notify('Opening person...', '👤');
                                        } else {
                                            console.warn('Person not found. Searched for:', searchName);
                                            console.log('Available people:', allPeople.map(p => ({ id: p.id, name: getDisplayName(p) })));
                                            if (notify) notify(`Person "${personName}" not found in contacts`, 'ℹ️');
                                        }
                                    } catch (error) {
                                        console.error('Error opening person:', error, error.stack);
                                        if (notify) notify('Error opening person', '❌');
                                    }
                                };
                                
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => {
                                            if (hasClickableTask && onViewTask) {
                                                onViewTask(relatedTask);
                                            } else {
                                                setSelectedHistoryItem(act);
                                            }
                                        }}
                                        style={{ 
                                            padding:'12px 16px', 
                                            borderBottom:'1px solid var(--border)', 
                                            display:'flex', 
                                            justifyContent:'space-between', 
                                            alignItems:'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg)';
                                            e.currentTarget.style.transform = 'translateX(2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.transform = 'none';
                                        }}
                                    >
                                        <div style={{ minWidth:0, flex: 1 }}>
                                            <div style={{ fontSize:13, fontWeight:650, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                                {act.title}
                                                {hasClickableTask && <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }}>🔗</span>}
                                            </div>
                                            <div style={{ fontSize:10, color:'var(--text-light)' }}>
                                                {when.toLocaleDateString()} • {act.category}
                                                {peopleList.length > 0 && (
                                                    <>
                                                        {' • '}
                                                        {peopleList.map((personName, idx) => (
                                                            <React.Fragment key={idx}>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => handlePersonClick(personName, e)}
                                                                    style={{
                                                                        color: 'var(--primary)',
                                                                        textDecoration: 'none',
                                                                        borderBottom: '1px dotted var(--primary)',
                                                                        cursor: 'pointer',
                                                                        marginRight: idx < peopleList.length - 1 ? '4px' : '0'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.textDecoration = 'underline';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.textDecoration = 'none';
                                                                    }}
                                                                    title={`Click to view ${personName}`}
                                                                >
                                                                    {personName}
                                                                </a>
                                                                {idx < peopleList.length - 1 && ', '}
                                                            </React.Fragment>
                                                        ))}
                                                    </>
                                                )}
                                                {where}
                                            </div>
                                        </div>
                                        {act.valueText && act.duration > 0 ? (
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Filter to show only timed sessions
                                                    const timedTypes = ['Sessions', 'focus', 'timer', 'log'];
                                                    const availableTypes = timedTypes.filter(t => allHistoryTypes.includes(t));
                                                    if (availableTypes.length > 0) {
                                                        setHistoryType(availableTypes);
                                                        updateSubView('history');
                                                    }
                                                }}
                                                style={{ 
                                                    fontSize:13, 
                                                    fontWeight:850, 
                                                    color:'var(--primary)',
                                                    cursor: 'pointer',
                                                    padding: '4px 8px',
                                                    borderRadius: 6,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--bg)';
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                }}
                                                title="Click to filter by timed activities"
                                            >
                                                {act.valueText}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize:13, fontWeight:850, color:'var(--primary)' }}>{act.valueText}</div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {subView === 'people' && (
                <div className="fade-in">
                    <PeopleManager notify={notify} history={history} tasks={tasks} onViewTask={onViewTask} />
                </div>
            )}

            {subView === 'places' && (
                <div className="fade-in">
                    <LocationsManager locations={locations || []} setLocations={setLocations} notify={notify} />
                </div>
            )}
        </div>
    );
}

