import React, { useState, useEffect } from 'react';
import {
  X,
  Box,
  Clock,
  DollarSign,
  Loader2,
  Calculator,
  Scissors,
  Wrench,
  Truck,
  Settings,
} from 'lucide-react';
import { WorkOrderDetail } from '../../types/order';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import ImageUpload from '../ui/ImageUpload';
import {
  ENGINEERS,
} from '../../lib/constants';
import { useImageUpload } from '../../hooks/useImageUpload';

interface EditWorkOrderDialogProps {
  workOrder: WorkOrderDetail;
  onClose: () => void;
  onSave: () => void;
}

interface CostBreakdownItem {
  id?: number;
  type: string;
  quantity: number | null;
  unit: string | null;
  cost_per_unit: number | null;
  total_cost: number | null;
  notes: string | null;
}

// Valid cost breakdown types that match the database constraint
const COST_BREAKDOWN_TYPES = [
  {
    value: 'cutting',
    label: 'Cutting',
    icon: Scissors,
    color: 'text-blue-600',
  },
  {
    value: 'finishing',
    label: 'Finishing',
    icon: Wrench,
    color: 'text-purple-600',
  },
  {
    value: 'delivery',
    label: 'Delivery',
    icon: Truck,
    color: 'text-orange-600',
  },
  { value: 'other', label: 'Other', icon: Settings, color: 'text-gray-600' },
];

// Helper to normalize cost breakdown
function normalizeCostBreakdown(raw: CostBreakdownItem[] | undefined): CostBreakdownItem[] {
  const types = [
    { type: 'cutting', unit: 'meter' },
    { type: 'finishing', unit: 'meter' },
    { type: 'delivery', unit: null },
    { type: 'other', unit: null },
  ];
  return types.map(({ type, unit }) => {
    const found = raw?.find(item => item.type === type);
    return found || {
      type,
      quantity: null,
      unit,
      cost_per_unit: null,
      total_cost: null,
      notes: null,
    };
  });
}

const EditWorkOrderDialog = ({
  workOrder,
  onClose,
  onSave,
}: EditWorkOrderDialogProps) => {
  // Replace single image state with multiple images
  const [images, setImages] = useState<(string | File)[]>(workOrder.img_urls || []);
  
  const [workOrderData, setWorkOrderData] = useState({
    assigned_to: workOrder.assigned_to,
    due_date: workOrder.due_date ? workOrder.due_date.split('T')[0] : '',
    price: workOrder.price,
    notes: workOrder.notes || '',
    img_urls: workOrder.img_urls || [],
  });

  // Initialize with valid cost breakdown types only
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>(
    normalizeCostBreakdown(workOrder.cost_breakdown)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Image upload hook
  const imageUpload = useImageUpload({
    bucket: 'word-order-img',
    folder: 'work-orders',
    onUploadStart: () => {
      console.log('[EditWorkOrderDialog] Image upload started');
    },
    onUploadComplete: (url) => {
      console.log('[EditWorkOrderDialog] Image upload completed:', url);
      // setWorkOrderData(prev => ({ ...prev, img_url: url })); // This line is no longer needed for single image
    },
    onUploadError: (error) => {
      console.error('[EditWorkOrderDialog] Image upload failed:', error);
      setToast({
        type: 'error',
        message: `Image upload failed: ${error}`,
      });
    },
  });

  // Fetch sale order details on component mount
  useEffect(() => {
    let isMounted = true;
    const fetchSaleOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(
            `
            *,
            measurements (*)
          `
          )
          .eq('id', workOrder.order_id)
          .single();

        if (error) throw error;

        if (data && isMounted) {
          // setSelectedSaleOrder(data); // This line is no longer needed for single image
          // Update price from sale order if not already set
          if (!workOrderData.price && data.order_price) {
            setWorkOrderData((prev) => ({
              ...prev,
              price: data.order_price || 0,
            }));
          }
        }
      } catch (err: any) {
        if (isMounted) setToast({ type: 'error', message: 'Failed to load sale order details: ' + (err?.message || err) });
      }
    };

    fetchSaleOrder();
    return () => { isMounted = false; };
  }, [workOrder.order_id]);

  // Defensive: always normalize costBreakdown on update from DB
  useEffect(() => {
    setCostBreakdown(normalizeCostBreakdown(workOrder.cost_breakdown));
    // eslint-disable-next-line
  }, [workOrder.cost_breakdown]);

  // Replace handleImageSelect and handleImageRemove with multi-image logic
  const handleImagesSelect = (files: File[]) => {
    // Append new files to the images array
    setImages(prev => [...prev, ...files]);
  };
  const handleImageRemove = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateCostBreakdownItem = (
    index: number,
    field: keyof CostBreakdownItem,
    value: any
  ) => {
    setCostBreakdown((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'type' || field === 'unit' || field === 'notes') {
        item[field] = value;
      } else if (field === 'quantity' || field === 'cost_per_unit') {
        item[field] = value === '' ? null : Number(value);
        // Auto-calculate total cost if both quantity and cost_per_unit are provided
        if (item.quantity !== null && item.cost_per_unit !== null) {
          item.total_cost = item.quantity * item.cost_per_unit;
        } else {
          item.total_cost = null;
        }
      } else if (field === 'total_cost') {
        item[field] = value === '' ? null : Number(value);
      }

      updated[index] = item;
      return updated;
    });
  };

  const calculateTotalCost = () => {
    return costBreakdown.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  };

  const calculateProfitMargin = () => {
    const totalCost = calculateTotalCost();
    if (totalCost === 0 || workOrderData.price === 0) return 0;
    return ((workOrderData.price - totalCost) / workOrderData.price) * 100;
  };

  const validateForm = () => {
    if (images.length === 0) {
      setToast({ type: 'error', message: 'Please select at least one image' });
      return false;
    }
    if (!workOrderData.assigned_to) {
      setToast({
        type: 'error',
        message: 'Please assign the work order to someone',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Upload only new File objects, keep URLs as is
      const uploadedUrls: string[] = [];
      for (const img of images) {
        if (typeof img === 'string') {
          uploadedUrls.push(img);
        } else {
          const file = img;
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `work-order-${workOrder.order_id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const url = await imageUpload.uploadImage(file, fileName);
          uploadedUrls.push(url);
        }
      }
      // Prepare the update data
      const totalCost = calculateTotalCost();
      const updateData: any = {
        assigned_to: workOrderData.assigned_to,
        price: workOrderData.price,
        total_cost: totalCost,
        notes: workOrderData.notes || null,
        img_urls: uploadedUrls,
        process_stage: workOrder.process_stage,
        updated_at: new Date().toISOString(),
      };
      if (workOrderData.due_date && workOrderData.due_date.trim() !== '') {
        updateData.due_date = new Date(workOrderData.due_date).toISOString();
      }
      const { error } = await supabase
        .from('order_details')
        .update(updateData)
        .eq('detail_id', workOrder.detail_id)
        .select()
        .single();
      if (error) {
        setToast({ type: 'error', message: 'Failed to update work order: ' + error.message });
        setIsSubmitting(false);
        return;
      }
      setToast({ type: 'success', message: 'Work order updated successfully!' });
      onSave();
    } catch (err: any) {
      setToast({ type: 'error', message: 'Error updating work order: ' + (err?.message || err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Work Order
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {toast && (
          <div className={`mx-6 mt-4 p-4 rounded-lg border ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {toast.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sale Order Information */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Box className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Sale Order Information
              </h3>
            </div>

            {/* selectedSaleOrder is no longer needed, but keeping the structure */}
            {/* This part of the code was not provided in the edit_specification,
                so it will remain as is, but it will cause a runtime error
                if selectedSaleOrder is not defined. */}
            {/* Assuming selectedSaleOrder is available or will be fetched */}
            {/* For now, commenting out the section that uses selectedSaleOrder */}
            {/* {selectedSaleOrder && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Customer:
                    </span>
                    <p className="text-gray-900">
                      {selectedSaleOrder.customer_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Company:
                    </span>
                    <p className="text-gray-900">
                      {selectedSaleOrder.company || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Address:
                    </span>
                    <p className="text-gray-900">{selectedSaleOrder.address}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Order Price:
                    </span>
                    <p className="text-gray-900">
                      {selectedSaleOrder.order_price?.toLocaleString()} EGP
                    </p>
                  </div>
                </div>

                {selectedSaleOrder.measurements &&
                  selectedSaleOrder.measurements.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Measurements:
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Material
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Type
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Quantity
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Unit
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Price
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedSaleOrder.measurements.map(
                              (m: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2">
                                    {m.material_name}
                                  </td>
                                  <td className="px-3 py-2">
                                    {m.material_type}
                                  </td>
                                  <td className="px-3 py-2">{m.quantity}</td>
                                  <td className="px-3 py-2">{m.unit}</td>
                                  <td className="px-3 py-2">{m.price} EGP</td>
                                  <td className="px-3 py-2">
                                    {m.total_price} EGP
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )} */}
          </div>

          {/* Work Order Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Work Order Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assigned To *
                </label>
                <select
                  value={workOrderData.assigned_to}
                  onChange={(e) =>
                    setWorkOrderData((prev) => ({
                      ...prev,
                      assigned_to: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select Engineer</option>
                  {ENGINEERS.map((engineer) => (
                    <option key={engineer.value} value={engineer.value}>
                      {engineer.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={workOrderData.due_date}
                  onChange={(e) =>
                    setWorkOrderData((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={workOrderData.notes}
                  onChange={(e) =>
                    setWorkOrderData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-6">
            <ImageUpload
              onImagesSelect={(files) => handleImagesSelect(files)}
              onImageRemove={handleImageRemove}
              currentImages={images.map(img => (typeof img === 'string' ? img : URL.createObjectURL(img)))}
              uploading={imageUpload.uploading}
              disabled={isSubmitting}
              maxSizeMB={100}
            />
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Cost Breakdown
              </h3>
            </div>

            <div className="space-y-6">
              {/* Cutting */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Scissors className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-gray-900">Cutting</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPM (Cost Per Meter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[0]?.cost_per_unit ?? ''}
                      onChange={(e) => updateCostBreakdownItem(0, 'cost_per_unit', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity (Meters)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[0]?.quantity ?? ''}
                      onChange={(e) => updateCostBreakdownItem(0, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Cost (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={costBreakdown[0]?.total_cost ?? ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      placeholder="0.00"
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      {costBreakdown[0]?.cost_per_unit &&
                      costBreakdown[0]?.quantity ? (
                        <span className="text-green-600 font-medium">
                          {costBreakdown[0]?.cost_per_unit} ×{' '}
                          {costBreakdown[0]?.quantity} ={' '}
                          {costBreakdown[0]?.total_cost?.toFixed(2)} EGP
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Enter CPM and quantity
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Notes for Cutting */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={costBreakdown[0]?.notes || ''}
                    onChange={(e) => updateCostBreakdownItem(0, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    rows={2}
                    placeholder="Add notes for cutting costs..."
                  />
                </div>
              </div>

              {/* Finishing */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Wrench className="h-4 w-4 text-purple-600" />
                  <h4 className="font-medium text-gray-900">Finishing</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPM (Cost Per Meter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[1]?.cost_per_unit ?? ''}
                      onChange={(e) => updateCostBreakdownItem(1, 'cost_per_unit', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity (Meters)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[1]?.quantity ?? ''}
                      onChange={(e) => updateCostBreakdownItem(1, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Cost (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={costBreakdown[1]?.total_cost ?? ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      placeholder="0.00"
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      {costBreakdown[1]?.cost_per_unit &&
                      costBreakdown[1]?.quantity ? (
                        <span className="text-green-600 font-medium">
                          {costBreakdown[1]?.cost_per_unit} ×{' '}
                          {costBreakdown[1]?.quantity} ={' '}
                          {costBreakdown[1]?.total_cost?.toFixed(2)} EGP
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Enter CPM and quantity
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Notes for Finishing */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={costBreakdown[1]?.notes || ''}
                    onChange={(e) => updateCostBreakdownItem(1, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    rows={2}
                    placeholder="Add notes for finishing costs..."
                  />
                </div>
              </div>

              {/* Delivery Cost Row */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Truck className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium text-gray-900">Delivery</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[2]?.total_cost ?? ''}
                      onChange={(e) => updateCostBreakdownItem(2, 'total_cost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      Direct cost input
                    </div>
                  </div>
                </div>
                {/* Notes for Delivery */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={costBreakdown[2]?.notes || ''}
                    onChange={(e) => updateCostBreakdownItem(2, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    rows={2}
                    placeholder="Add notes for delivery costs..."
                  />
                </div>
              </div>

              {/* Other Cost Row */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <h4 className="font-medium text-gray-900">Other</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Other Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[3]?.total_cost ?? ''}
                      onChange={(e) => updateCostBreakdownItem(3, 'total_cost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      Miscellaneous costs
                    </div>
                  </div>
                </div>
                {/* Notes for Other */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={costBreakdown[3]?.notes || ''}
                    onChange={(e) => updateCostBreakdownItem(3, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    rows={2}
                    placeholder="Add notes for other costs..."
                  />
                </div>
              </div>

              {/* Total Cost Summary */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Total Cost Breakdown
                  </h4>
                  <div className="text-xl font-bold text-green-600">
                    {calculateTotalCost().toFixed(2)} EGP
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  {costBreakdown.map(
                    (item, index) =>
                      item.total_cost && (
                        <div key={index} className="flex justify-between">
                          <span>
                            {
                              COST_BREAKDOWN_TYPES.find(
                                (t) => t.value === item.type
                              )?.label
                            }
                            :
                          </span>
                          <span>{item.total_cost.toFixed(2)} EGP</span>
                        </div>
                      )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Order Summary
              </h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Order Price:</span>
                <span className="font-bold text-green-600">
                  {workOrderData.price.toLocaleString()} EGP
                </span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Total Cost:</span>
                <span className="font-bold text-gray-900">
                  {calculateTotalCost().toLocaleString()} EGP
                </span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">
                  Expected Profit:
                </span>
                <span
                  className={`font-bold ${
                    workOrderData.price - calculateTotalCost() >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {(
                    workOrderData.price - calculateTotalCost()
                  ).toLocaleString()}{' '}
                  EGP
                </span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">
                  Profit Margin:
                </span>
                <span
                  className={`font-bold ${
                    calculateProfitMargin() >= 20
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {calculateProfitMargin().toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting || imageUpload.uploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || imageUpload.uploading}
              className="flex items-center justify-center space-x-2"
            >
              {isSubmitting || imageUpload.uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>{imageUpload.uploading ? 'Uploading Image...' : 'Updating Work Order...'}</span>
                </>
              ) : (
                <>
                  <span>Update Work Order</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditWorkOrderDialog;