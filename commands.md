# FinancialLife — Command Reference

---

## Docker

```bash
# Start all services (postgres + api + frontend)
docker compose up

# Start and rebuild images (use after changing Dockerfile or dependencies)
docker compose up --build

# Start in background (detached mode)
docker compose up -d

# Stop all services
docker compose down

# Stop and delete all data volumes (resets the database)
docker compose down -v

# Restart a single service without rebuilding
docker compose restart api
docker compose restart frontend
docker compose restart postgres

# View logs for all services
docker compose logs -f

# View logs for a single service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f postgres
```

---

## Database (PostgreSQL)

```bash
# Enter the psql prompt inside the container
docker exec -it financiallife_db psql -U financiallife -d financiallife

# Run a single SQL command without entering psql
docker exec -it financiallife_db psql -U financiallife -d financiallife -c "SELECT * FROM users;"

# Dump the database to a backup file
docker exec -t financiallife_db pg_dump -U financiallife financiallife > backup.sql

# Restore from a backup file
docker exec -i financiallife_db psql -U financiallife -d financiallife < backup.sql
```

### Useful psql commands (run inside psql prompt)
```sql
\l              -- list all databases
\dt             -- list all tables
\d users        -- describe the users table (columns, types, constraints)
\d transactions -- describe the transactions table
\q              -- quit psql

SELECT * FROM users;
SELECT * FROM households;
SELECT * FROM refresh_tokens;
```

### DBeaver (Windows connecting to WSL2)
```bash
# WSL IP changes on every restart — run this to get the current one
hostname -I | awk '{print $1}'
```
Use that IP as the Host in DBeaver instead of localhost.

---

## API (Go)

```bash
# Enter the API container shell
docker exec -it financiallife_api sh

# Run go mod tidy manually inside the container (fixes missing go.sum entries)
docker exec -it financiallife_api go mod tidy

# Check the API health endpoint
curl http://localhost:8080/health

# Test login endpoint
curl -s -c cookies.txt -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marcio@home.local","password":"password"}' | jq

# Test /me endpoint (replace TOKEN with the access_token from login)
curl -s http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN" | jq

# Test refresh endpoint (uses the cookie saved by login)
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/auth/refresh | jq

# Test logout
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/auth/logout | jq
```

---

## Frontend (React)

```bash
# Enter the frontend container shell
docker exec -it financiallife_frontend sh

# Install a new npm package (run inside the container)
docker exec -it financiallife_frontend npm install <package-name>

# Run the TypeScript type checker
docker exec -it financiallife_frontend npm run build
```

---

## Database Migrations

Migrations run automatically when the API container starts.
To check which migrations have been applied, run inside psql:

```sql
SELECT * FROM schema_migrations;
```

To manually force a migration run:
```bash
docker compose restart api
```

---

## WSL

```bash
# Get current WSL IP (use this as host in DBeaver)
hostname -I | awk '{print $1}'

# Check which ports are listening
ss -tlnp | grep 5432
ss -tlnp | grep 8080

# Restart WSL entirely from Windows PowerShell (if networking breaks)
wsl --shutdown
```

---

## Git

```bash
# Check status
git status

# Stage and commit all changes
git add -A && git commit -m "your message"

# Create a new feature branch
git checkout -b feature/week-3-transactions

# Merge branch back to main
git checkout main && git merge feature/week-3-transactions
```

---

## Quick Reference — Dev Credentials

| What | Value |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8080 |
| API health | http://localhost:8080/health |
| DB host (inside Docker) | `postgres:5432` |
| DB host (from Windows/DBeaver) | WSL IP from `hostname -I` |
| DB port | `5432` |
| DB name | `financiallife` |
| DB user | `financiallife` |
| Login email (Marcio) | `marcio@home.local` |
| Login email (Wife) | `wife@home.local` |
| Login password (both) | `password` |
