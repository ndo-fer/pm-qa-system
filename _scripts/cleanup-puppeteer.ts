import { execSync } from "child_process";
import { logger } from "../src/lib/logger";

export function cleanupPuppeteer() {
  logger.info("[CLEANUP] Starting cleanup of orphaned Puppeteer/Chromium processes...");

  if (process.platform === "win32") {
    try {
      const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe'\\" | Select-Object ProcessID, CommandLine | ConvertTo-Json"`;
      const output = execSync(cmd, { encoding: "utf8" }).trim();
      if (!output) {
        logger.info("[CLEANUP] No chrome.exe processes running.");
        return;
      }

      const processes = JSON.parse(output);
      const list = Array.isArray(processes) ? processes : [processes];

      let killedCount = 0;
      for (const proc of list) {
        const cmdLine = proc.CommandLine || "";
        const pid = proc.ProcessID;

        // Safely check if the process belongs to our Puppeteer/wwebjs instances
        if (
          cmdLine.includes("--headless") &&
          (cmdLine.includes("wwebjs") ||
            cmdLine.includes("puppeteer") ||
            cmdLine.includes("remote-debugging-port"))
        ) {
          logger.info(`[CLEANUP] Killing orphaned headless chrome process PID ${pid}...`);
          try {
            execSync(`taskkill /F /PID ${pid}`);
            killedCount++;
          } catch (e) {
            logger.error(`[CLEANUP] Failed to kill PID ${pid}:`, e);
          }
        }
      }
      logger.info(`[CLEANUP] Finished. Killed ${killedCount} orphaned processes.`);
    } catch (err) {
      logger.error("[CLEANUP ERROR] Failed to query/kill Windows processes:", err);
    }
  } else {
    // Linux/Mac fallback: kill matching processes using pkill
    try {
      logger.info("[CLEANUP] Running Linux/Mac pkill cleanup...");
      execSync("pkill -f 'chrome.*--headless.*remote-debugging-port'");
      logger.info("[CLEANUP] Completed pkill execution.");
    } catch (err) {
      // pkill returns exit code 1 if no matches found, which is normal and safe
    }
  }
}

// Execute directly if run via CLI
if (require.main === module) {
  cleanupPuppeteer();
}
