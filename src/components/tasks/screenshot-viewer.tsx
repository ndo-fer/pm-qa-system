/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { ImageIcon, X, ZoomIn, ExternalLink, Loader2, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── URL format resolution ─────────────────────────────────────────────────────
// screenshotUrl stored in DB is either:
//   "drive:FILE_ID"         → new format, build URL from file ID
//   "https://..."           → legacy, use directly
//   Can be comma or newline separated for multiple screenshots
//
const buildDriveUrls = (fileId: string) => [
  `/api/drive/image?fileId=${fileId}`,                                       // Secure backend proxy (handles private files)
  `https://lh3.googleusercontent.com/d/${fileId}`,                           // Direct link (requires public file)
  `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,                // Thumbnail endpoint
  `https://drive.google.com/uc?export=view&id=${fileId}`,                    // Legacy
];

function resolveFileId(url: string): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (cleaned.startsWith("drive:")) return cleaned.slice(6).trim();
  
  // Try to match path format /d/FILE_ID
  const pathMatch = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];
  
  // Try to match query param ?id=FILE_ID
  const queryMatch = cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  
  return null;
}

interface ScreenshotItem {
  originalUrl: string;
  fileId: string | null;
  driveUrls: string[];
  directLink: string;
}

function parseScreenshots(screenshotUrl: string | null | undefined): ScreenshotItem[] {
  if (!screenshotUrl) return [];
  return screenshotUrl
    .split(/[\n,;]+/)
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      const fileId = resolveFileId(url);
      const driveUrls = fileId ? buildDriveUrls(fileId) : [url];
      const directLink = fileId ? `https://drive.google.com/file/d/${fileId}/view` : url;
      return {
        originalUrl: url,
        fileId,
        driveUrls,
        directLink,
      };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ScreenshotViewerProps {
  screenshotUrl: string | null | undefined;
  taskCode?: string | null;
  taskTitle?: string | null;
}

export function ScreenshotViewer({ screenshotUrl, taskCode, taskTitle }: ScreenshotViewerProps) {
  const [open, setOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Track URL format attempts, loaded, failed states for each image index
  const [urlIndices, setUrlIndices] = useState<Record<number, number>>({});
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});
  const [failedMap, setFailedMap] = useState<Record<number, boolean>>({});

  const screenshots = parseScreenshots(screenshotUrl);

  // Swipe support state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const nextSlide = () => {
    if (screenshots.length <= 1) return;
    setCurrentSlideIndex((prev) => (prev + 1) % screenshots.length);
  };

  const prevSlide = () => {
    if (screenshots.length <= 1) return;
    setCurrentSlideIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const handleImageLoad = (index: number) => {
    setLoadedMap((prev) => ({ ...prev, [index]: true }));
    setFailedMap((prev) => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    const item = screenshots[index];
    if (!item) return;
    const currentFormatIndex = urlIndices[index] ?? 0;
    const nextFormatIndex = currentFormatIndex + 1;

    if (nextFormatIndex < item.driveUrls.length) {
      setUrlIndices((prev) => ({ ...prev, [index]: nextFormatIndex }));
      setLoadedMap((prev) => ({ ...prev, [index]: false }));
    } else {
      setFailedMap((prev) => ({ ...prev, [index]: true }));
      setLoadedMap((prev) => ({ ...prev, [index]: true }));
    }
  };

  // Keyboard navigation & close in Lightbox
  useEffect(() => {
    if (!open || screenshots.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentSlideIndex, screenshots.length]);

  // Touch Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // Reset indices when screenshotUrl changes
  useEffect(() => {
    setCurrentSlideIndex(0);
    setUrlIndices({});
    setLoadedMap({});
    setFailedMap({});
  }, [screenshotUrl]);

  const activeItem = screenshots[currentSlideIndex];
  const driveSearchQuery = encodeURIComponent((taskTitle || taskCode || "").trim());
  const driveSearchUrl = `https://drive.google.com/drive/search?q=${driveSearchQuery}`;

  // ─── No screenshots matched ──────────────────────────────────────────────────
  if (screenshots.length === 0) {
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

  // ─── Image items matched ──────────────────────────────────────────────────────
  const activeFormatIdx = urlIndices[currentSlideIndex] ?? 0;
  const currentImgUrl = activeItem?.driveUrls[activeFormatIdx] ?? "";
  const isLoaded = loadedMap[currentSlideIndex] ?? false;
  const isFailed = failedMap[currentSlideIndex] ?? false;
  const activeDirectLink = activeItem?.directLink ?? "";

  return (
    <>
      <div className="space-y-2 w-full">
        {/* Inline Gallery Container */}
        <div
          className="relative w-full h-60 md:h-64 bg-slate-900/95 dark:bg-slate-950/80 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800/80 group flex items-center justify-center animate-fade-in"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Spinner during load */}
          {!isLoaded && !isFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-955/40 z-10 backdrop-blur-[2px]">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              <span className="text-[10px] font-medium">Loading UI Design...</span>
            </div>
          )}

          {/* Error loading */}
          {isFailed && (
            <div className="flex flex-col items-center justify-center text-center p-4 z-10 space-y-3">
              <ImageIcon className="w-8 h-8 text-slate-650" />
              <div>
                <p className="text-slate-350 text-xs font-semibold">Screenshot tidak dapat dimuat</p>
                <p className="text-slate-500 text-[10px] max-w-xs mt-1">
                  Format link tidak didukung atau butuh permission.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={activeDirectLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-violet-400 hover:text-violet-300 border border-violet-850 px-2 py-1 rounded transition-colors"
                >
                  Buka di Drive
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setUrlIndices((prev) => ({ ...prev, [currentSlideIndex]: 0 }));
                    setLoadedMap((prev) => ({ ...prev, [currentSlideIndex]: false }));
                    setFailedMap((prev) => ({ ...prev, [currentSlideIndex]: false }));
                  }}
                  className="text-[10px] text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {/* Active slide image */}
          {!isFailed && currentImgUrl && (
            <img
              src={currentImgUrl}
              alt={`Screenshot ${currentSlideIndex + 1}`}
              className={`max-h-full max-w-full object-contain cursor-pointer select-none transition-all duration-300 ${
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              onLoad={() => handleImageLoad(currentSlideIndex)}
              onError={() => handleImageError(currentSlideIndex)}
              onClick={() => setOpen(true)}
            />
          )}

          {/* Slide index badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className="bg-slate-955/75 dark:bg-slate-900/90 backdrop-blur-md border border-white/10 dark:border-slate-800 text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              {currentSlideIndex + 1} / {screenshots.length}
            </span>
          </div>

          {/* Hover overlay action */}
          <div
            className="absolute inset-0 bg-slate-955/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 cursor-pointer z-10"
            onClick={() => setOpen(true)}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-semibold gap-1.5 shadow-md bg-white/95 text-slate-900 hover:bg-white hover:scale-105 transition-all"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              Expand View
            </Button>
            <a
              href={activeDirectLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900/80 text-white border border-white/10 hover:bg-slate-800 hover:scale-105 transition-all"
              title="Buka di Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Left/Right inline buttons */}
          {screenshots.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-slate-955/70 text-white/80 hover:text-white hover:bg-slate-950 border border-white/10 hover:scale-105 transition-all shadow-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-slate-955/70 text-white/80 hover:text-white hover:bg-slate-950 border border-white/10 hover:scale-105 transition-all shadow-md"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Pagination Indicators */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-slate-955/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              {screenshots.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex ? "w-4 bg-violet-400" : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl mx-4 flex flex-col h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 rounded-t-xl border-b border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-white truncate">
                  UI Design Screenshot ({currentSlideIndex + 1}/{screenshots.length})
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
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                {!isLoaded && !isFailed && activeItem?.driveUrls.length > 1 && (
                  <span className="text-xs text-slate-500 px-2">
                    Trying format {activeFormatIdx + 1}/{activeItem.driveUrls.length}…
                  </span>
                )}
                <a
                  href={driveSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-800/50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search Drive</span>
                </a>
                <a
                  href={activeDirectLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-800/50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka di Drive</span>
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image display area */}
            <div className="relative flex-1 bg-slate-950/95 border-b border-slate-800/80 overflow-hidden flex items-center justify-center min-h-[300px]">
              {/* Spinner */}
              {!isLoaded && !isFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10 bg-slate-955/20">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                  <span className="text-sm font-medium">Memuat gambar...</span>
                </div>
              )}

              {/* Fail State */}
              {isFailed && (
                <div className="flex flex-col items-center gap-4 p-12 text-center z-10">
                  <ZoomIn className="w-10 h-10 text-slate-700" />
                  <div>
                    <p className="text-slate-350 text-sm font-semibold">Gagal memuat gambar ini</p>
                    <p className="text-slate-500 text-xs max-w-sm mt-2">
                      Semua format link telah dicoba. Silakan buka gambar secara manual di Google Drive.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setUrlIndices((prev) => ({ ...prev, [currentSlideIndex]: 0 }));
                        setLoadedMap((prev) => ({ ...prev, [currentSlideIndex]: false }));
                        setFailedMap((prev) => ({ ...prev, [currentSlideIndex]: false }));
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Coba Lagi
                    </button>
                    <a
                      href={activeDirectLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-900 hover:border-violet-750 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka di Drive
                    </a>
                  </div>
                </div>
              )}

              {/* Image render */}
              {!isFailed && currentImgUrl && (
                <img
                  key={currentImgUrl}
                  src={currentImgUrl}
                  alt={`UI Screenshot ${currentSlideIndex + 1}`}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{ display: isLoaded ? "block" : "none" }}
                  onLoad={() => handleImageLoad(currentSlideIndex)}
                  onError={() => handleImageError(currentSlideIndex)}
                />
              )}

              {/* Lightbox Side Buttons */}
              {screenshots.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-slate-900/80 text-white/80 hover:text-white hover:bg-slate-800 border border-slate-800/80 hover:scale-105 transition-all shadow-lg"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-slate-900/80 text-white/80 hover:text-white hover:bg-slate-800 border border-slate-800/80 hover:scale-105 transition-all shadow-lg"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Footer with Thumbnails */}
            <div className="bg-slate-900/95 p-4 rounded-b-xl flex flex-col items-center gap-3">
              {screenshots.length > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto max-w-full pb-1">
                  {screenshots.map((item, idx) => {
                    const formatIdx = urlIndices[idx] ?? 0;
                    const thumbUrl = item.driveUrls[formatIdx] ?? "";
                    const isFailedItem = failedMap[idx] ?? false;

                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden bg-slate-950 border-2 transition-all flex-shrink-0 flex items-center justify-center ${
                          idx === currentSlideIndex
                            ? "border-violet-500 scale-105 ring-2 ring-violet-500/20"
                            : "border-slate-800 hover:border-slate-650 opacity-65 hover:opacity-100"
                        }`}
                      >
                        {isFailedItem ? (
                          <ImageIcon className="w-4 h-4 text-slate-700" />
                        ) : (
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-center text-[10px] text-slate-500">
                Tekan tombol Arrow Left/Right untuk navigasi · ESC atau Klik di luar gambar untuk menutup
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
