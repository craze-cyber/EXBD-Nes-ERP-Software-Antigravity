import glob
import re

files = glob.glob(r"D:\AI Project\sovereign-erp\app\(dashboard)\payroll\*\page.tsx")

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if Status control is already injected in tbody
    if 'MANAGE' not in content:
        repl_td = '''                      <td className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${isSaved ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-white/5'}`}>
                          {isSaved ? "PENDING" : "UNSAVED"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => setManageWorker(w)}
                          disabled={!isSaved}
                          className="text-blue-500 hover:text-blue-400 font-bold text-xs bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          MANAGE
                        </button>
                      </td>
                    </tr>'''
        
        # Replace the LAST </tr> before ))}
        content = re.sub(r'</tr>\s*\)\s*\}\s*\)', repl_td + '\n                  ))}', content)

    # Check modal injection
    clientSlug = filepath.split('\\')[-2]
    if "ManageWorkerModal" not in content.split("return (")[-1]:
        modal_str = f'''      {{manageWorker && (
        <ManageWorkerModal worker={{manageWorker}} onClose={{() => setManageWorker(null)}} period={{payPeriod}} clientSlug="{clientSlug}" />
      )}}
    </div>'''
        content = re.sub(r'</div>\s*$', modal_str + '\n', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Fixed {len(files)} files.")
