import glob
import os

files = glob.glob(r"D:\AI Project\sovereign-erp\app\(dashboard)\payroll\*\page.tsx")

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Rename "Save Data" to "Sync Liabilities"
    content = content.replace("Save Data", "Sync Liabilities")

    # 2. Fix giftsgate schema error
    if "giftsgate" in filepath:
        content = content.replace("total_gross:", "total_gross_salary:")
        content = content.replace("total_net:", "total_net_salary:")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Patched {len(files)} files for Save Data and Giftsgate")
