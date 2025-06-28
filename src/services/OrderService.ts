import { supabase } from '../lib/supabase';
import { CreateOrderDTO, Order, Customer } from '../types/order';

export class OrderService {
  async upsertCustomer(
    customer: CreateOrderDTO['customer']
  ): Promise<Customer> {
    console.log('[OrderService] upsertCustomer input:', customer);
    
    // If customer has an id, it's an existing customer - just return it
    if ('id' in customer && customer.id) {
      return customer as Customer;
    }
    
    // Try to find existing customer by name and phone_number
    const { data: existing, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('name', customer.name)
      .eq('phone_number', customer.phone_number)
      .single();
    if (findError && findError.code !== 'PGRST116') {
      console.error('[OrderService] upsertCustomer findError:', findError);
      throw findError;
    }
    if (existing) {
      // Update only if data changed
      if (
        existing.address !== customer.address ||
        existing.company !== customer.company
      ) {
        const { data: updated, error: updateError } = await supabase
          .from('customers')
          .update({
            address: customer.address,
            company: customer.company,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (updateError) {
          console.error(
            '[OrderService] upsertCustomer updateError:',
            updateError
          );
          throw updateError;
        }
        return updated as Customer;
      }
      return existing as Customer;
    } else {
      // Insert new customer
      const { data: inserted, error: insertError } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (insertError) {
        console.error(
          '[OrderService] upsertCustomer insertError:',
          insertError
        );
        throw insertError;
      }
      return inserted as Customer;
    }
  }

  async createOrder(dto: CreateOrderDTO, userId: string): Promise<Order> {
    console.log('[OrderService] createOrder input:', dto, userId);
    // 1. Upsert customer
    const customer = await this.upsertCustomer(dto.customer);
    console.log('[OrderService] upserted customer:', customer);
    // 2. Create order (order_status: 'sale', created_by: userId)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...dto.order,
        customer_id: customer.id,
        customer_name: customer.name,
        order_status: 'sale',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        code: 'TEMP', // Insert a placeholder code to satisfy NOT NULL constraint
      })
      .select()
      .single();
    if (orderError) {
      console.error('[OrderService] createOrder orderError:', orderError);
      throw orderError;
    }
    console.log('[OrderService] created order:', order);
    // 3. Generate order code: [SortedWorkTypeCodes]-[OrderID] using only work type codes
    // Example: ['kitchen', 'walls', 'floor'] => 'KW-7' (if codes are K, W, F)
    const WORK_TYPE_CODE_MAP: Record<string, string> = {
      kitchen: 'K',
      walls: 'W',
      floor: 'F',
      other: 'X',
      // Add more mappings as needed
    };
    const sortedCodes = (dto.order.work_types || [])
      .map((type) => WORK_TYPE_CODE_MAP[type] || type.charAt(0).toUpperCase())
      .sort()
      .join('');
    const orderCode = `${sortedCodes}-${order.id}`;
    const { error: codeError } = await supabase
      .from('orders')
      .update({ code: orderCode })
      .eq('id', order.id);
    if (codeError) {
      console.error('[OrderService] code update error:', codeError);
      throw codeError;
    }
    // 4. Insert measurements
    const measurements = dto.measurements.map((m) => ({
      ...m,
      order_id: order.id,
      total_price: m.quantity * m.price, // Updated field name and calculation
    }));
    const { error: measurementsError } = await supabase
      .from('measurements')
      .insert(measurements);
    if (measurementsError) {
      console.error(
        '[OrderService] createOrder measurementsError:',
        measurementsError
      );
      throw measurementsError;
    }
    // 5. Return the full order
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();
    if (fetchError) {
      console.error('[OrderService] createOrder fetchError:', fetchError);
      throw fetchError;
    }
    console.log('[OrderService] full order:', fullOrder);
    return fullOrder as Order;
  }

  async getAll(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }

  async getById(id: number): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Order;
  }

  async update(id: number, order: Partial<Order>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update(order)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  }

  async delete(id: number): Promise<void> {
    // Delete related measurements first
    const { error: measurementsError } = await supabase
      .from('measurements')
      .delete()
      .eq('order_id', id);
    if (measurementsError) throw measurementsError;

    // Delete the order
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
  }
}