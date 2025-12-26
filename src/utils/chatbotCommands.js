// src/utils/chatbotCommands.js
// ===========================================
// PRESET COMMANDS - Fast, non-AI commands
// ===========================================

/**
 * Preset commands that work instantly without AI
 */
export const PRESET_COMMANDS = {
  help: {
    description: 'Show this help message with all available commands',
    aliases: ['?', 'commands', 'list'],
    execute: () => {
      const commands = Object.entries(PRESET_COMMANDS)
        .map(([cmd, info]) => {
          const aliases = info.aliases ? ` (${info.aliases.join(', ')})` : '';
          return `• **${cmd}**${aliases}: ${info.description}`;
        })
        .join('\n');
      
      return {
        message: `# Available Commands\n\n${commands}\n\n💡 Tip: You can also ask me anything in natural language!`,
        action: null
      };
    }
  },

  tasks: {
    description: 'Navigate to the Tasks tab',
    aliases: ['task', 'todo', 'todos'],
    execute: () => {
      window.location.hash = '#tasks';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'tasks' } }));
      return {
        message: '📋 Navigated to Tasks tab',
        action: { type: 'navigateToTab', params: { tab: 'tasks' } }
      };
    }
  },

  spin: {
    description: 'Navigate to the Spin tab',
    aliases: ['wheel', 'random'],
    execute: () => {
      window.location.hash = '#spin';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'spin' } }));
      return {
        message: '🎰 Navigated to Spin tab',
        action: { type: 'navigateToTab', params: { tab: 'spin' } }
      };
    }
  },

  timer: {
    description: 'Navigate to the Timer tab',
    aliases: ['track', 'time', 'focus'],
    execute: () => {
      window.location.hash = '#timer';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'timer' } }));
      return {
        message: '⏱️ Navigated to Timer tab',
        action: { type: 'navigateToTab', params: { tab: 'timer' } }
      };
    }
  },

  goals: {
    description: 'Navigate to the Goals tab',
    aliases: ['goal'],
    execute: () => {
      window.location.hash = '#goals';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'goals' } }));
      return {
        message: '🎯 Navigated to Goals tab',
        action: { type: 'navigateToTab', params: { tab: 'goals' } }
      };
    }
  },


  ideas: {
    description: 'Navigate to the Ideas tab',
    aliases: ['idea', 'lists', 'list', 'notes'],
    execute: () => {
      window.location.hash = '#lists';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'lists' } }));
      return {
        message: '💡 Navigated to Ideas tab',
        action: { type: 'navigateToTab', params: { tab: 'lists' } }
      };
    }
  },

  duel: {
    description: 'Navigate to the Duel tab',
    aliases: ['battle', 'compare'],
    execute: () => {
      window.location.hash = '#duel';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'duel' } }));
      return {
        message: '⚔️ Navigated to Duel tab',
        action: { type: 'navigateToTab', params: { tab: 'duel' } }
      };
    }
  },

  settings: {
    description: 'Navigate to the Settings tab',
    aliases: ['setting', 'config', 'preferences'],
    execute: () => {
      window.location.hash = '#settings';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'settings' } }));
      return {
        message: '⚙️ Navigated to Settings tab',
        action: { type: 'navigateToTab', params: { tab: 'settings' } }
      };
    }
  },

  people: {
    description: 'Navigate to the People tab',
    aliases: ['contacts', 'contact'],
    execute: () => {
      window.location.hash = '#people';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'people' } }));
      return {
        message: '👥 Navigated to People tab',
        action: { type: 'navigateToTab', params: { tab: 'people' } }
      };
    }
  },

  places: {
    description: 'Navigate to the Places tab',
    aliases: ['place', 'locations', 'location'],
    execute: () => {
      window.location.hash = '#places';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'places' } }));
      return {
        message: '📍 Navigated to Places tab',
        action: { type: 'navigateToTab', params: { tab: 'places' } }
      };
    }
  },

  theme: {
    description: 'Toggle between dark and light theme',
    aliases: ['dark', 'light', 'toggle theme'],
    execute: (input) => {
      const DM = window.DataManager;
      if (!DM?.settings) {
        return {
          message: '❌ Settings not available',
          action: null
        };
      }

      const currentSettings = DM.settings.get() || {};
      const currentTheme = currentSettings.theme || 'dark';
      
      // Check if user specified theme
      const lowerInput = input.toLowerCase();
      let newTheme;
      if (lowerInput.includes('light')) {
        newTheme = 'light';
      } else if (lowerInput.includes('dark')) {
        newTheme = 'dark';
      } else {
        // Toggle
        newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      }

      DM.settings.set({ ...currentSettings, theme: newTheme });
      document.documentElement.setAttribute('data-theme', newTheme);
      
      return {
        message: `🎨 Theme changed to ${newTheme}`,
        action: { type: 'updateSettings', params: { theme: newTheme } }
      };
    }
  },

  sound: {
    description: 'Toggle sound effects on/off',
    aliases: ['sounds', 'audio'],
    execute: () => {
      const DM = window.DataManager;
      if (!DM?.settings) {
        return {
          message: '❌ Settings not available',
          action: null
        };
      }

      const currentSettings = DM.settings.get() || {};
      const newValue = !currentSettings.sound;
      DM.settings.set({ ...currentSettings, sound: newValue });
      
      return {
        message: newValue ? '🔊 Sounds enabled' : '🔇 Sounds disabled',
        action: { type: 'toggleSetting', params: { key: 'sound' } }
      };
    }
  },

  confetti: {
    description: 'Toggle confetti effects on/off',
    aliases: ['celebration'],
    execute: () => {
      const DM = window.DataManager;
      if (!DM?.settings) {
        return {
          message: '❌ Settings not available',
          action: null
        };
      }

      const currentSettings = DM.settings.get() || {};
      const newValue = !currentSettings.confetti;
      DM.settings.set({ ...currentSettings, confetti: newValue });
      
      return {
        message: newValue ? '🎉 Confetti enabled' : '🎉 Confetti disabled',
        action: { type: 'toggleSetting', params: { key: 'confetti' } }
      };
    }
  },

  stats: {
    description: 'Show your current statistics or navigate to Stats tab',
    aliases: ['stat', 'my stats', 'progress', 'data', 'analytics'],
    execute: (input) => {
      const lowerInput = (input || '').toLowerCase();
      
      // If user says "my stats" or "show stats", show statistics
      if (lowerInput.includes('my') || lowerInput.includes('show') || lowerInput.includes('progress')) {
        const DM = window.DataManager;
        if (!DM) {
          return {
            message: '❌ DataManager not available',
            action: null
          };
        }

        const tasks = DM.tasks?.getAll() || [];
        const goals = DM.goals?.getAll() || [];
        const userStats = DM.userStats?.get() || {};
        const completedTasks = tasks.filter(t => t.completed).length;
        const totalTasks = tasks.length;
        
        return {
          message: `📊 **Your Statistics**\n\n` +
            `📋 Tasks: ${totalTasks} total, ${completedTasks} completed\n` +
            `🎯 Goals: ${goals.length} active\n` +
            `⭐ Level: ${userStats.level || 1}\n` +
            `💎 XP: ${userStats.xp || 0}`,
          action: null
        };
      }
      
      // Otherwise, navigate to stats tab
      window.location.hash = '#stats';
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: 'stats' } }));
      return {
        message: '📊 Navigated to Stats tab',
        action: { type: 'navigateToTab', params: { tab: 'stats' } }
      };
    }
  },

  clear: {
    description: 'Clear the chat history',
    aliases: ['reset', 'clear chat'],
    execute: () => {
      return {
        message: '🗑️ Chat cleared',
        action: { type: 'clearChat', params: {} }
      };
    }
  },

  close: {
    description: 'Close the chatbot',
    aliases: ['exit', 'hide'],
    execute: () => {
      return {
        message: '👋 Closing chatbot...',
        action: { type: 'closeChatbot', params: {} }
      };
    }
  },

  'reset appearance': {
    description: 'Reset all appearance customizations to defaults',
    aliases: ['reset ui', 'failsafe', 'undo appearance', 'restore defaults'],
    execute: () => {
      const DM = window.DataManager;
      if (!DM?.settings) {
        return {
          message: '❌ Settings not available',
          action: null
        };
      }

      const currentSettings = DM.settings.get() || {};
      const defaultAppearance = {
        buttonSize: 56,
        buttonShape: 'circle',
        buttonColor: 'gradient',
        buttonCustomColor: '#667eea',
        buttonPosition: 'bottom-right',
        buttonX: null,
        buttonY: null,
        panelWidth: 360,
        panelHeight: 500,
        panelX: null,
        panelY: null,
      };
      const defaultUI = {
        showProgressSliders: true,
        showTaskTimes: true,
        showGoalProgress: true,
      };

      DM.settings.set({
        ...currentSettings,
        chatbotAppearance: defaultAppearance,
        uiElements: defaultUI
      });

      // Force reload to apply changes
      window.dispatchEvent(new CustomEvent('chatbot-appearance-updated'));
      
      return {
        message: '✅ Appearance reset to defaults! The page will refresh to apply changes.',
        action: { type: 'resetAppearance', params: {} }
      };
    }
  }
};

/**
 * Check if input matches a preset command
 */
export function checkPresetCommand(input) {
  if (!input || typeof input !== 'string') return null;
  
  const normalized = input.trim().toLowerCase();
  
  // Check exact matches and aliases
  for (const [cmd, info] of Object.entries(PRESET_COMMANDS)) {
    // Check exact match
    if (normalized === cmd) {
      return { command: cmd, handler: info.execute };
    }
    
    // Check aliases
    if (info.aliases) {
      for (const alias of info.aliases) {
        if (normalized === alias.toLowerCase()) {
          return { command: cmd, handler: info.execute };
        }
      }
    }
    
    // Check if input starts with command (for commands that take parameters)
    if (normalized.startsWith(cmd + ' ') || normalized.startsWith(cmd + '\n')) {
      return { command: cmd, handler: info.execute, input };
    }
  }
  
  return null;
}

