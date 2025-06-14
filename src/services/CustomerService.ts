import { supabase } from '../lib/supabase';
import { Customer } from '../types/order';

export class CustomerService {
  async getAll(limit: number = 40, offset: number = 0): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as Customer[];
  }

  async getById(id: number): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Customer;
  }

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'paid_total' | 'to_be_paid'>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  }

  async update(id: number, customer: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
} 