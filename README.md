# Bliss Digital dashboard

Internal dashboard: clients, invoices, users. One Express service serves the API and the built React frontend.

## Local development

```bash
npm ci
npm run dev:full   # Vite on :5173, API on :4000
```

## Deploying on Railway

1. New project → deploy from this GitHub repo.
2. Build command `npm run build`, start command `npm start`.
3. Variables:
   - `NODE_ENV=production`
   - `JWT_SECRET` — long random string (`openssl rand -hex 32`). The server refuses to start without it.
   - `DATA_DIR=/data`
4. Add a volume mounted at `/data`. Without it, every deploy wipes users, clients and invoice history.
5. Deploy, read the starter superadmin password from the deploy logs, log in and change it.
6. Pick the region closest to Jakarta.

## Data and backups

All runtime data lives as files in `DATA_DIR` (default `server/data/`): `users.json`, `clients.xlsx`, `invoice-templates.json`, `invoice-log.json`. Never commit these; they hold client details and password hashes.

Superadmins can download a zip of everything from **Users → Download backup**. To restore, stop the service, unzip the files into `DATA_DIR`, and start it again.
