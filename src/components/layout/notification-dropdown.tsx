"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck, Check, MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";


interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  taskId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
  projectCode?: string | null;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const isSendingRef = useRef(false);

  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {
      // Silently handle notification fetch failures
    }
  }, []);

  // Poll notifications every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkOneRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.isRead) {
      await handleMarkOneRead(n.id);
    }
    if (n.taskId && n.projectCode) {
      router.push(`/${n.projectCode}/tasks?taskId=${n.taskId}`);
      setIsOpen(false);
    }
  }

  async function handleSendWa(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setSendingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/send-wa`, {
        method: "POST"
      });
      if (res.ok) {
        fetchNotifications();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal mengirim WhatsApp");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi");
    } finally {
      isSendingRef.current = false;
      setSendingId(null);
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
          >
            <Bell className="w-4.5 h-4.5 text-slate-600 dark:text-slate-350" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 border border-white dark:border-slate-900 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0 mr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50">
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800">
          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            Notifikasi
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] font-bold text-blue-650 hover:text-blue-800 flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Tandai semua dibaca
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 text-xs transition-colors cursor-pointer flex gap-2.5 ${
                  n.isRead ? "bg-white hover:bg-slate-50/50 dark:bg-slate-900" : "bg-blue-50/30 hover:bg-blue-50/50 dark:bg-slate-850/10"
                }`}
              >
                {/* Unread indicator dot */}
                <div className="flex-shrink-0 mt-1">
                  <span className={`block w-2 h-2 rounded-full ${n.isRead ? "bg-transparent" : "bg-blue-600"}`} />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{n.title}</span>
                    <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    <span className="font-bold text-slate-700 dark:text-slate-305 mr-1.5">{n.senderName || "Seseorang"}:</span>
                    {n.message}
                  </p>
                  
                  {/* Action Button for Admins to send WA */}
                  {(n.title.includes("[ADMIN ALERT]") || n.title.includes("[WA SENT]")) && (
                    <div className="pt-2">
                      {n.title.includes("[ADMIN ALERT]") ? (
                        <button
                          disabled={sendingId === n.id}
                          onClick={(e) => handleSendWa(e, n.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          {sendingId === n.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Kirim WA
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-bold rounded-lg border border-emerald-100 dark:border-emerald-950/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <Check className="w-3 h-3" />
                          WA Terkirim
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
