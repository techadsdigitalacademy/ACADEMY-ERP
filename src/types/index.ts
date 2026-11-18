export interface Department {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  role_name: string;
}

export interface Staff {
  id: string;
  staff_code: string;
  full_name: string;
  department_id?: string;
  role_id?: string;
  avatar_url?: string;
  monthly_target_amount: number;
  monthly_targets?: any;
  notice_period_days: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
  starting_salary?: number;
  current_salary?: number;
  offer_letter_url?: string;
  offer_letter_name?: string;
  offer_letter_uploaded_at?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  pan_number?: string;
  upi_id?: string;
  resignation_status?: 'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED';
  resignation_date?: string;
  last_working_day?: string;
  resignation_reason?: string;
  is_training?: boolean;
  training_start_date?: string;
  training_end_date?: string;
  training_duration_days?: number;
  training_commission_rate?: number;
  is_sales_manager?: boolean;
  assigned_executive_ids?: string[];
  
  // Joined fields for display
  department_name?: string;
  role_name?: string;
  designation?: string;
  gender?: string;
  shift_start_time?: string;
  shift_end_time?: string;
  weekly_off_day?: string;
}

export interface Attendance {
  id: string;
  staff_id: string;
  attendance_date: string; // YYYY-MM-DD
  punch_in?: string; // HH:MM:SS
  punch_out?: string; // HH:MM:SS
  selfie_url?: string;
  working_hours?: string;
  lat?: number;
  lng?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
}

export type PaymentType = 'Full' | 'Advance' | 'Clearance' | 'Refund';

export interface Sale {
  id: string;
  staff_id: string;
  client_name: string;
  service_package: string;
  payment_type: PaymentType;
  package_amount: number;
  received_amount: number;
  balance_amount: number;
  sale_month: string; // e.g. "July 2026"
  created_at?: string; // ISO date string for sorting
  payment_method?: string;
  payment_proof_url?: string;
  work_description?: string;
}

export interface Lead {
  id: string;
  lead_name: string;
  assigned_to?: string;
  status: 'NEW LEAD' | 'CONTACTED' | 'PROPOSAL SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
  whatsapp_number?: string;
  location?: string;
  project_name?: string;
  batch_id?: string;
  follow_up_notes?: string;
  created_at?: string;
}

export interface AcademyBatch {
  id: string;
  batch_name: string;
  tutor_id?: string;
}

export interface DailyReport {
  id: string;
  staff_id: string;
  report_date: string; // YYYY-MM-DD
  work_type: string; // 'Poster Work' | 'Re-edit' | 'Logo Work' | 'Ad placement'
  description?: string;
  created_at?: string;
  staff_name?: string; // display helper
  posters_count?: number;
  re_edits_count?: number;
  logos_count?: number;
  others_count?: number;
  ads_placed_count?: number;
  work_category?: string;
  client_name?: string;
  videos_count?: number;
  travel_expense?: number;
}


export interface StaffProfile {
  id: string;
  auth_user_id?: string;
  avatar_url?: string;
  full_name: string;
  designation: string;
  username: string;
  gender: string;
  shift_start_time: string;
  shift_end_time: string;
  weekly_off_day: string;
  created_at: string;
  base_salary?: number;
  starting_salary?: number;
  current_salary?: number;
  offer_letter_url?: string;
  offer_letter_name?: string;
  offer_letter_uploaded_at?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  pan_number?: string;
  upi_id?: string;
  resignation_status?: 'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED';
  resignation_date?: string;
  notice_period_days?: number;
  last_working_day?: string;
  resignation_reason?: string;
  is_training?: boolean;
  training_start_date?: string;
  training_end_date?: string;
  training_duration_days?: number;
  training_commission_rate?: number;
  is_sales_manager?: boolean;
  assigned_executive_ids?: string[];
  status?: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
  password?: string;
}

export interface SalesManagerConfig {
  is_sales_manager: boolean;
  assigned_executive_ids?: string[];
  assigned_at?: string;
  assigned_by?: string;
}

export interface SalaryIncrement {
  id: string;
  staff_id: string;
  previous_salary: number;
  new_salary: number;
  increment_amount: number;
  increment_percentage?: number;
  effective_from: string; // YYYY-MM-DD
  reason?: string;
  approved_by?: string;
  created_at?: string;
}

export interface MonthlyPayslip {
  id: string;
  staff_id: string;
  month_key: string; // YYYY-MM
  month_name: string; // e.g. "November 2026"
  base_salary: number;
  total_month_days: number;
  total_working_days: number;
  present_days: number;
  weekly_offs: number;
  holidays: number;
  medical_leaves: number;
  half_days: number;
  unpaid_leaves: number;
  payable_days: number;
  daily_rate: number;
  gross_earnings: number;
  leave_deductions: number;
  half_day_deductions: number;
  other_deductions: number;
  incentives: number;
  training_commission?: number;
  training_sales_total?: number;
  training_days_waived?: number;
  base_salary_waived?: number;
  working_days?: number;
  late_days?: number;
  total_deductions?: number;
  net_salary_in_words?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  pan_number?: string;
  upi_id?: string;
  attendance_breakdown?: any[];
  net_salary: number;
  payment_status: 'PENDING' | 'APPROVED' | 'DISBURSED';
  disbursement_date?: string;
  payment_method?: string;
  transaction_ref?: string;
  notes?: string;
  created_at?: string;
}
