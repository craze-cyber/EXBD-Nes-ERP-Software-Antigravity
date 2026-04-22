export function fuzzyMatchColumn(headerName: string, possibleFields: string[]): string | null {
  if (!headerName) return null;
  const cleanHeader = headerName.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Exact match fast path
  const exactMatch = possibleFields.find(f => f.replace(/[^a-z0-9]/g, "") === cleanHeader);
  if (exactMatch) return exactMatch;

  // Custom known mappings for Excel headers to DB columns
  const mappings: Record<string, string[]> = {
    "name_en": ["employeenameenglish", "nameen", "englishname", "name"],
    "name_ar": ["employeenamearabic", "namear", "arabicname"],
    "photo_url": ["selfiephotoattachment", "selfie", "photo", "photourl"],
    "iqama_no": ["iqamano", "iqama", "idnumber", "residentid"],
    "iqama_expiry": ["iqamaexpirydategreg", "iqamaexpiry", "expirydate"],
    "iqama_url": ["iqamaattachment", "uploadiqama", "iqamacopy"],
    "joining_date": ["joiningdateksaentrydateortransferreddate", "ksaentrydate", "joiningdate"],
    "date_of_joining": ["dateofjoining", "doj"],
    "passport_no": ["passportno", "passportnumber", "passport"],
    "passport_issue_date": ["passportissuedate"],
    "passport_expiry_date": ["passportexpirydate"],
    "passport_url": ["passportcopyattachment", "uploadpassport", "passportcopy"],
    "driving_license_no": ["drivinglicenseno", "licenseno"],
    "driving_license_expiry": ["drivinglicenseexpiry", "licenseexpiry"],
    "driving_license_url": ["drivinglicenseattachment", "drivinglicensecopy"],
    "driver_card_url": ["uploaddrivercard", "drivercard"],
    "ajeer_url": ["uploadajeercopy", "ajeercopy", "ajeer"],
    "dob": ["dateofbirthgregorian", "dateofbirth", "dob"],
    "nationality": ["nationality", "country"],
    "mobile": ["mobilenumber", "mobile", "phonenumber", "phone"],
    "home_mobile": ["homemobilenumber", "homemobile"],
    "personal_email": ["personalemailid", "emailid", "email"],
    "sponsor_ref": ["sponsoridsaudi", "sponsorid"],
    "sponsor_name": ["sponsorname"],
    "basic_salary": ["basicsalary", "basic"],
    "food_allowance": ["foodallowance", "food"],
    "other_allowances": ["otherallowances", "otherallowance"],
    "client_id": ["assignedfor", "clientcode", "clientid"],
    "emp_id": ["externalid", "empid", "employeeid"],
    "work_status": ["workstatus", "status"],
    "occupation_en": ["occupationenglish", "occupationen", "profession", "jobtitle"],
    "occupation_ar": ["occupationarabic", "occupationar"],
    "job_module_hrs": ["jobmodulehrs", "jobmodule", "workinghrs"],
    "designation": ["designation"],
    "cr_mol_no": ["crmolno", "crno", "molno"],
    "health_insurance_no": ["healthinsuranceno", "insuranceno"],
    "health_insurance_expiry": ["healthinsuranceexpirydate", "insuranceexpiry"],
    "camp_name": ["campname", "camp"],
    "region": ["region", "state", "province"],
    "city": ["city"],
    "bank_iban": ["bankacciban", "bankiban", "iban", "accountnumber"],
    "bank_iban_url": ["bankaccountibanattachment", "ibanattachment", "bankaccattachment"]
  };

  for (const [dbField, aliases] of Object.entries(mappings)) {
    if (aliases.some(alias => cleanHeader.includes(alias) || alias.includes(cleanHeader))) {
      return dbField;
    }
  }

  // Fallback simple similarity check
  let bestMatch = null;
  let bestScore = 0;

  for (const field of possibleFields) {
    const cleanField = field.replace(/[^a-z0-9]/g, "");
    if (cleanHeader.includes(cleanField) || cleanField.includes(cleanHeader)) {
       bestMatch = field;
       bestScore = 1;
    }
  }

  return bestMatch;
}

// -------------------------------------------------------------------------------------------------
// PAYROLL AUTO-MAPPING ENGINE - BRAIN CORE
// -------------------------------------------------------------------------------------------------

export interface MappingResult {
  mapped: Record<string, string>; // system_field -> original_header
  unmapped: string[];             // Headers without confident hits
  confidence: Record<string, number>; // Header -> Confidence Rating
}

export interface AttendanceGridConfig {
  has_attendance_grid: boolean;
  start_col_index: number;
}

export interface RateCard {
  basic_rate_unskilled?: number;
  basic_rate_skilled?: number;
  ot_day_rate?: number;
  ot_hour_rate?: number;
}

export const PAYROLL_ALIASES: Record<string, string[]> = {
  emp_id: ['emp id','emp no','emp number','employee id','id','no','serial','code','empno','empid'],
  worker_name: ['employee name','emp name','name','full name','worker name','staff name'],
  position: ['position','designation','grade','post','role','type','category'],
  vendor_name: ['vendor','vendor name','company','supplier'],
  basic_salary: ['basic','basic salary','basic pay','base salary','wage'],
  food_allowance: ['food','food allow','food allowance','meal','meals'],
  housing_allowance: ['housing','hra','house rent','accommodation'],
  transport_allowance: ['transport','travel','conveyance','trans allow'],
  other_allowances: ['other','others','misc','additional','extra allow'],
  overtime_hours: ['ot hours','overtime hours','ot hrs','ot','over time'],
  overtime_amount: ['ot amount','overtime amount','ot pay','ot salary'],
  deductions: ['deduction','deductions','less','minus','ded'],
  net_salary: ['net','net salary','net pay','total net','payable','net amount'],
  working_days: ['working day','working days','work days','days worked'],
  paid_days: ['paid day','paid days','payable days'],
  absent_days: ['absent','absences','absent days'],
  week_off: ['week off','day off','weekly off','wo'],
  ot_days: ['otd','ot days','overtime days','ot day'],
  pay_period: ['month','period','pay period','payroll month']
};

function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

export function autoMapHeaders(headers: string[]): MappingResult {
   const mapped: Record<string, string> = {};
   const unmapped: string[] = [];
   const confidence: Record<string, number> = {};
   const usedHeaders = new Set<string>();

   for (const systemField of Object.keys(PAYROLL_ALIASES)) {
       let bestMatchHeader = null;
       let bestConf = 0;

       for (const header of headers) {
           if (!header || usedHeaders.has(header)) continue;
           
           const cleanHeader = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
           for (const alias of PAYROLL_ALIASES[systemField]) {
               const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
               if (cleanHeader === cleanAlias) {
                   if (1.0 > bestConf) { bestConf = 1.0; bestMatchHeader = header; }
               } else if (cleanHeader.includes(cleanAlias) || cleanAlias.includes(cleanHeader)) {
                   if (0.9 > bestConf) { bestConf = 0.9; bestMatchHeader = header; }
               } else {
                   const dist = levenshtein(cleanHeader, cleanAlias);
                   if (dist <= 2 && 0.85 > bestConf) {
                       bestConf = 0.85; bestMatchHeader = header;
                   } else if (dist <= 4 && 0.75 > bestConf) {
                       bestConf = 0.75; bestMatchHeader = header;
                   }
               }
           }
       }

       if (bestMatchHeader && bestConf >= 0.75) {
           mapped[systemField] = bestMatchHeader;
           confidence[bestMatchHeader] = bestConf;
           usedHeaders.add(bestMatchHeader);
       }
   }

   for (const h of headers) {
       if (h && !usedHeaders.has(h)) unmapped.push(h);
   }

   return { mapped, unmapped, confidence };
}

export function generateFingerprint(headers: string[]): string {
   const clean = headers.filter(h => h && String(h).trim() !== "").sort().join("|").toLowerCase();
   let hash = 0;
   for (let i = 0; i < clean.length; i++) {
      const char = clean.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
   }
   return Math.abs(hash).toString(36);
}

export function detectAttendanceGrid(headers: string[], rows: any[][]): AttendanceGridConfig | null {
    // Typical grid starts around column G (index 6) or later
    for (let i = 5; i < headers.length; i++) {
        const h = String(headers[i]).toLowerCase().trim();
        const isDate = !isNaN(Date.parse(h)) && h.length > 2; // Real date strings
        const isNumber = /^(0?[1-9]|[12][0-9]|3[01])$/.test(h); // 1-31
        const isDayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].some(d => h.includes(d));
        
        if ((isDate || isNumber || isDayName) && i + 5 < headers.length) {
            // Must have a sequence of columns to be a valid grid safely
            return { has_attendance_grid: true, start_col_index: i };
        }
    }
    return null;
}

export function detectRateCard(rows: any[][], headerRowIndex: number): RateCard | null {
    // Scan up to 5 rows above or inside header for known rate patterns
    const scanLimit = Math.min(rows.length, headerRowIndex + 5);
    for (let r = 0; r < scanLimit; r++) {
       const row = rows[r];
       const strValues = row.map(v => String(v).toLowerCase());
       
       const joined = strValues.join(" ");
       if (joined.includes("rate") || joined.includes("basic")) {
          // If we find large round numbers, it's a rate extraction
          const numbers = row.filter(v => typeof v === 'number' && v > 0);
          if (numbers.length >= 1) {
             const sorted = [...numbers].sort((a,b) => b-a);
             return {
                basic_rate_skilled: sorted[0] || 0,
                basic_rate_unskilled: sorted[1] || sorted[0],
                ot_day_rate: sorted.find(n => n > 50 && n < 300) || 120, // heuristic defaults
                ot_hour_rate: sorted.find(n => n > 10 && n < 50) || 15
             };
          }
       }
    }
    return null;
}
