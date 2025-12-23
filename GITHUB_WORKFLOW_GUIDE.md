# GitHub Workflow Guide for TaskTumbler

Now that your project is on GitHub, here's how to use it effectively for development!

## 🔄 Daily Development Workflow

### Making Changes and Committing

1. **Make your code changes** (edit files, add features, fix bugs)

2. **Check what changed:**
   ```powershell
   git status
   ```

3. **Stage your changes:**
   ```powershell
   git add .                    # Add all changes
   # OR
   git add specific-file.jsx    # Add specific files
   ```

4. **Commit with a descriptive message:**
   ```powershell
   git commit -m "Add new feature: task filtering"
   git commit -m "Fix bug in settings panel"
   git commit -m "Update styling for mobile view"
   ```

5. **Push to GitHub:**
   ```powershell
   git push
   ```

### Good Commit Messages
- Be descriptive: "Fix login bug" not just "fix"
- Use present tense: "Add feature" not "Added feature"
- Keep it concise but informative

## 📋 Common Git Commands

### View Changes
```powershell
git status              # See what files changed
git diff                # See detailed changes (unstaged)
git diff --staged       # See changes you're about to commit
git log                 # See commit history
```

### Undo Changes
```powershell
git restore file.jsx           # Discard changes to a file (before staging)
git restore --staged file.jsx  # Unstage a file (keep changes)
git reset HEAD~1              # Undo last commit (keep changes)
```

### Branching (for features/experiments)
```powershell
git branch feature-name        # Create new branch
git checkout feature-name     # Switch to branch
git checkout -b feature-name  # Create and switch in one command
git merge feature-name        # Merge branch into main
```

## 🌐 GitHub Features You Can Use

### 1. **View Your Code Online**
- Visit: https://github.com/joeylamplighter/TaskTumbler
- Browse files, see history, search code

### 2. **Issues (Bug Tracking & Feature Requests)**
- Click "Issues" tab on GitHub
- Create issues for:
  - Bugs you find
  - Features you want to add
  - Tasks to remember
- Reference issues in commits: `git commit -m "Fix #5 - login bug"`

### 3. **Releases (Version Tags)**
Tag important versions:
```powershell
git tag v1.0.0
git push --tags
```

### 4. **README.md**
Your project already has a README.md! Update it to:
- Describe what TaskTumbler does
- Add installation instructions
- Include screenshots
- List features

### 5. **GitHub Pages (Host Your App)**
If you want to host your app for free:
- Go to Settings → Pages
- Select your branch and folder
- GitHub will host it at: `https://joeylamplighter.github.io/TaskTumbler/`

## 🔐 Security Best Practices

### Don't Commit Sensitive Data
Your `.gitignore` already excludes:
- `.env` files (environment variables)
- `node_modules/` (dependencies)

**Never commit:**
- API keys
- Passwords
- Personal tokens
- Firebase private keys

### If You Accidentally Commit Secrets
1. Remove the file from Git history
2. Rotate/regenerate the secret
3. Update `.gitignore` if needed

## 🚀 Quick Start Commands

### First Time Setup (if on new computer)
```powershell
git clone https://github.com/joeylamplighter/TaskTumbler.git
cd TaskTumbler
npm install
```

### Daily Workflow
```powershell
# 1. Make changes to your code
# 2. Check what changed
git status

# 3. Stage and commit
git add .
git commit -m "Description of changes"

# 4. Push to GitHub
git push
```

### Update from GitHub (if working on multiple computers)
```powershell
git pull
```

## 📱 Working on Multiple Devices

1. **On Computer A:**
   ```powershell
   git add .
   git commit -m "Work from home"
   git push
   ```

2. **On Computer B:**
   ```powershell
   git pull  # Get latest changes
   # Make changes
   git add .
   git commit -m "Work from office"
   git push
   ```

## 🎯 Recommended Next Steps

1. **Update your README.md** - Make it informative for others (and future you!)

2. **Create your first Issue** - Track a feature or bug you want to work on

3. **Set up GitHub Actions** (optional) - Automate testing/deployment

4. **Add a LICENSE file** - Specify how others can use your code

5. **Enable GitHub Pages** - Host your app for free

## 💡 Pro Tips

- **Commit often** - Small, frequent commits are better than huge ones
- **Write good commit messages** - Future you will thank you
- **Use branches for experiments** - Try new features without breaking main
- **Pull before you push** - Always get latest changes first
- **Review your changes** - Use `git diff` before committing

## 🆘 Troubleshooting

### "Your branch is behind 'origin/main'"
```powershell
git pull  # Get latest changes first
```

### "Failed to push - authentication required"
- GitHub may need a Personal Access Token
- Create one at: https://github.com/settings/tokens

### "Merge conflicts"
- Git will mark conflicts in files
- Edit files to resolve conflicts
- Then: `git add .` and `git commit`

---

**Your repository is ready! Start committing your changes and building your project! 🎉**

