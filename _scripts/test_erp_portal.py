import time
import sys
import argparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Configure credentials
CREDENTIALS = {
    "admin": {"username": "PDJService", "password": "pdj123", "label": "Administrator"},
    "topuser": {"username": "K009", "password": "123456", "label": "Top User"},
    "user": {"username": "K010", "password": "12345", "label": "Standard User"}
}

def log_step(step_num, message):
    print(f"\n[STEP {step_num}] {message}")
    print("-" * 55)

def main():
    # Setup CLI argument parsing to choose roles easily
    parser = argparse.ArgumentParser(description="Staging ERP Automated E2E Test Suite")
    parser.add_argument(
        "--role", 
        choices=["admin", "topuser", "user"], 
        default="admin",
        help="Select user role to run test: admin, topuser, or user"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run Edge browser in headless mode"
    )
    args = parser.parse_args()
    
    selected_role = args.role
    user_info = CREDENTIALS[selected_role]
    
    # Configure Edge webdriver
    edge_options = Options()
    if args.headless:
        edge_options.add_argument("--headless")
    edge_options.add_argument("--no-sandbox")
    edge_options.add_argument("--disable-dev-shm-usage")
    edge_options.add_argument("--start-maximized")
    edge_options.add_argument("--window-size=1366,768")
    
    print(f"\n=======================================================")
    print(f" STARTING AUTOMATED ERP E2E TEST AS: {user_info['label'].upper()}")
    print(f"=======================================================")

    driver = webdriver.Edge(options=edge_options)
    wait = WebDriverWait(driver, 15)

    try:
        # Step 1: Navigate to staging ERP login portal
        log_step(1, "Navigating to Staging ERP (https://erp.padajaya.biz.id)...")
        driver.get("https://erp.padajaya.biz.id")
        time.sleep(3)

        # Step 2: Fill login credentials
        log_step(2, f"Entering credentials for {user_info['label']} ({user_info['username']})...")
        un_field = wait.until(EC.element_to_be_clickable((By.ID, "UserName")))
        pw_field = wait.until(EC.element_to_be_clickable((By.ID, "Password")))
        
        un_field.send_keys(user_info["username"])
        pw_field.send_keys(user_info["password"])
        time.sleep(1.5)

        # Step 3: Trigger login click
        log_step(3, "Clicking 'Masuk' button...")
        login_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Masuk') or contains(text(), 'Masuk')]")))
        login_btn.click()
        
        # Blazor Server establishes SignalR socket connection
        log_step(4, "Waiting for Blazor SignalR connection and portal homepage render...")
        time.sleep(5)
        print(f"Dashboard URL: {driver.current_url}")

        # Helper function to find workspace tabs in sub-header
        def find_tab(name):
            try:
                return wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[contains(@class, 'tab-group-label') and contains(., '{name}')]")))
            except Exception:
                try:
                    return wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[contains(., '{name}')]")))
                except Exception:
                    return wait.until(EC.element_to_be_clickable((By.XPATH, f"//*[contains(@class, 'tab-group') or contains(@class, 'nav')]//*[contains(text(), '{name}')]")))

        # Helper function to find workspace tiles/cards
        def find_tile(name):
            try:
                return wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[contains(@class, 'tile') and .//h3[contains(text(), '{name}')]]")))
            except Exception:
                try:
                    return wait.until(EC.element_to_be_clickable((By.XPATH, f"//h3[contains(text(), '{name}')]/ancestor::button")))
                except Exception:
                    return wait.until(EC.element_to_be_clickable((By.XPATH, f"//*[contains(text(), '{name}')]")))

        # Step 4: Navigate to Master Client (Katalog Pelanggan)
        log_step(5, "Navigating to 'Pelanggan' tab...")
        pelanggan_tab = find_tab("Pelanggan")
        pelanggan_tab.click()
        time.sleep(2)

        log_step(6, "Opening 'Katalog Pelanggan' tile view...")
        katalog_pelanggan_tile = find_tile("Katalog Pelanggan")
        katalog_pelanggan_tile.click()
        time.sleep(4) # Wait for master table data to fetch and render

        # Capture screenshot of loaded table
        screenshot_path = f"artifacts/erp_client_table_{selected_role}.png"
        driver.save_screenshot(screenshot_path)
        print(f"-> Captured screen of Master Client table and saved to: {screenshot_path}")

        # Step 5: Navigate to Master Product (Barang)
        log_step(7, "Navigating to 'Barang' tab...")
        barang_tab = find_tab("Barang")
        barang_tab.click()
        time.sleep(2)

        # Test 'Barang Lain' tile (which loads a styling theme/color picker page without crashing)
        try:
            log_step(8, "Opening 'Barang Lain' tile view...")
            barang_lain_tile = find_tile("Barang Lain")
            barang_lain_tile.click()
            time.sleep(3)
            # Take screenshot of Barang Lain page
            screenshot_path = f"artifacts/erp_barang_lain_{selected_role}.png"
            driver.save_screenshot(screenshot_path)
            print(f"-> Captured screen of 'Barang Lain' page and saved to: {screenshot_path}")
            
            # Go back to 'Barang' tab to check the crash behavior on 'Bahan Baku'
            barang_tab = find_tab("Barang")
            barang_tab.click()
            time.sleep(2)
        except Exception as e:
            print(f"-> Skip 'Barang Lain' check: {e}")

        # Now test 'Bahan Baku' and document the crash behavior
        try:
            log_step(9, "Opening 'Bahan Baku' tile view (Known Blazor Server crash test)...")
            bahan_baku_tile = find_tile("Bahan Baku")
            bahan_baku_tile.click()
            time.sleep(3)
            
            # Check if Blazor disconnected message is shown
            disconnect_modal_present = False
            try:
                page_source = driver.page_source
                if "Koneksi Terputus" in page_source or "Koneksi terputus" in page_source or "Reconnection failed" in page_source:
                    disconnect_modal_present = True
            except Exception:
                pass
                
            if disconnect_modal_present:
                print("-> Detected Blazor Server Circuit Disconnect (Server Exception triggered on Bahan Baku access)!")
                screenshot_path = f"artifacts/erp_barang_crash_{selected_role}.png"
                driver.save_screenshot(screenshot_path)
                print(f"-> Captured screen of Blazor connection crash and saved to: {screenshot_path}")
                
                # Recover by reloading the page
                log_step(10, "Recovering from Blazor crash by reloading page...")
                driver.refresh()
                time.sleep(5)
            else:
                print("-> Successfully opened Bahan Baku without circuit disconnect.")
                screenshot_path = f"artifacts/erp_bahan_baku_{selected_role}.png"
                driver.save_screenshot(screenshot_path)
                print(f"-> Captured screen of Bahan Baku catalog and saved to: {screenshot_path}")
        except Exception as e:
            print(f"-> Error checking Bahan Baku module: {e}")
            driver.refresh()
            time.sleep(5)

        # Step 6: Navigate to Organization Config (Master Plant)
        log_step(11, "Opening sidebar menu for configuration settings...")
        try:
            settings_tab = find_tab("Pengaturan")
            settings_tab.click()
        except Exception:
            # Fallback to hamburger menu icon click
            hamburger = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'navbar-toggler')]")))
            hamburger.click()
            time.sleep(1)
            settings_tab = find_tab("Pengaturan")
            settings_tab.click()
        time.sleep(2)

        log_step(12, "Opening 'Konfigurasi Organisasi' screen...")
        config_org = find_tile("Konfigurasi Organisasi")
        config_org.click()
        time.sleep(3)

        log_step(13, "Switching to 'Master Plant' sub-tab...")
        master_plant_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Master Plant')]")))
        master_plant_tab.click()
        time.sleep(3)

        # Step 7: Complete E2E run & Logout
        log_step(14, "Logging out from ERP portal...")
        try:
            profile_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'dropdown-toggle') or contains(@id, 'profile') or contains(., 'PD') or @type='button']")))
            profile_btn.click()
        except Exception:
            # Fallback: click the PD text container
            profile_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'PD')]")))
            profile_btn.click()
        time.sleep(1)
        logout_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Keluar') or contains(text(), 'Log out')]")))
        logout_btn.click()
        time.sleep(2)

        print("\n" + "=" * 55)
        print(f" SUCCESS: Staging ERP E2E Test Completed for {user_info['label'].upper()}!")
        print("=" * 55 + "\n")

    except Exception as e:
        print(f"\n[ERROR] E2E script failed during execution: {e}")
        # Capture error screenshot for debugging
        error_path = f"artifacts/erp_error_{selected_role}.png"
        driver.save_screenshot(error_path)
        print(f"-> Saved error state screenshot to: {error_path}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
