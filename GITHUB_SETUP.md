# GitHub Setup Guide

Your repository is now initialized with git and ready to push to GitHub!

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (name it something like `tasktumbler-v2`)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Step 2: Push Your Code to GitHub

After creating the repository, run these commands in your terminal:

```bash
# Add your GitHub repository as the remote origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push your code to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

## Step 3: Clone on Another Computer

On your other computer, clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
```

## Working Across Multiple Computers

### Before you start working:
```bash
git pull origin main
```

### After making changes:
```bash
git add .
git commit -m "Describe your changes here"
git push origin main
```

## Important Notes

- **Your `.env` file is NOT included** (it's in .gitignore for security)
  - You'll need to copy your `.env` file manually to each computer
  - Never commit `.env` files to git as they contain sensitive keys

- **`node_modules/` is NOT included** (it's in .gitignore)
  - Always run `npm install` after cloning on a new computer

- **`dist/` folder is NOT included** (it's in .gitignore)
  - Run `npm run build` when needed

## Current Status

✅ Git repository initialized
✅ All files committed (138 files)
✅ Branch set to `main`
✅ Ready to push to GitHub

Your initial commit includes:
- Complete TaskTumbler v2 application
- Command palette with Load Sample Data option
- All React components and utilities
- Configuration files
