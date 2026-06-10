"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pm: "Project Manager",
  developer: "Developer",
  qa: "QA Tester",
};

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

  async function fetchData() {
    setLoading(true);
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
    const body: any = { name, email, role };
    if (password) body.password = password;
    if (editingUser) body.id = editingUser.id;

    await fetch("/api/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setName("");
    setEmail("");
    setPassword("");
    setRole("developer");
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
            <Button onClick={() => { setEditingUser(null); setName(""); setEmail(""); setPassword(""); setRole("developer"); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              New User
            </Button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-white space-y-4">
            <h3 className="font-medium">{editingUser ? "Edit User" : "New User"}</h3>
            <div className="grid grid-cols-4 gap-4">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input placeholder={editingUser ? "New password (optional)" : "Password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingUser} />
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
                    <TableCell>{user.createdAt?.split("T")[0] || "-"}</TableCell>
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
