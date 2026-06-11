import { db } from "../src/db";
import { users } from "../src/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

async function seed() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const pmPassword = await bcrypt.hash("pm123", 10);
  const qaPassword = await bcrypt.hash("qa123", 10);
  const devPassword = await bcrypt.hash("dev123", 10);
  const erpAdminPassword = await bcrypt.hash("pdj123", 10);
  const erpTopUserPassword = await bcrypt.hash("123456", 10);
  const erpUserPassword = await bcrypt.hash("12345", 10);

  const defaultUsers = [
    { id: randomUUID(), name: "Admin", email: "admin@erp.local", passwordHash: adminPassword, role: "admin", phone: process.env.WA_PHONE_ADMIN || "+6281234567897" },
    { id: randomUUID(), name: "Project Manager", email: "pm@erp.local", passwordHash: pmPassword, role: "pm", phone: process.env.WA_PHONE_PM || "+6281234567895" },
    { id: randomUUID(), name: "QA Tester", email: "qa@erp.local", passwordHash: qaPassword, role: "qa", phone: process.env.WA_PHONE_QA || "+6281234567896" },
    { id: randomUUID(), name: "Developer", email: "dev@erp.local", passwordHash: devPassword, role: "developer", phone: process.env.WA_PHONE_DEV || "+6281234567890" },
    { id: randomUUID(), name: "ERP Administrator", email: "PDJService@erp.local", passwordHash: erpAdminPassword, role: "admin", phone: null },
    { id: randomUUID(), name: "ERP Top User", email: "K009@erp.local", passwordHash: erpTopUserPassword, role: "qa", phone: null },
    { id: randomUUID(), name: "ERP User", email: "K010@erp.local", passwordHash: erpUserPassword, role: "qa", phone: null },
    // New Team Members
    { id: randomUUID(), name: "Affan", email: "affan@erp.local", passwordHash: devPassword, role: "developer", phone: process.env.WA_PHONE_AFFAN || "6285177431505" },
    { id: randomUUID(), name: "Rifqi", email: "rifqi@erp.local", passwordHash: devPassword, role: "developer", phone: process.env.WA_PHONE_RIFQI || "0895704940400" },
    { id: randomUUID(), name: "Halim", email: "halim@erp.local", passwordHash: devPassword, role: "developer", phone: process.env.WA_PHONE_HALIM || "+6281234567893" },
    { id: randomUUID(), name: "Akbar", email: "akbar@erp.local", passwordHash: devPassword, role: "developer", phone: process.env.WA_PHONE_AKBAR || "+6281234567894" },
  ];

  for (const user of defaultUsers) {
    const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(user);
      console.log(`✓ Created user: ${user.email}`);
    } else {
      await db.update(users).set({ phone: user.phone }).where(eq(users.id, existing[0].id));
      console.log(`✓ Updated phone for existing user: ${user.email}`);
    }
  }

  console.log("\nSeed completed. Default users:");
  console.log("  Admin: admin@erp.local / admin123");
  console.log("  PM: pm@erp.local / pm123");
  console.log("  QA: qa@erp.local / qa123");
  console.log("  Dev: dev@erp.local / dev123");
  console.log("  ERP Admin: PDJService@erp.local / pdj123");
  console.log("  ERP Top User: K009@erp.local / 123456");
  console.log("  ERP User: K010@erp.local / 12345");
  console.log("  Affan: affan@erp.local / dev123");
  console.log("  Rifqi: rifqi@erp.local / dev123");
  console.log("  Halim: halim@erp.local / dev123");
  console.log("  Akbar: akbar@erp.local / dev123");
}

seed()
  .then(() => {
    console.log("✓ User seeding completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
