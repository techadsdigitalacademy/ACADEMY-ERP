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
  status: 'ACTIVE' | 'INACTIVE';
  
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
  lat?: number;
  lng?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
}

export type PaymentType = 'Full' | 'Advance' | 'Clearance';

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
}
