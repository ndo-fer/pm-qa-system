# Instalasi & Setup Lokal

Ikuti langkah-langkah berikut untuk memasang dan menjalankan sistem ERP Project Management & QA di lingkungan lokal Anda.

---

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan perangkat Anda telah terpasang software berikut:

- **Node.js**: Versi `20.x` ke atas (Direkomendasikan Node LTS).
- **Python**: Versi `3.9` ke atas (Dibutuhkan untuk menjalankan skrip otomatisasi Selenium).
- **Web Browser**: Microsoft Edge (Selenium dikonfigurasi default menggunakan `webdriver.Edge()`).

---

## ⚙️ Langkah Instalasi

1. **Clone Repositori & Masuk ke Folder:**

   ```bash
   git clone https://github.com/ndo-fer/pm-qa-system.git erp-pm-system
   cd erp-pm-system
   ```

2. **Instalasi Dependensi Node.js:**
   Jalankan perintah berikut pada terminal di folder root proyek:

   ```bash
   npm install
   ```

3. **Instalasi Dependensi Python (E2E Testing):**
   Jalankan perintah pip untuk menginstal Selenium dan library penunjang:

   ```bash
   pip install selenium argparse
   ```

---

## 🔑 Konfigurasi Environment Variables

Salin berkas `.env.example` di root directory menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Buka berkas `.env.local` dan lengkapi konfigurasi berikut:

```env
# Database (PostgreSQL — gunakan connection string Neon/Supabase atau PostgreSQL lokal)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# NextAuth Configuration
NEXTAUTH_SECRET="buat-secret-key-acak-anda-di-sini-minimal-32-karakter"
NEXTAUTH_URL="http://localhost:3000"

# Google Sheets API Integration (Dibutuhkan untuk Sinkronisasi Laporan)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID="id-spreadsheet-laporan-anda"

# WhatsApp Gateway (opsional — kosongkan untuk mode simulasi lokal)
WA_GATEWAY_URL="http://localhost:8000/send-message"
WA_GATEWAY_API_KEY="your-secret-api-key"
```

> [!WARNING]
> Jangan pernah membagikan atau meng-commit berkas `.env.local` Anda ke Git/GitHub untuk mencegah kebocoran kredensial produksi.
