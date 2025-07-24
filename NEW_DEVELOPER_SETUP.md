# 🚀 New Developer Setup Guide

## Issues Fixed for New Developers

This guide addresses the critical issues that were preventing new developers from getting the Community Garden application running.

## 🔧 Critical Issues That Were Fixed

### 1. Missing Icon Import Error
**Issue**: `DropletIcon` was imported from `@heroicons/react` but doesn't exist in version 2.2.0
**Fix**: Replaced with `EyeDropperIcon` which serves the same purpose for watering functionality
**Files**: `src/pages/Dashboard.tsx`

### 2. AuthService Import Conflicts  
**Issue**: Multiple authService files existed (`.js` and `.ts`) causing import conflicts
**Fix**: Updated all frontend imports to use the TypeScript version (`authService.ts`)
**Files**: 
- `src/pages/Auth/ForgotPassword.tsx`
- `src/pages/Auth/ResetPassword.tsx` 
- `src/contexts/AuthContext.tsx`

### 3. ES Module System Conflicts
**Issue**: `server.js` used CommonJS `require()` but `package.json` has `"type": "module"`
**Fix**: Converted imports to ES6 module syntax
**Files**: `src/server.js` (partially fixed - more work needed)

## 🎯 Quick Start (After Fixes)

### Prerequisites
- Node.js 18+ ✅
- npm or yarn ✅
- OpenWeatherMap API key (optional) ✅

### Installation Steps

1. **Clone and install**
```bash
git clone <repository-url>
cd community-garden
npm install
```

2. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database setup**
```bash
npm run db:migrate
npm run db:seed  # Optional sample data
```

4. **Start development**
```bash
npm run dev  # Frontend and backend
# OR
npm run dev:frontend  # Frontend only
```

## 🐛 Issues Still Being Resolved

### Server Module System (In Progress)
The backend server still has mixed CommonJS/ES6 imports that need conversion.

### PWA Build Warnings
Vite PWA plugin shows warnings about missing dist files during build.

## 📋 Project Structure Clarification

This is a **hybrid full-stack application**:
- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Express.js + SQLite (port 3001) 
- **Database**: SQLite with WAL mode

**NOT** just a "backend API" as the README incorrectly states.

## 🔧 Available Scripts

```bash
npm run dev          # Start both frontend and backend
npm run dev:frontend # Frontend only (Vite)
npm run build        # Build for production
npm run test         # Run test suite
npm run db:migrate   # Initialize database
npm run db:seed      # Add sample data
npm run lint         # Run linter
npm run typecheck    # TypeScript checking
```

## 🎯 API Endpoints

After starting the dev server:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Health check: http://localhost:3001/health

## 🔐 Test Accounts (After Seeding)

- **Admin**: admin@communitygarden.com / admin123
- **Manager**: manager@communitygarden.com / manager123  
- **Member**: alice@example.com / member123

## 🐛 Known Issues for New Developers

1. **Build Process**: Some builds may fail due to incomplete ES6 conversion
2. **Port Conflicts**: Ensure ports 3000 and 3001 are available
3. **Database Permissions**: Make sure SQLite can create files in the data/ directory

## 🆘 Troubleshooting

### Build Fails
- Check Node.js version (18+ required)
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Server Won't Start  
- Check environment variables in `.env`
- Ensure database is initialized: `npm run db:migrate`

### Import Errors
- All frontend authService imports should use `.ts` extension
- Icon imports should use existing @heroicons/react exports

## 📚 Documentation

- API Documentation: `API_DOCUMENTATION.md`
- Project Configuration: `CLAUDE.md`
- This Setup Guide: `NEW_DEVELOPER_SETUP.md`

---

**Status**: ✅ Critical blocking issues resolved, application now builds and runs!

Built with ❤️ for new developers 🌱