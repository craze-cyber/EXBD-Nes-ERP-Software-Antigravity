const FIELD_LABELS: Record<string, string> = {
  name_en: "Name (English)", name_ar: "Name (Arabic)", basic_salary: "Basic Salary",
  client_id: "Client Assignment", work_status: "Work Status", iqama_no: "Iqama Number",
  iqama_expiry: "Iqama Expiry", passport_no: "Passport Number", nationality: "Nationality",
  mobile: "Mobile", designation: "Designation", joining_date: "Joining Date",
  sponsor_ref: "Sponsor Reference", emp_id: "Employee ID", region: "Region",
  legal_name: "Legal Name", cr_number: "CR Number", contact_person: "Contact Person",
  name: "Name", address: "Address", email: "Email", phone: "Phone",
  role: "Role", is_active: "Active Status", full_name: "Full Name",
  plate_number: "Plate Number", make: "Make", model: "Model", status: "Status",
  asset_code: "Asset Code", category: "Category", purchase_price: "Purchase Price",
  current_value: "Current Value", depreciation_rate: "Depreciation Rate",
};

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.includes("salary") || key.includes("price") || key.includes("value") || key.includes("amount")) {
    const n = parseFloat(value);
    if (!isNaN(n)) return `SAR ${n.toLocaleString("en", { minimumFractionDigits: 2 })}`;
  }
  if (key.includes("date") || key.includes("expiry")) return String(value);
  return String(value);
}

export function generateChangeSummary(
  before: Record<string, any> | null,
  after: Record<string, any>,
  module: string
): string {
  if (!before) return `New ${module} record created`;

  const changes: string[] = [];
  const SKIP = ["id", "created_at", "updated_at", "created_by"];

  Object.keys(after).forEach(key => {
    if (SKIP.includes(key)) return;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const label = FIELD_LABELS[key] || key.replace(/_/g, " ");
      changes.push(`${label}: "${formatValue(key, oldVal)}" → "${formatValue(key, newVal)}"`);
    }
  });

  return changes.length > 0 ? changes.join("\n") : "Minor update (no significant fields changed)";
}
