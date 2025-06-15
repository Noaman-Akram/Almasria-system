import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  isBefore,
  addDays,
  eachDayOfInterval,
} from 'date-fns';
import { Calendar, ClipboardList, User, Info } from 'lucide-react';
import { Button } from '../../../components/components/ui/button';
import { Label } from '../../../components/components/ui/label';
import { Textarea } from '../../../components/components/ui/textarea';
import { Switch } from '../../../components/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/components/ui/select';
import {
  OrderStage,
  OrderStageAssignment,
} from '../types';
import DateRangePicker from '../ui/DateRangePicker';
import MultiSelect from '../ui/MultiSelect';
import { STATIC_EMPLOYEES } from '../constants';
import useOrders from '../hooks/useOrders';
import { supabase } from '../../../lib/supabase';

interface AssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assignments: Omit<OrderStageAssignment, 'id'>[]) => Promise<void>;
  stages: OrderStage[];
  assignment?: OrderStageAssignment | null;
  additionalAssignments?: OrderStageAssignment[]; // NEW: For multi-employee cards
  orderId?: number;
  stageId?: number;
  date?: Date;
}

// Form State Interface for Type Safety
interface FormState {
  selectedOrderId: number | null;
  selectedStageId: number | null;
  selectedEmployees: string[];
  startDate: Date | null;
  endDate: Date | null;
  isMultiDay: boolean;
  note: string;
  errors: Record<string, string>;
}

export function AssignmentForm({
  isOpen,
  onClose,
  onSubmit,
  stages,
  assignment,
  additionalAssignments = [], // NEW: Additional assignments for multi-employee editing
  date,
}: AssignmentFormProps) {
  // --- Single Source of Truth: Form State Object ---
  const [formState, setFormState] = useState<FormState>({
    selectedOrderId: null,
    selectedStageId: null,
    selectedEmployees: [],
    startDate: date || new Date(),
    endDate: date ? addDays(date, 1) : addDays(new Date(), 1),
    isMultiDay: false,
    note: '',
    errors: {},
  });

  // --- Additional State for UI ---
  const [loading, setLoading] = useState(false);
  const [stagesForOrder, setStagesForOrder] = useState<OrderStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  // --- Fetch Orders ---
  const { orders, loading: ordersLoading, error: ordersError } = useOrders();

  // --- Derived State / Memos ---
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === formState.selectedOrderId),
    [orders, formState.selectedOrderId]
  );

  const orderDetailIds = useMemo(() => {
    if (!selectedOrder?.order_details?.length) return [];
    return selectedOrder.order_details.map((detail) => detail.detail_id);
  }, [selectedOrder]);

  // --- State Update Helper Functions ---
  const updateFormState = useCallback((updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearErrors = useCallback(() => {
    updateFormState({ errors: {} });
  }, [updateFormState]);

  const setError = useCallback(
    (field: string, message: string) => {
      updateFormState({
        errors: { ...formState.errors, [field]: message },
      });
    },
    [formState.errors, updateFormState]
  );

  // --- Effects ---
  // FIXED: Initialize form when assignment changes - Handle multi-employee assignments
  useEffect(() => {
    if (assignment && orders.length > 0 && stages.length > 0) {
      console.log(
        '[AssignmentForm] Pre-populating form with assignment:',
        assignment
      );
      console.log(
        '[AssignmentForm] Additional assignments:',
        additionalAssignments
      );

      // Find the stage for this assignment
      const assignmentStage = stages.find(
        (s) => s.id === assignment.order_stage_id
      );

      if (assignmentStage?.order_detail_id) {
        // Find the order that contains this order_detail_id
        const order = orders.find((o) =>
          o.order_details?.some(
            (detail) => detail.detail_id === assignmentStage.order_detail_id
          )
        );

        if (order) {
          console.log('[AssignmentForm] Found matching order:', order);
          console.log(
            '[AssignmentForm] Auto-selecting stage:',
            assignmentStage
          );

          // FIXED: Collect ALL employees from primary + additional assignments
          const allAssignments = [assignment, ...additionalAssignments];
          const allEmployees = allAssignments
            .map((a) => a.employee_name)
            .filter(Boolean);

          console.log(
            '[AssignmentForm] All employees to select:',
            allEmployees
          );

          updateFormState({
            selectedOrderId: order.id,
            selectedStageId: assignment.order_stage_id, // AUTO-SELECT THE STAGE
            selectedEmployees: allEmployees, // FIXED: Show ALL employees
            startDate: assignment.work_date
              ? new Date(assignment.work_date)
              : new Date(),
            endDate: assignment.work_date
              ? new Date(assignment.work_date)
              : new Date(),
            isMultiDay: false,
            note: assignment.note || '',
            errors: {},
          });
          return;
        }
      }
      console.error(
        '[AssignmentForm] Could not find order or stage for assignment:',
        assignment
      );
    }

    // Handle date initialization for new assignments
    if (!assignment && date) {
      updateFormState({
        startDate: date,
        endDate: addDays(date, 1),
        isMultiDay: false,
      });
    }

    // Reset form for new assignments
    if (!assignment) {
      updateFormState({
        selectedOrderId: null,
        selectedStageId: null,
        selectedEmployees: [],
        note: '',
        isMultiDay: false,
        errors: {},
      });
    }
  }, [
    assignment,
    additionalAssignments,
    date,
    stages,
    orders,
    updateFormState,
  ]);

  // Fetch stages when order is selected
  useEffect(() => {
    async function fetchStages() {
      if (!orderDetailIds.length) {
        setStagesForOrder([]);
        return;
      }

      setLoadingStages(true);
      try {
        console.log(
          '[AssignmentForm] Fetching stages for order detail IDs:',
          orderDetailIds
        );

        const { data, error } = await supabase
          .from('order_stages')
          .select('*')
          .in('order_detail_id', orderDetailIds)
          .order('stage_name', { ascending: true });

        if (error) {
          console.error('[AssignmentForm] Error fetching stages:', error);
          setStagesForOrder([]);
        } else {
          console.log('[AssignmentForm] Fetched stages:', data);
          setStagesForOrder(data || []);
        }
      } catch (err) {
        console.error('[AssignmentForm] Unexpected error:', err);
        setStagesForOrder([]);
      } finally {
        setLoadingStages(false);
      }
    }

    fetchStages();
  }, [orderDetailIds]);

  // Reset stage selection when order changes (but not during initial load or editing)
  useEffect(() => {
    if (formState.selectedOrderId && !assignment) {
      updateFormState({ selectedStageId: null });
    }
  }, [formState.selectedOrderId, assignment, updateFormState]);

  // --- Validation ---
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formState.selectedOrderId) {
      newErrors.order = 'Please select an order';
    }
    if (!formState.selectedStageId) {
      newErrors.stage = 'Please select a stage';
    }
    if (formState.selectedEmployees.length === 0) {
      newErrors.employees = 'Please select at least one employee';
    }
    if (!formState.startDate) {
      newErrors.startDate = 'Please select a start date';
    }
    if (formState.isMultiDay) {
      if (!formState.endDate) {
        newErrors.endDate =
          'Please select an end date for multi-day assignment';
      } else if (
        formState.startDate &&
        isBefore(formState.endDate, formState.startDate)
      ) {
        newErrors.endDate = 'End date must be on or after the start date';
      }
    }

    updateFormState({ errors: newErrors });
    return Object.keys(newErrors).length === 0;
  }, [formState, updateFormState]);

  // --- Event Handlers ---
  const handleOrderChange = useCallback(
    (value: string) => {
      const orderId = Number(value);
      console.log('[AssignmentForm] Order selected:', orderId);

      updateFormState({
        selectedOrderId: orderId,
        selectedStageId: null, // Reset stage when order changes
        errors: { ...formState.errors, order: '' },
      });
    },
    [updateFormState, formState.errors]
  );

  const handleStageChange = useCallback(
    (value: string) => {
      const stageId = Number(value);
      console.log('[AssignmentForm] Stage selected:', stageId);

      updateFormState({
        selectedStageId: stageId,
        errors: { ...formState.errors, stage: '' },
      });
    },
    [updateFormState, formState.errors]
  );

  const handleEmployeesChange = useCallback(
    (employees: string[]) => {
      updateFormState({
        selectedEmployees: employees,
        errors: { ...formState.errors, employees: '' },
      });
    },
    [updateFormState, formState.errors]
  );

  const handleStartDateChange = useCallback(
    (date: Date | null) => {
      updateFormState({
        startDate: date,
        errors: { ...formState.errors, startDate: '' },
      });
    },
    [updateFormState, formState.errors]
  );

  const handleEndDateChange = useCallback(
    (date: Date | null) => {
      updateFormState({
        endDate: date,
        errors: { ...formState.errors, endDate: '' },
      });
    },
    [updateFormState, formState.errors]
  );

  const handleMultiDayToggle = useCallback(
    (checked: boolean) => {
      const updates: Partial<FormState> = { isMultiDay: checked };

      if (checked && formState.startDate) {
        updates.endDate = addDays(formState.startDate, 1);
      } else if (!checked && formState.startDate) {
        updates.endDate = formState.startDate;
      } else if (!checked && !formState.startDate) {
        updates.endDate = null;
      }

      updateFormState(updates);
    },
    [formState.startDate, updateFormState]
  );

  const handleNoteChange = useCallback(
    (note: string) => {
      updateFormState({ note });
    },
    [updateFormState]
  );

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('[AssignmentForm] Form validation failed.');
      return;
    }

    setLoading(true);
    clearErrors();

    try {
      const selectedStage = stagesForOrder.find(
        (s) => s.id === formState.selectedStageId
      );

      if (!selectedStage || !selectedStage.order_detail_id) {
        setError(
          'form',
          'Selected stage is invalid or missing order detail link. Please select again.'
        );
        console.error('[AssignmentForm] Validation failed: ', {
          selectedStage,
          selectedStageId: formState.selectedStageId,
        });
        return;
      }

      const orderDetail = selectedOrder?.order_details?.find(
        (d) => d.detail_id === selectedStage.order_detail_id
      );

      if (!orderDetail) {
        setError(
          'form',
          'Selected stage does not belong to the selected order. Please check selection.'
        );
        console.error(
          '[AssignmentForm] Validation failed: Selected stage does not belong to selected order'
        );
        return;
      }

      if (!formState.startDate) {
        setError('form', 'Start date is required.');
        return;
      }

      if (formState.selectedEmployees.length === 0) {
        setError('form', 'At least one employee must be selected.');
        return;
      }

      // Handle UPDATE vs CREATE properly
      if (assignment) {
        console.log(
          '[AssignmentForm] UPDATING existing assignment:',
          assignment.id
        );

        // For updates, create assignments for all selected employees
        const assignmentsToSubmit: Omit<OrderStageAssignment, 'id'>[] = [];

        for (const employee of formState.selectedEmployees) {
          assignmentsToSubmit.push({
            order_stage_id: formState.selectedStageId!,
            employee_name: employee,
            work_date: format(formState.startDate, 'yyyy-MM-dd'),
            note: formState.note || null,
            is_done: assignment.is_done || false,
            created_at: assignment.created_at || new Date().toISOString(),
            employee_rate: assignment.employee_rate || null,
          });
        }

        await onSubmit(assignmentsToSubmit);
      } else {
        console.log('[AssignmentForm] CREATING new assignment(s)');

        // For new assignments, create based on date range and employees
        const assignmentsToSubmit: Omit<OrderStageAssignment, 'id'>[] = [];

        if (formState.isMultiDay && formState.startDate && formState.endDate) {
          const days = eachDayOfInterval({
            start: formState.startDate,
            end: formState.endDate,
          });

          for (const day of days) {
            for (const employee of formState.selectedEmployees) {
              assignmentsToSubmit.push({
                order_stage_id: formState.selectedStageId!,
                employee_name: employee,
                work_date: format(day, 'yyyy-MM-dd'),
                note: formState.note || null,
                is_done: false,
                created_at: new Date().toISOString(),
                employee_rate: null,
              });
            }
          }
        } else {
          for (const employee of formState.selectedEmployees) {
            assignmentsToSubmit.push({
              order_stage_id: formState.selectedStageId!,
              employee_name: employee,
              work_date: format(formState.startDate, 'yyyy-MM-dd'),
              note: formState.note || null,
              is_done: false,
              created_at: new Date().toISOString(),
              employee_rate: null,
            });
          }
        }

        console.log(
          '[AssignmentForm] New assignments to be submitted:',
          assignmentsToSubmit
        );

        if (assignmentsToSubmit.length === 0) {
          const msg =
            'No assignments were generated based on your selections. Please check dates and employees.';
          setError('form', msg);
          return;
        }

        await onSubmit(assignmentsToSubmit);
      }

      onClose();
    } catch (error) {
      console.error(
        '[AssignmentForm] Error during assignment submission:',
        error
      );
      setError(
        'form',
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during submission.'
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Helper Functions ---
  const getOrderPlaceholder = () => {
    if (ordersLoading) return 'Loading Orders...';
    if (ordersError) return `Error: ${ordersError.message}`;
    if (orders.length === 0) return 'No Orders Available';
    return 'Select an order';
  };

  const getStagePlaceholder = () => {
    if (!formState.selectedOrderId) return 'Select an order first';
    if (loadingStages) return 'Loading stages...';
    if (stagesForOrder.length === 0) return 'No stages for this order';
    return 'Select a stage';
  };

  // --- Render ---
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {assignment
              ? `Edit Assignment #${assignment.id}${
                  additionalAssignments.length > 0
                    ? ` (+${additionalAssignments.length} more)`
                    : ''
                }`
              : 'Create New Assignment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Order and Stage Selection */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <ClipboardList className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Order Details
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="order">Order *</Label>
                  <Select
                    value={formState.selectedOrderId?.toString() || ''}
                    onValueChange={handleOrderChange}
                    disabled={ordersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={getOrderPlaceholder()} />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => {
                        const dueDate = order.order_details?.[0]?.due_date
                          ? new Date(
                              order.order_details[0].due_date
                            ).toLocaleDateString()
                          : 'No due date';

                        return (
                          <SelectItem
                            key={order.id}
                            value={order.id.toString()}
                          >
                            <div className="flex flex-col py-1">
                              <div className="font-medium">
                                #{order.id} - {order.code}
                              </div>
                              <div className="text-xs text-gray-600">
                                {order.customer_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Status: {order.order_status} | Due: {dueDate}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formState.errors.order && (
                    <p className="text-sm text-red-500 mt-1">
                      {formState.errors.order}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="stage">
                    Stage{' '}
                    {formState.selectedOrderId && selectedOrder
                      ? `for Order ${selectedOrder.code}`
                      : ''}{' '}
                    *
                  </Label>
                  <Select
                    value={formState.selectedStageId?.toString() || ''}
                    onValueChange={handleStageChange}
                    disabled={
                      !formState.selectedOrderId || stagesForOrder.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={getStagePlaceholder()} />
                    </SelectTrigger>
                    <SelectContent>
                      {stagesForOrder.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          <div className="flex flex-col py-1">
                            <div className="font-medium">
                              {stage.stage_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Status: {stage.status}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.stage && (
                    <p className="text-sm text-red-500 mt-1">
                      {formState.errors.stage}
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Order Summary */}
              {selectedOrder && (
                <div className="bg-white p-3 rounded border border-gray-200">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Selected Order Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Order ID:</span> #
                      {selectedOrder.id}
                    </div>
                    <div>
                      <span className="font-medium">Code:</span>{' '}
                      {selectedOrder.code}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span>{' '}
                      {selectedOrder.customer_name}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      {selectedOrder.order_status}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Due Date:</span>{' '}
                      {selectedOrder.order_details?.[0]?.due_date
                        ? new Date(
                            selectedOrder.order_details[0].due_date
                          ).toLocaleDateString()
                        : 'No due date set'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Employee Selection */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Employee Assignment
                </h3>
              </div>

              <div>
                <Label className="mb-2 block">Employees *</Label>
                <MultiSelect
                  options={STATIC_EMPLOYEES}
                  selected={formState.selectedEmployees}
                  onChange={handleEmployeesChange}
                />
                {formState.errors.employees && (
                  <p className="text-sm text-red-500 mt-1">
                    {formState.errors.employees}
                  </p>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Schedule
                  </h3>
                </div>

                {!assignment && (
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="multi-day"
                      className="text-sm cursor-pointer"
                    >
                      Multi-Day Assignment
                    </Label>
                    <Switch
                      id="multi-day"
                      checked={formState.isMultiDay}
                      onCheckedChange={handleMultiDayToggle}
                    />
                  </div>
                )}
              </div>

              <DateRangePicker
                startDate={formState.startDate}
                endDate={formState.endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                isMultiDay={formState.isMultiDay && !assignment}
              />

              {formState.errors.startDate && (
                <p className="text-sm text-red-500 mt-1">
                  {formState.errors.startDate}
                </p>
              )}
              {formState.errors.endDate && (
                <p className="text-sm text-red-500 mt-1">
                  {formState.errors.endDate}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Additional Notes
                </h3>
              </div>

              <Textarea
                value={formState.note}
                onChange={(e) => handleNoteChange(e.target.value)}
                rows={3}
                placeholder="Add any additional notes or instructions..."
              />
            </div>

            {formState.errors.form && (
              <p className="text-sm text-red-500 mt-4 text-center">
                {formState.errors.form}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading || ordersLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || ordersLoading || ordersError !== null}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading
                ? 'Saving...'
                : assignment
                ? 'Update Assignment'
                : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AssignmentForm;
