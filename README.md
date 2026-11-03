# ADITYA

Monorepo aplikasi operasional ADITYA. Aplikasi tidak menggunakan authentication; akses wajib dibatasi pada tingkat jaringan/infrastruktur.

## Prasyarat

- Node.js 24+
- Corepack (gunakan `corepack pnpm` jika shim global pnpm belum diaktifkan)
- Docker Desktop

## Menjalankan development

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm dev
```

- Web: http://localhost:3130
- API health: http://localhost:3130/api/health

Pada development, Vite menjadi entry point port `3130` dan meneruskan `/api` ke API internal port `3131`.

## Menjalankan production build secara lokal

```powershell
corepack pnpm build
$env:NODE_ENV = "production"
$env:API_PORT = "3130"
corepack pnpm --filter @aditya/api start
```

NestJS/Fastify melayani web pada `/` dan API pada `/api` melalui satu port `3130`.

Jangan gunakan credential development pada staging/production.
