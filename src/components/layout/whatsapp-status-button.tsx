"use client";

import { useState, useEffect, useCallback } from "react";
import { QrCode, CheckCircle2, Loader2, WifiOff, AlertCircle, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WaStatus {
  status: "INITIALIZING" | "LOADING" | "SCAN_QR" | "AUTHENTICATED" | "CONNECTED" | "DISCONNECTED" | "MOCK_MODE" | "ERROR" | "UNREACHABLE";
  qrCode: string | null;
  qrDataUrl: string | null;
  user: {
    user: string;
    pushname: string;
    platform?: string;
  } | null;
  error: string | null;
  ready?: boolean;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    className={className}
    viewBox="0 0 16 16"
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

export function WhatsAppStatusButton() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/wa/status", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setStatus({
          status: "ERROR",
          qrCode: null,
          qrDataUrl: null,
          user: null,
          error: "Gagal menghubungi API route status Next.js",
        });
      }
    } catch {
      setStatus({
        status: "UNREACHABLE",
        qrCode: null,
        qrDataUrl: null,
        user: null,
        error: "Koneksi ke API route status gagal",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Fetch immediately on mount to establish initial dot color
  useEffect(() => {
    fetchStatus();
    // Background poll status every 30 seconds for the indicator dot
    const pingInterval = setInterval(() => {
      if (!isOpen) {
        fetchStatus();
      }
    }, 30000);
    return () => clearInterval(pingInterval);
  }, [isOpen, fetchStatus]);

  // Faster polling when popover is OPEN and not yet connected
  useEffect(() => {
    if (isOpen) {
      fetchStatus(true);
      const pollInterval = setInterval(() => {
        // Only keep polling if not connected/mock
        if (
          status?.status !== "CONNECTED" &&
          status?.status !== "MOCK_MODE"
        ) {
          fetchStatus(false);
        }
      }, 3000);
      return () => clearInterval(pollInterval);
    }
  }, [isOpen, status?.status, fetchStatus]);

  // Determine indicator dot color
  let dotColor = "bg-slate-300";
  let buttonTitle = "Memuat status WhatsApp...";

  if (status) {
    switch (status.status) {
      case "CONNECTED":
        dotColor = "bg-emerald-500 animate-pulse";
        buttonTitle = `WhatsApp Gateway: Terhubung sebagai ${status.user?.pushname || "user"}`;
        break;
      case "MOCK_MODE":
        dotColor = "bg-blue-500";
        buttonTitle = "WhatsApp Gateway: Mode Simulasi";
        break;
      case "SCAN_QR":
      case "AUTHENTICATED":
      case "LOADING":
      case "INITIALIZING":
        dotColor = "bg-amber-500 animate-pulse";
        buttonTitle = "WhatsApp Gateway: Memerlukan Tindakan / Scanning";
        break;
      case "DISCONNECTED":
      case "ERROR":
      case "UNREACHABLE":
        dotColor = "bg-red-500";
        buttonTitle = "WhatsApp Gateway: Terputus";
        break;
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title={buttonTitle}
          >
            <WhatsAppIcon className="w-4.5 h-4.5 text-slate-600 dark:text-slate-350 hover:text-emerald-600 transition-colors" />
            <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-1.5 border-white dark:border-slate-900 rounded-full ${dotColor}`} />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0 mr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            WhatsApp Gateway
          </span>
          <button
            onClick={() => fetchStatus(true)}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col items-center justify-center text-center">
          {!status ? (
            <div className="py-6 flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs italic">Menghubungi gateway...</p>
            </div>
          ) : (
            <>
              {status.status === "CONNECTED" && (
                <div className="space-y-3 py-2 w-full">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Gateway Terhubung
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sistem siap mengirimkan notifikasi otomatis ke WhatsApp.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-lg text-left text-xs border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-450">Pengguna:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {status.user?.pushname || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450">No. WA:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        +{status.user?.user || "N/A"}
                      </span>
                    </div>
                    {status.user?.platform && (
                      <div className="flex justify-between">
                        <span className="text-slate-450">Platform:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                          {status.user.platform}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {status.status === "MOCK_MODE" && (
                <div className="space-y-3 py-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Mode Simulasi (Mock)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gateway WA tidak dikonfigurasi secara aktif. Pesan hanya dicatat di log server.
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Masukkan WA_GATEWAY_URL & WA_GATEWAY_API_KEY di .env.local untuk mengaktifkan.
                  </p>
                </div>
              )}

              {(status.status === "INITIALIZING" || status.status === "LOADING" || status.status === "AUTHENTICATED") && (
                <div className="py-6 flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Inisialisasi Gateway...
                    </h4>
                    <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                      Membuka WhatsApp Web headless di server. Mohon tunggu beberapa saat.
                    </p>
                  </div>
                </div>
              )}

              {status.status === "SCAN_QR" && (
                <div className="space-y-3 py-1 w-full">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Scan QR Code
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Pindai QR Code di bawah dengan WhatsApp di ponsel Anda (Perangkat Tertaut / Linked Devices).
                    </p>
                  </div>

                  {status.qrDataUrl ? (
                    <div className="relative group mx-auto bg-white p-2.5 border border-slate-200 rounded-lg shadow-inner w-48 h-48 flex items-center justify-center">
                      <img
                        src={status.qrDataUrl}
                        alt="WhatsApp QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto border border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <p className="text-[10px] italic">Mengambil QR Code...</p>
                    </div>
                  )}

                  <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 rounded-lg text-[10px] font-medium text-left leading-normal border border-amber-100/50 dark:border-amber-900/30">
                    💡 Halaman akan otomatis memuat ulang status begitu pemindaian sukses dan terhubung.
                  </div>
                </div>
              )}

              {(status.status === "DISCONNECTED" || status.status === "ERROR" || status.status === "UNREACHABLE") && (
                <div className="space-y-3 py-2 w-full">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600">
                    <WifiOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Gateway Terputus
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Layanan WhatsApp Gateway tidak merespons atau sedang terputus.
                    </p>
                  </div>
                  
                  {status.error && (
                    <div className="p-2.5 bg-red-50/30 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/20 rounded-lg text-left text-[11px] font-mono text-red-600 dark:text-red-405 break-all max-h-20 overflow-y-auto">
                      {status.error}
                    </div>
                  )}

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400 rounded-lg text-[10.5px] text-left leading-normal border border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-700 dark:text-slate-350 mb-0.5">Panduan Pemulihan:</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Buka terminal baru di folder proyek.</li>
                      <li>Jalankan perintah: <code className="font-mono text-slate-800 dark:text-slate-250 bg-slate-100 dark:bg-slate-800 px-1 rounded">npm run wa:gateway</code></li>
                      <li>Tunggu hingga server gateway berjalan di port 8000.</li>
                    </ol>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
