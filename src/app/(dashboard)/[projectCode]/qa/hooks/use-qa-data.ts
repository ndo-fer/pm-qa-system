/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback } from "react";
import { TestPlan, TestCase, Project, modules, ModuleStat, fetchCredentialsForRole } from "../types";

export function useQAData(projectCode: string) {
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

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

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
  const moduleStats: ModuleStat[] = modules.map((mod) => {
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

  return {
    // Data
    testPlans,
    testCases,
    projects,
    loading,
    selectedPlan,
    setSelectedPlan,
    previewOpen,
    setPreviewOpen,
    previewCase,
    setPreviewCase,
    // Filters
    planSearch,
    setPlanSearch,
    caseSearch,
    setCaseSearch,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    // New Plan
    showNewPlan,
    setShowNewPlan,
    newPlanName,
    setNewPlanName,
    newPlanModule,
    setNewPlanModule,
    createPlan,
    createCase,
    // New Case
    showNewCase,
    setShowNewCase,
    newCaseNumber,
    setNewCaseNumber,
    newCaseDesc,
    setNewCaseDesc,
    newCaseSteps,
    setNewCaseSteps,
    newCaseExpected,
    setNewCaseExpected,
    newCaseErpRole,
    setNewCaseErpRole,
    newCaseTestType,
    setNewCaseTestType,
    newCaseLoginCreds,
    setNewCaseLoginCreds,
    // Edit Plan
    editingPlan,
    setEditingPlan,
    showEditPlan,
    setShowEditPlan,
    editPlanName,
    setEditPlanName,
    editPlanModule,
    setEditPlanModule,
    updatePlan,
    deletePlan,
    openEditPlan,
    // Edit Case
    editingCase,
    setEditingCase,
    showEditCase,
    setShowEditCase,
    editCaseNumber,
    setEditCaseNumber,
    editCaseDesc,
    setEditCaseDesc,
    editCaseSteps,
    setEditCaseSteps,
    editCaseExpected,
    setEditCaseExpected,
    updateCase,
    deleteCase,
    openEditCase,
    // Sync
    syncing,
    lastSyncedAt,
    handleSyncSheets,
    // Computed
    filteredPlans,
    filteredCases,
    selectedPlanData,
    moduleStats,
    totalCasesCount,
    passedCasesCount,
    failedCasesCount,
    blockedCasesCount,
    executedCasesCount,
    executionRate,
    passRate,
    // Refetch
    fetchData,
  };
}
