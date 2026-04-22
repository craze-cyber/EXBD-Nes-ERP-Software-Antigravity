const fs = require('fs');
const glob = require('glob');

const files = glob.sync('D:\\AI Project\\sovereign-erp\\app\\(dashboard)\\payroll\\*\\page.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('MANAGE</button>')) {
        const repl = `                      <td className="px-5 py-4 text-center">
                        <span className={\`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider \${isSaved ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-white/5'}\`}>
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
                    </tr>`;
        
        // Find the last </tr> before ))}
        content = content.replace(/<\/tr>\s*\)\)\}/, repl + '\n                  ))}');
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('Fixed ' + files.length + ' files');
