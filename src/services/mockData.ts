import type { Staff, Sale, Attendance } from '../types';

export const MOCK_STAFF: Staff = {
  id: 'a8b7c6d5-e4f3-a2b1-c0d9-e8f7a6b5c4d3',
  staff_code: 'TA-SLS-07',
  full_name: 'Rahul Sharma',
  department_id: 'sales-dept-id',
  role_id: 'sr-sales-role-id',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
  monthly_target_amount: 500000, // ₹5,00,000
  notice_period_days: 60,
  status: 'ACTIVE',
  department_name: 'Sales & Growth',
  role_name: 'Senior Sales Consultant'
};

export const INITIAL_MOCK_SALES: Sale[] = [
  {
    id: 'sale-1',
    staff_id: MOCK_STAFF.id,
    client_name: 'Aura Aesthetics Clinic',
    service_package: 'Premium Performance Marketing Plan (Meta & Google Ads)',
    payment_type: 'Advance',
    package_amount: 150000,
    received_amount: 75000,
    balance_amount: 75000,
    sale_month: 'July 2026',
    created_at: '2026-07-01T10:30:00Z'
  },
  {
    id: 'sale-2',
    staff_id: MOCK_STAFF.id,
    client_name: 'Apex Realty Developers',
    service_package: 'Hyperlocal Lead Gen Strategy & Sales Funnel Build',
    payment_type: 'Full',
    package_amount: 120000,
    received_amount: 120000,
    balance_amount: 0,
    sale_month: 'July 2026',
    created_at: '2026-07-01T14:45:00Z'
  },
  {
    id: 'sale-3',
    staff_id: MOCK_STAFF.id,
    client_name: 'Nova EduTech Ventures',
    service_package: '3-Month SEO Retainer + YouTube Channel Growth Plan',
    payment_type: 'Advance',
    package_amount: 250000,
    received_amount: 100000,
    balance_amount: 150000,
    sale_month: 'July 2026',
    created_at: '2026-06-28T09:15:00Z'
  },
  {
    id: 'sale-4',
    staff_id: MOCK_STAFF.id,
    client_name: 'Gourmet Grills Group',
    service_package: 'Social Media Management & Creative Video Shoots',
    payment_type: 'Clearance',
    package_amount: 90000,
    received_amount: 90000,
    balance_amount: 0,
    sale_month: 'July 2026',
    created_at: '2026-06-25T16:20:00Z'
  },
  {
    id: 'sale-5',
    staff_id: MOCK_STAFF.id,
    client_name: 'Zenith SaaS Solutions',
    service_package: 'LinkedIn B2B Lead Gen & Account-Based Marketing',
    payment_type: 'Advance',
    package_amount: 180000,
    received_amount: 60000,
    balance_amount: 120000,
    sale_month: 'July 2026',
    created_at: '2026-06-18T11:00:00Z'
  }
];

export const INITIAL_MOCK_ATTENDANCE: Attendance[] = [
  {
    id: 'att-1',
    staff_id: MOCK_STAFF.id,
    attendance_date: '2026-07-02',
    punch_in: '09:15:00',
    status: 'PRESENT',
    lat: 28.6139,
    lng: 77.2090
  },
  {
    id: 'att-2',
    staff_id: MOCK_STAFF.id,
    attendance_date: '2026-07-01',
    punch_in: '09:05:00',
    punch_out: '18:15:00',
    status: 'PRESENT',
    lat: 28.6139,
    lng: 77.2090
  }
];

export const formatCurrency = (value: number) => {
  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : Number(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(safeVal);
};

export const getMonthSummary = (sales: Sale[]) => {
  const summary = sales.reduce(
    (acc, sale) => {
      if (sale.payment_type !== 'Clearance') {
        acc.totalPackage += sale.package_amount;
      }
      acc.totalReceived += sale.received_amount;
      return acc;
    },
    { totalPackage: 0, totalReceived: 0, totalBalance: 0 }
  );
  summary.totalBalance = Math.max(0, summary.totalPackage - summary.totalReceived);
  return summary;
};

export const formatDate = (dateStr?: string, saleMonth?: string) => {
  if (!dateStr) {
    if (saleMonth) {
      const parts = saleMonth.split(' ');
      if (parts.length === 2) {
        const monthShort = parts[0].substring(0, 3);
        return `01 ${monthShort} ${parts[1]}`;
      }
      return saleMonth;
    }
    return '04 Jul 2026';
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    try {
      const cleanStr = dateStr.replace(' ', 'T');
      const fallbackDate = new Date(cleanStr);
      if (!isNaN(fallbackDate.getTime())) {
        return formatValidDate(fallbackDate);
      }
    } catch (e) {}
    
    if (saleMonth) {
      const parts = saleMonth.split(' ');
      if (parts.length === 2) {
        return `01 ${parts[0].substring(0, 3)} ${parts[1]}`;
      }
      return saleMonth;
    }
    return '04 Jul 2026';
  }

  return formatValidDate(date);
};

const formatValidDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

