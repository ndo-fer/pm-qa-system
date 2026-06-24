"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Lock, Mail, FolderKanban, ArrowRight, KeyRound, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projectCode, setProjectCode] = useState("PDJ-PM");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotProjectCode, setForgotProjectCode] = useState("PDJ-PM");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      projectCode,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Email, password, atau kode proyek salah" : result.error);
      setLoading(false);
    } else {
      setIsRedirecting(true);
      router.push(`/${projectCode}/dashboard`);
      router.refresh();
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess(false);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, projectCode: forgotProjectCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || "Terjadi kesalahan");
      } else {
        setForgotSuccess(true);
        setForgotEmail("");
      }
    } catch {
      setForgotError("Terjadi kesalahan jaringan");
    } finally {
      setForgotLoading(false);
    }
  }

  function handleForgotClose() {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotProjectCode("PDJ-PM");
    setForgotError("");
    setForgotSuccess(false);
  }

  return (
    <div className="min-h-screen flex bg-[#f5f6fa]">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#0f1623] relative overflow-hidden">
        {/* Background mesh gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-indigo-600/8 blur-[60px]" />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between px-14 py-14 text-white w-full">
          {/* Top branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-white/20 flex items-center justify-center shadow-md">
              <Image src="/logo.png" alt="PDJ Logo" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">PDJ PM</span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">System</span>
            </div>
          </div>

          {/* Main pitch */}
          <div>
            <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-4">
              Manage your ERP<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                migration project
              </span>
            </h1>
            <p className="text-[14px] text-slate-400 leading-relaxed max-w-xs mb-10">
              Sistem manajemen proyek terpadu untuk migrasi ERP dari desktop ke web-based.
            </p>

            <div className="space-y-3.5">
              {[
                { icon: FolderKanban, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", text: "Manajemen task & milestone terintegrasi" },
                { icon: Lock, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", text: "Role-based access: Admin, PM, Developer, QA" },
                { icon: KeyRound, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", text: "QA Testing Console & S-Curve tracking" },
              ].map(({ icon: Icon, color, bg, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} border flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-[13px] text-slate-400">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-[11px] text-slate-600">
            PT Padajaya Data Jaya · ERP Migration Project
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[360px]">
          {/* Logo container above header */}
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/60 flex items-center justify-center shadow-md">
              <Image src="/logo.png" alt="PDJ Logo" width={48} height={48} className="object-contain" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-[26px] font-bold text-slate-900 tracking-tight">
              Selamat datang
            </h2>
            <p className="text-[13px] text-slate-500 mt-1.5">
              Masukkan kredensial Anda untuk melanjutkan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Code */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Kode Proyek
              </label>
              <div className="relative">
                <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="PDJ-PM"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  className="pl-9 h-11 text-sm bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@erp.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 text-sm bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  onClick={() => setForgotOpen(true)}
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11 text-sm bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-[12px] font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[11px] text-slate-400 mt-8">
            &copy; {new Date().getFullYear()} PT Padajaya Data Jaya
          </p>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={(open) => !open && handleForgotClose()}>
        <DialogContent className="sm:max-w-md bg-white shadow-xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              </div>
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-[13px]">
              Masukkan email dan kode proyek Anda. Link reset password akan dikirimkan.
            </DialogDescription>
          </DialogHeader>
          {forgotSuccess ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-emerald-800">
                  Jika email terdaftar, link reset password telah dikirim. Silakan cek console server untuk link reset.
                </p>
              </div>
              <Button className="w-full" onClick={handleForgotClose}>
                Tutup
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kode Proyek</label>
                <Input
                  type="text"
                  placeholder="PDJ-PM"
                  value={forgotProjectCode}
                  onChange={(e) => setForgotProjectCode(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email</label>
                <Input
                  type="email"
                  placeholder="nama@erp.local"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-200"
                  required
                />
              </div>
              {forgotError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-[12px] font-medium text-red-700">{forgotError}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="outline" onClick={handleForgotClose} className="text-sm">
                  Batal
                </Button>
                <Button type="submit" disabled={forgotLoading} className="text-sm bg-blue-600 hover:bg-blue-700">
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Link Reset"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Beautiful Redirect Loading Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-[#0f1623]/80 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-[300px] shadow-2xl border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 ring-8 ring-blue-500/5">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Menghubungkan...</h3>
            <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
              Memproses kredensial dan menyiapkan workspace dashboard Anda. Mohon tunggu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
