"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKeetaWorkbook = parseKeetaWorkbook;
const XLSX = __importStar(require("xlsx"));
/**
 * Parses the Keeta payroll workbook.
 * Supports both the original multi-sheet format AND the new single-sheet consolidated template.
 */
function parseKeetaWorkbook(workbook) {
    var _a, _b;
    const result = {
        billing: [],
        reference: [],
        penalties: [],
        config: {
            spo_basic: 2000,
            out_basic: 5500,
            billing_cycle: '',
            start_date: '',
            end_date: '',
            billing_days: 28
        }
    };
    try {
        const sheets = workbook.SheetNames;
        // ═══════════════════════════════════════════════════
        // DETECT SINGLE SHEET CONSOLIDATED FORMAT
        // ═══════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════
        // DETECT SINGLE SHEET CONSOLIDATED FORMAT
        // ═══════════════════════════════════════════════════
        let inputSheet = null;
        let rawData = [];
        // Scan all sheets to find the one with the correct headers
        for (const sheetName of sheets) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
            if (data.length > 0) {
                // Check first 5 rows for the headers (since config rows might be present)
                const topRowsStr = JSON.stringify(data.slice(0, 5)).toLowerCase();
                if (topRowsStr.includes('courier id') && topRowsStr.includes('rider type')) {
                    inputSheet = sheet;
                    rawData = data;
                    console.log(`✅ Single-sheet Keeta Template detected in sheet: ${sheetName}`);
                    break;
                }
            }
        }
        if (inputSheet) {
            // ═══════════════════════════════════════════
            // READ CONFIG FROM ROWS 0-1
            // ═══════════════════════════════════════════
            if (rawData[0] && ((_a = rawData[0][0]) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase().includes('spo'))) {
                result.config.spo_basic = Number(rawData[0][1]) || 2000;
                // Optionally read threshold/rate if needed by engine
                result.config.threshold = Number(rawData[0][4]) || 350;
                result.config.ot_rate = Number(rawData[0][7]) || 5;
            }
            if (rawData[1] && ((_b = rawData[1][0]) === null || _b === void 0 ? void 0 : _b.toString().toLowerCase().includes('out'))) {
                result.config.out_basic = Number(rawData[1][1]) || 5500;
                result.config.net_bill = Number(rawData[1][4]) || 200;
                result.config.invalid_rate = Number(rawData[1][7]) || 5;
            }
            // ═══════════════════════════════════════════
            // DYNAMIC COLUMN MAPPING
            // ═══════════════════════════════════════════
            const headers = rawData[3].map(h => String(h || '').toLowerCase().trim());
            const idx = {
                id: headers.indexOf('courier id'),
                name: headers.indexOf('real name'),
                type: headers.indexOf('rider type (spo/out)'),
                orders: headers.indexOf('orders delivered'),
                status: headers.indexOf('status (valid/invalid)'),
                incentive: headers.indexOf('incentive from nafouz'),
                net_bill: headers.indexOf('net bill offset'),
                renewal: headers.indexOf('iqama renewal'),
                traffic: headers.indexOf('traffic violation'),
                vehicle: headers.indexOf('vehicle repairing cost'),
                dl: headers.indexOf('driving license cost'),
                advance: headers.indexOf('advance amount'),
                keeta_ded: headers.indexOf('keeta deduction (keeta)'),
                food: headers.indexOf('food compensation (keeta)'),
                penalty: headers.indexOf('internal penalty'),
                iban: headers.indexOf('iban'),
                sal_status: headers.indexOf('salary status (bank/cash/hold)')
            };
            // Ensure we found at least ID and Status
            if (idx.id === -1) {
                console.error('❌ Could not find "Courier ID" header');
                return result;
            }
            // Headers shifted to Row 3, Data starts at Row 4
            for (let i = 4; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || !row[idx.id] || String(row[idx.id]).trim() === '' || String(row[idx.id]).toLowerCase().includes('id'))
                    continue;
                const courierId = String(row[idx.id]).trim();
                const riderType = String(row[idx.type] || 'SPO').toUpperCase().includes('OUT') ? 'OUT' : 'SPO';
                const orders = Number(row[idx.orders]) || 0;
                const status = String(row[idx.status] || 'valid').toLowerCase();
                // 1. Map to billing internal format
                result.billing.push({
                    courier_id: courierId,
                    courier_name: String(row[idx.name] || ''),
                    partner_id: '',
                    partner_name: '',
                    billing_cycle: '',
                    is_valid: status,
                    reason: '',
                    online_days: 0,
                    daily_online_hours: 0,
                    peak_hours: 0,
                    delivered_orders: orders,
                    order_based_pricing: 0,
                    distance_pricing: 0,
                    da_capacity_incentive: 0,
                    experience_incentive: 0,
                    dxgy: 0,
                    subsidy: 0,
                    activities_rewards: 0,
                    keeta_deduction: Number(row[idx.keeta_ded]) || 0,
                    food_compensation: Number(row[idx.food]) || 0,
                    other_adjustment: 0,
                    tips: 0,
                    tga_deduction: 0,
                    total_payable_keeta: '0'
                });
                // 2. Map to reference internal format
                result.reference.push({
                    courier_id: courierId,
                    courier_alias: String(row[idx.name] || ''),
                    orders: orders,
                    rejections: 0,
                    id_type: 'SLAB',
                    real_name: String(row[idx.name] || ''),
                    iqama_no: String(row[idx.renewal] || ''),
                    rider_type: riderType,
                    mobile: '',
                    work_started: '',
                    last_worked: '',
                    advance: Number(row[idx.advance]) || 0,
                    violation_type: '',
                    violation_amount: 0,
                    iban: String(row[idx.iban] || ''),
                    legal_name: String(row[idx.name] || '')
                });
                // 3. Map to manual values (primary engine input)
                result.manualValues = result.manualValues || {};
                result.manualValues[courierId] = {
                    incentive_nafouz: Number(row[idx.incentive]) || 0,
                    net_bill: Number(row[idx.net_bill]) || 0,
                    iqama_renewal: Number(row[idx.renewal]) || 0,
                    traffic_violation: Number(row[idx.traffic]) || 0,
                    vehicle_repairing: Number(row[idx.vehicle]) || 0,
                    driving_license_cost: Number(row[idx.dl]) || 0,
                    advance_amount: Number(row[idx.advance]) || 0,
                    internal_penalty: Number(row[idx.penalty]) || 0,
                    salary_status: String(row[idx.sal_status] || '')
                };
            }
            return result;
        }
        // ═══════════════════════════════════════════════════
        // FALLBACK TO MULTI-SHEET FORMAT (ORIGINAL)
        // ═══════════════════════════════════════════════════
        const billingSheet = workbook.Sheets['ksa_payable'];
        if (billingSheet) {
            const data = XLSX.utils.sheet_to_json(billingSheet, { header: 1, raw: true, defval: '' });
            // Row 0: SPO basic salary, Row 1: OUT basic salary
            if (data[0] && data[0][0] === 'SPO')
                result.config.spo_basic = Number(data[0][1]) || 2000;
            if (data[1] && data[1][0] === 'OUT')
                result.config.out_basic = Number(data[1][1]) || 5500;
            for (let i = 4; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[3])
                    continue;
                const courierId = String(row[3]).trim();
                if (!courierId || courierId === '' || courierId === 'undefined')
                    continue;
                result.billing.push({
                    partner_id: String(row[0] || ''),
                    partner_name: String(row[1] || ''),
                    billing_cycle: String(row[2] || ''),
                    courier_id: courierId,
                    courier_name: String(row[4] || ''),
                    is_valid: String(row[5] || '-').toLowerCase(),
                    reason: String(row[6] || ''),
                    online_days: Number(row[7]) || 0,
                    daily_online_hours: Number(row[8]) || 0,
                    peak_hours: Number(row[9]) || 0,
                    delivered_orders: Number(row[10]) || 0,
                    order_based_pricing: Number(row[11]) || 0,
                    distance_pricing: Number(row[12]) || 0,
                    da_capacity_incentive: Number(row[13]) || 0,
                    experience_incentive: Number(row[14]) || 0,
                    dxgy: Number(row[15]) || 0,
                    subsidy: Number(row[16]) || 0,
                    activities_rewards: Number(row[17]) || 0,
                    keeta_deduction: Number(row[18]) || 0,
                    food_compensation: Number(row[19]) || 0,
                    other_adjustment: Number(row[20]) || 0,
                    tips: Number(row[21]) || 0,
                    tga_deduction: Number(row[22]) || 0,
                    total_payable_keeta: String(row[23] || '')
                });
            }
        }
        const refSheet = workbook.Sheets['reference'];
        if (refSheet) {
            const data = XLSX.utils.sheet_to_json(refSheet, { header: 1, raw: true, defval: '' });
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0])
                    continue;
                result.reference.push({
                    courier_id: String(row[0]).trim(),
                    courier_alias: String(row[1] || ''),
                    orders: Number(row[2]) || 0,
                    rejections: Number(row[3]) || 0,
                    id_type: String(row[4] || ''),
                    real_name: String(row[5] || ''),
                    iqama_no: String(row[6] || ''),
                    rider_type: String(row[7] || 'SPO'),
                    mobile: String(row[8] || ''),
                    work_started: row[9],
                    last_worked: row[10],
                    advance: Number(row[11]) || 0,
                    violation_type: String(row[12] || ''),
                    violation_amount: Number(row[17]) || 0,
                    iban: String(row[18] || ''),
                    legal_name: String(row[20] || row[5] || '')
                });
            }
        }
        const helpSheet = workbook.Sheets['Help'];
        if (helpSheet) {
            const data = XLSX.utils.sheet_to_json(helpSheet, { header: 1, raw: true, defval: '' });
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0])
                    continue;
                result.penalties.push({
                    iqama_no: String(row[0]),
                    name: String(row[1] || ''),
                    project: String(row[6] || ''),
                    city: String(row[7] || ''),
                    violation_type: String(row[8] || ''),
                    description: String(row[9] || ''),
                    penalty_rate: Number(row[10]) || 0,
                    total_penalty: Number(row[11]) || 0
                });
            }
        }
        // Capture Manual Extensions from City Sheets or Summaries (e.g., 'Riyadh', 'Summary_KSA')
        const ignoreSheets = ['ksa_payable', 'reference', 'Help', 'Invoice', 'Guidelines', 'Pivot Table 9'];
        result.manualValues = result.manualValues || {};
        workbook.SheetNames.forEach(sheetName => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            if (ignoreSheets.includes(sheetName))
                return;
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
            for (let i = 3; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[1])
                    continue;
                const courierId = String(row[1]).trim();
                // If it looks like a Courier ID (10+ digits)
                if (courierId.length > 10 && !isNaN(Number(courierId))) {
                    const existing = result.manualValues[courierId] || {};
                    // ─── AUTHORITATIVE values read directly from city sheets ───
                    // col15 = salary (already computed by spreadsheet, may include manual adjustments)
                    // col16 = incentive_nafouz
                    // col17 = net_bill offset (fixed 200)
                    // col18 = total_salary (gross) = col15 + col16 + col17
                    const salaryCitySheet = isFinite(Number(row[15])) && row[15] !== '' ? Number(row[15]) : ((_a = existing.salary_city_sheet) !== null && _a !== void 0 ? _a : null);
                    const incentiveCol16 = isFinite(Number(row[16])) && row[16] !== '' ? Number(row[16]) : ((_b = existing.incentive_nafouz) !== null && _b !== void 0 ? _b : 0);
                    const totalSalaryCitySheet = isFinite(Number(row[18])) && row[18] !== '' ? Number(row[18]) : ((_c = existing.total_salary_city_sheet) !== null && _c !== void 0 ? _c : null);
                    const netBill = isFinite(Number(row[17])) && row[17] !== '' ? Number(row[17]) : ((_d = existing.net_bill) !== null && _d !== void 0 ? _d : 0);
                    const iqama = isFinite(Number(row[19])) && row[19] !== '' ? Number(row[19]) : ((_e = existing.iqama_renewal) !== null && _e !== void 0 ? _e : 0);
                    const traffic = isFinite(Number(row[20])) && row[20] !== '' ? Number(row[20]) : ((_f = existing.traffic_violation) !== null && _f !== void 0 ? _f : 0);
                    const vehicle = isFinite(Number(row[21])) && row[21] !== '' ? Number(row[21]) : ((_g = existing.vehicle_repairing) !== null && _g !== void 0 ? _g : 0);
                    const dl = isFinite(Number(row[22])) && row[22] !== '' ? Number(row[22]) : ((_h = existing.driving_license_cost) !== null && _h !== void 0 ? _h : 0);
                    const advance = isFinite(Number(row[23])) && row[23] !== '' ? Number(row[23]) : ((_j = existing.advance_amount) !== null && _j !== void 0 ? _j : 0);
                    // col26 = internal penalty (must use null-coalescing NOT ||, because 0 is a valid penalty-free state)
                    const penaltyRaw = isFinite(Number(row[26])) && row[26] !== '' ? Number(row[26]) : null;
                    const penalty = penaltyRaw !== null ? penaltyRaw : ((_k = existing.internal_penalty) !== null && _k !== void 0 ? _k : null);
                    result.manualValues[courierId] = {
                        salary_city_sheet: salaryCitySheet, // col15: authoritative salary from sheet
                        incentive_nafouz: incentiveCol16, // col16: Nafouz incentive
                        total_salary_city_sheet: totalSalaryCitySheet, // col18: gross total
                        net_bill: netBill,
                        iqama_renewal: iqama,
                        traffic_violation: traffic,
                        vehicle_repairing: vehicle,
                        driving_license_cost: dl,
                        advance_amount: advance,
                        internal_penalty: penalty, // null means not in city sheet => fall back to Help
                        salary_status: existing.salary_status || '',
                        _hasCityData: true // marker: skip Help-sheet penalty fallback
                    };
                }
            }
        });
        return result;
    }
    catch (error) {
        console.error('Keeta Parser Error:', error);
        return Object.assign(Object.assign({}, result), { error: error.message });
    }
}
