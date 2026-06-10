import { test, expect } from "@playwright/test";

test.describe("ERP PM System - QA Testing Console E2E Flow", () => {
  test("should log in, execute QA checks, simulate staging failure, and verify auto-created defect on Kanban board", async ({ page }) => {
    // Intercept API calls to surface errors clearly
    page.on("response", async (response) => {
      if (response.url().includes("/api/") && response.status() >= 400) {
        let body = "";
        try { body = await response.text(); } catch {}
        // Suppress expected 401 from staging server
        if (!response.url().includes("erp-api.padajaya.biz.id")) {
          console.log(`API ERROR [${response.status()}]: ${response.url()} → ${body.slice(0, 200)}`);
        }
      }
    });

    // Step 1: Navigate to Login Page
    console.log("1. Navigating to Login Page...");
    await page.goto("/");
    
    // Step 2: Enter QA credentials
    console.log("2. Entering QA credentials...");
    await page.fill("#email", "qa@erp.local");
    await page.fill("#password", "qa123");
    
    // Step 3: Submit login form
    console.log("3. Submitting the login form...");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    console.log("✓ Logged in and on Dashboard.");

    // Step 4: Navigate to QA Testing Console
    console.log("4. Navigating to QA Testing Console...");
    await page.click('a[href*="/qa"]');
    await expect(page).toHaveURL(/.*\/qa/, { timeout: 15000 });
    console.log("✓ On QA Testing Console.");

    // Step 5: Select Data Induk Test Plan Suite
    console.log("5. Selecting 'Data Induk' test plan suite...");
    await page.locator("text=Data Induk").first().click();
    console.log("✓ Selected 'Data Induk' suite.");

    // Step 6: Open first test case
    console.log("6. Clicking 'Run Test' on the first test case...");
    const runTestBtn = page.locator('button:has-text("Run Test")').first();
    await runTestBtn.click();
    console.log("✓ Execution dialog opened.");

    // Step 7: Trigger Mock API endpoint check (Pass scenario)
    console.log("7. Running 'Mock API (Local)' endpoint check...");
    const runCheckBtn = page.locator('button:has-text("Run Live Endpoint Check")');
    await runCheckBtn.click();
    await expect(page.locator("text=Connection successful").first()).toBeVisible({ timeout: 10000 });
    console.log("✓ Mock API check passed.");

    // Step 8: Log successful outcome
    console.log("8. Logging successful outcome...");
    const logOutcomeBtn = page.locator('button:has-text("Log Outcome")');
    await logOutcomeBtn.click();
    await expect(page.locator('text=Execution Checklist Steps')).not.toBeVisible({ timeout: 10000 });
    console.log("✓ Successful outcome logged.");

    // Step 9: Re-open test case for failure scenario
    console.log("9. Re-running test case to demonstrate failure and defect creation...");
    await runTestBtn.click();
    
    // Step 10: Switch to Real Staging API
    console.log("10. Selecting 'Real Staging API'...");
    await page.locator("text=Real Staging API").click();
    
    // Step 11: Trigger check on staging server (will fail with 401 = expected)
    console.log("11. Triggering staging server check (expect failure)...");
    await runCheckBtn.click();
    
    // Wait for error message to appear (either "Error" or "Network Error" text)
    await Promise.race([
      expect(page.locator("text=Error").first()).toBeVisible({ timeout: 10000 }),
      expect(page.locator("text=Network Error").first()).toBeVisible({ timeout: 10000 }),
    ]);
    console.log("✓ Staging API check failed as expected.");

    // Step 12: Verify 'Create Defect' checkbox is automatically checked for QA role
    const createDefectCheckbox = page.locator('input[type="checkbox"]').last();
    await expect(createDefectCheckbox).toBeChecked({ timeout: 3000 });
    console.log("✓ 'Create Defect' checkbox was auto-checked by the system.");

    // Step 13: Log failed outcome → this should trigger defect creation + redirect
    console.log("12. Logging failed outcome (triggers auto-defect ticket)...");
    await logOutcomeBtn.click();

    // Step 14: Verify navigation to the Tasks Kanban board
    console.log("13. Verifying redirection to Tasks Kanban board...");
    await expect(page).toHaveURL(/.*\/tasks/, { timeout: 15000 });
    console.log("✓ Redirected to Tasks page.");

    // Step 15: Verify the defect ticket is visible on the Kanban board
    await expect(page.locator('text=[DEFECT]').first()).toBeVisible({ timeout: 10000 });
    console.log("✓ Defect ticket is visible on the Kanban board!");
  });
});
