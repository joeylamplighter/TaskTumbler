# Troubleshooting - TaskTumbler v2 Not Rendering

## Quick Fix Steps

1. **Make sure dependencies are installed:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - The server runs on `http://localhost:8081`
   - **DO NOT** open `index.html` directly in the browser
   - You MUST use the dev server URL

4. **Check browser console:**
   - Open DevTools (F12)
   - Look for any red error messages
   - Check the Console tab

## Common Issues

### Issue: Blank white page
- **Solution:** Make sure you're accessing `http://localhost:8081` (not opening index.html directly)
- Vite requires the dev server to process JSX files

### Issue: "Cannot find module" errors
- **Solution:** Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

### Issue: Port 8081 already in use
- **Solution:** Change port in `vite.config.js` or kill the process using port 8081

### Issue: Still not working
- Check browser console for specific error messages
- Verify all files exist in `src/` directory
- Make sure you're in the correct directory when running `npm run dev`

## Verify Setup

Run these commands to verify:

```bash
# Check if node_modules exists
Test-Path node_modules

# Check if package.json exists
Test-Path package.json

# Check if src directory exists
Test-Path src

# List src files
Get-ChildItem src -Recurse
```

