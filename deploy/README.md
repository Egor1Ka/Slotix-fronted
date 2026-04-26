# Slotix Deploy

Production deployment config for Slotix on Contabo VPS (`213.136.67.77`).

## Architecture

```
Internet :80
    ↓
Caddy (reverse proxy)
    ├── /api/* → api:9000   (Slotx-backend)
    └── /*    → web:3000   (Slotix-fronted)

External:
    └── MongoDB Atlas (M0 Free)
```

Both web and api images live in GHCR:

- `ghcr.io/egor1ka/slotix-fronted:latest`
- `ghcr.io/egor1ka/slotx-backend:latest`

Currently HTTP-only on IP. Move to HTTPS later by buying a domain and updating `Caddyfile` (see `## Adding HTTPS` below).

## First-time server setup

These files (`docker-compose.prod.yml`, `Caddyfile`, `.env.api`) live on the server in `/opt/slotix/`.

From your Mac:

```bash
# 1. Copy compose + Caddyfile (no secrets, safe to copy from repo)
scp deploy/docker-compose.prod.yml deploy/Caddyfile root@213.136.67.77:/opt/slotix/

# 2. Copy env template
scp deploy/.env.api.example root@213.136.67.77:/opt/slotix/.env.api

# 3. Fill in real secrets
ssh root@213.136.67.77
cd /opt/slotix
nano .env.api   # fill in DB_URL, JWT_SECRET, GOOGLE_*, CREEM_*, TELEGRAM_*

# 4. Tighten perms (only root + deploy can read secrets)
chown deploy:deploy .env.api
chmod 600 .env.api

# 5. Make sure /opt/slotix is owned by deploy (for compose pulls)
chown -R deploy:deploy /opt/slotix
```

## First manual deploy (verify everything works before CI takes over)

```bash
# On server, switch to deploy user
ssh deploy@213.136.67.77
cd /opt/slotix

# Pull images and start
docker compose -f docker-compose.prod.yml --env-file .env.api pull
docker compose -f docker-compose.prod.yml --env-file .env.api up -d

# Watch logs
docker compose -f docker-compose.prod.yml logs -f
```

Open `http://213.136.67.77` in browser → should load the frontend.
Open `http://213.136.67.77/api/health` (or any backend route) → should hit api.

## CI/CD via GitHub Actions

After the first manual deploy works, GitHub Actions takes over:

- Push to `main` in `Slotix-fronted` → builds web image → SSH → `docker compose pull web && up -d web`
- Push to `main` in `Slotx-backend` → builds api image → SSH → `docker compose pull api && up -d api`

Required GitHub Secrets (in **both** repos):

| Secret            | Value                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| `SSH_HOST`        | `213.136.67.77`                                                         |
| `SSH_USER`        | `deploy`                                                                |
| `SSH_PRIVATE_KEY` | contents of `~/.ssh/slotix_deploy` (full file, including header/footer) |

GHCR auth: workflows use the built-in `GITHUB_TOKEN` with `packages: write` permission. No PAT needed.

Pull on the server: images are public (because repos are public + first push to GHCR makes the package public by default), so `docker compose pull` works without `docker login`.

## Common commands

```bash
# Tail logs (specific service)
docker compose logs -f web
docker compose logs -f api
docker compose logs -f caddy

# Restart one service
docker compose restart web

# Rebuild and restart everything (forces fresh image pull)
docker compose pull && docker compose up -d

# Stop everything
docker compose down

# Disk usage
docker system df

# Clean up old images (free space)
docker image prune -a
```

## Adding HTTPS later (when you buy a domain)

1. Point your domain's A-record to `213.136.67.77`
2. SSH to server: `ssh deploy@213.136.67.77 && cd /opt/slotix`
3. Replace `Caddyfile` content with:
   ```
   slotix.app {
       handle /api/* {
           reverse_proxy api:9000
       }
       handle {
           reverse_proxy web:3000
       }
   }
   ```
4. Update `.env.api`: change `FRONTEND_URL` and `GOOGLE_REDIRECT_URI` from `http://213.136.67.77` to `https://slotix.app`
5. `docker compose restart caddy` — Caddy auto-issues a Let's Encrypt cert
