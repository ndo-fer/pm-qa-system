# Setup Database & Seeding

Sistem ini menggunakan database relasional **SQLite** lokal (`erp_pm.db`) yang dikelola menggunakan **Drizzle ORM** untuk mendefinisikan skema dan memigrasikan tabel secara aman.

---

## 🛠️ Langkah Inisialisasi Database

Jalankan perintah-perintah berikut secara berurutan untuk membuat file database dan mengisi data uji coba:

### 1. Jalankan Migrasi Skema Drizzle
Perintah ini akan membaca skema Drizzle di folder `src/db/schema.ts` dan membuat tabel-tabel yang diperlukan di dalam file basis data SQLite lokal Anda:
```bash
npm run db:migrate
```

### 2. Jalankan Seeding Data Default
Perintah ini akan memicu skrip seeding untuk menginjeksi data contoh ke database:
*   Akun pengguna default (Users).
*   Tugas-tugas workbook pengembang (Tasks - sekitar 240+ tugas).
*   Matriks test cases untuk QA (Test Cases - sekitar 300+ skenario).
```bash
npm run db:seed
```

### 3. Verifikasi Integritas Data
Gunakan perintah verifikasi untuk memastikan seluruh data ter-seeding dengan sempurna tanpa ada baris data yang corrupt atau kosong:
```bash
npm run db:verify
```

---

## 🔍 Apa yang Terjadi di Balik Layar?

Skrip seeding diatur dalam folder `_scripts/`:
*   `_scripts/migrate.ts`: Membaca `drizzle.config.ts` dan menerapkan perubahan skema ke database SQLite.
*   `_scripts/seed.ts`: Menambahkan user role dan data konfigurasi sistem awal.
*   `_scripts/seed-tasks.ts`: Melakukan import data tasks pengembang dari modul ERP (MST, PUR, SLS, PRD, INV, dsb.).
*   `_scripts/seed-test-cases.ts`: Mengisi test cases matriks peran ke database untuk siap diuji oleh tim QA.
