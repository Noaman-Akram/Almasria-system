import { Order, OrderStage, OrderStageAssignment } from './types';
import { supabase } from '../../lib/supabase';

// Types for the joined data
export interface CalendarData extends OrderStageAssignment {
  order_stages: OrderStage & {
    order_details: {
      detail_id: number;
      order_id: number;
      assigned_to?: string | null;
      due_date?: string | null;
      price: number;
      total_cost: number;
      notes?: string | null;
      process_stage?: string | null;
      orders: {
        id: number;
        code: string;
        customer_name: string;
        order_status: string;
      };
    };
  };
}

/**
 * Updates stage status to "scheduled" when assignment is created
 */
async function updateStageStatusToScheduled(stageId: number): Promise<void> {
  try {
    console.log(
      `[Stage Update] Setting stage ${stageId} status to 'scheduled'`
    );

    // First get current stage data
    const { data: currentStage, error: fetchError } = await supabase
      .from('order_stages')
      .select('*')
      .eq('id', stageId)
      .single();

    if (fetchError) {
      console.error('[Stage Update] Error fetching current stage:', fetchError);
      return; // Don't fail the assignment creation if stage update fails
    }

    // Only update if status is not already 'scheduled'
    if (currentStage.status !== 'scheduled') {
      const { error: updateError } = await supabase
        .from('order_stages')
        .update({
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', stageId);

      if (updateError) {
        console.error(
          '[Stage Update] Error updating stage status:',
          updateError
        );
        return; // Don't fail the assignment creation if stage update fails
      }

      console.log(
        `[Stage Update] Successfully updated stage ${stageId} to 'scheduled'`
      );
    }
  } catch (err) {
    console.error('[Stage Update] Unexpected error:', err);
    // Don't throw - stage update failure shouldn't break assignment creation
  }
}

/**
 * Updates stage status to "not_started" when all assignments for that stage are deleted
 */
async function updateStageStatusToNotStarted(stageId: number): Promise<void> {
  try {
    console.log(
      `[Stage Update] Checking if stage ${stageId} should be reset to 'not_started'`
    );

    // First check if there are any remaining assignments for this stage
    const { data: remainingAssignments, error: countError } = await supabase
      .from('order_stage_assignments')
      .select('id')
      .eq('order_stage_id', stageId);

    if (countError) {
      console.error(
        '[Stage Update] Error checking remaining assignments:',
        countError
      );
      return;
    }

    // If there are no remaining assignments, update the stage status to "not_started"
    if (!remainingAssignments || remainingAssignments.length === 0) {
      console.log(
        `[Stage Update] No assignments left for stage ${stageId}, resetting to 'not_started'`
      );

      const { error: updateError } = await supabase
        .from('order_stages')
        .update({
          status: 'not_started',
          updated_at: new Date().toISOString(),
        })
        .eq('id', stageId);

      if (updateError) {
        console.error(
          '[Stage Update] Error resetting stage status:',
          updateError
        );
        return;
      }

      console.log(
        `[Stage Update] Successfully reset stage ${stageId} to 'not_started'`
      );
    } else {
      console.log(
        `[Stage Update] Stage ${stageId} still has ${remainingAssignments.length} assignments, not resetting status`
      );
    }
  } catch (err) {
    console.error(
      '[Stage Update] Unexpected error when resetting stage status:',
      err
    );
  }
}

/**
 * Fetches all calendar data including assignments, stages, order details, and order information
 * in a single query to avoid N+1 problem
 */
export async function getCalendarData(
  from: string,
  to: string
): Promise<CalendarData[]> {
  console.log('Fetching calendar data from', from, 'to', to);

  const { data, error } = await supabase
    .from('order_stage_assignments')
    .select(
      `
      *,
      order_stages:order_stage_id (
        *,
        order_details:order_detail_id (
          detail_id,
          order_id,
          assigned_to,
          due_date,
          price,
          total_cost,
          notes,
          process_stage,
          orders:order_id (
            id,
            code,
            customer_name,
            order_status
          )
        )
      )
    `
    )
    .gte('work_date', from)
    .lte('work_date', to);

  if (error) {
    console.error('Error fetching calendar data:', error);
    throw error;
  }

  console.log(`Fetched ${data?.length || 0} assignments for the date range`);

  // Type assertion to ensure we have the correct type
  return data as unknown as CalendarData[];
}

// Function to fetch all assignments
export async function getAssignments(
  from: string,
  to: string
): Promise<OrderStageAssignment[]> {
  console.log('Fetching raw assignments from', from, 'to', to);

  const { data, error } = await supabase
    .from('order_stage_assignments')
    .select('*')
    .gte('work_date', from)
    .lte('work_date', to);

  if (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }

  console.log(`Fetched ${data?.length || 0} raw assignments`);
  return (data || []) as OrderStageAssignment[];
}

/**
 * Create a new assignment with automatic stage status update.
 * Matches the database schema fields exactly.
 */
export async function createAssignment(
  assignment: Omit<OrderStageAssignment, 'id'>
): Promise<OrderStageAssignment> {
  console.log('Creating assignment:', assignment);

  // Validate required fields according to schema
  if (!assignment.employee_name || !assignment.work_date) {
    throw new Error(
      'Missing required fields: employee_name and work_date are required'
    );
  }

  // Ensure we only send fields that exist in the database schema
  const sanitizedAssignment = {
    order_stage_id: assignment.order_stage_id,
    employee_name: assignment.employee_name,
    work_date: assignment.work_date,
    note: assignment.note || null,
    is_done: assignment.is_done !== undefined ? assignment.is_done : false,
    created_at: assignment.created_at || new Date().toISOString(),
    employee_rate: assignment.employee_rate || null,
  };

  // Create the assignment
  const { data, error } = await supabase
    .from('order_stage_assignments')
    .insert(sanitizedAssignment)
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    throw new Error(error.message);
  }

  console.log('Created assignment:', data);

  // Automatically update stage status to "scheduled" if stage exists
  if (assignment.order_stage_id) {
    await updateStageStatusToScheduled(assignment.order_stage_id);
  }

  return data as OrderStageAssignment;
}

/**
 * Update an assignment by id.
 * Only updates fields that exist in the database schema.
 */
export async function updateAssignment(
  id: number,
  updates: Omit<Partial<OrderStageAssignment>, 'id'>,
): Promise<OrderStageAssignment> {
  try {
    console.log(`Updating assignment ${id}:`, updates);

    // Ensure we only update fields that exist in the database schema
    const sanitizedUpdates: Record<string, any> = {};

    // Only include defined fields that are part of the schema
    if (updates.order_stage_id !== undefined)
      sanitizedUpdates.order_stage_id = updates.order_stage_id;
    if (updates.employee_name !== undefined)
      sanitizedUpdates.employee_name = updates.employee_name;
    if (updates.work_date !== undefined)
      sanitizedUpdates.work_date = updates.work_date;
    if (updates.note !== undefined) sanitizedUpdates.note = updates.note;
    if (updates.is_done !== undefined)
      sanitizedUpdates.is_done = updates.is_done;
    if (updates.created_at !== undefined)
      sanitizedUpdates.created_at = updates.created_at;
    if (updates.employee_rate !== undefined)
      sanitizedUpdates.employee_rate = updates.employee_rate;

    // If there are no fields to update, return the current assignment
    if (Object.keys(sanitizedUpdates).length === 0) {
      console.log(`No valid fields to update for assignment ${id}`);
      const { data: currentData } = await supabase
        .from('order_stage_assignments')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentData) {
        throw new Error('Assignment not found');
      }

      return currentData as OrderStageAssignment;
    }

    // Perform the update with the sanitized fields
    const { data, error } = await supabase
      .from('order_stage_assignments')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating assignment ${id}:`, error);
      throw error;
    }

    console.log(`Updated assignment ${id}:`, data);
    return data as OrderStageAssignment;
  } catch (error) {
    console.error('Error in updateAssignment:', error);
    throw error;
  }
}

/**
 * Delete an assignment by id.
 * Also updates the stage status to "not_started" if this was the last assignment for that stage.
 */
export async function deleteAssignment(
  id: number,
): Promise<void> {
  console.log(`Deleting assignment ${id}`);

  // First, get the assignment to find its stage_id
  const { data: assignment, error: fetchError } = await supabase
    .from('order_stage_assignments')
    .select('order_stage_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error(
      `Error fetching assignment ${id} before deletion:`,
      fetchError
    );
    throw fetchError;
  }

  // Store the stage_id for later use
  const stageId = assignment?.order_stage_id;

  // Now delete the assignment
  const { error } = await supabase
    .from('order_stage_assignments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting assignment ${id}:`, error);
    throw error;
  }

  console.log(`Deleted assignment ${id}`);

  // If we have a stage_id, check if we need to update its status
  if (stageId) {
    await updateStageStatusToNotStarted(stageId);
  }
}

/**
 * Fetches all orders with status 'working'.
 */
export async function getAllOrders(): Promise<Order[]> {
  try {
    console.log('Fetching all working orders');

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_details (
          detail_id,
          order_id,
          assigned_to,
          due_date,
          notes,
          process_stage,
          img_url,
          updated_date,
          updated_at,
          price,
          total_cost,
          order_stages (
            *
          )
        )
      `
      )
      .ilike('order_status', 'working')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} orders`);

    return (data || []).map((order) => ({
      id: order.id,
      code: order.code || '',
      customer_id: order.customer_id,
      customer_name: order.customer_name || 'Unknown Customer',
      address: order.address || 'No address provided',
      order_status: order.order_status || 'working',
      order_price: order.order_price || 0,
      work_types: order.work_types || [],
      created_by: order.created_by,
      company: order.company,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_details: Array.isArray(order.order_details)
        ? order.order_details.map((detail: any) => ({
            detail_id: detail.detail_id,
            order_id: detail.order_id,
            assigned_to: detail.assigned_to,
            due_date: detail.due_date,
            notes: detail.notes,
            process_stage: detail.process_stage,
            img_url: detail.img_url,
            updated_date: detail.updated_date,
            updated_at: detail.updated_at,
            price: detail.price,
            total_cost: detail.total_cost,
            stages: Array.isArray(detail.order_stages)
              ? detail.order_stages
              : [],
          }))
        : [],
    }));
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    throw error;
  }
}
