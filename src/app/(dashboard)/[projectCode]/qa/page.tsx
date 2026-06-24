/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { AlertTriangle } from "lucide-react";
import { TestCasePreviewModal } from "@/components/qa/test-case-preview-modal";
import { useQAData } from "./hooks/use-qa-data";
import { useTestExecution } from "./hooks/use-test-execution";
import { TestPlanSidebar } from "./components/test-plan-sidebar";
import { QADashboard } from "./components/qa-dashboard";
import { TestSuiteView } from "./components/test-suite-view";
import { QADialogs } from "./components/qa-dialogs";
import { TestExecutionDialog } from "./components/test-execution-dialog";

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

  const qaData = useQAData(projectCode);
  const execution = useTestExecution({
    testPlans: qaData.testPlans,
    projects: qaData.projects,
    selectedPlan: qaData.selectedPlan,
    fetchData: qaData.fetchData,
    userRole,
    projectCode,
  });

  return (
    <AppLayout className="p-0 h-full overflow-hidden">
      <div className="flex h-full w-full overflow-hidden">
        
        {/* Left Pane: Test Plan Navigator */}
        <TestPlanSidebar
          planSearch={qaData.planSearch}
          setPlanSearch={qaData.setPlanSearch}
          filteredPlans={qaData.filteredPlans}
          testCases={qaData.testCases}
          selectedPlan={qaData.selectedPlan}
          setSelectedPlan={qaData.setSelectedPlan}
          isQA={isQA}
          setShowNewPlan={qaData.setShowNewPlan}
          openEditPlan={qaData.openEditPlan}
          deletePlan={qaData.deletePlan}
        />

        {/* Right Pane: Workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden px-4 py-2.5">
          
          {/* Active Workspace: Global Analytics Dashboard */}
          {!qaData.selectedPlan ? (
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
              <QADashboard
                testCases={qaData.testCases}
                testPlans={qaData.testPlans}
                moduleStats={qaData.moduleStats}
                totalCasesCount={qaData.totalCasesCount}
                passedCasesCount={qaData.passedCasesCount}
                failedCasesCount={qaData.failedCasesCount}
                blockedCasesCount={qaData.blockedCasesCount}
                executedCasesCount={qaData.executedCasesCount}
                executionRate={qaData.executionRate}
                passRate={qaData.passRate}
              />
            )
          ) : (
            <TestSuiteView
              selectedPlanData={qaData.selectedPlanData}
              projects={qaData.projects}
              filteredCases={qaData.filteredCases}
              loading={qaData.loading}
              caseSearch={qaData.caseSearch}
              setCaseSearch={qaData.setCaseSearch}
              statusFilter={qaData.statusFilter}
              setStatusFilter={qaData.setStatusFilter}
              roleFilter={qaData.roleFilter}
              setRoleFilter={qaData.setRoleFilter}
              syncing={qaData.syncing}
              lastSyncedAt={qaData.lastSyncedAt}
              handleSyncSheets={qaData.handleSyncSheets}
              setShowNewCase={qaData.setShowNewCase}
              setSelectedPlan={qaData.setSelectedPlan}
              startExecution={execution.startExecution}
              openEditCase={qaData.openEditCase}
              deleteCase={qaData.deleteCase}
              setPreviewCase={qaData.setPreviewCase}
              setPreviewOpen={qaData.setPreviewOpen}
              openEditPlan={qaData.openEditPlan}
              deletePlan={qaData.deletePlan}
            />
          )}

        </div>

      </div>

      {/* Dialogs: Create/Edit Plan & Case */}
      <QADialogs
        showNewPlan={qaData.showNewPlan}
        setShowNewPlan={qaData.setShowNewPlan}
        newPlanName={qaData.newPlanName}
        setNewPlanName={qaData.setNewPlanName}
        newPlanModule={qaData.newPlanModule}
        setNewPlanModule={qaData.setNewPlanModule}
        createPlan={qaData.createPlan}
        showNewCase={qaData.showNewCase}
        setShowNewCase={qaData.setShowNewCase}
        newCaseNumber={qaData.newCaseNumber}
        setNewCaseNumber={qaData.setNewCaseNumber}
        newCaseDesc={qaData.newCaseDesc}
        setNewCaseDesc={qaData.setNewCaseDesc}
        newCaseSteps={qaData.newCaseSteps}
        setNewCaseSteps={qaData.setNewCaseSteps}
        newCaseExpected={qaData.newCaseExpected}
        setNewCaseExpected={qaData.setNewCaseExpected}
        newCaseErpRole={qaData.newCaseErpRole}
        setNewCaseErpRole={qaData.setNewCaseErpRole}
        newCaseTestType={qaData.newCaseTestType}
        setNewCaseTestType={qaData.setNewCaseTestType}
        newCaseLoginCreds={qaData.newCaseLoginCreds}
        setNewCaseLoginCreds={qaData.setNewCaseLoginCreds}
        createCase={qaData.createCase}
        showEditPlan={qaData.showEditPlan}
        setShowEditPlan={qaData.setShowEditPlan}
        editingPlan={qaData.editingPlan}
        setEditingPlan={qaData.setEditingPlan}
        editPlanName={qaData.editPlanName}
        setEditPlanName={qaData.setEditPlanName}
        editPlanModule={qaData.editPlanModule}
        setEditPlanModule={qaData.setEditPlanModule}
        updatePlan={qaData.updatePlan}
        showEditCase={qaData.showEditCase}
        setShowEditCase={qaData.setShowEditCase}
        editingCase={qaData.editingCase}
        setEditingCase={qaData.setEditingCase}
        editCaseNumber={qaData.editCaseNumber}
        setEditCaseNumber={qaData.setEditCaseNumber}
        editCaseDesc={qaData.editCaseDesc}
        setEditCaseDesc={qaData.setEditCaseDesc}
        editCaseSteps={qaData.editCaseSteps}
        setEditCaseSteps={qaData.setEditCaseSteps}
        editCaseExpected={qaData.editCaseExpected}
        setEditCaseExpected={qaData.setEditCaseExpected}
        updateCase={qaData.updateCase}
      />

      {/* Dialog: Interactive Test Runner Execution Dialog */}
      <TestExecutionDialog
        activeExecCase={execution.activeExecCase}
        setActiveExecCase={execution.setActiveExecCase}
        selectedPlanData={qaData.selectedPlanData}
        execStatus={execution.execStatus}
        setExecStatus={execution.setExecStatus}
        execActualResult={execution.execActualResult}
        setExecActualResult={execution.setExecActualResult}
        execNotes={execution.execNotes}
        setExecNotes={execution.setExecNotes}
        execAttachmentUrl={execution.execAttachmentUrl}
        setExecAttachmentUrl={execution.setExecAttachmentUrl}
        createDefect={execution.createDefect}
        setCreateDefect={execution.setCreateDefect}
        checkedSteps={execution.checkedSteps}
        setCheckedSteps={execution.setCheckedSteps}
        useMockMode={execution.useMockMode}
        setUseMockMode={execution.setUseMockMode}
        testRunning={execution.testRunning}
        testError={execution.testError}
        testSuccess={execution.testSuccess}
        setTestError={execution.setTestError}
        setTestSuccess={execution.setTestSuccess}
        apiTokenInput={execution.apiTokenInput}
        setApiTokenInput={execution.setApiTokenInput}
        e2eLogs={execution.e2eLogs}
        e2eRunning={execution.e2eRunning}
        e2eScreenshot={execution.e2eScreenshot}
        submitExecution={execution.submitExecution}
        runLiveApiTest={execution.runLiveApiTest}
        runPlaywrightE2ETest={execution.runPlaywrightE2ETest}
        stopPlaywrightE2ETest={execution.stopPlaywrightE2ETest}
        getApiEndpointForCase={execution.getApiEndpointForCase}
        isQA={isQA}
      />

      <TestCasePreviewModal
        open={qaData.previewOpen}
        onOpenChange={qaData.setPreviewOpen}
        testCase={qaData.previewCase}
        suiteName={qaData.selectedPlanData?.name}
        onEdit={(tc) => qaData.openEditCase(tc)}
        onRun={(tc) => execution.startExecution(tc)}
      />
    </AppLayout>
  );
}
