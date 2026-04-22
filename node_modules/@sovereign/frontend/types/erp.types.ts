export type UserRole = "master_admin" | "admin" | "hr_manager" | "payroll_manager" | "accountant" | "viewer" | "manager" | "staff";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name_en: string;
  name_ar: string;
  cr_number: string;
  tax_number?: string;
  address?: string;
  contact_number?: string;
  created_at: string;
}

export interface Client {
  id: string;
  sponsor_id: string;
  name_en: string;
  name_ar: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface Worker {
  id: string;
  sponsor_id: string;
  client_id?: string;
  iqama_number: string;
  passport_number: string;
  full_name_en: string;
  full_name_ar: string;
  nationality: string;
  profession: string;
  status: "active" | "vacation" | "terminated" | "exit";
  joining_date: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  worker_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_status: "pending" | "processed" | "paid";
  created_at: string;
}
