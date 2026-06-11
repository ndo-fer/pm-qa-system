import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { authorizeProjectRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// Concurrency lock: only one Playwright run at a time per process
let isRunning = false;

export async function GET() {
  // --- Auth guard ---
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const auth = await authorizeProjectRole(session.user.projectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) {
    return new Response("Forbidden: QA role required", { status: 403 });
  }

  // --- Concurrency guard ---
  if (isRunning) {
    return new Response(
      JSON.stringify({ error: "A test run is already in progress. Please wait for it to complete." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      isRunning = true;
      const sendEvent = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      sendEvent("log", "Starting Playwright E2E Test Suite runner...");

      // 1. Clean previous test results if they exist to avoid stale screenshots
      const testResultsDir = path.join(process.cwd(), "test-results");
      if (fs.existsSync(testResultsDir)) {
        try {
          fs.rmSync(testResultsDir, { recursive: true, force: true });
          sendEvent("log", "Cleared old test results directory.");
        } catch (e) {
          sendEvent("log", `Warning: Could not clear old test-results: ${(e as Error).message}`);
        }
      }

      // 2. Spawn the Playwright process
      // On Windows, npx must be executed as npx.cmd
      const command = process.platform === "win32" ? "npx.cmd" : "npx";
      const args = ["playwright", "test", "tests/erp-qa.spec.ts", "--project=chromium"];

      sendEvent("log", `Executing command: ${command} ${args.join(" ")}`);

      const child = spawn(command, args, {
        shell: true,
        env: { ...process.env, FORCE_COLOR: "0" }, // Keep output clean of ANSI color codes for simple parsing
      });

      child.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            sendEvent("log", trimmed);
          }
        }
      });

      child.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            sendEvent("log", `[ERROR] ${trimmed}`);
          }
        }
      });

      child.on("close", async (code) => {
        sendEvent("log", `Playwright execution finished with exit code: ${code}`);

        // Check if there was a failure (exit code not 0)
        if (code !== 0) {
          sendEvent("log", "Detecting failure artifacts (screenshots)...");

          // 3. Look for screenshots inside test-results folder
          try {
            if (fs.existsSync(testResultsDir)) {
              // Recursive function to search for PNGs
              const findPngFiles = (dir: string): string[] => {
                let results: string[] = [];
                const list = fs.readdirSync(dir);
                list.forEach((file) => {
                  const filePath = path.join(dir, file);
                  const stat = fs.statSync(filePath);
                  if (stat && stat.isDirectory()) {
                    results = results.concat(findPngFiles(filePath));
                  } else if (filePath.endsWith(".png")) {
                    results.push(filePath);
                  }
                });
                return results;
              };

              const pngs = findPngFiles(testResultsDir);

              if (pngs.length > 0) {
                const latestPng = pngs[0]; // grab first failure screenshot
                
                // Ensure public/screenshots exists
                const destDir = path.join(process.cwd(), "public", "screenshots");
                if (!fs.existsSync(destDir)) {
                  fs.mkdirSync(destDir, { recursive: true });
                }

                const filename = `e2e-failure-${Date.now()}.png`;
                const destPath = path.join(destDir, filename);
                
                fs.copyFileSync(latestPng, destPath);

                sendEvent("log", `✓ Failure screenshot captured and saved to public folder.`);
                sendEvent("screenshot", `/screenshots/${filename}`);
              } else {
                sendEvent("log", "No failure screenshots found inside test-results directory.");
              }
            } else {
              sendEvent("log", "test-results directory does not exist. No screenshots generated.");
            }
          } catch (err) {
            sendEvent("log", `Error processing screenshots: ${(err as Error).message}`);
          }
        } else {
          sendEvent("log", "✓ All E2E checks passed. No failure screenshots generated.");
        }

        // Release lock and close stream
        isRunning = false;
        controller.close();
      });

      child.on("error", (err) => {
        sendEvent("log", `Process failed to start: ${err.message}`);
        isRunning = false;
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
