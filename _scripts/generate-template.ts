import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

async function generateTemplate() {
  console.log("Generating project import template...");
  
  const wb = XLSX.utils.book_new();

  // 1. Milestone Plan Sheet
  const milestoneCols = [
    {
      "Phase": "Phase 1",
      "Modul": "MST",
      "Milestone": "Setup Master Data Foundation",
      "Start Date": "2026-06-01",
      "End Date": "2026-06-07",
      "Planned Weight %": "5.0",
      "Dependency": "",
      "Exit Criteria": "Database schema for Master Data ready"
    }
  ];
  const wsMilestones = XLSX.utils.json_to_sheet(milestoneCols);
  XLSX.utils.book_append_sheet(wb, wsMilestones, "Milestone Plan");

  // 2. S-Curve Data Sheet
  const sCurveCols = [
    {
      "Week": 1,
      "Week Start": "2026-06-01",
      "Week End": "2026-06-07",
      "Planned Cumulative %": 5.0,
      "Target Milestone": "Setup Master Data Foundation"
    }
  ];
  const wsSCurve = XLSX.utils.json_to_sheet(sCurveCols);
  XLSX.utils.book_append_sheet(wb, wsSCurve, "S-Curve Data");

  // 3. Developer Task Board Sheet
  const taskCols = [
    {
      "Task ID": "TSK-MST-001",
      "Epic / Modul": "MST",
      "Feature": "User Management",
      "Task Name": "Implement User Registration",
      "Deskripsi Task": "Build the user signup flow and input validations",
      "Priority": "Medium",
      "Ref 3.2": "SRD-3.2.1",
      "Ref 4 / FR Code": "FR-ADM-01",
      "Acceptance Criteria Checklist": "- Fields email, password, role are required\n- Password hashed",
      "Blocker": "",
      "Sprint Target": "Sprint 1",
      "Notes": "Verify next-auth compatibility",
      "Tipe Task": "Development"
    }
  ];
  const wsTasks = XLSX.utils.json_to_sheet(taskCols);
  XLSX.utils.book_append_sheet(wb, wsTasks, "Developer Task Board");

  // 4. QA Test Cases Sheet
  const qaCols = [
    {
      "TC ID": "TC-MST-001",
      "Module": "MST",
      "Scenario": "User Signup with duplicate email",
      "Test Steps": "1. Go to signup page\n2. Fill already registered email\n3. Click Signup",
      "Expected Result": "System shows validation error 'Email already registered'",
      "Status": "Active",
      "ERP Role": "administrator"
    }
  ];
  const wsQa = XLSX.utils.json_to_sheet(qaCols);
  XLSX.utils.book_append_sheet(wb, wsQa, "QA Test Cases");

  // Write to public/templates
  const destDir = path.join(process.cwd(), "public", "templates");
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const destPath = path.join(destDir, "project_import_template.xlsx");
  XLSX.writeFile(wb, destPath);

  console.log(`Template generated successfully at: ${destPath}`);
}

generateTemplate().catch(console.error);
