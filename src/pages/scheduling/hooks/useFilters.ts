import { useState, useMemo, useCallback } from 'react';
import { OrderStageAssignment, Order, OrderStage } from '../types';

function useFilters() {
  const [filters, setFilters] = useState({
    orderId: null as number | null,
    employeeNames: [] as string[],
    statuses: [] as string[],
  });

  // Check if any filter is active
  const isAnyFilterActive = useMemo(
    () =>
      filters.orderId !== null ||
      filters.employeeNames.length > 0 ||
      filters.statuses.length > 0,
    [filters]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      orderId: null,
      employeeNames: [],
      statuses: [],
    });
  }, []);

  // Filter assignments based on current filters
  const filterAssignments = useCallback(
    (
      assignments: OrderStageAssignment[],
      getOrder: (assignment: OrderStageAssignment) => Order | undefined,
      getStage: (assignment: OrderStageAssignment) => OrderStage | undefined
    ) => {
      if (!assignments || !Array.isArray(assignments)) {
        console.warn('Invalid assignments array provided to filterAssignments');
        return [];
      }

      try {
        return assignments.filter((assignment) => {
          if (!assignment) return false;

          // Filter by order ID
          if (filters.orderId !== null) {
            const order = getOrder(assignment);
            if (!order || order.id !== filters.orderId) return false;
          }

          // Filter by employee name
          if (filters.employeeNames.length > 0) {
            if (
              !assignment.employee_name ||
              !filters.employeeNames.includes(assignment.employee_name)
            ) {
              return false;
            }
          }

          // Filter by status
          if (filters.statuses.length > 0) {
            const stage = getStage(assignment);
            if (!stage?.status || !filters.statuses.includes(stage.status)) {
              return false;
            }
          }

          return true;
        });
      } catch (error) {
        console.error('Error in filterAssignments:', error);
        return [];
      }
    },
    [filters]
  );

  // Get unique statuses from stages
  const getUniqueStatuses = useCallback((stages: OrderStage[]): string[] => {
    try {
      if (!stages || !Array.isArray(stages)) {
        return [];
      }

      const statuses = new Set<string>();
      stages.forEach((stage) => {
        if (stage?.status && typeof stage.status === 'string') {
          statuses.add(stage.status);
        }
      });
      return Array.from(statuses);
    } catch (error) {
      console.error('Error in getUniqueStatuses:', error);
      return [];
    }
  }, []);

  return {
    filters,
    setFilters: {
      setOrderId: (orderId: number | null) =>
        setFilters((prev) => ({ ...prev, orderId })),
      setEmployeeNames: (employeeNames: string[]) =>
        setFilters((prev) => ({ ...prev, employeeNames })),
      setStatuses: (statuses: string[]) =>
        setFilters((prev) => ({ ...prev, statuses })),
    },
    isAnyFilterActive,
    resetFilters,
    filterAssignments,
    getUniqueStatuses,
  };
}

export default useFilters;
