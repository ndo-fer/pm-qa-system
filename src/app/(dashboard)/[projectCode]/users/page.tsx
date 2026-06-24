/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
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
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[] | null;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pm: "Project Manager",
  developer: "Developer",
  qa: "QA Tester",
};

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  let normalized = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
  if (!normalized.endsWith("Z") && !normalized.includes("+") && !/-\d{2}:\d{2}$/.test(normalized)) {
    normalized += "Z";
  }
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    return dateStr.split("T")[0].split(" ")[0];
  }
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [permissionsOverride, setPermissionsOverride] = useState<string[] | null>(null);

  const activePermissions = permissionsOverride !== null 
    ? permissionsOverride 
    : (ROLE_DEFAULT_PERMISSIONS[role] || []);

  const handlePermissionToggle = (perm: string) => {
    const current = permissionsOverride !== null 
      ? permissionsOverride 
      : [...(ROLE_DEFAULT_PERMISSIONS[role] || [])];
      
    if (current.includes(perm)) {
      setPermissionsOverride(current.filter((p) => p !== perm));
    } else {
      setPermissionsOverride([...current, perm]);
    }
  };

  const isFirstLoad = useRef(true);

  async function fetchData() {
    if (isFirstLoad.current) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (session) {
      if (session.user.role !== "admin" && session.user.role !== "pm") {
        router.push(`/${session.user.projectCode}/dashboard`);
      } else {
        fetchData();
      }
    }
  }, [session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editingUser ? "PUT" : "POST";
    const body: { name: string; email: string; role: string; password?: string; id?: string; permissions?: string[] | null } = { name, email, role };
    if (password) body.password = password;
    if (editingUser) body.id = editingUser.id;
    body.permissions = permissionsOverride;

    await fetch("/api/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setName("");
    setEmail("");
    setPassword("");
    setRole("developer");
    setPermissionsOverride(null);
    setShowForm(false);
    setEditingUser(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setPermissionsOverride(user.permissions || null);
    setShowForm(true);
  }

  if (status === "loading") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading...
        </div>
      </AppLayout>
    );
  }

  const isAllowed = session && (session.user.role === "admin" || session.user.role === "pm");
  if (!isAllowed) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-gray-500 font-medium">
          Access denied.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Users</h1>
            <p className="text-xs text-gray-500">Manage system users</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton data={users} filename="users_list" />
            <Button onClick={() => { setEditingUser(null); setName(""); setEmail(""); setPassword(""); setRole("developer"); setPermissionsOverride(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              New User
            </Button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-white space-y-4">
            <h3 className="font-medium">{editingUser ? "Edit User" : "New User"}</h3>
            <div className="grid grid-cols-4 gap-4">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="new-user-name" />
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="new-user-email" />
              <Input placeholder={editingUser ? "New password (optional)" : "Password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingUser} autoComplete="new-password" />
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pm">Project Manager</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="qa">QA Tester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Custom Permissions</h4>
                  <p className="text-xs text-gray-500">
                    By default, permissions follow the selected role. Checking or unchecking boxes will override the default permissions for this specific user.
                  </p>
                </div>
                {permissionsOverride !== null && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPermissionsOverride(null)} className="h-8 text-xs text-orange-600">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset to Default
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-md border">
                {PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={activePermissions.includes(perm)}
                      onCheckedChange={() => handlePermissionToggle(perm)}
                    />
                    <label
                      htmlFor={`perm-${perm}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {perm}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingUser ? "Update" : "Create"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingUser(null); }}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No users</TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="secondary">{roleLabels[user.role]}</Badge></TableCell>
                    <TableCell>{formatDisplayDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
