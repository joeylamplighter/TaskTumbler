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

import React, { useState, useEffect, useMemo, useCallback } from "react";

export default function LocationsManager({ locations, setLocations, notify, onClose }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        address: '', 
        type: 'client', 
        notes: '',
        lat: null,
        lon: null,
        resolvedAddress: '',
        googleMapsLink: ''
    });

    const safeLocations = Array.isArray(locations) ? locations : [];

    // Filter locations based on search
    const filteredLocations = useMemo(() => {
        if (!searchTerm.trim()) return safeLocations;
        const q = searchTerm.toLowerCase();
        return safeLocations.filter(loc => 
            loc.name?.toLowerCase().includes(q) ||
            loc.address?.toLowerCase().includes(q) ||
            loc.type?.toLowerCase().includes(q)
        );
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
    const handleSave = useCallback(() => {
        if (!formData.name.trim()) return;

        const coords = (formData.lat != null && formData.lon != null) ? 
            { lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) } : null;
        const googleMapsLink = formData.googleMapsLink || 
            (coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}` : '');

        const locationData = {
            name: formData.name.trim(),
            address: formData.address.trim(),
            type: formData.type,
            notes: formData.notes.trim(),
            lat: coords?.lat ?? null,
            lon: coords?.lon ?? null,
            lng: coords?.lon ?? null,
            coords: coords,
            resolvedAddress: formData.resolvedAddress.trim() || null,
            googleMapsLink: googleMapsLink || null
        };

        if (editId) {
            setLocations(prev => prev.map(loc => 
                loc.id === editId ? { ...loc, ...locationData } : loc
            ));
            notify?.("Location Updated", "✨");
        } else {
            const newLoc = { 
                id: 'loc_' + Date.now(), 
                ...locationData, 
                createdAt: new Date().toISOString() 
            };
            setLocations(prev => [...prev, newLoc]);
            notify?.("Location Added", "✅");
        }
        resetForm();
    }, [formData, editId, setLocations, notify]);

    const handleEdit = useCallback((loc) => {
        const coords = loc.coords || (loc.lat && loc.lon ? { lat: loc.lat, lon: loc.lon } : null);
        const googleMapsLink = loc.googleMapsLink || 
            (coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}` : 
            (loc.lat && loc.lon ? `https://www.google.com/maps?q=${loc.lat},${loc.lon}` : ''));
        
        setFormData({
            name: loc.name || '',
            address: loc.address || loc.addressLabel || '',
            type: loc.type || 'client',
            notes: loc.notes || '',
            lat: coords?.lat ?? loc.lat ?? null,
            lon: coords?.lon ?? loc.lon ?? loc.lng ?? null,
            resolvedAddress: loc.resolvedAddress || '',
            googleMapsLink: googleMapsLink
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
        setFormData({ 
            name: '', 
            address: '', 
            type: 'client', 
            notes: '',
            lat: null,
            lon: null,
            resolvedAddress: '',
            googleMapsLink: ''
        });
        setEditId(null);
        setIsEditing(false);
        setIsGpsLoading(false);
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
                    <label className="f-label">NAME *</label>
                    <input 
                        className="f-input" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
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

                {/* GPS Coordinates Section */}
                <div style={{marginBottom:16, padding:16, background:'rgba(0,0,0,0.1)', borderRadius:8, border:'1px solid var(--border)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                        <label className="f-label" style={{marginBottom:0}}>📍 GPS COORDINATES</label>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!navigator.geolocation) {
                                    notify?.("GPS not supported", "❌");
                                    return;
                                }
                                setIsGpsLoading(true);
                                navigator.geolocation.getCurrentPosition(
                                    async (pos) => {
                                        const lat = parseFloat(pos.coords.latitude.toFixed(6));
                                        const lon = parseFloat(pos.coords.longitude.toFixed(6));
                                        
                                        setFormData(prev => ({
                                            ...prev,
                                            lat: lat,
                                            lon: lon,
                                            googleMapsLink: `https://www.google.com/maps?q=${lat},${lon}`
                                        }));

                                        // Try to resolve address
                                        try {
                                            if (window.fetchLocationName) {
                                                const result = await window.fetchLocationName(lat, lon);
                                                const resolvedAddr = typeof result === 'object' ? result.resolvedAddress : result;
                                                const shortAddr = typeof result === 'object' ? result.shortAddress : result;
                                                
                                                setFormData(prev => ({
                                                    ...prev,
                                                    resolvedAddress: resolvedAddr || '',
                                                    address: prev.address || shortAddr || ''
                                                }));
                                                notify?.("GPS captured and address resolved", "✅");
                                            } else {
                                                notify?.("GPS captured", "📍");
                                            }
                                        } catch (err) {
                                            console.warn('Address resolution error:', err);
                                            notify?.("GPS captured (address resolution failed)", "📍");
                                        } finally {
                                            setIsGpsLoading(false);
                                        }
                                    },
                                    (err) => {
                                        setIsGpsLoading(false);
                                        notify?.("GPS failed: " + (err.message || "Unknown error"), "❌");
                                    },
                                    { enableHighAccuracy: true }
                                );
                            }}
                            disabled={isGpsLoading}
                            className="btn-white-outline"
                            style={{fontSize:12, padding:'6px 12px', height:32}}
                        >
                            {isGpsLoading ? "⏳ Locating..." : "📍 Get GPS"}
                        </button>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
                        <div>
                            <label className="f-label" style={{fontSize:11}}>LATITUDE</label>
                            <input 
                                className="f-input" 
                                type="number"
                                step="any"
                                value={formData.lat ?? ''} 
                                onChange={e => {
                                    const lat = e.target.value ? parseFloat(e.target.value) : null;
                                    const lon = formData.lon;
                                    setFormData(prev => ({
                                        ...prev,
                                        lat: lat,
                                        googleMapsLink: (lat != null && lon != null) ? 
                                            `https://www.google.com/maps?q=${lat},${lon}` : prev.googleMapsLink
                                    }));
                                }}
                                placeholder="e.g. 37.7749"
                                style={{fontSize:12}}
                            />
                        </div>
                        <div>
                            <label className="f-label" style={{fontSize:11}}>LONGITUDE</label>
                            <input 
                                className="f-input" 
                                type="number"
                                step="any"
                                value={formData.lon ?? ''} 
                                onChange={e => {
                                    const lon = e.target.value ? parseFloat(e.target.value) : null;
                                    const lat = formData.lat;
                                    setFormData(prev => ({
                                        ...prev,
                                        lon: lon,
                                        googleMapsLink: (lat != null && lon != null) ? 
                                            `https://www.google.com/maps?q=${lat},${lon}` : prev.googleMapsLink
                                    }));
                                }}
                                placeholder="e.g. -122.4194"
                                style={{fontSize:12}}
                            />
                        </div>
                    </div>
                    {formData.resolvedAddress && (
                        <div style={{marginBottom:12}}>
                            <label className="f-label" style={{fontSize:11}}>RESOLVED ADDRESS</label>
                            <input 
                                className="f-input" 
                                value={formData.resolvedAddress} 
                                onChange={e => setFormData({...formData, resolvedAddress: e.target.value})}
                                placeholder="Auto-resolved from GPS..."
                                style={{fontSize:12}}
                            />
                        </div>
                    )}
                    {formData.googleMapsLink && (
                        <div>
                            <a
                                href={formData.googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize:12,
                                    color:'var(--primary)',
                                    textDecoration:'none',
                                    display:'inline-flex',
                                    alignItems:'center',
                                    gap:6,
                                    fontWeight:600
                                }}
                                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                            >
                                🗺️ Open in Google Maps
                            </a>
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

            {/* Grid Layout */}
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
                        aria-label={`Edit ${loc.name}`}
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
                            {loc.name}
                        </div>
                        
                        <div style={{
                            fontSize: 12, color: 'var(--text-light)', marginBottom: 6, 
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                            minHeight: 18 
                        }}>
                            {loc.address || <span style={{opacity:0.4, fontStyle:'italic'}}>No address</span>}
                        </div>
                        
                        {loc.resolvedAddress && loc.resolvedAddress !== loc.address && (
                            <div style={{
                                fontSize: 10, color: 'var(--text-light)', marginBottom: 6, 
                                opacity: 0.7, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
                            }}>
                                📍 {loc.resolvedAddress}
                            </div>
                        )}
                        
                        {(loc.lat != null && loc.lon != null) && (
                            <div style={{
                                fontSize: 10, color: 'var(--text-light)', marginBottom: 8, 
                                opacity: 0.6, fontFamily: 'monospace'
                            }}>
                                {loc.lat.toFixed(6)}, {loc.lon.toFixed(6)}
                            </div>
                        )}

                        {/* Footer: Badge, Maps Link & Delete */}
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
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
                            
                            <div style={{display:'flex', gap:6, alignItems:'center'}}>
                                {(loc.googleMapsLink || (loc.lat != null && loc.lon != null)) && (
                                    <a
                                        href={loc.googleMapsLink || `https://www.google.com/maps?q=${loc.lat},${loc.lon}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            fontSize: 10,
                                            color: 'var(--primary)',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            opacity: 0.8
                                        }}
                                        onMouseOver={(e) => { e.target.style.opacity = 1; e.target.style.textDecoration = 'underline'; }}
                                        onMouseOut={(e) => { e.target.style.opacity = 0.8; e.target.style.textDecoration = 'none'; }}
                                        title="Open in Google Maps"
                                    >
                                        🗺️
                                    </a>
                                )}
                                
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
                                    aria-label={`Delete ${loc.name}`}
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Expose on window for backward compatibility
if (typeof window !== 'undefined') {
    window.LocationsManager = LocationsManager;
}

