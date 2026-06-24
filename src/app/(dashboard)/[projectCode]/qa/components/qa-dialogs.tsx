"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { TestPlan, TestCase, modules } from "../types";

interface QADialogsProps {
  // Create Plan
  showNewPlan: boolean;
  setShowNewPlan: (show: boolean) => void;
  newPlanName: string;
  setNewPlanName: (s: string) => void;
  newPlanModule: string;
  setNewPlanModule: (s: string) => void;
  createPlan: () => void;
  
  // Create Case
  showNewCase: boolean;
  setShowNewCase: (show: boolean) => void;
  newCaseNumber: string;
  setNewCaseNumber: (s: string) => void;
  newCaseDesc: string;
  setNewCaseDesc: (s: string) => void;
  newCaseSteps: string;
  setNewCaseSteps: (s: string) => void;
  newCaseExpected: string;
  setNewCaseExpected: (s: string) => void;
  newCaseErpRole: string;
  setNewCaseErpRole: (s: string) => void;
  newCaseTestType: string;
  setNewCaseTestType: (s: string) => void;
  newCaseLoginCreds: string;
  setNewCaseLoginCreds: (s: string) => void;
  createCase: () => void;
  
  // Edit Plan
  showEditPlan: boolean;
  setShowEditPlan: (show: boolean) => void;
  editingPlan: TestPlan | null;
  setEditingPlan: (p: TestPlan | null) => void;
  editPlanName: string;
  setEditPlanName: (s: string) => void;
  editPlanModule: string;
  setEditPlanModule: (s: string) => void;
  updatePlan: () => void;
  
  // Edit Case
  showEditCase: boolean;
  setShowEditCase: (show: boolean) => void;
  editingCase: TestCase | null;
  setEditingCase: (tc: TestCase | null) => void;
  editCaseNumber: string;
  setEditCaseNumber: (s: string) => void;
  editCaseDesc: string;
  setEditCaseDesc: (s: string) => void;
  editCaseSteps: string;
  setEditCaseSteps: (s: string) => void;
  editCaseExpected: string;
  setEditCaseExpected: (s: string) => void;
  updateCase: () => void;
}

export function QADialogs({
  // Create Plan
  showNewPlan,
  setShowNewPlan,
  newPlanName,
  setNewPlanName,
  newPlanModule,
  setNewPlanModule,
  createPlan,
  // Create Case
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
  createCase,
  // Edit Plan
  showEditPlan,
  setShowEditPlan,
  editingPlan,
  setEditingPlan,
  editPlanName,
  setEditPlanName,
  editPlanModule,
  setEditPlanModule,
  updatePlan,
  // Edit Case
  showEditCase,
  setShowEditCase,
  editingCase,
  setEditingCase,
  editCaseNumber,
  setEditCaseNumber,
  editCaseDesc,
  setEditCaseDesc,
  editCaseSteps,
  setEditCaseSteps,
  editCaseExpected,
  setEditCaseExpected,
  updateCase,
}: QADialogsProps) {
  return (
    <>
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
                placeholder={"1. Go to Master Supplier screen\n2. Verify supplier entries render\n3. Click Page 2 button"}
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
                placeholder={"1. Go to Master Supplier screen\n2. Verify supplier entries render\n3. Click Page 2 button"}
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
    </>
  );
}
