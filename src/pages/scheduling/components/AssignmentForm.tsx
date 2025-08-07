import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format,
  isBefore,
  addDays,
  eachDayOfInterval,
} from 'date-fns';
import { Calendar, ClipboardList, User, Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/components/ui/button';
import { Label } from '../../../components/components/ui/label';
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
import useOrders from '../hooks/useOrders';
import { supabase } from '../../../lib/supabase';
import { WORK_TYPES } from '../../../lib/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { Settings } from 'lucide-react';
import { Textarea } from '../../../components/components/ui/textarea';

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
  selectedStageId: number | null;
  selectedEmployees: string[];
  startDate: Date | null;
  endDate: Date | null;
  isMultiDay: boolean;
  note: string;
  errors: Record<string, string>;
  // Maintenance order fields
  isMaintenanceOrder: boolean;
  maintenanceData: {
    customer_name: string;
    address: string;
    company: string;
    phone_number: string;
    work_types: string[];
    estimated_price: number;
  };
}

// Stage status color mapping
const getStageStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'not_started':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-l-gray-400',
        badge: 'bg-gray-100 text-gray-700'
      };
    case 'scheduled':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-l-blue-400',
        badge: 'bg-blue-100 text-blue-700'
      };
    case 'in_progress':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-l-yellow-400',
        badge: 'bg-yellow-100 text-yellow-700'
      };
    case 'completed':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-l-green-400',
        badge: 'bg-green-100 text-green-700'
      };
    case 'delayed':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-l-red-400',
        badge: 'bg-red-100 text-red-700'
      };
    case 'on_hold':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-l-orange-400',
        badge: 'bg-orange-100 text-orange-700'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-l-gray-400',
        badge: 'bg-gray-100 text-gray-700'
      };
  }
};

export function AssignmentForm({
  isOpen,
  onClose,
  onSubmit,
  stages,
  assignment,
  additionalAssignments = [], // NEW: Additional assignments for multi-employee editing
  date,
}: AssignmentFormProps) {
  useAuth();
  
  // --- SIMPLE ORDER SELECTION VARIABLE (ONLY CHANGES WHEN USER SELECTS) ---
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // --- Form State ---
  const [formState, setFormState] = useState<FormState>({
    selectedStageId: null,
    selectedEmployees: [],
    startDate: date || new Date(),
    endDate: date ? addDays(date, 1) : addDays(new Date(), 1),
    isMultiDay: false,
    note: '',
    errors: {},
    isMaintenanceOrder: false,
    maintenanceData: {
      customer_name: '',
      address: '',
      company: '',
      phone_number: '',
      work_types: [],
      estimated_price: 0,
    },
  });

  // --- Static stages for selected order ---
  const [stagesForOrder, setStagesForOrder] = useState<OrderStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Fetch Orders (ONCE) ---
  const { orders, loading: ordersLoading, error: ordersError } = useOrders();

  // --- Derived State ---
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  // --- State Update Helper Functions ---
  const updateFormState = useCallback((updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback(
    (field: string, message: string) => {
      updateFormState({
        errors: { ...formState.errors, [field]: message },
      });
    },
    [formState.errors, updateFormState]
  );

  // --- AUTOMATIC STAGE FETCHING WHEN ORDER IS SELECTED ---
  const fetchStagesForOrder = useCallback(async (orderId: number) => {
    if (!orderId) {
      setStagesForOrder([]);
      return;
    }

    setLoadingStages(true);
    try {
      console.log('[AssignmentForm] Auto-fetching stages for order:', orderId);

      const { data: freshStages, error } = await supabase
        .from('order_stages')
        .select(`
          id,
          order_detail_id,
          stage_name,
          status,
          planned_start_date,
          planned_finish_date,
          actual_start_date,
          actual_finish_date,
          notes,
          created_at,
          updated_at,
          order_details!inner (
            detail_id,
            order_id
          )
        `)
        .eq('order_details.order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[AssignmentForm] Error fetching stages:', error);
        throw error;
      }

      const transformedStages: OrderStage[] = (freshStages || []).map((stage) => ({
        id: stage.id,
        order_detail_id: stage.order_detail_id,
        stage_name: stage.stage_name,
        status: stage.status,
        planned_start_date: stage.planned_start_date,
        planned_finish_date: stage.planned_finish_date,
        actual_start_date: stage.actual_start_date,
        actual_finish_date: stage.actual_finish_date,
        notes: stage.notes,
        created_at: stage.created_at,
        updated_at: stage.updated_at,
      }));

      console.log('[AssignmentForm] Stages fetched:', transformedStages);
      setStagesForOrder(transformedStages);
    } catch (err) {
      console.error('[AssignmentForm] Error fetching stages:', err);
      setStagesForOrder([]);
      setError('stages', 'Failed to load stages. Please try again.');
    } finally {
      setLoadingStages(false);
    }
  }, [setError]);

  // --- AUTO-FETCH STAGES WHEN ORDER CHANGES ---
  useEffect(() => {
    if (selectedOrderId) {
      fetchStagesForOrder(selectedOrderId);
    } else {
      setStagesForOrder([]);
    }
  }, [selectedOrderId, fetchStagesForOrder]);

  // --- INITIALIZE FORM WHEN ASSIGNMENT CHANGES ---
  useEffect(() => {
    if (assignment && orders.length > 0 && stages.length > 0) {
      console.log('[AssignmentForm] Initializing form with assignment:', assignment);

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

          // Collect ALL employees from primary + additional assignments
          const allAssignments = [assignment, ...additionalAssignments];
          const allEmployees = allAssignments
            .map((a) => a.employee_name)
            .filter(Boolean)
            .filter(name => name.trim().length > 0);

          // SET THE ORDER SELECTION (ONLY PLACE IT GETS SET FOR EDITING)
          setSelectedOrderId(order.id);

          updateFormState({
            selectedStageId: assignment.order_stage_id,
            selectedEmployees: allEmployees,
            startDate: assignment.work_date
              ? new Date(assignment.work_date)
              : new Date(),
            endDate: assignment.work_date
              ? new Date(assignment.work_date)
              : new Date(),
            isMultiDay: false,
            note: assignment.note || '',
            errors: {},
            isMaintenanceOrder: order.order_status === 'maintenance',
          });

          // Set stages from existing stages prop (NO FETCH NEEDED FOR EDITING)
          const orderStages = stages.filter(s => 
            order.order_details?.some(detail => detail.detail_id === s.order_detail_id)
          );
          setStagesForOrder(orderStages);
          return;
        }
      }
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
      setSelectedOrderId(null);
      setStagesForOrder([]);
      updateFormState({
        selectedStageId: null,
        selectedEmployees: [''], // Start with one empty employee field
        note: '',
        isMultiDay: false,
        errors: {},
        isMaintenanceOrder: false,
        maintenanceData: {
          customer_name: '',
          address: '',
          company: '',
          phone_number: '',
          work_types: [],
          estimated_price: 0,
        },
      });
    }
  }, [assignment, additionalAssignments, date, stages, orders, updateFormState]);

  // --- Validation ---
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (formState.isMaintenanceOrder) {
      // Validation for maintenance orders
      if (!formState.maintenanceData.customer_name.trim()) {
        newErrors.customer_name = 'Customer name is required';
      }
      if (!formState.maintenanceData.address.trim()) {
        newErrors.address = 'Address is required';
      }
      if (formState.maintenanceData.work_types.length === 0) {
        newErrors.work_types = 'Please select at least one work type';
      }
    } else {
      // Validation for regular orders
      if (!selectedOrderId) {
        newErrors.order = 'Please select an order';
      }
      if (!formState.selectedStageId) {
        newErrors.stage = 'Please select a stage';
      }
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
    
    // Debug logging for validation
    if (Object.keys(newErrors).length > 0) {
      console.log('[AssignmentForm] Validation errors:', newErrors);
      console.log('[AssignmentForm] Current form state:', {
        isMaintenanceOrder: formState.isMaintenanceOrder,
        selectedOrderId,
        selectedStageId: formState.selectedStageId,
        selectedEmployees: formState.selectedEmployees,
        startDate: formState.startDate,
        endDate: formState.endDate,
        maintenanceData: formState.maintenanceData
      });
    }
    
    return Object.keys(newErrors).length === 0;
  }, [selectedOrderId, formState, updateFormState]);

  // --- Event Handlers ---
  // SIMPLE ORDER CHANGE - SETS selectedOrderId AND AUTO-FETCHES STAGES
  const handleOrderChange = useCallback(
    (value: string) => {
      const orderId = Number(value);
      console.log('[AssignmentForm] User selected order:', orderId);
      
      // SET THE ORDER ID - THIS WILL TRIGGER AUTO-FETCH VIA useEffect
      setSelectedOrderId(orderId);
      
      // Reset stage selection
      updateFormState({
        selectedStageId: null,
        errors: { ...formState.errors, order: '' },
      });
    },
    [updateFormState, formState.errors]
  );

  const handleStageChange = useCallback(
    (value: string) => {
      const stageId = Number(value);
      updateFormState({
        selectedStageId: stageId,
        errors: { ...formState.errors, stage: '' },
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

  // --- Maintenance Order Handlers ---
  const handleMaintenanceToggle = useCallback(
    (checked: boolean) => {
      updateFormState({ 
        isMaintenanceOrder: checked,
        selectedStageId: null,
        errors: {},
      });
      if (checked) {
        setSelectedOrderId(null);
        setStagesForOrder([]);
      }
    },
    [updateFormState]
  );

  const handleMaintenanceDataChange = useCallback(
    (field: keyof FormState['maintenanceData'], value: any) => {
      updateFormState({
        maintenanceData: {
          ...formState.maintenanceData,
          [field]: value,
        },
        errors: { ...formState.errors, [field]: '' },
      });
    },
    [formState.maintenanceData, formState.errors, updateFormState]
  );

  const handleWorkTypeToggle = useCallback(
    (workType: string) => {
      const currentTypes = formState.maintenanceData.work_types;
      const newTypes = currentTypes.includes(workType)
        ? currentTypes.filter(t => t !== workType)
        : [...currentTypes, workType];
      
      handleMaintenanceDataChange('work_types', newTypes);
    },
    [formState.maintenanceData.work_types, handleMaintenanceDataChange]
  );

  // Employee list management functions
  const addEmployee = useCallback(() => {
    updateFormState({
      selectedEmployees: [...formState.selectedEmployees, ''],
      errors: { ...formState.errors, employees: '' },
    });
  }, [formState.selectedEmployees, formState.errors, updateFormState]);

  const removeEmployee = useCallback((index: number) => {
    if (formState.selectedEmployees.length > 1) {
      const newEmployees = formState.selectedEmployees.filter((_, i) => i !== index);
      updateFormState({
        selectedEmployees: newEmployees,
        errors: { ...formState.errors, employees: '' },
      });
    }
  }, [formState.selectedEmployees, formState.errors, updateFormState]);

  const updateEmployee = useCallback((index: number, value: string) => {
    const newEmployees = [...formState.selectedEmployees];
    newEmployees[index] = value;
    updateFormState({
      selectedEmployees: newEmployees,
      errors: { ...formState.errors, employees: '' },
    });
  }, [formState.selectedEmployees, formState.errors, updateFormState]);

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (formState.isMaintenanceOrder) {
        // Handle maintenance order creation
        console.log('[AssignmentForm] Creating maintenance order assignment');
        
        // Create a simple maintenance order record in localStorage for now
        const maintenanceOrder = {
          id: Date.now(), // Simple ID generation
          customer_name: formState.maintenanceData.customer_name,
          company: formState.maintenanceData.company,
          address: formState.maintenanceData.address,
          phone_number: formState.maintenanceData.phone_number,
          work_types: formState.maintenanceData.work_types,
          estimated_price: formState.maintenanceData.estimated_price,
          created_at: new Date().toISOString(),
          status: 'maintenance'
        };

        // Store in localStorage for now (minimal approach)
        const existingMaintenanceOrders = JSON.parse(localStorage.getItem('maintenanceOrders') || '[]');
        existingMaintenanceOrders.push(maintenanceOrder);
        localStorage.setItem('maintenanceOrders', JSON.stringify(existingMaintenanceOrders));

        // Create assignments for each employee
        const assignmentsToSubmit: Omit<OrderStageAssignment, 'id'>[] = [];

        for (const employee of formState.selectedEmployees) {
          assignmentsToSubmit.push({
            order_stage_id: 0, // Use 0 to indicate no stage for maintenance orders
            employee_name: employee,
            work_date: format(formState.startDate!, 'yyyy-MM-dd'),
            note: `MAINTENANCE: ${formState.maintenanceData.customer_name} - ${formState.maintenanceData.work_types.join(', ')} - ${formState.note || 'No additional notes'}`,
            is_done: false,
            created_at: new Date().toISOString(),
            employee_rate: null,
          });
        }

        console.log('[AssignmentForm] Maintenance assignments to submit:', assignmentsToSubmit);
        
        // Validate each assignment before submitting
        for (const assignment of assignmentsToSubmit) {
          if (!assignment.employee_name) {
            throw new Error(`Missing employee_name in assignment: ${JSON.stringify(assignment)}`);
          }
          if (!assignment.work_date) {
            throw new Error(`Missing work_date in assignment: ${JSON.stringify(assignment)}`);
          }
        }

        await onSubmit(assignmentsToSubmit);
        return;
      }

      // Regular order processing
      const selectedStage = stagesForOrder.find(
        (s) => s.id === formState.selectedStageId
      );

      if (!selectedStage || !selectedStage.order_detail_id) {
        setError('form', 'Selected stage is invalid. Please select a different order or stage.');
        return;
      }

      const orderDetail = selectedOrder?.order_details?.find(
        (d) => d.detail_id === selectedStage.order_detail_id
      );

      if (!orderDetail) {
        setError('form', 'Selected stage does not belong to the selected order.');
        return;
      }

      if (!formState.startDate || formState.selectedEmployees.length === 0) {
        setError('form', 'Start date and at least one employee are required.');
        return;
      }

      // Handle UPDATE vs CREATE
      if (assignment) {
        console.log('[AssignmentForm] UPDATING existing assignment:', assignment.id);

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

        if (assignmentsToSubmit.length === 0) {
          setError('form', 'No assignments were generated. Please check your selections.');
          return;
        }

        await onSubmit(assignmentsToSubmit);
      }

      onClose();
    } catch (error) {
      console.error('[AssignmentForm] Error during submission:', error);
      setError(
        'form',
        error instanceof Error ? error.message : 'An unexpected error occurred.'
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
    if (!selectedOrderId) return 'Select an order first';
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
              {/* Maintenance Order Toggle */}
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Settings className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Maintenance Order</h4>
                    <p className="text-sm text-gray-600">Create a custom maintenance assignment</p>
                  </div>
                </div>
                <Switch
                  checked={formState.isMaintenanceOrder}
                  onCheckedChange={handleMaintenanceToggle}
                />
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <ClipboardList className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  {formState.isMaintenanceOrder ? 'Maintenance Details' : 'Order Details'}
                </h3>
              </div>

              {formState.isMaintenanceOrder ? (
                /* Maintenance Order Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Customer Name *</Label>
                      <input
                        id="customer_name"
                        type="text"
                        value={formState.maintenanceData.customer_name}
                        onChange={(e) => handleMaintenanceDataChange('customer_name', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter customer name"
                      />
                      {formState.errors.customer_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {formState.errors.customer_name}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <input
                        id="company"
                        type="text"
                        value={formState.maintenanceData.company}
                        onChange={(e) => handleMaintenanceDataChange('company', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Company name (optional)"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <input
                      id="address"
                      type="text"
                      value={formState.maintenanceData.address}
                      onChange={(e) => handleMaintenanceDataChange('address', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Enter full address"
                    />
                    {formState.errors.address && (
                      <p className="text-sm text-red-500 mt-1">
                        {formState.errors.address}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <input
                      id="phone_number"
                      type="tel"
                      value={formState.maintenanceData.phone_number}
                      onChange={(e) => handleMaintenanceDataChange('phone_number', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                      placeholder="01012345678"
                    />
                  </div>

                  <div>
                    <Label>Work Types *</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {WORK_TYPES.map((workType) => (
                        <button
                          key={workType.value}
                          type="button"
                          onClick={() => handleWorkTypeToggle(workType.value)}
                          className={`p-2 text-sm rounded-md border transition-colors ${
                            formState.maintenanceData.work_types.includes(workType.value)
                              ? 'bg-orange-100 border-orange-300 text-orange-800'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {workType.label}
                        </button>
                      ))}
                    </div>
                    {formState.errors.work_types && (
                      <p className="text-sm text-red-500 mt-1">
                        {formState.errors.work_types}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="estimated_price">Estimated Price (EGP)</Label>
                    <input
                      id="estimated_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.maintenanceData.estimated_price}
                      onChange={(e) => handleMaintenanceDataChange('estimated_price', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                /* Regular Order Selection Form */
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="order">Order *</Label>
                  <Select
                    value={selectedOrderId?.toString() || ''}
                    onValueChange={handleOrderChange}
                    disabled={ordersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={getOrderPlaceholder()} />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem
                          key={order.id}
                          value={order.id.toString()}
                        >
                          <div className="flex items-center space-x-3 py-1">
                            <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div className="flex flex-col">
                              <div className="font-medium text-gray-900">
                                #{order.id} - {order.code}
                              </div>
                              <div className="text-sm font-medium text-blue-600">
                                {order.customer_name}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
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
                    {selectedOrderId && selectedOrder
                      ? `for Order ${selectedOrder.code}`
                      : ''}{' '}
                    *
                  </Label>
                  <Select
                    value={formState.selectedStageId?.toString() || ''}
                    onValueChange={handleStageChange}
                    disabled={!selectedOrderId || loadingStages}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={getStagePlaceholder()} />
                    </SelectTrigger>
                    <SelectContent>
                      {stagesForOrder.map((stage) => {
                        const colors = getStageStatusColor(stage.status);
                        return (
                          <SelectItem key={stage.id} value={stage.id.toString()}>
                            <div className={`flex items-center space-x-3 py-1 pl-3 border-l-4 ${colors.border}`}>
                              <div className="flex flex-col flex-1">
                                <div className="font-medium text-gray-900">
                                  {stage.stage_name}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                                    {stage.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Updated: {stage.updated_at ? new Date(stage.updated_at).toLocaleDateString() : 'Never'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formState.errors.stage && (
                    <p className="text-sm text-red-500 mt-1">
                      {formState.errors.stage}
                    </p>
                  )}
                  {loadingStages && (
                    <p className="text-xs text-blue-600 mt-1">
                      Loading stages automatically...
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Selected Order Summary */}
              {selectedOrder && !formState.isMaintenanceOrder && (
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
                    <div className="col-span-2">
                      <span className="font-medium">Customer:</span>{' '}
                      {selectedOrder.customer_name}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Due Date:</span>{' '}
                      {selectedOrder.order_details?.[0]?.due_date
                        ? new Date(
                            selectedOrder.order_details[0].due_date
                          ).toLocaleDateString()
                        : 'No due date set'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Available Stages:</span>{' '}
                      {stagesForOrder.length} stages found
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Order Summary */}
              {formState.isMaintenanceOrder && formState.maintenanceData.customer_name && (
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <h4 className="font-medium text-sm text-orange-700 mb-2">
                    Maintenance Order Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <span className="font-medium">Customer:</span>{' '}
                      {formState.maintenanceData.customer_name}
                    </div>
                    {formState.maintenanceData.company && (
                      <div className="col-span-2">
                        <span className="font-medium">Company:</span>{' '}
                        {formState.maintenanceData.company}
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="font-medium">Address:</span>{' '}
                      {formState.maintenanceData.address}
                    </div>
                    {formState.maintenanceData.phone_number && (
                      <div className="col-span-2">
                        <span className="font-medium">Phone:</span>{' '}
                        {formState.maintenanceData.phone_number}
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="font-medium">Work Types:</span>{' '}
                      {formState.maintenanceData.work_types.join(', ')}
                    </div>
                    {formState.maintenanceData.estimated_price > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium">Estimated Price:</span>{' '}
                        {formState.maintenanceData.estimated_price} EGP
                      </div>
                    )}
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
              
              <div className="space-y-3">
                {formState.selectedEmployees.map((employee, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={employee}
                        onChange={(e) => updateEmployee(index, e.target.value)}
                        placeholder={`Employee ${index + 1} name (e.g., وائل امين)`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEmployee}
                      className="flex items-center justify-center w-10 h-10 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Add another employee"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {formState.selectedEmployees.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmployee(index)}
                        className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove this employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <div className="mt-2 text-xs text-gray-500">
                  <p>💡 <strong>Tip:</strong> Click the <Plus className="inline h-3 w-3" /> button to add more employees</p>
                  <p>📝 <strong>Example names:</strong> وائل امين, هانى مهند, محمد فؤاد (توتا)</p>
                  {formState.selectedEmployees.filter(e => e.trim()).length > 0 && (
                    <p className="mt-1 text-green-600">
                      ✓ {formState.selectedEmployees.filter(e => e.trim()).length} employee(s) selected: {formState.selectedEmployees.filter(e => e.trim()).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              
              {formState.errors.employees && (
                <p className="text-sm text-red-500 mt-1">
                  {formState.errors.employees}
                </p>
              )}
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
              className={formState.isMaintenanceOrder ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {loading
                ? 'Saving...'
                : assignment
                ? 'Update Assignment'
                : formState.isMaintenanceOrder
                ? 'Create Maintenance Order'
                : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AssignmentForm;