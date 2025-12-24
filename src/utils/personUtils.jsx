// src/utils/personUtils.jsx
// ===========================================
// SHARED PERSON UTILITIES & COMPONENTS
// Unified person display across the app
// ===========================================

import React from 'react';

/**
 * Get display name from person object (handles both old and new formats)
 */
export const getDisplayName = (person) => {
  if (!person) return 'Untitled';
  if (person.firstName || person.lastName) {
    return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Untitled';
  }
  return person.name || 'Untitled';
};

/**
 * Get initials from person object
 */
export const getInitials = (person) => {
  if (!person) return '?';

  if (person.firstName || person.lastName) {
    const first = person.firstName?.[0]?.toUpperCase() || '';
    const last = person.lastName?.[0]?.toUpperCase() || '';
    const initials = first + last;
    if (initials) return initials;
  }

  if (person.name) {
    const parts = person.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return person.name[0].toUpperCase();
  }

  return '?';
};

/**
 * Get person record by name (case-insensitive)
 */
export const getPersonRecordByName = (name, allPeople = []) => {
  if (!name || !Array.isArray(allPeople)) return null;
  const searchName = String(name).trim().toLowerCase();
  return allPeople.find(p => {
    const displayName = getDisplayName(p);
    return String(displayName || "").trim().toLowerCase() === searchName;
  }) || null;
};

/**
 * Compact Person Avatar Component
 * Used for consistent person display across the app
 */
export const PersonAvatar = ({ person, size = 36, showName = false, onClick, selected = false, style = {} }) => {
  if (!person) return null;
  
  const displayName = getDisplayName(person);
  const initials = getInitials(person);
  
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      <div style={{
        width: size,
        height: size,
        borderRadius: size <= 32 ? '50%' : 12,
        border: selected ? `2px solid var(--primary)` : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: selected ? 'var(--primary)' : 'var(--input-bg)',
        color: selected ? 'white' : 'var(--text)',
        fontWeight: 900,
        fontSize: size <= 32 ? size * 0.4 : size * 0.35,
        flexShrink: 0
      }}>
        {initials}
      </div>
      {showName && (
        <div style={{ minWidth: 0 }}>
          <div style={{ 
            fontWeight: 800, 
            color: 'var(--text)', 
            fontSize: 14,
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {displayName}
          </div>
          {person.type && (
            <div style={{ 
              fontSize: 11, 
              color: 'var(--text-light)', 
              opacity: 0.8,
              textTransform: 'uppercase'
            }}>
              {person.type}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Person Badge Component - Compact inline display
 */
export const PersonBadge = ({ person, onClick, style = {} }) => {
  if (!person) return null;
  
  const displayName = getDisplayName(person);
  const initials = getInitials(person);
  const hasCompass = person.compassCrmLink || person.compassLink || person.crmLink;
  const hasPhone = person.phone;
  const hasEmail = person.email;
  
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: 'var(--primary)',
        color: 'white',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      title={displayName}
    >
      <span style={{ fontSize: 14, fontWeight: 900 }}>{initials}</span>
      <span>{displayName}</span>
      {hasCompass && <span style={{ opacity: 0.8 }}>🔗</span>}
      {hasPhone && <span style={{ opacity: 0.8 }}>📞</span>}
      {hasEmail && <span style={{ opacity: 0.8 }}>✉️</span>}
    </span>
  );
};

/**
 * Person Link Component - Clickable person name with hover effects
 */
export const PersonLink = ({ person, onClick, style = {}, compact = false }) => {
  if (!person) return null;
  
  const displayName = getDisplayName(person);
  const initials = getInitials(person);
  
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) onClick();
      }}
      style={{
        color: 'var(--primary)',
        textDecoration: 'none',
        borderBottom: '1px dotted var(--primary)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: compact ? 10 : 13,
        fontWeight: 600,
        ...style
      }}
      title={`Click to view ${displayName}'s details`}
      onMouseEnter={(e) => {
        e.target.style.borderBottomColor = 'var(--primary)';
        e.target.style.opacity = 0.8;
      }}
      onMouseLeave={(e) => {
        e.target.style.borderBottomColor = 'rgba(255, 107, 53, 0.5)';
        e.target.style.opacity = 1;
      }}
    >
      <span style={{ fontSize: compact ? 10 : 12 }}>{initials}</span>
      {displayName}
    </a>
  );
};

// Export all utilities for easy access
export default {
  getDisplayName,
  getInitials,
  getPersonRecordByName,
  PersonAvatar,
  PersonBadge,
  PersonLink
};

