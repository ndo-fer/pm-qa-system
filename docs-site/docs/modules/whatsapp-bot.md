# WhatsApp Bot Gateway (WA-BOT)

Sistem mengintegrasikan gateway WhatsApp headless berbasis `whatsapp-web.js` untuk otomatisasi notifikasi real-time dan pelacakan status QA langsung via ruang obrolan WhatsApp.

---

## 🏗️ Alur Koneksi & Inisialisasi

Gateway berjalan sebagai proses server terpisah di latar belakang (background process) menggunakan script:
📂 `_scripts/wa-gateway.ts`

Untuk memulai gateway:
```bash
npm run wa:gateway
```

Saat pertama kali dijalankan, gateway akan memunculkan kode QR di terminal. Pengguna memindai kode QR tersebut menggunakan aplikasi WhatsApp di ponsel untuk mengotorisasi sesi.

---

## 🛠️ Mitigasi Masalah & Stabilitas Gateway

Modul `wa.ts` dilengkapi mekanisme pemulihan bencana (*disaster recovery*) untuk menstabilkan koneksi:

1.  **LID Migration Bypass (WhatsApp Web Update):**
    Mengatasi kegagalan pengiriman pesan karena pembaruan skema ID WhatsApp Web (LID) melalui injeksi script runtime bypass.
2.  **EBUSY Lock Session Mitigation:**
    Saat gateway melakukan *restart*, berkas sesi lokal `.wwebjs_auth` sering kali mengalami penguncian (*file lock*) oleh sistem operasi Windows. Gateway secara otomatis menghentikan instansi client lama dan menghapus resource lock sebelum mencoba menyambung ulang untuk mencegah crash server.
3.  **Graceful Re-initialization:**
    Secara otomatis menutup koneksi WebSocket secara rapi jika mendeteksi pemutusan sambungan dari ponsel penguji.

---

## 💬 Deteksi Pesan Masuk & QA Verification

Gateway mendeteksi pesan masuk dengan memantau event `message_create`. Jika penguji mengirimkan kode status tertentu (misal: membalas format laporan pengujian), gateway akan memproses pesan tersebut dan memperbarui database SQLite atau melaporkannya ke dashboard.

Skenario uji coba WhatsApp Bot dapat di-seed ke database menggunakan skrip:
📂 `scratch/seed_wa_bot_test_cases.ts`
