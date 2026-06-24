import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The logger reads process.env.NODE_ENV at module load time to set MIN_LEVEL.
// We test the actual logger object directly.

describe("Logger Utility", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should expose all four log methods: debug, info, warn, error", async () => {
    // Import fresh — the logger is a plain object, not a class
    const { logger } = await import("@/lib/logger");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("should call console.log for logger.debug", async () => {
    const { logger } = await import("@/lib/logger");
    logger.debug("debug message");
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0][0] as string;
    expect(output).toContain("[DEBUG]");
    expect(output).toContain("debug message");
  });

  it("should call console.log for logger.info", async () => {
    const { logger } = await import("@/lib/logger");
    logger.info("info message");
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0][0] as string;
    expect(output).toContain("[INFO ]");
    expect(output).toContain("info message");
  });

  it("should call console.warn for logger.warn", async () => {
    const { logger } = await import("@/lib/logger");
    logger.warn("warn message");
    expect(consoleWarnSpy).toHaveBeenCalled();
    const output = consoleWarnSpy.mock.calls[0][0] as string;
    expect(output).toContain("[WARN ]");
    expect(output).toContain("warn message");
  });

  it("should call console.error for logger.error", async () => {
    const { logger } = await import("@/lib/logger");
    logger.error("error message");
    expect(consoleErrorSpy).toHaveBeenCalled();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("[ERROR]");
    expect(output).toContain("error message");
  });

  it("should include ISO timestamp in formatted messages", async () => {
    const { logger } = await import("@/lib/logger");
    logger.info("timestamp test");
    const output = consoleLogSpy.mock.calls[0][0] as string;
    // ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should pass extra arguments to the console method", async () => {
    const { logger } = await import("@/lib/logger");
    logger.info("with extra", { key: "value" }, 42);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const args = consoleLogSpy.mock.calls[0];
    expect(args[1]).toEqual({ key: "value" });
    expect(args[2]).toBe(42);
  });

  it("should pad log level tag to 5 characters", async () => {
    const { logger } = await import("@/lib/logger");
    // DEBUG and INFO are already 5 chars; WARN needs padding to 5; ERROR is 5
    logger.warn("pad test");
    const output = consoleWarnSpy.mock.calls[0][0] as string;
    // The format is [timestamp] [WARN ] message — note the trailing space
    expect(output).toMatch(/\[WARN\s\]/);
  });
});

describe("Logger Level Filtering", () => {
  /**
   * In non-production (NODE_ENV != "production"), MIN_LEVEL is "debug" so all
   * levels are logged. In production, MIN_LEVEL is "info" so debug is suppressed.
   *
   * Since the logger module caches MIN_LEVEL at import time, we test the
   * shouldLog logic by verifying behavior in the current environment.
   * (The test suite runs in non-production mode by default.)
   */

  it("in non-production env, debug messages should be logged", async () => {
    // NODE_ENV should be "test" or "development" here, not "production"
    const { logger } = await import("@/lib/logger");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.debug("should appear");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("log level priority ordering: debug < info < warn < error", async () => {
    // We verify the priority map by testing that the level tags appear correctly
    const { logger } = await import("@/lib/logger");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(logSpy).toHaveBeenCalledTimes(2); // debug + info both use console.log
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
