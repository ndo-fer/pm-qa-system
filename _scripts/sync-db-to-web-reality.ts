import { db } from "../src/db";
import { tasks, users, projects } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

async function main() {
  console.log("=== RUNNING DATABASE SYNC TO REALITY ===");

  // 1. Get the project
  const prjs = await db.select().from(projects);
  const pdjProject = prjs.find(p => p.code.toLowerCase().includes("pdj")) || prjs[0];
  if (!pdjProject) {
    console.error("Project not found!");
    process.exit(1);
  }
  console.log(`Target Project: ${pdjProject.name} (ID: ${pdjProject.id})`);

  // 2. Get developers
  const devs = await db.select().from(users).where(eq(users.role, "developer"));
  const affan = devs.find(u => u.name === "Affan")!;
  const akbar = devs.find(u => u.name === "Akbar")!;

  // 3. Update existing tasks to DONE (100%)
  const tasksToDone = [
    { title: "Implementasi MasLokasi / Gudang", epic: "MST" }, // move epic to MST as it is a master catalog
    { title: "Implementasi MasYield / Elastisitas Bahan", epic: "MST" }, // move to MST
    { title: "Implementasi MasJenisBarang", epic: "MST" }, // move to MST
    { title: "Implementasi MasKelompokWarna", epic: "MST" }, // move to MST
    { title: "Implementasi User, Role & Permission", epic: "ADM" }
  ];

  for (const tInfo of tasksToDone) {
    const existing = await db.select().from(tasks).where(eq(tasks.title, tInfo.title));
    if (existing.length > 0) {
      const task = existing[0];
      await db.update(tasks).set({
        status: "done",
        progress: 100,
        epic: tInfo.epic as any, // update epic if needed (Gudang, Yield, etc. to MST)
        assigneeId: tInfo.title.includes("User") ? akbar.id : affan.id,
        startDate: task.startDate || "2026-06-01",
        dueDate: task.dueDate || "2026-06-02",
      }).where(eq(tasks.id, task.id));
      console.log(`Updated to Done: "${tInfo.title}" (Epic shifted to ${tInfo.epic})`);
    } else {
      console.log(`Task not found for update: "${tInfo.title}"`);
    }
  }

  // 4. Insert Untracked Tasks (Master Sifat, Finishing, Corak, Coating, Client, Menu & Grup Menu)
  const untracked = [
    { title: "Implementasi Master Sifat Barang Jadi", epic: "MST", assigneeId: affan.id, startDate: "2026-06-01", dueDate: "2026-06-02" },
    { title: "Implementasi Master Finishing", epic: "MST", assigneeId: affan.id, startDate: "2026-06-02", dueDate: "2026-06-03" },
    { title: "Implementasi Master Corak", epic: "MST", assigneeId: affan.id, startDate: "2026-06-03", dueDate: "2026-06-04" },
    { title: "Implementasi Master Jenis Coating", epic: "MST", assigneeId: affan.id, startDate: "2026-06-04", dueDate: "2026-06-05" },
    { title: "Implementasi Master Client", epic: "MST", assigneeId: affan.id, startDate: "2026-06-05", dueDate: "2026-06-06" },
    { title: "Implementasi Katalog Menu & Grup Menu", epic: "ADM", assigneeId: akbar.id, startDate: "2026-06-08", dueDate: "2026-06-10" },
  ];

  for (const uTask of untracked) {
    const existing = await db.select().from(tasks).where(eq(tasks.title, uTask.title));
    if (existing.length === 0) {
      await db.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId: pdjProject.id,
        title: uTask.title,
        epic: uTask.epic as any,
        status: "done",
        progress: 100,
        phase: uTask.epic === "MST" ? "Phase 1" : "Phase 2",
        assigneeId: uTask.assigneeId,
        startDate: uTask.startDate,
        dueDate: uTask.dueDate,
        description: "Task hasil sinkronisasi audit lapangan web erp.padajaya.biz.id",
      });
      console.log(`Inserted & set to Done: "${uTask.title}"`);
    } else {
      console.log(`Task already exists: "${uTask.title}"`);
    }
  }

  // 5. Update descriptions for bugged tasks (Blocker flags)
  const buggedTasks = [
    { 
      title: "Implementasi MasCustomer", 
      desc: "[BUG/BLOCKER] Halaman Katalog Pelanggan crash/blank putih total di live web."
    },
    { 
      title: "Implementasi Sales Order", 
      desc: "[BUG/BLOCKER] Tombol '+ Tambah Data' salah memanggil modal 'Tambah Pemasok' (milik modul Pembelian) di live web."
    }
  ];

  for (const bTask of buggedTasks) {
    const existing = await db.select().from(tasks).where(eq(tasks.title, bTask.title));
    if (existing.length > 0) {
      await db.update(tasks).set({
        description: bTask.desc
      }).where(eq(tasks.id, existing[0].id));
      console.log(`Added blocker note to: "${bTask.title}"`);
    }
  }

  console.log("\n=== DATABASE SYNC COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch(console.error);
