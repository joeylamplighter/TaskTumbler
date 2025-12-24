# TaskTumbler Developer Guide

**Version:** 2.0.0  
**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive guide to TaskTumbler codebase structure, patterns, and development practices

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Directory Structure](#directory-structure)
4. [Entry Point & Initialization](#entry-point--initialization)
5. [Data Management](#data-management)
6. [Component Architecture](#component-architecture)
7. [Navigation & Routing](#navigation--routing)
8. [State Management](#state-management)
9. [Styling & Theming](#styling--theming)
10. [Common Utilities](#common-utilities)
11. [Adding New Features](#adding-new-features)
12. [Common Tasks & Patterns](#common-tasks--patterns)
13. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Project Overview

TaskTumbler is a React-based productivity application built with:
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **LocalStorage** - Primary data persistence
- **Firebase** (optional) - Cloud sync
- **Legacy Code Pattern** - Hybrid React/modern + legacy codebase

### Key Characteristics

- **Hybrid Architecture**: Mix of modern React components (`src/`) and legacy components (`js/`)
- **Window-based Exports**: Legacy components export to `window` for global access
- **Hash-based Routing**: Navigation uses `window.location.hash` (e.g., `#tasks`, `#settings?view=logic`)
- **DataManager Pattern**: Centralized data management via `window.DataManager`
- **Component Adapters**: Modern components wrap legacy components via adapter pattern

---

## Architecture & Design Patterns

### 1. Dual Codebase Structure

The project maintains two parallel codebases that coexist:

- **`src/`** - Modern React components (ES6 modules, imports/exports)
  - Uses standard React patterns
  - Clean component structure
  - Example: `src/components/tabs/PeopleTab.jsx`

- **`js/`** - Legacy components (IIFE pattern, window exports)
  - Uses Immediately Invoked Function Expressions (IIFE)
  - Exports components to `window` object
  - Example: `js/features/13-02-tasks.jsx`

### 2. Window Export Pattern

Legacy components export to `window` for global access:

```javascript
// js/features/13-02-tasks.jsx
function TasksTab(props) {
  // component code
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.TasksTab = TasksTab;
}
```

### 3. Adapter Pattern

Modern components wrap legacy components:

```javascript
// src/components/tabs/TasksTab.jsx
import TasksTabLegacy from "./TasksTabLegacy";

export default function TasksTab(props) {
  return <TasksTabLegacy {...props} />;
}
```

### 4. DataManager Pattern

Centralized data access via `window.DataManager`:

```javascript
const DM = window.DataManager;

// Get all tasks
const tasks = DM.tasks.getAll();

// Update tasks
DM.tasks.setAll(updatedTasks);

// Get settings
const settings = DM.settings.get();
```

---

## Directory Structure

```
TaskTumbler/
├── src/                          # Modern React components
│   ├── main.jsx                  # Main entry point
│   ├── App.jsx                   # Root app component
│   ├── components/               # React components
│   │   ├── tabs/                 # Tab components
│   │   │   ├── PeopleTab.jsx     # Modern wrapper
│   │   │   ├── PeopleTabLegacy.jsx # Legacy implementation
│   │   │   └── Legacy*Adapter.jsx # Adapter wrappers
│   │   ├── managers/             # Manager components (People, Locations)
│   │   ├── task-form/            # Task form modals
│   │   └── shared/               # Shared components
│   ├── core/                     # Core utilities
│   │   ├── constants.js          # App constants
│   │   ├── dataManager.js        # Data manager
│   │   ├── utils.js              # Utility functions
│   │   └── storage.js            # Storage utilities
│   └── utils/                    # Helper utilities
│       ├── ai.js                 # AI utilities
│       ├── notifications.js      # Notification helpers
│       └── SoundFX.js            # Sound effects
│
├── js/                           # Legacy components
│   ├── core/                     # Core legacy utilities
│   │   ├── 01-firebase.js        # Firebase integration
│   │   ├── 02-constants.js       # Constants & defaults
│   │   ├── 03-data-manager.js    # Legacy data manager
│   │   └── 04-utils.js           # Legacy utilities
│   ├── features/                 # Feature tabs
│   │   ├── 13-02-tasks.jsx       # Tasks tab
│   │   ├── 13-03-spin.jsx        # Spin tab
│   │   ├── 13-04-timer.jsx       # Timer tab
│   │   └── managers/             # Legacy managers
│   ├── logic/                    # App logic
│   │   └── 22-app.jsx            # Main app component
│   └── ui/                       # UI components
│       ├── 10-core-header.jsx    # Header component
│       └── 10-core-navbar.jsx    # Navigation bar
│
├── css/                          # Stylesheets
│   ├── 01-variables.css          # CSS variables
│   ├── 02-base.css               # Base styles
│   └── 03-components.css         # Component styles
│
├── index.html                    # HTML entry point
├── vite.config.js                # Vite configuration
└── package.json                  # Dependencies
```

---

## Entry Point & Initialization

### Load Order (Critical!)

The app loads in a specific order defined in `src/main.jsx`:

1. **React Setup** - Make React globally available
2. **Styles** - Import CSS
3. **Core Infrastructure** - Constants, DataManager, Utils, Storage, Firebase
4. **Utilities** - SoundFX, Confetti, AI, Notifications
5. **Legacy UI** - Header, NavBar, Toast
6. **Feature Tabs** - All tab components
7. **Main App** - `js/logic/22-app.jsx` (renders everything)

**⚠️ Important**: Load order matters! Core must load before features.

### Main Entry Point Flow

```javascript
// src/main.jsx
import './core/constants'        // 1. Constants first
import './core/dataManager'      // 2. DataManager
import './core/utils'            // 3. Utils
import '../js/ui/10-core-header' // 4. UI
import '../js/features/13-02-tasks' // 5. Features
import '../js/logic/22-app'      // 6. Main app (last)
```

---

## Data Management

### DataManager API

The `window.DataManager` object provides centralized data access:

```javascript
const DM = window.DataManager;

// Collections (Arrays)
DM.tasks.getAll()           // Get all tasks
DM.tasks.setAll(newTasks)   // Replace all tasks
DM.goals.getAll()           // Get all goals
DM.categories.getAll()      // Get all categories
DM.people.getAll()          // Get all people
DM.locations.getAll()       // Get all locations
DM.activities.getAll()      // Get activity history
DM.history.getAll()         // Get history (alias for activities)

// Singletons (Objects)
DM.settings.get()           // Get settings object
DM.settings.set(newSettings) // Update settings
DM.userStats.get()          // Get user stats
DM.timerState.get()         // Get timer state
DM.scratchpad.get()         // Get scratchpad content
```

### Data Structure

#### Tasks
```javascript
{
  id: "task_123",
  title: "Task name",
  description: "Task details",
  category: "Work",
  priority: "high",
  completed: false,
  dueDate: "2025-01-15",
  people: ["John Doe"],      // Array of person names
  location: "Office",
  locationIds: ["loc_123"],  // Array of location IDs
  percentComplete: 50,       // Progress (0-100)
  estimatedTime: 30,
  estimatedTimeUnit: "min",
  actualTime: 25,
  // ... more fields
}
```

#### People
```javascript
{
  id: "person_123",
  name: "John Doe",          // Legacy field
  firstName: "John",         // Preferred
  lastName: "Doe",           // Preferred
  type: "client",            // client|lead|agent|vendor|friend|other
  email: "john@example.com",
  phone: "(555) 123-4567",
  company: "Acme Corp",
  jobTitle: "CEO",
  notes: "Main contact",
  notesHistory: [            // Timestamped notes
    { text: "Note text", timestamp: "2025-01-15T10:00:00Z" }
  ],
  relationships: ["person_456"], // Related people IDs
  locationIds: ["loc_123"],      // Related locations
  profilePicture: "emoji",   // or base64/image URL
  profilePictureType: "emoji", // emoji|upload|ai|initials
  // ... more fields
}
```

#### Settings
```javascript
{
  theme: "dark",              // dark|light|midnight|forest|synthwave|coffee
  navItemsOrder: ["spin", "tasks", ...],
  navBarVisibleItems: { spin: true, tasks: true, ... },
  autoStartTimer: false,
  enableNotifications: true,
  geminiApiKey: "your-key",
  // ... more settings
}
```

### LocalStorage Keys

Data is stored in localStorage with these keys:
- `tasks` - All tasks
- `savedPeople` - All people
- `savedLocations_v1` - All locations
- `categories` - All categories
- `goals` - All goals
- `settings` - Settings object
- `userStats` - User statistics
- `timerState` - Timer state
- `history` - Activity history
- `scratchpad` - Scratchpad content

---

## Component Architecture

### Tab Components

Tabs are the main feature screens. Each tab follows this pattern:

#### Modern Tab Component
```javascript
// src/components/tabs/PeopleTab.jsx
import React from 'react'

export default function PeopleTab({ people, setPeople, tasks, history, ... }) {
  const PeopleManager = window.PeopleManager; // Get from window
  
  return (
    <PeopleManager
      people={people}
      setPeople={setPeople}
      tasks={tasks}
      history={history}
      // ... props
    />
  )
}
```

#### Legacy Tab Component
```javascript
// js/features/13-02-tasks.jsx
function TasksTab({ tasks, setTasks, categories, ... }) {
  // Component logic here
  
  return <div>...</div>
}

// Export to window
if (typeof window !== 'undefined') {
  window.TasksTab = TasksTab;
}
```

### Manager Components

Managers handle complex data operations (People, Locations):

```javascript
// src/components/managers/PeopleManager.jsx
export default function PeopleManager({
  people = [],
  setPeople = () => {},
  tasks = [],
  history = [],
  locations = [],
  // ... more props
}) {
  // State management
  const [viewMode, setViewMode] = useState('cards');
  const [viewingId, setViewingId] = useState(null);
  
  // Component logic
  
  return (
    <div>
      {/* Manager UI */}
    </div>
  )
}

// Export to window for legacy access
if (typeof window !== 'undefined') {
  window.PeopleManager = PeopleManager;
}
```

### Modal Components

Modals for tasks and forms:

```javascript
// src/components/task-form/TaskFormModal.jsx
export default function TaskFormModal({
  task = null,           // null = new task, object = edit
  onSave = () => {},
  onClose = () => {},
  categories = [],
  people = [],
  // ... more props
}) {
  // Form state and logic
  
  return (
    <div className="modal-overlay">
      {/* Modal content */}
    </div>
  )
}
```

---

## Navigation & Routing

### Hash-based Routing

Navigation uses `window.location.hash`:

- `#tasks` - Tasks tab
- `#spin` - Spin tab
- `#timer` - Timer tab
- `#settings` - Settings tab
- `#settings?view=logic` - Settings with subtab
- `#stats?subView=charts` - Stats with subtab

### Tab Navigation

Tabs are managed in `js/logic/22-app.jsx`:

```javascript
const [tab, setTab] = React.useState(initialTab());

// Set tab
setTab('tasks');

// With URL update
window.location.hash = '#tasks';
setTab('tasks');
```

### Navigation Items Structure

Navigation items are defined in `js/logic/22-app.jsx`:

```javascript
const allNavItems = [
  { key: "tasks", icon: "📋", label: "Tasks", displayLabel: "Tasks" },
  { key: "settings", icon: "⚙️", label: "Settings", displayLabel: "Settings", 
    hasDropdown: true, 
    dropdownItems: ["settings:view", "settings:logic", "settings:ai"] },
  { key: "settings:logic", icon: "⚙️", label: "Logic", 
    displayLabel: "Logic", groupLabel: "Settings" },
  // ...
];
```

### Adding a New Tab

1. **Create the tab component** (modern or legacy)
2. **Add to navigation items** in `js/logic/22-app.jsx`:
   ```javascript
   { key: "mytab", icon: "🎯", label: "My Tab", displayLabel: "My Tab" }
   ```
3. **Add to constants** in `js/core/02-constants.js`:
   ```javascript
   navItemsOrder: [..., "mytab"]
   navBarVisibleItems: { mytab: true }
   ```
4. **Import in main.jsx** if it's a legacy component
5. **Add to app.jsx** render logic:
   ```javascript
   const MyTab = window.MyTab;
   // ... render MyTab when tab === 'mytab'
   ```

---

## State Management

### Component State (React Hooks)

Use React hooks for component-level state:

```javascript
const [count, setCount] = useState(0);
const [items, setItems] = useState([]);
const [isOpen, setIsOpen] = useState(false);
```

### Global State (DataManager)

Use DataManager for persistent global state:

```javascript
// Read
const tasks = DM.tasks.getAll();
const settings = DM.settings.get();

// Write
DM.tasks.setAll(updatedTasks);
DM.settings.set({ ...settings, theme: 'dark' });
```

### LocalStorage Direct Access

For simple persistence:

```javascript
// Read
const data = JSON.parse(localStorage.getItem('myKey') || '[]');

// Write
localStorage.setItem('myKey', JSON.stringify(data));
```

### Event-based Updates

Components can listen to data changes:

```javascript
useEffect(() => {
  const handleUpdate = () => {
    // Refresh data
    const newData = DM.tasks.getAll();
    setTasks(newData);
  };
  
  window.addEventListener('tasks-updated', handleUpdate);
  return () => window.removeEventListener('tasks-updated', handleUpdate);
}, []);
```

---

## Styling & Theming

### CSS Variables

Theme colors use CSS variables defined in `css/01-variables.css`:

```css
:root {
  --primary: #FF6B35;
  --text: #ffffff;
  --text-light: rgba(255, 255, 255, 0.7);
  --bg: #0a0a0a;
  --card: #1a1a1a;
  --border: rgba(255, 255, 255, 0.1);
}
```

### Inline Styles (Preferred)

The app uses inline styles extensively:

```javascript
<div style={{
  padding: 16,
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text)'
}}>
  Content
</div>
```

### CSS Classes

Use existing utility classes:

- `.btn-white-outline` - White outlined button
- `.btn-ai-purple` - Purple/AI-themed button
- `.f-input` - Form input
- `.f-select` - Form select
- `.f-label` - Form label
- `.modal-overlay` - Modal backdrop
- `.fade-in` - Fade-in animation

### Themes

Themes are defined in `css/01-variables.css` and can be switched via settings:

- `dark` - Default dark theme
- `light` - Light theme
- `midnight` - Midnight blue
- `forest` - Deep forest green
- `synthwave` - Synthwave aesthetic
- `coffee` - Warm coffee tones

---

## Common Utilities

### ID Generation

```javascript
// Use DataManager's makeId
const id = window.DataManager?.makeId?.() || 
           Math.random().toString(36).slice(2) + Date.now().toString(36);
```

### Date Formatting

```javascript
// Format date
new Date(dateString).toLocaleDateString()
new Date(dateString).toLocaleString()

// ISO string
new Date().toISOString()
```

### Notifications

```javascript
// Simple notification
window.notify?.('Message', '✅');

// Via prop
notify?.('Task saved', '💾');
```

### Sound Effects

```javascript
// Play sound
window.playSound?.('success');
window.playSound?.('click');
```

### Confetti

```javascript
// Fire confetti
window.fireSmartConfetti?.();
```

### Modal Helpers

```javascript
// Show modal
window.SimpleModal?.({
  title: "Title",
  content: "Content",
  buttons: [
    { label: "OK", onClick: () => {} }
  ]
});
```

---

## Adding New Features

### Step-by-Step Guide

#### 1. Create Component File

Choose location:
- **Modern**: `src/components/tabs/MyFeatureTab.jsx`
- **Legacy**: `js/features/13-XX-myfeature.jsx`

#### 2. Write Component

```javascript
// Modern example
import React from 'react'

export default function MyFeatureTab({ data, setData, ... }) {
  return <div>My Feature</div>
}
```

#### 3. Export to Window (if legacy)

```javascript
if (typeof window !== 'undefined') {
  window.MyFeatureTab = MyFeatureTab;
}
```

#### 4. Register in Navigation

In `js/logic/22-app.jsx`:
```javascript
const allNavItems = [
  // ... existing items
  { key: "myfeature", icon: "🎯", label: "My Feature", displayLabel: "My Feature" }
];
```

#### 5. Add to Constants

In `js/core/02-constants.js`:
```javascript
navItemsOrder: [..., "myfeature"]
navBarVisibleItems: { myfeature: true }
```

#### 6. Import in main.jsx (if legacy)

```javascript
import '../js/features/13-XX-myfeature.jsx'
```

#### 7. Render in App

In `js/logic/22-app.jsx`:
```javascript
const MyFeatureTab = window.MyFeatureTab;
const MyFeatureTabComp = SafeComponent(MyFeatureTab, "MyFeatureTab");

// In render:
{tab === "myfeature" && <MyFeatureTabComp {...props} />}
```

---

## Common Tasks & Patterns

### Adding a New Setting

1. **Add to DEFAULT_SETTINGS** in `js/core/02-constants.js`:
   ```javascript
   myNewSetting: false,
   ```

2. **Access in component**:
   ```javascript
   const settings = DM.settings.get();
   const value = settings?.myNewSetting ?? false;
   ```

3. **Update setting**:
   ```javascript
   DM.settings.set({ ...settings, myNewSetting: true });
   ```

### Adding a New Data Collection

1. **Add to DataManager** in `src/core/dataManager.js`:
   ```javascript
   const MyCollection = createCollection({
     storageKey: 'myCollection',
     eventName: 'mycollection-updated',
     normalize: (item) => ({ ...item, id: item.id || makeId() })
   });
   
   // Export
   DataManager.myCollection = MyCollection;
   ```

2. **Use in components**:
   ```javascript
   const items = DM.myCollection.getAll();
   DM.myCollection.setAll(updatedItems);
   ```

### Creating a Modal

```javascript
function MyModal({ isOpen, onClose, onSave }) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Modal content */}
        <button onClick={onSave}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

### Handling Form Inputs

```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
});

// Handle change
const handleChange = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

// In JSX
<input
  value={formData.name}
  onChange={(e) => handleChange('name', e.target.value)}
  className="f-input"
/>
```

### Filtering and Searching

```javascript
const [searchQuery, setSearchQuery] = useState('');

const filtered = useMemo(() => {
  if (!searchQuery) return items;
  const query = searchQuery.toLowerCase();
  return items.filter(item => 
    item.name?.toLowerCase().includes(query) ||
    item.email?.toLowerCase().includes(query)
  );
}, [items, searchQuery]);
```

### Loading Data on Mount

```javascript
useEffect(() => {
  // Load data
  const data = DM.tasks.getAll();
  setTasks(data);
  
  // Listen for updates
  const handleUpdate = () => {
    setTasks(DM.tasks.getAll());
  };
  window.addEventListener('tasks-updated', handleUpdate);
  
  return () => {
    window.removeEventListener('tasks-updated', handleUpdate);
  };
}, []);
```

### Persisting UI State

```javascript
// Load from localStorage
const [viewMode, setViewMode] = useState(() => {
  try {
    return localStorage.getItem('myViewMode') || 'list';
  } catch {
    return 'list';
  }
});

// Save on change
useEffect(() => {
  localStorage.setItem('myViewMode', viewMode);
}, [viewMode]);
```

---

## Debugging & Troubleshooting

### Common Issues

#### Component Not Rendering

1. Check if component is exported to `window`
2. Verify component is imported in `main.jsx`
3. Check browser console for errors
4. Verify component is registered in `app.jsx` render logic

#### Data Not Persisting

1. Check localStorage in browser DevTools
2. Verify DataManager is initialized
3. Check for localStorage quota errors
4. Verify `setAll` is being called, not just `set`

#### Navigation Not Working

1. Check hash format: `#tabname` or `#tabname?view=subtab`
2. Verify tab key exists in `allNavItems`
3. Check `initialTab()` function in `app.jsx`
4. Verify tab is in `navBarVisibleItems`

#### Styling Issues

1. Check CSS variables are loaded
2. Verify theme is set correctly
3. Check for conflicting inline styles
4. Verify CSS files are imported in correct order

### Debug Tools

#### Browser Console

```javascript
// Check DataManager
window.DataManager

// Check settings
window.DataManager?.settings?.get()

// Check all tasks
window.DataManager?.tasks?.getAll()

// Check window exports
Object.keys(window).filter(k => k.includes('Tab'))
```

#### React DevTools

Install React DevTools browser extension to inspect component tree and state.

#### localStorage Inspector

In browser DevTools → Application → Local Storage, inspect stored data.

### Error Boundaries

The app has error boundaries to catch crashes. Check console for error details and component stack traces.

---

## Key Conventions

### Naming Conventions

- **Components**: PascalCase (`PeopleManager`, `TaskFormModal`)
- **Functions**: camelCase (`getPersonStats`, `handleSave`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_SETTINGS`, `DATA_VERSION`)
- **Files**: kebab-case for modern (`people-tab.jsx`), numbers for legacy (`13-02-tasks.jsx`)

### File Naming Patterns

- Legacy features: `13-XX-feature.jsx` (numbering indicates load order)
- Legacy UI: `10-core-component.jsx`
- Legacy logic: `22-app.jsx`
- Modern components: `ComponentName.jsx`

### Code Organization

- **Top of file**: Imports
- **Middle**: Helper functions and utilities
- **Bottom**: Main component/function
- **Very bottom**: Window exports (if legacy)

### Props Pattern

Always provide defaults for optional props:

```javascript
function MyComponent({
  data = [],
  onSave = () => {},
  settings = {},
  notify
}) {
  // Component code
}
```

### Safe Access Pattern

Always check for existence before accessing:

```javascript
// Good
const DM = window.DataManager;
const tasks = DM?.tasks?.getAll() || [];

// Good
if (notify) notify('Message', '✅');

// Avoid
tasks.forEach(...) // Might crash if tasks is undefined
```

---

## Quick Reference

### Essential Imports

```javascript
import React from 'react'
import { useState, useEffect, useMemo, useCallback } from React
```

### Essential Window Objects

```javascript
window.DataManager      // Data access
window.React            // React library
window.notify           // Notifications
window.playSound        // Sound effects
window.fireSmartConfetti // Confetti
window.SimpleModal      // Modal helper
```

### Essential CSS Classes

- `.btn-white-outline` - Button style
- `.btn-ai-purple` - AI-themed button
- `.f-input` - Form input
- `.f-select` - Form select
- `.f-label` - Form label
- `.modal-overlay` - Modal backdrop
- `.fade-in` - Animation

### Essential DataManager Methods

```javascript
DM.tasks.getAll()
DM.tasks.setAll(items)
DM.settings.get()
DM.settings.set(settings)
DM.people.getAll()
DM.locations.getAll()
DM.categories.getAll()
DM.history.getAll()
```

---

## Resources

### Key Files to Know

- `src/main.jsx` - Entry point, load order
- `js/logic/22-app.jsx` - Main app, tab routing
- `js/core/02-constants.js` - Default settings, constants
- `src/core/dataManager.js` - Data management
- `js/ui/10-core-navbar.jsx` - Navigation bar
- `js/ui/10-core-header.jsx` - Header component

### Key Directories

- `src/components/tabs/` - Tab components
- `src/components/managers/` - Manager components
- `js/features/` - Legacy feature tabs
- `css/` - Stylesheets
- `src/core/` - Core utilities

---

## Next Steps

1. **Explore existing components** to see patterns in action
2. **Start with small changes** to understand the flow
3. **Use browser DevTools** to inspect state and data
4. **Read the code** - it's the best documentation
5. **Ask questions** - the codebase has helpful comments

---

**Remember**: When in doubt, look at similar existing features. The codebase is your best teacher!

