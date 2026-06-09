import { db } from "@/db";
import { projects, tasks, milestones } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface SCurveDataPoint {
  week: number;
  weekStart: string;
  weekEnd: string;
  plannedCumulative: number;
  actualCumulative: number | null;
  targetMilestone: string | null;
  completedTasks: {
    id: string;
    title: string;
    phase: string;
    taskCode: string | null;
    completedAt: string;
  }[];
}

function toLocalYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function calculateSCurve(projectId: string): Promise<SCurveDataPoint[]> {
  // 1. Get project
  const projectList = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (projectList.length === 0) return [];
  const project = projectList[0];

  let sCurveTarget: any[] = [];
  if (project.sCurveTarget) {
    if (typeof project.sCurveTarget === "string") {
      try {
        sCurveTarget = JSON.parse(project.sCurveTarget);
      } catch (e) {
        console.error("Failed to parse sCurveTarget string:", e);
      }
    } else if (Array.isArray(project.sCurveTarget)) {
      sCurveTarget = project.sCurveTarget;
    }
  }
  if (sCurveTarget.length === 0) return [];

  // 2. Get milestones and tasks
  const milestoneList = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
  const taskList = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

  // Today's date for limiting actual line
  const today = new Date();

  // Create a map of phase to weight
  const phaseWeights: Record<string, number> = {};
  milestoneList.forEach((m) => {
    phaseWeights[m.phase] = parseFloat(m.plannedWeight || "0");
  });

  return sCurveTarget.map((w) => {
    const weekEnd = new Date(w.weekEnd + "T23:59:59");
    const weekStart = new Date(w.weekStart + "T00:00:00");

    // If the week hasn't started yet relative to today, actualCumulative is null
    if (weekStart > today) {
      return {
        week: w.week,
        weekStart: w.weekStart,
        weekEnd: w.weekEnd,
        plannedCumulative: w.plannedCumulative,
        actualCumulative: null,
        targetMilestone: w.targetMilestone || null,
        completedTasks: [],
      };
    }

    // Calculate progress of each phase at weekEnd
    let totalActual = 0;
    milestoneList.forEach((m) => {
      const weight = phaseWeights[m.phase] || 0;
      const phaseTasks = taskList.filter((t) => t.phase === m.phase);
      if (phaseTasks.length === 0) {
        // If no tasks are defined yet but it's passed target endDate, assume 0.0 or completed if milestone is done
        if (m.endDate && new Date(m.endDate + "T23:59:59") <= weekEnd) {
          totalActual += (m.status === "completed" ? 1.0 : 0.0) * weight;
        }
        return;
      }

      let phaseProgressSum = 0;
      phaseTasks.forEach((t) => {
        // Parse sqlite date strings properly
        // In sqlite, updatedAt might be stored as YYYY-MM-DD HH:MM:SS or ISO string.
        let taskUpdateDate = new Date();
        if (t.updatedAt) {
          // If it doesn't contain T, convert space to T for cross-browser parsing
          const dateStr = t.updatedAt.includes("T") ? t.updatedAt : t.updatedAt.replace(" ", "T");
          taskUpdateDate = new Date(dateStr);
        } else if (t.createdAt) {
          const dateStr = t.createdAt.includes("T") ? t.createdAt : t.createdAt.replace(" ", "T");
          taskUpdateDate = new Date(dateStr);
        }

        // If the task was completed or updated before/during this week
        if (taskUpdateDate <= weekEnd) {
          if (t.status === "done") {
            phaseProgressSum += 1.0;
          } else if (t.status === "review") {
            phaseProgressSum += 0.8;
          } else if (t.status === "in_progress") {
            phaseProgressSum += Math.max(t.progress || 0, 10) / 100;
          } else {
            phaseProgressSum += (t.progress || 0) / 100;
          }
        } else {
          // If task update is after weekEnd, it means at that week the task progress was 0
          phaseProgressSum += 0.0;
        }
      });

      const avgProgress = phaseProgressSum / phaseTasks.length;
      totalActual += avgProgress * weight;
    });

    // Find completed tasks during this week
    const completedTasks = taskList
      .filter((t) => {
        if (t.status !== "done") return false;
        let taskUpdateDate = new Date();
        if (t.updatedAt) {
          const dateStr = t.updatedAt.includes("T") ? t.updatedAt : t.updatedAt.replace(" ", "T");
          taskUpdateDate = new Date(dateStr);
        } else if (t.createdAt) {
          const dateStr = t.createdAt.includes("T") ? t.createdAt : t.createdAt.replace(" ", "T");
          taskUpdateDate = new Date(dateStr);
        }
        return taskUpdateDate >= weekStart && taskUpdateDate <= weekEnd;
      })
      .map((t) => {
        let taskUpdateDate = new Date();
        if (t.updatedAt) {
          const dateStr = t.updatedAt.includes("T") ? t.updatedAt : t.updatedAt.replace(" ", "T");
          taskUpdateDate = new Date(dateStr);
        } else if (t.createdAt) {
          const dateStr = t.createdAt.includes("T") ? t.createdAt : t.createdAt.replace(" ", "T");
          taskUpdateDate = new Date(dateStr);
        }
        return {
          id: t.id,
          title: t.title,
          phase: t.phase || "",
          taskCode: t.taskCode || null,
          completedAt: toLocalYMD(taskUpdateDate),
          rawDate: taskUpdateDate.getTime()
        };
      })
      .sort((a, b) => b.rawDate - a.rawDate)
      .map(({ rawDate, ...rest }) => rest);

    return {
      week: w.week,
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      plannedCumulative: w.plannedCumulative,
      actualCumulative: parseFloat(totalActual.toFixed(4)),
      targetMilestone: w.targetMilestone || null,
      completedTasks,
    };
  });
}

export interface SCurveDailyPoint {
  day: string;
  date: string;
  plannedCumulative: number;
  actualCumulative: number | null;
  completedTasks: {
    id: string;
    title: string;
    phase: string;
    taskCode: string | null;
    completedAt: string;
  }[];
}

export interface SCurveGroup {
  overall: SCurveDataPoint[];
  monthly: {
    monthName: string;
    weeks: SCurveDataPoint[];
  };
  weekly: {
    weekNumber: number;
    days: SCurveDailyPoint[];
  };
}

export async function calculateSCurveGroup(projectId: string): Promise<SCurveGroup> {
  const overall = await calculateSCurve(projectId);
  if (overall.length === 0) {
    return {
      overall: [],
      monthly: { monthName: "N/A", weeks: [] },
      weekly: { weekNumber: 0, days: [] },
    };
  }

  const today = new Date();
  const todayStr = toLocalYMD(today);

  // 1. Find the active week containing today
  let currentWeekIndex = overall.findIndex((w) => {
    return w.weekStart <= todayStr && todayStr <= w.weekEnd;
  });

  if (currentWeekIndex === -1) {
    if (overall.length > 0) {
      if (todayStr < overall[0].weekStart) {
        currentWeekIndex = 0;
      } else {
        currentWeekIndex = overall.length - 1;
      }
    }
  }

  const activeWeek = overall[currentWeekIndex];

  // 2. Monthly trace: weeks of the active month
  const activeMonthStr = activeWeek ? activeWeek.weekEnd.slice(0, 7) : todayStr.slice(0, 7);
  
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const activeDate = activeWeek ? new Date(activeWeek.weekEnd + "T00:00:00") : today;
  const monthName = MONTH_NAMES[activeDate.getMonth()] + " " + activeDate.getFullYear();

  const monthlyWeeks = overall.filter((w) => {
    return w.weekEnd.startsWith(activeMonthStr) || w.weekStart.startsWith(activeMonthStr);
  });

  // 3. Weekly trace: days of the active week
  const weeklyDays: SCurveDailyPoint[] = [];
  if (activeWeek) {
    const milestoneList = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
    const taskList = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

    const phaseWeights: Record<string, number> = {};
    milestoneList.forEach((m) => {
      phaseWeights[m.phase] = parseFloat(m.plannedWeight || "0");
    });

    const prevPlanned = currentWeekIndex > 0 ? overall[currentWeekIndex - 1].plannedCumulative : 0;
    const weekStart = new Date(activeWeek.weekStart + "T00:00:00");

    for (let j = 0; j < 7; j++) {
      const dayDate = new Date(weekStart.getTime() + j * 24 * 60 * 60 * 1000);
      const dayDateStr = toLocalYMD(dayDate);

      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayIndex = (dayDate.getDay() + 6) % 7;
      const dayName = dayNames[dayIndex];

      const plannedVal = prevPlanned + ((j + 1) / 7) * (activeWeek.plannedCumulative - prevPlanned);

      const isFuture = dayDateStr > todayStr;
      let actualVal = null;
      let dayCompletedTasks: { id: string; title: string; phase: string; taskCode: string | null; completedAt: string }[] = [];

      if (!isFuture) {
        actualVal = calculateActualProgressAtDate(dayDateStr, milestoneList, taskList, phaseWeights);

        const dayStart = new Date(dayDateStr + "T00:00:00");
        const dayEnd = new Date(dayDateStr + "T23:59:59");
        dayCompletedTasks = taskList
          .filter((t) => {
            if (t.status !== "done") return false;
            let taskUpdateDate = new Date();
            if (t.updatedAt) {
              const dateStr = t.updatedAt.includes("T") ? t.updatedAt : t.updatedAt.replace(" ", "T");
              taskUpdateDate = new Date(dateStr);
            } else if (t.createdAt) {
              const dateStr = t.createdAt.includes("T") ? t.createdAt : t.createdAt.replace(" ", "T");
              taskUpdateDate = new Date(dateStr);
            }
            return taskUpdateDate >= dayStart && taskUpdateDate <= dayEnd;
          })
          .map((t) => {
            let taskUpdateDate = new Date();
            if (t.updatedAt) {
              const dateStr = t.updatedAt.includes("T") ? t.updatedAt : t.updatedAt.replace(" ", "T");
              taskUpdateDate = new Date(dateStr);
            } else if (t.createdAt) {
              const dateStr = t.createdAt.includes("T") ? t.createdAt : t.createdAt.replace(" ", "T");
              taskUpdateDate = new Date(dateStr);
            }
            return {
              id: t.id,
              title: t.title,
              phase: t.phase || "",
              taskCode: t.taskCode || null,
              completedAt: toLocalYMD(taskUpdateDate),
              rawDate: taskUpdateDate.getTime()
            };
          })
          .sort((a, b) => b.rawDate - a.rawDate)
          .map(({ rawDate, ...rest }) => rest);
      }

      weeklyDays.push({
        day: dayName,
        date: dayDateStr.slice(5), // "MM-DD"
        plannedCumulative: parseFloat(plannedVal.toFixed(4)),
        actualCumulative: actualVal,
        completedTasks: dayCompletedTasks,
      });
    }
  }

  return {
    overall,
    monthly: {
      monthName,
      weeks: monthlyWeeks,
    },
    weekly: {
      weekNumber: activeWeek ? activeWeek.week : 0,
      days: weeklyDays,
    },
  };
}

function calculateActualProgressAtDate(
  dateStr: string,
  milestoneList: any[],
  taskList: any[],
  phaseWeights: Record<string, number>
): number {
  const cutoff = new Date(dateStr + "T23:59:59");
  let totalActual = 0;

  milestoneList.forEach((m) => {
    const weight = phaseWeights[m.phase] || 0;
    const phaseTasks = taskList.filter((t) => t.phase === m.phase);
    if (phaseTasks.length === 0) {
      if (m.endDate && new Date(m.endDate + "T23:59:59") <= cutoff) {
        totalActual += (m.status === "completed" ? 1.0 : 0.0) * weight;
      }
      return;
    }

    let phaseProgressSum = 0;
    phaseTasks.forEach((t) => {
      let taskUpdateDate = new Date();
      if (t.updatedAt) {
        const dateStr = t.updatedAt.includes("T") ? t.updatedAt : t.updatedAt.replace(" ", "T");
        taskUpdateDate = new Date(dateStr);
      } else if (t.createdAt) {
        const dateStr = t.createdAt.includes("T") ? t.createdAt : t.createdAt.replace(" ", "T");
        taskUpdateDate = new Date(dateStr);
      }

      if (taskUpdateDate <= cutoff) {
        if (t.status === "done") {
          phaseProgressSum += 1.0;
        } else if (t.status === "review") {
          phaseProgressSum += 0.8;
        } else if (t.status === "in_progress") {
          phaseProgressSum += Math.max(t.progress || 0, 10) / 100;
        } else {
          phaseProgressSum += (t.progress || 0) / 100;
        }
      }
    });

    const avgProgress = phaseProgressSum / phaseTasks.length;
    totalActual += avgProgress * weight;
  });

  return parseFloat(totalActual.toFixed(4));
}

