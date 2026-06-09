import sqlite3
import json
from datetime import datetime, timedelta

conn = sqlite3.connect("F:/ERP/erp-pm-system/erp_pm.db")
c = conn.cursor()

# Fix S-Curve dates
r = c.execute("SELECT s_curve_target, id FROM projects LIMIT 1").fetchone()
data = json.loads(r[0])
if isinstance(data, str):
    data = json.loads(data)

def excel_date(serial):
    base = datetime(1899, 12, 30)
    return (base + timedelta(days=int(serial))).strftime("%Y-%m-%d")

fixed = []
for w in data:
    fixed.append({
        "week": w["week"],
        "weekStart": excel_date(w["weekStart"]),
        "weekEnd": excel_date(w["weekEnd"]),
        "plannedCumulative": w["plannedCumulative"],
        "targetMilestone": w["targetMilestone"],
    })

c.execute("UPDATE projects SET s_curve_target = ? WHERE id = ?", (json.dumps(fixed), r[1]))
conn.commit()
print(f"Fixed S-Curve: {len(fixed)} weeks")
print(f"  First: {fixed[0]}")
print(f"  Last: {fixed[-1]}")

# Fix bug tasks without phase
c.execute("UPDATE tasks SET phase = 'Phase 1' WHERE task_code = 'BUG-001'")
c.execute("UPDATE tasks SET phase = 'Phase 3' WHERE task_code = 'BUG-002'")
conn.commit()
print("Fixed 2 bug tasks with phase")

# Verify
r = c.execute("SELECT count(*) FROM tasks WHERE phase IS NULL").fetchone()
print(f"Tasks still without phase: {r[0]}")

# Check for any other issues
print("\n=== FINAL CHECK ===")
print(f"Projects: {c.execute('SELECT count(*) FROM projects').fetchone()[0]}")
print(f"Milestones: {c.execute('SELECT count(*) FROM milestones').fetchone()[0]}")
print(f"Tasks: {c.execute('SELECT count(*) FROM tasks').fetchone()[0]}")
print(f"Test Plans: {c.execute('SELECT count(*) FROM test_plans').fetchone()[0]}")
print(f"Test Cases: {c.execute('SELECT count(*) FROM test_cases').fetchone()[0]}")
print(f"Orphaned tasks: {c.execute('SELECT count(*) FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE p.id IS NULL').fetchone()[0]}")
print(f"Orphaned test cases: {c.execute('SELECT count(*) FROM test_cases tc LEFT JOIN test_plans tp ON tc.test_plan_id = tp.id WHERE tp.id IS NULL').fetchone()[0]}")

conn.close()
