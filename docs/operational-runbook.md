# Operational Runbook - IPAM Platform

## Overview
This runbook covers the operational aspects of the Phase 1 Standalone IPAM deployment. Use it to diagnose, manage, and scale the microservice cluster.

## Deployment Commands
All components are managed via Docker Compose. Ensure you run commands from `c:\Projects\IPAM\`.

- **Start Stack**: `docker compose up -d`
- **Stop Stack**: `docker compose down`
- **Total Rebuild**: `docker compose up --build -d`
- **View Logs**: `docker compose logs -f [service_name]` (e.g., `docker compose logs -f api-gateway`)

## Service Map & Ports
| Component | Local URL / Mapping |
|-----------|--------------------|
| **Frontend UI** | `http://localhost:8443` |
| **API Gateway** | `http://localhost:3004/api` |
| **PostgreSQL**| `localhost:5432` |
| **Redis** | `localhost:6379` |

## Troubleshooting Guide

### 1. Frontend shows 502 Bad Gateway
**Cause**: The API Gateway is down, or Nginx cannot resolve `api-gateway` via Docker DNS.
**Action**:
1. Check gateway startup: `docker compose logs api-gateway`
2. Validate internal service checks: `curl http://localhost:3004/health`

### 2. Database Connection Refused
**Cause**: PostgreSQL container hasn't reached healthy state or volume mounts failed.
**Action**:
1. Run `docker ps` to verify `ipam_postgres` is marked *(healthy)*.
2. If restarting continuously, check logs: `docker logs ipam_postgres`. Make sure `01-init.sql` didn't fail.

### 3. Subnet Overlap Errors falsely triggering
**Cause**: Validation engine might be miscalculating bit ranges or Postgres `&&` operator syntax failed.
**Action**:
Check `validation-engine-service` logs. Run direct SQL `SELECT cidr '10.0.0.0/8' && cidr '10.1.0.0/16';` via `docker exec -it ipam_postgres psql -U ipam_user -d ipam_db`.

## Data Backup
Volumes `postgres_data` and `redis_data` are ephemeral unless bound to host. 
To dump SQL:
`docker exec -t ipam_postgres pg_dumpall -c -U ipam_user > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql`
