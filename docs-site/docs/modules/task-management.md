# Modul Manajemen Tugas (Task Management)

Modul Manajemen Tugas dirancang untuk mengelola backlog pengembangan sistem ERP, menyelaraskan tugas dengan kebutuhan teknis, serta memantau status pengerjaan pengembang secara real-time.

![Kanban Board Preview](/img/kanban-board-preview.png)

---

## 📋 Kanban Board & Status Tugas
Status tugas dalam sistem mengikuti alur siklus hidup berikut:
*   `To Do`: Tugas baru yang siap dikerjakan.
*   `In Progress`: Tugas sedang dikerjakan oleh developer yang ditunjuk.
*   `Review`: Developer telah mengunggah bukti pengerjaan (screenshot) dan meminta verifikasi dari PM/QA.
*   `Done`: Tugas diverifikasi selesai dan siap diuji secara integrasi.

---

## 💻 Developer Workbook & Metadata Tugas

Setiap tugas dilengkapi metadata lengkap untuk menjaga ketelusuran (*traceability*) ke dokumen spesifikasi sistem:
*   **Epic & Fitur**: Kategori modul operasional target (misal: MST - Master, PUR - Purchase, SLS - Sales, PRD - Production, INV - Inventory).
*   **Referensi SRD (Software Requirements Document)**: Menghubungkan tugas dengan bab/bagian dalam dokumen persyaratan.
*   **Kode FR (Functional Requirement)**: ID spesifik kebutuhan fungsional.
*   **Kriteria Penerimaan (Acceptance Criteria)**: Syarat utama tugas dinyatakan selesai.
*   **Fase Target**: Fase pengembangan (Fase 1 s/d 7).
*   **ERP Role Context**: Menandakan hak akses peran target di sistem ERP (`administrator`, `top_user`, `user`, atau `all_roles`).

---

## 🤖 Otomasi Distribusi Tugas (`assign-tasks-by-role.ts`)

Sistem menyediakan skrip otomatisasi untuk membagikan tugas-tugas mentah ke tim pengembang berdasarkan modul keahlian masing-masing (misal: Modul Sales ke Halim, Modul Procurement ke Rifqi).

Jalankan perintah berikut untuk mengeksekusi otomatisasi distribusi tugas:
```bash
npx tsx _scripts/assign-tasks-by-role.ts
```

Skrip ini akan:
1. Membaca seluruh tugas bertipe backlog yang belum ditugaskan.
2. Memetakan ke developer yang sesuai berdasarkan kriteria spesialisasi modul.
3. Melakukan sinkronisasi data pembagian tugas baru tersebut langsung ke Google Sheets.
