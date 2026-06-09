"use client";

import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCurveDataPoint, SCurveDailyPoint, SCurveGroup } from "@/lib/s-curve";

interface SCurveChartProps {
  sCurveGroup: SCurveGroup;
}

export function SCurveChart({ sCurveGroup }: SCurveChartProps) {
  const [view, setView] = useState<"weekly" | "monthly" | "overall">("overall");

  // Format percentage helper
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
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

      const plannedCumulative = payload[0].payload.plannedCumulative;
      const actualCumulative = payload[0].payload.actualCumulative;
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
            <div className="text-blue-400 flex justify-between gap-4 text-[11px] font-medium">
              <span>Planned:</span>
              <span className="font-bold">{(plannedCumulative * 100).toFixed(1)}%</span>
            </div>
            {actualCumulative !== null && (
              <div className="text-emerald-400 flex justify-between gap-4 text-[11px] font-medium">
                <span>Actual:</span>
                <span className="font-bold">{(actualCumulative * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {completedTasks.length > 0 && (
            <div className="border-t border-slate-800/80 pt-2 space-y-1.5">
              <div className="font-semibold text-slate-350 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Completed ({completedTasks.length}):
              </div>
              <div className="space-y-1">
                {completedTasks.slice(0, 3).map((task: any) => (
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

  // Find latest actual progress and calculate deviance
  let currentActual = 0;
  let currentPlanned = 0;

  if (view === "weekly") {
    const completedDays = sCurveGroup.weekly.days.filter((d) => d.actualCumulative !== null);
    const lastCompleted = completedDays[completedDays.length - 1];
    currentActual = (lastCompleted && lastCompleted.actualCumulative !== null) ? lastCompleted.actualCumulative : 0;
    currentPlanned = lastCompleted ? lastCompleted.plannedCumulative : 0;
  } else if (view === "monthly") {
    const completedWeeks = sCurveGroup.monthly.weeks.filter((d) => d.actualCumulative !== null);
    const lastCompleted = completedWeeks[completedWeeks.length - 1];
    currentActual = (lastCompleted && lastCompleted.actualCumulative !== null) ? lastCompleted.actualCumulative : 0;
    currentPlanned = lastCompleted ? lastCompleted.plannedCumulative : 0;
  } else {
    const completedWeeks = sCurveGroup.overall.filter((d) => d.actualCumulative !== null);
    const lastCompleted = completedWeeks[completedWeeks.length - 1];
    currentActual = (lastCompleted && lastCompleted.actualCumulative !== null) ? lastCompleted.actualCumulative : 0;
    currentPlanned = lastCompleted ? lastCompleted.plannedCumulative : 0;
  }

  const deviance = (currentActual - currentPlanned) * 100;

  // Configure chart props based on selected view
  const chartData = (
    view === "weekly"
      ? sCurveGroup.weekly.days
      : view === "monthly"
      ? sCurveGroup.monthly.weeks
      : sCurveGroup.overall
  ) as any[];

  const xAxisKey = view === "weekly" ? "day" : "week";
  const tickFormatter = view === "weekly" ? (v: any) => v : (v: any) => `W${v}`;

  return (
    <Card className="col-span-1 lg:col-span-3 shadow-md border-slate-200 overflow-visible">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold">Project S-Curve Tracking</CardTitle>
          <CardDescription className="text-xs">
            {view === "weekly" && `Daily Trace for Week ${sCurveGroup.weekly.weekNumber}`}
            {view === "monthly" && `Weekly Trace for ${sCurveGroup.monthly.monthName}`}
            {view === "overall" && `Cumulative Progress over ${sCurveGroup.overall.length} Weeks`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
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

          {/* Segment Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-2">
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
              <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
              <Legend verticalAlign="top" height={36} />
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
