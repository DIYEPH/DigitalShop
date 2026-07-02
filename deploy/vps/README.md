# VPS Deployment

This deployment runs these services on an Oracle A1 Flex VPS:

- `admin-frontend`
- `admin-backend`
- `backend-bot` — bundles the bot runner: BotRunnerManager runs one
  `bot_binance_pay` instance per ACTIVE shop, configured from the database
  (admin Settings). There is no separate bot container.

PostgreSQL is not started by Docker Compose. Production uses the existing Neon
database through `DATABASE_URL`.

## One-time VPS setup

Install Docker and the Docker Compose plugin on the VPS, then create the deploy
directory:

```bash
sudo mkdir -p /opt/digitalshop
sudo chown "$USER":"$USER" /opt/digitalshop
```

Copy the environment template and fill real production values:

```bash
cp .env.example /opt/digitalshop/.env
nano /opt/digitalshop/.env
```

The important values are:

- `DATABASE_URL`: Neon connection string, including SSL mode if Neon requires it.
- `ADMIN_FRONTEND_API_ORIGIN`: internal URL from `admin-frontend` to `admin-backend`.
- `JWT_SECRET`: long random secret for `admin-backend`.
- `SHOP_SECRET_ENCRYPTION_KEY`: AES-256-GCM key for per-shop credentials,
  shared by `admin-backend` (encrypt) and `backend-bot` (decrypt).
- `BOT_INTERNAL_SECRET`: internal dev/seed secret for `backend-bot`.

Per-shop values are not in `.env`: bot token/secret (`telegram_bots`), shop
name and support link (`shops`), Binance/SePay/bank
(`shop_payment_credentials`) — sellers manage them in admin Settings.

Do not commit `/opt/digitalshop/.env`.

## GitHub repository secrets

Create these secrets in GitHub Actions:

- `VPS_HOST`: public IP or domain of the VPS.
- `VPS_USER`: SSH user.
- `VPS_SSH_KEY`: private key allowed to SSH to the VPS.
- `VPS_DEPLOY_PATH`: usually `/opt/digitalshop`.
- `GHCR_READ_TOKEN`: optional. Required only when GHCR packages are private.

The workflow uses `GITHUB_TOKEN` to push images to GHCR.

## First deploy

The GitHub Actions workflow builds ARM64 images for Oracle A1 Flex and deploys
on push to `release`. You can also run it manually from the Actions tab:

```text
Actions -> Deploy VPS -> Run workflow
```

On each deploy, the workflow:

1. Builds and pushes images to GHCR.
2. Uploads `docker-compose.yml` to the VPS.
3. Runs `docker compose pull`.
4. Runs `docker compose up -d --remove-orphans`.
5. Prunes unused Docker images.

## Manual commands on VPS

Check service status:

```bash
cd /opt/digitalshop
docker compose ps
```

Read logs:

```bash
docker compose logs -f admin-backend
docker compose logs -f admin-frontend
# Per-shop bot logs are inside backend-bot (prefixed with [bot#<id>])
docker compose logs -f backend-bot
```

Restart all services:

```bash
docker compose up -d
```

Stop all services:

```bash
docker compose down
```

## Rollback

The safest rollback is to pin the previous image tag in the deploy command.
GitHub Actions tags every image with the commit SHA.

On the VPS:

```bash
cd /opt/digitalshop
ADMIN_FRONTEND_IMAGE=ghcr.io/OWNER/REPO/admin-frontend:OLD_SHA \
ADMIN_BACKEND_IMAGE=ghcr.io/OWNER/REPO/admin-backend:OLD_SHA \
BACKEND_BOT_IMAGE=ghcr.io/OWNER/REPO/backend-bot:OLD_SHA \
docker compose up -d
```

Replace `OWNER`, `REPO`, and `OLD_SHA` with the image you want to restore.

## Notes

- `backend-bot` runs background polling jobs. Keep one replica unless the jobs
  are changed to support leader election.
- Database init/reset scripts are intentionally not run by CI/CD because Neon is
  the production database.
- `admin-frontend` proxies browser `/api/*` requests at runtime and uses
  `API_ORIGIN=http://admin-backend:3000` inside the Docker network.
- Per-shop bot instances run inside the `backend-bot` container as worker
  threads managed by BotRunnerManager.
