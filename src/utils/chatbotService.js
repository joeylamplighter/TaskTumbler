// src/utils/chatbotService.js
// ===========================================
// AI CHATBOT SERVICE
// Handles AI interactions with app knowledge and function calling
// ===========================================

import { callGemini } from './ai';

/**
 * Creates a chatbot service instance with app knowledge and action capabilities
 */
export function createChatbotService() {
  const getAppState = () => {
    const DM = window.DataManager;
    if (!DM) return {};

    return {
      tasks: DM.tasks?.getAll() || [],
      goals: DM.goals?.getAll() || [],
      categories: DM.categories?.getAll() || [],
      activities: DM.activities?.getAll() || [],
      people: DM.people?.getAll() || [],
      settings: DM.settings?.get() || {},
      userStats: DM.userStats?.get() || {},
      currentTab: window.location.hash.replace('#', '') || 'tasks',
      timestamp: new Date().toISOString()
    };
  };

  const getAppKnowledge = () => {
    return `
# TaskTumbler App Knowledge

## App Overview
TaskTumbler is a productivity app with the following features:
- Tasks: Create, complete, and manage tasks with categories, priorities, and due dates
- Goals: Set and track goals
- Timer: Track time spent on activities
- Spin: Random task selector
- Stats: View productivity statistics
- Ideas: Brainstorming and note-taking
- Duel: Compare two tasks
- Settings: Configure app preferences

## Navigation
- Tabs: tasks, spin, timer, ideas, goals, stats, duel, settings, people, places
- Navigate using: window.location.hash = '#tabname'
- For subtabs: window.location.hash = '#tabname?view=subview'

## Data Structure

### Tasks
- id: string (unique identifier)
- title: string (required)
- category: string (e.g., 'Work', 'Personal', 'Health')
- priority: 'Urgent' | 'High' | 'Medium' | 'Low'
- weight: number (1-50, affects spin probability)
- completed: boolean
- dueDate: string (YYYY-MM-DD format)
- dueTime: string (HH:mm format)
- estimatedTime: number (minutes)
- description: string
- tags: string[]
- people: string[] (person IDs or names)
- location: string

### Goals
- id: string
- title: string
- description: string
- category: string
- target: number
- progress: number

### Categories
Available categories: Work, Personal, Health, Learning, Finance, Home Project, Errands, Fun

## Available Actions

### Navigation
- navigateToTab(tabName): Navigate to a tab (tasks, spin, timer, ideas, goals, stats, duel, settings, people, places)

### Settings
- updateSettings(updates): Update app settings (theme, sound, confetti, etc.)
- toggleSetting(key): Toggle a boolean setting (chatbotEnabled, confetti, sound, etc.)
- getSettings(): Get current app settings

### Chatbot Appearance
- updateChatbotAppearance(updates): Modify chatbot button size, shape, color, position, and panel size
- Use "reset appearance" command or failsafe button to restore defaults

### UI Element Visibility
- toggleUIElement(element): Show/hide UI elements like progress sliders, task times, goal progress

### Tasks
- addTask(taskData): Add a new task
  - Required: title
  - Optional: category, priority, dueDate, estimatedTime, description, tags
- completeTask(taskId): Mark a task as completed
- updateTask(taskId, updates): Update task properties
- deleteTask(taskId): Delete a task
- getTasks(filter): Get tasks (optionally filtered by category, priority, completed status)

### Goals
- addGoal(goalData): Add a new goal
- updateGoal(goalId, updates): Update goal properties
- getGoals(): Get all goals

### Settings
- updateSettings(updates): Update app settings
  - Example: updateSettings({ theme: "light" }) to change theme
  - Example: updateSettings({ sound: false }) to disable sounds
- toggleSetting(key): Toggle a boolean setting on/off
  - Example: toggleSetting("chatbotEnabled") to show/hide chatbot
  - Example: toggleSetting("confetti") to enable/disable confetti
- getSettings(): Get current app settings

### Chatbot Appearance
- updateChatbotAppearance(updates): Modify chatbot button and panel appearance
  - buttonSize: number (pixels, e.g., 56, 64, 48)
  - buttonShape: "circle" | "square" | "rounded" (the shape of the chatbot button)
    - "circle" = perfectly round button
    - "square" = square button with sharp corners (8px border radius)
    - "rounded" = square button with rounded corners (16px border radius)
  - buttonColor: "gradient" | "primary" | "custom"
  - buttonCustomColor: string (hex color, e.g., "#ff6b35")
  - buttonPosition: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  - panelWidth: number (pixels, e.g., 360, 400)
  - panelHeight: number (pixels, e.g., 500, 600)
  - Example: updateChatbotAppearance({ buttonSize: 64, buttonShape: "square" })
  - Example: updateChatbotAppearance({ buttonColor: "custom", buttonCustomColor: "#ff6b35" })
  - When user says "make button square", "change to square", "square button", etc., use buttonShape: "square"
  - When user says "make button round", "circle button", etc., use buttonShape: "circle"
  - When user says "rounded square", "rounded corners", etc., use buttonShape: "rounded"

### UI Element Visibility
- toggleUIElement(element): Show/hide UI elements
  - element: "showProgressSliders" | "showTaskTimes" | "showGoalProgress"
  - Example: toggleUIElement("showProgressSliders") to hide/show task progress sliders

### Data Queries
- getStats(): Get user statistics
- getCategories(): Get all categories
- getPeople(): Get all people/contacts

## Function Calling Format
When the user requests an action, respond with JSON in this format:
{
  "message": "Human-readable response to the user",
  "action": {
    "type": "action_name",
    "params": { ... }
  }
}

If no action is needed, just respond with a message.
`;
  };

  const executeAction = (action) => {
    if (!action || !action.type) return;

    const DM = window.DataManager;
    const notify = window.notify || ((msg, icon) => console.log(`${icon} ${msg}`));

    try {
      switch (action.type) {
        case 'navigateToTab': {
          const tab = action.params?.tab || action.params?.tabName;
          if (tab) {
            window.location.hash = `#${tab}`;
            // Trigger tab change event if handler exists
            window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab } }));
            notify(`Navigated to ${tab} tab`, '📍');
          }
          break;
        }

        case 'addTask': {
          const taskData = action.params || {};
          if (!taskData.title) {
            notify('Task title is required', '❌');
            break;
          }

          const newTask = {
            title: taskData.title,
            category: taskData.category || 'Work',
            priority: taskData.priority || 'Medium',
            weight: taskData.weight || 10,
            estimatedTime: taskData.estimatedTime || '',
            dueDate: taskData.dueDate || '',
            dueTime: taskData.dueTime || '',
            description: taskData.description || '',
            tags: Array.isArray(taskData.tags) ? taskData.tags : (taskData.tags ? [taskData.tags] : []),
            people: Array.isArray(taskData.people) ? taskData.people : (taskData.people ? [taskData.people] : []),
            location: taskData.location || '',
            completed: false
          };

          if (DM?.tasks?.add) {
            DM.tasks.add(newTask);
            notify(`Task "${newTask.title}" added`, '✅');
          } else {
            notify('Unable to add task - DataManager not available', '❌');
          }
          break;
        }

        case 'completeTask': {
          const taskId = action.params?.taskId || action.params?.id;
          if (!taskId) {
            // Try to find by title
            const title = action.params?.title;
            if (title && DM?.tasks) {
              const task = DM.tasks.getAll().find(t => 
                t.title.toLowerCase().includes(title.toLowerCase())
              );
              if (task) {
                DM.tasks.update(task.id, { completed: true, completedAt: new Date().toISOString() });
                notify(`Task "${task.title}" completed!`, '🎉');
                break;
              }
            }
            notify('Task not found', '❌');
            break;
          }

          if (DM?.tasks?.update) {
            const task = DM.tasks.getById(taskId);
            if (task) {
              DM.tasks.update(taskId, { completed: true, completedAt: new Date().toISOString() });
              notify(`Task "${task.title}" completed!`, '🎉');
            } else {
              notify('Task not found', '❌');
            }
          }
          break;
        }

        case 'updateTask': {
          const { taskId, ...updates } = action.params || {};
          if (!taskId) {
            notify('Task ID required', '❌');
            break;
          }

          if (DM?.tasks?.update) {
            DM.tasks.update(taskId, updates);
            notify('Task updated', '✅');
          }
          break;
        }

        case 'deleteTask': {
          const taskId = action.params?.taskId || action.params?.id;
          if (!taskId) {
            notify('Task ID required', '❌');
            break;
          }

          if (DM?.tasks?.remove) {
            const task = DM.tasks.getById(taskId);
            if (task) {
              DM.tasks.remove(taskId);
              notify(`Task "${task.title}" deleted`, '🗑️');
            } else {
              notify('Task not found', '❌');
            }
          }
          break;
        }

        case 'addGoal': {
          const goalData = action.params || {};
          if (!goalData.title) {
            notify('Goal title is required', '❌');
            break;
          }

          const newGoal = {
            title: goalData.title,
            description: goalData.description || '',
            category: goalData.category || 'General',
            target: goalData.target || 0,
            progress: goalData.progress || 0
          };

          if (DM?.goals?.add) {
            DM.goals.add(newGoal);
            notify(`Goal "${newGoal.title}" added`, '✅');
          }
          break;
        }

        case 'updateGoal': {
          const { goalId, ...updates } = action.params || {};
          if (!goalId) {
            notify('Goal ID required', '❌');
            break;
          }

          if (DM?.goals?.update) {
            DM.goals.update(goalId, updates);
            notify('Goal updated', '✅');
          }
          break;
        }

        case 'updateSettings': {
          const updates = action.params || {};
          if (!DM?.settings) {
            notify('Settings not available', '❌');
            break;
          }

          const currentSettings = DM.settings.get() || {};
          const newSettings = { ...currentSettings, ...updates };
          DM.settings.set(newSettings);
          
          // Handle theme change specially
          if (updates.theme) {
            document.documentElement.setAttribute('data-theme', updates.theme);
            notify(`Theme changed to ${updates.theme}`, '🎨');
          } else {
            notify('Settings updated', '✅');
          }
          break;
        }

        case 'toggleSetting': {
          const settingKey = action.params?.key;
          if (!settingKey) {
            notify('Setting key required', '❌');
            break;
          }

          if (!DM?.settings) {
            notify('Settings not available', '❌');
            break;
          }

          const currentSettings = DM.settings.get() || {};
          const newValue = !currentSettings[settingKey];
          const newSettings = { ...currentSettings, [settingKey]: newValue };
          DM.settings.set(newSettings);
          
          // Handle chatbot visibility toggle
          if (settingKey === 'chatbotEnabled') {
            notify(newValue ? 'Chatbot enabled' : 'Chatbot disabled', newValue ? '🤖' : '👋');
          } else {
            notify(`${settingKey} ${newValue ? 'enabled' : 'disabled'}`, '✅');
          }
          break;
        }

        case 'getSettings': {
          // This is a query action - handled in processMessage, not here
          if (DM?.settings) {
            const currentSettings = DM.settings.get() || {};
            notify('Settings retrieved', '✅');
            console.log('Current settings:', currentSettings);
          }
          break;
        }

        case 'updateChatbotAppearance': {
          const updates = action.params || {};
          if (!DM?.settings) {
            notify('Settings not available', '❌');
            break;
          }

          const currentSettings = DM.settings.get() || {};
          const currentAppearance = currentSettings.chatbotAppearance || {};
          const newAppearance = { ...currentAppearance, ...updates };
          
          DM.settings.set({
            ...currentSettings,
            chatbotAppearance: newAppearance
          });

          console.log('Chatbot appearance updated:', newAppearance);
          // Dispatch event after a small delay to ensure settings are saved
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('chatbot-appearance-updated', { detail: newAppearance }));
          }, 10);
          notify('Chatbot appearance updated', '🎨');
          break;
        }

        case 'toggleUIElement': {
          const elementName = action.params?.element;
          if (!elementName) {
            notify('Element name required', '❌');
            break;
          }

          if (!DM?.settings) {
            notify('Settings not available', '❌');
            break;
          }

          const currentSettings = DM.settings.get() || {};
          const currentUI = currentSettings.uiElements || {};
          const newValue = !currentUI[elementName];
          const newUI = { ...currentUI, [elementName]: newValue };
          
          DM.settings.set({
            ...currentSettings,
            uiElements: newUI
          });

          window.dispatchEvent(new CustomEvent('ui-elements-updated'));
          notify(`${elementName} ${newValue ? 'shown' : 'hidden'}`, '👁️');
          break;
        }

        case 'resetAppearance': {
          // Trigger page reload to apply all changes
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          break;
        }

        default:
          console.log('Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('Action execution error:', error);
      notify(`Error executing action: ${error.message}`, '❌');
    }
  };

  const processMessage = async (userMessage, messageHistory, appState) => {
    const apiKey = appState.settings?.geminiApiKey || '';
    if (!apiKey) {
      return {
        message: "I need a Gemini API key to function. Please add it in Settings > AI.",
        action: null
      };
    }

    // Build context from app state
    const tasksSummary = appState.tasks?.length 
      ? `${appState.tasks.length} tasks (${appState.tasks.filter(t => !t.completed).length} incomplete)`
      : 'No tasks';
    
    const goalsSummary = appState.goals?.length 
      ? `${appState.goals.length} goals`
      : 'No goals';

    const categoriesList = appState.categories?.join(', ') || 'None';

    // Get current settings for context
    const currentSettings = appState.settings || {};
    const availableThemes = ['dark', 'light'];
    if (currentSettings.customThemes) {
      availableThemes.push(...Object.keys(currentSettings.customThemes));
    }

    // Build conversation context
    const conversationContext = messageHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Create system prompt with app knowledge
    const systemPrompt = `${getAppKnowledge()}

## Current App State
- Current tab: ${appState.currentTab || 'tasks'}
- Tasks: ${tasksSummary}
- Goals: ${goalsSummary}
- Categories: ${categoriesList}
- User stats: Level ${appState.userStats?.level || 1}, ${appState.userStats?.xp || 0} XP
- Current theme: ${currentSettings.theme || 'dark'}
- Available themes: ${availableThemes.join(', ')}
- Chatbot enabled: ${currentSettings.chatbotEnabled !== false ? 'yes' : 'no'}

## Recent Conversation
${conversationContext || 'No previous messages'}

## Instructions
1. Be helpful, friendly, and concise
2. When the user requests an action, respond with JSON containing both a message and an action
3. Use the exact action types and parameter formats specified above
4. If the user asks a question, just provide a helpful answer without an action
5. If you need to find a task by name, use partial matching in the action params
6. When user requests a color (e.g., "blue", "red", "green"), convert to hex format:
   - blue = #0000ff or #0066ff
   - red = #ff0000 or #ff3333
   - green = #00ff00 or #00cc00
   - purple = #800080 or #9966cc
   - etc.
7. Always set both buttonColor: "custom" AND buttonCustomColor: "#hexcode" when user requests a specific color

## User Message
${userMessage}

## Response Format
Respond with JSON in this format:
{
  "message": "Your response to the user",
  "action": {
    "type": "action_name",
    "params": { ... }
  }
}

If no action is needed, set action to null.
Return ONLY valid JSON, no other text.`;

    try {
      const response = await callGemini(systemPrompt, apiKey);
      
      if (response.error) {
        return {
          message: `Sorry, I encountered an error: ${response.error}. Please check your API key.`,
          action: null
        };
      }

      // Parse JSON response
      let parsed;
      try {
        const jsonText = response.text.trim();
        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         jsonText.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, jsonText];
        const jsonStr = jsonMatch[1] || jsonText;
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        // If JSON parsing fails, treat entire response as message
        console.warn('Failed to parse AI response as JSON:', parseError);
        return {
          message: response.text || 'I received a response but couldn\'t parse it properly.',
          action: null
        };
      }

      return {
        message: parsed.message || response.text || 'I processed your request.',
        action: parsed.action || null
      };
    } catch (error) {
      console.error('Chatbot processing error:', error);
      return {
        message: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        action: null
      };
    }
  };

  return {
    getAppState,
    processMessage,
    executeAction
  };
}

