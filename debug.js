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
const keeta_parser_1 = require("./lib/keeta-parser");
const keeta_salary_engine_1 = require("./lib/keeta-salary-engine");
const xlsx = __importStar(require("xlsx"));
const wb = xlsx.readFile('C:\\Users\\User\\Downloads\\RUH_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx');
const parsed = (0, keeta_parser_1.parseKeetaWorkbook)(wb);
const manuals = parsed.manualValues || {};
const salaryRows = (0, keeta_salary_engine_1.generateKeetaSalary)(parsed, manuals);
// Print full deduction breakdown per driver
console.log('Name                 | Keeta Ded | Food  | Iqama | Traffic | Vehicle | DL      | Advance | Penalty | TOTAL DED | Net Payable');
console.log('─'.repeat(130));
for (const r of salaryRows) {
    const totalDed = r.iqama_renewal + r.traffic_violation + r.vehicle_repairing +
        r.driving_license_cost + r.advance_amount + r.deduction + r.food_compensation + r.internal_penalty;
    console.log(`${r.id_name.substring(0, 20).padEnd(20)} | ${String(r.deduction).padStart(9)} | ${String(r.food_compensation).padStart(5)} | ${String(r.iqama_renewal).padStart(5)} | ${String(r.traffic_violation).padStart(7)} | ${String(r.vehicle_repairing).padStart(7)} | ${String(r.driving_license_cost.toFixed(2)).padStart(7)} | ${String(r.advance_amount).padStart(7)} | ${String(r.internal_penalty).padStart(7)} | ${totalDed.toFixed(2).padStart(9)} | ${r.total_payable.toFixed(2).padStart(10)}`);
}
