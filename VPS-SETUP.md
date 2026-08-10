# Running Estúdio Pedra Industrial on a VPS — Complete Guide

A step-by-step, explain-everything walkthrough for hosting this site on a
Hostinger (or any Ubuntu) VPS — from buying the server to a live site, plus
domain/HTTPS, backups, updates, and troubleshooting.

> `DEPLOY.md` is the condensed cheat-sheet. **This file is the full guide** with
> explanations. If you just want the commands, skip to each "Commands" block.

---

## 0. How it works (the mental model)

A VPS is **one Linux computer with a public IP**. Everything runs on that single
box — no external services:

```
Internet ──(DNS)──▶ Caddy (443/HTTPS) ──▶ Node app (localhost:3000, kept alive by pm2)
                                              ├─ serves the built React site (dist/public)
                                              ├─ serves the API (/api/trpc)
                                              ├─ serves uploaded images (/uploads)
                                              └─ reads/writes  .data/  on local disk
                                                    ├─ app.db      (SQLite database)
                                                    └─ uploads/    (photo files)
```

- **The app** is a single Node process. After a build it serves the website, the
  API, and uploaded images all at once.
- **The database** is a single SQLite file (`.data/app.db`) on the VPS disk — no
  separate database server to run.
- **Images** you upload are saved as files in `.data/uploads/`.
- **pm2** keeps the Node process running (restarts on crash and on reboot).
- **Caddy** (added when you have a domain) provides HTTPS and forwards traffic to
  the app.
- Everything stateful lives in **`.data/`**, which persists across restarts and
  redeploys — that folder is your whole database + all photos, so it's what you
  back up.

Helper scripts in [`deploy/`](./deploy): `ecosystem.config.cjs` (pm2),
`deploy.sh` (update), `backup.sh` (backup), `Caddyfile` (reverse proxy).

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

> **Note on cost/terms:** a VPS is paid, but unlike free serverless tiers it has
> no commercial-use restriction, gives you persistent storage, and runs this app
> with zero code changes.

---

## 2. Connect via SSH

Windows 11 has SSH built in (PowerShell / Windows Terminal). macOS/Linux: any
terminal.

```bash
ssh root@YOUR_VPS_IP
```
Type `yes` to trust the host the first time, then enter your password. You're in
when you see a prompt like `root@srv:~#`.

*(Optional, recommended) create a non-root user later; for a first deploy, root
is fine.*

---

## 3. Install the runtime (run once)

**What this does:** updates the OS, installs Node.js 22 (the JavaScript runtime),
`git` (to fetch the code), build tools (a fallback compiler for the `better-sqlite3`
database module), and `pm2` (the process manager).

```bash
apt update && apt upgrade -y
apt install -y git build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
node -v      # expect v22.x
```

---

## 4. Get the code, install dependencies, build

**What this does:** downloads the app from GitHub (public repo — no login needed),
installs its dependencies exactly as locked, and produces the production build
(`dist/`: the compiled website + bundled server).

```bash
cd /opt
git clone https://github.com/josephalmeidazica/estudio-pedra-industrial.git
cd estudio-pedra-industrial
npm ci
npm run build
```

---

## 5. Configure the environment (`.env`)

**What this does:** creates a `.env` file with a secret admin token (used to
log in to the `/admin` panel, where you manage products and their images),
tells the app to run in production mode, and sets the port.

```bash
printf 'ADMIN_PASSWORD=%s\nNODE_ENV=production\nPORT=3000\n' \
  "$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")" > .env
cat .env    # copy the ADMIN_PASSWORD somewhere safe
```

Notes:
- **Reads and the shopping cart need no token** — it only gates writes (product/
  image management).
- `.env` is git-ignored — it's never committed or pushed. Keep the token private.
- On first start the app creates `.data/app.db` (seeded with 9 starter products)
  and `.data/uploads/`. **Don't delete `.data/` — it's your database + photos.**

---

## 6. Start the app with pm2

**What this does:** launches the app and keeps it running — restarting it if it
crashes and after a server reboot.

```bash
pm2 start deploy/ecosystem.config.cjs   # starts the app (cwd pinned to repo root)
pm2 save                                # remember it for reboots
pm2 startup systemd                     # prints a command — copy/paste & run it
```
Check it's serving locally on the box:
```bash
curl -s "localhost:3000/api/trpc/products.list?input=%7B%7D" | head -c 120
```
You should see JSON with the seeded products (including `estrutura-gaia`).

Useful pm2 commands: `pm2 status`, `pm2 logs eps`, `pm2 restart eps`, `pm2 stop eps`.

---

## 7A. Quick test WITHOUT a domain (reach it by IP)

**What this does:** opens the firewall so you can hit the app directly at its IP
for testing. (No HTTPS yet — that needs a domain, see 7B.)

```bash
ufw allow OpenSSH      # keep SSH open (do this BEFORE enabling the firewall!)
ufw allow 3000         # the app's port, for IP testing
ufw --force enable
```
Now open in your browser:
```
http://YOUR_VPS_IP:3000
```
Go to **`/catalogo`** to browse and try the cart. To manage products/photos,
go to **`/admin`** and log in with your `ADMIN_PASSWORD`.

> This exposes the Node app directly — fine for a test. For a real, public site
> use a domain + HTTPS (7B), which also lets you close port 3000.

---

## 7B. Go public WITH a domain + HTTPS (recommended for real use)

**What this does:** puts **Caddy** in front of the app to provide automatic HTTPS
(free Let's Encrypt certificate) and a clean `https://yourdomain.com`.

**First, DNS:** at your domain registrar, add an **A record** pointing
`yourdomain.com` → `YOUR_VPS_IP`. Wait for it to propagate (minutes to an hour).

**Then install & configure Caddy:**
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# put your domain into the Caddyfile and install it
cd /opt/estudio-pedra-industrial
sed -i 's/example.com/yourdomain.com/' deploy/Caddyfile
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```
The `deploy/Caddyfile` simply says: serve `yourdomain.com` over HTTPS and proxy
requests to the app on `localhost:3000`. Caddy fetches and renews the TLS
certificate automatically.

**Adjust the firewall** — allow web traffic and close the direct app port:
```bash
ufw allow 80
ufw allow 443
ufw delete allow 3000    # no longer expose Node directly; Caddy fronts it
```
Now visit **`https://yourdomain.com`**.

**Optional — Cloudflare (nice in Brazil):** add your domain to a free Cloudflare
account, point the A record there (proxied), and set SSL mode **Full (strict)**.
Cloudflare caches your images at its São Paulo edge for faster loads.

---

## 8. Backups (do this — it's your whole database + photos)

Everything the app persists is in `.data/`. Back it up with the included script:
```bash
cd /opt/estudio-pedra-industrial
bash deploy/backup.sh /var/backups/eps      # writes eps-backup-<timestamp>.tgz
```
**Automate it daily** with cron:
```bash
crontab -e
# add this line (3 AM daily):
0 3 * * * /bin/bash /opt/estudio-pedra-industrial/deploy/backup.sh /var/backups/eps
```
Periodically copy the archives off the VPS (e.g. `scp` them to your machine) so a
server failure can't take your only copy.

---

## 9. Updating to a new version later

When you push changes to GitHub `main`, update the VPS with one command:
```bash
cd /opt/estudio-pedra-industrial
bash deploy/deploy.sh     # git pull → npm ci → npm run build → pm2 restart
```
`.data/` (database + photos) is preserved across updates.

---

## 10. Managing the running app

```bash
pm2 status          # is it running?
pm2 logs eps        # live logs (Ctrl+C to exit)
pm2 restart eps     # restart
pm2 stop eps        # stop
pm2 start eps       # start again
```

---

## 11. Troubleshooting

- **`npm ci` fails building `better-sqlite3`** → ensure `build-essential` and
  `python3` are installed (Step 3). Then retry `npm ci`.
- **Can't reach `http://IP:3000`** → check `pm2 status` (is it `online`?),
  `pm2 logs eps` for errors, and that `ufw allow 3000` was applied (`ufw status`).
- **HTTPS/domain not working** → confirm the DNS A record points to the VPS IP
  (`ping yourdomain.com`), that ports 80/443 are open (`ufw status`), and check
  `systemctl status caddy` + `journalctl -u caddy` for cert errors (DNS must
  resolve before Caddy can issue a certificate).
- **App didn't restart after reboot** → re-run `pm2 startup systemd` and run the
  command it prints, then `pm2 save`.
- **Port already in use** → something else is on 3000; `pm2 delete eps` then start
  again, or change `PORT` in `.env` (and the proxy target).
- **Lost the admin token** → `cat /opt/estudio-pedra-industrial/.env`.

---

## 12. Security checklist

- Keep the firewall tight: only SSH (22) + web (80/443). Close 3000 once Caddy is
  in front (Step 7B).
- Prefer **SSH keys** over passwords; consider disabling root password login and
  using a non-root sudo user once comfortable.
- **Never commit `.env`** or share the `ADMIN_PASSWORD` — it gates all writes.
- Keep **backups off the box** (Step 8).
- Run `apt update && apt upgrade -y` periodically to get security patches.

---

## Quick reference (once set up)

| Task | Command |
|---|---|
| First deploy | Steps 3 → 6 |
| Test by IP | Step 7A → `http://IP:3000` |
| Add domain + HTTPS | Step 7B |
| Update to latest | `bash deploy/deploy.sh` |
| Back up data | `bash deploy/backup.sh /var/backups/eps` |
| View logs | `pm2 logs eps` |
| Get admin token | `cat .env` |
