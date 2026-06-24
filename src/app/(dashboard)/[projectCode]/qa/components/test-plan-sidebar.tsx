"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, BarChart3, ChevronRight, Lock, Pencil, Trash2, FlaskConical } from "lucide-react";
import { TestPlan, TestCase } from "../types";

interface TestPlanSidebarProps {
  planSearch: string;
  setPlanSearch: (s: string) => void;
  filteredPlans: TestPlan[];
  testCases: TestCase[];
  selectedPlan: string | null;
  setSelectedPlan: (id: string | null) => void;
  isQA: boolean;
  setShowNewPlan: (show: boolean) => void;
  openEditPlan: (plan: TestPlan) => void;
  deletePlan: (id: string) => void;
}

export function TestPlanSidebar({
  planSearch,
  setPlanSearch,
  filteredPlans,
  testCases,
  selectedPlan,
  setSelectedPlan,
  isQA,
  setShowNewPlan,
  openEditPlan,
  deletePlan,
}: TestPlanSidebarProps) {
  return (
    <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Test Suites</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600"
            onClick={() => setShowNewPlan(true)}
            title="New Test Plan"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search plans..."
            value={planSearch}
            onChange={(e) => setPlanSearch(e.target.value)}
            className="pl-9 text-sm h-9 bg-slate-50 border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {/* Global Dashboard button */}
        <button
          onClick={() => setSelectedPlan(null)}
          className={`w-full text-left px-3 py-3 rounded-lg text-sm font-semibold flex items-center justify-between transition-all ${
            !selectedPlan
              ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
              : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${!selectedPlan ? "bg-blue-100" : "bg-slate-100"}`}>
              <BarChart3 className={`w-4 h-4 ${!selectedPlan ? "text-blue-600" : "text-slate-500"}`} />
            </div>
            <div>
              <span className="text-xs font-bold">Global Dashboard</span>
              {!isQA && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-medium">QA Role only</span>
                </div>
              )}
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 ${!selectedPlan ? "text-blue-400" : "text-slate-300"}`} />
        </button>

        <div className="h-px bg-slate-100 my-2" />

        {/* Plan items */}
        {filteredPlans.map((plan) => {
          const cases = testCases.filter((c) => c.testPlanId === plan.id);
          const executed = cases.filter((c) => c.status !== "pending").length;
          const passed = cases.filter((c) => c.status === "pass").length;
          const failed = cases.filter((c) => c.status === "fail").length;
          const percent = cases.length > 0 ? Math.round((executed / cases.length) * 100) : 0;
          const isActive = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`w-full text-left px-3 py-3 rounded-lg transition-all cursor-pointer group relative ${
                isActive
                  ? "bg-slate-50 border border-slate-200 shadow-sm"
                  : "border border-transparent hover:bg-slate-50/60 hover:border-slate-100"
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-blue-500 rounded-r-full" />
              )}

              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}>
                  {plan.module}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {executed}/{cases.length}
                  </span>
                  {/* Edit/Delete on hover */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                      onClick={(e) => { e.stopPropagation(); openEditPlan(plan); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <h4 className={`text-xs font-semibold truncate pr-6 ${
                isActive ? "text-slate-900" : "text-slate-700"
              }`}>
                {plan.name}
              </h4>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percent === 100
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                      : percent > 0
                      ? "bg-gradient-to-r from-blue-400 to-blue-500"
                      : ""
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Mini stats */}
              {cases.length > 0 && (
                <div className="flex items-center gap-3 mt-1.5">
                  {passed > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600">{passed} pass</span>
                  )}
                  {failed > 0 && (
                    <span className="text-[10px] font-bold text-rose-500">{failed} fail</span>
                  )}
                  {percent === 100 && (
                    <span className="text-[10px] font-bold text-emerald-600">✓ Complete</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No test plans found</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
