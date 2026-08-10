# Deploying Estúdio Pedra Industrial (Hostinger VPS)

This app is a long-running Node process with a local SQLite database and
on-disk image uploads, so it needs a **VPS** (Ubuntu, root/SSH) — not shared
web hosting. These steps target a **Hostinger KVM VPS** but work on any
Ubuntu box (Render/Fly/DigitalOcean/etc.).

Helper assets live in [`deploy/`](./deploy):
- `deploy/ecosystem.config.cjs` — pm2 process config (pins cwd to the repo root)
- `deploy/deploy.sh` — pull → build → restart (for updates)
- `deploy/backup.sh` — snapshot the `.data/` dir (db + uploads)
- `deploy/Caddyfile` — reverse proxy + automatic HTTPS

## 1. Create the VPS
hPanel → VPS → new **KVM VPS**, OS **Ubuntu 24.04**, **São Paulo** location if
offered. Set an SSH key/password. Note the public **IP**.

## 2. Server setup
```bash
ssh root@<VPS_IP>

apt update && apt upgrade -y
apt install -y git build-essential python3          # build-essential/python3: fallback for better-sqlite3

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -   # Node 22 LTS
apt install -y nodejs
node -v                                             # expect v22.x
npm install -g pm2
```

## 3. Get the code and build
```bash
cd /opt
git clone https://github.com/josephalmeidazica/estudio-pedra-industrial.git
cd estudio-pedra-industrial
npm ci
npm run build
```

## 4. Configure `.env`
```bash
printf 'ADMIN_API_TOKEN=%s\nNODE_ENV=production\nPORT=3000\n' \
  "$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")" > .env
cat .env    # copy ADMIN_API_TOKEN — paste it into the catalog's "Editar" to manage photos
```
On first start the app creates `.data/app.db` (seeded with 9 products) and
`.data/uploads/` in the repo folder. **This directory is your database — don't
delete it, and back it up (step 7).** Reads are public; writes require the
bearer token.

## 5. Start under pm2
```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd     # run the command it prints, so the app restarts on reboot

curl -s "localhost:3000/api/trpc/products.list?input=%7B%7D" | head -c 200   # sanity: products JSON
```

## 6. Domain + HTTPS (Caddy)
Point a DNS **A record**: `yourdomain.com` → `<VPS_IP>`. Then:
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# set your domain in the Caddyfile, then install it
sed -i 's/example.com/yourdomain.com/' deploy/Caddyfile
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```
`https://yourdomain.com` now serves the site with a valid certificate.

**Optional — Cloudflare (recommended in Brazil):** add the domain to
Cloudflare, point the A record there, set SSL mode **Full (strict)**.
Cloudflare edge-caches your product images at its São Paulo POP for fast loads.

## 7. Backups
```bash
bash deploy/backup.sh /var/backups/eps     # writes eps-backup-<timestamp>.tgz
```
Schedule it (see the cron example inside `deploy/backup.sh`) and copy the
archives off-box.

## 8. Updating later
```bash
cd /opt/estudio-pedra-industrial
bash deploy/deploy.sh     # git pull -> npm ci -> npm run build -> pm2 restart; .data/ preserved
```

## Notes & gotchas
- **Single instance only** — SQLite + local uploads don't share across
  instances; do not enable horizontal autoscaling. A 1 GB VPS is ample.
- If `npm ci` fails compiling `better-sqlite3`, ensure `build-essential` and
  `python3` are installed (step 2).
- Logs: `pm2 logs eps`. Status: `pm2 status`.
- `.env`, `.data/`, `node_modules/`, and `dist/` are git-ignored — deploys
  never overwrite your token or data.
