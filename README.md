# TaskTumbler v2

Clean React skeleton for TaskTumbler migration project.

## Structure

```
tasktumbler-v2/
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── index.html           # Entry HTML
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # Main app component with routing
│   ├── components/
│   │   ├── Header.jsx   # App header with brand
│   │   ├── NavBar.jsx   # Bottom navigation
│   │   └── tabs/        # Tab components (placeholders)
│   └── styles/
│       └── main.css     # Global styles
└── README.md
```

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will open at `http://localhost:3000`

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## Features

- ✅ Clean React 18 setup with Vite
- ✅ Tab-based navigation (8 tabs)
- ✅ URL hash routing
- ✅ Responsive design
- ✅ Placeholder screens for all tabs
- ✅ Minimal styling (ready for migration)

## Tabs

- 🎰 Spin
- 📋 Tasks
- ⏱️ Track (Timer)
- 💡 Ideas
- 🎯 Goals
- 📊 Stats
- ⚔️ Duel
- ⚙️ Settings

## Next Steps

1. Migrate business logic from legacy repo
2. Add state management (if needed)
3. Integrate Firebase (if needed)
4. Add feature implementations tab by tab

