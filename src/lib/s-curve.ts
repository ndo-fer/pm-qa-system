import { db } from "@/db";
import { projects, tasks, milestones, Milestone, Task, taskContributors } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface SCurveTargetPoint {
  week: number;
  weekStart: string;
  weekEnd: string;
  plannedCumulative: number;
  targetMilestone?: string | null;
}

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
  // Developer-specific properties
  devPlannedCumulative?: number;
  devActualCumulative?: number | null;
  devRelativePlannedCumulative?: number;
  devRelativeActualCumulative?: number | null;
}

function toLocalYMD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDbDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  let normalized = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
  if (!normalized.endsWith("Z") && !normalized.includes("+") && !/-\d{2}:\d{2}$/.test(normalized)) {
    normalized += "Z";
  }
  return new Date(normalized);
}

export async function calculateSCurve(projectId: string, developerId?: string): Promise<SCurveDataPoint[]> {
  // 1. Get project
  const projectList = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (projectList.length === 0) return [];
  const project = projectList[0];

  let sCurveTarget: SCurveTargetPoint[] = [];
  if (project.sCurveTarget) {
    if (typeof project.sCurveTarget === "string") {
      try {
        sCurveTarget = JSON.parse(project.sCurveTarget) as SCurveTargetPoint[];
      } catch (e) {
        console.error("Failed to parse sCurveTarget string:", e);
      }
    } else if (Array.isArray(project.sCurveTarget)) {
      sCurveTarget = project.sCurveTarget as SCurveTargetPoint[];
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

  // Group tasks by phase to optimize lookup performance
  const tasksByPhase: Record<string, Task[]> = {};
  taskList.forEach((t) => {
    if (t.phase) {
      if (!tasksByPhase[t.phase]) {
        tasksByPhase[t.phase] = [];
      }
      tasksByPhase[t.phase].push(t);
    }
  });

  // 3. If developerId is specified, fetch contributor relations and calculate their weights
  let developerTotalWeight = 0;
  const devTasksSet = new Set<string>();
  const contributorProgressMap = new Map<string, number>();

  if (developerId) {
    const contribs = await db
      .select()
      .from(taskContributors)
      .where(eq(taskContributors.developerId, developerId));
    
    contribs.forEach((c) => {
      devTasksSet.add(c.taskId);
      contributorProgressMap.set(c.taskId, c.individualProgress);
    });

    taskList.forEach((t) => {
      if (t.assigneeId === developerId) {
        devTasksSet.add(t.id);
      }
    });

    // Calculate total weight assigned to this developer across the project
    milestoneList.forEach((m) => {
      const weight = phaseWeights[m.phase] || 0;
      const phaseTasks = tasksByPhase[m.phase] || [];
      if (phaseTasks.length > 0) {
        const devPhaseTasksCount = phaseTasks.filter((t) => devTasksSet.has(t.id)).length;
        developerTotalWeight += (devPhaseTasksCount / phaseTasks.length) * weight;
      }
    });
  }

  const parseMilestoneDate = (dStr: string | null | undefined): Date | null => {
    if (!dStr) return null;
    return new Date(dStr + "T00:00:00Z");
  };

  return sCurveTarget.map((w) => {
    const weekEnd = new Date(w.weekEnd + "T23:59:59Z");
    const weekStart = new Date(w.weekStart + "T00:00:00Z");

    // Project progress calculations
    let totalActual = 0;
    milestoneList.forEach((m) => {
      const weight = phaseWeights[m.phase] || 0;
      const phaseTasks = tasksByPhase[m.phase] || [];
      if (phaseTasks.length === 0) {
        if (m.endDate && new Date(m.endDate + "T23:59:59Z") <= weekEnd) {
          totalActual += (m.status === "completed" ? 1.0 : 0.0) * weight;
        }
        return;
      }

      let phaseProgressSum = 0;
      phaseTasks.forEach((t) => {
        const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);

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
          phaseProgressSum += 0.0;
        }
      });

      const avgProgress = phaseProgressSum / phaseTasks.length;
      totalActual += avgProgress * weight;
    });

    // Developer progress calculations
    let devRelativeActual = 0;
    let devRelativePlanned = 0;

    if (developerId) {
      milestoneList.forEach((m) => {
        const weight = phaseWeights[m.phase] || 0;
        const phaseTasks = tasksByPhase[m.phase] || [];
        if (phaseTasks.length === 0) return;

        const devPhaseTasks = phaseTasks.filter((t) => devTasksSet.has(t.id));
        const devPhaseTasksCount = devPhaseTasks.length;
        if (devPhaseTasksCount === 0) return;

        // 1. Calculate Actual Progress
        let devProgressSum = 0;
        devPhaseTasks.forEach((t) => {
          const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);
          if (taskUpdateDate <= weekEnd) {
            if (t.assigneeId === developerId) {
              if (t.status === "done") {
                devProgressSum += 1.0;
              } else if (t.status === "review") {
                devProgressSum += 0.8;
              } else if (t.status === "in_progress") {
                devProgressSum += Math.max(t.progress || 0, 10) / 100;
              } else {
                devProgressSum += (t.progress || 0) / 100;
              }
            } else {
              // Contributor individual progress
              const individualProgress = contributorProgressMap.get(t.id) || 0;
              devProgressSum += individualProgress / 100;
            }
          }
        });

        devRelativeActual += (devProgressSum / phaseTasks.length) * weight;

        // 2. Calculate Planned Target via interpolation
        const start = parseMilestoneDate(m.startDate);
        const end = parseMilestoneDate(m.endDate);
        let phaseFactor = 0;
        if (start && end) {
          if (weekEnd < start) {
            phaseFactor = 0;
          } else if (weekEnd > end) {
            phaseFactor = 1.0;
          } else {
            const totalDuration = end.getTime() - start.getTime();
            const elapsed = weekEnd.getTime() - start.getTime();
            phaseFactor = totalDuration > 0 ? elapsed / totalDuration : 1.0;
          }
        } else {
          // Fallback to project-level planned cumulative ratio
          phaseFactor = w.plannedCumulative;
        }

        devRelativePlanned += (devPhaseTasksCount / phaseTasks.length) * weight * phaseFactor;
      });
    }

    const devRelativeActualVal = weekStart > today ? null : devRelativeActual;
    const devActualCumulativeVal = (developerTotalWeight > 0 && devRelativeActualVal !== null)
      ? parseFloat((devRelativeActualVal / developerTotalWeight).toFixed(4))
      : (devRelativeActualVal === null ? null : 0);

    const devPlannedCumulativeVal = developerTotalWeight > 0
      ? parseFloat((devRelativePlanned / developerTotalWeight).toFixed(4))
      : 0;

    // Find completed tasks during this week (filter by developer if developerId is set)
    const completedTasks = taskList
      .filter((t) => {
        if (t.status !== "done") return false;
        if (developerId && !devTasksSet.has(t.id)) return false;
        const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);
        return taskUpdateDate >= weekStart && taskUpdateDate <= weekEnd;
      })
      .map((t) => {
        const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);
        return {
          id: t.id,
          title: t.title,
          phase: t.phase || "",
          taskCode: t.taskCode || null,
          completedAt: toLocalYMD(taskUpdateDate),
          taskUpdateDateTime: taskUpdateDate.getTime()
        };
      })
      .sort((a, b) => b.taskUpdateDateTime - a.taskUpdateDateTime)
      .map((t) => ({
        id: t.id,
        title: t.title,
        phase: t.phase,
        taskCode: t.taskCode,
        completedAt: t.completedAt
      }));

    return {
      week: w.week,
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      plannedCumulative: w.plannedCumulative,
      actualCumulative: weekStart > today ? null : parseFloat(totalActual.toFixed(4)),
      targetMilestone: w.targetMilestone || null,
      completedTasks,
      ...(developerId && {
        devPlannedCumulative: devPlannedCumulativeVal,
        devActualCumulative: devActualCumulativeVal,
        devRelativePlannedCumulative: parseFloat(devRelativePlanned.toFixed(4)),
        devRelativeActualCumulative: devRelativeActualVal !== null ? parseFloat(devRelativeActualVal.toFixed(4)) : null,
      }),
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
  // Developer-specific properties
  devPlannedCumulative?: number;
  devActualCumulative?: number | null;
  devRelativePlannedCumulative?: number;
  devRelativeActualCumulative?: number | null;
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

export async function calculateSCurveGroup(projectId: string, developerId?: string): Promise<SCurveGroup> {
  const overall = await calculateSCurve(projectId, developerId);
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
  const activeDate = activeWeek ? new Date(activeWeek.weekEnd + "T00:00:00Z") : today;
  const monthName = MONTH_NAMES[activeDate.getUTCMonth()] + " " + activeDate.getUTCFullYear();

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

    // Group tasks by phase to optimize lookup performance
    const tasksByPhase: Record<string, Task[]> = {};
    taskList.forEach((t) => {
      if (t.phase) {
        if (!tasksByPhase[t.phase]) {
          tasksByPhase[t.phase] = [];
        }
        tasksByPhase[t.phase].push(t);
      }
    });

    // Developer setup for daily trace
    let developerTotalWeight = 0;
    const devTasksSet = new Set<string>();
    const contributorProgressMap = new Map<string, number>();

    if (developerId) {
      const contribs = await db
        .select()
        .from(taskContributors)
        .where(eq(taskContributors.developerId, developerId));
      contribs.forEach((c) => {
        devTasksSet.add(c.taskId);
        contributorProgressMap.set(c.taskId, c.individualProgress);
      });
      taskList.forEach((t) => {
        if (t.assigneeId === developerId) {
          devTasksSet.add(t.id);
        }
      });

      milestoneList.forEach((m) => {
        const weight = phaseWeights[m.phase] || 0;
        const phaseTasks = tasksByPhase[m.phase] || [];
        if (phaseTasks.length > 0) {
          const devPhaseTasksCount = phaseTasks.filter((t) => devTasksSet.has(t.id)).length;
          developerTotalWeight += (devPhaseTasksCount / phaseTasks.length) * weight;
        }
      });
    }

    const prevPlanned = currentWeekIndex > 0 ? overall[currentWeekIndex - 1].plannedCumulative : 0;
    const prevDevRelativePlanned = (currentWeekIndex > 0 && overall[currentWeekIndex - 1].devRelativePlannedCumulative !== undefined)
      ? overall[currentWeekIndex - 1].devRelativePlannedCumulative!
      : 0;

    const weekStart = new Date(activeWeek.weekStart + "T00:00:00Z");

    for (let j = 0; j < 7; j++) {
      const dayDate = new Date(weekStart.getTime() + j * 24 * 60 * 60 * 1000);
      const dayDateStr = toLocalYMD(dayDate);

      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayIndex = (dayDate.getUTCDay() + 6) % 7;
      const dayName = dayNames[dayIndex];

      const plannedVal = prevPlanned + ((j + 1) / 7) * (activeWeek.plannedCumulative - prevPlanned);

      const isFuture = dayDateStr > todayStr;
      let actualVal = null;
      let devRelativeActualVal = null;
      let devRelativePlannedVal = null;

      if (!isFuture) {
        const res = calculateActualProgressAtDate(
          dayDateStr,
          milestoneList,
          tasksByPhase,
          phaseWeights,
          developerId,
          devTasksSet,
          contributorProgressMap
        );
        actualVal = res.projectActual;
        devRelativeActualVal = res.devRelativeActual;
      }

      if (developerId && activeWeek.devRelativePlannedCumulative !== undefined) {
        devRelativePlannedVal = prevDevRelativePlanned + ((j + 1) / 7) * (activeWeek.devRelativePlannedCumulative - prevDevRelativePlanned);
      }

      const devActualCumulativeVal = (developerId && developerTotalWeight > 0 && devRelativeActualVal !== null)
        ? parseFloat((devRelativeActualVal / developerTotalWeight).toFixed(4))
        : (devRelativeActualVal === null ? null : 0);

      const devPlannedCumulativeVal = (developerId && developerTotalWeight > 0 && devRelativePlannedVal !== null)
        ? parseFloat((devRelativePlannedVal / developerTotalWeight).toFixed(4))
        : 0;

      const dayStart = new Date(dayDateStr + "T00:00:00Z");
      const dayEnd = new Date(dayDateStr + "T23:59:59Z");
      
      const dayCompletedTasks = taskList
        .filter((t) => {
          if (t.status !== "done") return false;
          if (developerId && !devTasksSet.has(t.id)) return false;
          const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);
          return taskUpdateDate >= dayStart && taskUpdateDate <= dayEnd;
        })
        .map((t) => {
          const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);
          return {
            id: t.id,
            title: t.title,
            phase: t.phase || "",
            taskCode: t.taskCode || null,
            completedAt: toLocalYMD(taskUpdateDate),
            taskUpdateDateTime: taskUpdateDate.getTime()
          };
        })
        .sort((a, b) => b.taskUpdateDateTime - a.taskUpdateDateTime)
        .map((t) => ({
          id: t.id,
          title: t.title,
          phase: t.phase,
          taskCode: t.taskCode,
          completedAt: t.completedAt
        }));

      weeklyDays.push({
        day: dayName,
        date: dayDateStr.slice(5), // "MM-DD"
        plannedCumulative: parseFloat(plannedVal.toFixed(4)),
        actualCumulative: actualVal,
        completedTasks: dayCompletedTasks,
        ...(developerId && {
          devPlannedCumulative: devPlannedCumulativeVal,
          devActualCumulative: devActualCumulativeVal,
          devRelativePlannedCumulative: devRelativePlannedVal !== null ? parseFloat(devRelativePlannedVal.toFixed(4)) : 0,
          devRelativeActualCumulative: devRelativeActualVal !== null ? parseFloat(devRelativeActualVal.toFixed(4)) : null,
        }),
      });
    }
  }

  return {
    overall,
    monthly: {
      monthName,
      weeks: overall.filter((w) => {
        return w.weekEnd.startsWith(activeMonthStr) || w.weekStart.startsWith(activeMonthStr);
      }),
    },
    weekly: {
      weekNumber: activeWeek ? activeWeek.week : 0,
      days: weeklyDays,
    },
  };
}

function calculateActualProgressAtDate(
  dateStr: string,
  milestoneList: Milestone[],
  tasksByPhase: Record<string, Task[]>,
  phaseWeights: Record<string, number>,
  developerId?: string,
  devTasksSet?: Set<string>,
  contributorProgressMap?: Map<string, number>
): { projectActual: number; devRelativeActual: number | null } {
  const cutoff = new Date(dateStr + "T23:59:59Z");
  let totalActual = 0;
  let devRelativeActual = developerId ? 0 : null;

  milestoneList.forEach((m) => {
    const weight = phaseWeights[m.phase] || 0;
    const phaseTasks = tasksByPhase[m.phase] || [];
    if (phaseTasks.length === 0) {
      if (m.endDate && new Date(m.endDate + "T23:59:59Z") <= cutoff) {
        const phaseVal = (m.status === "completed" ? 1.0 : 0.0) * weight;
        totalActual += phaseVal;
      }
      return;
    }

    let phaseProgressSum = 0;
    let devPhaseProgressSum = 0;
    let hasDevTasks = false;

    phaseTasks.forEach((t) => {
      const taskUpdateDate = parseDbDate(t.updatedAt || t.createdAt);
      let progressVal = 0;

      if (taskUpdateDate <= cutoff) {
        if (t.status === "done") {
          progressVal = 1.0;
        } else if (t.status === "review") {
          progressVal = 0.8;
        } else if (t.status === "in_progress") {
          progressVal = Math.max(t.progress || 0, 10) / 100;
        } else {
          progressVal = (t.progress || 0) / 100;
        }
      }

      phaseProgressSum += progressVal;

      if (developerId && devTasksSet && devTasksSet.has(t.id)) {
        hasDevTasks = true;
        if (t.assigneeId === developerId) {
          devPhaseProgressSum += progressVal;
        } else if (contributorProgressMap) {
          const individualProgress = contributorProgressMap.get(t.id) || 0;
          // Apply cut-off logic for contributor progress
          if (taskUpdateDate <= cutoff) {
            devPhaseProgressSum += individualProgress / 100;
          }
        }
      }
    });

    const avgProgress = phaseProgressSum / phaseTasks.length;
    totalActual += avgProgress * weight;

    if (developerId && hasDevTasks && devRelativeActual !== null) {
      devRelativeActual += (devPhaseProgressSum / phaseTasks.length) * weight;
    }
  });

  return {
    projectActual: parseFloat(totalActual.toFixed(4)),
    devRelativeActual: devRelativeActual !== null ? parseFloat(devRelativeActual.toFixed(4)) : null,
  };
}
