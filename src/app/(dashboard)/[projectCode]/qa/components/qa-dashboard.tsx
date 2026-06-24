"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, XCircle, Activity, BarChart3, ShieldAlert, Clock, TrendingUp } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { TestCase, ModuleStat, moduleToEpicMap } from "../types";

interface QADashboardProps {
  testCases: TestCase[];
  testPlans: { id: string }[];
  moduleStats: ModuleStat[];
  totalCasesCount: number;
  passedCasesCount: number;
  failedCasesCount: number;
  blockedCasesCount: number;
  executedCasesCount: number;
  executionRate: number;
  passRate: number;
}

export function QADashboard({
  testCases,
  testPlans,
  moduleStats,
  totalCasesCount,
  passedCasesCount,
  failedCasesCount,
  blockedCasesCount,
  executedCasesCount,
  executionRate,
  passRate,
}: QADashboardProps) {
  const pendingCasesCount = totalCasesCount - executedCasesCount;

  return (
    <div className="flex-1 overflow-y-auto space-y-6 min-w-0 pr-2">
      {/* Header */}
      <div className="flex items-end justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">QA Testing Console</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Global quality assurance metrics and active testing suites
          </p>
        </div>
        <ExportButton data={testCases} filename="all_qa_test_cases" label="Export All Cases" size="sm" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        {/* Total Cases */}
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="w-4.5 h-4.5 text-slate-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{totalCasesCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              across <span className="font-semibold text-slate-700">{testPlans.length}</span> test suites
            </p>
          </CardContent>
        </Card>

        {/* Pass Rate */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Pass Rate</span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">{passRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-emerald-600">{passedCasesCount}</span> cases passed
            </p>
          </CardContent>
        </Card>

        {/* Failures */}
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Failures</span>
            </div>
            <div className="text-3xl font-extrabold text-rose-600">{failedCasesCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              {blockedCasesCount > 0 && (
                <><span className="font-semibold text-amber-600">{blockedCasesCount}</span> blocked · </>
              )}
              <span className="font-semibold text-rose-600">{failedCasesCount}</span> failed
            </p>
          </CardContent>
        </Card>

        {/* Execution Progress */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Executed</span>
            </div>
            <div className="text-3xl font-extrabold text-blue-600">{executionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{executedCasesCount}</span> of {totalCasesCount} executed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Execution Progress Detail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">Overall Execution Progress</CardTitle>
            <span className="text-xs font-bold text-slate-400">
              {executedCasesCount} / {totalCasesCount} test cases
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Large progress bar */}
          <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden flex mb-4">
            {passedCasesCount > 0 && (
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(passedCasesCount / totalCasesCount) * 100}%` }}
                title={`Passed: ${passedCasesCount}`}
              >
                {(passedCasesCount / totalCasesCount) * 100 > 8 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">{passedCasesCount}</span>
                )}
              </div>
            )}
            {failedCasesCount > 0 && (
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(failedCasesCount / totalCasesCount) * 100}%` }}
                title={`Failed: ${failedCasesCount}`}
              >
                {(failedCasesCount / totalCasesCount) * 100 > 8 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">{failedCasesCount}</span>
                )}
              </div>
            )}
            {blockedCasesCount > 0 && (
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(blockedCasesCount / totalCasesCount) * 100}%` }}
                title={`Blocked: ${blockedCasesCount}`}
              >
                {(blockedCasesCount / totalCasesCount) * 100 > 8 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">{blockedCasesCount}</span>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700">{passedCasesCount}</p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">Passed</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-rose-50 rounded-lg border border-rose-100">
              <div className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-rose-700">{failedCasesCount}</p>
                <p className="text-[10px] font-semibold text-rose-600 uppercase">Failed</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700">{blockedCasesCount}</p>
                <p className="text-[10px] font-semibold text-amber-600 uppercase">Blocked</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-3 h-3 rounded-full bg-slate-300 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-600">{pendingCasesCount}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Execution Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Breakdown by Module</h3>
          <span className="text-xs text-slate-400 font-medium">{moduleStats.length} modules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {moduleStats.map((s) => {
            const epicCode = moduleToEpicMap[s.module] || "ADM";
            const isComplete = s.progress === 100;
            const hasActivity = s.total > 0;

            return (
              <Card
                key={s.module}
                className={`transition-all hover:shadow-md ${
                  isComplete
                    ? "border-emerald-200 bg-emerald-50/30"
                    : hasActivity
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50/50"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Module header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {epicCode}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1.5">{s.module}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-slate-900">{s.progress}%</span>
                      <p className="text-[10px] text-slate-400 font-medium">{s.plansCount} plans</p>
                    </div>
                  </div>

                  {/* Total cases */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Cases</span>
                    <span className="font-bold text-slate-800">{s.total}</span>
                  </div>

                  {/* Progress bar */}
                  {hasActivity ? (
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      {s.pass > 0 && (
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                          style={{ width: `${(s.pass / s.total) * 100}%` }}
                        />
                      )}
                      {s.fail > 0 && (
                        <div
                          className="h-full bg-gradient-to-r from-rose-400 to-rose-500"
                          style={{ width: `${(s.fail / s.total) * 100}%` }}
                        />
                      )}
                      {s.blocked > 0 && (
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                          style={{ width: `${(s.blocked / s.total) * 100}%` }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full bg-slate-100 h-2.5 rounded-full" />
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-emerald-600">{s.pass}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Pass</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-rose-600">{s.fail}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Fail</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-amber-600">{s.blocked}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Block</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-slate-400">{s.pending}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Pend</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
