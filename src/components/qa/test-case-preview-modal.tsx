"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pencil, 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Key, 
  Shield, 
  FileText, 
  ListTodo, 
  HelpCircle,
  Calendar,
  User,
  Activity,
  Copy,
  Check
} from "lucide-react";

interface TestCase {
  id: string;
  testPlanId: string;
  caseNumber: string;
  description: string;
  steps: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  status: string;
  notes: string | null;
  executedBy?: string | null;
  executedAt?: string | null;
  erpRole?: string | null;
  testType?: string | null;
  loginCredentials?: any;
}

interface TestCasePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCase | null;
  suiteName?: string;
  onEdit: (testCase: TestCase) => void;
  onRun: (testCase: TestCase) => void;
}

const statusColors: Record<string, string> = {
  pass: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200",
  fail: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border-rose-200",
  blocked: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200",
  pending: "bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 border-slate-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  fail: <XCircle className="w-4 h-4 text-rose-600" />,
  blocked: <AlertCircle className="w-4 h-4 text-amber-600" />,
  pending: <Clock className="w-4 h-4 text-slate-500" />,
};

export function TestCasePreviewModal({
  open,
  onOpenChange,
  testCase,
  suiteName,
  onEdit,
  onRun,
}: TestCasePreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [credsOpen, setCredsOpen] = useState(false);

  if (!testCase) return null;

  const stepsArray = testCase.steps
    ? testCase.steps.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  const formattedDate = testCase.executedAt
    ? new Date(testCase.executedAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const copyCredentials = () => {
    if (!testCase.loginCredentials) return;
    navigator.clipboard.writeText(JSON.stringify(testCase.loginCredentials, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render steps dynamically. Numbered items count sequentially, ignoring headers.
  let stepCounter = 1;
  const renderStep = (step: string, idx: number) => {
    const isHeader = step.endsWith(":") || 
                     step.startsWith("👑") || 
                     step.startsWith("👤") || 
                     step.startsWith("⭐") || 
                     step.includes("Scenarios") ||
                     step.includes("Role");

    if (isHeader) {
      return (
        <div key={idx} className="pt-3 pb-1 first:pt-0">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b pb-1.5 text-slate-900 border-slate-100">
            {step}
          </h4>
        </div>
      );
    }

    const currentNum = stepCounter;
    stepCounter += 1;

    return (
      <div key={idx} className="flex gap-3 text-xs text-slate-700 leading-relaxed pl-1.5">
        <span className="font-mono font-bold text-slate-500 bg-slate-100 w-5 h-5 flex items-center justify-center rounded flex-shrink-0 mt-0.5">
          {currentNum}
        </span>
        <span className="pt-0.5">{step}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 border-slate-200 overflow-hidden">
        
        {/* Modal Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold bg-white/20 text-white border border-white/10 px-2.5 py-0.5 rounded backdrop-blur-sm">
              {testCase.caseNumber}
            </span>
            {suiteName && (
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                {suiteName}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-extrabold text-white tracking-tight leading-snug">
            {testCase.description}
          </DialogTitle>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 overflow-y-auto overflow-x-hidden">
          
          {/* Left Area (Steps & Behaviors) - 3/5 Columns */}
          <div className="lg:col-span-3 space-y-6 min-w-0">
            
            {/* Steps Section */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-100">
                <ListTodo className="w-4 h-4 text-slate-500" />
                <span>Test Execution Steps</span>
              </h3>
              {stepsArray.length > 0 ? (
                <div className="space-y-2.5">
                  {stepsArray.map((step, idx) => renderStep(step, idx))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No steps defined for this scenario.</p>
              )}
            </div>

            {/* Expected Result */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-100">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>Expected Behavior</span>
              </h3>
              {testCase.expectedResult ? (
                <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-lg text-xs text-slate-700 font-semibold leading-relaxed">
                  {testCase.expectedResult}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No expected result specified.</p>
              )}
            </div>

            {/* Execution Result Details */}
            {(testCase.actualResult || testCase.notes) && (
              <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-100">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Latest Run Log</span>
                </h3>
                
                {testCase.actualResult && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Actual Result</span>
                    <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono max-h-40 overflow-y-auto leading-normal whitespace-pre-wrap break-all break-words">
                      {testCase.actualResult}
                    </pre>
                  </div>
                )}

                {testCase.notes && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Execution Notes</span>
                    <div className="p-3.5 bg-slate-50 border rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border-slate-200">
                      {testCase.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar (Metadata) - 2/5 Columns */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            
            {/* Status Card */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Test Status</span>
              <div className="flex items-center">
                <Badge variant="outline" className={`font-bold text-xs uppercase tracking-wider px-3 py-1 flex items-center gap-1.5 ${statusColors[testCase.status]}`}>
                  {statusIcons[testCase.status]}
                  <span>{testCase.status}</span>
                </Badge>
              </div>
            </div>

            {/* Environment Parameters Grid */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 border-slate-100">Environment Params</h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                  <span className="text-slate-450 font-bold uppercase text-[9px] block mb-1 tracking-wide">Target Role</span>
                  <Badge variant="outline" className="font-semibold text-purple-700 bg-purple-50 border-purple-200 uppercase tracking-wide text-[10px] px-2 py-0">
                    {testCase.erpRole || "Any Role"}
                  </Badge>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                  <span className="text-slate-450 font-bold uppercase text-[9px] block mb-1 tracking-wide">Method</span>
                  <span className="font-bold text-slate-700 capitalize text-xs">
                    {testCase.testType || "Functional"}
                  </span>
                </div>

                {testCase.executedBy && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg col-span-2">
                    <span className="text-slate-455 font-bold uppercase text-[9px] block mb-1 tracking-wide">Tester</span>
                    <span className="font-semibold text-slate-750 text-xs block">
                      {testCase.executedBy}
                    </span>
                  </div>
                )}

                {formattedDate && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg col-span-2">
                    <span className="text-slate-455 font-bold uppercase text-[9px] block mb-1 tracking-wide">Last Executed</span>
                    <span className="font-mono text-slate-700 font-semibold text-[10px] block">
                      {formattedDate}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Login Credentials Context */}
            {testCase.loginCredentials && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all">
                <div 
                  className="bg-slate-50 px-4 py-2.5 border-b flex justify-between items-center border-slate-100 cursor-pointer select-none"
                  onClick={() => setCredsOpen(!credsOpen)}
                >
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>Credentials</span>
                  </h3>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900"
                      onClick={copyCredentials}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {credsOpen ? "Hide" : "Show"}
                    </span>
                  </div>
                </div>
                {credsOpen && (
                  <div className="p-3.5 bg-slate-950">
                    <pre className="text-emerald-400 text-[10px] font-mono whitespace-pre-wrap break-all break-words max-h-56 overflow-y-auto leading-normal">
                      {JSON.stringify(testCase.loginCredentials, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="bg-slate-100 py-5 px-6 border-t flex items-center justify-between gap-2 border-slate-200 flex-shrink-0 mx-0 mb-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold h-9 px-4"
          >
            Close Preview
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onEdit(testCase);
              }}
              className="text-xs font-semibold h-9 gap-1.5 px-4"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              Edit Scenario
            </Button>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onRun(testCase);
              }}
              className="text-xs font-bold h-9 gap-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Test Case
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
