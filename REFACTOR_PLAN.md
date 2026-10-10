# Audit Singkat Kondisi Awal Codebase
- Frontend (React + Vite) berada di `src/` dengan struktur modular lama (domains, integrations).
- Backend (Express) saat ini menyatu di dalam file `server.ts` di root directory.
- `api/index.ts` mungkin digunakan untuk deployment Vercel.

# Mapping Struktur Lama ke Baru

## Frontend (src)
- `src/domains/access/` -> `src/features/auth/`
- `src/domains/disaster/` -> `src/features/disaster/`
- `src/domains/donation/` -> `src/features/donation/`
- `src/domains/distribution/` -> `src/features/distribution/`
- `src/domains/admin/`, `src/domains/finance/`, `src/domains/operations/` -> `src/features/admin/`
- `src/domains/partner/` -> `src/features/partner/` (karena fitur ini sangat spesifik, sebaiknya ada modul sendiri atau masuk ke admin, kita pisahkan ke `partner/` saja agar lebih modular sesuai target).
- `src/domains/public/` -> `src/features/public/`
- `src/integrations/firebase/` -> `src/services/firebase/`
- `src/integrations/bmkg/client.ts` -> `src/services/bmkg.ts`
- `src/integrations/duitku/payment-service.ts` -> `src/services/duitku.ts`
- `src/integrations/cloudinary/upload.ts` -> `src/services/cloudinary.ts`
- `src/config/` (jika untuk frontend) -> bisa tetap atau dipindah ke `src/lib/` atau `src/services/config/`.

## Backend (server)
- `server.ts` akan dipecah menjadi:
  - `server/app.ts`
  - `server/routes/`
  - `server/controllers/`
  - `server/services/`
  - `server/middleware/`
