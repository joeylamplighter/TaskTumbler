// ===========================================
// VIEW CONTACT MODAL (READ-ONLY)
// Dedicated page/view for individual contacts
// ===========================================

import React, { useState, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { getDisplayName, getInitials } from "../../utils/personUtils";

function ViewContactModal({ 
  person, 
  onClose = () => console.warn('ViewContactModal: onClose not provided'), 
  onEdit, 
  tasks = [], 
  history = [], 
  locations = [],
  people = [],
  setPeople = () => {},
  onViewTask = () => {},
  onComplete = () => {},
  ignoreHash = false
}) {
  // Ensure onClose is a function
  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);
  const [allLocations, setAllLocations] = useState([]);

  // Handle Esc key to close - use capture phase to catch it early
  useEffect(() => {
    if (!person) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    // Use capture phase and make sure it's on document
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleEsc, { capture: true });
    };
  }, [person, handleClose]);

  // Lock scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { 
      document.body.style.overflow = originalOverflow; 
    };
  }, []);

  // Hash-listening useEffect (only if not ignoring hash)
  useEffect(() => {
    if (ignoreHash) return;
    // Add hash change listening logic here if needed in the future
    // Example:
    // const handleHashChange = () => { ... };
    // window.addEventListener('hashchange', handleHashChange);
    // return () => window.removeEventListener('hashchange', handleHashChange);
  }, [ignoreHash]);

  // Load locations data
  useEffect(() => {
    const loadData = () => {
      try {
        const locs = (typeof window.getSavedLocationsV1 === "function")
          ? window.getSavedLocationsV1()
          : JSON.parse(localStorage.getItem("savedLocations_v1") || "[]");
        setAllLocations(Array.isArray(locs) ? locs : []);
      } catch (e) {
        console.error("Loc Load Error", e);
        setAllLocations([]);
      }
    };
    loadData();
    window.addEventListener("locations-updated", loadData);
    return () => {
      window.removeEventListener("locations-updated", loadData);
    };
  }, []);

  if (!person) return null;

  const personName = getDisplayName(person);
  const personInitials = getInitials(person);
  const personEmail = person.email || '';
  const personPhone = person.phone || '';
  const personCompany = person.company || '';
  const personJobTitle = person.jobTitle || '';
  const personAddress = person.address || '';
  const personCity = person.city || '';
  const personState = person.state || '';
  const personZipCode = person.zipCode || '';
  const personCountry = person.country || '';
  const personWebsite = person.website || '';
  const personLinkedIn = person.linkedin || '';
  const personTwitter = person.twitter || '';
  const personNotes = person.notes || '';
  const personTags = Array.isArray(person.tags) ? person.tags : (person.tags ? String(person.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
  const personLinks = Array.isArray(person.links) ? person.links : (person.links ? String(person.links).split(/\n|,/g).map(l => l.trim()).filter(Boolean) : []);
  const personCompassLink = person.compassCrmLink || person.compassLink || person.crmLink || '';
  const personType = person.type || 'contact';
  const personWeight = person.weight || 1;
  const personGroups = Array.isArray(person.groups) ? person.groups : [];
  const personRelationships = Array.isArray(person.relationships) ? person.relationships : [];
  const personLastContactDate = person.lastContactDate || '';
  const personNotesHistory = Array.isArray(person.notesHistory) ? person.notesHistory : [];
  const personIsFavorite = person.isFavorite || false;

  // Get profile picture display
  const getProfilePictureDisplay = () => {
    const picType = person.profilePictureType || 'initials';
    const pic = person.profilePicture;
    
    if (picType === 'emoji' && pic) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48
        }}>
          {pic}
        </div>
      );
    } else if ((picType === 'upload' || picType === 'ai') && pic) {
      return (
        <img 
          src={pic} 
          alt={personName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit'
          }}
        />
      );
    } else {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 28
        }}>
          {personInitials}
        </div>
      );
    }
  };

  // Get connected locations
  const connectedLocations = (person.locationIds || [])
    .map(locId => allLocations.find(l => l.id === locId))
    .filter(Boolean);

  // Get person's tasks - better matching
  const personTasks = tasks.filter(t => {
    const assignedPeople = t.assignedPeople || t.people || [];
    const personNameLower = personName.toLowerCase();
    return assignedPeople.some(p => {
      const pLower = String(p || '').toLowerCase();
      return pLower === personNameLower || 
             pLower === (person.name || '').toLowerCase() ||
             (person.firstName && person.lastName && pLower === `${person.firstName} ${person.lastName}`.toLowerCase());
    });
  });

  // Get person's history - better matching
  const personHistory = history.filter(h => {
    const hp = h.people || [];
    const personNameLower = personName.toLowerCase();
    return hp.some(p => {
      const pLower = String(p || '').toLowerCase();
      return pLower === personNameLower || 
             pLower === (person.name || '').toLowerCase() ||
             (person.firstName && person.lastName && pLower === `${person.firstName} ${person.lastName}`.toLowerCase());
    });
  }).sort((a, b) => {
    const ta = new Date(a?.createdAt || a?.completedAt || a?.ts || 0).getTime();
    const tb = new Date(b?.createdAt || b?.completedAt || b?.ts || 0).getTime();
    return tb - ta; // Most recent first
  });

  // Get related people
  const relatedPeople = people.filter(p => {
    if (!p || p.id === person.id) return false;
    return personRelationships.includes(p.id) || 
           personRelationships.includes(p.name) ||
           personRelationships.includes(getDisplayName(p));
  });

  // Calculate total time
  const trackedItems = personHistory.filter(h => h.duration || h.type === 'timer' || h.type === 'focus' || h.type === 'session');
  const totalTime = trackedItems.reduce((sum, h) => sum + (h.duration || 0), 0);
  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim() : minutes > 0 ? `${minutes}m` : '0m';

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Format date time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Handle history item click
  const handleHistoryClick = (historyItem) => {
    if (historyItem.taskId && (onViewTask || window.openModal)) {
      const task = tasks.find(t => t.id === historyItem.taskId);
      if (task) {
        // Use global closeModal to close contact modal, then open task
        if (window.closeModal) {
          window.closeModal();
        }
        if (window.openModal) {
          window.openModal('task', task.id, { task });
        } else if (onViewTask) {
          onViewTask(task);
        }
      }
    }
  };

  // Handle task click - open task view
  const handleTaskClick = (task) => {
    // Call onViewTask first if available
    if (onViewTask) {
      onViewTask(task);
    }
    // Then close the contact modal using global closeModal
    if (window.closeModal) {
      window.closeModal();
    }
    // Open the task modal
    if (window.openModal) {
      window.openModal('task', task.id, { task });
    }
  };

  // Handle task complete
  const handleTaskComplete = (e, task) => {
    e.stopPropagation(); // Prevent opening task view
    if (onComplete && typeof onComplete === 'function') {
      onComplete(task.id);
    }
  };

  return (
    <>
      {createPortal(
        <div 
          onMouseDown={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              handleClose();
            }
          }}
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              handleClose();
            }
          }}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 20,
            pointerEvents: 'auto',
            cursor: 'pointer'
          }}
        >
          <div 
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              // Prevent Esc from bubbling if pressed inside modal
              if (e.key === 'Escape') {
                e.stopPropagation();
              }
            }}
            style={{ 
              background: 'var(--card)', 
              borderRadius: 'var(--border-radius-lg, 16px)', 
              width: 'min(700px, 95vw)', 
              maxHeight: '90vh',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 0 40px rgba(255,107,53,0.15), 0 20px 60px rgba(0,0,0,0.4)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default',
              pointerEvents: 'auto'
            }}
          >
            {/* HEADER */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              gap: 16,
              flexShrink: 0
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Back button when ignoreHash is true */}
                {ignoreHash && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // Use global closeModal
                      if (window.closeModal) {
                        window.closeModal();
                      } else {
                        handleClose();
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-light)',
                      fontSize: 24,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 'var(--border-radius-sm, 6px)',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                      lineHeight: 1,
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Back"
                  >
                    ←
                  </button>
                )}
                {/* Profile Picture */}
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--border-radius-md, 10px)',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--input-bg)',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {getProfilePictureDisplay()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Type badge and favorite */}
                  <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    alignItems: 'center', 
                    marginBottom: 12,
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-light)',
                      padding: '4px 10px',
                      borderRadius: 'var(--border-radius-sm, 6px)',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase'
                    }}>
                      {personType}
                    </span>
                    {personWeight > 1 && (
                      <span style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 'var(--border-radius-sm, 6px)',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.5
                      }}>
                        Weight: {personWeight}
                      </span>
                    )}
                    {personIsFavorite && (
                      <span style={{ fontSize: 18 }} title="Favorite">⭐</span>
                    )}
                  </div>
                  
                  {/* Name */}
                  <h2 style={{ 
                    fontFamily: 'Fredoka', 
                    fontSize: 28, 
                    lineHeight: 1.2, 
                    margin: 0,
                    marginBottom: 8,
                    fontWeight: 900,
                    wordBreak: 'break-word',
                    color: 'var(--text)'
                  }}>
                    {personName}
                  </h2>

                  {/* Job title and company */}
                  {(personJobTitle || personCompany) && (
                    <div style={{ 
                      fontSize: 14, 
                      color: 'var(--text-light)', 
                      marginBottom: 8
                    }}>
                      {personJobTitle && personCompany ? `${personJobTitle} at ${personCompany}` : personJobTitle || personCompany}
                    </div>
                  )}

                  {/* Quick stats */}
                  <div style={{ fontSize: 12, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {personTasks.length > 0 && (
                      <span>📋 {personTasks.length} {personTasks.length === 1 ? 'task' : 'tasks'}</span>
                    )}
                    {personHistory.length > 0 && (
                      <span>📜 {personHistory.length} {personHistory.length === 1 ? 'activity' : 'activities'}</span>
                    )}
                    {personLastContactDate && (
                      <span>📅 Last contact: {formatDate(personLastContactDate)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleClose();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-light)',
                  fontSize: 28,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 'var(--border-radius-sm, 6px)',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  lineHeight: 1,
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Close (Esc)"
              >
                ×
              </button>
            </div>

            {/* CONTENT - Scrollable */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24
            }}>
              {/* Contact Information - Grid Layout */}
              {(personEmail || personPhone || personWebsite || personLinkedIn || personTwitter || personCompassLink || personCompany || personJobTitle) && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Contact Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Email */}
                    {personEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, width: 24 }}>📧</span>
                        <a 
                          href={`mailto:${personEmail}`}
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {personEmail}
                        </a>
                      </div>
                    )}
                    {/* Phone */}
                    {personPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, width: 24 }}>📞</span>
                        <a 
                          href={`tel:${personPhone}`}
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {personPhone}
                        </a>
                      </div>
                    )}
                    {/* LinkedIn */}
                    {personLinkedIn && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, width: 24 }}>💼</span>
                        <a 
                          href={personLinkedIn.startsWith('http') ? personLinkedIn : `https://${personLinkedIn}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {/* Twitter */}
                    {personTwitter && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, width: 24 }}>🐦</span>
                        <a 
                          href={personTwitter.startsWith('http') ? personTwitter : `https://twitter.com/${personTwitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {personTwitter}
                        </a>
                      </div>
                    )}
                    {/* Compass Link */}
                    {personCompassLink && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, width: 24 }}>🏠</span>
                        <a 
                          href={personCompassLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          Compass CRM
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {/* Company, Job Title, Website grouped card */}
                  {(personCompany || personJobTitle || personWebsite) && (
                    <div style={{
                      background: 'var(--input-bg)',
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 12
                    }}>
                      {personJobTitle && (
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: personCompany || personWebsite ? 6 : 0 }}>
                          {personJobTitle}
                        </div>
                      )}
                      {personCompany && (
                        <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: personWebsite ? 6 : 0 }}>
                          {personCompany}
                        </div>
                      )}
                      {personWebsite && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🌐</span>
                          <a 
                            href={personWebsite.startsWith('http') ? personWebsite : `https://${personWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {personWebsite}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Address */}
              {(personAddress || personCity || personState || personZipCode) && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Address
                  </h3>
                  <div style={{ 
                    color: 'var(--text)', 
                    lineHeight: 1.6,
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    fontSize: 14
                  }}>
                    {personAddress && <div>{personAddress}</div>}
                    {(personCity || personState || personZipCode) && (
                      <div>
                        {[personCity, personState, personZipCode].filter(Boolean).join(', ')}
                        {personCountry && `, ${personCountry}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connected Locations */}
              {connectedLocations.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Connected Locations
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {connectedLocations.map(loc => (
                      <div 
                        key={loc.id}
                        style={{
                          padding: 10,
                          background: 'var(--input-bg)',
                          borderRadius: 'var(--border-radius-md, 10px)',
                          fontSize: 13
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{loc.name || loc.label}</div>
                        {loc.address && (
                          <div style={{ color: 'var(--text-light)', fontSize: 12 }}>{loc.address}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related People */}
              {relatedPeople.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Related People
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {relatedPeople.map(related => (
                      <button
                        key={related.id}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-contact', { detail: { person: related } }));
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--border-radius-sm, 6px)',
                          color: 'var(--text)',
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-light)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--input-bg)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        {getDisplayName(related)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups */}
              {personGroups.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Groups
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {personGroups.map((group, idx) => (
                      <span 
                        key={idx}
                        style={{
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '4px 10px',
                          borderRadius: 'var(--border-radius-sm, 6px)',
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {personTags.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Tags
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {personTags.map((tag, idx) => (
                      <span 
                        key={idx}
                        style={{
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '4px 10px',
                          borderRadius: 'var(--border-radius-sm, 6px)',
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {personLinks.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Links
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {personLinks.map((link, idx) => (
                      <a 
                        key={idx}
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          fontSize: 13,
                          wordBreak: 'break-all'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Tasks */}
              {personTasks.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Associated Tasks ({personTasks.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                    {personTasks.slice(0, 10).map(task => (
                      <div
                        key={task.id}
                        style={{
                          padding: 12,
                          background: task.completed ? 'var(--input-bg)' : 'var(--input-bg)',
                          border: `1px solid ${task.completed ? 'var(--border)' : 'var(--primary)'}`,
                          borderRadius: 'var(--border-radius-md, 10px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          opacity: task.completed ? 0.7 : 1
                        }}
                      >
                        <button
                          onClick={() => handleTaskClick(task)}
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 13
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                            {task.completed && <span style={{ marginRight: 6 }}>✅</span>}
                            {task.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {task.category && <span>📁 {task.category}</span>}
                            {task.dueDate && <span>📅 {formatDate(task.dueDate)}</span>}
                            {task.completed && <span>Completed</span>}
                          </div>
                        </button>
                        {!task.completed && (
                          <button
                            onClick={(e) => handleTaskComplete(e, task)}
                            style={{
                              padding: '6px 12px',
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--border-radius-sm, 6px)',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--primary-dark)';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--primary)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Complete task"
                          >
                            ✓ Complete
                          </button>
                        )}
                      </div>
                    ))}
                    {personTasks.length > 10 && (
                      <div style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: 8 }}>
                        + {personTasks.length - 10} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* History Items */}
              {personHistory.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Recent Activity ({personHistory.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                    {personHistory.slice(0, 20).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleHistoryClick(item)}
                        style={{
                          padding: 10,
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--border-radius-sm, 6px)',
                          textAlign: 'left',
                          cursor: item.taskId ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          fontSize: 12
                        }}
                        onMouseEnter={(e) => {
                          if (item.taskId) {
                            e.currentTarget.style.background = 'var(--primary-light)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (item.taskId) {
                            e.currentTarget.style.background = 'var(--input-bg)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                              {item.type || item.title || 'Activity'}
                            </div>
                            {item.description && (
                              <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 4 }}>
                                {item.description}
                              </div>
                            )}
                            <div style={{ fontSize: 10, color: 'var(--text-light)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {item.duration && <span>⏱️ {item.duration}m</span>}
                              {(item.createdAt || item.completedAt || item.ts) && (
                                <span>📅 {formatDateTime(item.createdAt || item.completedAt || item.ts)}</span>
                              )}
                              {item.taskId && <span style={{ color: 'var(--primary)' }}>→ View Task</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {personHistory.length > 20 && (
                      <div style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: 8 }}>
                        + {personHistory.length - 20} more activities
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div>
                <h3 style={{ 
                  fontSize: 12, 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  color: 'var(--text-light)', 
                  marginBottom: 12,
                  letterSpacing: 1
                }}>
                  Statistics
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                  gap: 12
                }}>
                  <div style={{
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                      {personTasks.length}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                      Tasks
                    </div>
                  </div>
                  <div style={{
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                      {timeStr}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                      Time Tracked
                    </div>
                  </div>
                  <div style={{
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                      {trackedItems.length}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                      Sessions
                    </div>
                  </div>
                  <div style={{
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                      {personHistory.length}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                      History Events
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes History */}
              {personNotesHistory.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Notes History
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto' }}>
                    {personNotesHistory.map((note, idx) => {
                      const noteText = note.text || note.note || note;
                      const noteTime = note.timestamp || note.time || '';
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: 12,
                            background: 'var(--input-bg)',
                            borderRadius: 'var(--border-radius-md, 10px)',
                            fontSize: 13,
                            lineHeight: 1.6
                          }}
                        >
                          <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 6 }}>
                            {noteText}
                          </div>
                          {noteTime && (
                            <div style={{ fontSize: 10, color: 'var(--text-light)', fontStyle: 'italic' }}>
                              {formatDateTime(noteTime)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Notes */}
              {personNotes && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Notes
                  </h3>
                  <div style={{ 
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    color: 'var(--text)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 13
                  }}>
                    {personNotes}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {(person.createdAt || person.updatedAt) && (
                <div>
                  <h3 style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--text-light)', 
                    marginBottom: 12,
                    letterSpacing: 1
                  }}>
                    Metadata
                  </h3>
                  <div style={{ 
                    padding: 12,
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--border-radius-md, 10px)',
                    fontSize: 12,
                    color: 'var(--text-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    {person.createdAt && (
                      <div>Created: {formatDateTime(person.createdAt)}</div>
                    )}
                    {person.updatedAt && person.updatedAt !== person.createdAt && (
                      <div>Updated: {formatDateTime(person.updatedAt)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER - Actions */}
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: 10,
              flexShrink: 0
            }}>
              {onEdit && (
                <button
                  onClick={() => onEdit(person)}
                  className="btn-white-outline"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Edit Contact
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleClose();
                }}
                className="btn-orange"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Memoize to prevent re-renders when person.id hasn't changed
const MemoizedViewContactModal = memo(ViewContactModal, (prevProps, nextProps) => {
  const prevId = prevProps.person?.id || prevProps.person?.name || 
                 (prevProps.person?.firstName && prevProps.person?.lastName 
                   ? `${prevProps.person.firstName} ${prevProps.person.lastName}` 
                   : null);
  const nextId = nextProps.person?.id || nextProps.person?.name || 
                 (nextProps.person?.firstName && nextProps.person?.lastName 
                   ? `${nextProps.person.firstName} ${nextProps.person.lastName}` 
                   : null);
  return prevId === nextId && prevProps.person === nextProps.person;
});

export default MemoizedViewContactModal;
