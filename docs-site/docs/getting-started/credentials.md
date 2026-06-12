# Akun Akses Default

Berikut adalah daftar kredensial pengguna default hasil seeding database yang dapat digunakan untuk melakukan simulasi login multi-role pada server lokal (`http://localhost:3000`):

| Peran (Role) | Nama Pengguna | Surel (Email) | Kata Sandi | Deskripsi Akses |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Administrator | `admin@erp.local` | `admin123` | Akses penuh sistem & CRUD user management. |
| **PM** | Project Manager | `pm@erp.local` | `pm123` | Membuat proyek, milestone, memantau S-Curve. |
| **QA** | Quality Intern | `qa@erp.local` | `qa123` | Menyusun Test Plan & Test Case, eksekusi tes matriks. |
| **Developer** | Developer Default | `dev@erp.local` | `dev123` | Melihat personal Kanban board. |
| **Developer** | Affan (Master) | `affan@erp.local` | `dev123` | Master developer workspace. |
| **Developer** | Rifqi (Procurement) | `rifqi@erp.local` | `dev123` | Menangani modul Procurement & AP. |
| **Developer** | Halim (Sales & AR) | `halim@erp.local` | `dev123` | Menangani modul Sales & AR. |
| **Developer** | Akbar (API Config) | `akbar@erp.local` | `dev123` | Menangani API & Konfigurasi Sistem. |

---

> [!IMPORTANT]
> Sandi default di atas ter-enkripsi menggunakan **Bcrypt** saat masuk ke database melalui proses seeding. Sandi ini hanya diperuntukkan bagi lingkungan pengembangan (*development*) lokal dan tidak boleh digunakan pada deployment produksi publik.
