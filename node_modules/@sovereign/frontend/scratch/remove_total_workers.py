import glob
import re

files = glob.glob(r"D:\AI Project\sovereign-erp\app\(dashboard)\payroll\*\page.tsx")

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the line containing "total_workers:"
    new_content = re.sub(r'\s*total_workers:.*?,', '', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

print(f"Removed total_workers from {len(files)} files")
