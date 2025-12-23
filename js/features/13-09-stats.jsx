// js/13-09-stats.jsx
// Updated: 2025-01-XX (Enhanced Analytics v2.0)
// ===========================================
// DATA TAB (Insights + Database) - ENHANCED
// Includes: LocationsManager, PeopleManager, Enhanced Charts, Grouped History
// New Features: Category Breakdown, Productivity Insights, Weekly Trends, Better Visualizations
// ===========================================

import React from 'react'

// --- INTERNAL COMPONENT: PEOPLE MANAGER ---
// Adds: Compass CRM link, extra links, notes, location connections, and People analytics + per-person history
function PeopleManager({ notify, history = [], tasks = [], locations = [], initialSelectedPersonName = null, onPersonSelected, onViewTask }) {
    // Use DataManager for people
    const [people, setPeople] = React.useState(() => {
        if (window.DataManager?.people?.getAll) {
            return window.DataManager.people.getAll();
        }
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
        externalId: '', // Compass CRM personId
        links: '',
        notes: '',
        locationIds: [], // Array of location IDs
        isFavorite: false, // Favorite/starred contact
        lastContactDate: '', // Last contact date
        groups: [], // Groups/segments this person belongs to
        relationships: [] // Related people IDs
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

    // Helper to get display name - works with both formats
    const getDisplayName = (person) => {
        if (person.firstName || person.lastName) {
            return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Untitled';
        }
        return person.name || 'Untitled';
    };

    const [searchText, setSearchText] = React.useState('');
    const [selectedPersonId, setSelectedPersonId] = React.useState(null); // detail view
    const [filterType, setFilterType] = React.useState('all'); // Filter by type
    const [filterFavorite, setFilterFavorite] = React.useState(false); // Filter favorites only
    const [sortBy, setSortBy] = React.useState('name'); // Sort: name, type, activity, hours, lastContact
    const [sortOrder, setSortOrder] = React.useState('asc'); // asc or desc
    const [selectedPeople, setSelectedPeople] = React.useState(new Set()); // For bulk operations
    const [showBulkActions, setShowBulkActions] = React.useState(false);
    const [showDuplicateFinder, setShowDuplicateFinder] = React.useState(false);
    const [showImportDialog, setShowImportDialog] = React.useState(false);
    const [locationSearchInput, setLocationSearchInput] = React.useState('');

    // Handle initial selected person name
    React.useEffect(() => {
        if (initialSelectedPersonName && people.length > 0) {
            const person = people.find(p => 
                (p.name || '').trim().toLowerCase() === (initialSelectedPersonName || '').trim().toLowerCase()
            );
            if (person && person.id !== selectedPersonId) {
                setSelectedPersonId(person.id);
                setIsEditing(false);
                setEditId(null);
                if (onPersonSelected) {
                    onPersonSelected(person.name);
                }
            }
        }
    }, [initialSelectedPersonName, people]);

    // Listen for updates from DataManager
    React.useEffect(() => {
        const handlePeopleUpdate = () => {
            if (window.DataManager?.people?.getAll) {
                setPeople(window.DataManager.people.getAll());
            } else {
            try {
                const fresh = JSON.parse(localStorage.getItem('savedPeople') || '[]');
                setPeople(fresh);
            } catch {}
            }
        };
        window.addEventListener('people-updated', handlePeopleUpdate);
        if (window.DataManager?.people?.subscribe) {
            const unsubscribe = window.DataManager.people.subscribe(handlePeopleUpdate);
            return () => {
                window.removeEventListener('people-updated', handlePeopleUpdate);
                unsubscribe();
            };
        }
        return () => window.removeEventListener('people-updated', handlePeopleUpdate);
    }, []);

    const persistPeople = (newList) => {
        setPeople(newList);
        if (window.DataManager?.people?.setAll) {
            window.DataManager.people.setAll(newList);
        } else {
        localStorage.setItem('savedPeople', JSON.stringify(newList));
        window.dispatchEvent(new Event('people-updated'));
        }
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
            const oldPerson = people.find(p => p.id === editId);
            // Save notes history if notes changed
            const oldPerson = people.find(p => p.id === editId);
            const notesChanged = oldPerson && oldPerson.notes !== formData.notes.trim();
            const notesHistory = oldPerson?.notesHistory || [];
            if (notesChanged && oldPerson.notes) {
                notesHistory.push({
                    notes: oldPerson.notes,
                    updatedAt: oldPerson.updatedAt || new Date().toISOString()
                });
            }
            
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
                externalId: (formData.externalId || '').trim(),
                links: linksArray,
                notes: (formData.notes || '').trim(),
                locationIds: locationIds,
                isFavorite: Boolean(formData.isFavorite),
                lastContactDate: formData.lastContactDate || p.lastContactDate || '',
                groups: Array.isArray(formData.groups) ? formData.groups : (Array.isArray(p.groups) ? p.groups : []),
                relationships: Array.isArray(formData.relationships) ? formData.relationships : (Array.isArray(p.relationships) ? p.relationships : []),
                notesHistory: notesHistory.slice(-10), // Keep last 10 versions
                updatedAt: new Date().toISOString()
            } : p);
            persistPeople(updated);
            
            // Log contact edit activity
            if (window.DataManager?.activities?.add && oldPerson) {
                window.DataManager.activities.add({
                    title: `Contact edited: ${fullName}`,
                    category: 'Database',
                    type: 'contact_edited',
                    people: [fullName],
                    duration: 0,
                    createdAt: new Date().toISOString(),
                });
                // Trigger history update
                window.dispatchEvent(new Event('activities-updated'));
            }
            
            notify?.("Person Updated", "✨");
        } else {
            const newPerson = {
                id: window.DataManager?.makeId ? window.DataManager.makeId('p') : ('person_' + Date.now()),
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
                externalId: (formData.externalId || '').trim(),
                links: linksArray,
                notes: (formData.notes || '').trim(),
                locationIds: locationIds,
                isFavorite: Boolean(formData.isFavorite),
                lastContactDate: formData.lastContactDate || '',
                groups: Array.isArray(formData.groups) ? formData.groups : [],
                relationships: Array.isArray(formData.relationships) ? formData.relationships : [],
                notesHistory: [],
                createdAt: new Date().toISOString()
            };
            persistPeople([...people, newPerson]);
            
            // Log contact creation activity
            if (window.DataManager?.activities?.add) {
                window.DataManager.activities.add({
                    title: `Contact created: ${fullName}`,
                    category: 'Database',
                    type: 'contact_created',
                    people: [fullName],
                    duration: 0,
                    createdAt: new Date().toISOString(),
                });
                // Trigger history update
                window.dispatchEvent(new Event('activities-updated'));
            }
            
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
            externalId: person.externalId || '',
            links: Array.isArray(person.links) ? person.links.join('\n') : (person.links || ''),
            notes: person.notes || '',
            locationIds: Array.isArray(person.locationIds) ? person.locationIds : [],
            isFavorite: Boolean(person.isFavorite),
            lastContactDate: person.lastContactDate || '',
            groups: Array.isArray(person.groups) ? person.groups : [],
            relationships: Array.isArray(person.relationships) ? person.relationships : []
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
            externalId: '',
            links: '',
            notes: '',
            locationIds: [],
            isFavorite: false,
            lastContactDate: '',
            groups: [],
            relationships: []
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
            // Normalize name using getDisplayName if we have a person record
            const personRecord = people.find(p => {
                const displayName = getDisplayName(p);
                return displayName.toLowerCase() === String(name || '').trim().toLowerCase() || 
                       (p.name || '').toLowerCase() === String(name || '').trim().toLowerCase();
            });
            const key = personRecord ? getDisplayName(personRecord) : String(name || '').trim();
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
    }, [safeHistory, safeTasks, people]);

    const filteredPeople = React.useMemo(() => {
        let filtered = people.filter(p => {
            // Search filter
            const q = (searchText || '').toLowerCase();
            if (q) {
                const displayName = getDisplayName(p);
                const matchesSearch = displayName.toLowerCase().includes(q) ||
                   (p.firstName || '').toLowerCase().includes(q) ||
                   (p.lastName || '').toLowerCase().includes(q) ||
                   (p.phone || '').toLowerCase().includes(q) ||
                   (p.email || '').toLowerCase().includes(q) ||
                   (p.contact || '').toLowerCase().includes(q) ||
                   (p.compassCrmLink || '').toLowerCase().includes(q) ||
                   (p.type || '').toLowerCase().includes(q) ||
                   (Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '')).toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }
            
            // Type filter
            if (filterType !== 'all' && (p.type || 'client') !== filterType) return false;
            
            // Favorite filter
            if (filterFavorite && !p.isFavorite) return false;
            
            return true;
        });
        
        // Sorting
        filtered.sort((a, b) => {
            let aVal, bVal;
            const aName = getDisplayName(a);
            const bName = getDisplayName(b);
            
            switch (sortBy) {
                case 'name':
                    aVal = aName.toLowerCase();
                    bVal = bName.toLowerCase();
                    break;
                case 'type':
                    aVal = (a.type || 'client').toLowerCase();
                    bVal = (b.type || 'client').toLowerCase();
                    break;
                case 'activity':
                    aVal = (peopleStats[aName] || { count: 0 }).count;
                    bVal = (peopleStats[bName] || { count: 0 }).count;
                    break;
                case 'hours':
                    aVal = (peopleStats[aName] || { minutes: 0 }).minutes;
                    bVal = (peopleStats[bName] || { minutes: 0 }).minutes;
                    break;
                case 'lastContact':
                    aVal = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
                    bVal = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
                    break;
                default:
                    aVal = aName.toLowerCase();
                    bVal = bName.toLowerCase();
            }
            
            if (typeof aVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }
        });
        
        return filtered;
    }, [people, searchText, filterType, filterFavorite, sortBy, sortOrder, peopleStats]);

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
                const ta = new Date(a?.createdAt || a?.completedAt || 0).getTime();
                const tb = new Date(b?.createdAt || b?.completedAt || 0).getTime();
                return tb - ta;
            });
    }, [safeHistory, selectedPersonName]);

    // --- PERSON DETAIL VIEW (analytics + history) ---
    if (selectedPerson) {
        const stat = peopleStats[selectedPersonName] || { count: 0, minutes: 0, lastSeen: 0 };
        const lastSeenTxt = stat.lastSeen ? new Date(stat.lastSeen).toLocaleString() : '—';
        const hours = (stat.minutes / 60).toFixed(1);

        return (
            <div className="fade-in-up" style={{background:'var(--card)', borderRadius:16, padding:20, border:'1px solid var(--border)', boxShadow:'0 8px 30px rgba(0,0,0,0.15)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                    <div>
                        <div style={{fontFamily:'Fredoka', fontSize:20, fontWeight:800}}>{getDisplayName(selectedPerson)}</div>
                        <div style={{fontSize:11, color:'var(--text-light)', marginTop:2}}>
                            {(selectedPerson.type || 'client').toUpperCase()}
                            {selectedPerson.phone ? ` • ${selectedPerson.phone}` : ''}
                            {selectedPerson.email ? ` • ${selectedPerson.email}` : ''}
                        </div>
                        <div style={{fontSize:11, color:'var(--text-light)', marginTop:2}}>
                            Last seen: {lastSeenTxt}
                            {selectedPerson.lastContactDate && (
                                <span style={{marginLeft:8}}>
                                    • Last contact: {new Date(selectedPerson.lastContactDate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        {selectedPerson.isFavorite && (
                            <div style={{fontSize:11, color:'var(--primary)', marginTop:4, fontWeight:700}}>⭐ Favorite Contact</div>
                        )}
                    </div>
                    <div style={{display:'flex', gap:10}}>
                        {selectedPerson.phone && (
                            <a 
                                href={`tel:${selectedPerson.phone}`}
                                className="btn-white-outline" 
                                style={{height:40, display:'flex', alignItems:'center', gap:6, textDecoration:'none'}}
                                onClick={(e) => e.stopPropagation()}
                            >
                                📞 Call
                            </a>
                        )}
                        {selectedPerson.email && (
                            <a 
                                href={`mailto:${selectedPerson.email}`}
                                className="btn-white-outline" 
                                style={{height:40, display:'flex', alignItems:'center', gap:6, textDecoration:'none'}}
                                onClick={(e) => e.stopPropagation()}
                            >
                                ✉️ Email
                            </a>
                        )}
                        {/* Compass CRM Deeplinking Options */}
                        {(selectedPerson.externalId || selectedPerson.compassCrmLink) && window.openCompass && (
                            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                                <button
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(selectedPerson, 'profile', getDisplayName(selectedPerson))}
                                    style={{height:40, display:'flex', alignItems:'center', gap:6, padding:'0 12px', fontSize:12}}
                                    title="Open Compass Profile"
                                >
                                    🧭 Profile
                                </button>
                                <button
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(selectedPerson, 'notes', getDisplayName(selectedPerson))}
                                    style={{height:40, display:'flex', alignItems:'center', gap:6, padding:'0 12px', fontSize:12}}
                                    title="Open Compass Notes"
                                >
                                    📝 Notes
                                </button>
                                <button
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(selectedPerson, 'email', getDisplayName(selectedPerson))}
                                    style={{height:40, display:'flex', alignItems:'center', gap:6, padding:'0 12px', fontSize:12}}
                                    title="Open Compass Email"
                                >
                                    ✉️ Email
                                </button>
                                <button
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(selectedPerson, 'bizTracker', getDisplayName(selectedPerson))}
                                    style={{height:40, display:'flex', alignItems:'center', gap:6, padding:'0 12px', fontSize:12}}
                                    title="Open Biz Tracker"
                                >
                                    📊 Biz
                                </button>
                                <button
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(selectedPerson, 'listings', getDisplayName(selectedPerson))}
                                    style={{height:40, display:'flex', alignItems:'center', gap:6, padding:'0 12px', fontSize:12}}
                                    title="Open Listings"
                                >
                                    🏠 Listings
                                </button>
                                <button
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(selectedPerson, 'tasks', getDisplayName(selectedPerson))}
                                    style={{height:40, display:'flex', alignItems:'center', gap:6, padding:'0 12px', fontSize:12}}
                                    title="Open Tasks"
                                >
                                    ✅ Tasks
                                </button>
                            </div>
                        )}
                        {/* Legacy CRM Link */}
                        {selectedPerson.compassCrmLink && !selectedPerson.externalId && (
                            <a 
                                href={selectedPerson.compassCrmLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-white-outline" 
                                style={{height:40, display:'flex', alignItems:'center', gap:6, textDecoration:'none'}}
                                onClick={(e) => e.stopPropagation()}
                            >
                                🔗 CRM
                            </a>
                        )}
                        <button className="btn-white-outline" style={{height:40}} onClick={() => setSelectedPersonId(null)}>Back</button>
                        <button className="btn-primary" style={{height:40}} onClick={() => handleEdit(selectedPerson)}>Edit</button>
                    </div>
                </div>

                <div style={{display:'flex', gap:12, marginBottom:16}}>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 12px', flex:1, textAlign:'center'}}>
                        <div style={{fontSize:22, fontWeight:900, color:'var(--primary)'}}>{stat.count}</div>
                        <div style={{fontSize:10, opacity:0.65, fontWeight:800, textTransform:'uppercase'}}>Mentions</div>
                    </div>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 12px', flex:1, textAlign:'center'}}>
                        <div style={{fontSize:22, fontWeight:900, color:'var(--primary)'}}>{hours}</div>
                        <div style={{fontSize:10, opacity:0.65, fontWeight:800, textTransform:'uppercase'}}>Hours</div>
                    </div>
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 12px', flex:1, textAlign:'center'}}>
                        <div style={{fontSize:22, fontWeight:900, color:'var(--primary)'}}>{selectedPerson.weight || 1}</div>
                        <div style={{fontSize:10, opacity:0.65, fontWeight:800, textTransform:'uppercase'}}>Weight</div>
                    </div>
                </div>

                {(selectedPerson.compassCrmLink || (Array.isArray(selectedPerson.links) && selectedPerson.links.length)) && (
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                        <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:6}}>Links</div>

                        {selectedPerson.compassCrmLink && (
                            <div style={{fontSize:12, marginBottom:8}}>
                                <span style={{opacity:0.7, fontWeight:700}}>Compass CRM:</span>{' '}
                                <a href={selectedPerson.compassCrmLink} target="_blank" rel="noreferrer" style={{color:'var(--primary)'}}>
                                    Open
                                </a>
                            </div>
                        )}

                        {Array.isArray(selectedPerson.links) && selectedPerson.links.length > 0 && (
                            <div style={{display:'grid', gap:6}}>
                                {selectedPerson.links.slice(0, 6).map((u, idx) => (
                                    <a key={idx} href={u} target="_blank" rel="noreferrer" style={{color:'var(--primary)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                        {u}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {(Array.isArray(selectedPerson.groups) && selectedPerson.groups.length > 0) && (
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                        <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:6}}>Groups</div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                            {selectedPerson.groups.map((group, idx) => (
                                <span key={idx} style={{padding:'4px 10px', background:'var(--primary)', color:'white', borderRadius:8, fontSize:12, fontWeight:600}}>
                                    {group}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {(Array.isArray(selectedPerson.relationships) && selectedPerson.relationships.length > 0) && (
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                        <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:6}}>Related People</div>
                        <div style={{display:'flex', flexDirection:'column', gap:6}}>
                            {selectedPerson.relationships.map(relId => {
                                const related = people.find(p => p.id === relId);
                                if (!related) return null;
                                return (
                                    <div 
                                        key={relId}
                                        onClick={() => {
                                            setSelectedPersonId(relId);
                                            if (onPersonSelected) {
                                                onPersonSelected(getDisplayName(related));
                                            }
                                        }}
                                        style={{padding:'8px 12px', background:'var(--card)', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.2s'}}
                                        onMouseEnter={e => e.currentTarget.style.background='var(--primary)'}
                                        onMouseLeave={e => e.currentTarget.style.background='var(--card)'}
                                    >
                                        👤 {getDisplayName(related)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {selectedPerson.notes && (
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                            <div style={{fontSize:11, fontWeight:800, opacity:0.7}}>Notes</div>
                            {selectedPerson.notesHistory?.length > 0 && (
                                <button
                                    className="btn-white-outline"
                                    onClick={() => {
                                        const history = selectedPerson.notesHistory || [];
                                        alert('Notes History:\n\n' + history.map((h, i) => 
                                            `${i + 1}. ${new Date(h.updatedAt).toLocaleString()}\n${h.notes.substring(0, 200)}${h.notes.length > 200 ? '...' : ''}`
                                        ).join('\n\n---\n\n'));
                                    }}
                                    style={{padding:'4px 8px', fontSize:10}}
                                >
                                    📜 View History
                                </button>
                            )}
                        </div>
                        <div style={{fontSize:12, whiteSpace:'pre-wrap', lineHeight:1.35}}>{selectedPerson.notes}</div>
                    </div>
                )}
                
                {/* Connected Tasks */}
                {(() => {
                    const connectedTasks = (safeTasks || []).filter(task => {
                        if (!task || task.completed) return false;
                        const taskPeople = Array.isArray(task.people) ? task.people : [];
                        const personName = getDisplayName(selectedPerson);
                        return taskPeople.some(p => {
                            const pName = typeof p === 'object' ? p.name : p;
                            return String(pName || '').toLowerCase() === String(personName || '').toLowerCase();
                        });
                    });
                    
                    if (connectedTasks.length > 0) {
                        return (
                            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                                <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:10}}>Connected Tasks ({connectedTasks.length})</div>
                                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                                    {connectedTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => {
                                                if (onViewTask) {
                                                    onViewTask(task);
                                                } else if (window.ViewTaskModal) {
                                                    // Fallback: try to trigger view modal
                                                    window.dispatchEvent(new CustomEvent('view-task', { detail: { task } }));
                                                }
                                            }}
                                            style={{
                                                padding:'10px 12px',
                                                background:'var(--card)',
                                                borderRadius:8,
                                                cursor:'pointer',
                                                border:'1px solid var(--border)',
                                                transition:'all 0.2s'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background='var(--primary)';
                                                e.currentTarget.style.borderColor='var(--primary)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background='var(--card)';
                                                e.currentTarget.style.borderColor='var(--border)';
                                            }}
                                        >
                                            <div style={{fontWeight:600, fontSize:13, marginBottom:4}}>{task.title || 'Untitled Task'}</div>
                                            <div style={{fontSize:11, color:'var(--text-light)', display:'flex', gap:12, flexWrap:'wrap'}}>
                                                {task.category && <span>📁 {task.category}</span>}
                                                {task.priority && <span>⚡ {task.priority}</span>}
                                                {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}
                
                {/* Communication Log / Activity Timeline */}
                {selectedPersonHistory.length > 0 && (
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                        <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:10}}>Activity Timeline</div>
                        <div style={{maxHeight:300, overflowY:'auto'}}>
                            {selectedPersonHistory.slice(0, 20).map((h, i) => {
                                const when = new Date(h?.createdAt || h?.completedAt || Date.now());
                                const title = h?.title || h?.taskName || 'Untitled';
                                const dur = Number(h?.duration) || 0;
                                return (
                                    <div key={i} style={{padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12}}>
                                        <div style={{fontWeight:600}}>{title}</div>
                                        <div style={{fontSize:11, color:'var(--text-light)', marginTop:2}}>
                                            {when.toLocaleString()} {dur > 0 && `• ${Math.round(dur)}m`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {Array.isArray(selectedPerson.locationIds) && selectedPerson.locationIds.length > 0 && (
                    <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:12, marginBottom:14}}>
                        <div style={{fontSize:11, fontWeight:800, opacity:0.7, marginBottom:6}}>Connected Places</div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                            {selectedPerson.locationIds.map(locId => {
                                const loc = Array.isArray(locations) ? locations.find(l => l.id === locId) : null;
                                if (!loc) return null;
                                return (
                                    <div
                                        key={locId}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            background: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <span>📍</span>
                                        <span>{loc.name}</span>
                                        {loc.address && (
                                            <span style={{fontSize:10, opacity:0.7, marginLeft:4}}>• {loc.address}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{fontFamily:'Fredoka', fontSize:14, fontWeight:800, marginBottom:10}}>History</div>
                <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', maxHeight:420, overflowY:'auto'}}>
                    {selectedPersonHistory.length === 0 ? (
                        <div style={{padding:18, opacity:0.65, textAlign:'center'}}>No history entries referencing this person yet.</div>
                    ) : (
                        selectedPersonHistory.slice(0, 120).map((h, i) => {
                            const when = new Date(h?.createdAt || h?.completedAt || Date.now());
                            const title = h?.title || h?.taskName || 'Untitled';
                            const cat = h?.category || 'General';
                            const type = h?.type || (h?.completedAt ? 'Completed' : 'Sessions');
                            const dur = Number(h?.duration) || 0;
                            const valueText = dur ? `${Math.round(dur)}m` : (h?.value != null ? String(h.value) : '');

                            return (
                                <div key={i} style={{padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <div style={{minWidth:0}}>
                                        <div style={{fontSize:13, fontWeight:650, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{title}</div>
                                        <div style={{fontSize:10, color:'var(--text-light)'}}>
                                            {when.toLocaleDateString()} • {cat} • {type}
                                        </div>
                                    </div>
                                    <div style={{fontSize:13, fontWeight:800, color:'var(--primary)'}}>{valueText}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // --- EDIT FORM ---
    if (isEditing) {
        const safeLocations = Array.isArray(locations) ? locations : [];
        
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

                <div style={{marginBottom:14}}>
                    <label className="f-label">CONNECTED PLACES</label>
                    {safeLocations.length === 0 ? (
                        <div style={{fontSize:12, color:'var(--text-light)', fontStyle:'italic', padding:12, background:'var(--bg)', borderRadius:8}}>No places yet. Add places in the Places tab.</div>
                    ) : (
                        <>
                            <input
                                type="text"
                                className="f-input"
                                placeholder="🔍 Search and select places..."
                                value={locationSearchInput || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocationSearchInput(val);
                                    // Filter locations for autocomplete
                                }}
                                list="people-location-list"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.target.value.trim();
                                        if (val) {
                                            const match = safeLocations.find(loc => 
                                                loc.name.toLowerCase() === val.toLowerCase() ||
                                                loc.name.toLowerCase().includes(val.toLowerCase())
                                            );
                                            if (match && !formData.locationIds.includes(match.id)) {
                                                setFormData({...formData, locationIds: [...formData.locationIds, match.id]});
                                                setLocationSearchInput('');
                                            }
                                        }
                                        e.preventDefault();
                                    }
                                }}
                                style={{marginBottom:8}}
                            />
                            <datalist id="people-location-list">
                                {safeLocations.map(loc => (
                                    <option key={loc.id} value={loc.name}>
                                        {loc.address ? `${loc.name} - ${loc.address}` : loc.name}
                                    </option>
                                ))}
                            </datalist>
                            
                            {/* Selected locations chips */}
                            {formData.locationIds.length > 0 && (
                                <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:8}}>
                                    {formData.locationIds.map(locId => {
                                        const loc = safeLocations.find(l => l.id === locId);
                                        if (!loc) return null;
                                        return (
                                            <div
                                                key={locId}
                                                style={{
                                                    display:'flex',
                                                    alignItems:'center',
                                                    gap:6,
                                                    padding:'6px 10px',
                                                    background:'var(--primary)',
                                                    color:'white',
                                                    borderRadius:8,
                                                    fontSize:12,
                                                    fontWeight:600
                                                }}
                                            >
                                                <span>📍</span>
                                                <span>{loc.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({...formData, locationIds: formData.locationIds.filter(id => id !== locId)});
                                                    }}
                                                    style={{
                                                        background:'rgba(255,255,255,0.2)',
                                                        border:'none',
                                                        color:'white',
                                                        borderRadius:4,
                                                        width:18,
                                                        height:18,
                                                        cursor:'pointer',
                                                        fontSize:12,
                                                        lineHeight:1,
                                                        padding:0,
                                                        display:'flex',
                                                        alignItems:'center',
                                                        justifyContent:'center'
                                                    }}
                                                    title="Remove"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {/* Autocomplete suggestions dropdown */}
                            {locationSearchInput && (
                                <div style={{
                                    border:'1px solid var(--border)',
                                    borderRadius:8,
                                    background:'var(--card)',
                                    maxHeight:200,
                                    overflowY:'auto',
                                    marginTop:4,
                                    boxShadow:'0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                    {safeLocations
                                        .filter(loc => {
                                            const search = locationSearchInput.toLowerCase();
                                            return loc.name.toLowerCase().includes(search) ||
                                                   (loc.address && loc.address.toLowerCase().includes(search));
                                        })
                                        .filter(loc => !formData.locationIds.includes(loc.id))
                                        .slice(0, 10)
                                        .map(loc => (
                                            <div
                                                key={loc.id}
                                                onClick={() => {
                                                    setFormData({...formData, locationIds: [...formData.locationIds, loc.id]});
                                                    setLocationSearchInput('');
                                                }}
                                                style={{
                                                    padding:'10px 12px',
                                                    cursor:'pointer',
                                                    borderBottom:'1px solid var(--border)',
                                                    transition:'all 0.2s'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background='var(--bg)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background='transparent';
                                                }}
                                            >
                                                <div style={{fontWeight:700, fontSize:13, marginBottom:2}}>📍 {loc.name}</div>
                                                {loc.address && (
                                                    <div style={{fontSize:11, color:'var(--text-light)'}}>{loc.address}</div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
                    <div>
                        <label className="f-label">TAGS (comma separated)</label>
                        <input className="f-input" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="e.g. client, contractor" />
                    </div>
                    <div>
                        <label className="f-label">LAST CONTACT DATE</label>
                        <input 
                            type="date" 
                            className="f-input" 
                            value={formData.lastContactDate} 
                            onChange={e => setFormData({...formData, lastContactDate: e.target.value})} 
                        />
                        <button
                            type="button"
                            className="btn-white-outline"
                            onClick={() => setFormData({...formData, lastContactDate: new Date().toISOString().split('T')[0]})}
                            style={{marginTop:6, padding:'4px 8px', fontSize:11}}
                        >
                            Set to Today
                        </button>
                    </div>
                </div>
                
                <div style={{marginBottom:14}}>
                    <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                        <input 
                            type="checkbox" 
                            checked={formData.isFavorite} 
                            onChange={e => setFormData({...formData, isFavorite: e.target.checked})}
                            style={{width:18, height:18, cursor:'pointer'}}
                        />
                        <span className="f-label" style={{margin:0}}>⭐ Favorite Contact</span>
                    </label>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
                    <div>
                        <label className="f-label">COMPASS PERSON ID (externalId)</label>
                        <input 
                            className="f-input" 
                            value={formData.externalId || ''} 
                            onChange={e => setFormData({...formData, externalId: e.target.value})} 
                            placeholder="e.g. 61f31f78..." 
                        />
                        <div style={{fontSize:10, color:'var(--text-light)', marginTop:6}}>
                            Compass CRM personId for direct linking
                        </div>
                    </div>
                    <div>
                        <label className="f-label">COMPASS CRM LINK (legacy)</label>
                        <input className="f-input" value={formData.compassCrmLink} onChange={e => setFormData({...formData, compassCrmLink: e.target.value})} placeholder="Paste Compass contact permalink..." />
                        <div style={{fontSize:10, color:'var(--text-light)', marginTop:6}}>
                            Legacy permalink (optional)
                        </div>
                    </div>
                </div>
                
                {formData.externalId && window.openCompass && (
                    <div style={{marginBottom:14, padding:12, background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)'}}>
                        <div style={{fontSize:11, fontWeight:700, marginBottom:8, color:'var(--text-light)'}}>Quick Links:</div>
                        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                            {['profile', 'notes', 'email', 'bizTracker', 'listings', 'tasks'].map(action => (
                                <button
                                    key={action}
                                    className="btn-white-outline"
                                    onClick={() => window.openCompass(formData.externalId, action, formData.firstName + ' ' + formData.lastName)}
                                    style={{padding:'6px 12px', fontSize:11}}
                                >
                                    {action === 'bizTracker' ? '📊 Biz Tracker' : 
                                     action === 'profile' ? '👤 Profile' :
                                     action === 'notes' ? '📝 Notes' :
                                     action === 'email' ? '✉️ Email' :
                                     action === 'listings' ? '🏠 Listings' :
                                     action === 'tasks' ? '✅ Tasks' : action}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

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
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
                    <div>
                        <label className="f-label">GROUPS / SEGMENTS</label>
                        <input 
                            className="f-input" 
                            value={Array.isArray(formData.groups) ? formData.groups.join(', ') : ''} 
                            onChange={e => {
                                const groups = e.target.value.split(',').map(g => g.trim()).filter(Boolean);
                                setFormData({...formData, groups});
                            }} 
                            placeholder="e.g. VIP, Team A, Project X"
                        />
                        <div style={{fontSize:10, color:'var(--text-light)', marginTop:4}}>Comma-separated groups</div>
                    </div>
                    <div>
                        <label className="f-label">RELATED PEOPLE</label>
                        <select
                            className="f-select"
                            multiple
                            value={Array.isArray(formData.relationships) ? formData.relationships : []}
                            onChange={e => {
                                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                setFormData({...formData, relationships: selected});
                            }}
                            style={{minHeight:80}}
                        >
                            {people.filter(p => p.id !== editId).map(p => (
                                <option key={p.id} value={p.id}>{getDisplayName(p)}</option>
                            ))}
                        </select>
                        <div style={{fontSize:10, color:'var(--text-light)', marginTop:4}}>Hold Ctrl/Cmd to select multiple</div>
                    </div>
                </div>

                <div style={{marginBottom:18}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                        <label className="f-label">NOTES</label>
                        {editId && people.find(p => p.id === editId)?.notesHistory?.length > 0 && (
                            <button
                                type="button"
                                className="btn-white-outline"
                                onClick={() => {
                                    const person = people.find(p => p.id === editId);
                                    if (person?.notesHistory?.length > 0) {
                                        alert('Notes History:\n\n' + person.notesHistory.map((h, i) => 
                                            `${i + 1}. ${new Date(h.updatedAt).toLocaleString()}\n${h.notes.substring(0, 100)}${h.notes.length > 100 ? '...' : ''}`
                                        ).join('\n\n'));
                                    }
                                }}
                                style={{padding:'4px 8px', fontSize:11}}
                            >
                                📜 History
                            </button>
                        )}
                    </div>
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

    // --- LIST VIEW (Improved Table Layout) ---
    return (
        <div className="fade-in">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10}}>
                <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', letterSpacing:1}}>MY PEOPLE ({people.length})</div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                    <button 
                        className="btn-white-outline" 
                        onClick={() => setShowDuplicateFinder(true)}
                        style={{padding:'6px 12px', fontSize:12}}
                        title="Find duplicates"
                    >
                        🔍 Duplicates
                    </button>
                    <button 
                        className="btn-white-outline" 
                        onClick={() => setShowImportDialog(true)}
                        style={{padding:'6px 12px', fontSize:12}}
                        title="Import from CSV"
                    >
                        📥 Import
                    </button>
                    <button 
                        className="btn-white-outline" 
                        onClick={() => {
                            setShowBulkActions(!showBulkActions);
                            if (showBulkActions) setSelectedPeople(new Set());
                        }}
                        style={{padding:'6px 12px', fontSize:12}}
                    >
                        {showBulkActions ? '✓ Done' : '☑ Select'}
                    </button>
                    <button className="btn-orange-small" onClick={() => { setSelectedPersonId(null); setIsEditing(true); }} style={{padding:'8px 16px', fontSize:13, fontWeight:700}}>+ Add New</button>
                </div>
            </div>
            
            {showBulkActions && selectedPeople.size > 0 && (
                <div style={{background:'var(--primary)', color:'white', padding:12, borderRadius:12, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{fontWeight:700}}>{selectedPeople.size} selected</div>
                    <div style={{display:'flex', gap:8}}>
                        <button 
                            className="btn-white-outline" 
                            onClick={() => {
                                const updated = people.map(p => 
                                    selectedPeople.has(p.id) ? {...p, isFavorite: !p.isFavorite} : p
                                );
                                persistPeople(updated);
                                setSelectedPeople(new Set());
                                notify?.('Updated favorites', '✅');
                            }}
                            style={{background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.3)'}}
                        >
                            ⭐ Toggle Favorite
                        </button>
                        <button 
                            className="btn-white-outline" 
                            onClick={() => {
                                if (confirm(`Delete ${selectedPeople.size} people?`)) {
                                    persistPeople(people.filter(p => !selectedPeople.has(p.id)));
                                    setSelectedPeople(new Set());
                                    notify?.('Deleted', '🗑️');
                                }
                            }}
                            style={{background:'rgba(255,0,0,0.3)', color:'white', border:'1px solid rgba(255,0,0,0.5)'}}
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            )}

            <div style={{display:'flex', gap:10, marginBottom:16, flexWrap:'wrap'}}>
                <input 
                    className="f-input" 
                    placeholder="🔍 Search people..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                    style={{flex:1, minWidth:200, marginBottom:0}} 
                />
                <button
                    className={filterFavorite ? "btn-orange-small" : "btn-white-outline"}
                    onClick={() => setFilterFavorite(!filterFavorite)}
                    style={{padding:'8px 12px', fontSize:12, whiteSpace:'nowrap'}}
                    title="Show favorites only"
                >
                    ⭐ {filterFavorite ? 'Favorites' : 'All'}
                </button>
                <select 
                    className="f-select" 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    style={{width:140, marginBottom:0}}
                >
                    <option value="all">All Types</option>
                    <option value="client">Client</option>
                    <option value="lead">Lead</option>
                    <option value="agent">Agent</option>
                    <option value="vendor">Vendor</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                </select>
                <select 
                    className="f-select" 
                    value={`${sortBy}-${sortOrder}`} 
                    onChange={e => {
                        const [by, order] = e.target.value.split('-');
                        setSortBy(by);
                        setSortOrder(order);
                    }}
                    style={{width:160, marginBottom:0}}
                >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="type-asc">Type (A-Z)</option>
                    <option value="type-desc">Type (Z-A)</option>
                    <option value="activity-desc">Most Active</option>
                    <option value="activity-asc">Least Active</option>
                    <option value="hours-desc">Most Hours</option>
                    <option value="hours-asc">Least Hours</option>
                    <option value="lastContact-desc">Recent Contact</option>
                    <option value="lastContact-asc">Old Contact</option>
                </select>
                <button 
                    className="btn-white-outline" 
                    onClick={() => {
                        const csv = [
                            ['Name', 'First Name', 'Last Name', 'Type', 'Phone', 'Email', 'Tags', 'Weight', 'CRM Link', 'Notes'].join(','),
                            ...people.map(p => [
                                `"${getDisplayName(p)}"`,
                                `"${p.firstName || ''}"`,
                                `"${p.lastName || ''}"`,
                                `"${p.type || 'client'}"`,
                                `"${p.phone || ''}"`,
                                `"${p.email || ''}"`,
                                `"${Array.isArray(p.tags) ? p.tags.join('; ') : (p.tags || '')}"`,
                                p.weight || 1,
                                `"${p.compassCrmLink || ''}"`,
                                `"${(p.notes || '').replace(/"/g, '""')}"`
                            ].join(','))
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `people-export-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        notify?.('People exported to CSV', '✅');
                    }}
                    style={{padding:'8px 12px', fontSize:12, whiteSpace:'nowrap'}}
                    title="Export to CSV"
                >
                    📥 Export
                </button>
            </div>

            {filteredPeople.length === 0 ? (
                <div style={{textAlign:'center', padding:40, background:'var(--card)', borderRadius:16, border:'2px dashed var(--border)', opacity:0.8}}>
                    <div style={{fontSize:40, marginBottom:10, opacity:0.5}}>👥</div>
                    <div style={{fontWeight:700, fontSize:16}}>{people.length === 0 ? 'No People Yet' : 'No matches'}</div>
                </div>
            ) : (
                <div style={{background:'var(--card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden'}}>
                    {/* Table Header */}
                    <div style={{display:'grid', gridTemplateColumns:showBulkActions ? '40px 50px 3fr 100px 200px 80px 70px 50px' : '50px 3fr 100px 200px 80px 70px 50px', gap:12, padding:'12px 16px', background:'var(--bg)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:800, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:0.5}}>
                        {showBulkActions && <div></div>}
                        <div></div>
                        <div>Name</div>
                        <div>Type</div>
                        <div>Contact</div>
                        <div>Activity</div>
                        <div>Hours</div>
                        <div></div>
                    </div>
                    
                    {/* Table Rows */}
                    <div style={{maxHeight:'calc(100vh - 300px)', overflowY:'auto'}}>
                    {filteredPeople.map(p => {
                        const displayName = getDisplayName(p);
                        const stat = (peopleStats[displayName] || { count: 0, minutes: 0, lastSeen: 0 });
                        const hrs = (stat.minutes / 60);
                        return (
                            <div
                                key={p.id}
                                    onClick={() => {
                                        setSelectedPersonId(p.id);
                                        if (onPersonSelected) {
                                            onPersonSelected(getDisplayName(p));
                                        }
                                    }}
                                style={{
                                        display:'grid',
                                        gridTemplateColumns:showBulkActions ? '40px 50px 3fr 100px 200px 80px 70px 50px' : '50px 3fr 100px 200px 80px 70px 50px',
                                        gap:12,
                                        padding:'14px 16px',
                                    cursor:'pointer',
                                        borderBottom:'1px solid var(--border)',
                                    transition:'all 0.2s',
                                        alignItems:'center',
                                        background: selectedPeople.has(p.id) ? 'rgba(255,107,53,0.15)' : 'transparent'
                                }}
                                    onMouseEnter={e => { if (!selectedPeople.has(p.id)) e.currentTarget.style.background='var(--bg)'; }}
                                    onMouseOut={e => { if (!selectedPeople.has(p.id)) e.currentTarget.style.background='transparent'; }}
                            >
                                    {showBulkActions && (
                                        <div onClick={(e) => {
                                            e.stopPropagation();
                                            const newSet = new Set(selectedPeople);
                                            if (newSet.has(p.id)) {
                                                newSet.delete(p.id);
                                            } else {
                                                newSet.add(p.id);
                                            }
                                            setSelectedPeople(newSet);
                                        }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPeople.has(p.id)}
                                                onChange={() => {}}
                                                style={{width:20, height:20, cursor:'pointer'}}
                                            />
                                        </div>
                                    )}
                                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                                        <div style={{width:40, height:40, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'white', flexShrink:0}}>
                                            {(getDisplayName(p) || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = people.map(person => 
                                                    person.id === p.id ? {...person, isFavorite: !person.isFavorite} : person
                                                );
                                                persistPeople(updated);
                                            }}
                                            style={{
                                                fontSize:18, 
                                                cursor:'pointer', 
                                                opacity: p.isFavorite ? 1 : 0.3,
                                                filter: p.isFavorite ? 'drop-shadow(0 0 4px rgba(255,215,0,0.8))' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                            title={p.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                            ⭐
                                        </span>
                                    </div>

                                    <div style={{minWidth:0, overflow:'hidden'}}>
                                        <div style={{fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                            {getDisplayName(p)}
                                        </div>
                                        <div style={{display:'flex', gap:6, marginTop:3, alignItems:'center'}}>
                                            {p.compassCrmLink && (
                                                <span style={{fontSize:9, color:'var(--primary)', padding:'2px 6px', background:'rgba(255,107,53,0.15)', borderRadius:4}}>CRM</span>
                                            )}
                                            {Array.isArray(p.tags) && p.tags.length > 0 && (
                                                <span style={{fontSize:9, color:'var(--text-light)', padding:'2px 6px', background:'var(--bg)', borderRadius:4}}>
                                                    {p.tags.slice(0, 2).join(', ')}{p.tags.length > 2 ? '...' : ''}
                                                </span>
                                            )}
                                        </div>
                                </div>

                                    <div>
                                        <span style={{fontSize:11, color:'var(--text-light)', fontWeight:700, textTransform:'uppercase', padding:'4px 8px', background:'var(--bg)', borderRadius:6}}>
                                            {(p.type || 'client')}
                                        </span>
                                    </div>

                                    <div style={{minWidth:0}}>
                                        {p.phone && (
                                            <div style={{fontSize:12, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>📞 {p.phone}</div>
                                        )}
                                        {p.email && (
                                            <div style={{fontSize:12, color:'var(--text-light)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>✉️ {p.email}</div>
                                        )}
                                        {!p.phone && !p.email && (
                                            <div style={{fontSize:11, color:'var(--text-light)', fontStyle:'italic', opacity:0.6}}>No contact</div>
                                        )}
                                </div>

                                    <div style={{fontSize:12, fontWeight:700, color:'var(--primary)'}}>
                                        🔁 {stat.count}
                                    </div>

                                    <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)'}}>
                                        ⏱ {hrs ? hrs.toFixed(1) : '0.0'}h
                                    </div>

                                <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(e, p.id);
                                        }}
                                        style={{background:'none', border:'none', fontSize:14, cursor:'pointer', opacity:0.4, padding:4}}
                                        onMouseEnter={e => { e.target.style.opacity=1; e.target.style.color='var(--danger)'; }}
                                        onMouseOut={e => { e.target.style.opacity=0.4; e.target.style.color=''; }}
                                    title="Delete"
                                >
                                    🗑
                                </button>
                            </div>
                        );
                    })}
                    </div>
                </div>
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
function StatsTab({ tasks = [], history = [], categories = [], settings, notify, locations: locationsProp, setLocations: setLocationsProp, onViewTask }) {

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

    // Check URL for person parameter on mount
    const getPersonFromURL = () => {
        const hash = window.location.hash;
        const match = hash.match(/[?&]person=([^&]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        return null;
    };

    const [activeView, setActiveView] = React.useState('overview');
    const [showSecretLinks, setShowSecretLinks] = React.useState(false);
    const [selectedPersonName, setSelectedPersonName] = React.useState(() => getPersonFromURL());

    // Get people list for person name lookups
    const [people, setPeople] = React.useState(() => {
        if (window.DataManager?.people?.getAll) {
            return window.DataManager.people.getAll();
        }
        try { return JSON.parse(localStorage.getItem('savedPeople') || '[]'); } catch { return []; }
    });

    // Listen for people updates
    React.useEffect(() => {
        const handlePeopleUpdate = () => {
            if (window.DataManager?.people?.getAll) {
                setPeople(window.DataManager.people.getAll());
            } else {
                try {
                    const fresh = JSON.parse(localStorage.getItem('savedPeople') || '[]');
                    setPeople(fresh);
                } catch {}
            }
        };
        window.addEventListener('people-updated', handlePeopleUpdate);
        if (window.DataManager?.people?.subscribe) {
            const unsubscribe = window.DataManager.people.subscribe(handlePeopleUpdate);
            return () => {
                window.removeEventListener('people-updated', handlePeopleUpdate);
                unsubscribe();
            };
        }
        return () => window.removeEventListener('people-updated', handlePeopleUpdate);
    }, []);

    // Listen for navigation events from other components
    React.useEffect(() => {
        const handleNavigateToPerson = (e) => {
            const personName = e.detail?.personName;
            if (personName) {
                setActiveView('people');
                setSelectedPersonName(personName);
                setTimeout(() => setSelectedPersonName(null), 100);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        const handleHashChange = () => {
            const personFromURL = getPersonFromURL();
            if (personFromURL) {
                setActiveView('people');
                setSelectedPersonName(personFromURL);
                setTimeout(() => setSelectedPersonName(null), 100);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        window.addEventListener('navigate-to-person', handleNavigateToPerson);
        window.addEventListener('hashchange', handleHashChange);
        
        // Check on mount if person is in URL
        handleHashChange();

        return () => {
            window.removeEventListener('navigate-to-person', handleNavigateToPerson);
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    // Handle person name click - switch to people view and show person details
    const handlePersonClick = (personName, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        // Find person by name (case-insensitive)
        const person = people.find(p => 
            (p.name || '').trim().toLowerCase() === (personName || '').trim().toLowerCase()
        );
        if (person) {
            setActiveView('people');
            setSelectedPersonName(person.name);
            // Clear after a short delay so the effect in PeopleManager can use it
            setTimeout(() => setSelectedPersonName(null), 100);
            // Scroll to top to see the person details
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Person not found, but still switch to people view
            setActiveView('people');
            notify?.('Person not found in database', '⚠️');
        }
    };

    const [timeRange, setTimeRange] = React.useState(7);
    const [unit, setUnit] = React.useState('minutes');
    const [chartType, setChartType] = React.useState('bar'); // bar, line, area, pie, heatmap
    const [selectedHistoryItem, setSelectedHistoryItem] = React.useState(null);
    const [collapsedSections, setCollapsedSections] = React.useState({});
    
    // Charts filters
    const [chartCategoryFilter, setChartCategoryFilter] = React.useState('All');
    const [chartLocationFilter, setChartLocationFilter] = React.useState('All');
    const [chartTypeFilter, setChartTypeFilter] = React.useState('All');
    
    const toggleSection = (sectionId) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const [historyRange, setHistoryRange] = React.useState('week');
    const [historyType, setHistoryType] = React.useState('All');
    const [historyFilter, setHistoryFilter] = React.useState('All');
    const [historyLocationFilter, setHistoryLocationFilter] = React.useState('All');
    const [historySearch, setHistorySearch] = React.useState('');
    const [superHistory, setSuperHistory] = React.useState(false);
    const [superHistoryTypeFilters, setSuperHistoryTypeFilters] = React.useState({});

    const [peopleSearch, setPeopleSearch] = React.useState('');
    const [streak, setStreak] = React.useState(0);

    const safeHistory = Array.isArray(history) ? history : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    
    // Debug: Log history when it changes
    React.useEffect(() => {
        const filtered = getFilteredHistory();
        console.log("📊 StatsTab history updated:", {
            totalCount: safeHistory.length,
            filteredCount: filtered.length,
            types: [...new Set(safeHistory.map(h => h?.type))],
            historyType,
            historyRange,
            historyFilter,
            sample: safeHistory.slice(0, 3),
            filteredSample: filtered.slice(0, 3)
        });
    }, [safeHistory.length, historyType, historyRange, historyFilter]);

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

    // --- NORMALIZATION ---
    const normalizeActivity = (h) => {
        const title = (h?.title || h?.taskName || 'Untitled');
        const category = (h?.category || 'General');
        const createdAt = (h?.createdAt || h?.completedAt || Date.now());
        const minutes = Number(h?.duration) || 0;

        // Preserve the type from the activity - don't override it
        let type = '';
        if (h?.type !== undefined && h?.type !== null) {
            type = String(h.type).trim();
        }
        // Only default if type is truly missing
        if (!type) {
            if (h?.completedAt || h?.taskName) type = 'Completed';
            else type = 'log'; // Default to 'log' instead of 'All'
        }

        let valueText = '';
        if (type === 'Completed' || type === 'Sessions' || type === 'focus') valueText = `${minutes}m`;
        else if (typeof h?.value !== 'undefined' && h?.value !== null) valueText = String(h.value);
        else if (minutes) valueText = `${minutes}m`;

        const people = Array.isArray(h?.people) ? h.people.map(p => String(p || '').trim()).filter(Boolean) : [];
        const locationLabel = (h?.locationLabel || h?.location || '').toString();
        const locationId = (h?.locationId || '').toString();
        const coords = h?.locationCoords || h?.coords || null;
        const notes = (h?.notes || '').toString();

        return { raw: h, title, category, type, duration: minutes, createdAt, valueText, people, locationLabel, locationId, coords, notes };
    };

    const getFilteredHistory = () => {
        const start = rangeStart(historyRange);
        const q = historySearch.trim().toLowerCase();

        return safeHistory
            .map(normalizeActivity)
            .filter(act => {
                const actDate = safeDate(act.createdAt);
                const startDate = start;
                const passesDate = actDate >= startDate;
                if (!passesDate) {
                    console.log("❌ Activity filtered by date:", { title: act.title, actDate, startDate, range: historyRange });
                }
                return passesDate;
            })
            .filter(act => {
                // Super history mode: use type filters
                if (superHistory) {
                    const typeEnabled = superHistoryTypeFilters[act.type] !== false;
                    if (!typeEnabled) return false;
                } else {
                    // Normal mode: use historyType dropdown
                if (historyType === 'All') return true;
                if (act.type === historyType) return true;
                    // Sessions includes focus, Sessions, timer, and other session types
                    if (historyType === 'Sessions' && (act.type === 'focus' || act.type === 'Sessions' || act.type === 'timer' || act.type === 'log')) return true;
                    // Completed includes complete and Completed
                    if (historyType === 'Completed' && (act.type === 'complete' || act.type === 'Completed')) return true;
                    // Spin includes spin and respin
                    if (historyType === 'spin' && (act.type === 'spin' || act.type === 'respin')) return true;
                    // Task Created/Edited
                    if (historyType === 'task_created' && act.type === 'task_created') return true;
                    if (historyType === 'task_edited' && act.type === 'task_edited') return true;
                    // Contact Created/Edited
                    if (historyType === 'contact_created' && act.type === 'contact_created') return true;
                    if (historyType === 'contact_edited' && act.type === 'contact_edited') return true;
                    // Location Created/Edited
                    if (historyType === 'location_created' && act.type === 'location_created') return true;
                    if (historyType === 'location_edited' && act.type === 'location_edited') return true;
                return false;
                }
                return true;
            })
            .filter(act => {
                if (historyFilter === 'All') return true;
                const passes = act.category === historyFilter;
                if (!passes) {
                    console.log("❌ Activity filtered by category:", { title: act.title, category: act.category, filter: historyFilter });
                }
                return passes;
            })
            .filter(act => {
                // Super history: location filter
                if (superHistory && historyLocationFilter !== 'All') {
                    if (act.locationLabel !== historyLocationFilter) return false;
                }
                return true;
            })
            .filter(act => {
                if (!q) return true;
                const hay = `${act.title} ${act.category} ${act.type} ${(act.people||[]).join(' ')} ${act.locationLabel}`.toLowerCase();
                return hay.includes(q);
            })
            .sort((a,b) => safeDate(b.createdAt) - safeDate(a.createdAt));
    };

    const historyRows = React.useMemo(() => getFilteredHistory(), [safeHistory, historyRange, historyType, historyFilter, historySearch]);

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
        const data = {};
        const now = new Date();
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            data[d.toDateString()] = 0;
        }
        safeHistory.forEach(h => {
            const normalized = normalizeActivity(h);
            // Apply filters
            if (chartCategoryFilter !== 'All' && normalized.category !== chartCategoryFilter) return;
            if (chartLocationFilter !== 'All' && normalized.locationLabel !== chartLocationFilter) return;
            if (chartTypeFilter !== 'All' && normalized.type !== chartTypeFilter) return;
            
            const dateKey = safeDate(normalized.createdAt).toDateString();
            if (data[dateKey] !== undefined) {
                data[dateKey] += (unit === 'hours' ? (normalized.duration||0)/60 : (normalized.duration||0));
            }
        });
        return Object.entries(data).reverse().map(([date, value]) => ({
            date: new Date(date).toLocaleDateString(undefined, {weekday:'short'}),
            value: parseFloat(value.toFixed(1))
        }));
    };

    // Location-based chart data
    const getLocationChartData = React.useMemo(() => {
        const locationMap = {};
        safeHistory.forEach(h => {
            const normalized = normalizeActivity(h);
            if (!normalized.locationLabel) return;
            const loc = normalized.locationLabel;
            if (!locationMap[loc]) {
                locationMap[loc] = { name: loc, count: 0, minutes: 0 };
            }
            locationMap[loc].count += 1;
            locationMap[loc].minutes += (normalized.duration || 0);
        });
        return Object.values(locationMap).sort((a, b) => b.minutes - a.minutes);
    }, [safeHistory]);

    const chartData = getChartData(timeRange);
    const maxChartVal = Math.max(...chartData.map(d => d.value), 10);

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

    // Enhanced analytics calculations
    const categoryStats = React.useMemo(() => {
        const stats = {};
        safeHistory.forEach(h => {
            const cat = h?.category || 'General';
            if (!stats[cat]) {
                stats[cat] = { name: cat, count: 0, minutes: 0, hours: 0 };
            }
            stats[cat].count += 1;
            stats[cat].minutes += (Number(h?.duration) || 0);
            stats[cat].hours = (stats[cat].minutes / 60).toFixed(1);
        });
        return Object.values(stats).sort((a, b) => b.minutes - a.minutes);
    }, [safeHistory]);

    const typeStats = React.useMemo(() => {
        const stats = {};
        safeHistory.forEach(h => {
            const type = h?.type || 'log';
            if (!stats[type]) {
                stats[type] = { name: type, count: 0, minutes: 0 };
            }
            stats[type].count += 1;
            stats[type].minutes += (Number(h?.duration) || 0);
        });
        return Object.values(stats).sort((a, b) => b.count - a.count);
    }, [safeHistory]);

    // Initialize super history type filters when super history is enabled
    React.useEffect(() => {
        if (superHistory && Object.keys(superHistoryTypeFilters).length === 0 && safeHistory.length > 0) {
            const allTypes = [...new Set(safeHistory.map(h => {
                const type = h?.type || (h?.completedAt || h?.taskName ? 'Completed' : 'log');
                return type;
            }))].sort();
            const initialFilters = {};
            allTypes.forEach(type => {
                initialFilters[type] = true;
            });
            if (allTypes.length > 0) {
                setSuperHistoryTypeFilters(initialFilters);
            }
        }
    }, [superHistory, safeHistory.length]);

    // Time-based productivity insights
    const timeInsights = React.useMemo(() => {
        const hourMap = {};
        safeHistory.forEach(h => {
            const date = safeDate(h.createdAt || h.completedAt);
            const hour = date.getHours();
            if (!hourMap[hour]) hourMap[hour] = { count: 0, minutes: 0 };
            hourMap[hour].count += 1;
            hourMap[hour].minutes += (Number(h?.duration) || 0);
        });
        const hours = Object.entries(hourMap).map(([h, data]) => ({
            hour: parseInt(h),
            count: data.count,
            minutes: data.minutes
        })).sort((a, b) => b.minutes - a.minutes);
        const mostProductive = hours[0];
        return { mostProductive, hourMap: hours };
    }, [safeHistory]);

    // Weekly trend analysis
    const weeklyTrend = React.useMemo(() => {
        const weekMap = {};
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toDateString();
            weekMap[key] = { date: d, count: 0, minutes: 0 };
        }
        safeHistory.forEach(h => {
            const date = safeDate(h.createdAt || h.completedAt);
            const key = date.toDateString();
            if (weekMap[key]) {
                weekMap[key].count += 1;
                weekMap[key].minutes += (Number(h?.duration) || 0);
            }
        });
        return Object.values(weekMap).reverse();
    }, [safeHistory]);

    // Average session duration
    const avgSessionDuration = React.useMemo(() => {
        const sessions = safeHistory.filter(h => h.duration > 0);
        if (sessions.length === 0) return 0;
        const total = sessions.reduce((acc, h) => acc + (Number(h.duration) || 0), 0);
        return Math.round(total / sessions.length);
    }, [safeHistory]);

    // Completion rate (completed vs total tasks)
    const completionRate = React.useMemo(() => {
        const completed = safeHistory.filter(h => h.type === 'Completed' || h.completedAt).length;
        const total = safeTasks.length;
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    }, [safeHistory, safeTasks]);

    // Peak Hours data (0-23 hours)
    const peakHoursData = React.useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, minutes: 0 }));
        safeHistory.forEach(h => {
            const date = safeDate(h.createdAt || h.completedAt);
            const hour = date.getHours();
            hours[hour].count += 1;
            hours[hour].minutes += (Number(h.duration) || 0);
        });
        return hours;
    }, [safeHistory]);

    // Priorities Done (radar chart data)
    const prioritiesDoneData = React.useMemo(() => {
        const priorities = ['Urgent', 'High', 'Medium', 'Low'];
        const stats = {};
        priorities.forEach(p => stats[p] = { name: p, count: 0, minutes: 0 });
        
        safeHistory.forEach(h => {
            if (h.type === 'Completed' || h.completedAt) {
                const priority = h.raw?.priority || h.priority || 'Medium';
                if (stats[priority]) {
                    stats[priority].count += 1;
                    stats[priority].minutes += (Number(h.duration) || 0);
                }
            }
        });
        
        return priorities.map(p => stats[p]);
    }, [safeHistory]);

    // Time Distribution (by category or type)
    const timeDistributionData = React.useMemo(() => {
        return categoryStats.slice(0, 6).map(cat => ({
            name: cat.name,
            minutes: cat.minutes,
            hours: cat.hours,
            count: cat.count
        }));
    }, [categoryStats]);

    const QuickStat = ({ label, value, color, subtitle }) => (
        <div style={{background: 'var(--card)', padding: '15px', borderRadius: 16, textAlign: 'center', flex:1, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize: 24, fontWeight: 800, color: color, marginBottom: 4}}>{value}</div>
            <div style={{fontSize: 11, fontWeight: 700, opacity:0.6, textTransform: 'uppercase'}}>{label}</div>
            {subtitle && <div style={{fontSize: 9, opacity:0.5, marginTop: 4}}>{subtitle}</div>}
        </div>
    );

    // History Detail Modal
    const HistoryDetailModal = ({ item, onClose }) => {
        if (!item) return null;
        const when = safeDate(item.createdAt);
        const who = Array.isArray(item.people) && item.people.length ? item.people : [];
        const hasTask = item.raw?.taskId && safeTasks.find(t => t.id === item.raw.taskId);

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
                onClick={onClose}
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
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
                        <div style={{flex:1}}>
                            <div style={{fontSize:11, fontWeight:800, color:'var(--primary)', marginBottom:8, textTransform:'uppercase'}}>
                                {item.category} • {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase() : 'Activity'}
                            </div>
                            <h3 style={{fontFamily:'Fredoka', fontSize:22, fontWeight:800, margin:0, marginBottom:12}}>
                                {item.title}
                            </h3>
                        </div>
                        <button 
                            onClick={onClose}
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
                                justifyContent:'center'
                            }}
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
                                    {Math.round(item.duration)} minutes
                                </div>
                                <div style={{fontSize:12, color:'var(--text-light)', marginTop:4}}>
                                    {(item.duration / 60).toFixed(1)} hours
                                </div>
                            </div>
                        )}

                        {who.length > 0 && (
                            <div style={{background:'var(--bg)', padding:14, borderRadius:12, border:'1px solid var(--border)'}}>
                                <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>People</div>
                                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                                    {who.map((person, idx) => (
                                        <span
                                            key={idx}
                                            onClick={(e) => {
                                                handlePersonClick(person, e);
                                                onClose();
                                            }}
                                            style={{
                                                padding:'6px 12px',
                                                background:'var(--primary)',
                                                color:'white',
                                                borderRadius:20,
                                                fontSize:12,
                                                fontWeight:700,
                                                cursor:'pointer',
                                                transition:'all 0.2s',
                                                boxShadow:'0 2px 8px rgba(255, 107, 53, 0.3)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background='#ff8c42';
                                                e.target.style.transform='scale(1.05)';
                                                e.target.style.boxShadow='0 4px 12px rgba(255, 107, 53, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background='var(--primary)';
                                                e.target.style.transform='scale(1)';
                                                e.target.style.boxShadow='0 2px 8px rgba(255, 107, 53, 0.3)';
                                            }}
                                            title={`Click to view ${person}'s details`}
                                        >
                                            👤 {person}
                                        </span>
                                    ))}
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

                        {hasTask && (
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
                                    marginTop:8
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
            <div style={{marginBottom:20}}>
                <div className="segmented-control" style={{marginBottom: 16}}>
                    <button className={`sc-btn ${activeView==='overview'?'active':''}`} onClick={()=>setActiveView('overview')}>Overview</button>
                    <button className={`sc-btn ${activeView==='charts'?'active':''}`} onClick={()=>setActiveView('charts')}>Charts</button>
                    <button className={`sc-btn ${activeView==='history'?'active':''}`} onClick={()=>setActiveView('history')}>History</button>
                    <button className={`sc-btn ${activeView==='people'?'active':''}`} onClick={()=>setActiveView('people')}>People</button>
                    <button className={`sc-btn ${activeView==='places'?'active':''}`} onClick={()=>setActiveView('places')}>Places</button>
                </div>
                {activeView && (
                    <div style={{fontSize:16, fontWeight:800, fontFamily:'Fredoka', marginBottom:16, color:'var(--primary)'}}>
                        {activeView === 'overview' && '📊 Overview'}
                        {activeView === 'charts' && '📈 Charts & Analytics'}
                        {activeView === 'history' && '📜 Activity History'}
                        {activeView === 'people' && '👥 My People'}
                        {activeView === 'places' && '📍 My Places'}
                    </div>
                )}
            </div>

            <div className="fade-in">

                {activeView === 'overview' && (
                        <div className="fade-in">
                            <div style={{display:'flex', gap:12, marginBottom:20, flexWrap:'wrap'}}>
                                <QuickStat label="Level" value={levelInfo.level} color="#FF9F43" subtitle={`${Math.round(levelInfo.progress)}% to next`} />
                                <QuickStat label="Streak" value={`${streak}🔥`} color="#FF6B6B" subtitle="days in a row" />
                                <QuickStat label="Total Hours" value={totalHrs} color="#54A0FF" subtitle={`${totalMin} minutes`} />
                                <QuickStat label="Entries" value={safeHistory.length} color="#1DD1A1" subtitle={`${completionRate}% completion`} />
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

                            {/* Category Breakdown */}
                            {categoryStats.length > 0 && (
                                <div style={{background:'var(--card)', padding:20, borderRadius:16, border:'1px solid var(--border)', marginBottom:20}}>
                                    <div style={{fontFamily:'Fredoka', fontSize:16, fontWeight:800, marginBottom:16}}>Category Breakdown</div>
                                    <div style={{display:'grid', gap:10}}>
                                        {categoryStats.slice(0, 5).map((cat, idx) => {
                                            const pct = totalMin > 0 ? ((cat.minutes / totalMin) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={idx} style={{marginBottom:8}}>
                                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12, fontWeight:700}}>
                                                        <span>{cat.name}</span>
                                                        <span>{cat.hours}h ({pct}%)</span>
                                                    </div>
                                                    <div style={{height:8, width:'100%', background:'var(--bg)', borderRadius:4, overflow:'hidden'}}>
                                                        <div style={{height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, hsl(${idx * 60}, 70%, 50%), hsl(${idx * 60 + 30}, 70%, 50%))`, transition:'width 0.5s ease'}} />
                                                    </div>
                                                    <div style={{fontSize:10, color:'var(--text-light)', marginTop:4}}>{cat.count} entries</div>
                                                </div>
                                            );
                                        })}
                            </div>
                        </div>
                    )}

                            {/* Productivity Insights */}
                            <div style={{background:'var(--card)', padding:20, borderRadius:16, border:'1px solid var(--border)', marginBottom:20}}>
                                <div style={{fontFamily:'Fredoka', fontSize:16, fontWeight:800, marginBottom:16}}>Productivity Insights</div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                                    <div style={{background:'var(--bg)', padding:12, borderRadius:12, border:'1px solid var(--border)'}}>
                                        <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Avg Session</div>
                                        <div style={{fontSize:20, fontWeight:800, color:'var(--primary)'}}>{avgSessionDuration}m</div>
                                    </div>
                                    <div style={{background:'var(--bg)', padding:12, borderRadius:12, border:'1px solid var(--border)'}}>
                                        <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Completion Rate</div>
                                        <div style={{fontSize:20, fontWeight:800, color:'var(--success)'}}>{completionRate}%</div>
                                    </div>
                                    {timeInsights.mostProductive && (
                                        <div style={{background:'var(--bg)', padding:12, borderRadius:12, border:'1px solid var(--border)', gridColumn:'span 2'}}>
                                            <div style={{fontSize:11, fontWeight:700, opacity:0.7, marginBottom:6, textTransform:'uppercase'}}>Most Productive Hour</div>
                                            <div style={{fontSize:18, fontWeight:800, color:'var(--primary)'}}>
                                                {timeInsights.mostProductive.hour}:00 ({Math.round(timeInsights.mostProductive.minutes)}m tracked)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Weekly Trend */}
                            {weeklyTrend.length > 0 && (
                                <div style={{background:'var(--card)', padding:20, borderRadius:16, border:'1px solid var(--border)'}}>
                                    <div style={{fontFamily:'Fredoka', fontSize:16, fontWeight:800, marginBottom:16}}>Last 7 Days</div>
                                    <div style={{display:'flex', alignItems:'flex-end', gap:6, height:120, padding:'10px 0'}}>
                                        {weeklyTrend.map((day, idx) => {
                                            const maxMinutes = Math.max(...weeklyTrend.map(d => d.minutes), 1);
                                            const height = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;
                                            return (
                                                <div key={idx} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                                                    <div style={{width:'100%', background:'var(--primary)', opacity:0.8, borderRadius:'4px 4px 0 0', height:`${height}%`, minHeight:4, transition:'height 0.3s', position:'relative'}}>
                                                        {day.minutes > 0 && (
                                                            <div style={{position:'absolute', top:-20, left:'50%', transform:'translateX(-50%)', fontSize:9, fontWeight:700, whiteSpace:'nowrap'}}>
                                                                {Math.round(day.minutes)}m
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{fontSize:9, opacity:0.6, textAlign:'center'}}>
                                                        {day.date.toLocaleDateString(undefined, {weekday:'short'})}
                                                    </div>
                                                    <div style={{fontSize:8, opacity:0.5}}>{day.count}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                {activeView === 'charts' && (
                        <div className="fade-in">
                            {/* Improved Navigation Header */}
                            <div style={{background:'var(--card)', padding:16, borderRadius:16, border:'1px solid var(--border)', marginBottom:20}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:10}}>
                                    <div style={{fontFamily:'Fredoka', fontSize:18, fontWeight:800}}>📈 Activity Charts</div>
                                    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                                        <select className="f-select" style={{width:'auto', minWidth:120}} value={timeRange} onChange={e=>setTimeRange(Number(e.target.value))}>
                                    <option value={7}>Last 7 Days</option>
                                    <option value={14}>Last 14 Days</option>
                                    <option value={30}>Last 30 Days</option>
                                </select>
                                        <select className="f-select" style={{width:'auto', minWidth:100}} value={unit} onChange={e=>setUnit(e.target.value)}>
                                            <option value="minutes">Minutes</option>
                                            <option value="hours">Hours</option>
                                        </select>
                            </div>
                                </div>
                                
                                {/* Chart Type Selector */}
                                <div style={{display:'flex', gap:4, background:'var(--bg)', padding:4, borderRadius:10, border:'1px solid var(--border)', marginBottom:12}}>
                                    {['bar', 'line', 'area', 'pie', 'heatmap'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setChartType(type)}
                                            style={{
                                                padding:'6px 12px',
                                                fontSize:11,
                                                fontWeight:700,
                                                textTransform:'capitalize',
                                                border:'none',
                                                background: chartType === type ? 'var(--primary)' : 'transparent',
                                                color: chartType === type ? 'white' : 'var(--text-light)',
                                                borderRadius:6,
                                                cursor:'pointer',
                                                transition:'all 0.2s'
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {/* Filters */}
                                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10}}>
                                    <div>
                                        <label className="f-label" style={{fontSize:10, marginBottom:4}}>Category</label>
                                        <select className="f-select" value={chartCategoryFilter} onChange={e=>setChartCategoryFilter(e.target.value)}>
                                            <option value="All">All Categories</option>
                                            {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="f-label" style={{fontSize:10, marginBottom:4}}>Location</label>
                                        <select className="f-select" value={chartLocationFilter} onChange={e=>setChartLocationFilter(e.target.value)}>
                                            <option value="All">All Locations</option>
                                            {getLocationChartData.map(loc => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="f-label" style={{fontSize:10, marginBottom:4}}>Type</label>
                                        <select className="f-select" value={chartTypeFilter} onChange={e=>setChartTypeFilter(e.target.value)}>
                                            <option value="All">All Types</option>
                                            {typeStats.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bar Chart */}
                            {chartType === 'bar' && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:18}}>
                                    <div style={{fontSize:13, fontWeight:700, marginBottom:12, opacity:0.8}}>Daily Activity (Bar Chart)</div>
                                    <div style={{height:200, display:'flex', alignItems:'flex-end', gap:6, padding:'10px 0'}}>
                                {chartData.map((d, i) => (
                                            <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, position:'relative'}}>
                                                <div style={{ width:'100%', background: 'linear-gradient(180deg, var(--primary), #ff9f43)', borderRadius: '4px 4px 0 0', height: `${Math.max(4, (d.value / maxChartVal) * 100)}%`, minHeight: 4, transition: 'height 0.3s', boxShadow:'0 2px 8px rgba(255,107,53,0.3)' }} />
                                                <div style={{fontSize:9, opacity:0.6, textAlign:'center'}}>{d.date}</div>
                                                {d.value > 0 && (
                                                    <div style={{position:'absolute', top:-18, fontSize:8, fontWeight:700, opacity:0.8}}>
                                                        {unit === 'hours' ? d.value.toFixed(1) + 'h' : Math.round(d.value) + 'm'}
                                                    </div>
                                                )}
                                    </div>
                                ))}
                            </div>
                                </div>
                            )}

                            {/* Line Chart */}
                            {chartType === 'line' && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:18}}>
                                    <div style={{fontSize:13, fontWeight:700, marginBottom:12, opacity:0.8}}>Daily Activity (Line Chart)</div>
                                    <div style={{height:200, position:'relative', padding:'20px 0'}}>
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
                                                const x1 = ((i - 1) / (chartData.length - 1)) * 100;
                                                const y1 = 100 - ((prev.value / maxChartVal) * 100);
                                                const x2 = (i / (chartData.length - 1)) * 100;
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
                                                const x = (i / (chartData.length - 1)) * 100;
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
                                </div>
                            )}

                            {/* Area Chart */}
                            {chartType === 'area' && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:18}}>
                                    <div style={{fontSize:13, fontWeight:700, marginBottom:12, opacity:0.8}}>Daily Activity (Area Chart)</div>
                                    <div style={{height:200, position:'relative', padding:'20px 0'}}>
                                        <svg width="100%" height="100%" style={{position:'absolute', top:0, left:0}}>
                                            <defs>
                                                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d={`M 0,100 ${chartData.map((d, i) => {
                                                    const x = (i / (chartData.length - 1)) * 100;
                                                    const y = 100 - ((d.value / maxChartVal) * 100);
                                                    return `L ${x},${y}`;
                                                }).join(' ')} L 100,100 Z`}
                                                fill="url(#areaGradient)"
                                            />
                                            {chartData.length > 1 && chartData.map((d, i) => {
                                                if (i === 0) return null;
                                                const prev = chartData[i - 1];
                                                const x1 = ((i - 1) / (chartData.length - 1)) * 100;
                                                const y1 = 100 - ((prev.value / maxChartVal) * 100);
                                                const x2 = (i / (chartData.length - 1)) * 100;
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
                                                const x = (i / (chartData.length - 1)) * 100;
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
                                        </svg>
                                        <div style={{display:'flex', justifyContent:'space-between', marginTop:'auto', fontSize:9, opacity:0.6}}>
                                            {chartData.map((d, i) => (
                                                <div key={i} style={{flex:1, textAlign:'center'}}>{d.date}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pie Chart for Categories */}
                            {chartType === 'pie' && categoryStats.length > 0 && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:18}}>
                                    <div style={{fontSize:13, fontWeight:700, marginBottom:12, opacity:0.8}}>Category Distribution (Pie Chart)</div>
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:250, gap:30, flexWrap:'wrap'}}>
                                        <div style={{position:'relative', width:200, height:200}}>
                                            <svg width="200" height="200" viewBox="0 0 200 200" style={{transform:'rotate(-90deg)'}}>
                                                {(() => {
                                                    let currentAngle = 0;
                                                    return categoryStats.slice(0, 8).map((cat, idx) => {
                                                        const pct = totalMin > 0 ? (cat.minutes / totalMin) : 0;
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
                                            {categoryStats.slice(0, 8).map((cat, idx) => {
                                                const pct = totalMin > 0 ? ((cat.minutes / totalMin) * 100).toFixed(1) : 0;
                                                const hue = (idx * 60) % 360;
                                                return (
                                                    <div key={idx} style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                                                        <div style={{width:16, height:16, borderRadius:4, background:`hsl(${hue}, 70%, 50%)`}} />
                                                        <div style={{flex:1, fontSize:12, fontWeight:700}}>{cat.name}</div>
                                                        <div style={{fontSize:11, fontWeight:800, color:'var(--text-light)'}}>{pct}%</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Heatmap Chart */}
                            {chartType === 'heatmap' && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:18}}>
                                    <div style={{fontSize:13, fontWeight:700, marginBottom:12, opacity:0.8}}>Activity Heatmap (Last 30 Days)</div>
                                    <div style={{display:'flex', flexDirection:'column', gap:4}}>
                                        {(() => {
                                            const heatmapData = {};
                                            const now = new Date();
                                            for (let i = 0; i < 30; i++) {
                                                const d = new Date(now);
                                                d.setDate(now.getDate() - i);
                                                const key = d.toDateString();
                                                heatmapData[key] = { date: d, count: 0, minutes: 0 };
                                            }
                                            safeHistory.forEach(h => {
                                                const date = safeDate(h.createdAt || h.completedAt);
                                                const key = date.toDateString();
                                                if (heatmapData[key]) {
                                                    heatmapData[key].count += 1;
                                                    heatmapData[key].minutes += (Number(h.duration) || 0);
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
                                                        const hue = 120 - (intensity * 120); // Green to red
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

                            {/* Peak Hours Chart */}
                            <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:12}}>
                                <div 
                                    style={{
                                        fontFamily:'Fredoka', 
                                        fontSize:14, 
                                        fontWeight:800, 
                                        marginBottom:collapsedSections['peakHours'] ? 0 : 12,
                                        cursor:'pointer',
                                        display:'flex',
                                        alignItems:'center',
                                        justifyContent:'space-between',
                                        padding:'4px 0'
                                    }}
                                    onClick={() => toggleSection('peakHours')}
                                >
                                    <span>Peak Hours</span>
                                    <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['peakHours'] ? '▼' : '▲'}</span>
                                </div>
                                {!collapsedSections['peakHours'] && (
                                <div style={{height:180, position:'relative', padding:'15px 8px 8px 35px'}}>
                                    <div style={{position:'absolute', left:8, top:20, bottom:30, fontSize:10, color:'var(--text-light)', writingMode:'vertical-rl', textOrientation:'mixed'}}>
                                        Minutes
                                    </div>
                                    <svg width="100%" height="100%" style={{position:'absolute', top:0, left:0}}>
                                        {/* Grid lines */}
                                        {(() => {
                                            const maxMinutes = Math.max(...peakHoursData.map(d => d.minutes), 1);
                                            const steps = 5;
                                            return Array.from({ length: steps + 1 }, (_, i) => {
                                                const val = i / steps;
                                                const yPos = (1 - val) * 100;
                                                const label = (maxMinutes * val).toFixed(1);
                                                return (
                                                    <g key={i}>
                                                        <line
                                                            x1="8%"
                                                            y1={`${yPos}%`}
                                                            x2="95%"
                                                            y2={`${yPos}%`}
                                                            stroke="var(--border)"
                                                            strokeWidth="1"
                                                            strokeDasharray="2,2"
                                                            opacity="0.3"
                                                        />
                                                        <text
                                                            x="6%"
                                                            y={`${yPos}%`}
                                                            fill="var(--text-light)"
                                                            fontSize="9"
                                                            textAnchor="end"
                                                            alignmentBaseline="middle"
                                                        >
                                                            {label}
                                                        </text>
                                                    </g>
                                                );
                                            });
                                        })()}
                                        {/* Line chart */}
                                        {peakHoursData.length > 1 && (() => {
                                            const maxMinutes = Math.max(...peakHoursData.map(d => d.minutes), 1);
                                            return peakHoursData.map((d, i) => {
                                                if (i === 0) return null;
                                                const prev = peakHoursData[i - 1];
                                                const x1 = 8 + ((i - 1) / 23) * 87;
                                                const y1 = 85 - ((prev.minutes / maxMinutes) * 75);
                                                const x2 = 8 + (i / 23) * 87;
                                                const y2 = 85 - ((d.minutes / maxMinutes) * 75);
                                                return (
                                                    <line
                                                        key={i}
                                                        x1={`${x1}%`}
                                                        y1={`${y1}%`}
                                                        x2={`${x2}%`}
                                                        y2={`${y2}%`}
                                                        stroke="#a29bfe"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            });
                                        })()}
                                        {/* Data points */}
                                        {peakHoursData.map((d, i) => {
                                            const maxMinutes = Math.max(...peakHoursData.map(d => d.minutes), 1);
                                            const x = 8 + (i / 23) * 87;
                                            const y = 85 - ((d.minutes / maxMinutes) * 75);
                                            return (
                                                <circle
                                                    key={i}
                                                    cx={`${x}%`}
                                                    cy={`${y}%`}
                                                    r="4"
                                                    fill="#a29bfe"
                                                    stroke="var(--card)"
                                                    strokeWidth="2"
                                                />
                                            );
                                        })}
                                        {/* X-axis labels (every 3 hours: 0, 3, 6, 9, 12, 15, 18, 21) */}
                                        {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
                                            const x = 8 + (hour / 23) * 87;
                                            return (
                                                <text
                                                    key={hour}
                                                    x={`${x}%`}
                                                    y="98%"
                                                    fill="var(--text-light)"
                                                    fontSize="10"
                                                    textAnchor="middle"
                                                >
                                                    {hour}
                                                </text>
                                            );
                                        })}
                                    </svg>
                                </div>
                                )}
                            </div>

                            {/* Priorities Done (Radar Chart) - Enhanced */}
                            {prioritiesDoneData.length > 0 && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:12, boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                                    <div 
                                        style={{
                                            fontFamily:'Fredoka', 
                                            fontSize:14, 
                                            fontWeight:800, 
                                            marginBottom:collapsedSections['priorities'] ? 0 : 12,
                                            textAlign:'center',
                                            cursor:'pointer',
                                            display:'flex',
                                            alignItems:'center',
                                            justifyContent:'center',
                                            gap:8,
                                            padding:'4px 0'
                                        }}
                                        onClick={() => toggleSection('priorities')}
                                    >
                                        <span>Priorities Done</span>
                                        <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['priorities'] ? '▼' : '▲'}</span>
                                    </div>
                                    {!collapsedSections['priorities'] && (
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:40, flexWrap:'wrap'}}>
                                        <div style={{position:'relative', width:280, height:280}}>
                                            <svg width="280" height="280" viewBox="0 0 280 280" style={{position:'relative', filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'}}>
                                                <defs>
                                                    <radialGradient id="radarGradient">
                                                        <stop offset="0%" stopColor="rgba(162, 155, 254, 0.4)" />
                                                        <stop offset="100%" stopColor="rgba(162, 155, 254, 0.1)" />
                                                    </radialGradient>
                                                </defs>
                                                {/* Background circle */}
                                                <circle
                                                    cx="140"
                                                    cy="140"
                                                    r="120"
                                                    fill="rgba(162, 155, 254, 0.05)"
                                                    stroke="var(--border)"
                                                    strokeWidth="1"
                                                    opacity="0.5"
                                                />
                                                {/* Concentric circles (more rings for better visualization) */}
                                                {[1, 2, 3, 4, 5].map(ring => (
                                                    <circle
                                                        key={ring}
                                                        cx="140"
                                                        cy="140"
                                                        r={ring * 24}
                                                        fill="none"
                                                        stroke="var(--border)"
                                                        strokeWidth={ring === 5 ? "2" : "1"}
                                                        opacity={ring === 5 ? "0.5" : "0.2"}
                                                    />
                                                ))}
                                                {/* Radar lines (4 quadrants for 4 priorities) */}
                                                {prioritiesDoneData.map((p, idx) => {
                                                    const angle = (idx * 90 - 90) * (Math.PI / 180);
                                                    const x = 140 + 120 * Math.cos(angle);
                                                    const y = 140 + 120 * Math.sin(angle);
                                                    return (
                                                        <g key={idx}>
                                                            <line
                                                                x1="140"
                                                                y1="140"
                                                                x2={x}
                                                                y2={y}
                                                                stroke="var(--border)"
                                                                strokeWidth="1.5"
                                                                opacity="0.4"
                                                            />
                                                            {/* Priority labels on axes */}
                                                            <text
                                                                x={x * 1.15}
                                                                y={y * 1.15}
                                                                fill="var(--text-light)"
                                                                fontSize="12"
                                                                fontWeight="700"
                                                                textAnchor="middle"
                                                                alignmentBaseline="middle"
                                                            >
                                                                {p.name}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                                {/* Data points and filled area */}
                                                {(() => {
                                                    const maxCount = Math.max(...prioritiesDoneData.map(p => p.count), 1);
                                                    const points = prioritiesDoneData.map((p, idx) => {
                                                        const angle = (idx * 90 - 90) * (Math.PI / 180);
                                                        const radius = (p.count / maxCount) * 120;
                                                        const x = 140 + radius * Math.cos(angle);
                                                        const y = 140 + radius * Math.sin(angle);
                                                        return { x, y, priority: p.name, count: p.count, minutes: p.minutes };
                                                    });
                                                    
                                                    const colors = {
                                                        'Urgent': '#ff6b6b',
                                                        'High': '#ff9f43',
                                                        'Medium': '#4a90e2',
                                                        'Low': '#1dd1a1'
                                                    };
                                                    
                                                    return (
                                                        <>
                                                            {/* Filled polygon with gradient */}
                                                            <path
                                                                d={`M 140,140 ${points.map(p => `L ${p.x},${p.y}`).join(' ')} Z`}
                                                                fill="url(#radarGradient)"
                                                                stroke="#a29bfe"
                                                                strokeWidth="3"
                                                                opacity="0.6"
                                                            />
                                                            {/* Individual colored segments */}
                                                            {points.map((point, idx) => {
                                                                const nextPoint = points[(idx + 1) % points.length];
                                                                const angle = (idx * 90 - 90) * (Math.PI / 180);
                                                                const nextAngle = ((idx + 1) * 90 - 90) * (Math.PI / 180);
                                                                return (
                                                                    <path
                                                                        key={`segment-${idx}`}
                                                                        d={`M 140,140 L ${point.x},${point.y} A ${point.x - 140},${point.y - 140} 0 0,1 ${nextPoint.x},${nextPoint.y} Z`}
                                                                        fill={colors[point.priority] || '#a29bfe'}
                                                                        opacity="0.3"
                                                                    />
                                                                );
                                                            })}
                                                            {/* Data points with glow effect */}
                                                            {points.map((point, idx) => (
                                                                <g key={idx}>
                                                                    {/* Glow circle */}
                                                                    <circle
                                                                        cx={point.x}
                                                                        cy={point.y}
                                                                        r="10"
                                                                        fill={colors[point.priority] || '#a29bfe'}
                                                                        opacity="0.3"
                                                                        filter="blur(4px)"
                                                                    />
                                                                    {/* Main circle */}
                                                                    <circle
                                                                        cx={point.x}
                                                                        cy={point.y}
                                                                        r="8"
                                                                        fill={colors[point.priority] || '#a29bfe'}
                                                                        stroke="var(--card)"
                                                                        strokeWidth="3"
                                                                    />
                                                                    {/* Inner highlight */}
                                                                    <circle
                                                                        cx={point.x}
                                                                        cy={point.y}
                                                                        r="4"
                                                                        fill="white"
                                                                        opacity="0.6"
                                                                    />
                                                                    {/* Count label */}
                                                                    <text
                                                                        x={point.x}
                                                                        y={point.y + 4}
                                                                        fill="white"
                                                                        fontSize="11"
                                                                        fontWeight="900"
                                                                        textAnchor="middle"
                                                                        alignmentBaseline="middle"
                                                                        stroke="var(--card)"
                                                                        strokeWidth="0.5"
                                                                    >
                                                                        {point.count}
                                                                    </text>
                                                                </g>
                                                            ))}
                                                        </>
                                                    );
                                                })()}
                                            </svg>
                                        </div>
                                        <div style={{flex:1, minWidth:180}}>
                                            {prioritiesDoneData.map((p, idx) => {
                                                const colors = {
                                                    'Urgent': '#ff6b6b',
                                                    'High': '#ff9f43',
                                                    'Medium': '#4a90e2',
                                                    'Low': '#1dd1a1'
                                                };
                                                const maxCount = Math.max(...prioritiesDoneData.map(p => p.count), 1);
                                                const percentage = ((p.count / maxCount) * 100).toFixed(0);
                                                return (
                                                    <div key={idx} style={{
                                                        display:'flex', 
                                                        alignItems:'center', 
                                                        gap:12, 
                                                        marginBottom:16,
                                                        padding:12,
                                                        background:'var(--bg)',
                                                        borderRadius:12,
                                                        border:'1px solid var(--border)',
                                                        transition:'transform 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform='translateX(4px)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform='translateX(0)'}
                                                    >
                                                        <div style={{
                                                            width:20, 
                                                            height:20, 
                                                            borderRadius:6, 
                                                            background:colors[p.name] || '#a29bfe',
                                                            boxShadow:`0 2px 8px ${colors[p.name]}40`
                                                        }} />
                                                        <div style={{flex:1}}>
                                                            <div style={{fontSize:14, fontWeight:800, marginBottom:2}}>{p.name}</div>
                                                            <div style={{fontSize:11, color:'var(--text-light)'}}>
                                                                {p.minutes > 0 ? `${Math.round(p.minutes / 60)}h tracked` : 'No time tracked'}
                                                            </div>
                                                        </div>
                                                        <div style={{textAlign:'right'}}>
                                                            <div style={{fontSize:18, fontWeight:900, color:colors[p.name] || '#a29bfe'}}>{p.count}</div>
                                                            <div style={{fontSize:10, color:'var(--text-light)'}}>{percentage}%</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    )}
                                </div>
                            )}

                            {/* Time Distribution */}
                            {timeDistributionData.length > 0 && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:12}}>
                                    <div 
                                        style={{
                                            fontFamily:'Fredoka', 
                                            fontSize:14, 
                                            fontWeight:800, 
                                            marginBottom:collapsedSections['timeDistribution'] ? 0 : 12,
                                            cursor:'pointer',
                                            display:'flex',
                                            alignItems:'center',
                                            justifyContent:'space-between',
                                            padding:'4px 0'
                                        }}
                                        onClick={() => toggleSection('timeDistribution')}
                                    >
                                        <span>Time Distribution</span>
                                        <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['timeDistribution'] ? '▼' : '▲'}</span>
                                    </div>
                                    {!collapsedSections['timeDistribution'] && (
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:250, gap:30, flexWrap:'wrap'}}>
                                        <div style={{position:'relative', width:200, height:200}}>
                                            <svg width="200" height="200" viewBox="0 0 200 200" style={{transform:'rotate(-90deg)'}}>
                                                {(() => {
                                                    let currentAngle = 0;
                                                    const total = timeDistributionData.reduce((acc, d) => acc + d.minutes, 0);
                                                    return timeDistributionData.map((item, idx) => {
                                                        const pct = total > 0 ? (item.minutes / total) : 0;
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
                                            {timeDistributionData.map((item, idx) => {
                                                const total = timeDistributionData.reduce((acc, d) => acc + d.minutes, 0);
                                                const pct = total > 0 ? ((item.minutes / total) * 100).toFixed(1) : 0;
                                                const hue = (idx * 60) % 360;
                                                return (
                                                    <div key={idx} style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
                                                        <div style={{width:16, height:16, borderRadius:4, background:`hsl(${hue}, 70%, 50%)`}} />
                                                        <div style={{flex:1, fontSize:13, fontWeight:700}}>{item.name}</div>
                                                        <div style={{fontSize:12, fontWeight:800, color:'var(--text-light)'}}>{pct}%</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    )}
                                </div>
                            )}

                            {/* Category Distribution */}
                            {categoryStats.length > 0 && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:12}}>
                                    <div 
                                        style={{
                                            fontFamily:'Fredoka', 
                                            fontSize:14, 
                                            fontWeight:800, 
                                            marginBottom:collapsedSections['categoryDistribution'] ? 0 : 12,
                                            cursor:'pointer',
                                            display:'flex',
                                            alignItems:'center',
                                            justifyContent:'space-between',
                                            padding:'4px 0'
                                        }}
                                        onClick={() => toggleSection('categoryDistribution')}
                                    >
                                        <span>Category Distribution</span>
                                        <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['categoryDistribution'] ? '▼' : '▲'}</span>
                                    </div>
                                    {!collapsedSections['categoryDistribution'] && (
                                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12}}>
                                        {categoryStats.slice(0, 6).map((cat, idx) => {
                                            const pct = totalMin > 0 ? ((cat.minutes / totalMin) * 100) : 0;
                                            const hue = (idx * 60) % 360;
                                            return (
                                                <div key={idx} style={{background:'var(--bg)', padding:12, borderRadius:12, border:'1px solid var(--border)', textAlign:'center'}}>
                                                    <div style={{fontSize:24, fontWeight:800, color:`hsl(${hue}, 70%, 50%)`, marginBottom:4}}>
                                                        {pct.toFixed(0)}%
                                                    </div>
                                                    <div style={{fontSize:12, fontWeight:700, marginBottom:4}}>{cat.name}</div>
                                                    <div style={{fontSize:10, color:'var(--text-light)'}}>{cat.hours}h • {cat.count} entries</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    )}
                                </div>
                            )}

                            {/* Activity Types */}
                            {typeStats.length > 0 && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:12}}>
                                    <div 
                                        style={{
                                            fontFamily:'Fredoka', 
                                            fontSize:14, 
                                            fontWeight:800, 
                                            marginBottom:collapsedSections['activityTypes'] ? 0 : 12,
                                            cursor:'pointer',
                                            display:'flex',
                                            alignItems:'center',
                                            justifyContent:'space-between',
                                            padding:'4px 0'
                                        }}
                                        onClick={() => toggleSection('activityTypes')}
                                    >
                                        <span>Activity Types</span>
                                        <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['activityTypes'] ? '▼' : '▲'}</span>
                                    </div>
                                    {!collapsedSections['activityTypes'] && (
                                    <div style={{display:'grid', gap:10}}>
                                        {typeStats.map((type, idx) => {
                                            const totalCount = typeStats.reduce((acc, t) => acc + t.count, 0);
                                            const pct = totalCount > 0 ? ((type.count / totalCount) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={idx} style={{display:'flex', alignItems:'center', gap:12}}>
                                                    <div style={{minWidth:80, fontSize:12, fontWeight:700, textTransform:'capitalize'}}>
                                                        {type.name}
                                                    </div>
                                                    <div style={{flex:1, height:24, background:'var(--bg)', borderRadius:12, overflow:'hidden', position:'relative'}}>
                                                        <div style={{height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, hsl(${idx * 45}, 70%, 50%), hsl(${idx * 45 + 20}, 70%, 50%))`, transition:'width 0.5s ease', display:'flex', alignItems:'center', paddingLeft:8}}>
                                                            <span style={{fontSize:10, fontWeight:800, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.3)'}}>
                                                                {type.count} ({pct}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {type.minutes > 0 && (
                                                        <div style={{minWidth:50, fontSize:11, fontWeight:700, color:'var(--text-light)', textAlign:'right'}}>
                                                            {Math.round(type.minutes / 60)}h
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    )}
                                </div>
                            )}

                            {/* Location Activity Chart */}
                            {getLocationChartData.length > 0 && (
                                <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:12}}>
                                    <div 
                                        style={{
                                            fontFamily:'Fredoka', 
                                            fontSize:14, 
                                            fontWeight:800, 
                                            marginBottom:collapsedSections['locationActivity'] ? 0 : 12,
                                            cursor:'pointer',
                                            display:'flex',
                                            alignItems:'center',
                                            justifyContent:'space-between',
                                            padding:'4px 0'
                                        }}
                                        onClick={() => toggleSection('locationActivity')}
                                    >
                                        <span>📍 Location Activity</span>
                                        <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['locationActivity'] ? '▼' : '▲'}</span>
                                    </div>
                                    {!collapsedSections['locationActivity'] && (
                                        <div style={{display:'grid', gap:8}}>
                                            {getLocationChartData.slice(0, 10).map((loc, idx) => {
                                                const maxMinutes = getLocationChartData[0]?.minutes || 1;
                                                const width = (loc.minutes / maxMinutes) * 100;
                                                return (
                                                    <div key={idx} style={{display:'flex', alignItems:'center', gap:10}}>
                                                        <div style={{minWidth:140, fontSize:13, fontWeight:700}}>📍 {loc.name}</div>
                                                        <div style={{flex:1, height:28, background:'var(--bg)', borderRadius:14, overflow:'hidden', position:'relative'}}>
                                                            <div style={{height:'100%', width:`${width}%`, background:'linear-gradient(90deg, #4a90e2, #1dd1a1)', transition:'width 0.5s ease', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:10}}>
                                                                <span style={{fontSize:11, fontWeight:800, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.3)'}}>
                                                                    {Math.round(loc.minutes / 60)}h ({loc.count})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* People Mentions */}
                            <div style={{background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:collapsedSections['peopleMentions'] ? 0 : 12}}>
                                    <div 
                                        style={{
                                            fontFamily:'Fredoka', 
                                            fontSize:14, 
                                            fontWeight:800,
                                            cursor:'pointer',
                                            display:'flex',
                                            alignItems:'center',
                                            gap:8,
                                            flex:1
                                        }}
                                        onClick={() => toggleSection('peopleMentions')}
                                    >
                                        <span>People Mentions</span>
                                        <span style={{fontSize:12, opacity:0.6}}>{collapsedSections['peopleMentions'] ? '▼' : '▲'}</span>
                                    </div>
                                    {!collapsedSections['peopleMentions'] && (
                                        <input className="f-input" style={{width:160, margin:0, padding:'8px 12px', fontSize:12}} placeholder="Search..." value={peopleSearch} onChange={e=>setPeopleSearch(e.target.value)} />
                                    )}
                                </div>
                                {!collapsedSections['peopleMentions'] && (
                                    <>
                                        {peopleData.length === 0 ? (
                                            <div style={{opacity:0.6, fontSize:12, padding:20, textAlign:'center'}}>No people activity yet.</div>
                                        ) : (
                                            <div style={{display:'grid', gap:8}}>
                                                {peopleData.slice(0, 10).map((p, idx) => {
                                                    const maxCount = peopleData[0]?.count || 1;
                                                    const width = (p.count / maxCount) * 100;
                                                    return (
                                                        <div key={idx} style={{display:'flex', alignItems:'center', gap:10}}>
                                                            <div style={{minWidth:120, fontSize:13, fontWeight:700}}>{p.name}</div>
                                                            <div style={{flex:1, height:28, background:'var(--bg)', borderRadius:14, overflow:'hidden', position:'relative'}}>
                                                                <div style={{height:'100%', width:`${width}%`, background:'linear-gradient(90deg, var(--primary), #ff9f43)', transition:'width 0.5s ease', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:10}}>
                                                                    <span style={{fontSize:11, fontWeight:800, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.3)'}}>
                                                                        {p.count}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                {activeView === 'history' && (
                        <div className="fade-in">
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                                <h4 style={{ fontFamily:'Fredoka', fontSize:18, margin:0, fontWeight:800 }}>Activity History</h4>
                                {/* ✅ FIXED: Export actions export directly (no async state race) */}
                                <div style={{ display:'flex', gap:12, alignItems:'center', fontSize:12 }}>
                                    <button
                                        className="btn-white-outline"
                                        style={{ padding:'6px 12px', fontSize:11, height:'auto' }}
                                        onClick={() => exportJournalNow('daily')}
                                        title="Download journal style report"
                                    >
                                        📄 Journal
                                    </button>
                                    <button
                                        className="btn-white-outline"
                                        style={{ padding:'6px 12px', fontSize:11, height:'auto' }}
                                        onClick={() => exportCSVNow()}
                                        title="Download raw CSV"
                                    >
                                        📊 CSV
                                    </button>
                                </div>
                            </div>

                            {/* Super History Toggle */}
                            <div style={{background:'var(--card)', padding:12, borderRadius:12, border:'1px solid var(--border)', marginBottom:12}}>
                                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:700}}>
                                    <input
                                        type="checkbox"
                                        checked={superHistory}
                                        onChange={(e) => setSuperHistory(e.target.checked)}
                                        style={{width:18, height:18, cursor:'pointer'}}
                                    />
                                    <span>🔍 Super History Mode</span>
                                    <span style={{fontSize:10, opacity:0.6, fontWeight:400, marginLeft:'auto'}}>
                                        Show all loggable events with advanced filters
                                    </span>
                                </label>
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:superHistory ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap:10, marginBottom:12 }}>
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
                                {!superHistory ? (
                                    <>
                                <div>
                                    <label className="f-label">Type</label>
                                    <select className="f-select" value={historyType} onChange={e => setHistoryType(e.target.value)}>
                                        <option value="All">All</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Sessions">Sessions</option>
                                        <option value="spin">Spin</option>
                                        <option value="focus">Focus</option>
                                                 <option value="timer">Timer</option>
                                                 <option value="respin">Respin</option>
                                                 <option value="complete">Complete</option>
                                                 <option value="task_created">Task Created</option>
                                                 <option value="task_edited">Task Edited</option>
                                                 <option value="contact_created">Contact Created</option>
                                                 <option value="contact_edited">Contact Edited</option>
                                                 <option value="location_created">Location Created</option>
                                                 <option value="location_edited">Location Edited</option>
                                                 <option value="log">Log</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="f-label">Category</label>
                                    <select className="f-select" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                                        <option value="All">All Categories</option>
                                        {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="f-label">Category</label>
                                            <select className="f-select" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                                                <option value="All">All Categories</option>
                                                {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="f-label">Location</label>
                                            <select className="f-select" value={historyLocationFilter} onChange={e => setHistoryLocationFilter(e.target.value)}>
                                                <option value="All">All Locations</option>
                                                {getLocationChartData.map(loc => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Super History Type Filters */}
                            {superHistory && (() => {
                                const allTypes = [...new Set(safeHistory.map(h => {
                                    const normalized = normalizeActivity(h);
                                    return normalized.type || 'log';
                                }))].sort();
                                
                                return (
                                    <div style={{background:'var(--card)', padding:12, borderRadius:12, border:'1px solid var(--border)', marginBottom:12}}>
                                        <div style={{fontSize:11, fontWeight:700, marginBottom:8, opacity:0.8}}>Filter by Event Types:</div>
                                        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                                            {allTypes.map(type => {
                                                const isEnabled = superHistoryTypeFilters[type] !== false;
                                                return (
                                                    <label
                                                        key={type}
                                                        style={{
                                                            display:'flex',
                                                            alignItems:'center',
                                                            gap:6,
                                                            padding:'6px 12px',
                                                            background: isEnabled ? 'var(--bg)' : 'rgba(255,255,255,0.05)',
                                                            border:`1px solid ${isEnabled ? 'var(--primary)' : 'var(--border)'}`,
                                                            borderRadius:8,
                                                            cursor:'pointer',
                                                            fontSize:11,
                                                            fontWeight:600,
                                                            opacity: isEnabled ? 1 : 0.5,
                                                            transition:'all 0.2s'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isEnabled}
                                                            onChange={(e) => {
                                                                setSuperHistoryTypeFilters(prev => ({
                                                                    ...prev,
                                                                    [type]: e.target.checked
                                                                }));
                                                            }}
                                                            style={{width:14, height:14, cursor:'pointer'}}
                                                        />
                                                        <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

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
                                    (() => {
                                        // Group by date
                                        const grouped = {};
                                        historyRows.slice(0, 150).forEach((act, i) => {
                                            const when = safeDate(act.createdAt);
                                            const dateKey = when.toDateString();
                                            if (!grouped[dateKey]) {
                                                grouped[dateKey] = { date: when, items: [] };
                                            }
                                            grouped[dateKey].items.push({ ...act, index: i });
                                        });

                                        const today = new Date().toDateString();
                                        const yesterday = new Date();
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        const yesterdayStr = yesterday.toDateString();

                                        const formatDateHeader = (dateStr) => {
                                            if (dateStr === today) return 'Today';
                                            if (dateStr === yesterdayStr) return 'Yesterday';
                                            const date = new Date(dateStr);
                                            const now = new Date();
                                            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                                            if (diffDays < 7) {
                                                return date.toLocaleDateString(undefined, { weekday: 'long' });
                                            }
                                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
                                        };

                                        return Object.entries(grouped)
                                            .sort(([a], [b]) => new Date(b) - new Date(a))
                                            .map(([dateKey, group]) => (
                                                <div key={dateKey}>
                                                    <div style={{ padding:'10px 16px', background:'var(--bg)', borderBottom:'2px solid var(--border)', position:'sticky', top:0, zIndex:10 }}>
                                                        <div style={{ fontSize:12, fontWeight:800, color:'var(--primary)', textTransform:'uppercase', letterSpacing:0.5 }}>
                                                            {formatDateHeader(dateKey)}
                                                        </div>
                                                        <div style={{ fontSize:10, color:'var(--text-light)', marginTop:2 }}>
                                                            {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                                                        </div>
                                                    </div>
                                                    {group.items.map((act) => {
                                        const when = safeDate(act.createdAt);
                                        const who = (Array.isArray(act.people) && act.people.length) ? ` • ${act.people.join(', ')}` : '';
                                        const where = (act.locationLabel || '').trim() ? ` • ${act.locationLabel}` : '';
                                        // Get better type labels and icons
                                        const getTypeDisplay = (type) => {
                                            const typeMap = {
                                                'task_created': { label: 'Task Created', icon: '➕' },
                                                'task_edited': { label: 'Task Edited', icon: '✏️' },
                                                'contact_created': { label: 'Contact Created', icon: '👤' },
                                                'contact_edited': { label: 'Contact Edited', icon: '✏️' },
                                                'location_created': { label: 'Location Created', icon: '📍' },
                                                'location_edited': { label: 'Location Edited', icon: '✏️' },
                                                'spin': { label: 'Spin', icon: '🎰' },
                                                'respin': { label: 'Respin', icon: '🔄' },
                                                'complete': { label: 'Completed', icon: '✅' },
                                                'Completed': { label: 'Completed', icon: '✅' },
                                                'focus': { label: 'Focus', icon: '🎯' },
                                                'timer': { label: 'Timer', icon: '⏱️' },
                                                'log': { label: 'Log', icon: '📝' },
                                            };
                                            const display = typeMap[type];
                                            if (display) return display;
                                            return { 
                                                label: type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace(/_/g, ' ') : '',
                                                icon: '📋'
                                            };
                                        };
                                        const typeDisplay = getTypeDisplay(act.type);
                                        const typeLabel = typeDisplay.label;
                                                        const hasTask = act.raw?.taskId && safeTasks.find(t => t.id === act.raw.taskId);
                                        return (
                                                            <div 
                                                                key={act.index} 
                                                                style={{ 
                                                                    padding:'12px 16px', 
                                                                    borderBottom:'1px solid var(--border)', 
                                                                    display:'flex', 
                                                                    justifyContent:'space-between', 
                                                                    alignItems:'center', 
                                                                    transition:'all 0.2s',
                                                                    cursor:'pointer'
                                                                }}
                                                                onClick={() => {
                                                                    if (hasTask && onViewTask) {
                                                                        onViewTask(hasTask);
                                                                    } else {
                                                                        setSelectedHistoryItem(act);
                                                                    }
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background='var(--bg)';
                                                                    e.currentTarget.style.transform='translateX(4px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background='transparent';
                                                                    e.currentTarget.style.transform='translateX(0)';
                                                                }}
                                                            >
                                                                <div style={{ minWidth:0, flex:1 }}>
                                                                    <div style={{ fontSize:13, fontWeight:650, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                                                                        {act.title}
                                                                        {hasTask && <span style={{fontSize:10, opacity:0.6}}>🔗</span>}
                                                    </div>
                                                                    <div style={{ fontSize:10, color:'var(--text-light)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                                                        <span>{when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                                                                        <span>•</span>
                                                                        <span style={{ padding:'2px 6px', background:'var(--bg)', borderRadius:4, fontSize:9, fontWeight:700 }}>
                                                                            {act.category}
                                                                        </span>
                                                                        {typeLabel && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span style={{ fontSize:9, opacity:0.7, display:'flex', alignItems:'center', gap:4 }}>
                                                                                    <span>{typeDisplay.icon}</span>
                                                                                    <span>{typeLabel}</span>
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {Array.isArray(act.people) && act.people.length > 0 && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                                                                                    {act.people.map((personName, idx) => (
                                                                                        <span
                                                                                            key={idx}
                                                                                            onClick={(e) => handlePersonClick(personName, e)}
                                                                                            style={{
                                                                                                fontSize:9,
                                                                                                color:'var(--primary)',
                                                                                                cursor:'pointer',
                                                                                                textDecoration:'underline',
                                                                                                textDecorationColor:'rgba(255, 107, 53, 0.5)',
                                                                                                transition:'all 0.2s',
                                                                                                padding:'2px 4px',
                                                                                                borderRadius:4,
                                                                                                background:'rgba(255, 107, 53, 0.1)'
                                                                                            }}
                                                                                            onMouseEnter={(e) => {
                                                                                                e.target.style.background='rgba(255, 107, 53, 0.2)';
                                                                                                e.target.style.textDecorationColor='var(--primary)';
                                                                                            }}
                                                                                            onMouseLeave={(e) => {
                                                                                                e.target.style.background='rgba(255, 107, 53, 0.1)';
                                                                                                e.target.style.textDecorationColor='rgba(255, 107, 53, 0.5)';
                                                                                            }}
                                                                                            title={`Click to view ${personName}'s details`}
                                                                                        >
                                                                                            👤 {personName}
                                                                                        </span>
                                                                                    ))}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {where && <span style={{ fontSize:9, opacity:0.7 }}>{where.replace(' • ', '')}</span>}
                                                </div>
                                                                </div>
                                                                {act.valueText && (
                                                                    <div style={{ fontSize:13, fontWeight:850, color:'var(--primary)', marginLeft:12, whiteSpace:'nowrap' }}>
                                                                        {act.valueText}
                                                                    </div>
                                                                )}
                                            </div>
                                        );
                                                    })}
                                                </div>
                                            ));
                                    })()
                                )}
                            </div>
                        </div>
                    )}

                {activeView === 'people' && (
                    <PeopleManager 
                        notify={notify} 
                        history={history} 
                        tasks={tasks} 
                        locations={locations}
                        initialSelectedPersonName={selectedPersonName}
                        onPersonSelected={(name) => setSelectedPersonName(name)}
                        onViewTask={onViewTask}
                    />
                )}

                {activeView === 'places' && (
                    <LocationsManager locations={locations || []} setLocations={setLocations} notify={notify} />
                )}

                {/* Secret Link Bar */}
                    {showSecretLinks && (
                        <div style={{
                            position: 'sticky',
                            top: 20,
                            width: 200,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 12,
                            padding: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                            zIndex: 100,
                            animation: 'fadeIn 0.3s ease-in'
                        }}>
                            <div style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'rgba(255, 255, 255, 0.6)',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                Quick Links
                                <button
                                    onClick={() => setShowSecretLinks(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        padding: 0,
                                        width: 20,
                                        height: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 4,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                        e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'transparent';
                                        e.target.style.color = 'rgba(255, 255, 255, 0.5)';
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                                {/* Insights Mode Subtabs */}
                                <div style={{marginBottom: 4}}>
                                    <div style={{
                                        fontSize: 9,
                                        fontWeight: 600,
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        marginBottom: 6,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5
                                    }}>
                                        Insights
                                    </div>
                                    {[
                                        { key: 'overview', emoji: '📊', label: 'Overview' },
                                        { key: 'charts', emoji: '📈', label: 'Charts' },
                                        { key: 'history', emoji: '📜', label: 'History' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => {
                                                setActiveView(tab.key);
                                                setShowSecretLinks(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                background: activeView === tab.key 
                                                    ? 'rgba(255, 107, 53, 0.3)' 
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                border: activeView === tab.key
                                                    ? '1px solid rgba(255, 107, 53, 0.5)'
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 4,
                                                transition: 'all 0.2s',
                                                textAlign: 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (activeView !== tab.key) {
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (activeView !== tab.key) {
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }
                                            }}
                                        >
                                            <span style={{fontSize: 14}}>{tab.emoji}</span>
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Database Mode Subtabs */}
                                <div>
                                    <div style={{
                                        fontSize: 9,
                                        fontWeight: 600,
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        marginBottom: 6,
                                        marginTop: 8,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5
                                    }}>
                                        Database
                                    </div>
                                    {[
                                        { key: 'people', emoji: '👥', label: 'People' },
                                        { key: 'places', emoji: '📍', label: 'Places' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => {
                                                setActiveView(tab.key);
                                                setShowSecretLinks(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                background: activeView === tab.key 
                                                    ? 'rgba(255, 107, 53, 0.3)' 
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                border: activeView === tab.key
                                                    ? '1px solid rgba(255, 107, 53, 0.5)'
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 4,
                                                transition: 'all 0.2s',
                                                textAlign: 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (activeView !== tab.key) {
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (activeView !== tab.key) {
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }
                                            }}
                                        >
                                            <span style={{fontSize: 14}}>{tab.emoji}</span>
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

window.StatsTab = StatsTab;
window.PeopleManager = PeopleManager; // Export PeopleManager for standalone use
console.log('✅ 13-09-stats.jsx loaded (v2.0 - Enhanced Analytics)');
