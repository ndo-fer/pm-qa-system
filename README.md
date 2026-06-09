# ERP Project Management System
> **PT Pacific Data Jaya**

🌐 **Live Production Link:** [https://pm-qa-system.vercel.app](https://pm-qa-system.vercel.app)

Sistem Manajemen Proyek ERP berbasis web yang dirancang khusus untuk mengelola seluruh siklus hidup pengembangan perangkat lunak (SDLC). Mulai dari perencanaan milestone, penugasan tugas pengembang, penelusuran kemajuan secara visual via grafik S-Curve, hingga eksekusi pengujian QA berbasis matriks peran (Role-Based Matrix Testing) dengan sinkronisasi otomatis dua arah ke **Google Sheets**.

---

<details>
<summary><b>🚀 Tech Stack</b></summary>

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.2 (App Router) | Server-Side Rendering & API Routes modern |
| **Language** | TypeScript 5 | Pemrograman berbasis tipe yang aman |
| **Runtime & Lib** | React 19.2, Base UI, Lucide React | Library UI modern dan set ikon interaktif |
| **Styling** | Tailwind CSS 4, Tailwind Merge, Tw-Animate-CSS | Styling utilitas dengan animasi performa tinggi |
| **Database** | SQLite (`erp_pm.db`) | Database relasional lokal yang cepat |
| **ORM** | Drizzle ORM | TypeScript ORM dengan Drizzle Kit migration tool |
| **Auth** | NextAuth.js v4 (Credentials + JWT) | Manajemen sesi pengguna aman dengan enkripsi Bcrypt |
| **Charts** | Recharts | Visualisasi performa kemajuan & S-Curve proyek |
| **PDF Export** | jsPDF + jsPDF-AutoTable | Pembuatan laporan Test Plan & Test Case berformat PDF |
| **Integration** | Google Sheets API v4 | Sinkronisasi dua arah real-time untuk data Tasks & QA |
| **Automation** | Python, Selenium WebDriver (Edge) | Pengujian E2E otomatis pada sistem lokal & portal staging |

</details>

<details>
<summary><b>✨ Fitur Utama</b></summary>

### 1. Multi-Role Authentication & Access Control
Sistem mengimplementasikan otentikasi berbasis NextAuth dengan pembagian peran yang ketat:
*   🔑 **Admin**: Akses penuh ke seluruh sistem, termasuk manajemen pengguna (CRUD Users).
*   📋 **Project Manager (PM)**: Membuat proyek, melacak milestone, memantau kurva S-Curve, dan mengelola pembagian tugas.
*   💻 **Developer**: Melihat daftar tugas pribadi di Kanban board, memperbarui kemajuan (progress), melaporkan kendala (blocker), dan melampirkan bukti tangkapan layar.
*   🧪 **QA (Quality Assurance)**: Menyusun Test Plan per modul operasional, merancang Test Cases dengan skenario matriks peran ERP, melakukan eksekusi pengujian, serta mencatat log kesalahan.

### 2. Task Management & Developer Workbook
Setiap tugas dilengkapi dengan metadata lengkap yang mengacu pada standar pengembangan:
*   **Kanban Board**: Drag-and-drop interaktif untuk status `To Do` ➔ `In Progress` ➔ `Review` ➔ `Done`.
*   **Developer Workbook Details**: Mencakup pemetaan Epic (MST, PUR, SLS, PRD, INV, dll.), Kode FR (Functional Requirement), Referensi SRD (Software Requirements Document), Kriteria Penerimaan (Acceptance Criteria), Fase Target (Phase 1-7), tingkat prioritas, progress (%) serta deskripsi Blocker.
*   **ERP Role Context**: Menghubungkan tugas dengan peran spesifik di sistem ERP target (`administrator`, `top_user`, `user`, atau `all_roles`) beserta daftar fitur terkait berformat JSON.

### 3. Modul QA & Pengujian Matriks (Matrix Testing)
Memfasilitasi pengujian fungsional dan hak akses secara mendalam pada sistem ERP:
*   **Test Plans**: Dikelompokkan berdasarkan modul operasional utama (Pemasok, Pelanggan, Barang, Katalog Lain, Pengaturan, Keuangan, Kinerja).
*   **Matrix Test Cases**: Satu test case dapat menguji 3 skenario peran sekaligus (`Administrator`, `Top User`, dan `User`) dengan kredensial masuk yang terintegrasi.
*   **Automated Defect Loop**: Jika pengujian pada Real Staging API mengembalikan respon kegagalan (misalnya 401 Unauthorized karena token kedaluwarsa), sistem secara otomatis membuat tugas baru bertipe **[DEFECT]** di Kanban board agar segera diperbaiki oleh pengembang terkait.

### 4. Sinkronisasi Google Sheets & Kalkulasi S-Curve
Integrasi dua arah yang memastikan keselarasan data lokal dengan lembar laporan manajemen:
*   **Bidirectional Sync**: Perubahan status tugas atau hasil tes di Google Sheets dapat diimpor langsung ke database SQLite lokal, begitu pula sebaliknya.
*   **S-Curve Engine**: Menghitung secara dinamis bobot rencana kemajuan mingguan (Planned Cumulative %) dibanding kemajuan nyata pengembang di lapangan (Actual Cumulative %) untuk mendeteksi deviasi jadwal proyek.

</details>

<details>
<summary><b>📊 Struktur Database (Drizzle Schema)</b></summary>

Database SQLite dikelola menggunakan **Drizzle ORM** dengan relasi sebagai berikut:

```mermaid
erDiagram
    users ||--o{ tasks : assigned_to
    users ||--o{ test_cases : executed_by
    projects ||--o{ tasks : contains
    projects ||--o{ test_plans : has
    projects ||--o{ milestones : tracks
    test_plans ||--o{ test_cases : includes
    
    users {
        string id PK
        string name
        string email UK
        string passwordHash
        string role "admin | pm | developer | qa"
        timestamp createdAt
    }
    
    projects {
        string id PK
        string name
        string description
        string startDate
        string endDate
        string status "planned | active | on_hold | completed"
        json sCurveTarget
        json sCurveActual
        timestamp createdAt
    }
    
    tasks {
        string id PK
        string projectId FK
        string assigneeId FK
        string title
        string description
        string status "todo | in_progress | review | done"
        string priority "low | medium | high | urgent"
        string dueDate
        string taskCode
        string epic
        string feature
        string taskType
        string srdRef
        string frCode
        string acceptanceCriteria
        integer progress
        string blocker
        string sprintTarget
        string phase
        string screenshotUrl
        integer isArchived
        string erpRole "administrator | top_user | user | all_roles"
        json roleSpecificFeatures
        timestamp updatedAt
    }
    
    test_plans {
        string id PK
        string projectId FK
        string name
        string module "Pemasok | Pelanggan | Barang | Katalog Lain | Pengaturan | Keuangan | Kinerja"
        string status "draft | active | completed"
        timestamp createdAt
    }
    
    test_cases {
        string id PK
        string testPlanId FK
        string executedBy FK
        string caseNumber
        string description
        string steps
        string expectedResult
        string actualResult
        string status "pending | pass | fail | blocked"
        string notes
        string executedAt
        string erpRole "administrator | top_user | user | matrix"
        string testType "functional | permission | workflow | matrix"
        json loginCredentials
    }
    
    milestones {
        string id PK
        string projectId FK
        string phase
        string module
        string name
        string startDate
        string endDate
        string plannedWeight
        string dependency
        string exitCriteria
        string status
        timestamp createdAt
    }
```

</details>

<details>
<summary><b>📁 Struktur Proyek</b></summary>

```
erp-pm-system/
├── _scripts/                  # Script seeding, migrasi, dan pengujian QA otomatis (Python & TS)
│   ├── assign-tasks-by-role.ts # Otomasi distribusi tugas ke tim developer
│   ├── seed-tasks.ts          # Seeding 55 tugas workbook ERP baru
│   ├── seed-test-cases.ts     # Seeding 87 skenario uji QA matriks
│   ├── run_e2e_qa_test.py     # Selenium E2E test untuk sistem PM lokal
│   ├── test_erp_portal.py     # Selenium E2E test untuk Portal Staging ERP
│   └── migrate.ts             # Script inisialisasi & migrasi database Drizzle
├── scratch/                   # Script penunjang/analitis sementara
├── src/
│   ├── app/
│   │   ├── (auth)/            # Routing Halaman Login & Sign-in
│   │   ├── (dashboard)/       # Routing Halaman Utama & Modul (Terproteksi)
│   │   │   ├── dashboard/     # Statistik S-Curve, Grafik S-Curve Recharts
│   │   │   ├── projects/      # Manajemen CRUD Proyek & Milestone
│   │   │   ├── tasks/         # Kanban Board & Form Editor Tugas
│   │   │   ├── qa/            # Console Eksekusi Pengujian & Laporan PDF
│   │   │   └── users/         # Pengaturan Akun & Manajemen Anggota Tim
│   │   ├── api/               # Endpoint internal (sync sheets, mock-erp, stats)
│   │   ├── globals.css        # Konfigurasi CSS Tailwind & Tema UI
│   │   └── layout.tsx         # Layout HTML & Context Provider utama
│   ├── components/            # Komponen UI Reusable (Dialog, Card, Sidebar, dll.)
│   ├── db/
│   │   ├── index.ts           # Instance koneksi Better-SQLite3
│   │   └── schema.ts          # Skema database relasional (Drizzle ORM)
│   ├── lib/
│   │   ├── google-sheets.ts   # Integrasi sinkronisasi API Google Sheets & Drive
│   │   ├── s-curve.ts         # Algoritma kalkulasi target vs actual S-Curve
│   │   └── export-utils.ts    # Helper untuk ekspor data PDF dan spreadsheet
│   └── auth.ts                # Konfigurasi NextAuth JWT token
├── erp_pm.db                  # Database SQLite lokal
├── drizzle.config.ts          # Konfigurasi workspace Drizzle Kit
├── package.json               # Dependensi & script eksekusi project
└── README.md                  # Dokumentasi teknis proyek
```

</details>

<details>
<summary><b>⚙️ Petunjuk Penginstalan & Penggunaan</b></summary>

### 1. Prasyarat Sistem
*   **Node.js**: Versi `20.x` ke atas (Direkomendasikan Node LTS).
*   **Python**: Versi `3.9` ke atas (Dibutuhkan jika ingin menjalankan skrip otomatisasi Selenium).
*   **Web Browser**: Microsoft Edge (Selenium dikonfigurasi menggunakan `webdriver.Edge()`).

### 2. Instalasi Dependensi
Klon repositori ini ke penyimpanan lokal Anda, kemudian jalankan perintah berikut di terminal:

```bash
# Mengunduh seluruh paket modul Node.js
npm install

# (Opsional) Mengunduh dependensi Python untuk pengujian E2E
pip install selenium argparse
```

### 3. Konfigurasi Environment Variables
Salin berkas `.env.local.example` menjadi `.env.local` pada direktori root, lalu sesuaikan isinya:

```env
# Database Path
DATABASE_URL="file:./erp_pm.db"

# NextAuth Configuration
NEXTAUTH_SECRET="buat-secret-key-acak-anda-di-sini-minimal-32-karakter"
NEXTAUTH_URL="http://localhost:3000"

# Google Sheets API Integration (Opsional untuk Sync Google Drive)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID="id-spreadsheet-laporan-anda"
```

### 4. Setup Database & Seeding Awal
Inisialisasi tabel basis data SQLite serta lakukan injeksi data bawaan (Users, Tasks, Test Cases):

```bash
# Menjalankan migrasi skema tabel Drizzle
npm run db:migrate

# Mengisi data default user, tugas workbook (242 tugas), dan matriks tes (306 test cases)
npm run db:seed

# Memverifikasi integritas data yang telah masuk ke database lokal
npm run db:verify
```

### 5. Menjalankan Server Pengembangan
Jalankan server Next.js lokal pada port `3000`:

```bash
npm run dev
```
Buka peramban (browser) Anda dan akses halaman `http://localhost:3000`.

</details>

<details>
<summary><b>👥 Akun Akses Sistem (Kredensial Default)</b></summary>

Berikut adalah daftar pengguna bawaan hasil seeding database untuk pengujian sistem PM lokal:

| Peran (Role) | Nama Pengguna | Surel (Email) | Kata Sandi |
| :--- | :--- | :--- | :--- |
| **Admin** | Administrator | `admin@erp.local` | `admin123` |
| **PM** | Project Manager | `pm@erp.local` | `pm123` |
| **QA** | Quality Intern | `qa@erp.local` | `qa123` |
| **Developer** | Developer Default | `dev@erp.local` | `dev123` |
| **Developer** | Affan (Master) | `affan@erp.local` | `dev123` |
| **Developer** | Rifqi (Procurement & AP) | `rifqi@erp.local` | `dev123` |
| **Developer** | Halim (Sales & AR) | `halim@erp.local` | `dev123` |
| **Developer** | Akbar (API & System Config) | `akbar@erp.local` | `dev123` |

</details>


<details>
<summary><b>🛠️ Skrip Manajemen & Otomasi QA</b></summary>

Sistem menyediakan rangkaian skrip otomatisasi yang dapat dieksekusi melalui terminal:

### A. Otomasi Distribusi Tugas
Jika Anda mengimpor data tugas mentah atau ingin merapikan pembagian kerja tim pengembang secara otomatis berdasarkan Epic & Bidang Keahlian:
```bash
# Menjalankan distribusi tugas otomatis ke pengembang (Affan, Rifqi, Halim, Akbar) 
# dan mensinkronisasikannya langsung ke lembar Developer Task Board di Google Sheets
npx tsx _scripts/assign-tasks-by-role.ts
```

### B. Pengujian E2E Otomatis (Sistem PM Lokal)
Mendemonstrasikan siklus pengujian integrasi (Login QA ➔ Membuka Console ➔ Menguji Live Endpoint Mock/Staging ➔ Mengalami Kegagalan API ➔ Menulis Defect Tiket Otomatis di Kanban Board):
```bash
# Pastikan server Next.js lokal 'npm run dev' sudah aktif di port 3000
python _scripts/run_e2e_qa_test.py
```

### C. Pengujian E2E Otomatis (Staging Portal ERP)
Melakukan simulasi penelusuran modul pelanggan, modul barang, pengujian crash server Blazor pada menu *Bahan Baku*, penelusuran *Master Plant*, dan log-out dari portal ERP secara otomatis:
```bash
# Menjalankan pengujian staging sebagai Administrator (Secara Visual / Headed)
python _scripts/test_erp_portal.py --role admin

# Menjalankan pengujian staging sebagai Top User dalam mode latar belakang (Headless)
python _scripts/test_erp_portal.py --role topuser --headless

# Menjalankan pengujian staging sebagai Standard User
python _scripts/test_erp_portal.py --role user
```

</details>

---

## 📄 Lisensi & Kontribusi
Hak Cipta Terbatas — **PT Pacific Data Jaya**. Dikembangkan khusus untuk menunjang efisiensi pengelolaan proyek internal dan standardisasi pengujian tim Quality Assurance.
