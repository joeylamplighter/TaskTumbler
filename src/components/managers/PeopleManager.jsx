// js/features/managers/people-manager.jsx
// ===========================================
// PEOPLE MANAGER (Lite)
// - Single-root JSX (no adjacent JSX errors)
// - Search, Add, Edit, Delete
// - Stores basic fields: name, type, phone, email, notes
// - Closes via X or clicking outside overlay
// ===========================================

import React, { useState, useMemo, useEffect, useRef } from "react";
import { getDisplayName, getInitials } from "../../utils/personUtils";

export default function PeopleManager({ people, setPeople, onClose, tasks, onViewTask, history = [], locations = [], setLocations, setTasks, initialSelectedPersonId = null, notify }) {
  const safePeople = Array.isArray(people) ? people : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [editId, setEditId] = useState(null);

  // View mode state - 'cards', 'list', 'table', 'compact'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('peopleViewMode') || 'list'; // Default to list instead of cards
    } catch {
      return 'list';
    }
  });

  // Function to change view mode
  const changeViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('peopleViewMode', mode);
    } catch {}
  };


  // Refs for form fields to enable Enter key navigation
  const fieldRefs = {
    firstName: useRef(null),
    lastName: useRef(null),
    type: useRef(null),
    phone: useRef(null),
    email: useRef(null),
    weight: useRef(null),
    compassCrmLink: useRef(null),
    tags: useRef(null),
    links: useRef(null),
    notes: useRef(null)
  };
  // Column-wide collapse state (entire left panel collapses to letter width)
  // Load from localStorage to persist state
  const [isColumnCollapsed, setIsColumnCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('peopleManagerColumnCollapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

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
    locationIds: [],
    // New contact fields
    title: '', // Salutation (Mr., Mrs., Dr., etc.)
    company: '',
    organizations: '', // Multiple organizations (comma-separated)
    jobTitle: '',
    department: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    website: '',
    linkedin: '',
    twitter: '',
    assistantName: '',
    assistantPhone: '',
    assistantEmail: '',
    birthday: '',
    anniversary: '',
    profilePicture: '', // Can be URL, base64, emoji, or 'ai'
    profilePictureType: 'initials' // 'initials', 'emoji', 'upload', 'ai'
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

  // Fuzzy matching helper - checks if search term appears in any part of the searchable fields
  const fuzzyMatch = (person, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const searchableFields = [
      person?.firstName || '',
      person?.lastName || '',
      person?.name || '',
      person?.organization || person?.company || '',
      person?.email || '',
      person?.phone || '',
      person?.jobTitle || '',
      person?.notes || ''
    ].filter(Boolean).map(f => String(f).toLowerCase());
    
    // Check exact substring matches first (fastest)
    const haystack = searchableFields.join(' ');
    if (haystack.includes(q)) return true;
    
    // Fuzzy match: check if query words appear in any order
    const queryWords = q.split(/\s+/).filter(Boolean);
    if (queryWords.length === 1) {
      // Single word: check if it appears anywhere
      return searchableFields.some(field => field.includes(queryWords[0]));
    } else {
      // Multiple words: all must appear somewhere
      return queryWords.every(word => 
        searchableFields.some(field => field.includes(word))
      );
    }
  };

  const filtered = useMemo(() => {
    const q = (searchTerm || '').trim();
    if (!q) return safePeople;
    return safePeople.filter(p => fuzzyMatch(p, q));
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
      locationIds: [],
      title: '',
      company: '',
      organizations: '',
      jobTitle: '',
      department: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      website: '',
      linkedin: '',
      twitter: '',
      assistantName: '',
      assistantPhone: '',
      assistantEmail: '',
      birthday: '',
      anniversary: '',
      profilePicture: '',
      profilePictureType: 'initials'
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

    // Navigate to hash route for this person using ID
    if (p.id) {
      // Update hash to #person/id
      window.location.hash = `#person/${p.id}`;
    }
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
      locationIds: Array.isArray(p.locationIds) ? p.locationIds : [],
      title: p.title || '',
      company: p.company || '',
      organizations: Array.isArray(p.organizations) ? p.organizations.join(', ') : (p.organizations || ''),
      jobTitle: p.jobTitle || '',
      department: p.department || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      zipCode: p.zipCode || '',
      country: p.country || '',
      website: p.website || '',
      linkedin: p.linkedin || '',
      twitter: p.twitter || '',
      assistantName: p.assistantName || '',
      assistantPhone: p.assistantPhone || '',
      assistantEmail: p.assistantEmail || '',
      birthday: p.birthday || '',
      anniversary: p.anniversary || '',
      profilePicture: p.profilePicture || '',
      profilePictureType: p.profilePictureType || (p.profilePicture ? (p.profilePicture.startsWith('data:') ? 'upload' : (p.profilePicture.match(/^[\u{1F300}-\u{1F9FF}]$/u) ? 'emoji' : 'upload')) : 'initials')
    });
  };

  // Handle Enter key to save and move to next field
  const handleFieldEnter = (currentField, e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Field order for navigation
      const fieldOrder = ['firstName', 'lastName', 'type', 'phone', 'email', 'weight', 'compassCrmLink', 'tags', 'links', 'notes'];
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
        // Move to next field
        const nextField = fieldOrder[currentIndex + 1];
        const nextRef = fieldRefs[nextField];
        if (nextRef && nextRef.current) {
          nextRef.current.focus();
          // For select fields, open the dropdown
          if (nextField === 'type' && nextRef.current.tagName === 'SELECT') {
            nextRef.current.click();
          }
        }
      } else {
        // Last field - save the form
        handleSave();
      }
    }
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
      // New contact fields
      title: String(formData.title || '').trim(),
      company: String(formData.company || '').trim(),
      organizations: String(formData.organizations || '').trim().split(',').map(o => o.trim()).filter(Boolean),
      jobTitle: String(formData.jobTitle || '').trim(),
      department: String(formData.department || '').trim(),
      address: String(formData.address || '').trim(),
      city: String(formData.city || '').trim(),
      state: String(formData.state || '').trim(),
      zipCode: String(formData.zipCode || '').trim(),
      country: String(formData.country || '').trim(),
      website: String(formData.website || '').trim(),
      linkedin: String(formData.linkedin || '').trim(),
      twitter: String(formData.twitter || '').trim(),
      assistantName: String(formData.assistantName || '').trim(),
      assistantPhone: String(formData.assistantPhone || '').trim(),
      assistantEmail: String(formData.assistantEmail || '').trim(),
      birthday: String(formData.birthday || '').trim(),
      anniversary: String(formData.anniversary || '').trim(),
      profilePicture: String(formData.profilePicture || '').trim(),
      profilePictureType: formData.profilePictureType || 'initials',
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

  // Profile picture handlers
  const handleProfilePictureUpload = (file, personId) => {
    if (!file || !personId) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      const updatedPeople = safePeople.map(p => 
        p.id === personId 
          ? { ...p, profilePicture: base64String, profilePictureType: 'upload', updatedAt: new Date().toISOString() }
          : p
      );
      setPeople?.(updatedPeople);
      notify?.('Profile picture uploaded!', '✅');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIPicture = async (personId, displayName, promptText = '', style = 'avataaars') => {
    if (!personId || !displayName) return;
    
    try {
      notify?.('Generating AI profile picture...', '⏳');
      const person = safePeople.find(p => p.id === personId);
      if (!person) return;
      
      // Use DiceBear API for AI-generated avatars
      // Combine display name with prompt text to create a unique seed
      let seed = displayName.toLowerCase().replace(/\s+/g, '-');
      if (promptText && promptText.trim()) {
        // Include prompt in seed for variation, but keep it deterministic
        const promptHash = promptText.trim().toLowerCase().replace(/\s+/g, '-').substring(0, 20);
        seed = `${seed}-${promptHash}`;
      }
      
      const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      
      // Convert SVG URL to base64 by fetching it
      try {
        const response = await fetch(avatarUrl);
        const svgText = await response.text();
        const base64Svg = `data:image/svg+xml;base64,${btoa(svgText)}`;
        
        const updatedPeople = safePeople.map(p => 
          p.id === personId 
            ? { ...p, profilePicture: base64Svg, profilePictureType: 'ai', updatedAt: new Date().toISOString() }
            : p
        );
        setPeople?.(updatedPeople);
        notify?.('AI profile picture generated!', '✨');
        
        // Refresh if viewing this person
        if (viewingId === personId) {
          const updatedPerson = updatedPeople.find(p => p.id === personId);
          if (updatedPerson) {
            // Trigger re-render by updating state
            setTimeout(() => {
              startView(updatedPerson);
            }, 100);
          }
        }
      } catch (fetchError) {
        // Fallback to URL if fetch fails
        const updatedPeople = safePeople.map(p => 
          p.id === personId 
            ? { ...p, profilePicture: avatarUrl, profilePictureType: 'ai', updatedAt: new Date().toISOString() }
            : p
        );
        setPeople?.(updatedPeople);
        notify?.('AI profile picture generated!', '✨');
      }
    } catch (error) {
      console.error('Error generating AI photo:', error);
      notify?.('Failed to generate AI photo. Please try again.', '❌');
    }
  };

  const handleSetEmoji = (personId, emoji) => {
    if (!personId || !emoji) return;
    const updatedPeople = safePeople.map(p => 
      p.id === personId 
        ? { ...p, profilePicture: emoji, profilePictureType: 'emoji', updatedAt: new Date().toISOString() }
        : p
    );
    setPeople?.(updatedPeople);
    notify?.('Emoji profile picture set!', '✅');
  };

  const toggleColumnCollapse = () => {
    setIsColumnCollapsed(prev => {
      const newState = !prev;
      // Persist to localStorage
      try {
        localStorage.setItem('peopleManagerColumnCollapsed', String(newState));
      } catch (e) {
        console.error('Error saving collapse state:', e);
      }
      return newState;
    });
  };

  // Generate comprehensive test sample data
  const handleLoadTestSamples = () => {
    const now = new Date();
    const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sample Locations with all fields
    const sampleLocations = [
      {
        id: generateId('loc'),
        name: 'Downtown Office',
        label: 'Downtown Office',
        address: '123 Main Street, Suite 500, New York, NY 10001',
        type: 'client',
        notes: 'Primary client office location. Parking available in adjacent garage. Building has security desk on ground floor.',
        lat: 40.7128,
        lon: -74.0060,
        coords: { lat: 40.7128, lon: -74.0060 },
        resolvedAddress: '123 Main Street, Suite 500, New York, NY 10001, USA',
        googleMapsLink: 'https://www.google.com/maps?q=40.7128,-74.0060',
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('loc'),
        name: 'Warehouse Distribution Center',
        label: 'Warehouse Distribution Center',
        address: '456 Industrial Blvd, Newark, NJ 07102',
        type: 'vendor',
        notes: 'Main warehouse for inventory storage and distribution. Access via loading dock on west side.',
        lat: 40.7357,
        lon: -74.1724,
        coords: { lat: 40.7357, lon: -74.1724 },
        resolvedAddress: '456 Industrial Blvd, Newark, NJ 07102, USA',
        googleMapsLink: 'https://www.google.com/maps?q=40.7357,-74.1724',
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('loc'),
        name: 'Home Office',
        label: 'Home Office',
        address: '789 Oak Avenue, Brooklyn, NY 11201',
        type: 'personal',
        notes: 'Personal home office space. Quiet neighborhood, good for focused work.',
        lat: 40.6782,
        lon: -73.9442,
        coords: { lat: 40.6782, lon: -73.9442 },
        resolvedAddress: '789 Oak Avenue, Brooklyn, NY 11201, USA',
        googleMapsLink: 'https://www.google.com/maps?q=40.6782,-73.9442',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('loc'),
        name: 'Client Meeting Space',
        label: 'Client Meeting Space',
        address: '321 Park Avenue, 12th Floor, New York, NY 10022',
        type: 'project',
        notes: 'Shared co-working space for client meetings. Requires reservation. Coffee and WiFi included.',
        lat: 40.7589,
        lon: -73.9710,
        coords: { lat: 40.7589, lon: -73.9710 },
        resolvedAddress: '321 Park Avenue, 12th Floor, New York, NY 10022, USA',
        googleMapsLink: 'https://www.google.com/maps?q=40.7589,-73.9710',
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Sample People with all fields
    const samplePeople = [
      {
        id: generateId('p'),
        name: 'Alice Johnson',
        firstName: 'Alice',
        lastName: 'Johnson',
        type: 'client',
        phone: '(555) 123-4567',
        email: 'alice.johnson@example.com',
        notes: 'Primary contact for Q1 2025 project. Prefers email communication during business hours. Very responsive and organized.',
        tags: ['vip', 'buyer', 'priority-client'],
        weight: 3,
        compassCrmLink: 'https://compass.com/crm/contacts/alice-johnson',
        links: ['https://www.linkedin.com/in/alicejohnson', 'https://github.com/alicej'],
        locationIds: [sampleLocations[0].id, sampleLocations[3].id],
        createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('p'),
        name: 'Bob Martinez',
        firstName: 'Bob',
        lastName: 'Martinez',
        type: 'vendor',
        phone: '(555) 234-5678',
        email: 'bob.martinez@vendorcorp.com',
        notes: 'Warehouse manager. Best reached by phone between 8am-5pm EST. Handles all inventory and shipping logistics.',
        tags: ['vendor', 'warehouse', 'logistics'],
        weight: 2,
        compassCrmLink: '',
        links: ['https://vendorcorp.com/contacts/bob-martinez'],
        locationIds: [sampleLocations[1].id],
        createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('p'),
        name: 'Carol Williams',
        firstName: 'Carol',
        lastName: 'Williams',
        type: 'lead',
        phone: '(555) 345-6789',
        email: 'carol.williams@prospect.com',
        notes: 'Hot lead from referral. Interested in premium package. Follow up scheduled for next week.',
        tags: ['lead', 'hot', 'premium', 'referral'],
        weight: 4,
        compassCrmLink: 'https://compass.com/crm/leads/carol-williams',
        links: [],
        locationIds: [],
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('p'),
        name: 'David Chen',
        firstName: 'David',
        lastName: 'Chen',
        type: 'agent',
        phone: '(555) 456-7890',
        email: 'david.chen@realestate.com',
        notes: 'Real estate agent partner. Specializes in commercial properties. Excellent network and connections.',
        tags: ['agent', 'commercial', 'partner'],
        weight: 3,
        compassCrmLink: 'https://compass.com/agents/david-chen',
        links: ['https://www.linkedin.com/in/davidchen', 'https://davidchen.realestate.com'],
        locationIds: [sampleLocations[3].id],
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Sample Tasks associated with people
    const sampleTasks = [
      {
        id: generateId('task'),
        title: 'Q1 Project Kickoff Meeting with Alice',
        description: 'Initial meeting to discuss project scope, timeline, and deliverables for Q1 2025 initiative. Review contract details and set up project management tools.',
        category: 'Work',
        priority: 'High',
        weight: 15,
        estimatedTime: '90',
        estimatedTimeUnit: 'min',
        startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '10:00',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '11:30',
        reminderMode: 'start',
        reminderAnchor: 'start',
        reminderOffsetValue: 15,
        reminderOffsetUnit: 'minutes',
        recurring: 'None',
        excludeFromTumbler: false,
        subtasks: [
          { id: generateId('sub'), title: 'Prepare presentation slides', completed: false },
          { id: generateId('sub'), title: 'Review contract draft', completed: true },
          { id: generateId('sub'), title: 'Book meeting room', completed: false }
        ],
        tags: ['meeting', 'q1-project', 'client'],
        people: ['Alice Johnson', 'Bob Martinez', 'Carol Williams'],
        location: 'Downtown Office',
        locationCoords: { lat: 40.7128, lon: -74.0060 },
        percentComplete: 40,
        completed: false,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('task'),
        title: 'Warehouse Inventory Audit with Bob',
        description: 'Conduct quarterly inventory audit at warehouse. Verify stock levels, check for damaged goods, and update inventory management system. Bob will provide access and assist with documentation.',
        category: 'Work',
        priority: 'Medium',
        weight: 20,
        estimatedTime: '240',
        estimatedTimeUnit: 'min',
        startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '09:00',
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '13:00',
        reminderMode: 'due',
        reminderAnchor: 'due',
        reminderOffsetValue: 1,
        reminderOffsetUnit: 'days',
        recurring: 'None',
        excludeFromTumbler: false,
        subtasks: [
          { id: generateId('sub'), title: 'Schedule with Bob', completed: true },
          { id: generateId('sub'), title: 'Print audit checklist', completed: false },
          { id: generateId('sub'), title: 'Bring laptop for data entry', completed: false }
        ],
        tags: ['inventory', 'audit', 'warehouse', 'quarterly'],
        people: ['Bob Martinez', 'David Chen', 'Alice Johnson'],
        location: 'Warehouse Distribution Center',
        locationCoords: { lat: 40.7357, lon: -74.1724 },
        percentComplete: 25,
        completed: false,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('task'),
        title: 'Follow-up Call with Carol - Premium Package Demo',
        description: 'Follow up on initial inquiry about premium package. Schedule demo session, answer questions, and provide pricing information. This is a hot lead from referral source.',
        category: 'Sales',
        priority: 'High',
        weight: 12,
        estimatedTime: '45',
        estimatedTimeUnit: 'min',
        startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '14:00',
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '14:45',
        reminderMode: 'start',
        reminderAnchor: 'start',
        reminderOffsetValue: 30,
        reminderOffsetUnit: 'minutes',
        recurring: 'None',
        excludeFromTumbler: false,
        subtasks: [
          { id: generateId('sub'), title: 'Prepare demo materials', completed: false },
          { id: generateId('sub'), title: 'Review referral notes', completed: true },
          { id: generateId('sub'), title: 'Prepare pricing sheet', completed: false }
        ],
        tags: ['sales', 'demo', 'premium', 'hot-lead', 'follow-up'],
        people: ['Carol Williams', 'Alice Johnson', 'Bob Martinez'],
        location: '',
        locationCoords: null,
        percentComplete: 30,
        completed: false,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: generateId('task'),
        title: 'Property Site Visit with David and Alice',
        description: 'Joint property viewing with both agent (David) and client (Alice). Review commercial property at downtown location. Discuss potential use cases and renovation requirements.',
        category: 'Real Estate',
        priority: 'High',
        weight: 18,
        estimatedTime: '120',
        estimatedTimeUnit: 'min',
        startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '15:00',
        dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: '17:00',
        reminderMode: 'start',
        reminderAnchor: 'start',
        reminderOffsetValue: 1,
        reminderOffsetUnit: 'hours',
        recurring: 'None',
        excludeFromTumbler: false,
        subtasks: [
          { id: generateId('sub'), title: 'Coordinate schedules with both parties', completed: false },
          { id: generateId('sub'), title: 'Print property information packet', completed: false },
          { id: generateId('sub'), title: 'Prepare questions for property owner', completed: false }
        ],
        tags: ['property', 'site-visit', 'commercial', 'client-meeting'],
        people: ['David Chen', 'Alice Johnson', 'Carol Williams'],
        location: 'Client Meeting Space',
        locationCoords: { lat: 40.7589, lon: -73.9710 },
        percentComplete: 10,
        completed: false,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Add locations if setLocations is provided
    if (setLocations) {
      setLocations(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        // Merge with existing, avoiding duplicates by name
        const existingNames = new Set(existing.map(l => (l.name || l.label || '').toLowerCase()));
        const newLocs = sampleLocations.filter(l => !existingNames.has((l.name || l.label || '').toLowerCase()));
        return [...existing, ...newLocs];
      });
    } else if (window.DataManager?.locations?.setAll) {
      window.DataManager.locations.setAll([...(window.DataManager.locations.getAll() || []), ...sampleLocations]);
    } else if (typeof window.setSavedLocationsV1 === 'function') {
      const existing = window.getSavedLocationsV1?.() || [];
      const existingNames = new Set(existing.map(l => (l.name || l.label || '').toLowerCase()));
      const newLocs = sampleLocations.filter(l => !existingNames.has((l.name || l.label || '').toLowerCase()));
      window.setSavedLocationsV1([...existing, ...newLocs]);
    }

    // Add people if setPeople is provided
    if (setPeople) {
      setPeople(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        // Merge with existing, avoiding duplicates by name
        const existingNames = new Set(existing.map(p => {
          const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
          return name.toLowerCase();
        }));
        const newPeople = samplePeople.filter(p => {
          const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
          return !existingNames.has(name.toLowerCase());
        });
        return [...existing, ...newPeople];
      });
    } else if (window.DataManager?.people?.setAll) {
      const existing = window.DataManager.people.getAll() || [];
      const existingNames = new Set(existing.map(p => {
        const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
        return name.toLowerCase();
      }));
      const newPeople = samplePeople.filter(p => {
        const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
        return !existingNames.has(name.toLowerCase());
      });
      window.DataManager.people.setAll([...existing, ...newPeople]);
    }

    // Add tasks if setTasks is provided
    if (setTasks) {
      setTasks(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        return [...existing, ...sampleTasks];
      });
    } else if (window.updateTask) {
      sampleTasks.forEach(task => {
        window.updateTask(task);
      });
    }

    // Notify user
    const notifyFn = window.notify || ((msg, icon) => console.log(icon, msg));
    notifyFn('Test sample data loaded!', '✅');
  };

  const onEditKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isEditing) {
        // If editing, cancel edit first
        resetForm();
      } else {
        // Always close modal on ESC (not just go back to list)
        console.log('ESC pressed, closing PeopleManager modal');
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


  // Auto-select person if initialSelectedPersonId is provided
  useEffect(() => {
    if (!initialSelectedPersonId || safePeople.length === 0) {
      return;
    }
    
    console.log('PeopleManager: initialSelectedPersonId changed to:', initialSelectedPersonId, 'safePeople.length:', safePeople.length);
    
    // Try to find by ID first
    let person = safePeople.find(p => p.id === initialSelectedPersonId);
    
    // If not found by ID, try to find by name (for permalinks using encoded names)
    if (!person) {
      try {
        const decodedName = decodeURIComponent(initialSelectedPersonId);
        person = safePeople.find(p => {
          const personName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ');
          return personName === decodedName || 
                 p.id === decodedName ||
                 (p.firstName && p.lastName && `${p.firstName} ${p.lastName}` === decodedName);
        });
      } catch (e) {
        // If decode fails, try direct match
        person = safePeople.find(p => {
          const personName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ');
          return personName === initialSelectedPersonId || p.id === initialSelectedPersonId;
        });
      }
    }
    
    // Always open the person view if found (regardless of current state)
    if (person) {
      console.log('PeopleManager: Found person, opening view:', person.id, getDisplayName(person));
      // Use a small delay to ensure modal is fully rendered
      const timeoutId = setTimeout(() => {
        startView(person);
      }, 50);
      return () => clearTimeout(timeoutId);
    } else {
      console.warn('PeopleManager: Person not found for initialSelectedPersonId:', initialSelectedPersonId, 'Available people:', safePeople.map(p => ({ id: p.id, name: p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedPersonId]);

  // Helper function to get stats for a person
  const getPersonStats = (person) => {
    const personTasks = (tasks || []).filter(t => {
      const assignedPeople = t.assignedPeople || t.people || [];
      return assignedPeople.includes(person.name) ||
             assignedPeople.includes(getDisplayName(person));
    });

    const personHistory = safeHistory.filter(h => {
      const hp = h.people || [];
      return hp.includes(person.name) || hp.includes(getDisplayName(person));
    });

    const totalTime = personHistory.reduce((sum, h) => sum + (h.duration || 0), 0);
    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;

    let timeStr = '';
    if (hours > 0) {
      timeStr = hours + 'h';
    } else if (minutes > 0) {
      timeStr = minutes + 'm';
    } else {
      timeStr = '0m';
    }

    return {
      taskCount: personTasks.length,
      timeDisplay: timeStr
    };
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        // Only close if clicking the overlay itself, not a child
        if (e.target === e.currentTarget) {
          console.log('Overlay clicked, calling onClose');
          onClose?.();
        }
      }}
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
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Row: Title, View Modes, and Add Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div 
              onClick={() => {
                // If in cards view, switch to list view first
                if (viewMode === 'cards') {
                  changeViewMode('list');
                  // Collapse after a brief delay to allow view mode to update
                  setTimeout(() => {
                    setIsColumnCollapsed(true);
                    try {
                      localStorage.setItem('peopleManagerColumnCollapsed', 'true');
                    } catch (e) {
                      console.error('Error saving collapse state:', e);
                    }
                  }, 100);
                } else if (viewMode === 'table') {
                  // Table view doesn't have a sidebar, so clicking does nothing
                  return;
                } else {
                  // In list/compact views, toggle collapse
                  toggleColumnCollapse();
                }
              }}
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: 'var(--text-light)',
                textTransform: 'uppercase',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}
              title="Click to collapse sidebar (shows only profile photos/initials)"
            >
              People
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* View Mode Buttons */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--input-bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                <button
                  onClick={() => changeViewMode('cards')}
                  title="Cards View"
                  style={{
                    background: viewMode === 'cards' ? '#FF6B35' : 'transparent',
                    color: viewMode === 'cards' ? 'white' : 'var(--text)',
                    border: 'none',
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  🎴
                </button>
                <button
                  onClick={() => changeViewMode('list')}
                  title="List View"
                  style={{
                    background: viewMode === 'list' ? '#FF6B35' : 'transparent',
                    color: viewMode === 'list' ? 'white' : 'var(--text)',
                    border: 'none',
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  📄
                </button>
                <button
                  onClick={() => changeViewMode('table')}
                  title="Table View"
                  style={{
                    background: viewMode === 'table' ? '#FF6B35' : 'transparent',
                    color: viewMode === 'table' ? 'white' : 'var(--text)',
                    border: 'none',
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  📊
                </button>
                <button
                  onClick={() => changeViewMode('compact')}
                  title="Compact View"
                  style={{
                    background: viewMode === 'compact' ? '#FF6B35' : 'transparent',
                    color: viewMode === 'compact' ? 'white' : 'var(--text)',
                    border: 'none',
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  ⚡
                </button>
              </div>

              <button
                onClick={startAdd}
                title="Add person"
                style={{
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#FF8555';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#FF6B35';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
                }}
              >
                + Add New
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('Close button clicked, calling onClose');
                  onClose?.();
                }}
                title="Close"
                style={{
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  lineHeight: 1,
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--input-bg)';
                  e.target.style.color = 'var(--primary)';
                  e.target.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--text)';
                  e.target.style.borderColor = 'var(--border)';
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Search Row */}
          <input
            className="f-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search people…"
            style={{ marginBottom: 0, background: 'var(--input-bg)', fontSize: 15 }}
          />
        </div>

        {/* BODY */}
        {viewMode === 'cards' ? (
          // Cards Grid View
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-light)', opacity: 0.7 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No people yet</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Click "+ Add New" to create your first contact</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '16px',
                maxWidth: '1400px',
                margin: '0 auto'
              }}>
                {filtered.map(p => {
                  const displayName = getDisplayName(p);
                  const initials = getInitials(p);
                  const stats = getPersonStats(p);
                  const type = (p.type || 'client');

                  return (
                    <div
                      key={p.id}
                      onClick={() => startView(p)}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      {/* Initials Circle */}
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'var(--input-bg)',
                        border: '2px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: 24,
                        color: 'var(--text)',
                        marginBottom: 12
                      }}>
                        {initials}
                      </div>

                      {/* Name */}
                      <div style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: 'var(--text)',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%'
                      }}>
                        {displayName}
                      </div>

                      {/* Type */}
                      <div style={{
                        fontSize: 12,
                        color: 'var(--text-light)',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        marginBottom: 12
                      }}>
                        {type}
                      </div>

                      {/* Stats */}
                      <div style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 13,
                          color: 'var(--text)'
                        }}>
                          <span style={{ fontSize: 14 }}>📋</span>
                          <span style={{ fontWeight: 600 }}>{stats.taskCount}</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 13,
                          color: '#FF6B35'
                        }}>
                          <span style={{ fontSize: 14 }}>⏱️</span>
                          <span style={{ fontWeight: 600 }}>{stats.timeDisplay}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          // TABLE VIEW - Full width table (no split layout)
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-light)', opacity: 0.7 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No people yet</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Click "+ Add New" to create your first contact</div>
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--input-bg)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Phone</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Company</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Job Title</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', width: 50 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const displayName = getDisplayName(p);
                      const isSelected = viewingId === p.id || editId === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => startView(p)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            background: isSelected ? 'rgba(255,107,53,0.1)' : 'transparent',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--input-bg)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>{displayName}</td>
                          <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-light)' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              background: 'rgba(255,107,53,0.15)',
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              {(p.type || 'client').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>{p.email || '-'}</td>
                          <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>{p.phone || '-'}</td>
                          <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>{p.company || '-'}</td>
                          <td style={{ padding: '12px', fontSize: 13, color: 'var(--text)' }}>{p.jobTitle || '-'}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                              className="btn-white-outline"
                              title="Delete"
                              style={{ width: 28, height: 28, borderRadius: 6, opacity: 0.8, padding: 0, fontSize: 12 }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Show detail view in a side panel or modal when row is clicked */}
            {viewingId && !isEditing && (
              <>
                {/* Backdrop overlay */}
                <div 
                  style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.3)',
                    zIndex: 999
                  }}
                  onClick={() => {
                    setViewingId(null);
                    // Clear hash when closing person view
                    if (window.location.hash.includes('#person/') || window.location.hash.includes('#people/')) {
                      window.location.hash = '#people';
                    }
                  }}
                />
                {/* Side panel */}
                <div style={{
                  position: 'fixed',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '400px',
                  background: 'var(--card)',
                  borderLeft: '1px solid var(--border)',
                  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  overflowY: 'auto',
                  padding: '20px'
                }}>
                  <button
                    onClick={() => {
                      setViewingId(null);
                      // Clear hash when closing person view
                      if (window.location.hash.includes('#person/') || window.location.hash.includes('#people/')) {
                        window.location.hash = '#people';
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 20,
                      cursor: 'pointer',
                      color: 'var(--text-light)',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      zIndex: 1
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'var(--input-bg)';
                      e.target.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = 'var(--text-light)';
                    }}
                    title="Back to list"
                  >
                    ×
                  </button>
                  <PersonView
                    person={safePeople.find(p => p.id === viewingId)}
                    onEdit={() => {
                      const person = safePeople.find(p => p.id === viewingId);
                      if (person) startEdit(person);
                    }}
                    tasks={tasks || []}
                    history={safeHistory}
                    onViewTask={onViewTask}
                    setPeople={setPeople}
                    safePeople={safePeople}
                    notify={notify}
                    onProfilePictureUpload={handleProfilePictureUpload}
                    onGenerateAIPicture={handleGenerateAIPicture}
                    onSetEmoji={handleSetEmoji}
                    locations={locations || []}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          // Split Layout (for list and compact views)
          <div style={{ display: 'flex', minHeight: 0, flex: 1 }}>
            {/* LIST - Collapsible Column */}
            <div style={{
              width: isColumnCollapsed ? 60 : '30%',
              minWidth: isColumnCollapsed ? 60 : 200,
              maxWidth: isColumnCollapsed ? 60 : 350,
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              transition: 'width 0.3s ease',
              display: 'flex',
              flexDirection: 'column'
            }}>
            {/* Column Header - Only show when expanded */}
            {!isColumnCollapsed && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-light)', fontWeight: 700 }}>
                {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
              </div>
            )}
            
            {filtered.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-light)', opacity: 0.7, fontStyle: 'italic', textAlign: 'center', fontSize: isColumnCollapsed ? 10 : 13 }}>
                {isColumnCollapsed ? '0' : 'No people yet.'}
              </div>
            ) : isColumnCollapsed ? (
              // Collapsed: Just show profile pictures/initials vertically
              filtered.map(p => {
                const initials = getInitials(p);
                const displayName = getDisplayName(p);
                const isSelected = viewingId === p.id || editId === p.id;
                const picType = p.profilePictureType || 'initials';
                const pic = p.profilePicture;
                
                // Helper to render profile picture for collapsed view
                const renderProfilePicture = () => {
                  if (picType === 'emoji' && pic) {
                    return (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20
                      }}>
                        {pic}
                      </div>
                    );
                  } else if ((picType === 'upload' || picType === 'ai') && pic) {
                    return (
                      <img 
                        src={pic} 
                        alt={displayName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'
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
                        fontSize: 16,
                        color: isSelected ? 'white' : 'var(--text)'
                      }}>
                        {initials}
                      </div>
                    );
                  }
                };
                
                return (
                  <div
                    key={p.id}
                    onClick={() => startView(p)}
                    style={{
                      padding: '12px 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'rgba(255,107,53,0.15)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--primary)' : 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    title={`${displayName}${p.type ? ` (${p.type})` : ''}`}
                  >
                    <div style={{
                      width: 36, 
                      height: 36, 
                      borderRadius: '50%',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: (picType === 'initials' || !pic) 
                        ? (isSelected ? 'var(--primary)' : 'var(--input-bg)')
                        : 'transparent',
                      overflow: 'hidden'
                    }}>
                      {renderProfilePicture()}
                    </div>
                  </div>
                );
              })
            ) : viewMode === 'compact' ? (
              // COMPACT VIEW - Ultra-compact list items (minimal padding, smaller elements)
              filtered.map(p => {
                const displayName = getDisplayName(p);
                const initials = getInitials(p);
                const isSelected = viewingId === p.id || editId === p.id;
                const picType = p.profilePictureType || 'initials';
                const pic = p.profilePicture;
                
                // Helper to render profile picture (smaller for compact)
                const renderProfilePicture = () => {
                  if (picType === 'emoji' && pic) {
                    return <div style={{ fontSize: 12 }}>{pic}</div>;
                  } else if ((picType === 'upload' || picType === 'ai') && pic) {
                    return (
                      <img 
                        src={pic} 
                        alt={displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    );
                  } else {
                    return <div style={{ fontWeight: 900, fontSize: 9 }}>{initials}</div>;
                  }
                };
                
                return (
                  <div
                    key={p.id}
                    onClick={() => startView(p)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isSelected ? 'rgba(255,107,53,0.1)' : 'transparent',
                      borderLeft: isSelected ? '2px solid var(--primary)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--input-bg)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: (picType === 'initials' || !pic) ? 'var(--input-bg)' : 'transparent',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {renderProfilePicture()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        color: 'var(--text)', 
                        fontSize: 12, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3
                      }}>
                        {displayName}
                      </div>
                      <div style={{ 
                        fontSize: 10, 
                        color: 'var(--text-light)', 
                        opacity: 0.7, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2
                      }}>
                        {(p.type || 'client').toUpperCase()}
                        {p.email && ` • ${p.email.substring(0, 20)}${p.email.length > 20 ? '...' : ''}`}
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="btn-white-outline"
                      title="Delete"
                      style={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: 4, 
                        opacity: 0.6, 
                        padding: 0, 
                        fontSize: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 20
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.background = 'rgba(255,107,53,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.6';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            ) : (
              // LIST VIEW - Expanded: Show full details with profile pictures
              filtered.map(p => {
                const displayName = getDisplayName(p);
                const initials = getInitials(p);
                const isSelected = viewingId === p.id || editId === p.id;
                const picType = p.profilePictureType || 'initials';
                const pic = p.profilePicture;
                
                // Helper to render profile picture
                const renderProfilePicture = () => {
                  if (picType === 'emoji' && pic) {
                    return (
                      <div style={{ fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        {pic}
                      </div>
                    );
                  } else if ((picType === 'upload' || picType === 'ai') && pic) {
                    return (
                      <img 
                        src={pic} 
                        alt={displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                      />
                    );
                  } else {
                    return <div style={{ fontWeight: 900, fontSize: 14 }}>{initials}</div>;
                  }
                };
                
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
                      borderLeft: isSelected ? '3px solid var(--primary)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 36, 
                      height: 36, 
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: (picType === 'initials' || !pic) ? 'var(--input-bg)' : 'transparent',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {renderProfilePicture()}
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
                      style={{ width: 32, height: 32, borderRadius: 8, opacity: 0.8, padding: 0, fontSize: 14 }}
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
                tasks={tasks || []}
                history={safeHistory}
                onViewTask={onViewTask}
                setPeople={setPeople}
                safePeople={safePeople}
                notify={notify}
                onProfilePictureUpload={handleProfilePictureUpload}
                onGenerateAIPicture={handleGenerateAIPicture}
                onSetEmoji={handleSetEmoji}
                locations={locations || []}
              />
            ) : isEditing ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 120px' }}>
                    <label className="f-label">Title</label>
                    <input
                      className="f-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Mr., Mrs., Dr., etc."
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">First Name</label>
                    <input
                      ref={fieldRefs.firstName}
                      className="f-input"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      onKeyDown={(e) => handleFieldEnter('firstName', e)}
                      placeholder="First name…"
                      autoFocus
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Last Name</label>
                    <input
                      ref={fieldRefs.lastName}
                      className="f-input"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      onKeyDown={(e) => handleFieldEnter('lastName', e)}
                      placeholder="Last name…"
                    />
                  </div>

                  <div style={{ flex: '0 0 200px' }}>
                    <label className="f-label">Type</label>
                    <select
                      ref={fieldRefs.type}
                      className="f-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      onKeyDown={(e) => handleFieldEnter('type', e)}
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
                      ref={fieldRefs.phone}
                      className="f-input"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      onKeyDown={(e) => handleFieldEnter('phone', e)}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div style={{ flex: '1 1 240px' }}>
                    <label className="f-label">Email</label>
                    <input
                      ref={fieldRefs.email}
                      className="f-input"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onKeyDown={(e) => handleFieldEnter('email', e)}
                      placeholder="name@email.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Weight</label>
                    <input
                      ref={fieldRefs.weight}
                      type="number"
                      className="f-input"
                      min="1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                      onKeyDown={(e) => handleFieldEnter('weight', e)}
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Compass CRM Link</label>
                    <input
                      ref={fieldRefs.compassCrmLink}
                      className="f-input"
                      value={formData.compassCrmLink}
                      onChange={(e) => setFormData({ ...formData, compassCrmLink: e.target.value })}
                      onKeyDown={(e) => handleFieldEnter('compassCrmLink', e)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">Company</label>
                    <input
                      className="f-input"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>

                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">Organizations</label>
                    <input
                      className="f-input"
                      value={formData.organizations}
                      onChange={(e) => setFormData({ ...formData, organizations: e.target.value })}
                      placeholder="Organization 1, Organization 2, ..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">Job Title</label>
                    <input
                      className="f-input"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder="Job title"
                    />
                  </div>

                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">Department</label>
                    <input
                      className="f-input"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Department"
                    />
                  </div>
                </div>

                <div>
                  <label className="f-label">Address</label>
                  <input
                    className="f-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">City</label>
                    <input
                      className="f-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>

                  <div style={{ flex: '1 1 150px' }}>
                    <label className="f-label">State</label>
                    <input
                      className="f-input"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>

                  <div style={{ flex: '1 1 120px' }}>
                    <label className="f-label">Zip Code</label>
                    <input
                      className="f-input"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      placeholder="Zip"
                    />
                  </div>

                  <div style={{ flex: '1 1 150px' }}>
                    <label className="f-label">Country</label>
                    <input
                      className="f-input"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">Website</label>
                    <input
                      className="f-input"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">LinkedIn</label>
                    <input
                      className="f-input"
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="f-label">Twitter/X</label>
                  <input
                    className="f-input"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="@username or URL"
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <label className="f-label">Assistant Name</label>
                    <input
                      className="f-input"
                      value={formData.assistantName}
                      onChange={(e) => setFormData({ ...formData, assistantName: e.target.value })}
                      placeholder="Assistant's name"
                    />
                  </div>

                  <div style={{ flex: '1 1 240px' }}>
                    <label className="f-label">Assistant Phone</label>
                    <input
                      className="f-input"
                      type="tel"
                      value={formData.assistantPhone}
                      onChange={(e) => setFormData({ ...formData, assistantPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div style={{ flex: '1 1 240px' }}>
                    <label className="f-label">Assistant Email</label>
                    <input
                      className="f-input"
                      type="email"
                      value={formData.assistantEmail}
                      onChange={(e) => setFormData({ ...formData, assistantEmail: e.target.value })}
                      placeholder="assistant@email.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Birthday</label>
                    <input
                      className="f-input"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label className="f-label">Anniversary</label>
                    <input
                      className="f-input"
                      type="date"
                      value={formData.anniversary}
                      onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="f-label">Tags</label>
                  <input
                    ref={fieldRefs.tags}
                    className="f-input"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    onKeyDown={(e) => handleFieldEnter('tags', e)}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div>
                  <label className="f-label">Links</label>
                  <textarea
                    ref={fieldRefs.links}
                    className="f-input"
                    value={formData.links}
                    onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                    onKeyDown={(e) => {
                      // Allow Shift+Enter for new lines, but Enter alone moves to next field
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleFieldEnter('links', e);
                      }
                    }}
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
                    ref={fieldRefs.notes}
                    className="f-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    onKeyDown={(e) => {
                      // Allow Shift+Enter for new lines, but Enter alone saves
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleFieldEnter('notes', e);
                      }
                    }}
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
        )}
      </div>
    </div>
  );
}

// Person View Component
function PersonView({ person, onEdit, tasks, onViewTask, history = [], setPeople, safePeople, notify, onProfilePictureUpload, onGenerateAIPicture, onSetEmoji, locations = [] }) {
  if (!person) return null;

  const displayName = getDisplayName(person);
  const initials = getInitials(person);
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const fileInputRef = React.useRef(null);
  const profilePicMenuRef = React.useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showProfilePicMenu, setShowProfilePicMenu] = React.useState(false);
  const [showAIPrompt, setShowAIPrompt] = React.useState(false);
  const [aiPromptText, setAiPromptText] = React.useState('');
  const [aiPromptStyle, setAiPromptStyle] = React.useState('avataaars');
  const [tasksCompactView, setTasksCompactView] = React.useState(true);
  const [newNoteText, setNewNoteText] = React.useState('');
  const [showNoteInput, setShowNoteInput] = React.useState(false);
  
  // Close profile pic menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilePicMenuRef.current && !profilePicMenuRef.current.contains(event.target)) {
        setShowProfilePicMenu(false);
      }
    };
    if (showProfilePicMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfilePicMenu]);
  
  // Helper to normalize people names in history items
  const normalizePeopleInItem = (item) => {
    const arr = Array.isArray(item?.people) ? item.people : [];
    return arr.map(p => String(p || '').trim()).filter(Boolean);
  };

  // Find tasks associated with this person
  const associatedTasks = safeTasks.filter(task => {
    const taskPeople = Array.isArray(task.people) ? task.people : [];
    const personName = person.name || getDisplayName(person);
    return taskPeople.some(p => 
      String(p || '').toLowerCase() === String(personName || '').toLowerCase()
    );
  });

  // Find history items associated with this person
  const associatedHistory = React.useMemo(() => {
    if (!displayName) return [];
    const key = displayName.toLowerCase();
    return safeHistory
      .filter(h => normalizePeopleInItem(h).some(n => n.toLowerCase() === key))
      .slice()
      .sort((a, b) => {
        const ta = new Date(a?.createdAt || a?.completedAt || a?.ts || 0).getTime();
        const tb = new Date(b?.createdAt || b?.completedAt || b?.ts || 0).getTime();
        return tb - ta;
      });
  }, [safeHistory, displayName]);

  // Calculate tracked time statistics
  const trackedStats = React.useMemo(() => {
    const trackedItems = associatedHistory.filter(h => h.duration || h.type === 'timer' || h.type === 'focus' || h.type === 'session');
    const totalMinutes = trackedItems.reduce((sum, h) => sum + (h.duration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let timeDisplay = '';
    if (hours > 0) {
      timeDisplay = `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim();
    } else if (minutes > 0) {
      timeDisplay = `${minutes}m`;
    } else {
      timeDisplay = '0m';
    }
    
    return {
      totalMinutes,
      timeDisplay,
      sessionCount: trackedItems.length,
      items: trackedItems
    };
  }, [associatedHistory]);

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
    } else if (picType === 'upload' && pic) {
      return (
        <img 
          src={pic} 
          alt={displayName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit'
          }}
        />
      );
    } else if (picType === 'ai' && pic) {
      return (
        <img 
          src={pic} 
          alt={displayName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit'
          }}
        />
      );
    } else {
      // Default to initials
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
          {initials}
        </div>
      );
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onProfilePictureUpload) {
      onProfilePictureUpload(file, person.id);
    }
  };

  const handleHistoryClick = (historyItem) => {
    // If history item has a taskId, try to find and view the task
    if (historyItem.taskId && onViewTask) {
      const task = safeTasks.find(t => t.id === historyItem.taskId);
      if (task) {
        onViewTask(task);
        return;
      }
    }
    // Otherwise, could navigate to history view or show details
    notify?.('History item clicked', 'ℹ️');
  };

  // Parse links
  const links = Array.isArray(person.links) 
    ? person.links 
    : (person.links ? String(person.links).split(',').map(l => l.trim()).filter(Boolean) : []);

  // Parse tags
  const tags = Array.isArray(person.tags) 
    ? person.tags 
    : (person.tags ? String(person.tags).split(',').map(t => t.trim()).filter(Boolean) : []);

  // Get notes history (timestamped notes)
  const notesHistory = React.useMemo(() => {
    const history = Array.isArray(person.notesHistory) ? person.notesHistory : [];
    // If there's an old notes field, include it as the first note
    if (person.notes && !history.some(n => (n.text || n.note || n) === person.notes)) {
      return [{ text: person.notes, timestamp: person.updatedAt || person.createdAt || new Date().toISOString() }, ...history];
    }
    return history;
  }, [person.notesHistory, person.notes, person.updatedAt, person.createdAt]);

  // Get related people
  const relatedPeopleIds = Array.isArray(person.relationships) ? person.relationships : [];
  const relatedPeople = React.useMemo(() => {
    return safePeople.filter(p => relatedPeopleIds.includes(p.id) || relatedPeopleIds.includes(getDisplayName(p)));
  }, [relatedPeopleIds, safePeople]);

  // Get related places
  const relatedLocationIds = Array.isArray(person.locationIds) ? person.locationIds : [];
  const relatedPlaces = React.useMemo(() => {
    return safeLocations.filter(loc => relatedLocationIds.includes(loc.id) || relatedLocationIds.includes(loc.name));
  }, [relatedLocationIds, safeLocations]);

  // Handler to add a new timestamped note
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      text: newNoteText.trim(),
      timestamp: new Date().toISOString()
    };
    const updatedNotesHistory = [newNote, ...notesHistory];
    const updatedPerson = {
      ...person,
      notesHistory: updatedNotesHistory,
      updatedAt: new Date().toISOString()
    };
    const updatedPeople = safePeople.map(p => p.id === person.id ? updatedPerson : p);
    setPeople?.(updatedPeople);
    setNewNoteText('');
    setShowNoteInput(false);
    notify?.('Note added', '✅');
  };

  return (
    <div>
      {/* Header with Profile Picture and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1 }}>
          {/* Profile Picture with Options */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--input-bg)',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowProfilePicMenu(!showProfilePicMenu);
            }}
            data-profile-pic>
              {getProfilePictureDisplay()}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {/* Profile Picture Menu */}
            {showProfilePicMenu && (
              <div 
                ref={profilePicMenuRef}
                style={{
                  position: 'absolute',
                  top: 88,
                  left: 0,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 10000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minWidth: 180
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowProfilePicMenu(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--input-bg)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  📷 Upload Photo
                </button>
                <button
                  onClick={() => {
                    setAiPromptText('');
                    setAiPromptStyle('avataaars');
                    setShowAIPrompt(true);
                    setShowProfilePicMenu(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--input-bg)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  🎨 Generate AI Photo
                </button>
                <button
                  onClick={() => {
                    setShowEmojiPicker(true);
                    setShowProfilePicMenu(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--input-bg)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  😀 Use Emoji
                </button>
                <button
                  onClick={() => {
                    const updated = safePeople.map(p => 
                      p.id === person.id 
                        ? { ...p, profilePicture: '', profilePictureType: 'initials', updatedAt: new Date().toISOString() }
                        : p
                    );
                    setPeople?.(updated);
                    setShowProfilePicMenu(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--input-bg)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  🔤 Use Initials
                </button>
              </div>
            )}
            {/* Profile Picture Edit Indicator */}
            <div style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--primary)',
              border: '2px solid var(--card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14
            }}
            title="Change profile picture"
            onClick={(e) => {
              e.stopPropagation();
              setShowProfilePicMenu(!showProfilePicMenu);
            }}>
              ✏️
            </div>
          </div>

          {/* Name and Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              {displayName}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ 
                padding: '4px 10px', 
                borderRadius: 6, 
                background: 'rgba(255,107,53,0.15)',
                fontWeight: 600
              }}>
                {(person.type || 'client').toUpperCase()}
              </span>
              {person.jobTitle && (
                <span style={{ fontSize: 13 }}>{person.jobTitle}</span>
              )}
              {person.company && (
                <span style={{ fontSize: 13 }}>at {person.company}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {associatedTasks.length > 0 && (
                <span>📋 {associatedTasks.length} {associatedTasks.length === 1 ? 'task' : 'tasks'}</span>
              )}
              {associatedHistory.length > 0 && (
                <span>📜 {associatedHistory.length} {associatedHistory.length === 1 ? 'activity' : 'activities'}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="btn-white-outline"
          style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600 }}
        >
          ✏️ Edit
        </button>
      </div>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowEmojiPicker(false)}
        >
          <div 
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 20,
              maxWidth: 400,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Choose an Emoji</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '👤', '👥', '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🕴️', '👯', '🧘', '🧗', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤽', '🤾', '🤹', '🧗‍♀️', '🧗‍♂️', '🤼', '🤹‍♀️', '🤹‍♂️'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSetEmoji?.(person.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  style={{
                    fontSize: 32,
                    padding: 8,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--input-bg)';
                    e.target.style.transform = 'scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="btn-white-outline"
              style={{ marginTop: 16, width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AI Prompt Modal */}
      {showAIPrompt && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => {
            setShowAIPrompt(false);
            setAiPromptText('');
          }}
        >
          <div 
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 500,
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Generate AI Avatar</div>
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 20 }}>
              Enter a description to customize the avatar (e.g., "professional", "casual", "bearded", etc.)
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 12, 
                fontWeight: 700, 
                color: 'var(--text-light)', 
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                Description (optional)
              </label>
              <input
                type="text"
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                placeholder="e.g., professional, casual, bearded, glasses, etc."
                className="f-input"
                style={{ width: '100%', fontSize: 14 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (onGenerateAIPicture) {
                      onGenerateAIPicture(person.id, displayName, aiPromptText, aiPromptStyle);
                      setShowAIPrompt(false);
                      setAiPromptText('');
                    }
                  }
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 12, 
                fontWeight: 700, 
                color: 'var(--text-light)', 
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                Style
              </label>
              <select
                value={aiPromptStyle}
                onChange={(e) => setAiPromptStyle(e.target.value)}
                className="f-input"
                style={{ width: '100%', fontSize: 14 }}
              >
                <option value="avataaars">Avataaars (Cartoon)</option>
                <option value="personas">Personas (Professional)</option>
                <option value="bottts">Bottts (Robot)</option>
                <option value="identicon">Identicon (Abstract)</option>
                <option value="pixel-art">Pixel Art</option>
                <option value="miniavs">Mini Avatars</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAIPrompt(false);
                  setAiPromptText('');
                }}
                className="btn-white-outline"
                style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onGenerateAIPicture) {
                    onGenerateAIPicture(person.id, displayName, aiPromptText, aiPromptStyle);
                    setShowAIPrompt(false);
                    setAiPromptText('');
                  }
                }}
                style={{
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#FF8555';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#FF6B35';
                }}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Contact Information Section */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Contact Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {person.email && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  📧 EMAIL
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  <a 
                    href={`mailto:${person.email}`}
                    onClick={(e) => {
                      // Safety check: prevent default on mobile if email client might not be available
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      if (isMobile && !person.email.includes('@')) {
                        e.preventDefault();
                        notify?.('Invalid email address', '⚠️');
                      }
                    }}
                    style={{ color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-word' }}
                  >
                    {person.email}
                  </a>
                </div>
              </div>
            )}

            {person.phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  📞 PHONE
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  <a 
                    href={`tel:${person.phone}`}
                    onClick={(e) => {
                      // Safety check: ensure phone number is valid for tel: links
                      const cleanPhone = person.phone.replace(/\D/g, '');
                      if (cleanPhone.length < 10) {
                        e.preventDefault();
                        notify?.('Invalid phone number', '⚠️');
                      }
                    }}
                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    {person.phone}
                  </a>
                </div>
              </div>
            )}

            {person.title && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  👤 TITLE
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {person.title}
                </div>
              </div>
            )}

            {(person.organization || person.company) && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  🏢 COMPANY
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {person.organization || person.company}
                </div>
              </div>
            )}

            {person.organizations && Array.isArray(person.organizations) && person.organizations.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  🏛️ ORGANIZATIONS
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {person.organizations.join(', ')}
                </div>
              </div>
            )}

            {person.jobTitle && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  💼 JOB TITLE
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {person.jobTitle}
                </div>
              </div>
            )}

            {person.department && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  🏢 DEPARTMENT
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {person.department}
                </div>
              </div>
            )}

            {person.website && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  🌐 WEBSITE
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  <a 
                    href={person.website.startsWith('http') ? person.website : `https://${person.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-word' }}
                  >
                    {person.website} →
                  </a>
                </div>
              </div>
            )}

            {person.linkedin && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  💼 LINKEDIN
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  <a 
                    href={person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-word' }}
                  >
                    View Profile →
                  </a>
                </div>
              </div>
            )}

            {person.twitter && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  🐦 TWITTER
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  <a 
                    href={person.twitter.startsWith('http') ? person.twitter : `https://twitter.com/${person.twitter.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    @{person.twitter.replace('@', '').replace('https://twitter.com/', '')} →
                  </a>
                </div>
              </div>
            )}

            {person.compassCrmLink || person.compassLink || person.crmLink ? (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  🧭 CRM LINK
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

            {(person.address || person.city || person.state || person.zipCode || person.country) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  📍 ADDRESS
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  {[person.address, person.city, person.state, person.zipCode, person.country].filter(Boolean).join(', ')}
                </div>
              </div>
            )}

            {(person.assistantName || person.assistantPhone || person.assistantEmail) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  👥 ASSISTANT
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  {person.assistantName && <div><strong>Name:</strong> {person.assistantName}</div>}
                  {person.assistantPhone && <div><strong>Phone:</strong> <a href={`tel:${person.assistantPhone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{person.assistantPhone}</a></div>}
                  {person.assistantEmail && <div><strong>Email:</strong> <a href={`mailto:${person.assistantEmail}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{person.assistantEmail}</a></div>}
                </div>
              </div>
            )}

            {(person.birthday || person.anniversary) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  📅 IMPORTANT DATES
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  {person.birthday && <div><strong>Birthday:</strong> {new Date(person.birthday).toLocaleDateString()}</div>}
                  {person.anniversary && <div><strong>Anniversary:</strong> {new Date(person.anniversary).toLocaleDateString()}</div>}
                </div>
              </div>
            )}

            {person.createdAt && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
                  📅 ADDED
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  {new Date(person.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Section */}
        {notesHistory && notesHistory.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              📋 RECENT ACTIVITY
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8,
              maxHeight: 300,
              overflowY: 'auto',
              padding: '8px 0'
            }}>
              {notesHistory.slice(0, 10).map((activity, idx) => {
                // Handle both string format and object format
                const activityText = typeof activity === 'string' ? activity : (activity.text || activity.note || activity);
                const activityDate = typeof activity === 'object' && activity.timestamp 
                  ? activity.timestamp 
                  : (typeof activity === 'object' && activity.createdAt ? activity.createdAt : null);
                
                return (
                  <div
                    key={idx}
                    style={{
                      padding: 10,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.5
                    }}
                  >
                    <div style={{ color: 'var(--text)', marginBottom: 4 }}>
                      {activityText}
                    </div>
                    {activityDate && (
                      <div style={{ fontSize: 11, color: 'var(--text-light)', opacity: 0.7 }}>
                        {new Date(activityDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* Time-Stamped Notes */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📝 TIME-STAMPED NOTES</span>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="btn-white-outline"
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600 }}
            >
              + Add Note
            </button>
          </div>
          
          {/* Add Note Input */}
          {showNoteInput && (
            <div style={{ marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Enter a note..."
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddNote();
                  }
                  if (e.key === 'Escape') {
                    setShowNoteInput(false);
                    setNewNoteText('');
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowNoteInput(false);
                    setNewNoteText('');
                  }}
                  className="btn-white-outline"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  className="btn-ai-purple"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  disabled={!newNoteText.trim()}
                >
                  Save Note
                </button>
              </div>
            </div>
          )}

          {/* Display Notes History */}
          {notesHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
              {notesHistory.map((note, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 6, opacity: 0.7 }}>
                    {new Date(note.timestamp || note.createdAt || Date.now()).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {note.text || note.note || note}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showNoteInput && (
              <div style={{ color: 'var(--text-light)', opacity: 0.5, fontStyle: 'italic', padding: 20, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                No notes yet. Click "Add Note" to add one.
              </div>
            )
          )}
        </div>

        {/* Associated Tasks */}
        {associatedTasks.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📋 ASSOCIATED TASKS ({associatedTasks.length})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none' }}>
                  {associatedTasks.filter(t => t.completed).length} completed
                </span>
                <button
                  onClick={() => setTasksCompactView(!tasksCompactView)}
                  className="btn-white-outline"
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600 }}
                  title={tasksCompactView ? 'Expand tasks' : 'Compact view'}
                >
                  {tasksCompactView ? '📄' : '📋'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tasksCompactView ? 6 : 10, maxHeight: 400, overflowY: 'auto' }}>
              {associatedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onViewTask?.(task)}
                  style={{
                    padding: tasksCompactView ? '8px 12px' : '14px 16px',
                    background: task.completed ? 'rgba(0,184,148,0.1)' : 'rgba(255,255,255,0.05)',
                    borderRadius: tasksCompactView ? 8 : 12,
                    cursor: 'pointer',
                    border: task.completed ? '1px solid rgba(0,184,148,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = task.completed ? 'rgba(0,184,148,0.15)' : 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = task.completed ? 'rgba(0,184,148,0.1)' : 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: tasksCompactView ? 'center' : 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: tasksCompactView ? 14 : 18, marginTop: tasksCompactView ? 0 : 2, flexShrink: 0 }}>{task.completed ? '✅' : '⭕'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: tasksCompactView ? 13 : 15, 
                        fontWeight: 600, 
                        textDecoration: task.completed ? 'line-through' : 'none', 
                        opacity: task.completed ? 0.7 : 1,
                        marginBottom: tasksCompactView ? 2 : 6,
                        color: 'var(--text)'
                      }}>
                        {task.title}
                      </div>
                      {!tasksCompactView && task.description && (
                        <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8, lineHeight: 1.5 }}>
                          {task.description.substring(0, 100)}{task.description.length > 100 ? '...' : ''}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, fontSize: tasksCompactView ? 11 : 12, color: 'var(--text-light)', flexWrap: 'wrap' }}>
                        {task.category && <span>📁 {task.category}</span>}
                        {task.priority && <span>⚡ {task.priority}</span>}
                        {task.dueDate && (
                          <span>
                            📅 {new Date(task.dueDate).toLocaleDateString()}
                            {new Date(task.dueDate) < new Date() && !task.completed && (
                              <span style={{ color: 'var(--danger)', marginLeft: 4 }}>⚠️</span>
                            )}
                          </span>
                        )}
                        {!tasksCompactView && task.estimatedTime && (
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

        {/* Tracked Records / Time Summary */}
        {trackedStats.sessionCount > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              ⏱️ TRACKED RECORDS
            </div>
            <div style={{
              padding: 16,
              background: 'rgba(255,107,53,0.1)',
              borderRadius: 12,
              border: '1px solid rgba(255,107,53,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                    {trackedStats.timeDisplay}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                    Total time tracked
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                    {trackedStats.sessionCount}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                    {trackedStats.sessionCount === 1 ? 'session' : 'sessions'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Section */}
        {associatedHistory.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              📜 ACTIVITY HISTORY ({associatedHistory.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
              {associatedHistory.map((historyItem, idx) => {
                const historyDate = historyItem.createdAt || historyItem.completedAt || historyItem.ts;
                const historyTitle = historyItem.title || historyItem.text || 'Activity';
                const historyType = historyItem.type || 'activity';
                const getHistoryIcon = () => {
                  if (historyType.includes('complete') || historyType.includes('done')) return '✅';
                  if (historyType.includes('focus') || historyType.includes('timer')) return '🎯';
                  if (historyType.includes('spin')) return '🎰';
                  if (historyType.includes('create')) return '➕';
                  if (historyType.includes('edit')) return '✏️';
                  return '📝';
                };
                
                return (
                  <div
                    key={historyItem.id || idx}
                    onClick={() => handleHistoryClick(historyItem)}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 18, marginTop: 2 }}>{getHistoryIcon()}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 14, 
                          fontWeight: 600,
                          marginBottom: 4,
                          color: 'var(--text)'
                        }}>
                          {historyTitle}
                        </div>
                        {historyDate && (
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                            {new Date(historyDate).toLocaleString()}
                          </div>
                        )}
                        {historyItem.category && (
                          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
                            📁 {historyItem.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Related People */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            👥 RELATED PEOPLE ({relatedPeople.length})
          </div>
          {relatedPeople.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relatedPeople.map((relatedPerson) => {
                const relatedDisplayName = getDisplayName(relatedPerson);
                return (
                  <div
                    key={relatedPerson.id}
                    onClick={() => {
                      // Navigate to this person in the list view - this would need to be implemented
                      notify?.(`Viewing ${relatedDisplayName}`, '👤');
                    }}
                    style={{
                      padding: 10,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{relatedDisplayName}</div>
                    {relatedPerson.type && (
                      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                        {(relatedPerson.type || '').toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-light)', opacity: 0.5, fontStyle: 'italic', padding: 12, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              No related people. Edit person to add relations.
            </div>
          )}
        </div>

        {/* Related Places */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            📍 RELATED PLACES ({relatedPlaces.length})
          </div>
          {relatedPlaces.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relatedPlaces.map((place) => {
                const placeName = place.name || place.address || 'Unnamed Place';
                return (
                  <div
                    key={place.id}
                    style={{
                      padding: 10,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{placeName}</div>
                    {place.address && (
                      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                        {place.address}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-light)', opacity: 0.5, fontStyle: 'italic', padding: 12, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              No related places. Edit person to add locations.
            </div>
          )}
        </div>

        {/* Empty State */}
        {!person.email && !person.phone && notesHistory.length === 0 && !person.firstName && !person.lastName && !person.name && !person.company && !person.address && links.length === 0 && tags.length === 0 && associatedTasks.length === 0 && associatedHistory.length === 0 && relatedPeople.length === 0 && relatedPlaces.length === 0 && (
          <div style={{ color: 'var(--text-light)', opacity: 0.6, fontStyle: 'italic', padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed var(--border)', marginTop: 20 }}>
            No additional details available. Click Edit to add information.
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

