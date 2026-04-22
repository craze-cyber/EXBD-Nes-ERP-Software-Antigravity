const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'app', '(dashboard)', 'payroll');

const clients = fs.readdirSync(dir).filter(f => {
    try { return fs.statSync(path.join(dir, f)).isDirectory(); } catch (e) { return false; }
});

clients.forEach(c => {
    const file = path.join(dir, c, 'page.tsx');
    if (fs.existsSync(file)) {
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
            
            content = content.replace(/<\/tr>\s*\)\)\}/, repl + '\n                  ))}');
            fs.writeFileSync(file, content, 'utf8');
        }
    }
});
console.log('Fixed using native node');
