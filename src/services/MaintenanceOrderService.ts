import { supabase } from '../lib/supabase';

export interface CreateMaintenanceOrderDTO {
  customer_name: string;
  address: string;
  company?: string;
  phone_number?: string;
  assigned_to: string;
  work_types: string[];
  estimated_price?: number;
  notes?: string;
}

export interface MaintenanceOrderResult {
  order: any;
  orderDetail: any;
  stages: any[];
}

export class MaintenanceOrderService {
  async createMaintenanceOrder(
    data: CreateMaintenanceOrderDTO,
    userId: string
  ): Promise<MaintenanceOrderResult> {
    try {
      // Generate order code based on work types
      const workTypeCode = this.generateWorkTypeCode(data.work_types);
      
      // Create the maintenance order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: data.customer_name,
          customer_phone: data.phone_number || '',
          customer_address: data.address,
          order_status: 'maintenance',
          code: '', // Will be updated after we get the ID
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update order code with the generated ID
      const orderCode = `M${workTypeCode}-${order.id}`;
      const { error: updateError } = await supabase
        .from('orders')
        .update({ code: orderCode })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Create order detail
      const { data: orderDetail, error: detailError } = await supabase
        .from('order_details')
        .insert({
          order_id: order.id,
          assigned_to: data.assigned_to,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          notes: data.notes || '',
          work_types: data.work_types,
          estimated_price: data.estimated_price || 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (detailError) throw detailError;

      // Create default stage for maintenance
      const { data: stage, error: stageError } = await supabase
        .from('order_stages')
        .insert({
          order_detail_id: orderDetail.detail_id,
          stage_name: 'Maintenance Work',
          status: 'not_started',
          notes: data.notes || '',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (stageError) throw stageError;

      return {
        order: { ...order, code: orderCode },
        orderDetail,
        stages: [stage],
      };
    } catch (error) {
      console.error('Error creating maintenance order:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to create maintenance order'
      );
    }
  }

  private generateWorkTypeCode(workTypes: string[]): string {
    const codeMap: Record<string, string> = {
      'kitchen': 'K',
      'bathroom': 'B',
      'living_room': 'L',
      'bedroom': 'BR',
      'walls': 'W',
      'flooring': 'F',
      'electrical': 'E',
      'plumbing': 'P',
      'painting': 'PT',
      'carpentry': 'C',
      'tiling': 'T',
      'hvac': 'H',
    };

    const codes = workTypes
      .map(type => codeMap[type] || type.charAt(0).toUpperCase())
      .slice(0, 3); // Limit to 3 codes max

    return codes.length > 0 ? codes.join('') : 'M';
  }
}