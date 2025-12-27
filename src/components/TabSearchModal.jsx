// src/components/TabSearchModal.jsx
// ===========================================
// TAB SEARCH MODAL - Quick navigation with recent tabs
// ===========================================

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function TabSearchModal({ 
  isOpen, 
  onClose, 
  allNavItems = [], 
  currentTab = '',
  onTabChange = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTabs, setRecentTabs] = useState([]);
  const inputRef = useRef(null);

  // Load recent tabs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentTabs');
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentTabs(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('Failed to load recent tabs:', e);
      setRecentTabs([]);
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter tabs based on search query
  const filteredTabs = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return allNavItems.filter(item => !item.key.includes(':') || item.groupLabel);
    }
    
    const query = searchQuery.toLowerCase();
    return allNavItems.filter(item => {
      const label = (item.displayLabel || item.label || '').toLowerCase();
      const key = item.key.toLowerCase();
      return label.includes(query) || key.includes(query);
    });
  }, [searchQuery, allNavItems]);

  // Handle tab selection
  const handleTabSelect = (tabKey) => {
    // Update recent tabs
    try {
      const updated = [tabKey, ...recentTabs.filter(t => t !== tabKey)].slice(0, 10);
      setRecentTabs(updated);
      localStorage.setItem('recentTabs', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent tabs:', e);
    }

    // Navigate to tab
    onTabChange(tabKey);
    onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && filteredTabs.length > 0) {
      e.preventDefault();
      handleTabSelect(filteredTabs[0].key);
    }
  };

  if (!isOpen) return null;

  // Get recent tab items with full info
  const recentTabItems = recentTabs
    .map(tabKey => allNavItems.find(item => item.key === tabKey))
    .filter(Boolean)
    .slice(0, 8); // Show max 8 recent tabs

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          backgroundColor: 'var(--bg, #1a1a1a)',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '70vh',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border, #333)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border, #333)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tabs... (Press Enter to select first result, Esc to close)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              backgroundColor: 'var(--input-bg, #2a2a2a)',
              color: 'var(--text, #fff)',
              border: '1px solid var(--border, #333)',
              borderRadius: '8px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            autoFocus
          />
        </div>

        {/* Recent Tabs Chips */}
        {!searchQuery.trim() && recentTabItems.length > 0 && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #333)' }}>
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--text-light, #888)', 
              marginBottom: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Recent Tabs
            </div>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px' 
            }}>
              {recentTabItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleTabSelect(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: currentTab === item.key 
                      ? 'var(--primary, #ff6b35)' 
                      : 'var(--card-bg, #2a2a2a)',
                    color: currentTab === item.key 
                      ? '#fff' 
                      : 'var(--text, #fff)',
                    border: `1px solid ${currentTab === item.key 
                      ? 'var(--primary, #ff6b35)' 
                      : 'var(--border, #333)'}`,
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (currentTab !== item.key) {
                      e.target.style.backgroundColor = 'var(--hover-bg, #333)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTab !== item.key) {
                      e.target.style.backgroundColor = 'var(--card-bg, #2a2a2a)';
                    }
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.displayLabel || item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtered Results */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '12px 20px 20px 20px' 
        }}>
          {filteredTabs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--text-light, #888)',
              fontSize: '14px'
            }}>
              {searchQuery.trim() ? 'No tabs found' : 'Start typing to search tabs...'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredTabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleTabSelect(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: currentTab === item.key 
                      ? 'var(--primary, #ff6b35)' 
                      : 'transparent',
                    color: currentTab === item.key 
                      ? '#fff' 
                      : 'var(--text, #fff)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: currentTab === item.key ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (currentTab !== item.key) {
                      e.target.style.backgroundColor = 'var(--hover-bg, #2a2a2a)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTab !== item.key) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div>{item.displayLabel || item.label}</div>
                    {item.groupLabel && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: currentTab === item.key ? 'rgba(255,255,255,0.8)' : 'var(--text-light, #888)',
                        marginTop: '2px'
                      }}>
                        {item.groupLabel}
                      </div>
                    )}
                  </div>
                  {currentTab === item.key && (
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div style={{ 
          padding: '12px 20px', 
          borderTop: '1px solid var(--border, #333)',
          fontSize: '12px',
          color: 'var(--text-light, #888)',
          textAlign: 'center'
        }}>
          Press <kbd style={{ 
            padding: '2px 6px', 
            backgroundColor: 'var(--input-bg, #2a2a2a)', 
            borderRadius: '4px',
            border: '1px solid var(--border, #333)'
          }}>Enter</kbd> to select • <kbd style={{ 
            padding: '2px 6px', 
            backgroundColor: 'var(--input-bg, #2a2a2a)', 
            borderRadius: '4px',
            border: '1px solid var(--border, #333)'
          }}>Esc</kbd> to close
        </div>
      </div>
    </div>,
    document.body
  );
}

// Export to window for legacy compatibility
if (typeof window !== 'undefined') {
  window.TabSearchModal = TabSearchModal;
}

