-- Active: 1743351270787@@127.0.0.1@3306@test
-- Active: 1743351270787@@127.0.0.1@3306@mysql
# trashsync — Waste Collection Management System

A full‑stack waste management system for municipalities and private operators. Includes staff & vehicle management, smart routes, waste collection tracking, reporting, and document management.

## Features
- Authentication 
- Staff management, attendance & documents
- Vehicle management, maintenance logs & documents
- Routes, zones, and bin assignments
- Waste collection tracking and analytics (charts, exports: XLSX/PDF)
- System settings (SMTP, branding), alerts, and dashboard KPIs

## Tech Stack
- Backend: Node.js (Express), MySQL, Drizzle ORM, JWT, Multer, Zod
- Frontend: React (Vite), React Router, ApexCharts, Bootstrap

## Requirements
- Node.js 20+
- MySQL 8+
- npm 9+

## Project Structure
- `backend/` — REST API (Express + Drizzle + MySQL)
- `frontend/` — Admin dashboard (React + Vite)

## Installation (Development)
1. Clone/extract the package
2. Backend: `cd backend && npm install`
3. Frontend: `cd frontend && npm install`
4. Copy `backend/env.example` to `backend/.env` and fill values
5. Database setup: choose one path
   - option 1: Import `database.sql`, 
   - option 2: Run `npm run db:migrate` & `npm run db:seed`
6. Start dev servers:
   - Backend: `npm run dev` (in `backend/`)
   - Frontend: `npm run dev` (in `frontend/`)

## Environment Variables (Backend)
See `backend/env.example` for full list. Key items:
- `DB_HOST, DB_USER, DB_PASSWORD, DB_NAME`
- `JWT_SECRET, JWT_EXPIRES_IN`
- `PORT` (default 3000), `FRONTEND_URL` (dev default http://localhost:5173)
- SMTP: `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME`

## Database
- Import `database.sql` (schema + minimal seed + admin user)

Default admin (example):
- Email: `admin@trashsync.app`
- Password: `Admin@12345`

## Scripts (Backend)
- `npm run start` — start server
- `npm run dev` — start with watch
- `npm run db:generate` — generate migrations
- `npm run db:migrate` — run migrations
- `npm run db:seed` — run seeds

## Scripts (Frontend)
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## Production Build & Deploy
1. Frontend: `cd frontend && npm run build` → serves `frontend/dist`
2. Serve `dist` via any static host or behind Node/NGINX
3. Backend: set `CORS`/`FRONTEND_URL` to production URL and start `node server.js`
4. Configure environment, database backups, and SMTP

## API Docs
- `/documentation/index.html#api-docs`

## Documentation
- Extended docs, screenshots, and troubleshooting are available in `/documentation/index.html`.

## Changelog & License
- See `CHANGELOG.md`
- Licensed under MIT (`LICENSE`)

## Support
For support requests and bug reports, please include environment details (OS, Node, MySQL) and steps to reproduce.

## Third‑party licenses and attributions
- React, React DOM — MIT
- Vite — MIT
- React Router — MIT
- ApexCharts (react-apexcharts) — MIT (ApexCharts core: MIT)
- Bootstrap — MIT
- Zod — MIT
- Express — MIT
- Helmet — MIT
- CORS — MIT
- Drizzle ORM — MIT
- mysql2 — MIT
- jsonwebtoken — MIT
- multer — MIT
- nodemailer — MIT
- file-type — MIT
- xss — MIT