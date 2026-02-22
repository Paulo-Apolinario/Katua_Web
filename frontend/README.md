# trashsync — Frontend (React + Vite)

This is the admin dashboard for trashsync. It connects to the Express/MySQL backend and provides route planning, collections tracking, staff/vehicle management, analytics, and exports.

## Requirements
- Node.js 18+
- Backend API running (see `../backend`)

## Environment
Open `.env` and update
- `VITE_API_BASE_URL` — e.g. `http://localhost:3000`

## Install & Run (Development)
```
npm install
npm run dev
```
Dev server default: `http://localhost:5173`

## Build for Production
```
npm run build
npm run preview
```
The build outputs to `dist/`. Serve `dist` via any static host or behind your backend/NGINX.

## Notes
- Ensure backend CORS `FRONTEND_URL` matches your dev/prod URL
- Update brand assets in `public/`
- For reviewer/demo, set `VITE_API_BASE_URL` to the live API URL
