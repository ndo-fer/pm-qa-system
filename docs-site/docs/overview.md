---
slug: /
title: Deskripsi Sistem
---

Selamat datang di dokumentasi teknis **ERP Project Management & QA System** PT Pacific Data Jaya.

![Dashboard Preview](/img/dashboard-preview.png)

Sistem ini adalah platform manajemen proyek berbasis web yang dirancang khusus untuk mengelola seluruh siklus hidup pengembangan perangkat lunak (SDLC). Mulai dari perencanaan milestone, penugasan tugas pengembang, penelusuran kemajuan secara visual via grafik S-Curve, hingga eksekusi pengujian QA berbasis matriks peran (Role-Based Matrix Testing) dengan sinkronisasi otomatis dua arah ke **Google Sheets** dan WhatsApp Bot gateway.

---

## 📸 Fitur Utama

Sistem mengimplementasikan alur SDLC terintegrasi dengan 4 pilar utama:
1. **Multi-Role Authentication & Access Control**: Pembagian peran yang ketat (Admin, PM, Developer, QA) menggunakan NextAuth.js.
2. **Task Management & Developer Workbook**: Kanban Board drag-and-drop dengan metadata ERP lengkap (Epic, Kode FR, Referensi SRD, Kriteria Penerimaan).
3. **Modul QA & Matrix Testing**: Pengujian fungsionalitas dan hak akses secara mendalam pada 3 skenario peran ERP target (*Administrator*, *Top User*, dan *User*) sekaligus.
4. **Google Sheets Integration & S-Curve**: Sinkronisasi dua arah real-time untuk data Tasks/QA dan grafik S-Curve dinamis.
5. **WhatsApp Headless Gateway (WA-BOT)**: Bot otomatisasi notifikasi, pelacakan pengujian, dan penanganan bug QA secara real-time.

---

## 🛠️ Tech Stack

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.2 (App Router) | Server-Side Rendering & API Routes modern |
| **Language** | TypeScript 5 | Pemrograman berbasis tipe yang aman |
| **Runtime & Lib** | React 19.2, Base UI, Lucide React | Library UI modern dan set ikon interaktif |
| **Styling** | Tailwind CSS 4, Tailwind Merge, Tw-Animate-CSS | Styling utilitas dengan animasi performa tinggi |
| **Database & ORM** | PostgreSQL + Drizzle ORM | Database relasional cloud-hosted (Neon/Supabase) dengan Drizzle Kit |
| **Auth** | NextAuth.js v4 (Credentials + JWT) | Manajemen sesi pengguna aman dengan enkripsi Bcrypt |
| **Charts** | Recharts | Visualisasi performa kemajuan & S-Curve proyek |
| **PDF Export** | jsPDF + jsPDF-AutoTable | Pembuatan laporan Test Plan & Test Case berformat PDF |
| **WhatsApp Integration** | `whatsapp-web.js` + Express | Gateway WA headless lokal untuk interaksi bot otomatis |
| **Automation** | Playwright (TypeScript) & Python Selenium (Edge) | Pengujian E2E otomatis internal (Playwright) & portal staging ERP (Selenium) |
