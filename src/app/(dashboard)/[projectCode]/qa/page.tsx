/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  ChevronRight, 
  Search, 
  Play, 
  Bug, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  FileText,
  Clock,
  ArrowLeft,
  Activity,
  ListTodo,
  Pencil,
  Trash2,
  RefreshCw
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { TestCasePreviewModal } from "@/components/qa/test-case-preview-modal";

interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  module: string;
  status: string;
}

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
  loginCredentials?: Record<string, unknown> | null;
  attachmentUrl?: string | null;
}

interface Project {
  id: string;
  name: string;
}

const modules = ["Pemasok", "Pelanggan", "Barang", "Katalog Lain", "Pengaturan", "Keuangan", "Kinerja"];

const moduleToEpicMap: Record<string, string> = {
  "Pemasok": "PUR",
  "Pelanggan": "SLS",
  "Barang": "INV",
  "Katalog Lain": "MST",
  "Pengaturan": "ADM",
  "Keuangan": "FIN",
  "Kinerja": "RPT",
};

/**
 * Fetches ERP role credentials from the secure server-side endpoint.
 * Credentials are NEVER stored in client-side code.
 */
const fetchCredentialsForRole = async (role: string): Promise<string> => {
  try {
    const res = await fetch(`/api/qa/credentials?role=${encodeURIComponent(role)}`);
    if (!res.ok) return "";
    const data = await res.json();
    return JSON.stringify(data, null, 2);
  } catch {
    return "";
  }
};

export default function QAPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const projectCode = params?.projectCode as string;

  const userRole = (session?.user as { role?: string })?.role || "user";
  const isQA = userRole === "qa";
  const canAccessQA = userRole === "admin" || userRole === "pm" || userRole === "qa";

  // Access guard: redirect unauthorised roles away from this page
  useEffect(() => {
    if (session && !canAccessQA) {
      router.replace(`/${projectCode}/dashboard`);
    }
  }, [session, canAccessQA, router, projectCode]);

  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCase, setPreviewCase] = useState<TestCase | null>(null);

  // Search & Filters
  const [planSearch, setPlanSearch] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Dialog Toggles
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showNewCase, setShowNewCase] = useState(false);
  const [activeExecCase, setActiveExecCase] = useState<TestCase | null>(null);

  // New Plan fields
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanModule, setNewPlanModule] = useState("");

  // New Case fields
  const [newCaseNumber, setNewCaseNumber] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [newCaseSteps, setNewCaseSteps] = useState("");
  const [newCaseExpected, setNewCaseExpected] = useState("");
  const [newCaseErpRole, setNewCaseErpRole] = useState("");
  const [newCaseTestType, setNewCaseTestType] = useState("functional");
  const [newCaseLoginCreds, setNewCaseLoginCreds] = useState("");

  // Edit Plan state
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanModule, setEditPlanModule] = useState("");

  // Edit Case state
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [showEditCase, setShowEditCase] = useState(false);
  const [editCaseNumber, setEditCaseNumber] = useState("");
  const [editCaseDesc, setEditCaseDesc] = useState("");
  const [editCaseSteps, setEditCaseSteps] = useState("");
  const [editCaseExpected, setEditCaseExpected] = useState("");

  // Execution state
  const [execStatus, setExecStatus] = useState<string>("pending");
  const [execActualResult, setExecActualResult] = useState("");
  const [execNotes, setExecNotes] = useState("");
  const [execAttachmentUrl, setExecAttachmentUrl] = useState("");
  const [createDefect, setCreateDefect] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Live API Testing state
  const [useMockMode, setUseMockMode] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [apiTokenInput, setApiTokenInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Playwright E2E runner state
  const [e2eLogs, setE2eLogs] = useState<string[]>([]);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eScreenshot, setE2eScreenshot] = useState<string | null>(null);
  const [e2eEventSource, setE2eEventSource] = useState<EventSource | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const plansUrl = projectCode ? `/api/test-plans?projectCode=${projectCode}` : "/api/test-plans";
      const casesUrl = projectCode ? `/api/test-cases?projectCode=${projectCode}` : "/api/test-cases";
      const [plansRes, casesRes, projectsRes] = await Promise.all([
        fetch(plansUrl),
        fetch(casesUrl),
        fetch("/api/projects"),
      ]);
      if (plansRes.ok) setTestPlans(await plansRes.json());
      if (casesRes.ok) setTestCases(await casesRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (e) {
      console.error("Failed to load QA data:", e);
    } finally {
      setLoading(false);
    }
  }, [projectCode]);

  async function handleSyncSheets() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "qa" }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastSyncedAt(new Date().toLocaleTimeString());
        alert(`QA Sheets sync success!\nScope: ${data.scope}\nTest Plans: ${data.testPlansCount}\nTest Cases: ${data.testCasesCount}`);
        fetchData();
      } else {
        alert(`Sync error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync QA data with Google Sheets");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planIdParam = params.get("planId");
      if (planIdParam) {
        setSelectedPlan(planIdParam);
      }
    }
  }, [fetchData]);

  useEffect(() => {
    if (newCaseErpRole && !newCaseLoginCreds) {
      fetchCredentialsForRole(newCaseErpRole).then(creds => {
        if (creds) setNewCaseLoginCreds(creds);
      });
    }
  }, [newCaseErpRole, newCaseLoginCreds]);

  async function createPlan() {
    if (!newPlanName || !newPlanModule) return;
    await fetch("/api/test-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlanName, module: newPlanModule, projectCode }),
    });
    setNewPlanName("");
    setNewPlanModule("");
    setShowNewPlan(false);
    fetchData();
  }

  async function createCase() {
    if (!newCaseNumber || !newCaseDesc || !selectedPlan) return;
    await fetch("/api/test-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        caseNumber: newCaseNumber, 
        description: newCaseDesc, 
        testPlanId: selectedPlan,
        steps: newCaseSteps || null,
        expectedResult: newCaseExpected || null,
        erpRole: newCaseErpRole || null,
        testType: newCaseTestType || "functional",
        loginCredentials: newCaseLoginCreds ? JSON.parse(newCaseLoginCreds) : null,
      }),
    });
    setNewCaseNumber("");
    setNewCaseDesc("");
    setNewCaseSteps("");
    setNewCaseExpected("");
    setNewCaseErpRole("");
    setNewCaseTestType("functional");
    setNewCaseLoginCreds("");
    setShowNewCase(false);
    fetchData();
  }

  // Edit & Delete Test Plan (Suite)
  function openEditPlan(plan: TestPlan) {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanModule(plan.module);
    setShowEditPlan(true);
  }

  async function updatePlan() {
    if (!editingPlan || !editPlanName || !editPlanModule) return;
    await fetch(`/api/test-plans/${editingPlan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editPlanName, module: editPlanModule }),
    });
    setEditingPlan(null);
    setShowEditPlan(false);
    fetchData();
  }

  async function deletePlan(id: string) {
    if (!confirm("Are you sure you want to delete this test plan suite?")) return;
    await fetch(`/api/test-plans/${id}`, {
      method: "DELETE",
    });
    if (selectedPlan === id) {
      setSelectedPlan(null);
    }
    fetchData();
  }

  // Edit & Delete Test Case (Scenario)
  function openEditCase(tc: TestCase) {
    setEditingCase(tc);
    setEditCaseNumber(tc.caseNumber);
    setEditCaseDesc(tc.description);
    setEditCaseSteps(tc.steps || "");
    setEditCaseExpected(tc.expectedResult || "");
    setShowEditCase(true);
  }

  async function updateCase() {
    if (!editingCase || !editCaseNumber || !editCaseDesc) return;
    await fetch(`/api/test-cases/${editingCase.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseNumber: editCaseNumber,
        description: editCaseDesc,
        steps: editCaseSteps || null,
        expectedResult: editCaseExpected || null,
      }),
    });
    setEditingCase(null);
    setShowEditCase(false);
    fetchData();
  }

  async function deleteCase(id: string) {
    if (!confirm("Are you sure you want to delete this test case?")) return;
    await fetch(`/api/test-cases/${id}`, {
      method: "DELETE",
    });
    fetchData();
  }

  async function submitExecution() {
    if (!activeExecCase) return;

    // 1. Update the Test Case status and notes
    const updateRes = await fetch("/api/test-cases", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeExecCase.id,
        status: execStatus,
        actualResult: execActualResult || null,
        notes: execNotes || null,
        attachmentUrl: execAttachmentUrl || null,
        executedAt: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      console.error("Failed to execute test case");
      return;
    }

    // 2. Automated Defect Creation if FAIL/BLOCKED
    let defectCreated = false;
    if (createDefect && (execStatus === "fail" || execStatus === "blocked")) {
      const selectedPlanData = testPlans.find((p) => p.id === selectedPlan);
      const projectId = selectedPlanData?.projectId || (projects[0]?.id || "");
      const bugCode = `BUG-QA-${activeExecCase.caseNumber.replace(/[^A-Za-z0-9]/g, "")}`;

      const bugRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: `[DEFECT] ${activeExecCase.caseNumber}: ${activeExecCase.description}`,
          description: `### Test Case Details\n- **Case**: ${activeExecCase.caseNumber}\n- **Scenario**: ${activeExecCase.description}\n\n### Expected Result\n${activeExecCase.expectedResult || "None"}\n\n### Actual Result\n${execActualResult || "No actual result provided"}\n\n### Notes\n${execNotes || "None"}` + (execAttachmentUrl ? `\n\n### Attachment\n${execAttachmentUrl}` : ""),
          status: "todo",
          priority: execStatus === "fail" ? "high" : "medium",
          taskCode: bugCode,
          epic: "BUG",
          feature: "Defect",
          progress: 0,
          blocker: execStatus === "blocked" ? "Blocked during QA execution" : null,
          phase: "Phase 1",
          screenshotUrl: execAttachmentUrl || null,
        }),
      });
      if (bugRes.ok) {
        defectCreated = true;
      }
    }

    // Reset and refresh
    setActiveExecCase(null);
    setExecStatus("pending");
    setExecActualResult("");
    setExecNotes("");
    setExecAttachmentUrl("");
    setCreateDefect(false);
    setCheckedSteps({});
    setTestError(null);
    setTestSuccess(null);
    fetchData();

    if (defectCreated) {
      router.push(`/${projectCode}/tasks`);
    }
  }

  const stopPlaywrightE2ETest = useCallback(() => {
    if (e2eEventSource) {
      e2eEventSource.close();
    }
    setE2eRunning(false);
    setE2eLogs((prev) => [...prev, "■ Execution aborted by user."]);
  }, [e2eEventSource]);

  const runPlaywrightE2ETest = () => {
    setE2eRunning(true);
    setE2eLogs([]);
    setE2eScreenshot(null);

    const eventSource = new EventSource("/api/test-cases/run-stream");
    setE2eEventSource(eventSource);

    eventSource.addEventListener("log", (event) => {
      setE2eLogs((prev) => [...prev, event.data]);
    });

    eventSource.addEventListener("screenshot", (event) => {
      const screenshotPath = event.data;
      setE2eScreenshot(screenshotPath);
      setExecAttachmentUrl(screenshotPath);
      setExecStatus("fail");
      setExecActualResult(`Skenario pengujian E2E gagal. Screenshot kegagalan: ${screenshotPath}`);
      if (userRole === "qa" || userRole === "admin" || userRole === "pm") {
        setCreateDefect(true);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      setE2eRunning(false);
    };
  };

  // Pre-fill execution modal values when active test case changes
  const startExecution = (tc: TestCase) => {
    setActiveExecCase(tc);
    setExecStatus(tc.status);
    setExecActualResult(tc.actualResult || "");
    setExecNotes(tc.notes || "");
    setExecAttachmentUrl(tc.attachmentUrl || "");
    setCreateDefect(false);
    setCheckedSteps({});
    setTestError(null);
    setTestSuccess(null);
    
    // Clear E2E states
    setE2eLogs([]);
    setE2eRunning(false);
    setE2eScreenshot(null);
    if (e2eEventSource) {
      e2eEventSource.close();
      setE2eEventSource(null);
    }
  };

  const getApiEndpointForCase = (caseNumber: string, description: string): string | null => {
    const text = (caseNumber + " " + description).toLowerCase();
    
    if (text.includes("klien") || text.includes("client") || text.includes("pelanggan") || text.includes("customer")) return "MasClient";
    if (text.includes("controlling area") || text.includes("area pengendalian") || text.includes("controllingarea")) return "MasControllingArea";
    if (text.includes("company code") || text.includes("kode perusahaan") || text.includes("companycode")) return "MasCompanyCode";
    if (text.includes("plant") || text.includes("pabrik")) return "MasPlant";
    
    // Separate Storage Location from Gudang based on new schema
    if (text.includes("storage location") || text.includes("lokasi penyimpanan") || text.includes("sloc")) return "MasStorageLocation";
    if (text.includes("gudang")) return "MasGudang";
    
    if (text.includes("purchasing org") || text.includes("organisasi pembelian") || text.includes("purchasingorg")) return "MasPurchasingORG";
    if (text.includes("sales org") || text.includes("organisasi penjualan") || text.includes("salesorg")) return "MasSalesORG";
    if (text.includes("sales division") || text.includes("divisi penjualan") || text.includes("salesdivision")) return "MasSalesDivision";
    if (text.includes("sales channel") || text.includes("saluran penjualan") || text.includes("saleschannel")) return "MasSalesChannel";
    if (text.includes("sales group") || text.includes("grup penjualan") || text.includes("salesgroup")) return "MasSalesGroup";
    if (text.includes("cost center") || text.includes("pusat biaya") || text.includes("costcenter")) return "MasCostCenter";
    if (text.includes("profit center") || text.includes("pusat laba") || text.includes("profitcenter")) return "MasProfitCenter";
    if (text.includes("tax group") || text.includes("grup pajak") || text.includes("taxgroup")) return "MasTaxGroup";
    if (text.includes("barang") || text.includes("produk") || text.includes("product") || text.includes("item")) return "MasProduk";
    
    // New Steel-Specific Masters
    if (text.includes("tebal")) return "MasTebal";
    if (text.includes("berat")) return "MasBerat";
    if (text.includes("kelompok warna")) return "MasKelompokWarna";
    if (text.includes("warna")) return "MasWarna";
    if (text.includes("brand")) return "MasBrand";
    if (text.includes("merek") || text.includes("merk")) return "MasMerk";
    if (text.includes("yield")) return "MasYield";
    if (text.includes("az")) return "MasAz";
    if (text.includes("jenis")) return "MasJenis";
    if (text.includes("mesin")) return "MasMesin";
    if (text.includes("checker")) return "MasChecker";
    if (text.includes("area") && !text.includes("controlling")) return "MasArea";
    
    return null;
  };

  const runLiveApiTest = async () => {
    if (!selectedPlanData?.module || !activeExecCase) return;

    const tableName = getApiEndpointForCase(activeExecCase.caseNumber, activeExecCase.description);
    if (!tableName) {
      setTestError("This test case does not map directly to a Master Data API endpoint.");
      return;
    }

    setTestRunning(true);
    setTestError(null);
    setTestSuccess(null);

    let url = "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    const isProduct = tableName === "MasProduk";
    const queryString = isProduct ? "?jenisBaku=BAKU" : "";

    if (useMockMode) {
      url = `/api/erp-mock/${tableName}${queryString}`;
    } else {
      url = `https://erp-api.padajaya.biz.id/api/${tableName}/getAll${queryString}`;
      if (apiTokenInput) {
        let cleanToken = apiTokenInput.trim();
        if (cleanToken.toLowerCase().startsWith("bearer ")) {
          cleanToken = cleanToken.slice(7);
        }
        headers["Authorization"] = `Bearer ${cleanToken}`;
      }
    }

    try {
      const res = await fetch(url, { headers });
      const status = res.status;
      if (res.ok) {
        const data = await res.json();
        const recordsCount = Array.isArray(data) ? data.length : 1;
        const msg = `[200 OK] Connection successful! Retrieved ${recordsCount} record(s) from ${useMockMode ? "Local Mock API" : "Staging Server"}.`;
        setTestSuccess(msg);
        setExecStatus("pass");
        setExecActualResult(msg);
        setExecNotes(`Endpoint: ${url}\nAuth: ${useMockMode ? "None (Mock)" : "Bearer JWT"}`);
      } else {
        let errMsg = `[${status} ${res.statusText || "Error"}] `;
        try {
          const body = await res.json();
          errMsg += body.error || body.message || JSON.stringify(body);
        } catch {
          errMsg += `Failed to query server endpoint.`;
        }
        setTestError(errMsg);
        setExecStatus("fail");
        setExecActualResult(errMsg);
        setExecNotes(`Endpoint failed: ${url}\nResponse status: ${status}`);
        if ((session?.user as { role?: string })?.role === "qa") {
          setCreateDefect(true);
        }
      }
    } catch (err) {
      const errMsg = `[Network Error] Could not connect to the API server: ${(err as Error).message || String(err)}`;
      setTestError(errMsg);
      setExecStatus("fail");
      setExecActualResult(errMsg);
      setExecNotes(`Endpoint failed: ${url}\nDetails: ${(err as Error).message || String(err)}`);
      if ((session?.user as { role?: string })?.role === "qa") {
        setCreateDefect(true);
      }
    } finally {
      setTestRunning(false);
    }
  };

  // Filter test plans based on search
  const filteredPlans = testPlans.filter((p) =>
    p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
    p.module.toLowerCase().includes(planSearch.toLowerCase())
  );

  // Filter test cases based on selection, status, and search
  const filteredCases = testCases.filter((c) => {
    if (selectedPlan && c.testPlanId !== selectedPlan) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (roleFilter !== "all" && c.erpRole !== roleFilter) return false;
    if (caseSearch) {
      const query = caseSearch.toLowerCase();
      return (
        c.caseNumber.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        (c.expectedResult && c.expectedResult.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const selectedPlanData = testPlans.find((p) => p.id === selectedPlan);

  // Global test stats
  const totalCasesCount = testCases.length;
  const passedCasesCount = testCases.filter((c) => c.status === "pass").length;
  const failedCasesCount = testCases.filter((c) => c.status === "fail").length;
  const blockedCasesCount = testCases.filter((c) => c.status === "blocked").length;
  const executedCasesCount = passedCasesCount + failedCasesCount + blockedCasesCount;
  
  const executionRate = totalCasesCount > 0 ? Math.round((executedCasesCount / totalCasesCount) * 100) : 0;
  const passRate = executedCasesCount > 0 ? Math.round((passedCasesCount / executedCasesCount) * 100) : 0;

  // Module stats aggregation
  const moduleStats = modules.map((mod) => {
    const plansForMod = testPlans.filter((p) => p.module === mod);
    const planIds = plansForMod.map((p) => p.id);
    const cases = testCases.filter((c) => planIds.includes(c.testPlanId));
    
    const pass = cases.filter((c) => c.status === "pass").length;
    const fail = cases.filter((c) => c.status === "fail").length;
    const blocked = cases.filter((c) => c.status === "blocked").length;
    const pending = cases.filter((c) => c.status === "pending").length;
    
    return {
      module: mod,
      plansCount: plansForMod.length,
      total: cases.length,
      pass,
      fail,
      blocked,
      pending,
      progress: cases.length > 0 ? Math.round(((pass + fail + blocked) / cases.length) * 100) : 0
    };
  });

  // Steps splitter helper
  const stepsArray = activeExecCase?.steps 
    ? activeExecCase.steps.split("\n").map(s => s.trim()).filter(Boolean) 
    : [];

  return (
    <AppLayout className="p-0 h-full overflow-hidden">
      <div className="flex h-full w-full overflow-hidden">
        
        {/* Left Pane: Test Plan Navigator */}
        <div className="w-80 flex-shrink-0 border-r bg-white flex flex-col h-full">
          <div className="p-3 border-b flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Test Suites</h2>
              <Button size="icon-xs" variant="ghost" onClick={() => setShowNewPlan(true)} title="New Test Plan">
                <Plus className="w-3.5 h-3.5 text-slate-500" />
              </Button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <Input
                placeholder="Search plans or modules..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                className="pl-8 text-xs h-7.5 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedPlan(null)}
              className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                !selectedPlan 
                  ? "bg-blue-50/70 text-blue-700 border-l-4 border-blue-600 font-bold" 
                  : "text-slate-650 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {isQA ? (
                  <Activity className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>Global Dashboard Analytics</span>
                {!isQA && (
                  <Badge variant="outline" className="text-[9px] scale-90 px-1.5 py-0 border-slate-300 text-slate-400">
                    Locked
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <div className="border-t my-1.5" />

            {filteredPlans.map((plan) => {
              const cases = testCases.filter((c) => c.testPlanId === plan.id);
              const executed = cases.filter((c) => c.status !== "pending").length;
              const percent = cases.length > 0 ? Math.round((executed / cases.length) * 100) : 0;
              
              return (
                <div
                  key={plan.id}
                  className={`w-full text-left p-2 rounded-lg transition-all border border-transparent cursor-pointer group relative ${
                    selectedPlan === plan.id
                      ? "bg-slate-100 border-slate-200 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50/85 hover:border-slate-100"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{plan.module}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold text-slate-500">{executed}/{cases.length} cases</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-5 h-5 p-0 rounded-full hover:bg-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPlan(plan);
                          }}
                        >
                          <Pencil className="w-3 h-3 text-slate-500 hover:text-slate-700" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-5 h-5 p-0 rounded-full hover:bg-slate-200 hover:text-red-650"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlan(plan.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-650" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 truncate mt-0.5 pr-8">{plan.name}</h4>
                  
                  {/* Miniature progress bar */}
                  <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden flex">
                    <div 
                      className={`h-full ${percent === 100 ? "bg-emerald-500" : "bg-blue-500"}`} 
                      style={{ width: `${percent}%` }} 
                    />
                  </div>
                </div>
              );
            })}

            {filteredPlans.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No test plans found.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden px-4 py-2.5">
          
          {/* Active Workspace: Global Analytics Dashboard */}
          {!selectedPlan ? (
            !isQA ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/40 rounded-2xl border border-slate-100/50">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Analytics Console Restricted</h2>
                <p className="text-sm text-slate-500 max-w-md mt-2">
                  The Global Dashboard Analytics console is restricted to the <strong>QA Role</strong> only. Please select a specific test plan from the sidebar to view and execute test cases.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 min-w-0 pr-2">
                
                {/* Heading */}
                <div className="flex items-baseline justify-between flex-shrink-0">
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-lg font-bold text-slate-800">QA Testing Console</h1>
                    <p className="text-xs text-slate-500 font-medium">Global quality assurance metrics and active testing suites.</p>
                  </div>
                  <ExportButton data={testCases} filename="all_qa_test_cases" label="Export All Cases" size="sm" />
                </div>

                {/* Stat Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-shrink-0">
                  <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total Test Cases</p>
                        <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalCasesCount}</h3>
                        <p className="text-[10px] text-slate-500 mt-1">{testPlans.length} active suites</p>
                      </div>
                      <div className="p-2.5 bg-blue-100/50 text-blue-600 rounded-full"><FileText className="w-5 h-5" /></div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Pass Rate (Success)</p>
                        <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{passRate}%</h3>
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">{passedCasesCount} cases passed</p>
                      </div>
                      <div className="p-2.5 bg-emerald-100/50 text-emerald-600 rounded-full"><CheckCircle2 className="w-5 h-5" /></div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Failures Detected</p>
                        <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{failedCasesCount}</h3>
                        <p className="text-[10px] text-rose-650 font-medium mt-1">{failedCasesCount} active bugs logged</p>
                      </div>
                      <div className="p-2.5 bg-rose-100/50 text-rose-600 rounded-full"><XCircle className="w-5 h-5" /></div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Execution Progress</p>
                        <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{executionRate}%</h3>
                        <p className="text-[10px] text-slate-500 mt-1">{executedCasesCount} executed / {totalCasesCount}</p>
                      </div>
                      <div className="p-2.5 bg-amber-100/50 text-amber-600 rounded-full"><Activity className="w-5 h-5" /></div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Tracker Panel */}
                <Card className="bg-white">
                  <CardHeader className="pb-1 p-3">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Execution Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3 pt-0">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{executedCasesCount} of {totalCasesCount} test cases completed</span>
                      <span>{executionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(passedCasesCount / totalCasesCount) * 100 || 0}%` }} title="Passed" />
                      <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(failedCasesCount / totalCasesCount) * 100 || 0}%` }} title="Failed" />
                      <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(blockedCasesCount / totalCasesCount) * 100 || 0}%` }} title="Blocked" />
                    </div>
                    <div className="flex gap-4 text-[11px] font-medium text-slate-500 pt-0.5">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Passed ({passedCasesCount})</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Failed ({failedCasesCount})</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Blocked ({blockedCasesCount})</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200" /> Pending ({totalCasesCount - executedCasesCount})</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Module Execution Breakdown */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Breakdown by Module</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {moduleStats.map((s) => (
                      <Card key={s.module} className="bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition-all border border-slate-100">
                        <CardContent className="p-3 space-y-2.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">EPIC: {moduleToEpicMap[s.module] || "ADM"}</span>
                              <h4 className="text-xs font-semibold text-slate-800 mt-1">{s.module}</h4>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">{s.plansCount} plans</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Total Cases: <span className="font-semibold text-slate-800">{s.total}</span></span>
                            <span className="font-bold text-blue-600">{s.progress}%</span>
                          </div>
                          {/* Compact stacked progress bar */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${s.total > 0 ? (s.pass / s.total) * 100 : 0}%` }} />
                            <div className="h-full bg-rose-500" style={{ width: `${s.total > 0 ? (s.fail / s.total) * 100 : 0}%` }} />
                            <div className="h-full bg-amber-500" style={{ width: `${s.total > 0 ? (s.blocked / s.total) * 100 : 0}%` }} />
                          </div>
                          <div className="grid grid-cols-3 text-center text-[9px] font-bold border-t pt-2 gap-1 text-slate-600">
                            <div className="bg-emerald-50 text-emerald-700 py-0.5 rounded">{s.pass} P</div>
                            <div className="bg-rose-50 text-rose-700 py-0.5 rounded">{s.fail} F</div>
                            <div className="bg-amber-50 text-amber-700 py-0.5 rounded">{s.blocked} B</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
          )
        ) : (
            
            // Active Workspace: Test Suite Editor & Executor
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
              <div className="flex-shrink-0 flex gap-2 items-center mb-2.5">
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
                    <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b">
                      <TableRow>
                        <TableHead className="w-24 px-3 py-2 text-[11px] font-bold">Case ID</TableHead>
                        <TableHead className="w-1/3 px-3 py-2 text-[11px] font-bold">Scenario</TableHead>
                        <TableHead className="w-1/4 px-3 py-2 text-[11px] font-bold">Expected Behavior</TableHead>
                        <TableHead className="w-36 px-3 py-2 text-[11px] font-bold">Status</TableHead>
                        <TableHead className="px-3 py-2 text-[11px] font-bold">Notes</TableHead>
                        <TableHead className="w-36 text-right pr-3 py-2 text-[11px] font-bold">Execution</TableHead>
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
                              className={`transition-all border-b cursor-pointer hover:bg-slate-50/70 ${statusBg}`}
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
                                      tc.status === "pass" ? "bg-emerald-600 text-white" :
                                      tc.status === "fail" ? "bg-rose-600 text-white" :
                                      tc.status === "blocked" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                      "bg-slate-100 text-slate-600"
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
          )}

        </div>

      </div>

      {/* Dialog: Create New Test Plan */}
      <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Test Plan Suite</DialogTitle>
            <DialogDescription>Create a test suite associated with a specific project module.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Suite Name</label>
              <Input placeholder="e.g. Pemasok - Katalog Pemasok" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">ERP Module</label>
              <Select value={newPlanModule} onValueChange={(v) => setNewPlanModule(v || "")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPlan(false)}>Cancel</Button>
            <Button onClick={createPlan} disabled={!newPlanName || !newPlanModule}>Create Suite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create New Test Case */}
      <Dialog open={showNewCase} onOpenChange={setShowNewCase}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Test Case Scenario</DialogTitle>
            <DialogDescription>Add a test scenario with steps and expectations for execution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Case ID</label>
                <Input placeholder="e.g. TC-001" value={newCaseNumber} onChange={(e) => setNewCaseNumber(e.target.value)} className="font-mono" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Scenario Description</label>
                <Input placeholder="Verify supplier list pagination works" value={newCaseDesc} onChange={(e) => setNewCaseDesc(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Test Steps (Line-by-line)</span>
                <span className="text-[10px] text-slate-400 font-normal">Press Enter for next step</span>
              </label>
              <textarea 
                value={newCaseSteps} 
                onChange={(e) => setNewCaseSteps(e.target.value)}
                placeholder="1. Go to Master Supplier screen&#10;2. Verify supplier entries render&#10;3. Click Page 2 button"
                className="w-full h-24 border border-input rounded-lg p-2.5 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Expected Result</label>
              <Input placeholder="Supplier table pagination switches smoothly to page 2" value={newCaseExpected} onChange={(e) => setNewCaseExpected(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">ERP Role</label>
                <Select value={newCaseErpRole} onValueChange={(v) => setNewCaseErpRole(v || "")}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator"> Administrator</SelectItem>
                    <SelectItem value="top_user">⭐ Top User</SelectItem>
                    <SelectItem value="user">👤 User</SelectItem>
                    <SelectItem value="matrix">🔄 Matrix (All Roles)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Test Type</label>
                <Select value={newCaseTestType} onValueChange={(v) => setNewCaseTestType(v || "functional")}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Test Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="matrix">Matrix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Login Credentials (JSON)</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-filled based on role</span>
              </label>
              <textarea
                value={newCaseLoginCreds}
                onChange={(e) => setNewCaseLoginCreds(e.target.value)}
                placeholder={`{\n  "type": "single",\n  "username": "...",\n  "password": "...",\n  "role": "administrator"\n}`}
                className="w-full h-20 border border-input rounded-lg p-2.5 text-xs font-mono focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCase(false)}>Cancel</Button>
            <Button onClick={createCase} disabled={!newCaseNumber || !newCaseDesc}>Add Scenario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Test Plan */}
      <Dialog open={showEditPlan} onOpenChange={setShowEditPlan}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Test Plan Suite</DialogTitle>
            <DialogDescription>Modify test suite details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Suite Name</label>
              <Input placeholder="e.g. Pemasok - Katalog Pemasok" value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">ERP Module</label>
              <Select value={editPlanModule} onValueChange={(v) => setEditPlanModule(v || "")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditPlan(false); setEditingPlan(null); }}>Cancel</Button>
            <Button onClick={updatePlan} disabled={!editPlanName || !editPlanModule}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Test Case */}
      <Dialog open={showEditCase} onOpenChange={setShowEditCase}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Test Case Scenario</DialogTitle>
            <DialogDescription>Modify test scenario details, steps, and expected results.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Case ID</label>
                <Input placeholder="e.g. TC-001" value={editCaseNumber} onChange={(e) => setEditCaseNumber(e.target.value)} className="font-mono" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Scenario Description</label>
                <Input placeholder="Verify supplier list pagination works" value={editCaseDesc} onChange={(e) => setEditCaseDesc(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Test Steps (Line-by-line)</span>
                <span className="text-[10px] text-slate-400 font-normal">Press Enter for next step</span>
              </label>
              <textarea 
                value={editCaseSteps} 
                onChange={(e) => setEditCaseSteps(e.target.value)}
                placeholder="1. Go to Master Supplier screen&#10;2. Verify supplier entries render&#10;3. Click Page 2 button"
                className="w-full h-24 border border-input rounded-lg p-2.5 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Expected Result</label>
              <Input placeholder="Supplier table pagination switches smoothly to page 2" value={editCaseExpected} onChange={(e) => setEditCaseExpected(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditCase(false); setEditingCase(null); }}>Cancel</Button>
            <Button onClick={updateCase} disabled={!editCaseNumber || !editCaseDesc}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Interactive Test Runner Execution Dialog */}
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
                  <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b pb-2 border-slate-100">
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
                          <label key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                            <input
                              type="checkbox"
                              checked={!!checkedSteps[idx]}
                              onChange={(e) => setCheckedSteps({ ...checkedSteps, [idx]: e.target.checked })}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`text-xs ${checkedSteps[idx] ? "line-through text-slate-400 font-medium" : "text-slate-700 font-medium"}`}>
                              {step}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                )}

                {/* Expected Behavior */}
                {activeExecCase?.expectedResult && (
                  <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b pb-2 border-slate-100">
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
                  <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                        <h4 className="text-xs font-bold text-slate-800">Live API Connection Tester</h4>
                      </div>
                      <Badge variant="secondary" className="text-[9px] font-bold">
                        {useMockMode ? "Mock Mode" : "Real Server"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
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
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bearer JWT Token</label>
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
                        className="h-7 text-[11px] font-bold text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100/70"
                      >
                        {testRunning ? "Testing Connection..." : "⚡ Run Live Endpoint Check"}
                      </Button>

                      {testRunning && <span className="text-[10px] text-slate-400 font-medium">Sending request...</span>}
                    </div>

                    {testSuccess && (
                      <div className="p-2.5 rounded border border-emerald-100 bg-emerald-50/50 text-[11px] font-semibold text-emerald-800">
                        {testSuccess}
                      </div>
                    )}

                    {testError && (
                      <div className="p-2.5 rounded border border-rose-100 bg-rose-50/50 text-[11px] font-semibold text-rose-800">
                        {testError}
                      </div>
                    )}
                  </div>
                )}

                {/* Real-time Playwright E2E Test Suite Runner */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100">
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
                      <div className="bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-900 font-mono text-[10px] h-48 overflow-y-auto space-y-1 select-text">
                        {e2eLogs.map((log, index) => (
                          <div key={index} className={log.startsWith("[ERROR]") ? "text-rose-400 font-bold" : log.includes("✓") || log.includes("successful") || log.includes("passed") ? "text-emerald-400" : "text-slate-300"}>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failure screenshot preview */}
                  {e2eScreenshot && (
                    <div className="space-y-2 border border-red-150 p-3 rounded-lg bg-red-50/20">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-900 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                        E2E Failure Artifact Captured
                      </span>
                      <p className="text-[11px] text-red-800 leading-normal">
                        Langkah terakhir dari skenario pengujian gagal. Screenshot kegagalan telah disimpan sebagai dokumentasi bug.
                      </p>
                      <div className="border border-red-150 rounded-lg overflow-hidden bg-white max-w-sm">
                        <img src={e2eScreenshot} alt="E2E Failure screenshot" className="w-full h-auto object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Select Outcome, Actual Result, Notes) - 2/5 width */}
              <div className="lg:col-span-2 space-y-4 min-w-0">
                {/* Result Status Selector */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2 border-slate-100">Select Test Outcome</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExecStatus("pass")}
                      className={`flex flex-col items-center justify-center py-3 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "pass"
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Check className="w-4 h-4 mb-1" />
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecStatus("fail")}
                      className={`flex flex-col items-center justify-center py-3 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "fail"
                          ? "bg-rose-600 border-rose-600 text-white shadow-sm ring-2 ring-rose-500/20"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <X className="w-4 h-4 mb-1" />
                      Fail
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecStatus("blocked")}
                      className={`flex flex-col items-center justify-center py-3 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "blocked"
                          ? "bg-amber-500 border-amber-500 text-white shadow-sm ring-2 ring-amber-500/20"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 mb-1" />
                      Blocked
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecStatus("pending")}
                      className={`flex flex-col items-center justify-center py-3 rounded-lg border text-xs font-bold transition-all ${
                        execStatus === "pending"
                          ? "bg-slate-600 border-slate-600 text-white shadow-sm ring-2 ring-slate-500/20"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Clock className="w-4 h-4 mb-1" />
                      Pending
                    </button>
                  </div>

                  {/* Automated Task Tracking Option */}
                  {(execStatus === "fail" || execStatus === "blocked") && (
                    isQA ? (
                      <div className="flex items-center gap-2 p-2.5 bg-red-50/40 border border-red-100 rounded-lg mt-2">
                        <input
                          type="checkbox"
                          id="createDefect"
                          checked={createDefect}
                          onChange={(e) => setCreateDefect(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-red-650 focus:ring-red-500"
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
                <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
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

      <TestCasePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        testCase={previewCase}
        suiteName={selectedPlanData?.name}
        onEdit={(tc) => openEditCase(tc)}
        onRun={(tc) => startExecution(tc)}
      />
    </AppLayout>
  );
}
