import { db } from "@/db";
import { milestones, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sheetsRequest } from "./sheets-client";
import { calculateSCurve } from "./s-curve";
import type { sheets_v4 } from "googleapis";

export async function syncMilestones(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  allProjects: (typeof projects.$inferSelect)[]
): Promise<void> {
  const defaultProject = allProjects[0];
  if (!defaultProject) {
    throw new Error("No projects found in database. Please create at least one project first.");
  }

  // 1. Update S-Curve Data sheet
  const sCurveData = await calculateSCurve(defaultProject.id);
  const sCurveRows = [
    [
      "Week", "Week Start", "Week End", "Planned Weekly %", "Planned Cumulative %",
      "Actual Weekly %", "Actual Cumulative %", "Variance %", "Target Milestone"
    ]
  ];

  for (let i = 0; i < sCurveData.length; i++) {
    const w = sCurveData[i];
    const rowNum = i + 2;

    const prevPlanned = i > 0 ? sCurveData[i - 1].plannedCumulative : 0;
    const plannedWeekly = parseFloat((w.plannedCumulative - prevPlanned).toFixed(4));

    let actualWeekly = 0;
    if (w.actualCumulative !== null) {
      const prevActual = i > 0 && sCurveData[i - 1].actualCumulative !== null
        ? sCurveData[i - 1].actualCumulative!
        : 0;
      actualWeekly = parseFloat((w.actualCumulative - prevActual).toFixed(4));
    }

    sCurveRows.push([
      String(w.week),
      w.weekStart,
      w.weekEnd,
      String(plannedWeekly),
      `=SUM($D$2:D${rowNum})`,
      w.actualCumulative !== null ? String(actualWeekly) : "",
      w.actualCumulative !== null ? `=SUM($F$2:F${rowNum})` : "",
      w.actualCumulative !== null ? `=G${rowNum}-E${rowNum}` : "",
      w.targetMilestone || ""
    ]);
  }

  await sheetsRequest(() => sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `S-Curve Data!A1:I${sCurveRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: sCurveRows
    }
  }));

  const sCurveMeta = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "S-Curve Data!A:A"
  });
  const oldSCurveCount = sCurveMeta.data.values?.length || 0;
  if (oldSCurveCount > sCurveRows.length) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `S-Curve Data!A${sCurveRows.length + 1}:I${oldSCurveCount}`
    });
  }

  // 2. Update Milestone Plan sheet
  const dbMilestones = await db.select().from(milestones).where(eq(milestones.projectId, defaultProject.id));
  const msResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Plan!A:I"
  });
  const msRows = msResponse.data.values || [];
  const msHeaders = msRows[0] || [];
  const msDataRows = msRows.slice(1);

  const msByPhase: Record<string, typeof dbMilestones[0]> = {};
  dbMilestones.forEach(m => {
    msByPhase[m.phase] = m;
  });

  const updatedMsRows = [msHeaders];
  for (let idx = 0; idx < msDataRows.length; idx++) {
    const row = [...msDataRows[idx]];
    const phase = row[0]?.trim();

    if (phase && phase.startsWith("Phase")) {
      const dbMs = msByPhase[phase];
      if (dbMs) {
        row[3] = dbMs.startDate || "";
        row[4] = dbMs.endDate || "";
        row[8] = dbMs.status || "Planned";
      }
    }
    updatedMsRows.push(row);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Milestone Plan!A1:I${updatedMsRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: updatedMsRows
    }
  });
}
