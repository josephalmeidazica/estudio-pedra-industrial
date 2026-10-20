# Running Estúdio Pedra Industrial on a VPS — Complete Guide

A step-by-step, explain-everything walkthrough for hosting this site on a
Hostinger (or any Ubuntu) VPS — from buying a domain and a server to a live
HTTPS site with nightly off-box backups, plus updates and troubleshooting.

> `DEPLOY.md` is the condensed cheat-sheet. **This file is the full guide** with
> explanations. If you just want the commands, skip to each "Commands" block.
> Every step ends with a **Check**; do not continue until it passes.

---

## How it works (the mental model)

A VPS is **one Linux computer with a public IP**. Everything runs on that single
box; Cloudflare sits in front of it, and backups leave it nightly:

```
Visitor ──▶ Cloudflare (DNS + proxy + edge cache) ──▶ Caddy (443/HTTPS) ──▶ Node app (localhost:3000, kept alive by pm2)
                                                                              ├─ serves the built React site (dist/public)
                                                                              ├─ serves the API (/api/trpc) and /healthz
                                                                              ├─ serves photos (/uploads, WebP variants)
                                                                              └─ reads/writes  .data/  on local disk
                                                                                    ├─ app.db      (SQLite database)
                                                                                    └─ uploads/    (photo files)
                                                                                          │
                                                               deploy/backup.sh (cron, 03:00) ──▶ rclone ──▶ Google Drive
```

- **The app** is a single Node process. After a build it serves the website, the
  API, and uploaded images all at once. `GET /healthz` answers `{"ok":true}`
  after touching the database; everything in this guide uses it as the check.
- **The database** is a single SQLite file (`.data/app.db`) on the VPS disk — no
  separate database server to run.
- **Images** uploaded by the owner are resized on the server into WebP files at
  up to three widths and saved in `.data/uploads/`.
- **pm2** keeps the Node process running (restarts on crash and on reboot).
- **Caddy** provides HTTPS (free Let's Encrypt certificate) and forwards traffic
  to the app; it also tells the app the visitor's real IP when Cloudflare is in
  front.
- **Cloudflare** hosts the DNS, hides the VPS IP, and caches photos at its São
  Paulo edge.
- Everything stateful lives in **`.data/`**, which persists across restarts and
  redeploys — that folder is your whole database + all photos, so it's what you
  back up and what `deploy/restore.sh` puts back.

Helper scripts in [`deploy/`](./deploy): `ecosystem.config.cjs` (pm2),
`deploy.sh` (update), `backup.sh` (backup), `restore.sh` (restore),
`Caddyfile` (reverse proxy).

---

## 0. Buy a domain

**What this does:** gives the site a name. Cloudflare will host the DNS either
way, so the only decision is where to register.

- **Want a `.com`?** Buy it at **Cloudflare Registrar**
  (dash.cloudflare.com → Domain Registration). Cloudflare sells at cost, and
  the DNS is already there — nothing else to set up.
- **Want a `.com.br`?** Only **Registro.br** sells those (you need a CPF or
  CNPJ). After buying:
  1. Create a free Cloudflare account, **Add a site**, type the domain, pick
     the Free plan. Cloudflare shows **two nameservers** (`xxx.ns.cloudflare.com`).
  2. At Registro.br open the domain → *Alterar servidores DNS* and enter those
     two nameservers. Propagation takes minutes to a few hours.

Don't add DNS records yet; step 6 does that, in a specific order.

**Check:** `dig NS <domain> +short` (or https://dnschecker.org) lists the two
Cloudflare nameservers.

---

## 1. Buy & create the VPS (Hostinger hPanel)

1. hPanel → **VPS** → **Buy/Get VPS**.
2. **Plan:** the cheapest **KVM** plan (≈1 vCPU / 4 GB RAM) is plenty — this app
   is light. Paid (BRL, Pix/card); cheaper if you prepay longer.
3. **Operating System:** **Ubuntu 24.04 (64-bit)** — plain Ubuntu, **not** an
   image bundled with a control panel (avoid "Ubuntu + CyberPanel/Webuzo/…").
4. **Location:** **São Paulo** if offered (lowest latency in Brazil).
5. **Authentication:** set a strong **root password**; add an **SSH key** too if
   offered (more secure).
6. Finish/pay; wait a few minutes for provisioning.
7. From the VPS overview, note the **public IP** (e.g. `191.x.x.x`).

**Connect:** Windows 11 has SSH built in (PowerShell / Windows Terminal).
```bash
ssh root@YOUR_VPS_IP
```
Type `yes` to trust the host the first time, then enter your password.

**Check:** you see a prompt like `root@srv:~#`.

---

## 2. Install the runtime (run once)

**What this does:** updates the OS, installs Node.js 22 (the JavaScript runtime),
`git` (to fetch the code), build tools (a fallback compiler for the `better-sqlite3`
database module), `pm2` (the process manager) and `rclone` (copies backups to
cloud storage in step 7).

```bash
apt update && apt upgrade -y
apt install -y git build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
curl https://rclone.org/install.sh | bash
```

**Check:** `node -v` prints `v22.x` and `rclone version` prints a version line.

---

## 3. Get the code, install dependencies, build

**What this does:** downloads the app from GitHub (public repo — no login needed),
installs its dependencies exactly as locked (including `sharp`, the image
resizer, which ships a prebuilt Linux binary), and produces the production
build (`dist/`: the compiled website, the bundled server and a maintenance script).

```bash
cd /opt
git clone https://github.com/josephalmeidazica/estudio-pedra-industrial.git
cd estudio-pedra-industrial
npm ci
npm run build
```

**Check:** `ls dist/index.js dist/scripts/reprocess-images.js` lists both files.

---

## 4. Configure the environment (`.env`)

**What this does:** creates a `.env` file with the admin passphrase (what the
owner types at `/admin` to manage pieces and photos), tells the app to run in
production mode, and sets the port.

First choose the passphrase: **at least 12 characters, easy to type on a
phone** — three unrelated words with spaces work well (`mesa ferro carvalho`).
Each phone that logs in stays logged in for 30 days, so it is typed rarely.

```bash
printf 'ADMIN_PASSWORD=%s\nSITE_URL=https://<domain>\nNODE_ENV=production\nPORT=3000\n' \
  '<your passphrase>' > .env
cat .env    # keep the passphrase somewhere safe
```
Replace `<your passphrase>` (keep the single quotes around it) and `<domain>`
with the real domain from step 0, without a trailing slash.

Notes:
- **`SITE_URL`** is the public address the server writes into link previews
  (the card WhatsApp and Instagram show when someone shares a piece), the
  sitemap and robots.txt. Without it the server uses each request's host and
  logs a warning at start; previews still work, but through the proxy the
  host could be wrong, so set it.
- **Reads and the WhatsApp buttons need no passphrase** — it only gates the
  admin panel (piece/photo management).
- **Changing `ADMIN_PASSWORD` logs every device out.** Optional: add a line
  `SESSION_SECRET=<long random string>` to keep logins valid across passphrase
  changes; then changing `SESSION_SECRET` itself is how you force every device
  to log in again (e.g. a lost phone).
- **In production the server refuses to start without `ADMIN_PASSWORD`**, so a
  forgotten passphrase shows up as a clear error in `pm2 logs eps`, not as an
  open admin panel.
- `.env` is git-ignored — it's never committed or pushed. Keep the passphrase
  private.
- On first start the app creates `.data/app.db` (seeded with 9 starter products,
  whose photos are converted to WebP variants) and `.data/uploads/`.
  **Don't delete `.data/` — it's your database + photos, including the Lixeira
  (deleted items, restorable for 30 days).**

**Check:** `grep -c ADMIN_PASSWORD .env` prints `1`.

---

## 5. Start the app with pm2

**What this does:** launches the app and keeps it running — restarting it if it
crashes and after a server reboot.

```bash
pm2 start deploy/ecosystem.config.cjs   # starts the app (cwd pinned to repo root)
pm2 save                                # remember it for reboots
pm2 startup systemd                     # prints a command — copy/paste & run it
```

**Check:** `curl -s localhost:3000/healthz` prints `{"ok":true}`.

Useful pm2 commands: `pm2 status`, `pm2 logs eps`, `pm2 restart eps`, `pm2 stop eps`.

**Optional — quick look by IP before the domain works:**
```bash
ufw allow OpenSSH      # keep SSH open (do this BEFORE enabling the firewall!)
ufw allow 3000
ufw --force enable
```
Then open `http://YOUR_VPS_IP:3000` in a browser. Close the port again after
step 6 (`ufw delete allow 3000`); the public site goes through Caddy only.

---

## 6. Go public: Cloudflare + Caddy (HTTPS)

**What this does:** puts **Caddy** in front of the app to provide automatic HTTPS
and a clean `https://<domain>`, then puts **Cloudflare's proxy** in front of
Caddy for caching and to hide the VPS IP. The order matters: Caddy must obtain
its certificate *before* the proxy is turned on, because the certificate
challenge has to reach the VPS directly.

**6.1 DNS (proxy off):** in Cloudflare → DNS → Records → **Add record**:
type `A`, name `@`, IPv4 `YOUR_VPS_IP`, **Proxy status: DNS only (grey cloud)**.
Add a second `A` record with name `www` the same way if you want `www.<domain>`
to work; the Caddyfile redirects it to the main domain.

**6.2 Install & configure Caddy:**
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

cd /opt/estudio-pedra-industrial
sed -i "s/DOMAIN/<domain>/g" deploy/Caddyfile     # e.g. sed -i "s/DOMAIN/estudiopedra.com.br/g" ...
caddy validate --config deploy/Caddyfile --adapter caddyfile   # catches typos before reloading
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```
What the `deploy/Caddyfile` says: serve `<domain>` over HTTPS and proxy
requests to the app on `localhost:3000`; cache photos (`/uploads/*`) and built
assets for a year; add a few security headers; and, because Cloudflare's edge
will sit in front, trust Cloudflare's IP ranges so the app logs the visitor's
real IP rather than Cloudflare's. Caddy fetches and renews the TLS certificate
automatically.

**Check:** `curl -sI https://<domain>/healthz | head -1` prints `HTTP/2 200`.
If it does not, wait a minute (DNS) and look at `journalctl -u caddy -n 50`.

**6.3 Turn Cloudflare on:** back in Cloudflare:
1. DNS → the `A` record(s) → click the cloud so it turns **orange (Proxied)**.
2. **SSL/TLS → Overview → Full (strict)**. Cloudflare now talks HTTPS to Caddy
   and verifies Caddy's certificate.
3. **SSL/TLS → Edge Certificates → Always Use HTTPS: on.**
4. **Caching → Cache Rules → Create rule:** name `uploads`; *When incoming
   requests match…* **URI Path** *starts with* `/uploads/`; *Then…* **Eligible
   for cache**, **Edge TTL** → *Ignore cache-control header and use this TTL* →
   **1 month**. Photos are content-addressed (a new upload gets a new file
   name), so long caching is safe.

**Check:** `curl -sI https://<domain>/ | grep -i cf-ray` prints a header
(traffic now flows through Cloudflare) and the site opens in a browser.

---

## 7. Backups (daily, off the box)

**What this does:** `deploy/backup.sh` tars up `.data/` (database + photos),
copies the archive to a cloud drive with **rclone**, prunes old archives
(7 local, 30 days remote), and cron runs it every night at 03:00. A VPS failure
can then never take your only copy.

**7.1 Connect rclone to Google Drive** (the owner's account; any rclone
backend works — Backblaze B2 is the cheap alternative, storage type `b2`):
```bash
rclone config
#  n            -> New remote
#  name>        eps-backup            (this exact name; backup.sh looks for it)
#  Storage>     drive                 (type the word; Google Drive)
#  client_id / client_secret / scope -> press Enter for defaults
#  "Use web browser to automatically authenticate?" -> n   (the VPS has no browser)
#  it prints:   rclone authorize "drive" ...
#               run THAT command on your laptop (install rclone there too), log in
#               with the owner's Google account, paste the token back here
#  Team Drive?  n  -> y to confirm
#  q            -> quit
rclone mkdir eps-backup:eps-backups
```

**7.2 First backup and the nightly schedule:**
```bash
cd /opt/estudio-pedra-industrial
bash deploy/backup.sh /var/backups/eps      # writes eps-backup-<timestamp>.tgz and copies it
crontab -e
# add this line (03:00 daily, log to /var/log/eps-backup.log):
0 3 * * * /bin/bash /opt/estudio-pedra-industrial/deploy/backup.sh /var/backups/eps >> /var/log/eps-backup.log 2>&1
```
Without a configured remote the script still writes the local archive and
prints `rclone remote 'eps-backup' not configured - skipping off-box copy.`

**Check:** `rclone ls eps-backup:eps-backups` lists the archive, and the
folder `eps-backups` appears in the Google Drive web UI.

---

## 7b. Check a link preview and tell Google

**What this does:** confirms from the outside what the server already does
for every page: a title, a description, a share image (the piece's cover
photo on product pages, the logo card elsewhere) and a sitemap at
`https://<domain>/sitemap.xml`, all generated from the catalog, so nothing
needs updating when the owner adds pieces.

**7b.1 The WhatsApp card.** Open a piece on the site, copy its address
(`https://<domain>/catalogo/<slug>`) and send it to yourself on WhatsApp. The
card should show the photo and "Nome da peça — Estúdio Pedra Industrial".
WhatsApp and Facebook cache cards aggressively: if you had sent the link
before this deploy and still see a blank card, paste the URL into
https://developers.facebook.com/tools/debug/ and click *Scrape again* (or use
https://www.opengraph.xyz/), then send it once more.

**7b.2 Google Search Console.** At https://search.google.com/search-console
add the domain as a *Domain* property. Google asks for a DNS TXT record:
add it in Cloudflare → DNS → Records (type TXT, name `@`, the value Google
shows) and click *Verify*. Then open *Sitemaps* in the left menu, type
`sitemap.xml` and submit. Pages appear in Google over days to weeks; the
*Pages* report shows which URLs were indexed.

**7b.3 Optional: Google Business Profile.** A free profile
(https://business.google.com) puts the studio on Maps and in the local pack
for searches like "móveis sob medida Belo Horizonte". The address can stay
hidden (service-area business); add the WhatsApp number and the site link.

**Check:**
```bash
curl -s https://<domain>/catalogo/<slug> | grep -c 'property="og:image"'   # prints 1
curl -s https://<domain>/sitemap.xml | grep -c "<loc>"            # 3 + number of published pieces
curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/nao-existe   # 404
```

---

## 8. Test your restore once

**What this does:** proves the backup is usable *before* you need it.
`deploy/restore.sh` stops the app, moves the current `.data/` aside as
`.data.before-restore-<timestamp>/` (nothing is deleted), extracts the
archive, and starts the app again.

```bash
cd /opt/estudio-pedra-industrial
ls /var/backups/eps
bash deploy/restore.sh /var/backups/eps/eps-backup-<timestamp>.tgz
```
Restoring from a cloud copy later: `rclone copy eps-backup:eps-backups/<file> /var/backups/eps/`
first, then the same command.

**Check:** `curl -s localhost:3000/healthz` prints `{"ok":true}` and
`https://<domain>/catalogo` shows the products with their photos. Then
`rm -rf .data.before-restore-*`.

---

## 9. Updating to a new version later

When you push changes to GitHub `main`, update the VPS with one command:
```bash
cd /opt/estudio-pedra-industrial
bash deploy/deploy.sh     # git pull → npm ci → npm run build → pm2 restart
```
`.data/` (database + photos) is preserved across updates.

**One-time, only for a database created before the image pipeline existed**
(photos still stored as single JPEG files): convert them into WebP variants:
```bash
npm run images:reprocess    # safe to run again; prints processed/skipped counts
```

**Check:** `curl -s localhost:3000/healthz` prints `{"ok":true}`.

---

## 10. Managing the running app

```bash
pm2 status                        # is it running?
pm2 logs eps                      # live logs (Ctrl+C to exit)
pm2 restart eps                   # restart
pm2 stop eps                      # stop
pm2 start eps                     # start again
curl -s localhost:3000/healthz    # app + database alive?
```

---

## 11. Troubleshooting

- **`npm ci` fails building `better-sqlite3`** → ensure `build-essential` and
  `python3` are installed (Step 2). Then retry `npm ci`.
- **App won't start, logs say `ADMIN_PASSWORD is not set`** → the production
  guard: fix `.env` (Step 4), then `pm2 restart eps`.
- **`/healthz` returns 500** → the database query failed: check `pm2 logs eps`
  and free disk space (`df -h`); a full disk is the usual cause.
- **Can't reach `http://IP:3000`** → check `pm2 status` (is it `online`?),
  `pm2 logs eps` for errors, and that `ufw allow 3000` was applied (`ufw status`).
- **Caddy can't get a certificate** → the A record must be **grey cloud (DNS
  only)** during the first issuance and point at the VPS IP (`ping <domain>`);
  ports 80/443 open (`ufw status`); details in `journalctl -u caddy`.
- **Cloudflare shows error 526** → SSL mode is Full (strict) but Caddy has no
  valid certificate yet: finish 6.2 before 6.3.
- **App didn't restart after reboot** → re-run `pm2 startup systemd` and run the
  command it prints, then `pm2 save`.
- **Port already in use** → something else is on 3000; `pm2 delete eps` then start
  again, or change `PORT` in `.env` (and the proxy target in the Caddyfile).
- **Forgot the admin passphrase** → `cat /opt/estudio-pedra-industrial/.env`.
- **Phone says `Muitas tentativas`** → five wrong passwords in a row from one
  address block logins for 15 minutes; wait and try again.
- **Lost a phone that was logged in** → change `ADMIN_PASSWORD` in `.env` (or
  `SESSION_SECRET` if set) and `pm2 restart eps`; every device must log in again.
- **Backup log shows `skipping off-box copy`** → the rclone remote is missing or
  misnamed: `rclone listremotes` must print `eps-backup:` (Step 7.1).

---

## 12. Security checklist

- Keep the firewall tight: only SSH (22) + web (80/443). Close 3000 once Caddy is
  in front (Step 6).
- Prefer **SSH keys** over passwords; consider disabling root password login and
  using a non-root sudo user once comfortable.
- **Never commit `.env`** or share the `ADMIN_PASSWORD` — it is the admin login.
- Keep **backups off the box** (Step 7) and **test the restore** (Step 8).
- Run `apt update && apt upgrade -y` periodically to get security patches.

---

## Quick reference (once set up)

| Task | Command |
|---|---|
| First deploy | Steps 2 → 6 |
| Health check | `curl -s localhost:3000/healthz` |
| Update to latest | `bash deploy/deploy.sh` |
| Convert pre-pipeline photos (once) | `npm run images:reprocess` |
| Check a share card / the sitemap | Step 7b |
| Back up data now | `bash deploy/backup.sh /var/backups/eps` |
| Restore from a backup | `bash deploy/restore.sh /var/backups/eps/<file>.tgz` |
| View logs | `pm2 logs eps` |
| See the admin passphrase | `cat .env` |
