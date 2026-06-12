# Pengujian E2E Sistem Lokal

Sistem menyediakan skrip pengujian E2E (End-to-End) berbasis **Python** dan **Selenium WebDriver** untuk memverifikasi fungsionalitas konsol QA lokal.

---

## 🎯 Skenario Pengujian Otomatis

Skrip E2E utama dijalankan dari berkas:
📂 `_scripts/run_e2e_qa_test.py`

Skenario yang disimulasikan oleh skrip meliputi:
1.  **Otentikasi Otomatis**: Membuka browser Edge, masuk ke halaman login sistem PM lokal (`http://localhost:3000`), mengisi kredensial QA default, dan masuk ke Dashboard.
2.  **Navigasi Konsol QA**: Membuka halaman Test Plan, mendeteksi test cases terdaftar.
3.  **Simulasi Pengujian API & Failure**: Melakukan pengujian request ke Endpoint Mocking Staging.
4.  **Verifikasi Defect Loop**: Menangkap hasil kegagalan API, mengisi formulir pengujian, menekan tombol simpan, lalu memverifikasi bahwa tiket defect baru berhasil dibuat di Kanban Board Developer.

---

## 🚀 Cara Menjalankan Pengujian

1.  **Aktifkan Server Next.js Lokal**:
    Pastikan server lokal Anda sudah menyala:
    ```bash
    npm run dev
    ```

2.  **Jalankan Skrip Python**:
    Buka terminal baru dan jalankan skrip E2E:
    ```bash
    python _scripts/run_e2e_qa_test.py
    ```

3.  **Analisis Hasil**:
    Skrip akan membuka peramban Edge secara visual, mengklik tombol-tombol, dan mengeluarkan log hasil pengujian langsung di terminal Anda.
