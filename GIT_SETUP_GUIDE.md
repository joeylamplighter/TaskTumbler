# Git & GitHub Setup Guide for TaskTumbler

## Step 1: Install Git (if not already installed)

1. Download Git for Windows from: https://git-scm.com/download/win
2. Run the installer with default settings
3. After installation, restart your terminal/IDE

## Step 2: Verify Git Installation

Open PowerShell or Command Prompt and run:
```powershell
git --version
```

## Step 3: Configure Git (First Time Setup)

Set your name and email (use your GitHub account email):
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 4: Initialize Git Repository

Navigate to your project folder and run:
```powershell
cd "C:\Users\default.DESKTOP-VRG0QJ2\Downloads\TaskTumbler"
git init
```

## Step 5: Create GitHub Repository

1. Go to https://github.com and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it (e.g., "TaskTumbler")
4. **Don't** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 6: Connect Local Repository to GitHub

After creating the GitHub repo, you'll see instructions. Run these commands:

```powershell
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/TaskTumbler.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 7: Authentication

GitHub may require authentication:
- **Personal Access Token**: If prompted, create one at https://github.com/settings/tokens
- Or use GitHub CLI: `gh auth login`

## Your .gitignore is Already Set Up! ✅

Your project already has a `.gitignore` file that excludes:
- `node_modules/`
- `dist/` and `build/`
- Environment files
- IDE files
- Logs

---

**Need Help?** Once Git is installed, I can help you run these commands step by step!

