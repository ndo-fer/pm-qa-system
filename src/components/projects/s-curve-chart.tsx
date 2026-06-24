/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCurveDataPoint, SCurveDailyPoint, SCurveGroup } from "@/lib/s-curve";

interface SCurveChartProps {
  sCurveGroup: SCurveGroup;
  personalSCurveGroup?: SCurveGroup;
  userRole: "admin" | "pm" | "developer" | "qa";
  projectDevelopers: { id: string; name: string }[];
  projectId: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      day?: string;
      date?: string;
      week?: number;
      weekStart?: string;
      weekEnd?: string;
      targetMilestone?: string | null;
      plannedCumulative: number;
      actualCumulative: number | null;
      devPlannedCumulative?: number;
      devActualCumulative?: number | null;
      devRelativePlannedCumulative?: number;
      devRelativeActualCumulative?: number | null;
      completedTasks?: Array<{
        id: string;
        taskCode?: string | null;
        phase?: string | null;
        title: string;
      }>;
    };
  }>;
  view: "weekly" | "monthly" | "overall";
}

const CustomTooltip = ({ active, payload, view }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const isWeekly = view === "weekly";
    const title = isWeekly 
      ? `${payload[0].payload.day} (${payload[0].payload.date})` 
      : `Week ${payload[0].payload.week}`;
    const subtitle = isWeekly
      ? null
      : `${payload[0].payload.weekStart} to ${payload[0].payload.weekEnd}`;
    const milestone = isWeekly
      ? null
      : payload[0].payload.targetMilestone;

    const completedTasks = payload[0].payload.completedTasks || [];

    return (
      <div className="bg-slate-950/95 text-white p-3.5 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-md text-xs space-y-2.5 w-64 md:w-72 max-w-sm pointer-events-auto">
        <div>
          <p className="font-bold text-sm tracking-tight">{title}</p>
          {subtitle && <p className="text-slate-400 text-[10px] mt-0.5">{subtitle}</p>}
          {milestone && (
            <p className="text-amber-400 font-semibold text-[10px] mt-1">Target Phase: {milestone}</p>
          )}
        </div>
        <div className="border-t border-slate-800/80 pt-2 space-y-1">
          {payload.map((item, idx) => (
            <div key={idx} style={{ color: item.color }} className="flex justify-between gap-4 text-[11px] font-medium">
              <span>{item.name}:</span>
              <span className="font-bold">{(item.value * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {completedTasks.length > 0 && (
          <div className="border-t border-slate-800/80 pt-2 space-y-1.5">
            <div className="font-semibold text-slate-350 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Completed ({completedTasks.length}):
            </div>
            <div className="space-y-1">
              {completedTasks.slice(0, 3).map((task) => (
                <div 
                  key={task.id} 
                  className="flex flex-col gap-0.5 bg-slate-900/40 p-1.5 rounded border border-slate-800/50"
                >
                  <div className="flex items-center gap-1.5">
                    {task.taskCode && (
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                        {task.taskCode}
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                      {task.phase}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium leading-tight truncate">
                    {task.title}
                  </p>
                </div>
              ))}
              {completedTasks.length > 3 && (
                <p className="text-[9.5px] text-slate-400 italic text-center pt-0.5">
                  + {completedTasks.length - 3} more tasks
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function SCurveChart({ 
  sCurveGroup, 
  personalSCurveGroup, 
  userRole, 
  projectDevelopers, 
  projectId 
}: SCurveChartProps) {
  const [view, setView] = useState<"weekly" | "monthly" | "overall" >("overall");
  const [mode, setMode] = useState<"global" | "user">("global");
  const [individualMode, setIndividualMode] = useState<"dynamic" | "relative">("dynamic");
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>("");
  const [fetchedSCurveGroup, setFetchedSCurveGroup] = useState<SCurveGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize selected developer for Admin/PM
  useEffect(() => {
    if ((userRole === "admin" || userRole === "pm") && projectDevelopers.length > 0 && !selectedDeveloperId) {
      setSelectedDeveloperId(projectDevelopers[0].id);
    }
  }, [projectDevelopers, userRole, selectedDeveloperId]);

  // Fetch developer S-curve dynamically when Admin/PM changes the selected developer
  useEffect(() => {
    if (mode === "user" && selectedDeveloperId && (userRole === "admin" || userRole === "pm")) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/s-curve?developerId=${selectedDeveloperId}`);
          if (res.ok) {
            const data = await res.json();
            setFetchedSCurveGroup(data);
          }
        } catch (err) {
          console.error("Error fetching developer S-curve:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [mode, selectedDeveloperId, userRole, projectId]);

  // Format percentage helper
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  // Get active dataset
  const activeGroup = (mode === "global")
    ? sCurveGroup
    : (userRole === "developer" ? personalSCurveGroup : fetchedSCurveGroup) || sCurveGroup;

  // Calculate deviance based on current active curve and mode
  const getDevianceInput = () => {
    let completedPoints: any[] = [];
    if (view === "weekly") {
      completedPoints = activeGroup.weekly.days.filter((d) => {
        if (mode === "user" && individualMode === "dynamic") {
          return d.devActualCumulative !== null;
        } else if (mode === "user" && individualMode === "relative") {
          return d.devRelativeActualCumulative !== null;
        }
        return d.actualCumulative !== null;
      });
    } else if (view === "monthly") {
      completedPoints = activeGroup.monthly.weeks.filter((d) => {
        if (mode === "user" && individualMode === "dynamic") {
          return d.devActualCumulative !== null;
        } else if (mode === "user" && individualMode === "relative") {
          return d.devRelativeActualCumulative !== null;
        }
        return d.actualCumulative !== null;
      });
    } else {
      completedPoints = activeGroup.overall.filter((d) => {
        if (mode === "user" && individualMode === "dynamic") {
          return d.devActualCumulative !== null;
        } else if (mode === "user" && individualMode === "relative") {
          return d.devRelativeActualCumulative !== null;
        }
        return d.actualCumulative !== null;
      });
    }

    const lastCompleted = completedPoints[completedPoints.length - 1];
    if (!lastCompleted) return { actual: 0, planned: 0 };

    if (mode === "user" && individualMode === "dynamic") {
      return {
        actual: lastCompleted.devActualCumulative ?? 0,
        planned: lastCompleted.devPlannedCumulative ?? 0
      };
    } else if (mode === "user" && individualMode === "relative") {
      return {
        actual: lastCompleted.devRelativeActualCumulative ?? 0,
        planned: lastCompleted.devRelativePlannedCumulative ?? 0
      };
    } else {
      return {
        actual: lastCompleted.actualCumulative ?? 0,
        planned: lastCompleted.plannedCumulative ?? 0
      };
    }
  };

  const { actual: currentActual, planned: currentPlanned } = getDevianceInput();
  const deviance = (currentActual - currentPlanned) * 100;

  // Configure chart props based on selected view
  const chartData = (
    view === "weekly"
      ? activeGroup.weekly.days
      : view === "monthly"
      ? activeGroup.monthly.weeks
      : activeGroup.overall
  ) as (SCurveDataPoint | SCurveDailyPoint)[];

  const xAxisKey = view === "weekly" ? "day" : "week";
  const tickFormatter = view === "weekly" ? (v: string | number) => String(v) : (v: string | number) => `W${v}`;

  if (!mounted) {
    return (
      <Card className="col-span-1 lg:col-span-3 shadow-md border-slate-200 overflow-visible animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-350">Project S-Curve Tracking</CardTitle>
            <CardDescription className="text-xs text-slate-200">
              Loading chart...
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[260px] bg-slate-50/50 rounded-lg flex items-center justify-center text-xs text-slate-400">
            Initializing chart viewport...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-3 shadow-md border-slate-200 overflow-visible">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span>S-Curve Progress Tracking</span>
            {loading && <span className="text-[10px] font-normal text-slate-400 animate-pulse">(fetching...)</span>}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === "global" && (
              <>
                {view === "weekly" && `Daily Trace for Week ${activeGroup.weekly.weekNumber}`}
                {view === "monthly" && `Weekly Trace for ${activeGroup.monthly.monthName}`}
                {view === "overall" && `Cumulative Progress over ${activeGroup.overall.length} Weeks`}
              </>
            )}
            {mode === "user" && (
              <>
                Developer Progress: {individualMode === "dynamic" ? "Self-Target (Dinamis)" : "Project Contribution (Relatif)"}
              </>
            )}
          </CardDescription>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Deviance Badge */}
          {deviance < 0 ? (
            <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">
              Behind Schedule ({deviance.toFixed(1)}%)
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[10px] border-0">
              Ahead of Schedule (+{deviance.toFixed(1)}%)
            </Badge>
          )}

          {/* Mode Selector Toggle (1 Person vs Group Icon) */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setMode("global")}
              className={`p-1 px-2.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold ${
                mode === "global"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Global Project S-Curve"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Global</span>
            </button>
            <button
              onClick={() => setMode("user")}
              className={`p-1 px-2.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold ${
                mode === "user"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Developer S-Curve"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{userRole === "developer" ? "My Curve" : "Developer"}</span>
            </button>
          </div>

          {/* Admin Developer Filter Dropdown */}
          {mode === "user" && (userRole === "admin" || userRole === "pm") && projectDevelopers.length > 0 && (
            <Select
              value={selectedDeveloperId}
              onValueChange={(val) => setSelectedDeveloperId(val || "")}
            >
              <SelectTrigger className="h-8 text-xs font-semibold w-40 bg-white border border-slate-200 shadow-sm">
                <SelectValue placeholder="Select Developer">
                  {projectDevelopers.find((dev) => dev.id === selectedDeveloperId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projectDevelopers.map((dev) => (
                  <SelectItem key={dev.id} value={dev.id} className="text-xs">
                    {dev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Individual Mode Sub-Toggle (Dinamis vs Relatif) */}
          {mode === "user" && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setIndividualMode("dynamic")}
                className={`text-[10px] px-2.5 py-1 font-semibold rounded-md transition-all ${
                  individualMode === "dynamic"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Personal dynamic target based on assigned tasks"
              >
                Dinamis
              </button>
              <button
                onClick={() => setIndividualMode("relative")}
                className={`text-[10px] px-2.5 py-1 font-semibold rounded-md transition-all ${
                  individualMode === "relative"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Contribution relative to overall project progress"
              >
                Relatif
              </button>
            </div>
          )}

          {/* Timeframe Selector Segment Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(["weekly", "monthly", "overall"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[10px] px-2.5 py-1 font-semibold rounded-md transition-all ${
                  view === v
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {v === "weekly" ? "Weekly" : v === "monthly" ? "Monthly" : "Overall"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-visible">
        <style dangerouslySetInnerHTML={{ __html: `
          .recharts-wrapper {
            overflow: visible !important;
          }
        ` }} />
        <div className="w-full h-[260px] overflow-visible">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Fetching developer S-curve data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                <XAxis
                  dataKey={xAxisKey}
                  tickFormatter={tickFormatter}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  tickFormatter={formatPercent}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  domain={[0, 1]}
                />
                <Tooltip content={<CustomTooltip view={view} />} allowEscapeViewBox={{ x: true, y: true }} />
                <Legend verticalAlign="top" height={36} />

                {/* GLOBAL MODE LINES */}
                {mode === "global" && (
                  <>
                    <Line
                      name="Planned Progress"
                      type="monotone"
                      dataKey="plannedCumulative"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={view === "weekly" || view === "monthly"}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="Actual Progress"
                      type="monotone"
                      dataKey="actualCumulative"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </>
                )}

                {/* USER DYNAMIC MODE LINES */}
                {mode === "user" && individualMode === "dynamic" && (
                  <>
                    <Line
                      name="Target (Dinamis)"
                      type="monotone"
                      dataKey="devPlannedCumulative"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={view === "weekly" || view === "monthly"}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="Actual Progress (Dinamis)"
                      type="monotone"
                      dataKey="devActualCumulative"
                      stroke="#ec4899"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#ec4899" }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </>
                )}

                {/* USER RELATIVE MODE LINES */}
                {mode === "user" && individualMode === "relative" && (
                  <>
                    <Line
                      name="Project Target"
                      type="monotone"
                      dataKey="plannedCumulative"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      name="Project Actual"
                      type="monotone"
                      dataKey="actualCumulative"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      name="My Contribution Target"
                      type="monotone"
                      dataKey="devRelativePlannedCumulative"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={view === "weekly" || view === "monthly"}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="My Contribution Actual"
                      type="monotone"
                      dataKey="devRelativeActualCumulative"
                      stroke="#ec4899"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#ec4899" }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
