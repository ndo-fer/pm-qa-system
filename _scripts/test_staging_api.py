import os
import sys
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Target Domain
API_BASE = "https://erp-api.padajaya.biz.id"

# Master endpoints to test
ENDPOINTS = {
    "MasClient": "/api/MasClient/getAll",
    "MasControllingArea": "/api/MasControllingArea/getAll",
    "MasCompanyCode": "/api/MasCompanyCode/getAll",
    "MasPlant": "/api/MasPlant/getAll",
    "MasStorageLocation": "/api/MasStorageLocation/getAll",
    "MasPurchasingORG": "/api/MasPurchasingORG/getAll",
    "MasSalesORG": "/api/MasSalesORG/getAll",
    "MasSalesDivision": "/api/MasSalesDivision/getAll",
    "MasSalesChannel": "/api/MasSalesChannel/getAll",
    "MasSalesGroup": "/api/MasSalesGroup/getAll",
    "MasCostCenter": "/api/MasCostCenter/getAll",
    "MasProfitCenter": "/api/MasProfitCenter/getAll",
    "MasTaxGroup": "/api/MasTaxGroup/getAll",
    "MasProduk (BAKU)": "/api/MasProduk/getAll?jenisBaku=BAKU",
    "MasProduk (JADI)": "/api/MasProduk/getAll?jenisBaku=JADI",
    "MasProduk (LAIN)": "/api/MasProduk/getAll?jenisBaku=LAIN",
}

def main():
    token = os.environ.get("ERP_API_TOKEN")
    if not token:
        print("Error: ERP_API_TOKEN environment variable is not set.")
        print("Please set it before running. E.g.:")
        print("  Windows PowerShell: $env:ERP_API_TOKEN='your_jwt_token_here'")
        print("  Command Prompt:     set ERP_API_TOKEN=your_jwt_token_here")
        token_input = input("\nOr enter your JWT Bearer Token now (leave empty to exit): ").strip()
        if not token_input:
            sys.exit(1)
        token = token_input

    # Strip Bearer if copy-pasted
    if token.lower().startswith("bearer "):
        token = token[7:]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("\n" + "="*60)
    print("           ERP STAGING MASTER DATA API AUDIT RUNNER")
    print("="*60)
    print(f"Target host: {API_BASE}\n")

    results = []

    for name, path in ENDPOINTS.items():
        url = f"{API_BASE}{path}"
        print(f"Testing {name:20} -> {path}...", end="", flush=True)
        try:
            r = requests.get(url, headers=headers, verify=False, timeout=5)
            status = r.status_code
            if status == 200:
                try:
                    data = r.json()
                    count = len(data) if isinstance(data, list) else 1
                    print(f" SUCCESS [200 OK] ({count} records found)")
                    results.append((name, "SUCCESS (200 OK)", f"{count} records"))
                except ValueError:
                    print(" SUCCESS [200 OK] (non-JSON response)")
                    results.append((name, "SUCCESS (200)", "Non-JSON response"))
            elif status == 401:
                print(" FAILED (401 Unauthorized)")
                results.append((name, "401 Unauthorized", "Token invalid or expired"))
            elif status == 404:
                print(" FAILED (404 Not Found)")
                results.append((name, "404 Not Found", "Endpoint route mismatch"))
            else:
                print(f" FAILED ({status} status)")
                results.append((name, f"Failed ({status})", r.text[:100]))
        except requests.exceptions.Timeout:
            print(" TIMEOUT")
            results.append((name, "Timeout", "Request exceeded limit"))
        except Exception as e:
            print(f" ERROR: {str(e)[:50]}")
            results.append((name, "Error", str(e)[:50]))

    print("\n" + "="*60)
    print("                        TEST SUMMARY")
    print("="*60)
    print(f"{'Endpoint Name':22} | {'Status result':20} | {'Record info / Details':20}")
    print("-"*68)
    for name, status, details in results:
        print(f"{name:22} | {status:20} | {details:20}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
