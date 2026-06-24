"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ArrowLeft,
  Play,
  Pencil,
  Trash2,
  RefreshCw,
  ListTodo,
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { TestPlan, TestCase, Project } from "../types";

interface TestSuiteViewProps {
  selectedPlanData: TestPlan | undefined;
  projects: Project[];
  filteredCases: TestCase[];
  loading: boolean;
  caseSearch: string;
  setCaseSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  roleFilter: string;
  setRoleFilter: (s: string) => void;
  syncing: boolean;
  lastSyncedAt: string | null;
  handleSyncSheets: () => void;
  setShowNewCase: (show: boolean) => void;
  setSelectedPlan: (id: string | null) => void;
  startExecution: (tc: TestCase) => void;
  openEditCase: (tc: TestCase) => void;
  deleteCase: (id: string) => void;
  setPreviewCase: (tc: TestCase | null) => void;
  setPreviewOpen: (open: boolean) => void;
  openEditPlan: (plan: TestPlan) => void;
  deletePlan: (id: string) => void;
}

export function TestSuiteView({
  selectedPlanData,
  projects,
  filteredCases,
  loading,
  caseSearch,
  setCaseSearch,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
  syncing,
  lastSyncedAt,
  handleSyncSheets,
  setShowNewCase,
  setSelectedPlan,
  startExecution,
  openEditCase,
  deleteCase,
  setPreviewCase,
  setPreviewOpen,
  openEditPlan,
  deletePlan,
}: TestSuiteViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Suite Header */}
              <div className="flex-shrink-0 flex items-center justify-between border-b pb-2 mb-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <Badge variant="secondary" className="font-semibold text-[9px] px-1.5 py-0">{selectedPlanData?.module}</Badge>
                    {selectedPlanData && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {projects.find((p) => p.id === selectedPlanData.projectId)?.name || "Unknown Project"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <h1 className="text-lg font-bold text-slate-800">{selectedPlanData?.name}</h1>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 rounded-full hover:bg-slate-100"
                      onClick={() => selectedPlanData && openEditPlan(selectedPlanData)}
                    >
                      <Pencil className="w-3 h-3 text-slate-500 hover:text-slate-700" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 rounded-full hover:bg-slate-100 hover:text-red-650"
                      onClick={() => selectedPlanData && deletePlan(selectedPlanData.id)}
                    >
                      <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-650" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ExportButton
                    data={filteredCases}
                    filename={`${selectedPlanData?.name.toLowerCase().replace(/\s+/g, "_")}_test_cases`}
                    size="sm"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncing}
                      onClick={handleSyncSheets}
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-7 text-xs py-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing..." : "Sync Sheets"}
                    </Button>
                    {lastSyncedAt && (
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        Last synced: {lastSyncedAt}
                      </span>
                    )}
                  </div>
                  <Button size="sm" className="h-7 text-xs py-1" onClick={() => setShowNewCase(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Test Case
                  </Button>
                  <Button size="sm" className="h-7 text-xs py-1" variant="outline" onClick={() => setSelectedPlan(null)}>
                    Dashboard
                  </Button>
                </div>
              </div>

              {/* Suite Filters & Search */}
              <div className="flex-shrink-0 flex gap-3 items-center mb-3 px-0.5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Search test cases (number, expected behavior)..."
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v || "all")}>
                  <SelectTrigger className="w-36 h-8 text-xs px-2.5"><SelectValue placeholder="All Roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="administrator">👑 Administrator</SelectItem>
                    <SelectItem value="top_user">⭐ Top User</SelectItem>
                    <SelectItem value="user">👤 User</SelectItem>
                    <SelectItem value="matrix">🔄 Matrix</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                  <SelectTrigger className="w-36 h-8 text-xs px-2.5"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Passed</SelectItem>
                    <SelectItem value="fail">Failed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Test Cases Table Area */}
              <div className="flex-1 border rounded-lg bg-white overflow-hidden min-h-0">
                <div className="h-full overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10 shadow-sm border-b border-slate-200">
                      <TableRow>
                        <TableHead className="w-24 px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Case ID</TableHead>
                        <TableHead className="w-1/3 px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scenario</TableHead>
                        <TableHead className="w-1/4 px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expected Behavior</TableHead>
                        <TableHead className="w-36 px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notes</TableHead>
                        <TableHead className="w-36 text-right pr-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Execution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading cases...</TableCell></TableRow>
                      ) : filteredCases.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No test cases found in this plan</TableCell></TableRow>
                      ) : (
                        filteredCases.map((tc) => {
                          const statusBg = 
                            tc.status === "pass" ? "bg-emerald-50/45 hover:bg-emerald-50/70" :
                            tc.status === "fail" ? "bg-rose-50/45 hover:bg-rose-50/70" :
                            tc.status === "blocked" ? "bg-amber-50/45 hover:bg-amber-50/70" :
                            "hover:bg-slate-50/30";

                          return (
                            <TableRow 
                              key={tc.id} 
                              className={`transition-all border-b border-slate-100 cursor-pointer ${statusBg}`}
                              onClick={() => {
                                setPreviewCase(tc);
                                setPreviewOpen(true);
                              }}
                            >
                              <TableCell className="font-mono text-xs font-semibold text-slate-600 px-3 py-1.5">{tc.caseNumber}</TableCell>
                              <TableCell className="px-3 py-1.5">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-semibold text-slate-800 line-clamp-2" title={tc.description}>{tc.description}</p>
                                  {tc.steps && (
                                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                      <ListTodo className="w-3 h-3" />
                                      <span>{tc.steps.split("\n").filter(Boolean).length} steps defined</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500 italic max-w-xs truncate px-3 py-1.5" title={tc.expectedResult || ""}>
                                {tc.expectedResult || "-"}
                              </TableCell>
                              <TableCell className="px-3 py-1.5">
                                <div className="flex items-center gap-1">
                                  {tc.erpRole && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-200 px-1 py-0"
                                    >
                                      {tc.erpRole === "administrator" && "👑 Admin"}
                                      {tc.erpRole === "top_user" && "⭐ Top User"}
                                      {tc.erpRole === "user" && "👤 User"}
                                      {tc.erpRole === "matrix" && "🔄 Matrix"}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={
                                      tc.status === "pass" ? "default" :
                                      tc.status === "fail" ? "destructive" :
                                      tc.status === "blocked" ? "outline" :
                                      "secondary"
                                    }
                                    className={`font-bold text-[9px] uppercase tracking-wider px-1.5 py-0 ${
                                      tc.status === "pass" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                      tc.status === "fail" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                      tc.status === "blocked" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                      "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    {tc.status}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="px-3 py-1.5">
                                <div className="max-w-xs truncate">
                                  {tc.notes ? (
                                    <span className="text-[11px] text-slate-600 font-medium">{tc.notes}</span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-3 py-1.5">
                                <div className="flex justify-end items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant={tc.status === "pending" ? "default" : "outline"}
                                    onClick={(e) => { e.stopPropagation(); startExecution(tc); }}
                                    className="h-6.5 gap-1 font-semibold text-[10px] px-2 py-0.5"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                    Run Test
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); openEditCase(tc); }}
                                    className="w-6 h-6 hover:bg-slate-100"
                                  >
                                    <Pencil className="w-3 h-3 text-slate-500 hover:text-slate-700" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); deleteCase(tc.id); }}
                                    className="w-6 h-6 hover:bg-red-50 hover:text-red-650"
                                  >
                                    <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-650" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

            </div>
  );
}
