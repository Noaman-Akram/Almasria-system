import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Order, OrderStage, OrderStageAssignment } from '../types';
import {
  getCalendarData,
  createAssignment as createAssignmentInApi,
  updateAssignment as updateAssignmentInApi,
  deleteAssignment as deleteAssignmentInApi,
  getAssignments as getAssignmentsRaw,
  CalendarData,
} from '../schedulingService';
import { DEBUG } from '../constants';

// Helper function to normalize the calendar data into our state structure
function normalizeCalendarData(calendarData: CalendarData[]): {
  assignments: OrderStageAssignment[];
  stages: OrderStage[];
  orders: Order[];
} {
  const assignments: OrderStageAssignment[] = [];
  const stagesMap = new Map<number, OrderStage>();
  const ordersMap = new Map<number, Order>();
  const orderDetailsMap = new Map<number, any>();

  calendarData.forEach((assignment) => {
    // Process assignment
    const { order_stages, ...assignmentData } = assignment;
    
    // Create the assignment with the stage data included
    const normalizedAssignment = {
      ...assignmentData,
      stage: order_stages, // Include the stage data directly in the assignment
    } as OrderStageAssignment;
    
    assignments.push(normalizedAssignment);

    // Process stage if it exists
    if (order_stages) {
      const { order_details, ...stageData } = order_stages;
      if (!stagesMap.has(stageData.id)) {
        stagesMap.set(stageData.id, stageData as OrderStage);
      }

      // Process order details if they exist
      if (order_details) {
        const { orders, ...detailData } = order_details;
        if (!orderDetailsMap.has(detailData.detail_id)) {
          orderDetailsMap.set(detailData.detail_id, detailData);
        }

        // Process order if it exists
        if (orders && !ordersMap.has(orders.id)) {
          ordersMap.set(orders.id, {
            ...orders,
            order_details: [detailData],
            work_types: [] as string[],
            address: '',
            order_price: 0,
          } as Order);
        }
      }
    }
  });

  return {
    assignments,
    stages: Array.from(stagesMap.values()),
    orders: Array.from(ordersMap.values()),
  };
}

export function useAssignments(weekStart: Date, weekEnd: Date) {
  const [assignments, setAssignments] = useState<OrderStageAssignment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all calendar data in a single query
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);

      const from = format(weekStart, 'yyyy-MM-dd');
      const to = format(weekEnd, 'yyyy-MM-dd');

      if (DEBUG.LOG_API_CALLS) {
        console.log(
          `[useAssignments] Fetching calendar data from ${from} to ${to}`
        );
      }

      // Fetch all data in a single query
      const calendarData = await getCalendarData(from, to);

      // Also fetch raw assignments for comparison/debugging
      const rawAssignments = await getAssignmentsRaw(from, to);

      if (DEBUG.VERBOSE) {
        console.log('[useAssignments] Raw assignments:', rawAssignments);
        console.log('[useAssignments] Calendar data:', calendarData);
      }

      // Normalize the data into our state structure
      const {
        assignments: normalizedAssignments,
        stages: normalizedStages,
        orders: normalizedOrders,
      } = normalizeCalendarData(calendarData);

      if (DEBUG.LOG_API_CALLS) {
        console.log(
          `[useAssignments] Normalized ${normalizedAssignments.length} assignments, ${normalizedStages.length} stages, ${normalizedOrders.length} orders`
        );
      }

      // Update state with the normalized data
      setAssignments(normalizedAssignments);
      setStages(normalizedStages);
      setOrders(normalizedOrders);

      // For debugging, also set the raw assignments to compare with normalized
      if (DEBUG.ENABLED) {
        const missingFields = rawAssignments.filter((raw) => {
          const normalized = normalizedAssignments.find((a) => a.id === raw.id);
          return !normalized;
        });

        if (missingFields.length > 0) {
          console.warn(
            '[useAssignments] Some raw assignments are missing in normalized data:',
            missingFields
          );
        }
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to fetch calendar data');
      console.error('[useAssignments] Error in fetchCalendarData:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  // Initial data loading
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Add a new assignment with enhanced error handling
  const addAssignment = useCallback(
    async (
      assignment: Omit<OrderStageAssignment, 'id'>
    ): Promise<OrderStageAssignment> => {
      try {
        setLoading(true);

        if (DEBUG.LOG_API_CALLS) {
          console.log('[useAssignments] Adding new assignment:', assignment);
        }

        const newAssignment = await createAssignmentInApi(assignment);

        // Update local state immediately for better UX
        setAssignments((prev) => [...prev, newAssignment]);

        console.log(
          '[useAssignments] Assignment created successfully with auto-scheduled stage'
        );

        return newAssignment;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to add assignment');
        console.error('[useAssignments] Error in addAssignment:', error);
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Update an existing assignment with proper state management
  const updateAssignment = useCallback(
    async (
      id: number,
      updates: Partial<OrderStageAssignment>,
      userId?: string
    ): Promise<OrderStageAssignment> => {
      try {
        setLoading(true);

        if (DEBUG.LOG_API_CALLS) {
          console.log(`[useAssignments] Updating assignment ${id}:`, updates);
        }

        // Call the API to update the assignment
        const updatedAssignment = await updateAssignmentInApi(
          id,
          updates,
          userId
        );

        // Update the local state by replacing the old assignment with the updated one
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? updatedAssignment : a))
        );

        console.log(
          `[useAssignments] Assignment ${id} updated successfully in local state`
        );

        return updatedAssignment;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to update assignment');
        console.error('[useAssignments] Error in updateAssignment:', error);
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete an assignment with enhanced error handling
  const deleteAssignment = useCallback(
    async (id: number, userId?: string): Promise<void> => {
      try {
        setLoading(true);

        if (DEBUG.LOG_API_CALLS) {
          console.log(`[useAssignments] Deleting assignment ${id}`);
        }

        await deleteAssignmentInApi(id, userId);

        // Update local state immediately
        setAssignments((prev) => prev.filter((a) => a.id !== id));

        console.log(`[useAssignments] Assignment ${id} deleted successfully`);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to delete assignment');
        console.error('[useAssignments] Error in deleteAssignment:', error);
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Return the state and actions
  return {
    assignments,
    orders,
    stages,
    loading,
    error,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    refetch: fetchCalendarData,
  };
}

export default useAssignments;
