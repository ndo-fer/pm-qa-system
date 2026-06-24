"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TestPlan, TestCase, Project } from "../types";

interface UseTestExecutionOptions {
  testPlans: TestPlan[];
  projects: Project[];
  selectedPlan: string | null;
  fetchData: () => Promise<void>;
  userRole: string;
  projectCode: string;
}

export const getApiEndpointForCase = (caseNumber: string, description: string): string | null => {
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

export function useTestExecution({
  testPlans,
  projects,
  selectedPlan,
  fetchData,
  userRole,
  projectCode,
}: UseTestExecutionOptions) {
  const router = useRouter();

  // Execution state
  const [activeExecCase, setActiveExecCase] = useState<TestCase | null>(null);
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

  // Playwright E2E runner state
  const [e2eLogs, setE2eLogs] = useState<string[]>([]);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eScreenshot, setE2eScreenshot] = useState<string | null>(null);
  const [e2eEventSource, setE2eEventSource] = useState<EventSource | null>(null);

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

  const runLiveApiTest = async () => {
    const selectedPlanData = testPlans.find((p) => p.id === selectedPlan);
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
        if (userRole === "qa") {
          setCreateDefect(true);
        }
      }
    } catch (err) {
      const errMsg = `[Network Error] Could not connect to the API server: ${(err as Error).message || String(err)}`;
      setTestError(errMsg);
      setExecStatus("fail");
      setExecActualResult(errMsg);
      setExecNotes(`Endpoint failed: ${url}\nDetails: ${(err as Error).message || String(err)}`);
      if (userRole === "qa") {
        setCreateDefect(true);
      }
    } finally {
      setTestRunning(false);
    }
  };

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

  return {
    activeExecCase,
    setActiveExecCase,
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
    // API testing
    useMockMode,
    setUseMockMode,
    testRunning,
    testError,
    testSuccess,
    setTestError,
    setTestSuccess,
    apiTokenInput,
    setApiTokenInput,
    // E2E
    e2eLogs,
    e2eRunning,
    e2eScreenshot,
    // Functions
    startExecution,
    submitExecution,
    runLiveApiTest,
    runPlaywrightE2ETest,
    stopPlaywrightE2ETest,
    getApiEndpointForCase,
  };
}
