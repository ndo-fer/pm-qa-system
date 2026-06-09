import { db } from "../src/db";
import { tasks, projects } from "../src/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

interface TaskSeed {
  title: string;
  description: string;
  epic: string;
  erpRole: string;
  phase: string;
  priority: string;
  feature?: string;
  taskType?: string;
  roleSpecificFeatures?: any;
}

async function seedTasks() {
  console.log(" Starting task seeding...\n");

  // Get first project
  const projectList = await db.select().from(projects).limit(1);
  if (projectList.length === 0) {
    console.log("❌ No projects found. Please create a project first.");
    return;
  }
  const projectId = projectList[0].id;
  console.log(`📁 Using project: ${projectList[0].name} (${projectId})\n`);

  const taskSeeds: TaskSeed[] = [
    // ============================================
    // SET A: PM SYSTEM IMPLEMENTATION TASKS
    // ============================================
    {
      title: "Database Schema Migration - Add ERP Role Fields",
      description: "Add erpRole, roleSpecificFeatures to tasks table. Add erpRole, testType, loginCredentials to test_cases table. Create migration script and execute.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 1",
      priority: "high",
      feature: "Schema Migration",
      taskType: "Database",
      roleSpecificFeatures: {
        administrator: { features: ["Execute Migration", "View Schema"], description: "Full access" },
        top_user: { features: ["View Schema"], description: "Read-only" },
        user: { features: ["View Schema"], description: "Read-only" }
      }
    },
    {
      title: "API Routes Update - Tasks & Test Cases Endpoints",
      description: "Update GET/POST/PUT endpoints for /api/tasks and /api/test-cases to support erpRole filtering and new fields. Add erpRole query parameter support.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 2",
      priority: "high",
      feature: "API Enhancement",
      taskType: "Backend",
      roleSpecificFeatures: {
        administrator: { features: ["All API Access"], description: "Full access" },
        top_user: { features: ["Read API"], description: "Limited access" },
        user: { features: ["Read API"], description: "Limited access" }
      }
    },
    {
      title: "Task Form UI - ERP Role Context Section",
      description: "Add ERP Role selector (Administrator/Top User/User/All Roles) to task form. Add JSON editor for role-specific features. Add helper text per role.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 3",
      priority: "high",
      feature: "Task Form Enhancement",
      taskType: "Frontend",
      roleSpecificFeatures: {
        administrator: { features: ["Create/Edit Tasks", "Set ERP Role"], description: "Full access" },
        top_user: { features: ["Create/Edit Own Tasks"], description: "Limited access" },
        user: { features: ["View Tasks"], description: "Read-only" }
      }
    },
    {
      title: "QA Module - Role-Based Testing Enhancement",
      description: "Add ERP Role selector to test case creation. Add Test Type selector (Functional/Permission/Workflow/Matrix). Add auto-fill credentials helper. Add role badges and filters.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 4",
      priority: "high",
      feature: "QA Enhancement",
      taskType: "Frontend",
      roleSpecificFeatures: {
        administrator: { features: ["Create Test Plans", "Execute Tests", "View All Results"], description: "Full access" },
        top_user: { features: ["Execute Tests", "View Own Results"], description: "Limited access" },
        user: { features: ["View Test Results"], description: "Read-only" }
      }
    },
    {
      title: "Seed Data - Add ERP Test Accounts",
      description: "Add 3 ERP test accounts: Administrator (PDJService/pdj123), Top User (K009/123456), User (K010/12345). Update seed script with idempotent logic.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 5",
      priority: "medium",
      feature: "Seed Data",
      taskType: "Database",
      roleSpecificFeatures: {
        administrator: { features: ["Execute Seed", "Manage Users"], description: "Full access" },
        top_user: { features: ["View Users"], description: "Read-only" },
        user: { features: ["View Users"], description: "Read-only" }
      }
    },
    {
      title: "Task List - ERP Role Filter Enhancement",
      description: "Add ERP Role filter dropdown to task list page. Update fetch logic to support erpRole query parameter. Add useEffect to refetch on filter change.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 6",
      priority: "medium",
      feature: "Task List Filter",
      taskType: "Frontend",
      roleSpecificFeatures: {
        administrator: { features: ["Filter by All Roles", "View All Tasks"], description: "Full access" },
        top_user: { features: ["Filter by Own Role"], description: "Limited access" },
        user: { features: ["Filter by Own Role"], description: "Limited access" }
      }
    },
    {
      title: "Testing & Verification - End-to-End Testing",
      description: "Test task creation with ERP role. Test task filtering by ERP role. Test test case creation with role credentials. Test matrix test case execution. Verify seed data.",
      epic: "ADM",
      erpRole: "all_roles",
      phase: "Phase 7",
      priority: "high",
      feature: "Testing",
      taskType: "QA",
      roleSpecificFeatures: {
        administrator: { features: ["Execute All Tests", "View Reports"], description: "Full access" },
        top_user: { features: ["Execute Tests", "View Own Reports"], description: "Limited access" },
        user: { features: ["View Reports"], description: "Read-only" }
      }
    },

    // ============================================
    // SET B: ERP MODULE DEVELOPMENT TASKS
    // ============================================

    // --- MASTER DATA (MST) ---
    {
      title: "Master Supplier CRUD Module",
      description: "Create CRUD interface for MasSupplier table. Include fields: Kode, Nama, Alamat, Telepon, Email, NPWP, Status. Add validation and search functionality.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 1",
      priority: "high",
      feature: "Master Supplier",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "View All"], description: "Full CRUD access" },
        top_user: { features: ["View", "Search"], description: "Read-only access" },
        user: { features: ["View"], description: "Read-only access" }
      }
    },
    {
      title: "Master Nomor Seri Pajak CRUD",
      description: "Create CRUD for MasNomorSeriPajak. Fields: Kode, Nomor Seri, Jenis Pajak (PPN/PPh), Status (Aktif/Nonaktif), Tanggal Terbit. Validation for duplicate numbers.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 1",
      priority: "high",
      feature: "Master Tax Series",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Activate/Deactivate"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Salesman & Komisi CRUD",
      description: "Create CRUD for MasSalesman with komisi rules. Fields: Kode, Nama, Area, Target, Komisi (%), Status. Link to MasArea master data.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 1",
      priority: "high",
      feature: "Master Salesman",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Set Komisi"], description: "Full access" },
        top_user: { features: ["View Own Data"], description: "Limited access" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Harga Produk CRUD",
      description: "Create pricing master data. Fields: Kode Produk, Harga Dasar, Harga Customer, Harga Area, Diskon, Berlaku Dari, Berlaku Sampai. Support multiple price tiers.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 1",
      priority: "high",
      feature: "Master Pricing",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Approve Price"], description: "Full access" },
        top_user: { features: ["View Prices", "Request Price Change"], description: "Limited access" },
        user: { features: ["View Prices"], description: "Read-only" }
      }
    },
    {
      title: "Master BOM (Bill of Material) CRUD",
      description: "Create BOM management module. Fields: Kode BOM, Nama, Versi, Status. BOM Detail: Bahan Baku, Quantity, Satuan, Urutan Proses. Support multiple BOM versions.",
      epic: "MST",
      erpRole: "all_roles",
      phase: "Phase 2",
      priority: "high",
      feature: "Master BOM",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Approve BOM"], description: "Full access" },
        top_user: { features: ["View BOM", "Request Changes"], description: "Limited access" },
        user: { features: ["View BOM"], description: "Read-only" }
      }
    },
    {
      title: "Master Chart of Accounts (COA) CRUD",
      description: "Create COA management. Fields: Kode Akun, Nama Akun, Tipe (Asset/Liability/Equity/Revenue/Expense), Parent Akun, Normal Balance (Debit/Kredit), Status.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 2",
      priority: "high",
      feature: "Master COA",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Account Mapping CRUD",
      description: "Create auto-mapping rules for transactions to journal entries. Fields: Transaksi Type, Debit Akun, Kredit Akun, Kondisi, Prioritas. Support conditional mapping.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 2",
      priority: "high",
      feature: "Master Account Mapping",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Test Mapping"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Rekening Bank CRUD",
      description: "Create bank account master data. Fields: Kode Bank, Nama Bank, Nomor Rekening, Nama Pemilik, Mata Uang, Status. Link to Company Code.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 1",
      priority: "high",
      feature: "Master Bank Account",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Inventaris & Penyusutan CRUD",
      description: "Create fixed asset master data. Fields: Kode Aset, Nama Aset, Kategori, Nilai Perolehan, Umur Ekonomis, Metode Penyusutan, Tanggal Perolehan, Lokasi, Status.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 2",
      priority: "medium",
      feature: "Master Fixed Assets",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Calculate Depreciation"], description: "Full access" },
        top_user: { features: ["View", "Request Transfer"], description: "Limited access" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Payment Terms CRUD",
      description: "Create payment terms master. Fields: Kode, Nama (TOP 30/TOP 60/dll), Hari Jatuh Tempo, Diskon Early Payment, Status. Used in PO and SO.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 1",
      priority: "medium",
      feature: "Master Payment Terms",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Work Center CRUD",
      description: "Create work center master for production. Fields: Kode, Nama (Mesin Potong/Rakit/Cat), Kapasitas, Operator, Status, Lokasi. Link to MasMesin.",
      epic: "MST",
      erpRole: "administrator",
      phase: "Phase 2",
      priority: "medium",
      feature: "Master Work Center",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "Assign Operator"], description: "Full access" },
        top_user: { features: ["View", "Update Status"], description: "Limited access" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Master Kategori & Satuan Produk",
      description: "Create product category and unit of measure master. Fields: Kode Kategori, Nama, Tipe (RM/FG/LAIN). Satuan: Kode, Nama, Konversi. Support multiple UOM conversions.",
      epic: "MST",
      erpRole: "all_roles",
      phase: "Phase 1",
      priority: "high",
      feature: "Master Category & UOM",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },

    // --- PROCUREMENT (PUR) ---
    {
      title: "Purchase Requisition (PR) Module",
      description: "Create PR module for department requisitions. Fields: No PR, Tanggal, Departemen, Requestor, Items (Produk, Qty, Estimasi Harga), Status (Draft/Submitted/Approved/Rejected). Workflow: Draft → Submit → Approve → PO.",
      epic: "PUR",
      erpRole: "all_roles",
      phase: "Phase 2",
      priority: "high",
      feature: "Purchase Requisition",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "Delete", "View All"], description: "Full access with approval" },
        top_user: { features: ["Create", "Edit Own", "Submit", "View Own"], description: "Can create and submit" },
        user: { features: ["Create", "View Own"], description: "Can create requisitions" }
      }
    },
    {
      title: "RFQ & Quotation Module",
      description: "Create RFQ (Request for Quotation) and Quotation management. RFQ: No RFQ, Supplier, Items, Deadline. Quotation: No Quotation, RFQ Ref, Supplier, Harga, Terms, Status. Compare multiple quotations.",
      epic: "PUR",
      erpRole: "top_user",
      phase: "Phase 2",
      priority: "high",
      feature: "RFQ & Quotation",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create RFQ", "View All Quotes", "Select Winner", "Approve"], description: "Full control" },
        top_user: { features: ["Create RFQ", "Input Quotations", "Compare Quotes"], description: "Purchasing access" },
        user: { features: ["View RFQ Status"], description: "Read-only" }
      }
    },
    {
      title: "Purchase Order (PO) Module",
      description: "Create PO module. Fields: No PO, Supplier, Tanggal, Payment Terms, Items (Produk, Qty, Harga, Total), Status (Draft/Confirmed/Received/Closed). Auto-generate from approved PR or selected quotation.",
      epic: "PUR",
      erpRole: "all_roles",
      phase: "Phase 2",
      priority: "high",
      feature: "Purchase Order",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "Delete", "View All"], description: "Full access" },
        top_user: { features: ["Create", "Edit Own", "Submit for Approval", "View Own"], description: "Can create PO" },
        user: { features: ["View PO Status"], description: "Read-only" }
      }
    },
    {
      title: "Goods Receipt (GR) Module",
      description: "Create goods receipt module for receiving purchased items. Fields: No GR, PO Ref, Tanggal, Supplier, Items (Produk, Qty Ordered, Qty Received, Qty Reject), Status. Auto-update stock on receipt.",
      epic: "PUR",
      erpRole: "user",
      phase: "Phase 3",
      priority: "high",
      feature: "Goods Receipt",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["Create", "Edit", "View"], description: "Can receive goods" },
        user: { features: ["Create", "View Own"], description: "Warehouse staff access" }
      }
    },
    {
      title: "Tax Invoice Purchase Module",
      description: "Create tax invoice recording for purchases. Fields: No Faktur Pajak, No GR/PO Ref, Supplier, NPWP Supplier, DPP, PPN, PPh, Total. Link to MasNomorSeriPajak. Auto-calculate tax amounts.",
      epic: "PUR",
      erpRole: "administrator",
      phase: "Phase 3",
      priority: "high",
      feature: "Tax Invoice Purchase",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Delete", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Account Payable (AP) Module",
      description: "Create AP module for supplier debt tracking. Auto-generated from Goods Receipt. Fields: No AP, Supplier, No PO/GR, Amount, Due Date, Status (Open/Partial/Paid), Payment History. Aging report.",
      epic: "AP",
      erpRole: "administrator",
      phase: "Phase 3",
      priority: "high",
      feature: "Account Payable",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Process Payment", "View Aging"], description: "Full access" },
        top_user: { features: ["View Own AP"], description: "Limited access" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Purchase Return Module",
      description: "Create purchase return module for defective items. Fields: No Retur, GR Ref, Supplier, Items (Produk, Qty Return, Alasan), Status. Auto-decrease stock and adjust AP balance.",
      epic: "PUR",
      erpRole: "all_roles",
      phase: "Phase 4",
      priority: "medium",
      feature: "Purchase Return",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["Create", "View"], description: "Can create returns" },
        user: { features: ["Create", "View Own"], description: "Warehouse access" }
      }
    },

    // --- SALES (SLS) ---
    {
      title: "Konfirmasi Order (KO) Module",
      description: "Create KO module for customer order confirmation. Fields: No KO, Customer, Salesman, Tanggal, Items (Produk, Qty, Harga, Diskon), Status (Draft/Confirmed/Converted). Simulasi SO feature for stock check.",
      epic: "SLS",
      erpRole: "top_user",
      phase: "Phase 2",
      priority: "high",
      feature: "Konfirmasi Order",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["Create", "Edit Own", "Simulasi SO", "View Own"], description: "Sales access" },
        user: { features: ["View KO Status"], description: "Read-only" }
      }
    },
    {
      title: "Sales Order (SO) Module",
      description: "Create SO module from confirmed KO. Fields: No SO, KO Ref, Customer, Tanggal Kirim, Items, Status (Outstanding/Partial/Delivered/Closed). Auto-check stock availability. Update Tanggal Kirim feature.",
      epic: "SLS",
      erpRole: "all_roles",
      phase: "Phase 2",
      priority: "high",
      feature: "Sales Order",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["Create", "Edit Own", "Update Tanggal Kirim", "View Own"], description: "Sales access" },
        user: { features: ["View SO Status"], description: "Read-only" }
      }
    },
    {
      title: "Surat Jalan (SJ) Module",
      description: "Create delivery note module. Fields: No SJ, SO Ref, Tanggal, Customer, Ekspedisi, Rute, Items (Produk, Qty), Catatan Surat Jalan, Status (Draft/Printed/Delivered). Print SJ feature.",
      epic: "SLS",
      erpRole: "user",
      phase: "Phase 3",
      priority: "high",
      feature: "Surat Jalan",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "Edit", "Print SJ"], description: "Warehouse access" }
      }
    },
    {
      title: "Sales Invoice & Faktur Pajak Module",
      description: "Create sales invoice module. Fields: No Invoice, SJ Ref, Customer, Tanggal, Items, DPP, PPN, Total. Auto-generate Faktur Pajak. Auto-decrease stock and create AR. Link to MasNomorSeriPajak.",
      epic: "SLS",
      erpRole: "all_roles",
      phase: "Phase 3",
      priority: "high",
      feature: "Sales Invoice",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "View Own"], description: "Finance access" }
      }
    },
    {
      title: "Sales Return Module",
      description: "Create sales return module for customer claims. Fields: No Retur, Invoice Ref, Customer, Items (Produk, Qty Return, Alasan), Status. Auto-increase stock and adjust AR balance.",
      epic: "SLS",
      erpRole: "all_roles",
      phase: "Phase 4",
      priority: "medium",
      feature: "Sales Return",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["Create", "View"], description: "Can create returns" },
        user: { features: ["Create", "View Own"], description: "Warehouse access" }
      }
    },

    // --- PRODUCTION (PRD) ---
    {
      title: "Planning Schedule Produksi Harian",
      description: "Create daily production planning module. Fields: No Planning, Tanggal, Target SO, Buffer Stock, Items (Produk, Target Qty), Status (Planned/Approved/Executing). PPIC interface.",
      epic: "PRD",
      erpRole: "administrator",
      phase: "Phase 3",
      priority: "high",
      feature: "Production Planning",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "View All"], description: "PPIC access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "SPK (Surat Perintah Kerja) Module",
      description: "Create SPK generation from planning. Fields: No SPK, Planning Ref, Tanggal, Items (Produk, Target Qty, Deadline), Status (Draft/Approved/Executing/Completed). Auto-generate from approved planning.",
      epic: "PRD",
      erpRole: "all_roles",
      phase: "Phase 3",
      priority: "high",
      feature: "SPK",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View", "Update Progress"], description: "Production access" }
      }
    },
    {
      title: "SPK Checker (Approval) Module",
      description: "Create SPK approval interface for supervisors. Fields: No SPK, Checker, Tanggal Check, Status (Pending/Approved/Rejected), Catatan. Workflow: SPK Created → Checker Review → Approved/Rejected.",
      epic: "PRD",
      erpRole: "administrator",
      phase: "Phase 3",
      priority: "high",
      feature: "SPK Checker",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Approve", "Reject", "View All"], description: "Supervisor access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "BOM Explode Logic",
      description: "Implement BOM explosion calculation. Input: SPK Target Qty. Process: Multiply BOM recipe by target qty. Output: Material requirements list (Bahan Baku, Qty Needed, Stock Available, Shortage).",
      epic: "PRD",
      erpRole: "all_roles",
      phase: "Phase 3",
      priority: "high",
      feature: "BOM Explode",
      taskType: "Backend",
      roleSpecificFeatures: {
        administrator: { features: ["Trigger Explode", "View Results"], description: "Full access" },
        top_user: { features: ["View Results"], description: "Read-only" },
        user: { features: ["View Results"], description: "Read-only" }
      }
    },
    {
      title: "Work Center Log Module",
      description: "Create work center execution logging. Fields: No Log, SPK Ref, Work Center (Mesin), Operator, Tanggal, Start Time, End Time, Qty Produced, Status. Track production progress per machine.",
      epic: "PRD",
      erpRole: "user",
      phase: "Phase 4",
      priority: "medium",
      feature: "Work Center Log",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Edit"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "Edit Own"], description: "Operator access" }
      }
    },
    {
      title: "Quality Control (QC) Module",
      description: "Create QC inspection module. Fields: No QC, SPK Ref, Produk, Inspector, Tanggal, Checklist (from MasChecker), Hasil (Pass/Fail), Catatan, Status. Link to MasChecker master data.",
      epic: "PRD",
      erpRole: "user",
      phase: "Phase 4",
      priority: "high",
      feature: "Quality Control",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Approve QC"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "Edit Own"], description: "QC inspector access" }
      }
    },
    {
      title: "Hasil Produksi & Pakai Bahan Module",
      description: "Create production result recording. Fields: No Hasil, SPK Ref, Tanggal, Items (Produk Jadi, Qty Produced), Bahan Terpakai (Produk Baku, Qty Used). Auto-debit BB stock, credit BJ stock.",
      epic: "PRD",
      erpRole: "all_roles",
      phase: "Phase 4",
      priority: "high",
      feature: "Production Result",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "Edit Own"], description: "Production staff access" }
      }
    },
    {
      title: "Packing Production Module",
      description: "Create final packaging recording. Fields: No Packing, Hasil Produksi Ref, Tanggal, Items (Produk, Qty Packed), Packaging Type, Status. Final step before goods become available.",
      epic: "PRD",
      erpRole: "user",
      phase: "Phase 4",
      priority: "medium",
      feature: "Packing Production",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "Edit Own"], description: "Packing staff access" }
      }
    },
    {
      title: "BOP Usage (Biaya Overhead Pabrik) Module",
      description: "Create BOP recording for production overhead costs. Fields: No BOP, SPK Ref, Tanggal, Items (Barang Lain, Qty, Harga), Total Biaya, Status. Track consumables used in production.",
      epic: "PRD",
      erpRole: "administrator",
      phase: "Phase 4",
      priority: "medium",
      feature: "BOP Usage",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "View Own"], description: "Production access" }
      }
    },

    // --- INVENTORY (INV) ---
    {
      title: "Stock Card View",
      description: "Create stock card report view. Fields: Produk, Tanggal, Transaksi Ref, Masuk, Keluar, Saldo. Filter by produk, tanggal, gudang. Show running balance. Export to PDF/Excel.",
      epic: "INV",
      erpRole: "all_roles",
      phase: "Phase 3",
      priority: "medium",
      feature: "Stock Card",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Export"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Stock Position View",
      description: "Create real-time stock position view. Fields: Produk, Gudang, Qty Available, Qty Reserved, Qty On-Order, Qty Minimum, Status (Safe/Low/Critical). Auto-calculate from transactions.",
      epic: "INV",
      erpRole: "all_roles",
      phase: "Phase 3",
      priority: "medium",
      feature: "Stock Position",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Export"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Mutasi Barang / DO / Konsinyasi Module",
      description: "Create internal stock transfer module. Fields: No Mutasi, Tanggal, Dari Gudang, Ke Gudang, Items (Produk, Qty), Jenis (Mutasi/DO/Konsinyasi), Status. Auto-adjust stock per location.",
      epic: "INV",
      erpRole: "user",
      phase: "Phase 3",
      priority: "high",
      feature: "Mutasi Barang",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Create", "View Own"], description: "Warehouse access" }
      }
    },
    {
      title: "Stock Correction Module",
      description: "Create stock adjustment module for discrepancies. Fields: No Koreksi, Tanggal, Gudang, Items (Produk, Qty Sistem, Qty Fisik, Selisih, Alasan), Status. Auto-adjust stock with audit trail.",
      epic: "INV",
      erpRole: "administrator",
      phase: "Phase 4",
      priority: "medium",
      feature: "Stock Correction",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Approve", "View All"], description: "Full access" },
        top_user: { features: ["Request Correction"], description: "Can request" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Stock Opname Module",
      description: "Create periodic stock audit module. Fields: No Opname, Tanggal, Gudang, Items (Produk, Qty Sistem, Qty Fisik, Selisih, Status), Overall Status (In Progress/Completed). Support BB, BJ, Barang Lain.",
      epic: "INV",
      erpRole: "all_roles",
      phase: "Phase 4",
      priority: "high",
      feature: "Stock Opname",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Complete", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["Input Count", "View"], description: "Warehouse access" }
      }
    },

    // --- FINANCE (FIN/AP/AR) ---
    {
      title: "Pelunasan Piutang (AR Payment) Module",
      description: "Create AR payment module for customer payments. Fields: No Payment, Customer, Invoice Ref, Tanggal, Amount, Payment Method (Cash/Transfer/Giro), Status. Auto-close invoice and increase Kas/Bank.",
      epic: "AR",
      erpRole: "administrator",
      phase: "Phase 4",
      priority: "high",
      feature: "AR Payment",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Pelunasan Hutang (AP Payment) Module",
      description: "Create AP payment module for supplier payments. Fields: No Payment, Supplier, AP Ref, Tanggal, Amount, Payment Method, Status. Auto-close AP and decrease Kas/Bank.",
      epic: "AP",
      erpRole: "administrator",
      phase: "Phase 4",
      priority: "high",
      feature: "AP Payment",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Giro Transaction Module",
      description: "Create giro/cek management. Fields: No Giro, Tanggal, Bank, Nomor Giro, Amount, Status (Issued/Cleared/Bounced), Rincian Uang Muka. Track kliring status.",
      epic: "FIN",
      erpRole: "administrator",
      phase: "Phase 4",
      priority: "medium",
      feature: "Giro Transaction",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Kas/Bank Transaction Module",
      description: "Create direct cash/bank transaction module. Fields: No Transaksi, Tanggal, Jenis (Penerimaan/Pengeluaran), Akun, Amount, Keterangan, Status. For operational expenses not linked to AP/AR.",
      epic: "FIN",
      erpRole: "administrator",
      phase: "Phase 4",
      priority: "medium",
      feature: "Kas/Bank",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },

    // --- GENERAL LEDGER (GL) ---
    {
      title: "Auto Journal Posting Engine",
      description: "Implement automatic journal posting from transactions. Trigger: Invoice, Payment, Receipt, etc. Process: Lookup account mapping, generate debit/kredit entries. Output: Journal entries in trx_journal.",
      epic: "GL",
      erpRole: "all_roles",
      phase: "Phase 5",
      priority: "high",
      feature: "Auto Journal Posting",
      taskType: "Backend",
      roleSpecificFeatures: {
        administrator: { features: ["Trigger Posting", "View Journals", "Reverse"], description: "Full access" },
        top_user: { features: ["View Journals"], description: "Read-only" },
        user: { features: ["View Journals"], description: "Read-only" }
      }
    },
    {
      title: "Memorial Journal Module",
      description: "Create manual journal entry module for adjustments. Fields: No Jurnal, Tanggal, Keterangan, Entries (Akun, Debit, Kredit), Status. Validation: Debit must equal Kredit.",
      epic: "GL",
      erpRole: "administrator",
      phase: "Phase 5",
      priority: "medium",
      feature: "Memorial Journal",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Create", "Edit", "Post", "View All"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Audit Trail Module",
      description: "Create audit trail for all transaction changes. Fields: No Log, Tanggal, User, Transaksi Type, Transaksi ID, Action (Create/Update/Delete), Old Values, New Values. Auto-recorded by system.",
      epic: "GL",
      erpRole: "administrator",
      phase: "Phase 5",
      priority: "high",
      feature: "Audit Trail",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Export"], description: "Full access" },
        top_user: { features: ["View Own"], description: "Limited access" },
        user: { features: ["View Own"], description: "Limited access" }
      }
    },
    {
      title: "General Ledger View",
      description: "Create GL report view. Fields: Akun, Tanggal, Jurnal Ref, Debit, Kredit, Saldo. Filter by akun, periode. Show running balance per account. Consolidate all journals.",
      epic: "GL",
      erpRole: "administrator",
      phase: "Phase 5",
      priority: "high",
      feature: "General Ledger",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["View All", "Export"], description: "Full access" },
        top_user: { features: ["View"], description: "Read-only" },
        user: { features: ["View"], description: "Read-only" }
      }
    },
    {
      title: "Tutup Bulan (Month End Close) Module",
      description: "Create month-end closing process. Steps: Validate all transactions, Lock period, Generate closing journals, Prevent backdated changes. Fields: Periode, Status (Open/Closed), Closed By, Closed At.",
      epic: "GL",
      erpRole: "administrator",
      phase: "Phase 5",
      priority: "high",
      feature: "Month End Close",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Execute Close", "Reopen Period"], description: "Full access" },
        top_user: { features: ["View Status"], description: "Read-only" },
        user: { features: ["View Status"], description: "Read-only" }
      }
    },
    {
      title: "Financial Reports (Neraca, Rugi Laba, Arus Kas)",
      description: "Create financial statement reports. Neraca: Assets = Liabilities + Equity. Rugi Laba: Revenue - Expenses. Arus Kas: Operating/Investing/Financing. Filter by periode. Export to PDF/Excel.",
      epic: "GL",
      erpRole: "administrator",
      phase: "Phase 5",
      priority: "high",
      feature: "Financial Reports",
      taskType: "Full Stack",
      roleSpecificFeatures: {
        administrator: { features: ["Generate Reports", "Export"], description: "Full access" },
        top_user: { features: ["View Reports"], description: "Read-only" },
        user: { features: ["View Reports"], description: "Read-only" }
      }
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const seed of taskSeeds) {
    // Check if task already exists (by title)
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.title, seed.title))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏭️  Skipped: ${seed.title}`);
      skipped++;
      continue;
    }

    const newTask = {
      id: randomUUID(),
      projectId,
      title: seed.title,
      description: seed.description,
      assigneeId: null, // Empty for manual assignment
      status: "todo" as const,
      priority: seed.priority as "low" | "medium" | "high" | "urgent",
      dueDate: null,
      epic: seed.epic,
      feature: seed.feature || null,
      taskType: seed.taskType || null,
      phase: seed.phase,
      erpRole: seed.erpRole as "administrator" | "top_user" | "user" | "all_roles",
      roleSpecificFeatures: seed.roleSpecificFeatures || null,
      progress: 0,
    };

    await db.insert(tasks).values(newTask);
    console.log(`✅ Created: [${seed.epic}] ${seed.title}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created} tasks`);
  console.log(`   ️  Skipped: ${skipped} tasks (already exist)`);
  console.log(`   📝 Total: ${taskSeeds.length} tasks seeded`);
  console.log(`\n🎯 Breakdown by Epic:`);

  const epicCounts: Record<string, number> = {};
  for (const seed of taskSeeds) {
    epicCounts[seed.epic] = (epicCounts[seed.epic] || 0) + 1;
  }
  for (const [epic, count] of Object.entries(epicCounts)) {
    console.log(`   ${epic}: ${count} tasks`);
  }

  console.log(`\n🎯 Breakdown by ERP Role:`);
  const roleCounts: Record<string, number> = {};
  for (const seed of taskSeeds) {
    roleCounts[seed.erpRole] = (roleCounts[seed.erpRole] || 0) + 1;
  }
  for (const [role, count] of Object.entries(roleCounts)) {
    console.log(`   ${role}: ${count} tasks`);
  }
}

seedTasks()
  .then(() => {
    console.log("✓ Task seeding completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Task seeding failed:", err);
    process.exit(1);
  });
