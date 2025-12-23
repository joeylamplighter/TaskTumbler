# Working with TaskTumbler on Multiple Computers

This guide shows you how to sync your project between different computers using GitHub.

## 🖥️ Setup on a New Computer

### Step 1: Install Prerequisites

1. **Install Git** (if not already installed)
   - Download from: https://git-scm.com/download/win
   - Or use: `winget install Git.Git` (Windows 11)

2. **Install Node.js** (for your project)
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

### Step 2: Clone Your Repository

Open PowerShell/Command Prompt and run:

```powershell
# Navigate to where you want the project
cd C:\Users\YourName\Projects

# Clone the repository
git clone https://github.com/joeylamplighter/TaskTumbler.git

# Enter the project folder
cd TaskTumbler

# Install dependencies
npm install
```

**That's it!** You now have a complete copy of your project.

### Step 3: Configure Git (First Time Only)

Set your name and email (use same as GitHub account):

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 🔄 Daily Workflow: Syncing Between Computers

### Scenario: Working on Computer A (Home)

```powershell
# 1. Make your changes to the code
# 2. Check what changed
git status

# 3. Stage and commit
git add .
git commit -m "Added new feature"

# 4. Push to GitHub
git push
```

### Scenario: Working on Computer B (Office/Laptop)

**ALWAYS pull first to get latest changes:**

```powershell
# 1. Get latest changes from GitHub
git pull

# 2. Make your changes
# 3. Stage and commit
git add .
git commit -m "Fixed bug"

# 4. Push to GitHub
git push
```

---

## ⚠️ Important Rules

### Rule #1: Always Pull Before You Push

**Before making changes on any computer:**

```powershell
git pull
```

This ensures you have the latest code from GitHub.

### Rule #2: Commit Before Switching Computers

**Before leaving a computer:**

```powershell
git add .
git commit -m "Work in progress"
git push
```

This saves your work to GitHub.

---

## 🔀 Handling Conflicts

### What is a Conflict?

A conflict happens when:
- You edit the same file on two computers
- You commit on Computer A
- You commit on Computer B without pulling first
- Git doesn't know which version to keep

### How to Resolve Conflicts

**Step 1: Pull and see the conflict**
```powershell
git pull
```

You'll see something like:
```
Auto-merging file.jsx
CONFLICT (content): Merge conflict in file.jsx
```

**Step 2: Open the conflicted file**

You'll see markers like:
```javascript
<<<<<<< HEAD
// Your changes on this computer
=======
// Changes from GitHub
>>>>>>> branch-name
```

**Step 3: Edit the file**

Choose which code to keep, or combine both. Remove the conflict markers:
```javascript
// Keep both changes or choose one
```

**Step 4: Mark as resolved**
```powershell
git add file.jsx
git commit -m "Resolved merge conflict"
git push
```

---

## 📋 Complete Workflow Example

### Morning: Start Work on Computer A

```powershell
cd C:\Users\YourName\Projects\TaskTumbler
git pull                    # Get latest
# Make changes...
git add .
git commit -m "Morning work"
git push
```

### Afternoon: Switch to Computer B

```powershell
cd C:\Users\YourName\Projects\TaskTumbler
git pull                    # Get morning's work
# Make changes...
git add .
git commit -m "Afternoon work"
git push
```

### Evening: Back to Computer A

```powershell
cd C:\Users\YourName\Projects\TaskTumbler
git pull                    # Get afternoon's work
# Continue working...
```

---

## 🎯 Best Practices

### 1. **Pull Frequently**
```powershell
# Start every session with:
git pull
```

### 2. **Commit Often**
- Small, frequent commits are better than huge ones
- Commit before switching computers
- Commit before closing your laptop

### 3. **Push Regularly**
- Push when you finish a feature
- Push before leaving a computer
- Push at end of day

### 4. **Use Descriptive Commit Messages**
```powershell
git commit -m "Add user authentication"
git commit -m "Fix settings panel bug"
git commit -m "Update mobile responsive styles"
```

---

## 🛠️ Useful Commands

### Check Status
```powershell
git status              # See what's changed
git log --oneline      # See commit history
```

### See What's Different
```powershell
git diff                # See uncommitted changes
git diff HEAD~1         # Compare with last commit
```

### Undo Mistakes
```powershell
git restore file.jsx           # Discard changes to a file
git restore --staged file.jsx  # Unstage a file
```

### Check Remote Status
```powershell
git fetch              # Check for updates (doesn't merge)
git status             # See if you're ahead/behind
```

---

## 🔐 Authentication

### First Time on New Computer

GitHub may ask for authentication. Options:

**Option 1: Personal Access Token (Recommended)**
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy token
5. Use token as password when Git asks

**Option 2: GitHub CLI**
```powershell
# Install GitHub CLI
winget install GitHub.cli

# Authenticate
gh auth login
```

**Option 3: SSH Keys (Advanced)**
- More secure, no password needed
- Set up once, works forever
- See: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

## 🚨 Troubleshooting

### "Your branch is behind 'origin/main'"
```powershell
git pull
```

### "Failed to push - authentication required"
- Create Personal Access Token at GitHub
- Use token as password

### "Merge conflict"
- Follow conflict resolution steps above
- Or: `git merge --abort` to cancel merge

### "Repository not found"
- Check you're in the right folder: `pwd` or `cd`
- Verify remote: `git remote -v`
- Re-clone if needed: `git clone https://github.com/joeylamplighter/TaskTumbler.git`

### "Changes not staged for commit"
- You need to `git add .` before committing

---

## 📱 Quick Reference Card

### Starting Work (Any Computer)
```powershell
cd TaskTumbler
git pull
```

### Finishing Work (Any Computer)
```powershell
git add .
git commit -m "Description"
git push
```

### Check Status
```powershell
git status
```

---

## 💡 Pro Tips

1. **Set up aliases** (optional):
   ```powershell
   git config --global alias.st status
   git config --global alias.co checkout
   git config --global alias.br branch
   ```
   Then use: `git st` instead of `git status`

2. **Use branches for experiments**:
   ```powershell
   git checkout -b experiment
   # Try something risky
   git checkout main  # Go back if it breaks
   ```

3. **Keep a consistent folder structure**:
   - Use same path on all computers if possible
   - Or use a dedicated "Projects" folder

4. **Sync before major changes**:
   - Always `git pull` before starting big features
   - Prevents conflicts

---

**Your project is now ready to work seamlessly across all your computers! 🎉**

