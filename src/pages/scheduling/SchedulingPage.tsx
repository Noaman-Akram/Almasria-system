//SchedulingPage.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

// Hooks
import useCalendarNavigation from './hooks/useCalendarNavigation';
import useAssignments from './hooks/useAssignments';
import useFilters from './hooks/useFilters';
import useOrders from './hooks/useOrders';

// Components
import CalendarHeader from './components/CalendarHeader';
import { CalendarGrid } from './components/CalendarGrid';
import AssignmentForm from './components/AssignmentForm';
import FilterPanel from './components/FilterPanel';
import DebugPanel from './components/DebugPanel';

// Types and Utils
import type { OrderStageAssignment, Employee } from './types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Static employee data
const STATIC_EMPLOYEES: Employee[] = [
  { id: 1, name: 'وائل امين', role: '' },
  { id: 2, name: 'هانى مهند', role: '' },
  { id: 3, name: 'محمد فؤاد (توتا)', role: '' },
  { id: 4, name: 'محمود محمد (بسبوسه)', role: '' },
  { id: 5, name: 'على ماهر', role: '' },
  { id: 6, name: 'محمد الشرقاوى (لبيب)', role: '' },
  { id: 7, name: 'احمد متولى', role: '' },
  { id: 8, name: 'خالد', role: '' },
  { id: 9, name: 'كريم سعد', role: '' },
  { id: 10, name: 'محمد ابراهيم (كلوب)', role: '' },
  { id: 11, name: 'زياد وائل', role: '' },
  { id: 12, name: 'محمد سالم', role: '' },
  { id: 13, name: 'عيد سالم', role: '' },
  { id: 14, name: 'خارجى/اخر', role: '' },
];

export default function SchedulingPage() {
  // Auth context for user ID
  const { user } = useAuth();

  // URL search params to handle order selection from work orders list
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  // Calendar navigation
  const {
    currentDate,
    weekStart,
    weekEnd,
    weekDays,
    weekRangeText,
    goToPreviousWeek,
    goToNextWeek,
    goToToday,
    isCurrentDay,
  } = useCalendarNavigation();

  // Data management (assignments and stages)
  const {
    assignments,
    stages,
    loading,
    error,
    addAssignment: addAssignmentToApi,
    updateAssignment: updateAssignmentInApi,
    deleteAssignment: deleteAssignmentFromApi,
    refetch: refetchAssignments,
  } = useAssignments(weekStart, weekEnd);

  // Fetch orders separately using the hook
  const { orders, loading: ordersLoading, error: ordersError } = useOrders();

  // Filtering
  const {
    filters,
    setFilters,
    isAnyFilterActive,
    resetFilters,
    filterAssignments,
  } = useFilters();

  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<OrderStageAssignment | null>(null);
  const [editingAdditionalAssignments, setEditingAdditionalAssignments] =
    useState<OrderStageAssignment[]>([]); // NEW
  const [formSelectedDate, setFormSelectedDate] = useState<Date | null>(null);

  // Handle automatic order selection from URL parameter
  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0) {
      const orderId = parseInt(orderIdFromUrl);
      const orderExists = orders.find((order) => order.id === orderId);

      if (orderExists) {
        console.log('[SchedulingPage] Auto-selecting order from URL:', orderId);
        setFilters.setOrderId(orderId);

        // Show a toast notification
        const notification = document.createElement('div');
        notification.className =
          'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        notification.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>Order ${orderExists.code} automatically selected for scheduling</span>
          </div>
        `;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);

        // Clear the URL parameter after processing
        setSearchParams({});
      }
    }
  }, [orderIdFromUrl, orders, setFilters, setSearchParams]);

  // Filter assignments based on current filters
  const filteredAssignments = useMemo(() => {
    if (
      !assignments ||
      !Array.isArray(assignments) ||
      !orders ||
      !Array.isArray(orders) ||
      !stages ||
      !Array.isArray(stages)
    )
      return [];

    return filterAssignments(
      assignments,
      (assignment) => {
        if (!assignment) return undefined;

        // Find the stage for this assignment
        const stage = stages.find((s) => s?.id === assignment.order_stage_id);
        if (!stage) return undefined;

        // Find the order that matches the stage's order_detail_id
        return orders.find((order) => {
          // If the order has stages, check if any stage's id matches our stage's id
          if (
            order.order_details?.some((detail) =>
              detail.stages?.some((s) => s.id === stage.id)
            )
          ) {
            return true;
          }

          // Fallback: check if the order's id matches the stage's order_detail_id
          // This is a fallback and might not be needed if all stages are properly populated
          return (
            stage.order_detail_id !== undefined &&
            order.order_details?.some(
              (detail) => detail.detail_id === stage.order_detail_id
            )
          );
        });
      },
      (assignment) => {
        if (!assignment) return undefined;
        return stages.find((s) => s?.id === assignment.order_stage_id);
      }
    );
  }, [assignments, filters, orders, stages, filterAssignments]);

  // Get assignments for a specific day

  // ENHANCED: Multi-employee assignment reconciliation logic
  const handleSubmitAssignment = async (
    assignmentsData:
      | Omit<OrderStageAssignment, 'id'>
      | Omit<OrderStageAssignment, 'id'>[]
  ) => {
    try {
      const assignmentsArray = Array.isArray(assignmentsData)
        ? assignmentsData
        : [assignmentsData];

      // Validate required fields for each assignment
      for (const assignment of assignmentsArray) {
        if (
          !assignment.order_stage_id ||
          !assignment.employee_name ||
          !assignment.work_date
        ) {
          console.error('Missing required fields in assignment:', assignment);
          throw new Error('Missing required fields in assignment');
        }
      }

      if (editingAssignment) {
        console.log(
          '[SchedulingPage] UPDATING assignment with multi-employee reconciliation:',
          editingAssignment.id
        );

        // ENHANCED: Multi-employee update logic with reconciliation
        if (assignmentsArray.length > 0) {
          const targetStageId = assignmentsArray[0].order_stage_id;
          const targetWorkDate = assignmentsArray[0].work_date;
          const targetNote = assignmentsArray[0].note;

          // 1. Fetch all existing assignments for this stage and date
          console.log(
            '[SchedulingPage] Fetching existing assignments for reconciliation...'
          );
          const { data: existingAssignments, error: fetchError } =
            await supabase
              .from('order_stage_assignments')
              .select('*')
              .eq('order_stage_id', targetStageId)
              .eq('work_date', targetWorkDate);

          if (fetchError) {
            console.error(
              '[SchedulingPage] Error fetching existing assignments:',
              fetchError
            );
            throw new Error(
              'Failed to fetch existing assignments for reconciliation'
            );
          }

          console.log(
            '[SchedulingPage] Found existing assignments:',
            existingAssignments
          );

          // 2. Create sets for comparison
          const existingEmployees = new Set(
            existingAssignments?.map((a) => a.employee_name) || []
          );
          const desiredEmployees = new Set(
            assignmentsArray.map((a) => a.employee_name)
          );

          console.log(
            '[SchedulingPage] Existing employees:',
            Array.from(existingEmployees)
          );
          console.log(
            '[SchedulingPage] Desired employees:',
            Array.from(desiredEmployees)
          );

          // 3. Employees to ADD (in desired but not in existing)
          const employeesToAdd = Array.from(desiredEmployees).filter(
            (emp) => !existingEmployees.has(emp)
          );
          console.log('[SchedulingPage] Employees to ADD:', employeesToAdd);

          // 4. Employees to REMOVE (in existing but not in desired)
          const employeesToRemove = Array.from(existingEmployees).filter(
            (emp) => !desiredEmployees.has(emp)
          );
          console.log(
            '[SchedulingPage] Employees to REMOVE:',
            employeesToRemove
          );

          // 5. Employees to UPDATE (in both, but might have different notes)
          const employeesToUpdate = Array.from(desiredEmployees).filter((emp) =>
            existingEmployees.has(emp)
          );
          console.log(
            '[SchedulingPage] Employees to potentially UPDATE:',
            employeesToUpdate
          );

          // 6. Execute ADD operations
          for (const employeeName of employeesToAdd) {
            const newAssignment: Omit<OrderStageAssignment, 'id'> = {
              order_stage_id: targetStageId,
              employee_name: employeeName,
              work_date: targetWorkDate,
              note: targetNote,
              is_done: false,
              created_at: new Date().toISOString(),
              employee_rate: null,
            };

            console.log(
              '[SchedulingPage] ADDING assignment for employee:',
              employeeName
            );
            await addAssignmentToApi(newAssignment);
          }

          // 7. Execute REMOVE operations
          for (const employeeName of employeesToRemove) {
            const assignmentToDelete = existingAssignments?.find(
              (a) => a.employee_name === employeeName
            );
            if (assignmentToDelete) {
              console.log(
                '[SchedulingPage] REMOVING assignment for employee:',
                employeeName,
                'ID:',
                assignmentToDelete.id
              );
              await deleteAssignmentFromApi(assignmentToDelete.id, user?.id);
            }
          }

          // 8. Execute UPDATE operations (for notes changes)
          for (const employeeName of employeesToUpdate) {
            const existingAssignment = existingAssignments?.find(
              (a) => a.employee_name === employeeName
            );
            if (existingAssignment && existingAssignment.note !== targetNote) {
              console.log(
                '[SchedulingPage] UPDATING note for employee:',
                employeeName,
                'ID:',
                existingAssignment.id
              );
              await updateAssignmentInApi(
                existingAssignment.id,
                { note: targetNote },
                user?.id
              );
            }
          }

          console.log(
            '[SchedulingPage] Multi-employee reconciliation completed successfully'
          );
        }
      } else {
        console.log('[SchedulingPage] CREATING new assignment(s)');

        // Create new assignments
        for (const assignment of assignmentsArray) {
          if (assignment) {
            const newAssignment: Omit<OrderStageAssignment, 'id'> = {
              order_stage_id: assignment.order_stage_id,
              employee_name: assignment.employee_name,
              work_date: assignment.work_date,
              note: assignment.note,
              is_done: false,
              created_at: new Date().toISOString(),
              employee_rate: null,
            };

            await addAssignmentToApi(newAssignment);
            console.log('[SchedulingPage] Assignment created successfully');
          }
        }
      }

      setIsFormOpen(false);
      setEditingAssignment(null);
      setEditingAdditionalAssignments([]); // NEW: Clear additional assignments

      // ALWAYS refetch assignments after successful submission
      console.log(
        '[SchedulingPage] Refetching assignments after successful operation'
      );
      await refetchAssignments();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert(
        `Failed to save assignment: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  };

  // FIXED: Handle opening the form to edit an assignment (with additional assignments)
  const handleEditAssignment = (
    assignment: OrderStageAssignment,
    additionalAssignments: OrderStageAssignment[] = []
  ) => {
    console.log(
      '[SchedulingPage] Opening edit form for assignment:',
      assignment
    );
    console.log(
      '[SchedulingPage] Additional assignments:',
      additionalAssignments
    );
    setEditingAssignment(assignment);
    setEditingAdditionalAssignments(additionalAssignments); // NEW: Store additional assignments
    setIsFormOpen(true);
  };

  // Handle opening the form to create a new assignment
  const handleAddAssignment = (date?: Date) => {
    console.log('[SchedulingPage] Opening create form for date:', date);
    setEditingAssignment(null);
    setEditingAdditionalAssignments([]); // NEW: Clear additional assignments
    setFormSelectedDate(date || null);
    setIsFormOpen(true);
  };

  // Handle deleting an assignment with enhanced error handling
  const handleDeleteAssignment = async (assignment: OrderStageAssignment) => {
    try {
      const confirmed = window.confirm(
        `Are you sure you want to delete this assignment?\n\nEmployee: ${assignment.employee_name}\nDate: ${assignment.work_date}\n\nThis action cannot be undone.`
      );

      if (!confirmed) return;

      console.log('[SchedulingPage] Deleting assignment:', assignment.id);
      await deleteAssignmentFromApi(assignment.id, user?.id);
      console.log('[SchedulingPage] Assignment deleted successfully');

      // ALWAYS refetch assignments after successful deletion
      console.log(
        '[SchedulingPage] Refetching assignments after successful deletion'
      );
      await refetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert(
        `Failed to delete assignment: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  // Get unique statuses for filtering

  // Overall loading state
  const overallLoading = loading || ordersLoading;

  // Overall error state
  const overallError = error || ordersError;

  // Effect to log data for debugging
  useEffect(() => {
    console.log(
      'Week range:',
      format(weekStart, 'yyyy-MM-dd'),
      'to',
      format(weekEnd, 'yyyy-MM-dd')
    );
    console.log('Assignments count:', assignments?.length || 0);
    console.log(
      'Filtered assignments count:',
      filteredAssignments?.length || 0
    );
  }, [weekStart, weekEnd, assignments, filteredAssignments]);

  // ENHANCED: Loading state with spinner animation
  if (overallLoading && !assignments.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <div className="text-lg font-medium text-gray-700">
            Loading Schedule...
          </div>
          <div className="text-sm text-gray-500">
            Fetching assignments and orders
          </div>
        </div>
      </div>
    );
  }

  if (overallError && !assignments.length) {
    return (
      <div className="p-4 text-red-500">Error: {overallError.message}</div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with navigation */}
        <div className="p-4 border-b bg-white">
          <CalendarHeader
            currentDate={currentDate}
            weekRangeText={weekRangeText}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onToday={goToToday}
            onAddAssignment={() => handleAddAssignment()}
          />
        </div>

        {/* Calendar Grid with Loading Overlay */}
        <div className="flex-1 overflow-hidden relative">
          {/* Loading Overlay */}
          {overallLoading && assignments.length > 0 && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <div className="text-sm font-medium text-gray-700">
                  Updating...
                </div>
              </div>
            </div>
          )}

          <CalendarGrid
            weekDays={weekDays}
            assignments={filteredAssignments}
            onAddAssignment={handleAddAssignment}
            onEditAssignment={handleEditAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            orders={orders}
            stages={stages}
            isCurrentDay={isCurrentDay}
          />
        </div>
      </div>

      {/* Right Sidebar - Filters */}
      <FilterPanel
        orders={orders}
        employees={STATIC_EMPLOYEES}
        stages={stages}
        selectedOrderId={filters.orderId}
        setSelectedOrderId={setFilters.setOrderId}
        selectedEmployees={filters.employeeNames}
        setSelectedEmployees={setFilters.setEmployeeNames}
        selectedStatuses={filters.statuses}
        setSelectedStatuses={setFilters.setStatuses}
        resetFilters={resetFilters}
        isAnyFilterActive={isAnyFilterActive}
      />

      {/* Assignment Form Modal */}
      <AssignmentForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAssignment(null);
          setEditingAdditionalAssignments([]); // NEW: Clear additional assignments
          setFormSelectedDate(null);
        }}
        onSubmit={handleSubmitAssignment}
        stages={stages}
        assignment={editingAssignment}
        additionalAssignments={editingAdditionalAssignments} // NEW: Pass additional assignments
        date={formSelectedDate || undefined}
      />

      {/* Debug Panel */}
      <DebugPanel
        weekStart={weekStart}
        weekEnd={weekEnd}
        assignments={assignments}
        loading={loading}
        onRefresh={refetchAssignments}
      />
    </div>
  );
}
