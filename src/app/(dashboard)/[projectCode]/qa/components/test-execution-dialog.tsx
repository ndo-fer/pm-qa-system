"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  AlertCircle,
  Clock,
  Bug,
  Play,
  HelpCircle,
  ListTodo,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { TestCase, TestPlan } from "../types";

interface TestExecutionDialogProps {
  activeExecCase: TestCase | null;
  setActiveExecCase: (tc: TestCase | null) => void;
  selectedPlanData: TestPlan | undefined;
  
  // Execution state
  execStatus: string;
  setExecStatus: (s: string) => void;
  execActualResult: string;
  setExecActualResult: (s: string) => void;
  execNotes: string;
  setExecNotes: (s: string) => void;
  execAttachmentUrl: string;
  setExecAttachmentUrl: (s: string) => void;
  createDefect: boolean;
  setCreateDefect: (b: boolean) => void;
  checkedSteps: Record<number, boolean>;
  setCheckedSteps: (steps: Record<number, boolean>) => void;
  
  // API testing
  useMockMode: boolean;
  setUseMockMode: (b: boolean) => void;
  testRunning: boolean;
  testError: string | null;
  testSuccess: string | null;
  setTestError: (s: string | null) => void;
  setTestSuccess: (s: string | null) => void;
  apiTokenInput: string;
  setApiTokenInput: (s: string) => void;
  
  // E2E
  e2eLogs: string[];
  e2eRunning: boolean;
  e2eScreenshot: string | null;
  
  // Functions
  submitExecution: () => void;
  runLiveApiTest: () => void;
  runPlaywrightE2ETest: () => void;
  stopPlaywrightE2ETest: () => void;
  getApiEndpointForCase: (caseNumber: string, description: string) => string | null;
  
  // Auth
  isQA: boolean;
}

export function TestExecutionDialog({
  activeExecCase,
  setActiveExecCase,
  selectedPlanData,
  execStatus,
  setExecStatus,
  execActualResult,
  setExecActualResult,
  execNotes,
  setExecNotes,
  execAttachmentUrl,
  setExecAttachmentUrl,
  createDefect,
  setCreateDefect,
  checkedSteps,
  setCheckedSteps,
  useMockMode,
  setUseMockMode,
  testRunning,
  testError,
  testSuccess,
  setTestError,
  setTestSuccess,
  apiTokenInput,
  setApiTokenInput,
  e2eLogs,
  e2eRunning,
  e2eScreenshot,
  submitExecution,
  runLiveApiTest,
  runPlaywrightE2ETest,
  stopPlaywrightE2ETest,
  getApiEndpointForCase,
  isQA,
}: TestExecutionDialogProps) {
  // Steps splitter helper
  const stepsArray = activeExecCase?.steps 
    ? activeExecCase.steps.split("\n").map(s => s.trim()).filter(Boolean) 
    : [];

  return (
    <Dialog open={!!activeExecCase} onOpenChange={(open) => !open && setActiveExecCase(null)}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 border-slate-200 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-white flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border px-1.5 py-0.5 rounded">
                {activeExecCase?.caseNumber}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedPlanData?.module} Module</span>
            </div>
            <DialogTitle className="text-slate-800 text-base md:text-lg font-bold leading-snug">{activeExecCase?.description}</DialogTitle>
          </DialogHeader>
          
          {/* Scrollable body with 2-column grid */}
          <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column (Steps Checklist, Expected Behavior, API Tester) - 3/5 width */}
              <div className="lg:col-span-3 space-y-6 min-w-0">
                {/* Interactive Steps Checklist */}
                {stepsArray.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b pb-3 border-slate-100">
                      <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                      <span>Execution Checklist Steps</span>
                    </h4>
                      {stepsArray.map((step, idx) => {
                        const isHeader = step.endsWith(":") || 
                                         step.startsWith("👑") || 
                                         step.startsWith("👤") || 
                                         step.startsWith("⭐") || 
                                         step.startsWith("⭐️") || 
                                         step.includes("Scenarios") ||
                                         step.includes("Role");
                        if (isHeader) {
                          return (
                            <div key={idx} className="text-xs font-bold text-slate-800 pt-3 pb-1 first:pt-0 border-b border-slate-100/70 mb-1.5 mt-2 first:mt-0 text-slate-900">
                              {step}
                            </div>
                          );
                        }
                        return (
                          <label key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50/80 cursor-pointer transition-all border border-transparent hover:border-slate-100">
                            <input
                              type="checkbox"
                              checked={!!checkedSteps[idx]}
                              onChange={(e) => setCheckedSteps({ ...checkedSteps, [idx]: e.target.checked })}
                              className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className={`text-xs leading-relaxed ${checkedSteps[idx] ? "line-through text-slate-300 font-medium" : "text-slate-700 font-medium"}`}>
                              {step}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                )}

                {/* Expected Behavior */}
                {activeExecCase?.expectedResult && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b pb-3 border-slate-100">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Expected Behavior</span>
                    </h4>
                    <div className="p-3.5 rounded-lg bg-blue-50/45 border border-blue-100 text-xs text-slate-700 font-semibold leading-relaxed flex items-start gap-2">
                      <p>{activeExecCase.expectedResult}</p>
                    </div>
                  </div>
                )}

                {/* Live API Tester Tool */}
                {activeExecCase && getApiEndpointForCase(activeExecCase.caseNumber, activeExecCase.description) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                        <h4 className="text-xs font-bold text-slate-800">Live API Connection Tester</h4>
                      </div>
                      <Badge variant="secondary" className="text-[9px] font-bold">
                        {useMockMode ? "Mock Mode" : "Real Server"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600">
                        <input
                          type="radio"
                          name="apiMode"
                          checked={useMockMode}
                          onChange={() => {
                            setUseMockMode(true);
                            setTestError(null);
                            setTestSuccess(null);
                          }}
                          className="h-3.5 w-3.5 text-blue-600"
                        />
                        Mock API (Local)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600">
                        <input
                          type="radio"
                          name="apiMode"
                          checked={!useMockMode}
                          onChange={() => {
                            setUseMockMode(false);
                            setTestError(null);
                            setTestSuccess(null);
                          }}
                          className="h-3.5 w-3.5 text-blue-600"
                        />
                        Real Staging API
                      </label>
                    </div>

                    {!useMockMode && (
                      <div className="space-y-1.5 mt-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bearer JWT Token</label>
                        <Input
                          type="password"
                          placeholder="Paste staging Bearer token here..."
                          value={apiTokenInput}
                          onChange={(e) => setApiTokenInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={testRunning}
                        onClick={runLiveApiTest}
                        className="h-8 text-[11px] font-bold text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 rounded-lg px-4"
                      >
                        {testRunning ? "Testing Connection..." : "⚡ Run Live Endpoint Check"}
                      </Button>

                      {testRunning && <span className="text-[10px] text-slate-400 font-medium">Sending request...</span>}
                    </div>

                    {testSuccess && (
                      <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800 flex items-center gap-2">
                        {testSuccess}
                      </div>
                    )}

                    {testError && (
                      <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-800 flex items-center gap-2">
                        {testError}
                      </div>
                    )}
                  </div>
                )}

                {/* Real-time Playwright E2E Test Suite Runner */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Play className="w-4 h-4 text-purple-600" />
                      <h4 className="text-xs font-bold text-slate-800">Playwright E2E Test Runner</h4>
                    </div>
                    {e2eRunning && (
                      <Badge className="bg-purple-100 text-purple-750 border-none font-bold text-[9px] animate-pulse">
                        Running E2E...
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-555 leading-normal font-medium">
                    Menjalankan skenario pengujian E2E Playwright secara langsung pada server lokal Headless Browser. Log output akan ditampilkan secara real-time di bawah.
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={e2eRunning}
                      onClick={runPlaywrightE2ETest}
                      className="h-7 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700"
                    >
                      {e2eRunning ? "Running..." : "🚀 Run Playwright E2E Suite"}
                    </Button>
                    {e2eRunning && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={stopPlaywrightE2ETest}
                        className="h-7 text-[11px] font-bold text-red-650 hover:bg-red-50 border-red-200"
                      >
                        Stop Test
                      </Button>
                    )}
                  </div>

                  {/* Real-time Console Log Box */}
                  {(e2eLogs.length > 0 || e2eRunning) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                        <span>Console Output</span>
                        <span className="text-[9px] font-normal text-slate-400 capitalize">Real-time Stream</span>
                      </label>
                      <div className="bg-slate-900 text-slate-200 p-4 rounded-lg border border-slate-800 font-mono text-[10px] h-48 overflow-y-auto space-y-0.5 select-text shadow-inner">
                        {e2eLogs.map((log, index) => (
                          <div key={index} className={`leading-relaxed ${log.startsWith("[ERROR]") ? "text-rose-400 font-bold" : log.includes("✓") || log.includes("successful") || log.includes("passed") ? "text-emerald-400" : "text-slate-300"}`}>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failure screenshot preview */}
                  {e2eScreenshot && (
                    <div className="space-y-2.5 border border-red-200 p-4 rounded-lg bg-red-50/40">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                        E2E Failure Artifact Captured
                      </span>
                      <p className="text-[11px] text-red-800 leading-normal">
                        Langkah terakhir dari skenario pengujian gagal. Screenshot kegagalan telah disimpan sebagai dokumentasi bug.
                      </p>
                      <div className="border border-red-200 rounded-lg overflow-hidden bg-white max-w-sm shadow-sm">
                        <img src={e2eScreenshot} alt="E2E Failure screenshot" className="w-full h-auto object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Select Outcome, Actual Result, Notes) - 2/5 width */}
              <div className="lg:col-span-2 space-y-4 min-w-0">
                {/* Result Status Selector */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-3 border-slate-100">Select Test Outcome</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExecStatus("pass")}
                      className={`flex flex-col items-center justify-center py-3.5 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "pass"
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30 scale-[1.02]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                      }`}
                    >
                      <Check className="w-4 h-4 mb-1" />
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecStatus("fail")}
                      className={`flex flex-col items-center justify-center py-3.5 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "fail"
                          ? "bg-rose-600 border-rose-600 text-white shadow-md ring-2 ring-rose-500/30 scale-[1.02]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
                      }`}
                    >
                      <X className="w-4 h-4 mb-1" />
                      Fail
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecStatus("blocked")}
                      className={`flex flex-col items-center justify-center py-3.5 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "blocked"
                          ? "bg-amber-500 border-amber-500 text-white shadow-md ring-2 ring-amber-500/30 scale-[1.02]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 mb-1" />
                      Blocked
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecStatus("pending")}
                      className={`flex flex-col items-center justify-center py-3.5 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "pending"
                          ? "bg-slate-600 border-slate-600 text-white shadow-md ring-2 ring-slate-500/30 scale-[1.02]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800"
                      }`}
                    >
                      <Clock className="w-4 h-4 mb-1" />
                      Pending
                    </button>
                  </div>

                  {/* Automated Task Tracking Option */}
                  {(execStatus === "fail" || execStatus === "blocked") && (
                    isQA ? (
                      <div className="flex items-center gap-2.5 p-3 bg-red-50/40 border border-red-100 rounded-lg mt-2">
                        <input
                          type="checkbox"
                          id="createDefect"
                          checked={createDefect}
                          onChange={(e) => setCreateDefect(e.target.checked)}
                          className="h-4 w-4 rounded-md border-slate-300 text-red-600 focus:ring-red-500 focus:ring-offset-0"
                        />
                        <label htmlFor="createDefect" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer font-bold">
                          <Bug className="w-3.5 h-3.5 text-red-600" />
                          Auto-create defect task
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-2">
                        <Bug className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">
                          Auto-defect logging is restricted to the QA role.
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* Inputs: Actual Result & Notes */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Actual Result / Behavior</label>
                    <textarea
                      value={execActualResult}
                      onChange={(e) => setExecActualResult(e.target.value)}
                      placeholder="Describe what occurred during execution..."
                      className="w-full h-20 border border-input rounded-lg p-2.5 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Execution Notes / Comments</label>
                    <textarea
                      value={execNotes}
                      onChange={(e) => setExecNotes(e.target.value)}
                      placeholder="Notes, stacktrace references, details..."
                      className="w-full h-20 border border-input rounded-lg p-2.5 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Image / Video Link (Url Only)</label>
                    <input
                      type="url"
                      value={execAttachmentUrl}
                      onChange={(e) => setExecAttachmentUrl(e.target.value)}
                      placeholder="https://example.com/screenshot.png"
                      className="w-full border border-input rounded-lg p-2.5 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="py-5 px-6 border-t bg-slate-100 border-slate-200 flex-shrink-0 flex items-center justify-end gap-2 mx-0 mb-0">
            <Button variant="outline" onClick={() => setActiveExecCase(null)}>Cancel</Button>
            <Button onClick={submitExecution} disabled={execStatus === "pending" && !execActualResult}>
              Log Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
