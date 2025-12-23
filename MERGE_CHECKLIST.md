# Safe Merge Checklist - Quick Reference

## 🚦 Current Status

- **Active Codebase**: `src/` (modern, but placeholders only)
- **Legacy Codebase**: `js/` (fully functional, but not loaded)
- **Risk Level**: 🔴 HIGH - Two parallel codebases with overlapping features

---

## ✅ Phase 1: Foundation (SAFE - Do First)

**Agent**: Modernization Team  
**Duration**: 1 day  
**Blocks**: None

- [ ] Delete `js/features/13-03-spin - Copy.jsx` (after verifying current version)
- [ ] Delete `js/logic/22-app-utils.trash.jsx` (trash file)
- [ ] Archive `js/features/task-form/13-08-modals.old1218.jsx` (keep for reference)
- [ ] Document current legacy functionality
- [ ] Create backup branch/tag

**✅ Safe to proceed**: No coordination needed

---

## ⚠️ Phase 2: Core Infrastructure (COORDINATE)

**Agent**: Modernization Team  
**Duration**: 3-5 days  
**Blocks**: All feature work in legacy

- [ ] **Announce freeze**: Notify team, pause legacy development
- [ ] Migrate `js/core/03-data-manager.js` → ES6 module
- [ ] Migrate `js/core/03-storage.js` → ES6 module
- [ ] Migrate `js/core/04-utils.js` → ES6 module
- [ ] Migrate `js/logic/13-core-utils.js` → ES6 module
- [ ] Migrate `js/core/01-firebase.js` → ES6 module (if needed)
- [ ] Test data persistence
- [ ] **Unfreeze**: Allow modern structure development

**⚠️ Coordination Required**: Feature team must freeze legacy work

---

## ⚠️ Phase 3: UI Components (COORDINATE)

**Agent**: Modernization Team  
**Duration**: 2-3 days  
**Blocks**: Legacy UI work

- [ ] **Announce freeze**: Notify team
- [ ] Migrate Header: `js/ui/10-core-header.jsx` → `src/components/Header.jsx`
- [ ] Migrate NavBar: `js/ui/10-core-navbar.jsx` → `src/components/NavBar.jsx`
- [ ] Migrate Modals: `js/features/task-form/13-08-modals.jsx` → modern component
- [ ] Test UI components in isolation
- [ ] **Unfreeze**: Allow continued work

**⚠️ Coordination Required**: Legacy modals may be in use

---

## 🔴 Phase 4: Feature Migration (SEQUENTIAL - One at a Time)

**Agent**: Modernization Team  
**Duration**: 10-15 days total  
**Blocks**: Legacy work on each feature

### Migration Order (Safest → Riskiest):

#### 4.1 Ideas Tab 🟢 LOWEST RISK
- [ ] **Freeze**: Legacy Ideas work
- [ ] Migrate `js/features/13-05-ideas.jsx` → `src/components/tabs/IdeasTab.jsx`
- [ ] Test in modern app
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.2 Goals Tab 🟢 LOW RISK
- [ ] **Freeze**: Legacy Goals work
- [ ] Migrate `js/features/13-06-goals.jsx` → `src/components/tabs/GoalsTab.jsx`
- [ ] Test in modern app
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.3 Stats Tab 🟡 MEDIUM RISK
- [ ] **Freeze**: Legacy Stats work
- [ ] Migrate `js/features/13-09-stats.jsx` → `src/components/tabs/StatsTab.jsx`
- [ ] Test in modern app
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.4 Duel Tab 🟡 MEDIUM RISK
- [ ] **Freeze**: Legacy Duel work
- [ ] Migrate `js/features/13-10-duel.jsx` → `src/components/tabs/DuelTab.jsx`
- [ ] Test in modern app
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.5 Timer Tab 🔴 HIGH RISK
- [ ] **Freeze**: Legacy Timer work
- [ ] Migrate `js/features/13-04-timer.jsx` → `src/components/tabs/TimerTab.jsx`
- [ ] Test timer persistence
- [ ] Test activity logging
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.6 Settings Tab 🔴 HIGH RISK
- [ ] **Freeze**: Legacy Settings work
- [ ] Migrate `js/features/13-07-settings.jsx` → `src/components/tabs/SettingsTab.jsx`
- [ ] Test settings persistence
- [ ] Test category multipliers
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.7 Tasks Tab 🔴 HIGHEST RISK
- [ ] **Freeze**: Legacy Tasks work
- [ ] Migrate `js/features/13-02-tasks.jsx` → `src/components/tabs/TasksTab.jsx`
- [ ] Test task CRUD operations
- [ ] Test task filtering
- [ ] Test task export
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.8 Spin Tab 🔴 HIGHEST RISK
- [ ] **Freeze**: Legacy Spin work
- [ ] Migrate `js/features/13-03-spin.jsx` → `src/components/tabs/SpinTab.jsx`
- [ ] Migrate `js/features/13-03a-spin-ui.jsx` → modern component
- [ ] Migrate `js/features/13-03b-spin-winner-popup.jsx` → modern component
- [ ] Test spin logic
- [ ] Test filters
- [ ] Test winner popup
- [ ] **Unfreeze**: Continue on modern structure only

#### 4.9 App Root 🔴 HIGHEST RISK
- [ ] **Freeze**: Legacy App work
- [ ] Migrate `js/logic/22-app.jsx` → `src/App.jsx`
- [ ] Integrate all tabs
- [ ] Test full app flow
- [ ] Test state management
- [ ] Test error boundaries
- [ ] **Unfreeze**: Continue on modern structure only

**🔴 Critical**: Migrate in this exact order. Do not skip steps.

---

## ✅ Phase 5: Cleanup (SAFE - Do Last)

**Agent**: Modernization Team  
**Duration**: 2-3 days  
**Blocks**: None

- [ ] **Final Testing**:
  - [ ] All tabs functional
  - [ ] Data persistence working
  - [ ] No console errors
  - [ ] User data preserved
  - [ ] Performance acceptable
  - [ ] Cross-browser testing

- [ ] **Remove Legacy Code**:
  - [ ] Delete `js/` directory (after verification)
  - [ ] Update `index.html` if needed
  - [ ] Update documentation

- [ ] **Final Verification**:
  - [ ] End-to-end testing
  - [ ] User acceptance testing
  - [ ] Production readiness check

**✅ Safe to proceed**: Only after all features verified

---

## 🚨 Per-Feature Freeze Protocol

When migrating a feature, follow this protocol:

1. **Announce** (Slack/Email/Issue):
   ```
   🚧 FREEZING: [Feature Name] migration starting
   - Legacy work on [Feature] is frozen
   - Expected completion: [Date]
   - Contact: [Agent Name]
   ```

2. **Freeze**:
   - Mark legacy file as "DO NOT EDIT"
   - Create migration branch
   - Document current state

3. **Migrate**:
   - Copy logic to modern structure
   - Convert to ES6 modules
   - Test in isolation

4. **Integrate**:
   - Add to modern app
   - Test end-to-end
   - Verify data compatibility

5. **Unfreeze**:
   ```
   ✅ UNFREEZING: [Feature Name] migration complete
   - Modern structure is now active
   - Legacy code can be ignored
   - Continue development on modern structure only
   ```

---

## 📋 Quick Decision Matrix

| Situation | Action |
|-----------|--------|
| Need to add feature | Work on modern structure only (after Phase 2) |
| Need to fix bug in legacy | Freeze feature, migrate to modern, fix there |
| Migration in progress | Wait for completion, then work on modern |
| Both structures modified | **STOP** - Coordinate with migration team |
| Data layer changes | **STOP** - Must coordinate (Phase 2) |

---

## 🎯 Agent Responsibilities

### Modernization Team (Agent 1)
- ✅ Execute Phases 1-5
- ✅ Communicate freeze/unfreeze
- ✅ Test thoroughly
- ✅ Document changes

### Feature Team (Agent 2)
- ✅ Freeze legacy work when notified
- ✅ Work on modern structure after Phase 2
- ✅ Help with migration if needed
- ✅ Test migrated features

---

## ⚡ Emergency Rollback

If migration fails:

1. **Stop migration immediately**
2. **Revert to legacy**:
   - Change `index.html` to load legacy scripts
   - Restore from backup branch
3. **Document issue**
4. **Fix in legacy first**, then retry migration
5. **Do not** continue migration with broken features

---

**Last Updated**: 2025-01-XX  
**Status**: Ready for execution  
**Next Step**: Phase 1 - Foundation (Safe to start immediately)

