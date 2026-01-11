# trashsync — Frontend (React + Vite)

Este é o painel de administração do TrashSync. Ele se conecta ao banco de dados Express/MySQL e oferece planejamento de rotas, rastreamento de coletas, gerenciamento de funcionários/veículos, análises e exportações.

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
