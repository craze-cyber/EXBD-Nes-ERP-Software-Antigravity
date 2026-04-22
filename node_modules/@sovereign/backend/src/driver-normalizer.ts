/**
 * Normalizes driver names/IDs from Dabdoob XLSX sheets to a canonical form.
 * 
 * Rules:
 * 1. Strip email domains (e.g., @dabdoob.com, @gmail.com)
 * 2. Insert space between letters and numbers (e.g., "nofoz301" -> "nofoz 301")
 * 3. Lowercase and trim
 */
export function normalizeDriverName(rawId: string): string {
  if (!rawId) return "";
  
  let name = rawId.trim();
  
  // 1. Remove email domain
  if (name.includes('@')) {
    name = name.split('@')[0];
  }
  
  // 2. Insert space between letters and numbers (e.g., "nofoz301" -> "nofoz 301")
  // Only if there isn't already a space or separator
  if (!name.includes(' ')) {
    name = name.replace(/([a-zA-Z]+)(\d+)/g, '$1 $2');
  }
  
  return name.toLowerCase().trim();
}

/**
 * Attempts to match a normalized driver name to a worker in the database.
 */
export function findMatchingWorker(normalizedName: string, workers: any[]): any {
  if (!normalizedName || !workers) return null;
  
  // 1. Match by EMP ID (exact)
  let match = workers.find(w => 
    w.emp_id?.toLowerCase().trim() === normalizedName
  );
  
  if (match) return match;
  
  // 2. Match by Name (English)
  match = workers.find(w => 
    w.name_en?.toLowerCase().trim() === normalizedName
  );
  
  if (match) return match;
  
  // 3. Match by Name (Arabic - might need normalization/translation, but let's try simple match)
  match = workers.find(w => 
    w.name_ar?.toLowerCase().trim() === normalizedName
  );
  
  return match || null;
}
