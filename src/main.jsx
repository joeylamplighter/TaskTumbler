// Make React available globally for legacy code
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as ReactDOMLegacy from 'react-dom'
window.React = React
window.ReactDOM = { ...ReactDOM, createPortal: ReactDOMLegacy.createPortal }

// Theme CSS variables are loaded via <link> tags in index.html
// Import main styles after theme variables are available
import './styles/main.css'
// Import shared legacy controls to ensure window.SimpleModal and other controls are available
import './components/shared/LegacyControls'
// Import task form modals to ensure they're available on window
import './components/task-form/TaskTumblerReminders'
import './components/task-form/ViewTaskModal'
import './components/task-form/TaskFormModal'
// Import managers to ensure they're available on window
import './components/managers/LocationsManager'
import './components/managers/PeopleManager'
// Import contact modal
import '../js/features/contact/13-11-view-contact-modal.jsx'
// Import tab components to ensure they're available on window
import './components/tabs/PeopleTab'
import './components/tabs/PlacesTab'
import './components/tabs/OCRTab'
// Import core infrastructure FIRST (must load before other modules)
import './core/constants'
import './core/dataManager'
import './core/utils'
import './core/storage'
import './core/firebase'
import './core/preloadedAssets'
// Import utilities to ensure they're available on window
import './utils/SoundFX'
import './utils/confetti'
import './utils/ai'
import './utils/coreUtils'
import './utils/notifications'
import './utils/systemAccess'
import './utils/haptics'
// Import OCR utilities
import './utils/ocr'

// Import the helper function from App.jsx
import { completeTask } from './App'

// Make completeTask available globally for legacy code
window.completeTask = completeTask

// Import legacy UI components (they export to window)
import '../js/ui/10-core-header.jsx'
import '../js/ui/10-core-navbar.jsx'
import '../js/ui/10-core-toast.jsx'
import '../js/ui/11-sync.jsx'
import '../js/ui/12-views.jsx' // Views (KanbanView, CalendarView) - must load before kanban/calendar tabs

// Import legacy feature tabs (they export to window)
// Spin tab dependencies first
import '../js/features/13-03a-spin-ui.jsx'
import '../js/features/13-03b-spin-winner-popup.jsx'
import '../js/features/13-03-spin.jsx'
import '../js/features/13-02-tasks.jsx'
import '../js/features/13-02-kanban.jsx'
import '../js/features/13-02-calendar.jsx'
import '../js/features/13-04-timer.jsx'
import '../js/features/13-05-ideas.jsx'
import '../js/features/13-06-goals.jsx'
import '../js/features/13-09-stats.jsx'
import '../js/features/13-10-people-tab.jsx'
import '../js/features/13-10-duel.jsx'
import '../js/features/13-07-settings.jsx'

// Import and load the legacy app - it will render itself
// This must be last so all dependencies are loaded first
import '../js/logic/22-app.jsx'

console.log('✅ Main entry point loaded - legacy app should render now')

