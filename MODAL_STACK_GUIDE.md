# URL-Based Modal Stack System

## Overview

TaskTumbler now features a **URL-based modal stack** that tracks navigation history through modals. This allows users to:

- Navigate through multiple modals (Task → Person → Task → etc.)
- Use browser back/forward buttons to navigate the modal stack
- Share or bookmark URLs that open specific modals
- See a visual breadcrumb showing the current navigation path

## How It Works

### URL Format

The modal stack is encoded in the URL hash using the format:

```
#tasks/task:abc123/contact:john-doe/task:xyz789
```

- **Base Tab**: `tasks` (the current app tab)
- **Modal Stack**: `task:abc123/contact:john-doe/task:xyz789`
  - Each modal is formatted as `type:id`
  - Modals are separated by `/`
  - The rightmost modal is displayed on top

### Example Navigation Flow

1. **Start on Tasks Tab**
   ```
   URL: http://localhost:8081/#tasks
   ```

2. **Click a task to view details**
   ```
   URL: http://localhost:8081/#tasks/task:abc123
   Modal Stack: [task:abc123]
   Display: Shows Task Modal
   ```

3. **Click a person in the task modal**
   ```
   URL: http://localhost:8081/#tasks/task:abc123/contact:john-doe
   Modal Stack: [task:abc123, contact:john-doe]
   Display: Shows Contact Modal
   Breadcrumb: "task → contact"
   ```

4. **Click a different task in the contact modal**
   ```
   URL: http://localhost:8081/#tasks/task:abc123/contact:john-doe/task:xyz789
   Modal Stack: [task:abc123, contact:john-doe, task:xyz789]
   Display: Shows new Task Modal
   Breadcrumb: "task → contact → task"
   ```

5. **Press browser back button**
   ```
   URL: http://localhost:8081/#tasks/task:abc123/contact:john-doe
   Modal Stack: [task:abc123, contact:john-doe]
   Display: Returns to Contact Modal
   ```

## Key Features

### 1. Browser Navigation Support

- **Back Button**: Navigates to the previous modal in the stack
- **Forward Button**: Navigates to the next modal (if you went back)
- **URL Sharing**: Copy the URL to share or bookmark a specific modal view

### 2. Smart Toggle Prevention

The system prevents infinite loops when navigating between modals:

```javascript
// If you're viewing: Task A → Contact B → (click Task A link)
// Instead of creating: Task A → Contact B → Task A
// It goes back to: Task A (closes Contact B)
```

### 3. Visual Breadcrumb

When you have multiple modals open (2+), a breadcrumb appears at the top showing your navigation path:

```
task → contact → task
```

- The current modal is **bold**
- Previous modals are semi-transparent
- Breadcrumb appears centered at the top of the screen

### 4. Tab Preservation

The system preserves your current tab when opening modals:

```
On Tasks Tab: #tasks/task:123
On Settings Tab: #settings/task:123
```

## API Reference

### Global Functions

These functions are available on the `window` object:

#### `window.openModal(type, id, data)`

Opens a modal and adds it to the stack.

**Parameters:**
- `type` (string): Modal type (`'task'`, `'contact'`)
- `id` (string): Unique identifier for the item
- `data` (object): Optional data to pass to the modal

**Example:**
```javascript
// Open a task modal
window.openModal('task', 'task-123', { task: taskObject });

// Open a contact modal
window.openModal('contact', 'person-456', { person: personObject });
```

#### `window.closeModal()`

Closes the top modal and returns to the previous one.

**Example:**
```javascript
window.closeModal();
```

#### `window.closeAllModals()`

Closes all modals and returns to the base tab.

**Example:**
```javascript
window.closeAllModals();
```

## Implementation Details

### Architecture

The modal stack system is implemented in [src/App.jsx](src/App.jsx):

1. **State Management**
   - `activeModalPathState`: Array tracking the modal stack
   - `modalStateListeners`: Listeners notified on stack changes
   - `isUpdatingFromHash`: Flag to prevent circular updates

2. **URL Synchronization**
   - `openModal()` → Updates stack → Calls `pushState()` → Updates URL
   - `closeModal()` → Updates stack → Calls `pushState()` → Updates URL
   - `hashchange` event → Parses URL → Updates stack

3. **Component Rendering**
   - `ModalRenderer` component subscribes to stack changes
   - Only the **top modal** is rendered
   - Modal receives `onClose={closeModal}` to integrate with the stack

### Browser History

The system uses `window.history.pushState()` instead of `replaceState()` to enable proper browser back/forward navigation.

**Before (old system):**
```javascript
window.history.replaceState(null, '', '#task:123');
// Back button doesn't work - history was replaced
```

**After (new system):**
```javascript
window.history.pushState(null, '', '#tasks/task:123');
// Back button works - creates new history entry
```

### Hash Change Handling

The `hashchange` event listener synchronizes the modal stack with URL changes:

```javascript
window.addEventListener('hashchange', () => {
  // Parse hash: #tasks/task:123/contact:456
  // Update modal stack to match
  // Re-render the top modal
});
```

This enables:
- Browser back/forward buttons to work
- Direct URL navigation
- Bookmark restoration

## Developer Guide

### Adding New Modal Types

To add a new modal type (e.g., `location`, `goal`):

1. **Add modal type to ModalRenderer** in [src/App.jsx](src/App.jsx):

```javascript
// Render location modal
if (type === 'location') {
  const location = getLocationById(id);
  if (!location) return null;

  return (
    <>
      {generateBreadcrumb()}
      <ViewLocationModal
        location={location}
        onClose={closeModal}
        // ... other props
      />
    </>
  );
}
```

2. **Open the modal using the global API**:

```javascript
window.openModal('location', 'loc-789', { location: locationObject });
```

3. **Ensure modal uses `onClose` prop**:

```javascript
const ViewLocationModal = ({ location, onClose }) => {
  return (
    <div className="modal">
      <button onClick={onClose}>Close</button>
      {/* Modal content */}
    </div>
  );
};
```

### Debugging

To debug the modal stack system:

```javascript
// Log current modal stack
console.log('Modal Stack:', window.openModal.toString());

// Monitor hash changes
window.addEventListener('hashchange', () => {
  console.log('Hash changed to:', window.location.hash);
});
```

## Best Practices

### 1. Always Use `window.openModal()`

Don't manipulate `window.location.hash` directly. Use the API:

```javascript
// ✅ Good
window.openModal('task', taskId);

// ❌ Bad
window.location.hash = `#task:${taskId}`;
```

### 2. Pass `onClose` to Modals

Ensure all modals accept and use the `onClose` prop:

```javascript
<Modal onClose={onClose}>
  <button onClick={onClose}>Close</button>
</Modal>
```

### 3. Provide Unique IDs

Modal IDs must be unique and URL-safe:

```javascript
// ✅ Good
window.openModal('task', 'task_abc123');
window.openModal('contact', 'person_456');

// ❌ Bad (contains special characters)
window.openModal('task', 'task:abc#123');
```

## Troubleshooting

### Issue: Back button doesn't work

**Cause**: Using `replaceState()` instead of `pushState()`
**Fix**: Already fixed in the latest version

### Issue: Modals don't close with back button

**Cause**: No `hashchange` listener
**Fix**: Already implemented in `ModalRenderer`

### Issue: URL doesn't update when opening modals

**Cause**: `isUpdatingFromHash` flag stuck
**Fix**: Check for exceptions in `openModal()` or `closeModal()`

### Issue: Breadcrumb doesn't appear

**Cause**: Only shows when 2+ modals are open
**Fix**: This is intentional - open multiple modals to see it

## Testing

### Manual Testing Checklist

- [ ] Open a task modal - URL should update
- [ ] Open a person modal from the task - URL should show stack
- [ ] Breadcrumb should appear showing "task → contact"
- [ ] Click browser back button - should return to task modal
- [ ] Click browser forward button - should return to contact modal
- [ ] Close modal with X button - URL should update
- [ ] Refresh page - modal stack should restore from URL
- [ ] Copy URL and paste in new tab - should open same modal stack

### Example Test Flow

1. Navigate to `http://localhost:8081/#tasks`
2. Click any task
3. Verify URL: `#tasks/task:<id>`
4. Click a person in that task
5. Verify URL: `#tasks/task:<id>/contact:<person-id>`
6. Verify breadcrumb appears: "task → contact"
7. Press browser back
8. Verify URL: `#tasks/task:<id>`
9. Verify task modal is shown
10. Press browser forward
11. Verify contact modal returns

## Future Enhancements

Potential improvements to consider:

- [ ] Add clickable breadcrumb to jump to any modal in the stack
- [ ] Add keyboard shortcuts (Esc to go back)
- [ ] Add swipe gestures on mobile to navigate stack
- [ ] Add transition animations between modals
- [ ] Support query parameters for modal state (e.g., `?tab=details`)
- [ ] Add "Open in new window" option for modals

---

**Last Updated:** 2025-12-26
**Version:** 2.0.0
