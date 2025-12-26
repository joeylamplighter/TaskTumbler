# Google Calendar Two-Way Sync

This feature enables two-way synchronization between TaskTumbler time-blocked tasks and Google Calendar.

## Features

- **Two-Way Sync**: Tasks with start dates/times sync to Google Calendar, and calendar events sync back to tasks
- **Buffer Scheduling**: Automatically adds buffer time between tasks (configurable, default 15 minutes)
- **Auto-Sync**: Optionally syncs tasks automatically when created, updated, or deleted
- **Time Block Support**: Only tasks with `startDate` and optionally `startTime` are synced

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
   - Copy the API Key
   - (Optional) Restrict the API key to Calendar API only
3. Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Authorized JavaScript origins: Add your app's URL (e.g., `http://localhost:5173` for dev)
   - Authorized redirect URIs: Add your app's URL
   - Copy the Client ID

### 3. Configure in TaskTumbler

1. Open Settings > Calendar
2. Enter your **Google API Key**
3. Enter your **OAuth 2.0 Client ID**
4. (Optional) Set **Calendar ID** (default: "primary")
5. (Optional) Set **Buffer Time** in minutes (default: 15)
6. Toggle **Auto-sync** if you want automatic syncing
7. Click **Connect to Google Calendar**
8. Authorize the app in the popup

## Usage

### Manual Sync

- **Sync Tasks → Calendar**: Syncs all time-blocked tasks to Google Calendar
- **Sync Calendar → Tasks**: Syncs calendar events back to tasks (updates start dates/times)

### Auto-Sync

When enabled, tasks are automatically synced when:
- A new task is created with a start date/time
- A task is updated (if it has a start date/time)
- A task is deleted (removes the calendar event)

### Task Requirements for Sync

A task will be synced to Google Calendar if:
- It has a `startDate` set
- It is not completed
- It is not excluded from tumbler (`excludeFromTumbler` is false)

### Buffer Time

Buffer time is automatically added after each task's estimated duration. For example:
- Task duration: 30 minutes
- Buffer: 15 minutes
- Calendar event duration: 45 minutes (30 + 15)

## Technical Details

### Task Fields Synced

**To Calendar:**
- Title → Event summary
- Description → Event description
- Start date/time → Event start
- Estimated time + buffer → Event end
- Category, priority, location, people → Event description
- Task ID stored in event extended properties

**From Calendar:**
- Event summary → Task title
- Event start → Task start date/time
- Event duration (minus buffer) → Task estimated time
- Task ID matched via extended properties

### Calendar Event Properties

- **Extended Properties**: Contains `taskTumblerTaskId` for two-way sync
- **Reminders**: Default 15-minute popup and 30-minute email reminders
- **Time Zone**: All times stored in UTC

## Troubleshooting

### "Not authenticated" error
- Make sure you've clicked "Connect to Google Calendar"
- Check that your OAuth Client ID is correct
- Verify authorized origins/redirect URIs in Google Cloud Console

### Tasks not syncing
- Check that tasks have `startDate` set
- Verify auto-sync is enabled (or manually sync)
- Check browser console for errors
- Ensure you're authenticated

### Calendar events not updating tasks
- Run "Sync Calendar → Tasks" manually
- Check that calendar events have the TaskTumbler extended property
- Verify task IDs match

## Files

- `src/utils/calendarSync.js` - Core sync service
- `src/components/calendar/CalendarSyncSettings.jsx` - Settings UI
- `src/core/dataManager.js` - Task normalization (includes `calendarEventId` field)
- `js/logic/22-app.jsx` - Auto-sync triggers

