"use client";

import { useState, useEffect } from "react";
import { ImageIcon, X, ZoomIn, ExternalLink, Loader2, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── URL format resolution ─────────────────────────────────────────────────────
// screenshotUrl stored in DB is either:
//   "drive:FILE_ID"         → new format, build URL from file ID
//   "https://..."           → legacy, use directly
//
// We try 3 formats in order for Drive file IDs:
const buildDriveUrls = (fileId: string) => [
  `/api/drive/image?fileId=${fileId}`,                                       // Secure backend proxy (handles private files)
  `https://lh3.googleusercontent.com/d/${fileId}`,                           // Direct link (requires public file)
  `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,                // Thumbnail endpoint
  `https://drive.google.com/uc?export=view&id=${fileId}`,                    // Legacy
];

function resolveFileId(screenshotUrl: string | null | undefined): string | null {
  if (!screenshotUrl) return null;
  if (screenshotUrl.startsWith("drive:")) return screenshotUrl.slice(6);
  // Legacy: extract from ?id=FILE_ID
  return screenshotUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ScreenshotViewerProps {
  screenshotUrl: string | null | undefined;
  taskCode?: string | null;
  taskTitle?: string | null;
}

export function ScreenshotViewer({ screenshotUrl, taskCode, taskTitle }: ScreenshotViewerProps) {
  const [open, setOpen] = useState(false);
  const [urlIndex, setUrlIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  const fileId = resolveFileId(screenshotUrl);
  const driveUrls = fileId 
    ? buildDriveUrls(fileId) 
    : (screenshotUrl ? [screenshotUrl] : []);
  const currentImgUrl = driveUrls[urlIndex] ?? null;

  const directLink = fileId
    ? `https://drive.google.com/file/d/${fileId}/view`
    : screenshotUrl || "";

  const driveSearchQuery = encodeURIComponent((taskTitle || taskCode || "").trim());
  const driveSearchUrl = `https://drive.google.com/drive/search?q=${driveSearchQuery}`;

  // Reset state when modal opens or screenshotUrl changes
  useEffect(() => {
    if (open) {
      setUrlIndex(0);
      setLoaded(false);
      setAllFailed(false);
    }
  }, [open, screenshotUrl]);

  function handleImgError() {
    const nextIndex = urlIndex + 1;
    if (nextIndex < driveUrls.length) {
      // Try the next URL format
      setUrlIndex(nextIndex);
      setLoaded(false);
    } else {
      // All formats failed
      setAllFailed(true);
      setLoaded(true);
    }
  }

  function handleImgLoad() {
    setLoaded(true);
    setAllFailed(false);
  }

  // ─── No screenshot matched ──────────────────────────────────────────────────
  if (!screenshotUrl && !fileId) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs flex-1">
          <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Belum ada screenshot yang di-match</span>
        </div>
        <a
          href={driveSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Cari di Google Drive"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-300 px-2.5 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          <Search className="w-3.5 h-3.5" />
          Search Drive
        </a>
      </div>
    );
  }

  // ─── Screenshot matched ──────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-9 gap-2 text-xs font-medium border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/50 transition-all flex-1"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          View UI Screenshot
        </Button>
        <a
          href={directLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Buka di Google Drive"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-300 px-2.5 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="relative w-full max-w-5xl mx-4 flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 rounded-t-xl border-b border-slate-700/50">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-white truncate">
                  UI Screenshot
                  {taskCode && (
                    <span className="ml-2 text-xs font-mono text-violet-300 bg-violet-900/40 px-2 py-0.5 rounded">
                      {taskCode}
                    </span>
                  )}
                </span>
                {taskTitle && (
                  <span className="text-xs text-slate-400 truncate hidden sm:block">— {taskTitle}</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                {/* URL attempt indicator */}
                {!loaded && !allFailed && driveUrls.length > 1 && (
                  <span className="text-xs text-slate-500 px-2">
                    Trying format {urlIndex + 1}/{driveUrls.length}…
                  </span>
                )}
                <a
                  href={driveSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-700/50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search Drive</span>
                </a>
                <a
                  href={directLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-700/50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka di Drive</span>
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div className="relative bg-slate-950/90 rounded-b-xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[80vh]">

              {/* Loading spinner */}
              {!loaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                  <span className="text-sm">
                    {urlIndex === 0 ? "Memuat screenshot..." : `Mencoba format alternatif (${urlIndex + 1}/${driveUrls.length})...`}
                  </span>
                </div>
              )}

              {/* All formats failed */}
              {allFailed && (
                <div className="flex flex-col items-center gap-4 p-12 text-center z-10">
                  <ZoomIn className="w-10 h-10 text-slate-600" />
                  <div>
                    <p className="text-slate-300 text-sm font-medium mb-1">Screenshot tidak dapat dimuat</p>
                    <p className="text-slate-500 text-xs max-w-xs mb-3">
                      Semua format URL telah dicoba ({driveUrls.length} format). Pastikan file di Drive di-share publik, atau buka langsung di browser.
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <button
                      onClick={() => { setUrlIndex(0); setLoaded(false); setAllFailed(false); }}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Coba Lagi
                    </button>
                    <a
                      href={directLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka di Drive
                    </a>
                    <a
                      href={driveSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Search className="w-3 h-3" />
                      Search di Drive
                    </a>
                  </div>
                </div>
              )}

              {/* Image — render all formats but only show the current one */}
              {currentImgUrl && !allFailed && (
                <img
                  key={currentImgUrl}   // force remount on URL change
                  src={currentImgUrl}
                  alt={`UI Screenshot ${taskCode || ""}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-b-xl"
                  style={{ display: loaded ? "block" : "none" }}
                  onLoad={handleImgLoad}
                  onError={handleImgError}
                />
              )}
            </div>

            {/* Footer */}
            {loaded && !allFailed && (
              <p className="text-center text-xs text-slate-500 mt-2">
                Klik di luar atau × untuk menutup ·{" "}
                {urlIndex > 0 && <span className="text-slate-600">Format {urlIndex + 1} berhasil</span>}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
