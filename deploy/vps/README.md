# VPS Deployment

This deployment runs these services on an Oracle A1 Flex VPS:

- `admin-backend`
- `backend-bot`
- `bot_binance_pay`

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
- `JWT_SECRET`: long random secret for `admin-backend`.
- `BOT_INTERNAL_SECRET`: internal secret accepted by `backend-bot`.
- `BACKEND_BOT_SECRET`: must equal `BOT_INTERNAL_SECRET`.
- `BOT_TOKEN` and `ADMIN_IDS`: Telegram bot runtime config.
- Binance/SePay/bank variables if payment polling is enabled.

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
on push to `main`. You can also run it manually from the Actions tab:

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
docker compose logs -f backend-bot
docker compose logs -f bot-binance-pay
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
ADMIN_BACKEND_IMAGE=ghcr.io/OWNER/REPO/admin-backend:OLD_SHA \
BACKEND_BOT_IMAGE=ghcr.io/OWNER/REPO/backend-bot:OLD_SHA \
BOT_BINANCE_PAY_IMAGE=ghcr.io/OWNER/REPO/bot-binance-pay:OLD_SHA \
docker compose up -d
```

Replace `OWNER`, `REPO`, and `OLD_SHA` with the image you want to restore.

## Notes

- `backend-bot` runs background polling jobs. Keep one replica unless the jobs
  are changed to support leader election.
- Database init/reset scripts are intentionally not run by CI/CD because Neon is
  the production database.
- `bot_binance_pay` calls `backend-bot` through the Docker network using
  `http://backend-bot:3001`. Do not append `/api` to `BACKEND_API_BASE_URL`
  because the bot code already calls `/api/...` paths.
