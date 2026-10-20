# Deploying Estúdio Pedra Industrial (Hostinger VPS)

This app is a long-running Node process with a local SQLite database and
on-disk image uploads, so it needs a **VPS** (Ubuntu, root/SSH) — not shared
web hosting. These steps target a **Hostinger KVM VPS** but work on any
Ubuntu box. `VPS-SETUP.md` is the same walkthrough with explanations.

Helper assets live in [`deploy/`](./deploy):
- `deploy/ecosystem.config.cjs` — pm2 process config (pins cwd to the repo root)
- `deploy/deploy.sh` — pull → build → restart (for updates)
- `deploy/backup.sh` — snapshot `.data/` (db + uploads), copy off-box with rclone
- `deploy/restore.sh` — restore `.data/` from a snapshot
- `deploy/Caddyfile` — reverse proxy + automatic HTTPS, Cloudflare-aware

Each step ends with a **Check** line. Do not move on until it passes.

## 0. Buy a domain
- **`.com`:** buy it at **Cloudflare Registrar** (at-cost pricing, DNS already
  on Cloudflare, nothing else to configure).
- **`.com.br`:** buy it at **Registro.br** (needs a CPF/CNPJ). Then add the
  domain to a free Cloudflare account; Cloudflare shows two nameservers —
  set them at Registro.br (*Alterar servidores DNS*). Propagation takes up to
  a few hours.

**Check:** `dig NS <domain> +short` lists two `*.ns.cloudflare.com` servers.

## 1. Create the VPS
hPanel → VPS → new **KVM VPS**, OS **Ubuntu 24.04** (plain, no control
panel), **São Paulo** location if offered. Set an SSH key/password. Note the
public **IP**.

**Check:** `ssh root@<VPS_IP>` gives you a prompt.

## 2. Server setup
```bash
apt update && apt upgrade -y
apt install -y git build-essential python3          # build-essential/python3: fallback for better-sqlite3

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -   # Node 22 LTS
apt install -y nodejs
npm install -g pm2
curl https://rclone.org/install.sh | bash           # for off-box backups (step 7)
```
**Check:** `node -v` prints `v22.x`; `rclone version` prints a version.

## 3. Get the code and build
```bash
cd /opt
git clone https://github.com/josephalmeidazica/estudio-pedra-industrial.git
cd estudio-pedra-industrial
npm ci
npm run build
```
**Check:** `ls dist/index.js dist/scripts/reprocess-images.js` lists both files.

## 4. Configure `.env`
```bash
printf 'ADMIN_PASSWORD=%s\nSITE_URL=https://<domain>\nNODE_ENV=production\nPORT=3000\n' \
  "$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")" > .env
cat .env    # copy ADMIN_PASSWORD — log in at /admin to manage products and photos
```
Replace `<domain>` with the real one (no trailing slash). `SITE_URL` is what
link previews, the sitemap and robots.txt use for absolute URLs; without it
the server falls back to each request's host and logs a warning.

The server **refuses to start in production without `ADMIN_PASSWORD`**. On
first start the app creates `.data/app.db` (seeded with 9 products, their
photos converted to WebP variants) and `.data/uploads/`. **`.data/` is your
database and all your photos — never delete it; back it up (step 7).**

**Check:** `grep -c ADMIN_PASSWORD .env` prints `1`.

## 5. Start under pm2
```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd     # run the command it prints, so the app restarts on reboot
```
**Check:** `curl -s localhost:3000/healthz` prints `{"ok":true}`.

## 6. Cloudflare + Caddy (HTTPS)
1. In Cloudflare DNS add an **A record**: name `@`, content `<VPS_IP>`,
   **proxy off** (grey cloud) for now, so Caddy can obtain its certificate.
2. Install Caddy and the site config:
   ```bash
   apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
   apt update && apt install -y caddy

   cd /opt/estudio-pedra-industrial
   sed -i "s/DOMAIN/<domain>/g" deploy/Caddyfile      # e.g. estudiopedra.com.br
   cp deploy/Caddyfile /etc/caddy/Caddyfile
   systemctl reload caddy

   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
   ```
   **Check:** `curl -sI https://<domain>/healthz | head -1` prints `HTTP/2 200`.
3. Back in Cloudflare: turn the A record's **proxy on** (orange cloud);
   **SSL/TLS → Overview → Full (strict)**; **SSL/TLS → Edge Certificates →
   Always Use HTTPS: on**; **Caching → Cache Rules → Create rule**: *URI Path
   starts with* `/uploads/` → *Eligible for cache*, *Edge TTL* 1 month.

   **Check:** `curl -sI https://<domain>/ | grep -i cf-ray` prints a header.

## 7. Backups (off-box, daily)
```bash
rclone config          # n (new remote) → name: eps-backup → storage: drive → accept defaults
                       # "Use web browser to automatically authenticate?" → n (headless)
                       # run the printed `rclone authorize "drive"` on your laptop, paste the token
rclone mkdir eps-backup:eps-backups
bash deploy/backup.sh /var/backups/eps
crontab -e             # add:
0 3 * * * /bin/bash /opt/estudio-pedra-industrial/deploy/backup.sh /var/backups/eps >> /var/log/eps-backup.log 2>&1
```
Google Drive is the default suggestion because the owner already has an
account; any rclone backend works (Backblaze B2: storage `b2`). The script
keeps 7 local archives and prunes remote ones older than 30 days.

**Check:** `rclone ls eps-backup:eps-backups` lists the archive.

## 7b. Check a preview and tell Google
Every page already ships its own title, description, share image and
`https://<domain>/sitemap.xml`; this step just confirms it from outside.
1. Send a piece's link (`https://<domain>/catalogo/<slug>`) to yourself on
   WhatsApp: the card should show the piece's photo and name. If an old blank
   card shows, force a refresh at https://developers.facebook.com/tools/debug/
   or https://www.opengraph.xyz/ and send the link again.
2. Google Search Console (https://search.google.com/search-console): add the
   domain as a property (verify through the Cloudflare DNS record it offers),
   then *Sitemaps* → submit `sitemap.xml`. Indexing takes days to weeks.
3. Optional: a Google Business Profile for the studio (address can stay
   hidden; the WhatsApp number and the site link matter).

**Check:** `curl -s https://<domain>/catalogo/<slug> | grep -c 'property="og:image"'`
prints `1`, and `curl -s https://<domain>/sitemap.xml | grep -c "<loc>"` is
3 plus the number of published pieces.

## 8. Test your restore once
```bash
bash deploy/restore.sh /var/backups/eps/eps-backup-<timestamp>.tgz
```
It stops the app, moves the current `.data/` to `.data.before-restore-<ts>/`,
extracts the archive and starts the app again. Remove the `before-restore`
folder once you are satisfied.

**Check:** `curl -s localhost:3000/healthz` prints `{"ok":true}` and
`https://<domain>/catalogo` shows the products.

## 9. Updating later
```bash
cd /opt/estudio-pedra-industrial
bash deploy/deploy.sh     # git pull -> npm ci -> npm run build -> pm2 restart; .data/ preserved
```
If the database predates the image pipeline (photos still stored as single
JPEGs), run once after the first deploy of this version:
```bash
npm run images:reprocess
```
**Check:** `curl -s localhost:3000/healthz` prints `{"ok":true}`.

## Notes & gotchas
- **Single instance only** — SQLite + local uploads don't share across
  instances; do not enable horizontal autoscaling. A 1 GB VPS is ample.
- If `npm ci` fails compiling `better-sqlite3`, ensure `build-essential` and
  `python3` are installed (step 2).
- Logs: `pm2 logs eps`. Status: `pm2 status`. Health: `curl localhost:3000/healthz`.
- `.env`, `.data/`, `node_modules/`, and `dist/` are git-ignored — deploys
  never overwrite your token or data.
- Certificate renewals keep working with the Cloudflare proxy on; only the
  first issuance needs the grey cloud.
