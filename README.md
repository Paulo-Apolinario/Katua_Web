# Dashbard — Sistema de gerenciamento de coleta de resíduos

Um sistema completo de gestão de resíduos para municípios e operadores privados. Inclui gestão de pessoal e veículos, rotas inteligentes, rastreamento da coleta de resíduos, relatórios e gestão de documentos.

## Características
- Autenticação
- Gestão de pessoal, controle de frequência e documentos
- Gestão de veículos, registos de manutenção e documentos.
- Rotas, zonas e atribuições de contêineres
- Monitoramento e análise da coleta de resíduos (gráficos, exportações: XLSX/PDF)
- Configurações do sistema (SMTP, personalização da marca), alertas e KPIs do painel de controle.

## Conjunto de tecnologias
- Backend: Node.js (Express), MySQL, Drizzle ORM, JWT, Multer, Zod
- Frontend: React (Vite), React Router, ApexCharts, Bootstrap

## Requirementos
- Node.js 20+
- MySQL 8+
- npm 9+

## Estrutura do Projeto
- `backend/` — REST API (Express + Drizzle + MySQL)
- `frontend/` — Admin dashboard (React + Vite)

## Instalação (Desenvolvimento)
1. Clone/extract the package
2. Backend: `cd backend && npm install`
3. Frontend: `cd frontend && npm install`
4. Copie `backend/env.example` to `backend/.env` preencher valores
5. Database setup: choose one path
   - option 1: Import `database.sql`, 
   - option 2: Run `npm run db:migrate` & `npm run db:seed`
6. Start dev servers:
   - Backend: `npm run dev` (in `backend/`)
   - Frontend: `npm run dev` (in `frontend/`)

## Variáveis ​​de ambiente (backend)
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

## Construção e implantação de produção
1. Frontend: cd frontend && npm run build→ servefrontend/dist
2. Sirva distatravés de qualquer host estático ou por trás de Node/NGINX.
3. Backend: defina CORS/ FRONTEND_URLpara a URL de produção e inicie.node server.js
4. Configurar ambiente, backups de banco de dados e SMTP.

## Documentação da API
- `/documentation/index.html#api-docs`

## Documentação
- Extended docs, screenshots, and troubleshooting are available in `/documentation/index.html`.

## Registro de alterações e licença
- See `CHANGELOG.md`
- Licensed under MIT (`LICENSE`)

## Suporte
Para solicitações de suporte e relatórios de erros, inclua detalhes do ambiente (SO, Node, MySQL) e os passos para reproduzir o problema.

## Licenças e atribuições de terceiros
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
