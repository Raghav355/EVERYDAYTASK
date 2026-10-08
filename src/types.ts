export type ServiceItem = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  icon_tone: string;
  active: boolean;
  sort_order: number;
};

export type HelperItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  areas: string[];
  specialties: string[];
  status: string;
  rating: number;
  total_tasks: number;
};

export type BookingRow = {
  id: string;
  user_id: string;
  service_name: string;
  location: string;
  scheduled_date: string;
  time_slot: string;
  customer_name: string;
  customer_phone: string;
  notes: string;
  price: number;
  status: string;
  payment_status: string;
  helper_id: string | null;
  admin_notes: string;
  created_at: string;
};

export type PackageItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  tasks_included: number;
  perks: string[];
  active: boolean;
};

export type PromoItem = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
};

export type SupportItem = {
  id: string;
  booking_id: string | null;
  customer_name: string;
  customer_phone: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

export type RatingItem = {
  id: string;
  booking_id: string;
  helper_id: string | null;
  score: number;
  comment: string;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  audience: string;
  sent_at: string | null;
  created_at: string;
};

export type AdminProfile = {
  id: string;
  role: string;
  full_name: string;
};

export type AdminSection =
  | 'dashboard'
  | 'bookings'
  | 'helpers'
  | 'services'
  | 'packages'
  | 'promos'
  | 'support'
  | 'ratings'
  | 'notifications';

export const STATUS_FLOW = [
  'new',
  'accepted',
  'assigned',
  'on_the_way',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  accepted: 'Accepted',
  assigned: 'Assigned',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  paid: 'Paid',
  refunded: 'Refunded',
};
