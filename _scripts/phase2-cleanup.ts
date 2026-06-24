import { db } from "../src/db";
import { tasks, taskContributors, users } from "../src/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

// ── Description map for abbreviated terms ──
const DESCRIPTIONS: Record<string, string> = {
  "MasBOM": "BOM (Bill of Material) — Master daftar bahan penyusun produk",
  "MasCOA": "COA (Chart of Accounts) — Master daftar akun keuangan",
  "MasBerat": "Master data berat produk",
  "MasCompanyCode": "Company Code — Kode perusahaan dalam struktur organisasi ERP",
  "MasControllingArea": "Controlling Area — Area pengendalian biaya dalam ERP",
  "MasCostCenter": "Cost Center — Pusat biaya untuk alokasi pengeluaran",
  "MasPlant": "Plant — Lokasi pabrik/gudang dalam struktur ERP",
  "MasProfitCenter": "Profit Center — Pusat laba untuk analisa profitabilitas",
  "MasPurchasingORG": "Purchasing Organization — Organisasi pembelian dalam ERP",
  "MasSalesChannel": "Sales Channel — Saluran distribusi penjualan",
  "MasSalesDivision": "Sales Division — Divisi penjualan dalam struktur organisasi",
  "MasSalesGroup": "Sales Group — Grup tim penjualan",
  "MasSalesORG": "Sales Organization — Organisasi penjualan dalam ERP",
  "MasTebal": "Master data ketebalan produk",
  "MasWarna": "Master data warna produk",
  "MasMerk": "Master data merek/brand produk",
  "MasBrand": "Master data brand produk",
  "MasArea": "Master data area penjualan salesman",
  "MasCustomer": "Master data pelanggan/customer",
  "MasSupplier": "Master data pemasok/supplier",
  "MasSalesman": "Master data salesman & tenaga penjualan",
  "MasGiro": "Master data giro/bilyet giro",
  "MasReferral": "Master data referral/rujukan",
  "MasNomorSeriPajak": "Master data nomor seri faktur pajak",
  "MasRekeningBank": "Master data rekening bank perusahaan",
  "MasAsetTetap": "Master data aset tetap & penyusutan",
  "MasBahanBaku": "Master data bahan baku produksi",
  "MasBarangJadi": "Master data barang jadi/finished goods",
  "MasBarangLain": "Master data barang lain (non-produksi)",
  "MasJenisBarang": "Master data jenis/kategori barang",
  "MasTipeBarang": "Master data tipe barang",
  "MasKelompokWarna": "Master data kelompok warna produk",
  "MasMesinProduksi": "Master data mesin produksi",
  "MasPiutangKaryawan": "Master data piutang karyawan",
  "MasAturanKomisiSalesman": "Master data aturan komisi salesman",
  "MasAngkaUkuran": "Master data angka ukuran / AZ",
  "MasYield": "Yield / Elastisitas Bahan — Master data rasio hasil produksi",
  "MasPersediaanBahanBaku": "Master data persediaan bahan baku",
  "MasPersediaanPU": "PU = Persediaan Umum — Master data persediaan umum",
  "MasPersediaanUmum": "Master data persediaan umum",
  "MasLokasi": "Master data lokasi/gudang",
  "MasAkun": "Master data akun keuangan (Chart of Account)",
  "MasHargaProduk": "Master data harga produk",
  "MasInventaris": "Master data inventaris & penyusutan",
  "MasKategori": "Master data kategori & satuan produk",
  "MasPaymentTerms": "Payment Terms — Master data syarat pembayaran",
  "MasWorkCenter": "Work Center — Master data pusat kerja produksi",
  "MasAccountMapping": "Account Mapping — Master pemetaan akun keuangan",
};

// ── Rename map: old title → new title ──
const RENAME_MAP: Record<string, string> = {
  "Implementasi Master Supplier": "Implementasi MasSupplier",
  "Implementasi Master Aturan Komisi Salesman": "Implementasi MasAturanKomisiSalesman",
  "Implementasi Master Merk": "Implementasi MasMerk",
  "Implementasi Master Tebal": "Implementasi MasTebal",
  "Implementasi Master Warna": "Implementasi MasWarna",
  "Implementasi Master Nomor Seri Pajak": "Implementasi MasNomorSeriPajak",
  "Implementasi Master Tipe Barang": "Implementasi MasTipeBarang",
  "Implementasi Master Barang Lain": "Implementasi MasBarangLain",
  "Implementasi Master Persediaan Umum": "Implementasi MasPersediaanUmum",
  "Implementasi Master Rekening Bank": "Implementasi MasRekeningBank",
  "Implementasi Master Salesman": "Implementasi MasSalesman",
  "Implementasi Master Kelompok Warna": "Implementasi MasKelompokWarna",
  "Implementasi Master Mesin Produksi": "Implementasi MasMesinProduksi",
  "Implementasi Master Area": "Implementasi MasArea",
  "Implementasi Master Persediaan PU": "Implementasi MasPersediaanPU",
  "Implementasi Master Customer": "Implementasi MasCustomer",
  "Implementasi Chart of Account / Master Akun": "Implementasi Chart of Account / MasAkun",
  "Implementasi Master Angka Ukuran / AZ": "Implementasi MasAngkaUkuran / AZ",
  "Implementasi Master Yield / Elastisitas Bahan": "Implementasi MasYield / Elastisitas Bahan",
  "Implementasi Master Persediaan Bahan Baku": "Implementasi MasPersediaanBahanBaku",
  "Implementasi Master Lokasi / Gudang": "Implementasi MasLokasi / Gudang",
  "Implementasi Master Referral": "Implementasi MasReferral",
  "Implementasi Master Aset Tetap & Penyusutan": "Implementasi MasAsetTetap & Penyusutan",
  "Implementasi Master Barang Jadi": "Implementasi MasBarangJadi",
  "Implementasi Master Brand": "Implementasi MasBrand",
  "Implementasi Master Giro": "Implementasi MasGiro",
  "Implementasi Master Bahan Baku": "Implementasi MasBahanBaku",
  "Implementasi Master Jenis Barang": "Implementasi MasJenisBarang",
  "Implementasi Master Piutang Karyawan": "Implementasi MasPiutangKaryawan",
  "Master Account Mapping CRUD": "MasAccountMapping CRUD",
  "Master BOM (Bill of Material) CRUD": "MasBOM CRUD",
  "Master Chart of Accounts (COA) CRUD": "MasCOA CRUD",
  "Master Harga Produk CRUD": "MasHargaProduk CRUD",
  "Master Inventaris & Penyusutan CRUD": "MasInventaris & Penyusutan CRUD",
  "Master Kategori & Satuan Produk": "MasKategori & SatuanProduk",
  "Master Nomor Seri Pajak CRUD": "MasNomorSeriPajak CRUD",
  "Master Payment Terms CRUD": "MasPaymentTerms CRUD",
  "Master Rekening Bank CRUD": "MasRekeningBank CRUD",
  "Master Salesman & Komisi CRUD": "MasSalesman & Komisi CRUD",
  "Master Supplier CRUD Module": "MasSupplier CRUD Module",
  "Master Work Center CRUD": "MasWorkCenter CRUD",
};

function getDescription(title: string): string | null {
  for (const [key, desc] of Object.entries(DESCRIPTIONS)) {
    if (title.includes(key)) return desc;
  }
  return null;
}

async function main() {
  console.log("=== PHASE 2: DATA CLEANUP ===\n");

  const allTasks = await db.select().from(tasks);
  console.log(`Starting with ${allTasks.length} tasks.`);

  // ── 2A: Delete bugs/testing/defects ──
  const bugsToDelete = allTasks.filter(t =>
    t.title.startsWith("[DEFECT]") ||
    t.title.startsWith("[BUG") ||
    t.epic === "BUG" ||
    t.title === "Test Slideshow Task" ||
    t.title === "QA Module - Role-Based Testing Enhancement" ||
    t.title === "Testing & Verification - End-to-End Testing"
  );
  console.log(`\n2A: Deleting ${bugsToDelete.length} bug/testing tasks...`);
  for (const t of bugsToDelete) {
    await db.delete(taskContributors).where(eq(taskContributors.taskId, t.id));
    await db.delete(tasks).where(eq(tasks.id, t.id));
    console.log(`  ✗ Deleted: ${t.title}`);
  }

  // ── 2B: Delete [FE]/[BE]/[API] split tasks ──
  const remaining1 = await db.select().from(tasks);
  const splitsToDelete = remaining1.filter(t =>
    /^\[(FE|BE|API)\]\s/.test(t.title) ||
    t.title === "Mock up ERP UI" ||
    t.title === "Master Organization CRUD" ||
    t.title === "Master BOM, COA, & Account Mapping CRUD"
  );
  console.log(`\n2B: Deleting ${splitsToDelete.length} [FE]/[BE]/[API] split tasks...`);
  for (const t of splitsToDelete) {
    await db.delete(taskContributors).where(eq(taskContributors.taskId, t.id));
    await db.delete(tasks).where(eq(tasks.id, t.id));
    console.log(`  ✗ Deleted: ${t.title}`);
  }

  // ── 2C: Delete exact title duplicates (keep first by createdAt) ──
  const remaining2 = await db.select().from(tasks);
  const titleMap = new Map<string, typeof remaining2>();
  for (const t of remaining2) {
    if (!titleMap.has(t.title)) titleMap.set(t.title, []);
    titleMap.get(t.title)!.push(t);
  }
  let dupDeleteCount = 0;
  for (const [title, copies] of titleMap.entries()) {
    if (copies.length > 1) {
      // Keep first (by createdAt), delete rest
      const sorted = copies.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      for (let i = 1; i < sorted.length; i++) {
        await db.delete(taskContributors).where(eq(taskContributors.taskId, sorted[i].id));
        await db.delete(tasks).where(eq(tasks.id, sorted[i].id));
        dupDeleteCount++;
      }
    }
  }
  console.log(`\n2C: Deleted ${dupDeleteCount} duplicate tasks.`);

  // ── 2D: Rename Master → Mas ──
  const remaining3 = await db.select().from(tasks);
  let renameCount = 0;
  for (const t of remaining3) {
    const newTitle = RENAME_MAP[t.title];
    if (newTitle) {
      const desc = getDescription(newTitle) || t.description;
      await db.update(tasks).set({ title: newTitle, description: desc }).where(eq(tasks.id, t.id));
      renameCount++;
      console.log(`  ✏️ "${t.title}" → "${newTitle}"`);
    }
  }
  console.log(`\n2D: Renamed ${renameCount} tasks.`);

  // ── 2E: Ensure all Mas tasks have descriptions ──
  const remaining4 = await db.select().from(tasks);
  let descCount = 0;
  for (const t of remaining4) {
    if (/Mas[A-Z]/.test(t.title)) {
      const desc = getDescription(t.title);
      if (desc && t.description !== desc) {
        await db.update(tasks).set({ description: desc }).where(eq(tasks.id, t.id));
        descCount++;
      }
    }
  }
  console.log(`2E: Updated ${descCount} Mas* task descriptions.`);

  // ── 2F: Reset all remaining tasks to todo, progress 0 ──
  await db.update(tasks).set({ status: "todo", progress: 0 });
  const finalTasks = await db.select().from(tasks);
  console.log(`\n2F: Reset all ${finalTasks.length} tasks to todo/0%.`);

  // ── Verify final count ──
  console.log(`\n=== FINAL TASK COUNT: ${finalTasks.length} ===`);
  if (finalTasks.length !== 432) {
    console.log(`⚠️ Expected 432, got ${finalTasks.length}. Delta: ${finalTasks.length - 432}`);
  } else {
    console.log("✅ Exactly 432 tasks. Perfect!");
  }

  process.exit(0);
}

main().catch(console.error);
