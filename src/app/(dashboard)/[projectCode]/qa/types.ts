export interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  module: string;
  status: string;
}

export interface TestCase {
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

export interface Project {
  id: string;
  name: string;
}

export interface ModuleStat {
  module: string;
  plansCount: number;
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  pending: number;
  progress: number;
}

export const modules = ["Pemasok", "Pelanggan", "Barang", "Katalog Lain", "Pengaturan", "Keuangan", "Kinerja"];

export const moduleToEpicMap: Record<string, string> = {
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
export const fetchCredentialsForRole = async (role: string): Promise<string> => {
  try {
    const res = await fetch(`/api/qa/credentials?role=${encodeURIComponent(role)}`);
    if (!res.ok) return "";
    const data = await res.json();
    return JSON.stringify(data, null, 2);
  } catch {
    return "";
  }
};
