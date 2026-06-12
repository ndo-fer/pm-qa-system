# Mesin Perhitungan S-Curve

Grafik S-Curve digunakan oleh Project Manager (PM) untuk mendeteksi deviasi jadwal proyek dengan membandingkan target kemajuan rencana akumulatif dengan realisasi kemajuan aktual pengembang di lapangan.

---

## 📈 Konsep Perhitungan S-Curve

Mesin kalkulasi S-Curve membagi data kemajuan proyek menjadi dua metrik akumulatif mingguan:

1.  **Planned Cumulative Progress (%)**:
    *   Dihitung berdasarkan target penyelesaian milestone mingguan yang telah disetujui di awal proyek.
    *   Setiap milestone memiliki bobot persentase rencana (`plannedWeight`).
2.  **Actual Cumulative Progress (%)**:
    *   Dihitung secara dinamis dari persentase kemajuan (*progress %*) tugas-tugas di Kanban Board yang sedang dikerjakan atau diselesaikan oleh Developer.
    *   Formulanya menjumlahkan kontribusi progres riil dari seluruh tugas aktif dibagi total bobot tugas keseluruhan.

---

## 📂 Berkas Algoritma & Visualisasi

Logika matematika S-Curve diisolasi secara khusus pada berkas:
📂 `src/lib/s-curve.ts`

Metode pengolahan data yang dilakukan:
*   `calculateSCurveData(projectId: string)`: Menggabungkan rentang tanggal mingguan proyek, mengukur target milestone di setiap minggunya, lalu menjumlahkan progres tugas developer secara aktual untuk menghasilkan dataset deret waktu (*time-series*).
*   **Visualisasi Frontend**: Dataset diumpankan ke pustaka grafik **Recharts** pada dashboard utama untuk merender grafik kurva linier ganda (Target vs Aktual).
