import { LucideIcon } from 'lucide-react';

// Customer Types
export interface Customer {
  id: number;
  name: string;
  address: string;
  phone_number: string;
  company: string;
  paid_total: number;
  to_be_paid: number;
  created_at: string;
  updated_at: string;
}

// Order Types
export interface Order {
  id: number;
  code: string;
  customer_id: number;
  customer_name: string;
  address: string;
  order_status: string;
  order_price: number;
  work_types: string[];
  created_by: string;
  company: string;
  created_at: string;
  updated_at: string;
}

// Measurement Types
export interface Measurement {
  id: number;
  order_id: number;
  material_name: string;
  material_type: string;
  unit: string;
  quantity: number;
  cost: number;
  total_cost: number;
}

// Status Types
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'converted';

// Navigation Types
export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

// Work Type
export  interface WorkType {
  name: string;
  code: string;
  value: string;
  label: string;
}

export * from './entities';