"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeetaSalary = generateKeetaSalary;
// ═══════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ═══════════════════════════════════════════════════
const ORDER_THRESHOLD = 350;
const OT_RATE = 5; // SAR per OT order
const INVALID_RATE = 5; // SAR per order for invalid drivers
const NET_BILL_FIXED = 200; // Fixed monthly stipend
/**
 * Calculates the salary for a single driver based on the Keeta formula.
 *
 * VALID drivers (Excel formula):
 *   =IF(orders >= 350, 2000 + (orders - 350) * 5, orders * 5.714285714)
 *   Where 5.714285714 = basicSalary(2000) / threshold(350)
 *
 * INVALID drivers:
 *   = orders * 5  (flat per-order rate, no basic salary guarantee)
 */
function calculateSalary(orders, basicSalary, status, threshold = 350, otRate = 5, invalidRate = 5) {
    const normStatus = String(status || '').toLowerCase();
    const isValid = normStatus.includes('valid') && !normStatus.includes('invalid');
    if (!isValid) {
        // Invalid: flat per-order rate (e.g. 183 orders × 5 = 915)
        return orders * invalidRate;
    }
    if (orders >= threshold) {
        // Valid, above threshold: basic + OT orders premium
        // e.g. 400 orders → 2000 + (400-350) × 5 = 2250
        return basicSalary + (orders - threshold) * otRate;
    }
    // Valid, below threshold: prorated basic salary
    // e.g. 300 orders → 300 × (2000/350) = 1714.28
    return orders * (basicSalary / threshold);
}
/**
 * Generates the complete Keeta salary summary from parsed data.
 * Merges billing + reference + penalties into final salary rows.
 */
function generateKeetaSalary(parsed, manualInputs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const rows = [];
    // Build lookup maps
    const refMap = new Map();
    for (const ref of parsed.reference) {
        refMap.set(ref.courier_id, ref);
    }
    // Aggregate penalties by iqama number
    const penaltyMap = new Map();
    for (const p of parsed.penalties) {
        const key = String(p.iqama_no);
        penaltyMap.set(key, (penaltyMap.get(key) || 0) + (p.total_penalty || 0));
    }
    let serial = 1;
    for (const billing of parsed.billing) {
        const ref = refMap.get(billing.courier_id);
        const iqama = (ref === null || ref === void 0 ? void 0 : ref.iqama_no) || '';
        const riderType = (ref === null || ref === void 0 ? void 0 : ref.rider_type) || 'SPO';
        const basicSalary = riderType === 'OUT' ? parsed.config.out_basic : parsed.config.spo_basic;
        const orders = billing.delivered_orders;
        const status = billing.is_valid;
        // ═══════════════════════════════════════════
        // DYNAMIC CONFIG FROM PARSED DATA
        // ═══════════════════════════════════════════
        const threshold = parsed.config.threshold || 350;
        const otRate = parsed.config.ot_rate || 5;
        const invalidRate = parsed.config.invalid_rate || 5;
        // Get manual inputs for this driver (if any)
        const manual = (manualInputs === null || manualInputs === void 0 ? void 0 : manualInputs[billing.courier_id]) || {};
        const netBillFixed = manual.net_bill || parsed.config.net_bill || 200;
        // ═══════════════════════════════════════════════════════════════
        // SALARY — prefer city sheet (col15) which is authoritative and 
        // already includes any Keeta incentives / manual bonuses.
        // Fallback to formula only when no city sheet is available.
        // ═══════════════════════════════════════════════════════════════
        const hasCityData = !!manual._hasCityData;
        const salaryCitySheet = (_a = manual.salary_city_sheet) !== null && _a !== void 0 ? _a : null;
        const totalSalaryCitySheet = (_b = manual.total_salary_city_sheet) !== null && _b !== void 0 ? _b : null;
        const salary = (hasCityData && salaryCitySheet !== null)
            ? salaryCitySheet
            : calculateSalary(orders, basicSalary, status, threshold, otRate, invalidRate);
        const otOrders = orders - threshold;
        // Deductions (FORCE ABSOLUTE then subtract)
        const keetaDeduction = Math.abs(Number(billing.keeta_deduction || 0));
        const foodComp = Math.abs(Number(billing.food_compensation || 0));
        // Manual fields
        const incentive = Number((_c = manual.incentive_nafouz) !== null && _c !== void 0 ? _c : 0);
        const iqamaRenewal = Math.abs(Number((_d = manual.iqama_renewal) !== null && _d !== void 0 ? _d : 0));
        const trafficViolation = Math.abs(Number((_e = manual.traffic_violation) !== null && _e !== void 0 ? _e : 0));
        const vehicleRepair = Math.abs(Number((_f = manual.vehicle_repairing) !== null && _f !== void 0 ? _f : 0));
        const drivingLicense = Math.abs(Number((_g = manual.driving_license_cost) !== null && _g !== void 0 ? _g : 0));
        const advance = Math.abs(Number((_j = (_h = manual.advance_amount) !== null && _h !== void 0 ? _h : ref === null || ref === void 0 ? void 0 : ref.advance) !== null && _j !== void 0 ? _j : 0));
        // Penalty: if city sheet data exists, col26 is authoritative (even = 0 means no penalty).
        // Only fall back to Help-sheet penaltyMap if no city sheet data for this driver.
        const manualPenalty = manual.internal_penalty; // null = not set; 0 = explicitly zero
        const internalPenalty = hasCityData
            ? Math.abs(Number(manualPenalty !== null && manualPenalty !== void 0 ? manualPenalty : 0))
            : Math.abs(Number(manualPenalty != null ? manualPenalty : ((_k = penaltyMap.get(iqama)) !== null && _k !== void 0 ? _k : 0)));
        // ═══════════════════════════════════════════════════════════════
        // TOTALS
        // If city sheet provides total_salary (col18), use it directly.
        // Otherwise compute from parts: salary + incentive + netBillFixed.
        // ═══════════════════════════════════════════════════════════════
        const totalSalary = (hasCityData && totalSalaryCitySheet !== null)
            ? totalSalaryCitySheet
            : salary + incentive + netBillFixed;
        // Total Payable (Net) = Gross - All Deductions
        const totalPayable = totalSalary
            - iqamaRenewal
            - trafficViolation
            - vehicleRepair
            - drivingLicense
            - advance
            - keetaDeduction
            - foodComp
            - internalPenalty;
        rows.push({
            serial: serial++,
            courier_id: billing.courier_id,
            id_name: (ref === null || ref === void 0 ? void 0 : ref.legal_name) || billing.courier_name,
            real_rider_name: manual.real_rider_name || (ref === null || ref === void 0 ? void 0 : ref.legal_name) || billing.courier_name,
            iqama_no: iqama,
            business_unit: 'Keeta',
            designation: 'Driver',
            location: manual.location || 'Riyadh',
            vendor: riderType,
            basic_salary: basicSalary,
            orders_delivered: orders,
            delivered_by_reliever: 0,
            total_orders: orders,
            ot_orders: otOrders,
            status: status,
            salary: salary,
            incentive_nafouz: incentive,
            net_bill: netBillFixed,
            total_salary: totalSalary,
            iqama_renewal: iqamaRenewal,
            traffic_violation: trafficViolation,
            vehicle_repairing: vehicleRepair,
            driving_license_cost: drivingLicense,
            advance_amount: advance,
            deduction: keetaDeduction,
            food_compensation: foodComp,
            internal_penalty: internalPenalty,
            total_payable: totalPayable,
            iban: (ref === null || ref === void 0 ? void 0 : ref.iban) || manual.iban || '',
            salary_status: manual.salary_status || ''
        });
    }
    return rows;
}
