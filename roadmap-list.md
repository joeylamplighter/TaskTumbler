Establishing the user's intent, you are looking for a massive, detailed roadmap of 100 bug fixes and improvements for the "TaskTumbler" application based on the provided source code, along with specific prompts to implement each.

Based on the files provided, here is a cataloged 100-point list of improvements and fixes, organized by category, with implementation prompts.

### I. Data Architecture & Persistence (1-15)

1. **Fix: Race Condition in `DataManager.save**`
* *Prompt:* "Update `DataManager.save` in `03-data-manager.js` to use a queue system to prevent data loss if multiple saves trigger simultaneously."


2. **Improvement: Implement Data Versioning**
* *Prompt:* "Add a `version` field to the `localStorage` payload and a migration handler in `03-data-manager.js` to handle future schema changes."


3. **Fix: `makeId` Collision Risk**
* *Prompt:* "Standardize `makeId` in both `03-storage.js` and `04-utils.js` to exclusively use `crypto.randomUUID()` with a fallback that includes high-resolution timestamps."


4. **Improvement: Atomic Transactions for Tasks/Goals**
* *Prompt:* "Modify `DataManager` to support batch updates so that updating a task and its associated goal happens as a single atomic operation."


5. **Fix: Activity Log Bloat**
* *Prompt:* "Modify `CloudSync.saveToCloud` to strictly enforce a 500-entry limit on activities to prevent Firestore document size limits."


6. **Improvement: Selective Sync**
* *Prompt:* "Add a 'Sync Only Tasks' toggle in `settings` and update `CloudSync` to filter data based on this setting."


7. **Fix: Firestore Persistence Error Handling**
* *Prompt:* "In `01-firebase.js`, add a retry mechanism for `enablePersistence` if it fails due to network instability."


8. **Improvement: LocalStorage Backup (Shadowing)**
* *Prompt:* "In `03-storage.js`, implement a 'Last Known Good' save feature that keeps a secondary copy of data in case of corruption."


9. **Fix: `normalizeTask` Missing Default Fields**
* *Prompt:* "Update `normalizeTask` in `03-data-manager.js` to ensure `actualTime` and `lastModified` fields are always initialized."


10. **Improvement: Deep Equality Check before Save**
* *Prompt:* "In `DataManager.setAll`, add a deep equality check (memoization) to prevent unnecessary writes to `localStorage` and `Firebase` if data hasn't changed."


11. **Fix: `savedPeople` Duplication on Sync**
* *Prompt:* "Update `normalizeSavedPeople` to use `id` as the primary de-duplication key instead of just name."


12. **Improvement: IndexedDB Migration**
* *Prompt:* "Create a migration strategy to move from `localStorage` to `IndexedDB` for larger data sets like `Activities` and `SavedNotes`."


13. **Fix: `dueDate` ISO String Validation**
* *Prompt:* "In `normalizeTask`, add a validator to ensure `dueDate` is a valid ISO string or null, preventing UI crashes."


14. **Improvement: Encrypted Local Storage**
* *Prompt:* "Add an optional setting to encrypt sensitive fields (like notes and person contact info) in `localStorage` using a user-provided pin."


15. **Fix: `storage.js` Init Loop**
* *Prompt:* "Wrap `initLiteDB` in a check to ensure it only runs once per session to prevent redundant normalization loops."



### II. Task Management UI/UX (16-30)

16. **Improvement: Subtask Progress Bar**
* *Prompt:* "In `SwipeableTaskRow`, add a mini progress bar below the title indicating the percentage of completed subtasks."


17. **Fix: Swipe Action Sensitivity**
* *Prompt:* "Adjust `SwipeableTaskRow` touch logic to prevent horizontal swipes from triggering while scrolling vertically."


18. **Improvement: Multi-Task Selection**
* *Prompt:* "Add a 'Bulk Edit' mode to `TasksTab` allowing users to select multiple tasks and change their category or priority at once."


19. **Fix: Quick Add Category Selection**
* *Prompt:* "Update `TasksTab` so the `quickCat` selection defaults to the last used category instead of always 'General'."


20. **Improvement: Task Dependencies (Blocked By)**
* *Prompt:* "In `TasksTab`, dim tasks that are 'Blocked By' another incomplete task and add a 'Blocked' badge."


21. **Fix: `SwipeableTaskRow` Icon Visibility**
* *Prompt:* "Increase the contrast and size of the '✓ Complete' and '✎ Edit' labels during task swiping for better accessibility."


22. **Improvement: Natural Language Date Parsing**
* *Prompt:* "Integrate a library like `chrono-node` into the Quick Add input to allow typing 'Call Alice tomorrow' to set the due date automatically."


23. **Fix: Task List Virtualization**
* *Prompt:* "Implement React virtualization for the task list in `TasksTab` to maintain performance when the user has 200+ active tasks."


24. **Improvement: Drag and Drop Reordering**
* *Prompt:* "Enable `react-beautiful-dnd` in `TasksTab` to allow manual sorting of tasks within their priority groups."


25. **Fix: `percentComplete` Precision**
* *Prompt:* "Ensure `percentComplete` is rounded to the nearest integer in `DataManager` to avoid '99.999%' UI displays."


26. **Improvement: Archival System**
* *Prompt:* "Add an 'Archive' state to tasks so completed tasks can be hidden from the 'Done' list but kept for historical stats."


27. **Fix: Empty List Empty States**
* *Prompt:* "Replace the 'No tasks found' text with a custom SVG illustration and a call-to-action button to 'Create your first task'."


28. **Improvement: Priority Color Coding**
* *Prompt:* "Map `priOptions` to specific CSS variables in `01-variables.css` so 'Urgent' tasks have a distinct glowing border."


29. **Fix: `actualTime` Formatting**
* *Prompt:* "Update the `fmtTime` function in `SwipeableTaskRow` to show hours/minutes correctly for durations exceeding 24 hours."


30. **Improvement: Subtask Quick-Add**
* *Prompt:* "In `TaskFormModal`, add a 'Quick Add' input for subtasks that doesn't require clicking 'Add'—just pressing 'Enter'."



### III. AI & Gemini Integration (31-45)

31. **Improvement: AI "Project" Generator**
* *Prompt:* "Add a 'Generate Project' button in `TasksTab` that uses Gemini to create 5-10 related tasks based on a single goal."


32. **Fix: Gemini API Error Toasting**
* *Prompt:* "In `TaskFormModal`, provide specific error messages for Gemini failures (e.g., 'Invalid API Key', 'Rate Limit Exceeded') using the `notify` system."


33. **Improvement: AI-Powered Priority Suggestions**
* *Prompt:* "Add an AI button in `TasksTab` that analyzes all active tasks and suggests re-prioritizing them based on current dates."


34. **Fix: AI Loading State Consistency**
* *Prompt:* "Disable all 'Magic Fill' buttons in `TaskFormModal` while any AI request is pending to prevent overlapping state updates."


35. **Improvement: Context-Aware Subtasks**
* *Prompt:* "Update the `handleAiSubtasks` prompt in `TaskFormModal` to include the task's Category and Description for more relevant steps."


36. **Fix: AI JSON Parsing Robustness**
* *Prompt:* "Update AI response parsing to use a regex that finds the first `{` and last `}` to handle Gemini's occasional markdown preamble."


37. **Improvement: AI Task "Tone" Selection**
* *Prompt:* "Add a setting to choose AI personality (e.g., 'Drill Sergeant', 'Encouraging Coach') for generated descriptions and subtasks."


38. **Fix: AI Key Masking**
* *Prompt:* "In `SettingsTab`, ensure the `geminiApiKey` input is a `type='password'` and masked by default."


39. **Improvement: AI Duplicate Detection**
* *Prompt:* "When adding a task via AI, have Gemini check if a similar task already exists in the `tasks` array to prevent duplicates."


40. **Fix: AI Response Stream Handling**
* *Prompt:* "Update `window.callGemini` to support streaming responses to show text appearing in real-time in the `description` field."


41. **Improvement: AI Smart-Tagging**
* *Prompt:* "Implement a background AI process that suggests tags for untagged tasks during idle time."


42. **Fix: AI Category Mapping**
* *Prompt:* "In `handleAiCat`, if the AI suggests a category that doesn't exist, prompt the user to create it instead of failing silently."


43. **Improvement: AI "Day Planner"**
* *Prompt:* "Add a 'Plan My Day' button that uses AI to select the best 3-5 tasks for the user to focus on based on estimated time and priority."


44. **Fix: AI Token Usage Monitoring**
* *Prompt:* "Add a counter in `Settings` to track roughly how many AI requests have been made in the current session."


45. **Improvement: AI Location Inference**
* *Prompt:* "If a task title mentions a place (e.g., 'Buy milk at Safeway'), use Gemini to suggest a saved Location."



### IV. Location & People Management (46-60)

46. **Improvement: Proximity Notifications**
* *Prompt:* "Add a background service worker to check user location and notify them if they are near a task-linked 'Place'."


47. **Fix: Location Coord Precision**
* *Prompt:* "In `TaskFormModal`, ensure `locationCoords` are stored as numbers, not strings, to maintain compatibility with `findLocationByCoords`."


48. **Improvement: People CRM Integration**
* *Prompt:* "Add a field for 'Email' and 'Phone' in `normalizePerson` and update `PeopleManager` to show these fields."


49. **Fix: `getTaskLocationOnce` Timeout**
* *Prompt:* "Add a 10-second timeout to the geolocation request in `TaskFormModal` to prevent the spinner from spinning forever."


50. **Improvement: Map View for Tasks**
* *Prompt:* "Create a new 'Map' tab that plots all tasks with associated coordinates on a Leaflet or Google Map."


51. **Fix: `allPeople` Sync across Tabs**
* *Prompt:* "Ensure that adding a person in the `TaskFormModal` triggers an immediate state update in the `PeopleManager` if both are open."


52. **Improvement: Person-Specific Task View**
* *Prompt:* "In `PeopleManager`, clicking a person should show a list of all tasks assigned to them."


53. **Fix: Location Search Autocomplete**
* *Prompt:* "Replace the `datalist` for locations with a proper searchable dropdown that supports fuzzy matching."


54. **Improvement: QR Code for Locations**
* *Prompt:* "Add a feature to generate a QR code for a saved location so it can be shared with other users."


55. **Fix: `savedLocations_v1` Schema Migration**
* *Prompt:* "Ensure the migration from 'lat/lon' to 'coords: {lat, lon}' handles null values without breaking the app."


56. **Improvement: Default Radius Setting**
* *Prompt:* "Add a global setting for 'Default Proximity Radius' (e.g., 50m, 100m, 500m) used when creating new locations."


57. **Fix: People Tagging Logic**
* *Prompt:* "Allow people to have tags and ensure these tags are included in the `DataManager.tags.getAll` aggregation."


58. **Improvement: Import Contacts**
* *Prompt:* "Add a 'Import from VCF' button to `PeopleManager` to allow bulk loading of contacts."


59. **Fix: `locationInput` and `data.location` Sync**
* *Prompt:* "In `TaskFormModal`, resolve the 'stale closure' issue where `locationInput` doesn't update when a task is edited."


60. **Improvement: Place Categorization**
* *Prompt:* "Add 'Type' (Home, Work, Store, Client) to `normalizeLocation` and allow filtering the Places list by type."



### V. Gamification & User Stats (61-75)

61. **Improvement: Level Up Animation**
* *Prompt:* "Create a dedicated `LevelUpModal` that triggers when `userStats.xp` crosses a level threshold, showing confetti and new unlocks."


62. **Fix: XP Math Overflows**
* *Prompt:* "In `02-constants.js`, cap the maximum XP per task completion to prevent level-hacking via 'Urgent' multipliers."


63. **Improvement: Daily Streaks**
* *Prompt:* "Add a `dailyStreak` counter to `COMPLEX_USER_STATS` and implement logic to increment it if at least one task is completed per 24 hours."


64. **Fix: `negativeXpCap` Enforcement**
* *Prompt:* "Ensure that deleting an active task subtracts XP but never goes below the `negativeXpCap` defined in settings."


65. **Improvement: Duel Leaderboard**
* *Prompt:* "When Cloud Sync is enabled, fetch a global leaderboard for the 'Duel' tab to show how the user ranks against others."


66. **Fix: Stats Tab Performance**
* *Prompt:* "Memoize the chart calculations in `StatsTab` so they don't re-run every time a user switches between 'Active' and 'Done' views."


67. **Improvement: Category XP Bonuses**
* *Prompt:* "Add a 'Double XP Category of the Week' feature that rotates automatically based on the current date."


68. **Fix: `totalFocusTime` Calculation**
* *Prompt:* "Update the timer logic to ensure `totalFocusTime` is updated in `userStats` only after a session is successfully saved."


69. **Improvement: Achievement System**
* *Prompt:* "Create a list of 20 achievements (e.g., 'Early Bird', 'Task Master') and track their completion in `DataManager`."


70. **Fix: Leveling Curve**
* *Prompt:* "Implement a non-linear leveling curve (e.g., `level * 500 XP`) instead of a flat rate to make higher levels more rewarding."


71. **Improvement: Animated XP Progress Bar**
* *Prompt:* "Add a smooth CSS transition to the XP bar in `AppHeader` so it 'fills up' visually when tasks are completed."


72. **Fix: `Duel` Auto-Advance Logic**
* *Prompt:* "Ensure the `duelAutoAdvance` setting correctly moves to the next pair of tasks even if one is marked 'skipped'."


73. **Improvement: XP Multiplier Visualizer**
* *Prompt:* "In the task completion notification, show the math (e.g., '10 XP x 1.5 High Priority = +15 XP')."


74. **Fix: History Log Date Grouping**
* *Prompt:* "In `StatsTab`, group the activity history by date headers (e.g., 'Today', 'Yesterday') instead of a flat list."


75. **Improvement: 'God Mode' Debug Setting**
* *Prompt:* "When `showDebugInfo` is true, add a button to manually add 100 XP for testing purposes."



### VI. System, Settings & Sync (76-90)

76. **Improvement: Offline Sync Indicator**
* *Prompt:* "In `SyncButton`, add an 'Offline' state (orange icon) when `navigator.onLine` is false."


77. **Fix: Firebase Config Leak**
* *Prompt:* "Add a warning in the console if `FIREBASE_CONFIG` is still using the default placeholder keys in production."


78. **Improvement: Automatic Theme Switching**
* *Prompt:* "Add an 'Auto' theme option that switches between 'Light' and 'Dark' based on the user's system preferences."


79. **Fix: Backup File Validation**
* *Prompt:* "When importing a backup JSON, add a validation step to ensure the file contains valid `tasks` and `settings` before overwriting storage."


80. **Improvement: Sync Conflict Resolver**
* *Prompt:* "When pulling from cloud, if the `updatedAt` timestamp of a local task is newer than the cloud version, show a 'Conflict' modal to let the user choose."


81. **Fix: `haptics` Error on Desktop**
* *Prompt:* "Wrap `enableHaptics` calls in a check for `window.navigator.vibrate` to prevent console errors on non-mobile devices."


82. **Improvement: Custom Sound Uploads**
* *Prompt:* "In `Settings`, allow users to upload their own MP3 for the 'Task Completed' sound."


83. **Fix: `initialTab` Hash Parsing**
* *Prompt:* "Update `initialTab` to handle nested hashes (e.g., `#/settings/data`) properly by splitting on slashes."


84. **Improvement: PWA Manifest Update**
* *Prompt:* "Update `manifest.json` to include 'shortcuts' for 'Quick Add' and 'Start Timer' to allow long-press actions on mobile home screens."


85. **Fix: `nukeAll` Safety Confirmation**
* *Prompt:* "In `handleNukeAll`, require the user to type 'DELETE' into a prompt before clearing all local data."


86. **Improvement: Keyboard Shortcuts**
* *Prompt:* "Implement global keyboard listeners (e.g., 'n' for New Task, 't' for Timer, 's' for Spin)."


87. **Fix: Session Storage vs Local Storage for Drafts**
* *Prompt:* "Move task form drafts from `sessionStorage` to `localStorage` so they persist if the browser crashes or is closed."


88. **Improvement: Multi-Device Sync Polling**
* *Prompt:* "Implement a 5-minute background poll to check for cloud updates if the tab remains open for a long period."


89. **Fix: Redundant `window` Assignments**
* *Prompt:* "Consolidate all global window assignments into a single `core/init.js` file to improve code readability and prevent overwrite bugs."


90. **Improvement: Debug Log Downloader**
* *Prompt:* "When `showDebugInfo` is active, add a button to download the last 50 console logs as a text file for bug reporting."



### VII. UI Polish & Accessibility (91-100)

91. **Improvement: Skeleton Loaders**
* *Prompt:* "Add skeleton screen placeholders in `TasksTab` for when data is loading from the cloud."


92. **Fix: Modal Scroll Locking**
* *Prompt:* "When `TaskFormModal` is open, set `document.body.style.overflow = 'hidden'` to prevent the background from scrolling."


93. **Improvement: Screen Reader Labels**
* *Prompt:* "Add `aria-label` attributes to all icon-only buttons like the '×' delete button and '✧' AI buttons."


94. **Fix: CSS Variable Fallbacks**
* *Prompt:* "In `01-variables.css`, add standard color fallbacks (e.g., `#000`) for all custom variables to support older browsers."


95. **Improvement: Dark Mode 'Pure Black' Option**
* *Prompt:* "Add an 'OLED' theme setting that uses `#000000` as the background for maximum battery savings on mobile."


96. **Fix: Touch Target Sizes**
* *Prompt:* "Ensure all buttons in the `NavBar` and `TasksTab` have a minimum touch target of 44x44px for better mobile usability."


97. **Improvement: Micro-interactions (Framer Motion)**
* *Prompt:* "Add subtle entrance animations for modal windows and task rows using a lightweight animation library or CSS transitions."


98. **Fix: Z-index Audit**
* *Prompt:* "Audit all `z-index` values to ensure the `ToastManager` always appears above modals, and modals always appear above the `NavBar`."


99. **Improvement: Font Optimization**
* *Prompt:* "Update the `@font-face` declaration to use `font-display: swap` to prevent 'Flash of Unstyled Text' during page load."


100. **Fix: Scrollbar Styling**
* *Prompt:* "Add custom scrollbar CSS to ensure consistent, thin, themed scrollbars across Chrome, Safari, and Firefox."