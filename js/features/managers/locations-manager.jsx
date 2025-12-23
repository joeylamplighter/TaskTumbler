// components/locations-manager.jsx
// Updated: 2025-12-19 (Roadmap Fixes Applied)
// ===========================================
// LOCATIONS MANAGER COMPONENT
// ===========================================
// Fixes Applied:
// - #60: Place categorization (already present)
// - #93: Added aria-label attributes for accessibility
// - Improved keyboard handling
// ===========================================

function LocationsManager({ locations, setLocations, notify, onClose }) {
    const { useState, useEffect, useMemo, useCallback } = React;
    
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [resolvingAddressId, setResolvingAddressId] = useState(null);
    const [showGpsSection, setShowGpsSection] = useState(false);
    const [formData, setFormData] = useState({ 
        label: '', 
        address: '', 
        type: 'client', 
        notes: '',
        lat: null,
        lon: null
    });

    const safeLocations = Array.isArray(locations) ? locations : [];

    // Filter locations based on search
    const filteredLocations = useMemo(() => {
        if (!searchTerm.trim()) return safeLocations;
        const q = searchTerm.toLowerCase();
        return safeLocations.filter(loc => {
            const label = (loc.label || loc.name || '').toLowerCase();
            const address = (loc.address || '').toLowerCase();
            const type = (loc.type || '').toLowerCase();
            return label.includes(q) || address.includes(q) || type.includes(q);
        });
    }, [safeLocations, searchTerm]);

    // --- HELPER: ICONS & COLORS ---
    const getTypeIcon = (type) => {
        switch(type) {
            case 'client': return '🏢';
            case 'vendor': return '🚚';
            case 'personal': return '🏠';
            case 'project': return '🗝️';
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

    // --- ACTIONS ---
    const captureGPS = useCallback(() => {
        if (!navigator.geolocation) {
            notify?.("GPS not supported", "🚫");
            return;
        }
        setIsGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(6));
                const lon = parseFloat(pos.coords.longitude.toFixed(6));
                setFormData(prev => ({ ...prev, lat, lon }));
                setShowGpsSection(true); // Auto-expand when GPS is captured
                setIsGpsLoading(false);
                notify?.("GPS captured", "📍");
            },
            (err) => {
                setIsGpsLoading(false);
                notify?.("GPS failed: " + (err.message || "Unknown error"), "❌");
            }
        );
    }, [notify]);

    const handleSave = useCallback(() => {
        const label = formData.label.trim();
        if (!label) return;

        const locationData = {
            label,
            name: label, // Keep for backward compatibility
            address: formData.address.trim() || null,
            type: formData.type || 'client',
            notes: formData.notes.trim() || '',
            lat: (formData.lat !== null && !isNaN(formData.lat)) ? formData.lat : null,
            lon: (formData.lon !== null && !isNaN(formData.lon)) ? formData.lon : null,
        };

        if (editId) {
            const oldLoc = locations.find(l => l.id === editId);
            setLocations(prev => prev.map(loc => 
                loc.id === editId ? { ...loc, ...locationData } : loc
            ));
            
            // Log location edit activity
            if (window.DataManager?.activities?.add && oldLoc) {
                window.DataManager.activities.add({
                    title: `Location edited: ${label}`,
                    category: 'Database',
                    type: 'location_edited',
                    locationLabel: label,
                    duration: 0,
                    createdAt: new Date().toISOString(),
                });
                // Trigger history update
                window.dispatchEvent(new Event('activities-updated'));
            }
            
            notify?.("Location Updated", "✨");
        } else {
            const newLoc = { 
                id: 'loc_' + Date.now(), 
                ...locationData, 
                createdAt: new Date().toISOString() 
            };
            setLocations(prev => [...prev, newLoc]);
            
            // Log location creation activity
            if (window.DataManager?.activities?.add) {
                window.DataManager.activities.add({
                    title: `Location created: ${label}`,
                    category: 'Database',
                    type: 'location_created',
                    locationLabel: label,
                    duration: 0,
                    createdAt: new Date().toISOString(),
                });
                // Trigger history update
                window.dispatchEvent(new Event('activities-updated'));
            }
            
            notify?.("Location Added", "✅");
        }
        resetForm();
    }, [formData, editId, setLocations, notify, locations]);

    const handleEdit = useCallback((loc) => {
        setFormData({
            label: loc.label || loc.name || '',
            address: loc.address || '',
            type: loc.type || 'client',
            notes: loc.notes || '',
            lat: (loc.lat !== null && loc.lat !== undefined) ? loc.lat : null,
            lon: (loc.lon !== null && loc.lon !== undefined) ? loc.lon : null
        });
        setEditId(loc.id);
        setIsEditing(true);
        // Show GPS section if coordinates exist, otherwise keep it hidden
        setShowGpsSection(loc.lat !== null && loc.lon !== null);
    }, []);

    const resolveAddressFromGPS = useCallback(async (loc) => {
        if (!loc || loc.lat === null || loc.lon === null || isNaN(loc.lat) || isNaN(loc.lon)) {
            notify?.("No GPS coordinates available", "⚠️");
            return;
        }

        setResolvingAddressId(loc.id);
        try {
            const address = (typeof window.fetchLocationName === "function") 
                ? await window.fetchLocationName(loc.lat, loc.lon) 
                : null;
            
            if (address) {
                setLocations(prev => prev.map(l => 
                    l.id === loc.id ? { ...l, address: address } : l
                ));
                notify?.("Address resolved", "✅");
            } else {
                notify?.("Could not resolve address", "⚠️");
            }
        } catch (err) {
            console.error("Address resolution error:", err);
            notify?.("Failed to resolve address: " + (err.message || "Unknown error"), "❌");
        } finally {
            setResolvingAddressId(null);
        }
    }, [setLocations, notify]);

    const handleEdit = useCallback((loc) => {
        setFormData({
            name: loc.name,
            address: loc.address || '',
            type: loc.type || 'client',
            notes: loc.notes || ''
        });
        setEditId(loc.id);
        setIsEditing(true);
    }, []);

    const handleDelete = useCallback((e, id) => {
        e.stopPropagation();
        if(window.confirm?.("Remove this location?")) {
            setLocations(prev => prev.filter(l => l.id !== id));
            notify?.("Deleted", "🗑");
        }
    }, [setLocations, notify]);

    const resetForm = useCallback(() => {
        setFormData({ label: '', address: '', type: 'client', notes: '', lat: null, lon: null });
        setEditId(null);
        setIsEditing(false);
        setIsGpsLoading(false);
        setShowGpsSection(false);
    }, []);

    const onKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            resetForm();
        }
    }, [handleSave, resetForm]);

    // --- VIEW: EDIT FORM (Card Style) ---
    if (isEditing) {
        return (
            <div 
                className="fade-in-up" 
                style={{
                    background: 'var(--card)', 
                    borderRadius: 16, 
                    padding: 24, 
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    border: '1px solid var(--border)'
                }}
                role="form"
                aria-label={editId ? 'Edit location' : 'Add new location'}
            >
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                    <h3 style={{fontFamily:'Fredoka', margin:0, fontSize:20}}>
                        {editId ? '✏️ Edit Place' : '📍 New Place'}
                    </h3>
                    <button 
                        onClick={resetForm} 
                        style={{
                            background:'none', 
                            border:'none', 
                            fontSize:24, 
                            cursor:'pointer', 
                            opacity:0.5,
                            width: 32, 
                            height: 32, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center'
                        }}
                        aria-label="Cancel and close form"
                    >
                        ×
                    </button>
                </div>

                <div style={{marginBottom:16}}>
                    <label className="f-label">LABEL *</label>
                    <input 
                        className="f-input" 
                        value={formData.label} 
                        onChange={e => setFormData({...formData, label: e.target.value})}
                        onKeyDown={onKeyDown}
                        placeholder="e.g. Headquarters" 
                        autoFocus
                        aria-required="true"
                    />
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
                    <div>
                        <label className="f-label">TYPE</label>
                        <select 
                            className="f-select" 
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                            <option value="client">🏢 Client</option>
                            <option value="vendor">🚚 Vendor</option>
                            <option value="personal">🏠 Personal</option>
                            <option value="project">🗝️ Project</option>
                        </select>
                    </div>
                    <div>
                        <label className="f-label">ADDRESS</label>
                        <input 
                            className="f-input" 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            onKeyDown={onKeyDown}
                            placeholder="Street address..." 
                        />
                    </div>
                </div>

                {/* GPS Section - Collapsible */}
                <div style={{marginBottom:16}}>
                    <button
                        type="button"
                        onClick={() => setShowGpsSection(!showGpsSection)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text)',
                            marginBottom: showGpsSection ? 8 : 0
                        }}
                        aria-label={showGpsSection ? "Hide GPS coordinates" : "Show GPS coordinates"}
                    >
                        <span>📍 GPS Coordinates</span>
                        <span style={{fontSize: 16, transition: 'transform 0.2s', transform: showGpsSection ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                            ▼
                        </span>
                    </button>
                    {showGpsSection && (
                        <div style={{padding:12, background:'var(--input-bg)', borderRadius:8, border:'1px solid var(--border)'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                                <label className="f-label" style={{marginBottom:0, fontSize:11}}>GPS COORDINATES</label>
                                <button
                                    type="button"
                                    className="btn-white-outline"
                                    onClick={captureGPS}
                                    disabled={isGpsLoading}
                                    style={{height:32, fontSize:12, padding:'4px 12px'}}
                                    aria-label="Capture current GPS location"
                                >
                                    {isGpsLoading ? '⏳' : '📍'} {isGpsLoading ? 'Capturing...' : 'Capture GPS'}
                                </button>
                            </div>
                            {(formData.lat !== null && formData.lon !== null) ? (
                                <div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8}}>
                                        <div>
                                            <label style={{fontSize:11, color:'var(--text-light)', display:'block', marginBottom:4}}>Latitude</label>
                                            <input 
                                                className="f-input" 
                                                type="number"
                                                step="any"
                                                value={formData.lat || ''} 
                                                onChange={e => {
                                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                    setFormData({...formData, lat: isNaN(val) ? null : val});
                                                }}
                                                placeholder="Latitude"
                                                style={{fontSize:12}}
                                            />
                                        </div>
                                        <div>
                                            <label style={{fontSize:11, color:'var(--text-light)', display:'block', marginBottom:4}}>Longitude</label>
                                            <input 
                                                className="f-input" 
                                                type="number"
                                                step="any"
                                                value={formData.lon || ''} 
                                                onChange={e => {
                                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                    setFormData({...formData, lon: isNaN(val) ? null : val});
                                                }}
                                                placeholder="Longitude"
                                                style={{fontSize:12}}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-white-outline"
                                        onClick={async () => {
                                            if (formData.lat === null || formData.lon === null || isNaN(formData.lat) || isNaN(formData.lon)) {
                                                notify?.("Invalid GPS coordinates", "⚠️");
                                                return;
                                            }
                                            setIsGpsLoading(true);
                                            try {
                                                const address = (typeof window.fetchLocationName === "function") 
                                                    ? await window.fetchLocationName(formData.lat, formData.lon) 
                                                    : null;
                                                if (address) {
                                                    setFormData(prev => ({ ...prev, address: address }));
                                                    notify?.("Address resolved", "✅");
                                                } else {
                                                    notify?.("Could not resolve address", "⚠️");
                                                }
                                            } catch (err) {
                                                console.error("Address resolution error:", err);
                                                notify?.("Failed to resolve address: " + (err.message || "Unknown error"), "❌");
                                            } finally {
                                                setIsGpsLoading(false);
                                            }
                                        }}
                                        disabled={isGpsLoading}
                                        style={{width:'100%', fontSize:12, height:32}}
                                        aria-label="Resolve address from GPS coordinates"
                                    >
                                        {isGpsLoading ? '⏳ Resolving Address...' : '🔍 Resolve Address from GPS'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{fontSize:12, color:'var(--text-light)', fontStyle:'italic'}}>
                                    No GPS coordinates. Click "Capture GPS" to add current location.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{marginBottom:24}}>
                    <label className="f-label">NOTES</label>
                    <textarea 
                        className="f-input" 
                        style={{minHeight:80, resize:'none', fontFamily:'inherit'}}
                        value={formData.notes} 
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="Gate codes, parking info, hours..." 
                    />
                </div>

                <div style={{display:'flex', gap:10}}>
                    <button 
                        className="btn-primary" 
                        style={{flex:1, height:44, fontSize:15, fontWeight:600}} 
                        onClick={handleSave}
                    >
                        {editId ? 'Save Changes' : 'Add Location'}
                    </button>
                    <button 
                        className="btn-white-outline" 
                        style={{height:44}} 
                        onClick={resetForm}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // --- VIEW: GRID OF CARDS ---
    return (
        <div className="locations-manager fade-in" role="region" aria-label="Locations Manager">
            {/* Header */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:12, fontWeight:700, color:'var(--text-light)', letterSpacing:1}}>
                    MY PLACES ({filteredLocations.length})
                </div>
                <button 
                    className="btn-orange-small" 
                    onClick={() => setIsEditing(true)}
                    style={{padding:'8px 14px', fontSize:13, borderRadius:20}}
                    aria-label="Add new location"
                >
                    + Add New
                </button>
            </div>

            {/* Search */}
            {safeLocations.length > 3 && (
                <input 
                    className="f-input" 
                    style={{ marginBottom: 16 }}
                    placeholder="🔍 Search locations..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    aria-label="Search locations"
                />
            )}

            {/* Empty State */}
            {safeLocations.length === 0 && (
                <div style={{
                    textAlign:'center', padding:'50px 20px', 
                    background:'var(--card)', borderRadius:16,
                    border:'2px dashed var(--border)', opacity:0.8
                }}>
                    <div style={{fontSize:48, marginBottom:16, opacity:0.5}}>🗺️</div>
                    <div style={{fontWeight:700, fontSize:18, marginBottom:4}}>No places yet</div>
                    <div style={{fontSize:13, color:'var(--text-light)'}}>Add addresses for quick access.</div>
                </div>
            )}

            {/* No Results */}
            {safeLocations.length > 0 && filteredLocations.length === 0 && (
                <div style={{textAlign:'center', padding:40, opacity:0.5}}>
                    No locations match "{searchTerm}"
                </div>
            )}

            {/* Table Layout for Many Places, Grid for Few */}
            {filteredLocations.length > 8 ? (
                <div style={{background:'var(--card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden'}}>
                    {/* Table Header */}
                    <div style={{display:'grid', gridTemplateColumns:'50px 2fr 2fr 120px 50px', gap:12, padding:'12px 16px', background:'var(--bg)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:800, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:0.5}}>
                        <div></div>
                        <div>Name</div>
                        <div>Address</div>
                        <div>Type</div>
                        <div></div>
                    </div>
                    
                    {/* Table Rows */}
                    <div style={{maxHeight:'calc(100vh - 300px)', overflowY:'auto'}}>
                        {filteredLocations.map(loc => (
                            <div
                                key={loc.id}
                                onClick={() => handleEdit(loc)}
                                style={{
                                    display:'grid',
                                    gridTemplateColumns:'50px 2fr 2fr 120px 50px',
                                    gap:12,
                                    padding:'14px 16px',
                                    cursor:'pointer',
                                    borderBottom:'1px solid var(--border)',
                                    transition:'all 0.2s',
                                    alignItems:'center'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background='var(--bg)'; }}
                                onMouseOut={e => { e.currentTarget.style.background='transparent'; }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Edit ${loc.label || loc.name}`}
                                onKeyDown={e => { if (e.key === 'Enter') handleEdit(loc); }}
                            >
                                <div style={{fontSize:20}}>{getTypeIcon(loc.type)}</div>
                                
                                <div style={{minWidth:0, flex:1}}>
                                    <div style={{fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                        {loc.label || loc.name}
                                    </div>
                                    {(loc.lat !== null && loc.lon !== null) && (
                                        <div style={{fontSize:10, color:'var(--primary)', marginTop:2, display:'flex', alignItems:'center', gap:4}}>
                                            <span>📍 {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    resolveAddressFromGPS(loc);
                                                }}
                                                disabled={resolvingAddressId === loc.id}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--primary)',
                                                    cursor: resolvingAddressId === loc.id ? 'wait' : 'pointer',
                                                    fontSize: 10,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    opacity: resolvingAddressId === loc.id ? 0.6 : 1
                                                }}
                                                title="Resolve address from GPS"
                                                aria-label="Resolve address from GPS"
                                            >
                                                {resolvingAddressId === loc.id ? '⏳' : '🔍'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{minWidth:0}}>
                                    <div style={{fontSize:12, color:'var(--text-light)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                        {loc.address || <span style={{opacity:0.4, fontStyle:'italic'}}>No address</span>}
                                    </div>
                                </div>
                                
                                <div>
                                    <span style={{
                                        fontSize:10, fontWeight:800, 
                                        textTransform:'uppercase', 
                                        color: getTypeColor(loc.type),
                                        background: 'rgba(var(--bg-rgb), 0.8)',
                                        padding: '4px 8px', borderRadius: 8,
                                        letterSpacing: 0.5
                                    }}>
                                        {loc.type}
                                    </span>
                                </div>
                                
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(e, loc.id);
                                    }}
                                    title="Delete"
                                    style={{
                                        background: 'none', border: 'none', 
                                        fontSize: 14, cursor: 'pointer', 
                                        opacity: 0.4, padding: 4
                                    }}
                                    onMouseOver={e => { e.target.style.opacity = 1; e.target.style.color = 'var(--danger)'; }}
                                    onMouseOut={e => { e.target.style.opacity = 0.4; e.target.style.color = ''; }}
                                    aria-label={`Delete ${loc.label || loc.name}`}
                                >
                                    🗑
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: 12
                }}>
                    {filteredLocations.map(loc => (
                        <div 
                            key={loc.id} 
                            onClick={() => handleEdit(loc)}
                            className="location-card"
                            style={{
                                background: 'var(--card)',
                                borderRadius: 16,
                                padding: 14,
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                border: '1px solid transparent',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = 'transparent';
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Edit ${loc.label || loc.name}`}
                            onKeyDown={e => { if (e.key === 'Enter') handleEdit(loc); }}
                        >
                            {/* Type Icon Circle */}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'rgba(var(--bg-rgb), 0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, marginBottom: 10,
                                border: '1px solid var(--border-light)'
                            }}>
                                {getTypeIcon(loc.type)}
                            </div>

                            {/* Name & Address */}
                            <div style={{fontWeight: 700, fontSize: 15, marginBottom: 4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                {loc.label || loc.name}
                            </div>
                            
                            <div style={{
                                fontSize: 12, color: 'var(--text-light)', marginBottom: 4, 
                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                                minHeight: 18 
                            }}>
                                {loc.address || <span style={{opacity:0.4, fontStyle:'italic'}}>No address</span>}
                            </div>

                            {/* GPS Display with Resolve Button */}
                            {(loc.lat !== null && loc.lon !== null) && (
                                <div style={{
                                    fontSize: 10, color: 'var(--primary)', marginBottom: 8,
                                    display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap'
                                }}>
                                    <span>📍 {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resolveAddressFromGPS(loc);
                                        }}
                                        disabled={resolvingAddressId === loc.id}
                                        style={{
                                            background: 'rgba(var(--primary-rgb, 255, 107, 53), 0.1)',
                                            border: '1px solid var(--primary)',
                                            color: 'var(--primary)',
                                            cursor: resolvingAddressId === loc.id ? 'wait' : 'pointer',
                                            fontSize: 9,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            opacity: resolvingAddressId === loc.id ? 0.6 : 1,
                                            fontWeight: 600
                                        }}
                                        title="Resolve address from GPS"
                                        aria-label="Resolve address from GPS"
                                    >
                                        {resolvingAddressId === loc.id ? '⏳ Resolving...' : '🔍 Resolve'}
                                    </button>
                                </div>
                            )}

                            {/* Footer: Badge & Delete */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span style={{
                                    fontSize: 10, fontWeight: 800, 
                                    textTransform: 'uppercase', 
                                    color: getTypeColor(loc.type),
                                    background: 'rgba(var(--bg-rgb), 0.8)',
                                    padding: '3px 8px', borderRadius: 8,
                                    letterSpacing: 0.5
                                }}>
                                    {loc.type}
                                </span>
                                
                                <button 
                                    onClick={(e) => handleDelete(e, loc.id)}
                                    title="Delete"
                                    style={{
                                        background: 'none', border: 'none', 
                                        fontSize: 14, cursor: 'pointer', 
                                        opacity: 0.3, padding: 4, borderRadius: '50%'
                                    }}
                                    onMouseOver={e => { e.target.style.opacity = 1; e.target.style.background = 'rgba(255,0,0,0.1)'; }}
                                    onMouseOut={e => { e.target.style.opacity = 0.3; e.target.style.background = 'none'; }}
                                    aria-label={`Delete ${loc.label || loc.name}`}
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

window.LocationsManager = LocationsManager;
console.log('✅ LocationsManager loaded (Roadmap Fixes: #60, #93)');
