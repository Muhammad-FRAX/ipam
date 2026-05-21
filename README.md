# IPAM Platform

> **IP Address Management for telecom networks** — allocate, track, and govern every address in your IP space across IPRAN/MPBN domains, VLANs, sites, and devices.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## What it does

The IPAM Platform models the full hierarchy of an IP network:

```
IP Blocks  →  Subnets  →  IP Addresses
    └─ Network Domains (IPRAN / MPBN)
    └─ Sites & VLANs
    └─ Devices (routers, switches, servers)
```

Key capabilities:

- **IP topology management** — create root blocks (e.g. `10.0.0.0/8`), carve subnets, allocate individual host addresses with full telecom metadata (VLAN type, IP range type, requester, SPOC, connected elements)
- **Overlap & containment enforcement** — the system rejects any subnet not contained in its parent block, and any allocation that would overlap an existing sibling
- **Approval workflow** — operators submit subnet/IP requests; approvals trigger real allocations
- **Audit trail** — every mutation is timestamped and attributed to a user
- **Utilization dashboard** — live capacity metrics per subnet and overall, configurable high-utilization thresholds
- **Network asset registry** — sites, network domains, VLANs, and devices in one place
- **Configuration management** — runtime thresholds and org-structure settings via UI

---

## Architecture

Eight containers behind Docker Compose, communicating over a private `ipam_network`:

| Container | Port | Role |
|---|---|---|
| `frontend-portal` | 443 / 80 | React 19 + Vite SPA served by NGINX (HTTPS) |
| `api-gateway` | 3004 | NestJS reverse proxy + JWT auth middleware |
| `auth-service` | 3001 | Login, JWT issuance, user management |
| `ipam-core-service` | 3002 | Blocks, subnets, IPs, sites, domains, VLANs, devices |
| `request-workflow-service` | 3008 | Allocation requests & approval flow |
| `forecasting-insight-service` | 3005 | Dashboard metrics, utilization, risk detection |
| `audit-service` | 3006 | Audit log reads |
| `configuration-service` | 3007 | Runtime config (thresholds, org structure) |
| `postgres` | 5442 | PostgreSQL 15 — single shared database |
| `redis` | 6379 | Redis 7 — reserved for future caching/queues |

The frontend talks exclusively to the API gateway (`/api/*`). The gateway validates the JWT on every request (except `/api/auth/login`) and proxies to the appropriate microservice.

---

## Quick Start — Docker (recommended)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin) installed and running.

### First boot

```bash
git clone https://github.com/Muhammad-FRAX/ipam.git
cd ipam
docker compose up --build
```

The first build takes a few minutes (Node modules + TypeScript compilation). Subsequent starts are fast.

### Open the app

Navigate to **[https://localhost](https://localhost)** and accept the self-signed certificate warning.

Default credentials:

| Field | Value |
|---|---|
| Email | `admin@ipam.local` |
| Password | `admin123` |

### Common commands

```bash
# Start (after first build)
docker compose up

# Wipe database and rebuild from scratch (e.g. after a migration change)
docker compose down -v
docker compose up --build

# Tail logs for a specific service
docker compose logs -f ipam-core-service

# Restart a single service after editing its source
docker compose restart ipam-core-service

# Stop everything
docker compose down
```

### Verify via curl

```bash
# Get a token
TOKEN=$(curl -sk -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ipam.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# List IP blocks
curl -sk -H "Authorization: Bearer $TOKEN" https://localhost/api/ipam/blocks | python3 -m json.tool
```

---

## Quick Start — Without Docker (plain PC)

**Prerequisites:**

- [Node.js 20+](https://nodejs.org/) and npm 10+
- [PostgreSQL 15+](https://www.postgresql.org/download/) running locally
- Git

### 1 — Clone and install

```bash
git clone https://github.com/Muhammad-FRAX/ipam.git
cd ipam
npm install
```

### 2 — Set up the database

Connect to your local Postgres and create the database and user:

```sql
CREATE USER ipam_user WITH PASSWORD 'ipam_password';
CREATE DATABASE ipam_db OWNER ipam_user;
```

Apply the migrations in order:

```bash
psql -h localhost -U ipam_user -d ipam_db -f database/init/01-init.sql
psql -h localhost -U ipam_user -d ipam_db -f database/init/02-telecom-models.sql
psql -h localhost -U ipam_user -d ipam_db -f database/init/03-schema-drift-fix.sql
psql -h localhost -U ipam_user -d ipam_db -f database/init/04-indexes.sql
psql -h localhost -U ipam_user -d ipam_db -f database/init/05-request-failure-reason.sql
psql -h localhost -U ipam_user -d ipam_db -f database/init/06-soft-delete.sql
psql -h localhost -U ipam_user -d ipam_db -f database/init/07-config-cleanup.sql
```

### 3 — Configure environment variables

Each backend service reads its config from environment variables. The simplest way is to export them in your shell before starting the services. Create a `.env` file (not committed) and source it, or export manually:

```bash
export DB_HOST=localhost
export DB_USER=ipam_user
export DB_PASSWORD=ipam_password
export DB_NAME=ipam_db
export JWT_SECRET=change-me-in-production

# Service ports
export PORT=3001   # set per-service before starting each one
```

### 4 — Build the backend

```bash
npm run build --workspaces --if-present
```

### 5 — Start each backend service

Open a separate terminal for each service (or use a process manager like [pm2](https://pm2.keymetrics.io/)):

```bash
# Terminal 1 — Auth service
PORT=3001 node apps/auth-service/dist/main.js

# Terminal 2 — IPAM core
PORT=3002 node apps/ipam-core-service/dist/main.js

# Terminal 3 — Request workflow
PORT=3008 node apps/request-workflow-service/dist/main.js

# Terminal 4 — Forecasting / insight
PORT=3005 node apps/forecasting-insight-service/dist/main.js

# Terminal 5 — Audit
PORT=3006 node apps/audit-service/dist/main.js

# Terminal 6 — Configuration
PORT=3007 node apps/configuration-service/dist/main.js

# Terminal 7 — API gateway (start last, after all services are up)
PORT=3004 \
  AUTH_SERVICE_URL=http://localhost:3001/auth \
  IPAM_CORE_SERVICE_URL=http://localhost:3002/ipam \
  WORKFLOW_SERVICE_URL=http://localhost:3008/workflow \
  INSIGHT_SERVICE_URL=http://localhost:3005/insight \
  AUDIT_SERVICE_URL=http://localhost:3006/audit \
  CONFIG_SERVICE_URL=http://localhost:3007/config \
  CORS_ORIGIN=http://localhost:5173 \
  node apps/api-gateway/dist/main.js
```

### 6 — Start the frontend dev server

```bash
cd apps/frontend-portal
npm run dev
```

The Vite dev server proxies `/api/*` to the gateway at `http://localhost:3004`. Open **[http://localhost:5173](http://localhost:5173)** in your browser.

> **Tip:** For production-style local testing without Docker, build the frontend (`npm run build`) and serve `dist/` with any static file server (e.g. `npx serve dist`). You will need to configure NGINX or another reverse proxy to route `/api/*` to the gateway.

---

## API Routes

All routes are served at `https://localhost/api` (Docker) or `http://localhost:3004/api` (no Docker).

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate, get JWT |
| `GET` | `/api/ipam/blocks` | List all IP blocks |
| `POST` | `/api/ipam/blocks` | Create a root IP block |
| `GET` | `/api/ipam/subnets` | List subnets |
| `POST` | `/api/ipam/subnets` | Create a subnet under a block |
| `POST` | `/api/ipam/allocate` | Allocate a host IP in a subnet |
| `GET` | `/api/ipam/sites` | List sites |
| `GET` | `/api/ipam/domains` | List network domains |
| `GET` | `/api/ipam/vlans` | List VLANs |
| `GET` | `/api/ipam/devices` | List devices |
| `GET` | `/api/workflow/requests` | List allocation requests |
| `POST` | `/api/workflow/requests` | Submit a new request |
| `PUT` | `/api/workflow/requests/:id/approve` | Approve a request |
| `PUT` | `/api/workflow/requests/:id/reject` | Reject a request |
| `GET` | `/api/insight/dashboard` | Dashboard metrics |
| `GET` | `/api/insight/risk-pools` | High-utilization subnets |
| `GET` | `/api/audit/logs` | Audit log entries |
| `GET` | `/api/config` | All configuration values |
| `PUT` | `/api/config/:key` | Update a configuration value |

Every route except `/api/auth/login` requires `Authorization: Bearer <token>`.

---

## Project Structure

```
ipam/
├── apps/
│   ├── api-gateway/             # NestJS reverse proxy + JWT auth
│   ├── auth-service/            # Authentication & user management
│   ├── ipam-core-service/       # Core IP management logic
│   ├── request-workflow-service/# Allocation request workflow
│   ├── forecasting-insight-service/ # Metrics & risk detection
│   ├── audit-service/           # Audit log reads
│   ├── configuration-service/   # Runtime config
│   └── frontend-portal/         # React 19 + Vite + TailwindCSS 4
├── packages/
│   ├── shared-validation/       # CIDR math (parseCidr, overlap, containment)
│   ├── shared-auth/             # JWT middleware & verification
│   ├── shared-audit/            # logAudit helper
│   ├── shared-config/           # Runtime config reader with TTL cache
│   ├── shared-logging/          # Structured logging utilities
│   └── shared-types/            # Shared TypeScript types
├── database/
│   └── init/                    # SQL migration files (applied in order)
├── docker-compose.yml
├── Dockerfile                   # Multi-stage build for all backend services
└── PLAN.md                      # Phased remediation plan
```

---

## Development Notes

- **Migrations** are SQL files in `database/init/` numbered `NN-description.sql` and applied in lexicographic order on first Postgres boot. Never edit an applied file — add a new numbered one.
- **Raw SQL** via `dataSource.query($1, $2, ...)` is the current pattern. Parameterized queries only — no string concatenation.
- **Shared packages** (`packages/shared-*`) are npm workspace packages imported as `@ipam/shared-validation`, etc.
- **Frontend styling:** Tailwind only. Dark glassmorphism aesthetic — background `#0a0a0e` / `#12121a`, `backdrop-blur-xl` overlays, indigo → purple accent gradients.

See [PLAN.md](./PLAN.md) for the full phased remediation roadmap and [APP-ISSUES.md](./APP-ISSUES.md) for the known-issues list.
