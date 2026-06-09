import sqlite3
conn = sqlite3.connect("F:/ERP/erp-pm-system/erp_pm.db")
c = conn.cursor()

print("=== FINAL DATA VERIFICATION ===")
print()
print("Tables:")
for t in ["projects", "milestones", "tasks", "test_plans", "test_cases", "users"]:
    count = c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {count}")

print()
print("Tasks by epic:")
for r in c.execute("SELECT epic, count(*) FROM tasks GROUP BY epic ORDER BY count(*) DESC"):
    print(f"  {r[0]}: {r[1]}")

print()
print("Tasks by status:")
for r in c.execute("SELECT status, count(*) FROM tasks GROUP BY status"):
    print(f"  {r[0]}: {r[1]}")

print()
print("QA by status:")
for r in c.execute("SELECT status, count(*) FROM test_cases GROUP BY status"):
    print(f"  {r[0]}: {r[1]}")

print()
import json
sc = c.execute("SELECT s_curve_target FROM projects LIMIT 1").fetchone()[0]
sc_data = json.loads(sc)
print(f"S-Curve weeks: {len(sc_data)}")
print(f"  Current week target: {sc_data[-1]['plannedCumulative'] * 100:.1f}%")

print()
print("Integrity:")
print(f"  Orphaned tasks: {c.execute('SELECT count(*) FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE p.id IS NULL').fetchone()[0]}")
print(f"  Orphaned test plans: {c.execute('SELECT count(*) FROM test_plans tp LEFT JOIN projects p ON tp.project_id = p.id WHERE p.id IS NULL').fetchone()[0]}")
print(f"  Orphaned test cases: {c.execute('SELECT count(*) FROM test_cases tc LEFT JOIN test_plans tp ON tc.test_plan_id = tp.id WHERE tp.id IS NULL').fetchone()[0]}")
print(f"  Tasks without phase: {c.execute('SELECT count(*) FROM tasks WHERE phase IS NULL').fetchone()[0]}")
print(f"  Tasks without epic: {c.execute('SELECT count(*) FROM tasks WHERE epic IS NULL').fetchone()[0]}")
print(f"  Duplicate TC numbers: {c.execute('SELECT count(*) FROM (SELECT case_number FROM test_cases GROUP BY case_number HAVING count(*) > 1)').fetchone()[0]}")

conn.close()
