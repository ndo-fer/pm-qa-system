"""
Migration script: Import QA test cases, defects, and tasks from Excel spreadsheets
into the ERP PM System database.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import glob
from datetime import datetime
from randomUUID import uuid4

from src.db import db
from src.db.schema import projects, tasks, testPlans, testCases, users, NewProject, NewTask, NewTestPlan, NewTestCase
from drizzle-orm import eq

ERP_BASE = "F:/ERP"

MODULE_MAP = {
    "Data Induk": "Katalog Lain",
    "Pembelian": "Pemasok",
    "Gudang": "Barang",
    "Produksi": "Barang",
    "Penjualan": "Pelanggan",
    "Keuangan": "Keuangan",
    "Pengendalian": "Pengaturan",
    "Integrasi": "Katalog Lain",
    "Kinerja Sistem": "Kinerja",
}

FILE_MODULE_MAP = {
    "04_Kasus_Uji_Data_Induk.xlsx": ("Data Induk", "Katalog Lain"),
    "05_Kasus_Uji_Pembelian.xlsx": ("Pembelian", "Pemasok"),
    "06_Kasus_Uji_Gudang.xlsx": ("Gudang", "Barang"),
    "07_Kasus_Uji_Produksi.xlsx": ("Produksi", "Barang"),
    "08_Kasus_Uji_Penjualan.xlsx": ("Penjualan", "Pelanggan"),
    "09_Kasus_Uji_Keuangan.xlsx": ("Keuangan", "Keuangan"),
    "10_Kasus_Uji_Pengendalian.xlsx": ("Pengendalian", "Pengaturan"),
    "11_Kasus_Uji_Integrasi.xlsx": ("Integrasi", "Katalog Lain"),
    "12_Kasus_Uji_Kinerja_Sistem.xlsx": ("Kinerja Sistem", "Kinerja"),
}

PRIORITY_MAP = {
    "Critical": "urgent",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
}

STATUS_MAP = {
    "Active": "pending",
    "Pass": "pass",
    "Fail": "fail",
    "Blocked": "blocked",
    "Not Started": "pending",
    "In Progress": "pending",
}

def migrate():
    print("=" * 60)
    print("ERP PM System - Data Migration")
    print("=" * 60)

    # 1. Get or create ERP Migration project
    existing = db.select().from(projects).where(eq(projects.name, "ERP Migration")).execute()
    existing_list = list(existing)

    if existing_list:
        project = existing_list[0]
        print(f"[SKIP] Project 'ERP Migration' already exists (id={project.id})")
    else:
        project_id = str(uuid4())
        project_data = {
            "id": project_id,
            "name": "ERP Migration",
            "description": "Migration from SABE desktop system to web-based ERP",
            "startDate": "2026-01-01",
            "endDate": "2026-12-31",
            "status": "active",
        }
        db.insert(projects).values(project_data).execute()
        project = project_data
        print(f"[OK] Created project 'ERP Migration' (id={project_id})")

    project_id = project["id"]

    # 2. Get QA user
    qa_users = db.select().from(users).where(eq(users.role, "qa")).execute()
    qa_user_list = list(qa_users)
    qa_user_id = qa_user_list[0]["id"] if qa_user_list else None

    # 3. Import test cases from Excel files
    print("\n--- Importing Test Cases ---")
    test_case_files = glob.glob(f"{ERP_BASE}/QA/01_Kasus_Uji/*.xlsx")

    for filepath in sorted(test_case_files):
        filename = os.path.basename(filepath)
        module_info = FILE_MODULE_MAP.get(filename)
        if not module_info:
            print(f"  [SKIP] Unknown file: {filename}")
            continue

        module_name, db_module = module_info
        print(f"\n  Processing: {filename} -> {module_name}")

        df = pd.read_excel(filepath, sheet_name="Test Cases")
        print(f"    {len(df)} test cases found")

        # Create test plan for this module
        plan_id = str(uuid4())
        plan_data = {
            "id": plan_id,
            "projectId": project_id,
            "name": f"Test Cases - {module_name}",
            "module": db_module,
            "status": "active",
        }
        db.insert(testPlans).values(plan_data).execute()
        print(f"    [OK] Created test plan: {plan_data['name']}")

        # Import test cases
        case_count = 0
        for _, row in df.iterrows():
            tc_id = str(row.get("TC ID", ""))
            if not tc_id or pd.isna(tc_id):
                continue

            case_data = {
                "id": str(uuid4()),
                "testPlanId": plan_id,
                "caseNumber": str(tc_id),
                "description": str(row.get("Scenario", "")),
                "steps": str(row.get("Test Steps", "")) if pd.notna(row.get("Test Steps")) else None,
                "expectedResult": str(row.get("Expected Result", "")) if pd.notna(row.get("Expected Result")) else None,
                "status": STATUS_MAP.get(str(row.get("Status", "Active")), "pending"),
            }
            db.insert(testCases).values(case_data).execute()
            case_count += 1

        print(f"    [OK] Imported {case_count} test cases")

    # 4. Import execution log results
    print("\n--- Importing Execution Results ---")
    exec_file = f"{ERP_BASE}/QA/00_Rencana_Pelacak/02_Pelacak_Testing.xlsx"
    exec_df = pd.read_excel(exec_file, sheet_name="Execution Log")

    for _, row in exec_df.iterrows():
        tc_id = str(row.get("Test Case ID", ""))
        result = str(row.get("Result", ""))
        notes = str(row.get("Notes", "")) if pd.notna(row.get("Notes")) else None

        if not tc_id or result == "nan":
            continue

        new_status = STATUS_MAP.get(result, "pending")
        if new_status == "pending":
            continue

        # Find and update matching test cases
        all_cases = db.select().from(testCases).execute()
        for tc in all_cases:
            if tc["caseNumber"] == tc_id:
                db.update(testCases).set({
                    "status": new_status,
                    "notes": notes,
                    "executedAt": datetime.now().isoformat(),
                    "executedBy": qa_user_id,
                }).where(eq(testCases.id, tc["id"])).execute()
                print(f"  [OK] Updated {tc_id}: {new_status}")
                break

    # 5. Import defects as tasks
    print("\n--- Importing Defects as Tasks ---")
    defect_df = pd.read_excel(exec_file, sheet_name="Defect Tracker")

    for _, row in defect_df.iterrows():
        bug_id = str(row.get("Bug ID", ""))
        if not bug_id or bug_id == "nan":
            continue

        title = str(row.get("Title", ""))
        description = str(row.get("Description", ""))
        if pd.notna(row.get("Steps to Reproduce")):
            description += "\n\nSteps to Reproduce:\n" + str(row["Steps to Reproduce"])
        if pd.notna(row.get("Expected Result")):
            description += "\n\nExpected: " + str(row["Expected Result"])
        if pd.notna(row.get("Actual Result")):
            description += "\n\nActual: " + str(row["Actual Result"])

        severity = str(row.get("Severity", "Medium"))
        priority = PRIORITY_MAP.get(severity, "medium")

        status = str(row.get("Status", "Open"))
        task_status = "todo" if status == "Open" else "in_progress"

        task_data = {
            "id": str(uuid4()),
            "projectId": project_id,
            "title": f"[{bug_id}] {title}",
            "description": description,
            "status": task_status,
            "priority": priority,
        }
        db.insert(tasks).values(task_data).execute()
        print(f"  [OK] Created task: {bug_id} - {title}")

    # 6. Create milestone tasks from SRD modules
    print("\n--- Creating Milestone Tasks ---")
    milestones = [
        ("Setup infrastruktur dan database", "high", "todo"),
        ("Implementasi Data Induk (Master Data)", "high", "todo"),
        ("Implementasi Modul Pembelian (Procurement)", "high", "todo"),
        ("Implementasi Modul Gudang (Inventory)", "high", "todo"),
        ("Implementasi Modul Produksi", "high", "todo"),
        ("Implementasi Modul Penjualan (Sales)", "high", "todo"),
        ("Implementasi Modul Keuangan & Akuntansi", "high", "todo"),
        ("Implementasi Modul Pengendalian & Laporan", "medium", "todo"),
        ("Integrasi antar modul", "high", "todo"),
        ("Testing kinerja sistem", "medium", "todo"),
        ("User Acceptance Testing (UAT)", "high", "todo"),
        ("Deployment dan training user", "high", "todo"),
    ]

    for title, priority, status in milestones:
        task_data = {
            "id": str(uuid4()),
            "projectId": project_id,
            "title": title,
            "description": f"Milestone: {title}",
            "status": status,
            "priority": priority,
        }
        db.insert(tasks).values(task_data).execute()
        print(f"  [OK] Created milestone: {title}")

    print("\n" + "=" * 60)
    print("Migration completed!")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
