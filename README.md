# ADITYA

Monorepo aplikasi operasional ADITYA. Aplikasi tidak menggunakan autentikasi; akses wajib dibatasi pada tingkat jaringan/infrastruktur.

## Endpoint

- Web: `http://localhost:3130/`
- API health: `http://localhost:3130/api/health`
- API readiness: `http://localhost:3130/api/ready`
- Gas Mix: `POST http://localhost:3130/api/calculations/gas-mix`
- Evaluasi: `POST http://localhost:3130/api/calculations/evaluation`

## Status implementasi PRD

- Tahap 1 — Gas Mix `GAS-01`–`GAS-05`: kalkulasi real-time, validasi input,
  output BBTUD/MW, calculation engine terpisah, dan endpoint API versi formula.
- Tahap 2 — Evaluasi `EVAL-01`–`EVAL-04`: transfer sumber prediksi Gas Mix,
  input realisasi, validasi rasio, dan metrik evaluasi interaktif. Persistence
  riwayat server dimulai pada `EVAL-05` dan belum termasuk tahap ini.
- Formula tahap 1 masih berstatus karakterisasi baseline dan wajib melalui sign-off
  Engineer serta golden dataset sebelum digunakan sebagai formula resmi produksi.

NestJS/Fastify melayani hasil build React pada `/` dan API pada `/api` melalui satu port `3130`.

## Development lokal

Prasyarat: Node.js 24+, pnpm 12.16.1, dan Docker Desktop untuk PostgreSQL lokal.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Dalam development, Vite berjalan pada port `3130` dan meneruskan `/api` ke API internal pada `127.0.0.1:3131`.

## Production: satu container aplikasi

`compose.production.yml` menjalankan satu container yang berisi Web dan API. PostgreSQL tidak dibuat oleh Compose production karena database berada pada server terpusat.

### Konfigurasi server

Buat `/opt/aditya/.env` dan jangan commit file tersebut:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD_URL_ENCODED@HOST:5432/aditya
ADITYA_BIND_ADDRESS=0.0.0.0
ADITYA_PORT=3130
```

Gunakan `127.0.0.1` sebagai `ADITYA_BIND_ADDRESS` jika akses hanya melalui reverse proxy pada host yang sama. Password dalam URL harus di-URL-encode bila mengandung karakter khusus.

```bash
chmod 600 /opt/aditya/.env
```

### Deploy pertama

```bash
cd /opt/aditya
git pull --ff-only origin main
docker compose -f compose.production.yml build --pull
docker compose -f compose.production.yml run --rm --no-deps aditya node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs packages/database/src/migrate.ts
docker compose -f compose.production.yml up -d
docker compose -f compose.production.yml ps
```

Verifikasi:

```bash
docker compose -f compose.production.yml logs --tail=100 aditya
curl --fail --show-error http://127.0.0.1:3130/api/health
curl --fail --show-error --head http://127.0.0.1:3130/
```

### Update berikutnya

```bash
cd /opt/aditya
git pull --ff-only origin main
docker compose -f compose.production.yml build --pull
docker compose -f compose.production.yml run --rm --no-deps aditya node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs packages/database/src/migrate.ts
docker compose -f compose.production.yml up -d --remove-orphans
docker compose -f compose.production.yml ps
curl --fail --show-error http://127.0.0.1:3130/api/health
```

Migration dijalankan sebelum container aplikasi diganti. Migration Drizzle bersifat idempotent: migration yang sudah tercatat tidak dijalankan ulang.

### Perintah operasional

```bash
# Log real-time
docker compose -f compose.production.yml logs -f aditya

# Restart
docker compose -f compose.production.yml restart aditya

# Stop dan hapus container (database terpusat tidak terpengaruh)
docker compose -f compose.production.yml down
```

Jangan menjalankan systemd service Node dan container secara bersamaan karena keduanya akan menggunakan port `3130`.

Jika server memakai runtime container terbatas, Compose ini sengaja tidak menggunakan `init: true`. NestJS sudah mengaktifkan shutdown hooks sehingga container tetap dapat menerima sinyal berhenti secara langsung tanpa `/sbin/docker-init`.

Image juga menggunakan biner `node` sebagai entrypoint langsung sehingga tidak bergantung pada shell script `/usr/local/bin/docker-entrypoint.sh` bawaan base image.

Compose tidak memaksakan `no-new-privileges` karena opsi tersebut tidak kompatibel dengan kebijakan container runtime pada sebagian host. Container tetap berjalan sebagai user non-root `node` yang ditetapkan di dalam image.

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Pada Windows yang belum memiliki shim global pnpm, jalankan workspace check secara langsung:

```powershell
corepack pnpm -r typecheck
corepack pnpm -r test
corepack pnpm -r build
corepack pnpm format:check
```

Jangan gunakan credential development pada staging/production dan jangan membuka port `3130` ke internet publik.
