# Akun Akses Default

Berikut adalah daftar akun pengguna default hasil seeding database yang dapat digunakan untuk simulasi login multi-role pada server lokal (`http://localhost:3000`).

Jalankan perintah berikut untuk membuat akun default:

```bash
npm run db:seed
```

| Peran (Role) | Nama Pengguna | Surel (Email) | Deskripsi Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | Administrator | `admin@erp.local` | Akses penuh sistem & CRUD user management. |
| **PM** | Project Manager | `pm@erp.local` | Membuat proyek, milestone, memantau S-Curve. |
| **QA** | Quality Intern | `qa@erp.local` | Menyusun Test Plan & Test Case, eksekusi tes matriks. |
| **Developer** | Developer Default | `dev@erp.local` | Melihat personal Kanban board. |
| **Developer** | Affan (Master) | `affan@erp.local` | Master developer workspace. |
| **Developer** | Rifqi (Procurement) | `rifqi@erp.local` | Menangani modul Procurement & AP. |
| **Developer** | Halim (Sales & AR) | `halim@erp.local` | Menangani modul Sales & AR. |
| **Developer** | Akbar (API Config) | `akbar@erp.local` | Menangani API & Konfigurasi Sistem. |

---

> [!IMPORTANT]
> Kata sandi default di-set melalui `_scripts/seed.ts` dan di-enkripsi dengan **Bcrypt** sebelum masuk ke database. Akun ini **hanya untuk lingkungan development lokal**. Jangan gunakan kata sandi yang sama pada deployment produksi publik.
