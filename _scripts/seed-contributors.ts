import { db } from "../src/db";
import { tasks, users, taskContributors } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Seed task contributors.
 * Filosofi: 1 task (misal "Surat Jalan Module") dikerjakan oleh 2-3 developer.
 * Tidak ada duplikasi task per layer (API/BE/FE) — cukup 1 task, multi assignee.
 */

// Map: sebagian title task → siapa saja yang ngerjain
// Format: [developerName[], primaryDev]
const CONTRIBUTOR_RULES: Array<{
  titleKeywords: string[];
  contributors: string[]; // nama developer (case-insensitive match)
}> = [
  // MST - Master Data → Affan primary, Akbar bantu backend
  { titleKeywords: ["master supplier"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["master nomor seri pajak"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["master salesman"], contributors: ["Affan"] },
  { titleKeywords: ["master harga produk"], contributors: ["Affan", "Halim"] },
  { titleKeywords: ["master bom"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["chart of accounts", "coa"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["account mapping"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["master rekening bank"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["master inventaris"], contributors: ["Affan"] },
  { titleKeywords: ["payment terms"], contributors: ["Affan", "Rifqi"] },
  { titleKeywords: ["work center"], contributors: ["Affan", "Akbar"] },
  { titleKeywords: ["kategori", "satuan produk"], contributors: ["Affan"] },

  // PUR - Procurement → Rifqi primary, Akbar bantu backend
  { titleKeywords: ["purchase requisition", "pr)"], contributors: ["Rifqi", "Akbar"] },
  { titleKeywords: ["rfq", "quotation"], contributors: ["Rifqi", "Akbar"] },
  { titleKeywords: ["purchase order", "po)"], contributors: ["Rifqi", "Akbar"] },
  { titleKeywords: ["goods receipt"], contributors: ["Rifqi", "Akbar"] },
  { titleKeywords: ["tax invoice purchase"], contributors: ["Rifqi", "Akbar"] },
  { titleKeywords: ["account payable", "ap module"], contributors: ["Rifqi", "Akbar"] },
  { titleKeywords: ["purchase return"], contributors: ["Rifqi"] },
  { titleKeywords: ["pelunasan hutang", "ap payment"], contributors: ["Rifqi", "Akbar"] },

  // SLS - Sales → Halim primary, Akbar bantu backend
  { titleKeywords: ["konfirmasi order", "(ko)"], contributors: ["Halim", "Akbar"] },
  { titleKeywords: ["sales order", "(so)"], contributors: ["Halim", "Akbar"] },
  { titleKeywords: ["surat jalan", "(sj)"], contributors: ["Halim", "Rifqi", "Akbar"] },
  { titleKeywords: ["sales invoice", "faktur pajak"], contributors: ["Halim", "Akbar"] },
  { titleKeywords: ["sales return"], contributors: ["Halim"] },
  { titleKeywords: ["pelunasan piutang", "ar payment"], contributors: ["Halim", "Akbar"] },

  // PRD - Production → Akbar primary, Affan bantu
  { titleKeywords: ["planning schedule produksi"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["spk (surat perintah kerja)", "spk module"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["spk checker"], contributors: ["Akbar"] },
  { titleKeywords: ["bom explode"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["work center log"], contributors: ["Akbar"] },
  { titleKeywords: ["quality control (qc)", "qc module"], contributors: ["Akbar", "Halim"] },
  { titleKeywords: ["hasil produksi", "pakai bahan"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["packing production"], contributors: ["Akbar"] },
  { titleKeywords: ["bop usage"], contributors: ["Akbar"] },

  // INV - Inventory → semua bisa terlibat
  { titleKeywords: ["stock card"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["stock position"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["mutasi barang"], contributors: ["Akbar", "Rifqi"] },
  { titleKeywords: ["stock correction"], contributors: ["Akbar"] },
  { titleKeywords: ["stock opname"], contributors: ["Akbar", "Affan", "Rifqi"] },

  // FIN/GL → Akbar primary
  { titleKeywords: ["giro transaction"], contributors: ["Akbar", "Halim"] },
  { titleKeywords: ["kas/bank transaction"], contributors: ["Akbar", "Halim"] },
  { titleKeywords: ["auto journal posting"], contributors: ["Akbar"] },
  { titleKeywords: ["memorial journal"], contributors: ["Akbar"] },
  { titleKeywords: ["audit trail"], contributors: ["Akbar"] },
  { titleKeywords: ["general ledger view"], contributors: ["Akbar", "Affan"] },
  { titleKeywords: ["tutup bulan"], contributors: ["Akbar"] },
  { titleKeywords: ["financial reports", "neraca"], contributors: ["Akbar", "Halim"] },

  // ADM - PM System tasks → semua dev
  { titleKeywords: ["database schema migration"], contributors: ["Akbar"] },
  { titleKeywords: ["api routes update"], contributors: ["Akbar"] },
  { titleKeywords: ["task form ui"], contributors: ["Affan", "Halim"] },
  { titleKeywords: ["qa module", "role-based testing"], contributors: ["Halim"] },
  { titleKeywords: ["seed data"], contributors: ["Akbar"] },
  { titleKeywords: ["task list", "erp role filter"], contributors: ["Affan"] },
  { titleKeywords: ["testing & verification", "end-to-end"], contributors: ["Halim", "Affan"] },
];

async function seedContributors() {
  console.log("=== SEEDING TASK CONTRIBUTORS ===\n");

  // 1. Load developers
  const devUsers = await db.select().from(users).where(eq(users.role, "developer"));
  const devMap: Record<string, string> = {}; // name.lower → id
  for (const u of devUsers) {
    devMap[u.name.toLowerCase()] = u.id;
  }
  console.log(`Found ${devUsers.length} developer(s): ${devUsers.map((u) => u.name).join(", ")}\n`);

  // 2. Load all tasks
  const allTasks = await db.select().from(tasks);
  console.log(`Found ${allTasks.length} task(s) in DB.\n`);

  let inserted = 0;
  let skipped = 0;

  for (const task of allTasks) {
    const titleLower = task.title.toLowerCase();

    // Find matching rule
    const rule = CONTRIBUTOR_RULES.find((r) =>
      r.titleKeywords.some((kw) => titleLower.includes(kw.toLowerCase()))
    );

    if (!rule) continue;

    for (let i = 0; i < rule.contributors.length; i++) {
      const devName = rule.contributors[i].toLowerCase();
      const devId = devMap[devName];

      if (!devId) {
        console.warn(`  ⚠️  Developer "${rule.contributors[i]}" not found in DB, skipping.`);
        continue;
      }

      // Check duplicate
      const existing = await db
        .select()
        .from(taskContributors)
        .where(eq(taskContributors.taskId, task.id))
        .then((rows) => rows.filter((r) => r.developerId === devId));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(taskContributors).values({
        id: randomUUID(),
        taskId: task.id,
        developerId: devId,
        individualProgress: 0,
        isCurrentActive: i === 0, // first in list = primary/active
      });

      console.log(`  ✅ [${task.epic}] "${task.title}" → ${rule.contributors[i]}${i === 0 ? " (primary)" : ""}`);
      inserted++;
    }
  }

  console.log(`\n📊 Done!`);
  console.log(`   ✅ Inserted : ${inserted} contributor record(s)`);
  console.log(`   ⏭️  Skipped  : ${skipped} (already exist)`);
}

seedContributors()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
