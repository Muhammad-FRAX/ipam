# IPAM Platform

A Phase 1 IP Address Management (IPAM) platform built for telecom networks. Tracks, allocates, and manages IP addresses across a network — modelling IP blocks → subnets → individual IP assignments, with telecom-specific overlays for IPRAN/MPBN domains, VLANs, sites, and devices.

---

## Architecture

```
                        ┌─────────────────────┐
                        │   Frontend (React)   │
                        │   NGINX :443 / :80   │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │     API Gateway      │
                        │       :3004          │
                        └──┬───┬───┬───┬───┬──┘
                           │   │   │   │   │
              ┌────────────┘   │   │   │   └────────────┐
              │            ┌───┘   └───┐                 │
     ┌────────▼────┐  ┌────▼────┐ ┌───▼──────┐  ┌──────▼──────┐
     │Auth Service │  │IPAM Core│ │ Workflow  │  │  Forecasting │
     │   :3001     │  │  :3002  │ │  :3008   │  │   :3005      │
     └─────────────┘  └─────────┘ └──────────┘  └─────────────┘
              ┌────────────────────────┐
     ┌────────▼────┐          ┌────────▼────┐
     │Audit Service│          │Config Service│
     │   :3006     │          │   :3007      │
     └─────────────┘          └─────────────┘
                           │
              ┌────────────▼────────────┐
              │       PostgreSQL         │
              │    (shared, :5442)       │
              └─────────────────────────┘
```

**Services:**

| Service | Port | Role |
|---|---|---|
| `frontend-portal` | 443 / 80 | React 19 SPA served by NGINX |
| `api-gateway` | 3004 | Reverse proxy routing all `/api/*` calls |
| `auth-service` | 3001 | JWT authentication |
| `ipam-core-service` | 3002 | IP blocks, subnets, and IP allocation |
| `request-workflow-service` | 3008 | Allocation request approvals |
| `forecasting-insight-service` | 3005 | Planning 360 and capacity forecasting |
| `audit-service` | 3006 | Audit log recording |
| `configuration-service` | 3007 | Platform configuration |
| `postgres` | 5442 (host) | Shared PostgreSQL 15 database |
| `redis` | 6379 | Redis 7 (wired in future phases) |

**Tech Stack:** NestJS 10 · PostgreSQL 15 · Redis 7 · React 19 · Vite 8 · TailwindCSS 4 · TypeScript · Docker Compose

---

## Quick Start — Docker (recommended)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Docker Compose) installed and running.

### 1. Clone the repo

```bash
git clone https://github.com/Muhammad-FRAX/ipam.git
cd ipam
```

### 2. Start everything

```bash
docker compose up --build
```

This builds all images and starts the full stack. First build takes a few minutes.

### 3. Open the app

Go to **https://localhost** in your browser. Accept the self-signed certificate warning.

> Default credentials: `admin@ipam.local` / `admin123`

### Useful Docker commands

```bash
# Start without rebuilding (subsequent runs)
docker compose up

# Wipe database and rebuild from scratch (e.g. after a migration change)
docker compose down -v && docker compose up --build

# Tail logs for one service
docker compose logs -f ipam-core-service

# Restart one service after editing its source
docker compose restart ipam-core-service

# Stop everything
docker compose down
```

### Database access (direct)

```bash
psql -h localhost -p 5442 -U ipam_user -d ipam_db
# password: ipam_password
```

### API access (curl example)

```bash
# 1. Get a token
TOKEN=$(curl -sk -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ipam.local","password":"admin123"}' | jq -r .accessToken)

# 2. Call a protected endpoint
curl -sk -H "Authorization: Bearer $TOKEN" https://localhost/api/ipam/blocks
```

---

## Quick Start — Without Docker (local dev)

**Prerequisites:**
- [Node.js 20+](https://nodejs.org/) and npm 10+
- [PostgreSQL 15](https://www.postgresql.org/download/) running locally
- (Optional) [Redis 7](https://redis.io/download/) — not yet wired, safe to skip

### 1. Clone and install dependencies

```bash
git clone https://github.com/Muhammad-FRAX/ipam.git
cd ipam
npm install
```

### 2. Set up the database

Create a database and user in PostgreSQL:

```sql
CREATE USER ipam_user WITH PASSWORD 'ipam_password';
CREATE DATABASE ipam_db OWNER ipam_user;
GRANT ALL PRIVILEGES ON DATABASE ipam_db TO ipam_user;
```

Apply the schema migrations in order:

```bash
psql -U ipam_user -d ipam_db -f database/init/01-init.sql
psql -U ipam_user -d ipam_db -f database/init/02-telecom-models.sql
psql -U ipam_user -d ipam_db -f database/init/03-schema-drift-fix.sql
psql -U ipam_user -d ipam_db -f database/init/04-indexes.sql
psql -U ipam_user -d ipam_db -f database/init/05-request-failure-reason.sql
psql -U ipam_user -d ipam_db -f database/init/06-soft-delete.sql
psql -U ipam_user -d ipam_db -f database/init/07-config-cleanup.sql
```

### 3. Set environment variables

Each backend service reads these env vars. Create a `.env` file in each `apps/<service>/` directory, or export them in your shell:

```bash
export DB_HOST=localhost
export DB_USER=ipam_user
export DB_PASSWORD=ipam_password
export DB_NAME=ipam_db
export JWT_SECRET=change-me-in-production
```

Service-specific ports (set `PORT` per service):

| Service | Default PORT |
|---|---|
| auth-service | 3001 |
| ipam-core-service | 3002 |
| api-gateway | 3004 |
| forecasting-insight-service | 3005 |
| audit-service | 3006 |
| configuration-service | 3007 |
| request-workflow-service | 3008 |

The api-gateway also needs the downstream service URLs:

```bash
export AUTH_SERVICE_URL=http://localhost:3001/auth
export IPAM_CORE_SERVICE_URL=http://localhost:3002/ipam
export WORKFLOW_SERVICE_URL=http://localhost:3008/workflow
export INSIGHT_SERVICE_URL=http://localhost:3005/insight
export AUDIT_SERVICE_URL=http://localhost:3006/audit
export CONFIG_SERVICE_URL=http://localhost:3007/config
export CORS_ORIGIN=http://localhost:5173
```

### 4. Build

```bash
npm run build
```

### 5. Start the backend services

Open a terminal per service (or use a process manager like `pm2`):

```bash
# Terminal 1 — auth
cd apps/auth-service && PORT=3001 node dist/main

# Terminal 2 — ipam-core
cd apps/ipam-core-service && PORT=3002 node dist/main

# Terminal 3 — request-workflow
cd apps/request-workflow-service && PORT=3008 node dist/main

# Terminal 4 — forecasting-insight
cd apps/forecasting-insight-service && PORT=3005 node dist/main

# Terminal 5 — audit
cd apps/audit-service && PORT=3006 node dist/main

# Terminal 6 — configuration
cd apps/configuration-service && PORT=3007 node dist/main

# Terminal 7 — api-gateway (start last)
cd apps/api-gateway && PORT=3004 node dist/main
```

### 6. Start the frontend (dev server)

```bash
cd apps/frontend-portal
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

> Vite's dev server proxies `/api` → `http://localhost:3004` automatically (see `vite.config.ts`).

---

## Project Structure

```
ipam/
├── apps/
│   ├── api-gateway/              # NestJS reverse proxy
│   ├── auth-service/             # JWT login/register
│   ├── ipam-core-service/        # Blocks, subnets, IPs
│   ├── request-workflow-service/ # Approval workflow
│   ├── forecasting-insight-service/ # Planning & capacity
│   ├── audit-service/            # Audit trail
│   ├── configuration-service/    # Platform config
│   └── frontend-portal/          # React 19 + Vite SPA
├── packages/
│   ├── shared-auth/              # JWT sign/verify utilities
│   ├── shared-audit/             # logAudit helper
│   ├── shared-config/            # Runtime config reader
│   ├── shared-logging/           # Logger
│   ├── shared-types/             # TypeScript types
│   └── shared-validation/        # CIDR validation
├── database/
│   └── init/                     # SQL migrations (applied in order)
├── docker-compose.yml
├── Dockerfile                    # Multi-stage build for all NestJS services
└── PLAN.md                       # Phased remediation plan
```

---

## Running Tests

```bash
# All workspaces
npm test

# Single service
npm test --workspace=apps/ipam-core-service

# Frontend (Vitest)
cd apps/frontend-portal && npm test
```

---

## Known Limitations (Phase 1)

This is an active MVP under development. See [APP-ISSUES.md](./APP-ISSUES.md) for the full bug list and [PLAN.md](./PLAN.md) for the fix roadmap. Key known gaps:

- Approval workflow updates status only — does not yet provision subnets
- Audit logging is scaffolded but not wired to all operations
- No overlap validation on subnet creation via API
- Redis is running but not yet used
