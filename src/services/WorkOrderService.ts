import { supabase } from '../lib/supabase';
import {
  WorkOrderDetail,
  WorkOrderStage,
  CreateWorkOrderDTO,
} from '../types/order';
import { WORK_ORDER_STAGES, STAGE_STATUSES } from '../lib/constants';

export class WorkOrderService {
  // Fetch all work orders - Updated to fetch orders with status 'working' (not 'converted')
  async getAll(): Promise<WorkOrderDetail[]> {
    const { data, error } = await supabase
      .from('order_details')
      .select(
        `
        detail_id,
        order_id,
        assigned_to,
        due_date,
        process_stage,
        price,
        total_cost,
        notes,
        img_urls,
        updated_at,
        order:orders!inner (
          id,
          code,
          customer_id,
          customer_name,
          company,
          address,
          work_types,
          created_at,
          order_status,
          sales_person,
          discount,
          customer:customers (
            id,
            name,
            company,
            phone_number,
            address
          )
        ),
        cost_breakdown:order_cost_breakdown(*)
        `
      )
      .eq('order.order_status', 'working') // Only fetch orders with 'working' status
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching work orders:', error);
      throw error;
    }

    // Map the data to WorkOrderDetail type, ensuring correct type casting for IDs
    return data.map(item => {
      // Handle the order object properly - it should be a single object, not an array
      const orderData = Array.isArray(item.order) ? item.order[0] : item.order;
      
      return {
        detail_id: item.detail_id.toString(),
        order_id: item.order_id.toString(),
        assigned_to: item.assigned_to,
        due_date: item.due_date,
        process_stage: item.process_stage,
        price: item.price,
        total_cost: item.total_cost,
        notes: item.notes,
        img_urls: item.img_urls,
        updated_at: item.updated_at,
        order: orderData ? {
          id: orderData.id.toString(),
          code: orderData.code,
          customer_id: orderData.customer_id,
          customer_name: orderData.customer_name,
          company: orderData.company,
          address: orderData.address,
          work_types: orderData.work_types,
          created_at: orderData.created_at,
          order_status: orderData.order_status,
          sales_person: orderData.sales_person,
          discount: orderData.discount,
          customer: orderData.customer ? (Array.isArray(orderData.customer) ? orderData.customer[0] : orderData.customer) : undefined
        } : undefined,
        cost_breakdown: item.cost_breakdown || []
      };
    }) as WorkOrderDetail[];
  }

  // Create a new work order (with default stages)
  async create(dto: CreateWorkOrderDTO): Promise<WorkOrderDetail> {
    console.log('[WorkOrderService] Creating work order:', dto);

    try {
      // 1. Insert order_details
      const { data: detail, error } = await supabase
        .from('order_details')
        .insert({
          order_id: dto.order_id,
          assigned_to: dto.assigned_to,
          due_date: dto.due_date,
          price: dto.price,
          total_cost: dto.total_cost,
          notes: dto.notes,
          img_urls: dto.img_urls,
          process_stage: STAGE_STATUSES[0].value, // Set initial status to 'not_started'
        })
        .select()
        .single();

      console.log('[WorkOrderService] Work order creation result:', {
        data: detail,
        error,
      });
      if (error) throw error;

      // 2. Create default stages
      const stages = WORK_ORDER_STAGES.map((stage) => ({
        order_detail_id: detail.detail_id,
        stage_name: stage.value,
        status: STAGE_STATUSES[0].value, // Set initial status to 'not_started'
        created_at: new Date().toISOString(),
      }));

      await supabase.from('order_stages').insert(stages);

      // 3. Insert cost breakdown items if provided
      if (dto.cost_breakdown && dto.cost_breakdown.length > 0) {
        const costBreakdownItems = dto.cost_breakdown.map((item) => ({
          order_detail_id: detail.detail_id,
          type: item.type,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          total_cost: item.total_cost,
          notes: item.notes,
          added_by: dto.assigned_to,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: costBreakdownError } = await supabase
          .from('order_cost_breakdown')
          .insert(costBreakdownItems);

        if (costBreakdownError) {
          console.error(
            '[WorkOrderService] Error creating cost breakdown items:',
            costBreakdownError
          );
          // Don't throw here, we'll still return the created work order
        }
      }

      // Return the created work order with proper structure
      return {
        detail_id: detail.detail_id.toString(),
        order_id: detail.order_id.toString(),
        assigned_to: detail.assigned_to,
        due_date: detail.due_date,
        process_stage: detail.process_stage,
        price: detail.price,
        total_cost: detail.total_cost,
        notes: detail.notes,
        img_urls: detail.img_urls,
        updated_at: detail.updated_at,
        cost_breakdown: dto.cost_breakdown ? dto.cost_breakdown.map(item => ({
          id: 0, // Will be set by database
          order_detail_id: detail.detail_id,
          type: item.type,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          total_cost: item.total_cost,
          notes: item.notes,
          added_by: dto.assigned_to,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })) : []
      } as WorkOrderDetail;
    } catch (error) {
      console.error('[WorkOrderService] Error creating work order:', error);
      throw error;
    }
  }

  // Update a work order
  async update(
    detail_id: number,
    updates: Partial<WorkOrderDetail>
  ): Promise<WorkOrderDetail> {
    const { data, error } = await supabase
      .from('order_details')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('detail_id', detail_id)
      .select()
      .single();
    if (error) throw error;
    
    // Ensure proper type casting
    return {
      ...data,
      detail_id: data.detail_id.toString(),
      order_id: data.order_id.toString()
    } as WorkOrderDetail;
  }

  // Upload image to external provider (stub, replace with real logic)
  async uploadImage(): Promise<string> {
    // TODO: Replace with real upload logic (e.g., Cloudinary, S3, etc.)
    // For now, just return a placeholder URL
    return Promise.resolve(
      'https://via.placeholder.com/300x200.png?text=Work+Order+Image'
    );
  }

  // Get stages for a work order
  async getStages(order_detail_id: number): Promise<WorkOrderStage[]> {
    const { data, error } = await supabase
      .from('order_stages')
      .select('*')
      .eq('order_detail_id', order_detail_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as WorkOrderStage[];
  }

  async createStages(orderId: number) {
    console.log('[WorkOrderService] Creating stages for work order:', orderId);
    const stages = WORK_ORDER_STAGES.map((stage) => ({
      order_id: orderId,
      stage_name: stage.value,
      status: STAGE_STATUSES[0].value, // Set initial status to 'not_started'
      created_at: new Date().toISOString(),
    }));
    const { data, error } = await supabase.from('order_stages').insert(stages);
    console.log('[WorkOrderService] Stages creation result:', { data, error });
    if (error) throw error;
    return data;
  }

  // Get cost breakdown for a work order
  async getCostBreakdown(order_detail_id: number) {
    const { data, error } = await supabase
      .from('order_cost_breakdown')
      .select('*')
      .eq('order_detail_id', order_detail_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  // Update cost breakdown items
  async updateCostBreakdown(order_detail_id: number, items: any[]) {
    // First delete existing items
    await supabase
      .from('order_cost_breakdown')
      .delete()
      .eq('order_detail_id', order_detail_id);

    // Then insert new items
    const { data, error } = await supabase.from('order_cost_breakdown').insert(
      items.map((item) => ({
        ...item,
        order_detail_id,
        updated_at: new Date().toISOString(),
      }))
    );

    if (error) throw error;
    return data;
  }
}