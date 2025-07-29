import { OrderStage } from '@/pages/scheduling/types';

 
export * from './entities';

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

export interface Measurement {
  id: number;
  order_id: number;
  material_name: string;
  material_type: string;
  unit: string;
  quantity: number; // Now float8/double
  price: number; // Renamed from cost, now float8/double
  total_price: number; // Renamed from total_cost, now float8/double
}

export interface OrderCostBreakdown {
  id: number;
  order_detail_id: number;
  type: string;
  quantity: number | null;
  unit: string | null;
  cost_per_unit: number | null;
  total_cost: number | null;
  notes: string | null;
  added_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

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
  sales_person?: string | null;
  discount?: number | null;
  measurements?: {
    id: number;
    material_name: string;
    material_type: string;
    unit: string;
    quantity: number; // Now float8/double
    price: number; // Renamed from cost, now float8/double
    total_price: number; // Renamed from total_cost, now float8/double
  }[];
  stages?: OrderStage[];
}

export interface CreateOrderDTO {
  customer: Omit<
    Customer,
    'id' | 'created_at' | 'updated_at' | 'paid_total' | 'to_be_paid'
  >;
  order: Omit<
    Order,
    'id' | 'code' | 'created_by' | 'created_at' | 'updated_at'
  > & { work_types: string[]; sales_person?: string | null };
  measurements: Omit<Measurement, 'id' | 'order_id'>[];
}

export interface WorkOrderDetail {
  img_urls: string[];
  detail_id: string;
  order_id: string;
  assigned_to: string;
  due_date: string;
  process_stage: string;
  price: number;
  total_cost: number;
  notes?: string;
  cost_breakdown?: OrderCostBreakdown[];
  order?: {
    id: string;
    code: string;
    customer_id: number;
    customer_name: string;
    company: string;
    address: string;
    work_types: string[];
    created_at: string;
    img_urls?: string[];
    customer?: {
      id: number;
      name: string;
      company: string;
      phone_number: string;
      address: string;
    };
    measurements?: {
      id: string;
      material_name: string;
      material_type: string;
      unit: string;
      quantity: number; // Now float8/double
      price: number; // Renamed from cost, now float8/double
      total_price: number; // Renamed from total_cost, now float8/double
    }[];
    stages?: {
      id: string;
      stage_name: string;
      status: string;
      planned_start_date: string;
      planned_finish_date: string;
      actual_start_date: string;
      actual_finish_date: string;
      notes: string;
    }[];
  };
}

export interface WorkOrderStage {
  id: number;
  order_detail_id: number;
  stage_name: string;
  status: string;
  planned_start_date: string | null;
  planned_finish_date: string | null;
  actual_start_date: string | null;
  actual_finish_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderStageAssignment {
  id: number;
  order_stage_id: number;
  employee_name: string;
  work_date: string;
  note: string;
  is_done: boolean;
  created_at: string;
}

export interface CreateWorkOrderDTO {
  order_id: number;
  assigned_to: string;
  due_date: string;
  price: number;
  total_cost: number;
  notes: string;
  img_urls: string[];
  cost_breakdown?: Omit<
    OrderCostBreakdown,
    'id' | 'order_detail_id' | 'created_at' | 'updated_at'
  >[];
}
