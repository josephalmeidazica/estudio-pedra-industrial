# Estúdio Pedra Industrial

Local, self-contained version of the furniture-studio site. Originally scaffolded on
Manus; all Manus runtime, OAuth, external SDK, CDN, and MySQL dependencies have been
removed so it runs entirely on your machine.

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + wouter (routing) + shadcn/ui
- **Backend:** Express + tRPC (single `products` router)
- **Data:** a local JSON file (`.data/product-images.json`) — no database to install

## Run

```bash
npm install     # first time only
npm run dev     # http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build -> dist/
npm start       # serve the production build
npm run check   # TypeScript type-check
```

## How it works

- Pages: Home (`/`), Catálogo (`/catalogo`), Contato (`/contato`).
- The product list in `client/src/pages/Catalog.tsx` is hardcoded. Photos you upload
  from the catalog page are stored as base64 in `.data/product-images.json` via tRPC and
  persist across restarts. Delete that file to reset.
- The logo lives at `client/public/logo.png` (previously loaded from a Manus CDN).

## Notes

- `assets/*.jpg` at the repo root are the original source photos; they are not wired
  into the app. You can use them as product images via the catalog's upload button.
