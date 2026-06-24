import { db } from "../src/db";
import { tasks, taskContributors, users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function main() {
  console.log("=== PHASE 3: RE-SEED CONTRIBUTORS ===\n");

  // Clear existing contributors
  await db.delete(taskContributors);
  console.log("Cleared all existing taskContributors.");

  // Fetch developers
  const devs = await db.select().from(users).where(eq(users.role, "developer"));
  const affan = devs.find(u => u.name === "Affan")!;
  const halim = devs.find(u => u.name === "Halim")!;
  const rifqi = devs.find(u => u.name === "Rifqi")!;
  const akbar = devs.find(u => u.name === "Akbar")!;
  const hendik = devs.find(u => u.name === "Hendik")!;
  const agung = devs.find(u => u.name === "Agung")!;

  console.log(`Developers: Affan=${affan.id.slice(0,8)}, Halim=${halim.id.slice(0,8)}, Rifqi=${rifqi.id.slice(0,8)}, Akbar=${akbar.id.slice(0,8)}, Hendik=${hendik.id.slice(0,8)}, Agung=${agung.id.slice(0,8)}`);

  const allTasks = await db.select().from(tasks);
  console.log(`Total tasks to assign: ${allTasks.length}\n`);

  let insertCount = 0;

  async function addContributor(taskId: string, devId: string, isActive: boolean = false) {
    await db.insert(taskContributors).values({
      id: randomUUID(),
      taskId,
      developerId: devId,
      individualProgress: 0,
      isCurrentActive: isActive,
    });
    insertCount++;
  }

  for (const t of allTasks) {
    const title = t.title.toLowerCase();
    const epic = (t.epic || "").toUpperCase();

    // ── MST (Master Data) → Affan (FE) + Akbar (API) ──
    if (epic === "MST" || title.includes("mas") && (title.includes("crud") || title.includes("implementasi mas"))) {
      await addContributor(t.id, affan.id, true);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: affan.id }).where(eq(tasks.id, t.id));
    }
    // ── PUR (Procurement) → Rifqi (FE) + Agung (BE) + Akbar (API) ──
    else if (epic === "PUR" || title.includes("purchase") || title.includes("pembelian") || title.includes("requisition") || title.includes("rfq") || title.includes("quotation") || title.includes("goods receipt") || title.includes("lpb")) {
      await addContributor(t.id, rifqi.id, true);
      await addContributor(t.id, agung.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: rifqi.id }).where(eq(tasks.id, t.id));
    }
    // ── SLS (Sales) → Halim (FE) + Hendik (BE) + Akbar (API) ──
    else if (epic === "SLS" || title.includes("sales") || title.includes("penjualan") || title.includes("surat jalan") || title.includes("faktur") || title.includes("konfirmasi order") || title.includes("salesman") || title.includes("komisi")) {
      await addContributor(t.id, halim.id, true);
      await addContributor(t.id, hendik.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
    }
    // ── INV (Inventory) → Affan+Rifqi (FE) + Agung (BE) + Akbar (API) ──
    else if (epic === "INV" || title.includes("stock") || title.includes("stok") || title.includes("inventory") || title.includes("persediaan") || title.includes("barang") || title.includes("coil") || title.includes("buffer") || title.includes("konsinyasi") || title.includes("mutasi") || title.includes("koreksi")) {
      await addContributor(t.id, affan.id, true);
      await addContributor(t.id, rifqi.id);
      await addContributor(t.id, agung.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: affan.id }).where(eq(tasks.id, t.id));
    }
    // ── PRD (Production) → Rifqi (FE) + Agung (BE) + Akbar (API) ──
    else if (epic === "PRD" || title.includes("produksi") || title.includes("spk") || title.includes("bom") || title.includes("packing") || title.includes("mesin") || title.includes("bop") || title.includes("yield")) {
      await addContributor(t.id, rifqi.id, true);
      await addContributor(t.id, agung.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: rifqi.id }).where(eq(tasks.id, t.id));
    }
    // ── AP (Account Payable) → Rifqi (FE) + Agung (BE) + Akbar (API) ──
    else if (epic === "AP" || title.includes("hutang") || title.includes("payable") || title.includes("payment ap")) {
      await addContributor(t.id, rifqi.id, true);
      await addContributor(t.id, agung.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: rifqi.id }).where(eq(tasks.id, t.id));
    }
    // ── AR (Account Receivable) → Halim (FE) + Hendik (BE) + Akbar (API) ──
    else if (epic === "AR" || title.includes("piutang") || title.includes("receivable") || title.includes("plafon") || title.includes("payment ar")) {
      await addContributor(t.id, halim.id, true);
      await addContributor(t.id, hendik.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
    }
    // ── FIN (Finance) → Halim (FE) + Hendik (BE) + Akbar (API) ──
    else if (epic === "FIN" || title.includes("giro") || title.includes("kas") || title.includes("bank") || title.includes("jurnal") || title.includes("rekening")) {
      await addContributor(t.id, halim.id, true);
      await addContributor(t.id, hendik.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
    }
    // ── GL (General Ledger) → Halim (FE) + Hendik (BE) + Akbar (API) ──
    else if (epic === "GL" || title.includes("ledger") || title.includes("neraca") || title.includes("rugi laba") || title.includes("closing") || title.includes("tutup bulan") || title.includes("audit") || title.includes("chart of account")) {
      await addContributor(t.id, halim.id, true);
      await addContributor(t.id, hendik.id);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
    }
    // ── RPT (Reports) → assign by report topic ──
    else if (epic === "RPT") {
      // Sales-related reports → Halim
      if (title.includes("penjualan") || title.includes("salesman") || title.includes("omzet") || title.includes("so ") || title.includes("ko ") || title.includes("faktur penjualan") || title.includes("faktur pajak penjualan") || title.includes("retur penjualan") || title.includes("planning pengiriman") || title.includes("komisi") || title.includes("top") || title.includes("customer")) {
        await addContributor(t.id, halim.id, true);
        await addContributor(t.id, akbar.id);
        await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
      }
      // Purchase-related reports → Rifqi
      else if (title.includes("pembelian") || title.includes("po") || title.includes("supplier") || title.includes("retur pembelian") || title.includes("faktur pajak retur")) {
        await addContributor(t.id, rifqi.id, true);
        await addContributor(t.id, akbar.id);
        await db.update(tasks).set({ assigneeId: rifqi.id }).where(eq(tasks.id, t.id));
      }
      // Finance/GL reports → Halim
      else if (title.includes("neraca") || title.includes("rugi laba") || title.includes("arus kas") || title.includes("perubahan modal") || title.includes("keuangan") || title.includes("buku besar") || title.includes("ledger") || title.includes("jurnal") || title.includes("biaya") || title.includes("kas bank") || title.includes("giro") || title.includes("rasio") || title.includes("inventaris") || title.includes("audit")) {
        await addContributor(t.id, halim.id, true);
        await addContributor(t.id, akbar.id);
        await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
      }
      // Inventory/Production reports → Rifqi
      else if (title.includes("hpp") || title.includes("produksi") || title.includes("spk") || title.includes("outstanding spk") || title.includes("lokasi") || title.includes("price list") || title.includes("catalog") || title.includes("perputaran")) {
        await addContributor(t.id, rifqi.id, true);
        await addContributor(t.id, akbar.id);
        await db.update(tasks).set({ assigneeId: rifqi.id }).where(eq(tasks.id, t.id));
      }
      // Fallback → Affan
      else {
        await addContributor(t.id, affan.id, true);
        await addContributor(t.id, akbar.id);
        await db.update(tasks).set({ assigneeId: affan.id }).where(eq(tasks.id, t.id));
      }
    }
    // ── ADM (Admin) → Affan (FE) + Akbar (API) ──
    else if (epic === "ADM" || title.includes("admin") || title.includes("user") || title.includes("role") || title.includes("permission") || title.includes("backup") || title.includes("logout") || title.includes("template cetak") || title.includes("seed data") || title.includes("schema migration") || title.includes("api routes")) {
      await addContributor(t.id, affan.id, true);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: affan.id }).where(eq(tasks.id, t.id));
    }
    // ── Fallback → Affan ──
    else {
      await addContributor(t.id, affan.id, true);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: affan.id }).where(eq(tasks.id, t.id));
    }
  }

  console.log(`\nInserted ${insertCount} contributor records across ${allTasks.length} tasks.`);

  // Summary per developer
  const allContribs = await db.select().from(taskContributors);
  const devCounts: Record<string, number> = {};
  for (const c of allContribs) {
    const dev = devs.find(d => d.id === c.developerId);
    const name = dev?.name || "?";
    devCounts[name] = (devCounts[name] || 0) + 1;
  }
  console.log("\nContributor summary:");
  for (const [name, count] of Object.entries(devCounts).sort()) {
    console.log(`  ${name}: ${count} tasks`);
  }

  process.exit(0);
}

main().catch(console.error);
