import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def log_step(step_num, message):
    print(f"\n[STEP {step_num}] {message}")
    print("-" * 50)

def main():
    # Configure Edge options (headed mode so the user can see it run)
    edge_options = Options()
    # No --headless flag here so it is fully visible!
    edge_options.add_argument("--no-sandbox")
    edge_options.add_argument("--disable-dev-shm-usage")
    edge_options.add_argument("--window-size=1366,768")
    edge_options.add_argument("--start-maximized")

    print("\nInitializing Edge WebDriver for visual E2E test run...")
    driver = webdriver.Edge(options=edge_options)
    wait = WebDriverWait(driver, 10)

    try:
        # Step 1: Navigating to local Next.js project management site
        log_step(1, "Navigating to Login Page (http://localhost:3000)...")
        driver.get("http://localhost:3000")
        time.sleep(2)

        # Step 2: Entering QA credentials
        log_step(2, "Entering QA credentials (qa@erp.local / qa123)...")
        email_input = wait.until(EC.element_to_be_clickable((By.ID, "email")))
        password_input = wait.until(EC.element_to_be_clickable((By.ID, "password")))
        
        email_input.send_keys("qa@erp.local")
        password_input.send_keys("qa123")
        time.sleep(1.5)

        # Step 3: Submitting the login form
        log_step(3, "Clicking Login button...")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(3) # Wait for page load and dashboard data

        # Step 4: Navigating to the QA Testing Console
        log_step(4, "Clicking the QA menu in the sidebar...")
        qa_menu = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/qa')]")))
        qa_menu.click()
        time.sleep(3)

        # Step 5: Selecting the Data Induk Test Plan Suite
        log_step(5, "Selecting 'Data Induk' test plan suite in the sidebar...")
        # Search for the button containing Data Induk module tag
        masclient_suite = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Data Induk')]")))
        masclient_suite.click()
        time.sleep(2)

        # Step 6: Executing the first test case
        log_step(6, "Clicking 'Run Test' on the first test case...")
        run_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[contains(., 'Run Test')])[1]")))
        run_btn.click()
        time.sleep(2)

        # Step 7: Performing Mock API connection test inside the Dialog modal
        log_step(7, "Locating Live API Tester and triggering 'Mock API (Local)' endpoint test...")
        # Since Mock Mode radio is checked by default, we trigger the endpoint check button
        trigger_check_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Run Live Endpoint Check')]")))
        trigger_check_btn.click()
        
        # Wait for simulated 200ms latency and success message
        time.sleep(2.5)

        # Step 8: Logging the outcome to the DB
        log_step(8, "Clicking 'Log Outcome' to register the successful run...")
        log_outcome_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Log Outcome')]")))
        log_outcome_btn.click()
        time.sleep(2.5)

        # Step 9: Demonstrating error-to-defect creation loop
        log_step(9, "Re-running test case to demonstrate the 'Real Server' failure and automatic defect creation...")
        run_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[contains(., 'Run Test')])[1]")))
        run_btn.click()
        time.sleep(1.5)

        # Select Real Server radio button
        log_step(10, "Selecting 'Real Staging API' to simulate a missing token error...")
        real_server_radio = wait.until(EC.element_to_be_clickable((By.XPATH, "//label[contains(., 'Real Staging API')]")))
        real_server_radio.click()
        time.sleep(1)

        # Trigger check (without typing a token, which yields 401 Unauthorized)
        log_step(11, "Triggering endpoint test on staging server (will return 401)...")
        trigger_check_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Run Live Endpoint Check')]")))
        trigger_check_btn.click()
        time.sleep(2.5) # Wait for network request and 401 rendering

        # Log the failed outcome (which has Checked Defect Creation enabled automatically)
        log_step(12, "Confirming the defect check is auto-enabled and logging failed outcome...")
        log_outcome_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Log Outcome')]")))
        log_outcome_btn.click()
        time.sleep(3)

        # Step 10: Navigating to Tasks Kanban board to inspect the newly logged defect
        log_step(13, "Navigating to Tasks page to verify the ticket creation on the Kanban board...")
        tasks_menu = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/tasks')]")))
        tasks_menu.click()
        
        print("\n" + "=" * 60)
        print(" SUCCESS: E2E Demonstration Completed!")
        print(" You should now see the automatically logged [DEFECT] ticket in your Kanban board.")
        print("=" * 60 + "\n")
        
        time.sleep(5) # Let the user look at the Kanban board before closing

    except Exception as e:
        print(f"\n[ERROR] E2E script failed: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
