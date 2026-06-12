# Pengujian E2E Staging Portal ERP

Selain menguji sistem manajemen proyek internal, Anda juga dapat menguji portal staging ERP asli menggunakan skrip otomasi Selenium yang mendukung parameter multi-role.

---

## 🎯 Skenario Pengujian Staging

Skrip pengujian staging berada pada berkas:
📂 `_scripts/test_erp_portal.py`

Skenario pengujian meniru interaksi nyata pengguna pada portal ERP target:
*   Membuka portal login ERP staging.
*   Masuk menggunakan kredensial peran yang ditentukan via argument CLI (Administrator, Top User, atau Standard User).
*   Menelusuri modul Pelanggan, Barang, dan data penunjang.
*   Simulasi pengujian *crash recovery* (seperti crash server Blazor pada menu Bahan Baku) dan log-out aman.

---

## 🚀 Perintah Eksekusi CLI

Skrip mendukung argument fleksibel untuk mempermudah eksekusi:

### 1. Jalankan Uji Coba Peran Administrator (Visual/Headed)
Membuka browser secara visual untuk memantau navigasi administrator:
```bash
python _scripts/test_erp_portal.py --role admin
```

### 2. Jalankan Uji Coba Peran Top User dalam Mode Latar Belakang (Headless)
Berguna untuk pengujian cepat di server CI/CD tanpa membuka jendela peramban:
```bash
python _scripts/test_erp_portal.py --role topuser --headless
```

### 3. Jalankan Uji Coba Peran Standard User
Mengevaluasi pembatasan menu dan hak akses bagi pengguna biasa:
```bash
python _scripts/test_erp_portal.py --role user
```
