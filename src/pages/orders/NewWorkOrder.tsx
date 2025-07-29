import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, Clock, Calculator, Scissors, Wrench, Truck, Settings, Plus, DollarSign, Loader2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ImageUpload from '../../components/ui/ImageUpload';
import { supabase } from '../../lib/supabase';
import { ENGINEERS, WORK_ORDER_STAGES, STAGE_STATUSES } from '../../lib/constants';
import SaleOrderSelector from '../../components/orders/SaleOrderSelector';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../../components/ui/Toast';
import { useImageUpload } from '../../hooks/useImageUpload';

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

interface CostBreakdownItem {
  id?: number;
  type: string;
  quantity: number | null;
  unit: string | null;
  cost_per_unit: number | null;
  total_cost: number | null;
  notes: string | null;
}

const NewWorkOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Replace single image state with multiple images
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [selectedSaleOrder, setSelectedSaleOrder] = useState<any | null>(null);
  const [workOrderData, setWorkOrderData] = useState({
    assigned_to: '',
    due_date: '',
    price: 0,
    notes: '',
    img_urls: [],
  });

  // Initialize with valid cost breakdown types only
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([
    {
      type: 'cutting',
      quantity: null,
      unit: 'meter',
      cost_per_unit: null,
      total_cost: null,
      notes: null,
    },
    {
      type: 'finishing',
      quantity: null,
      unit: 'meter',
      cost_per_unit: null,
      total_cost: null,
      notes: null,
    },
    {
      type: 'delivery',
      quantity: null,
      unit: null,
      cost_per_unit: null,
      total_cost: null,
      notes: null,
    },
    {
      type: 'other',
      quantity: null,
      unit: null,
      cost_per_unit: null,
      total_cost: null,
      notes: null,
    },
  ]);

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
      console.log('[NewWorkOrder] Image upload started');
    },
    onUploadComplete: (url) => {
      console.log('[NewWorkOrder] Image upload completed:', url);
      // setWorkOrderData(prev => ({ ...prev, img_url: url })); // This line is no longer needed
    },
    onUploadError: (error) => {
      console.error('[NewWorkOrder] Image upload failed:', error);
      setToast({
        type: 'error',
        message: `Image upload failed: ${error}`,
      });
    },
  });
  useEffect(() => {
    if (orderId) {
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
            .eq('id', orderId)
            .single();

          if (error) throw error;

          if (data) {
            setSelectedSaleOrder(data);
            // Initialize price from sale order
            setWorkOrderData((prev) => ({
              ...prev,
              price: data.order_price || 0,
            }));
          }
        } catch (err) {
          console.error('Error fetching sale order:', err);
          setToast({
            type: 'error',
            message: 'Failed to load sale order details',
          });
        }
      };

      fetchSaleOrder();
    }
  }, [orderId]);

  const handleSaleOrderSelect = (order: any) => {
    setSelectedSaleOrder(order);
    // Initialize price from selected order
    if (order) {
      setWorkOrderData((prev) => ({
        ...prev,
        price: order.order_price || 0,
      }));
    }
  };

  // Replace handleImageSelect and handleImageRemove with multi-image logic
  const handleImagesSelect = (files: File[], previews: string[]) => {
    setSelectedImageFiles(files);
    setImagePreviews(previews);
  };
  const handleImageRemove = (index: number) => {
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
    if (!selectedSaleOrder) {
      setToast({ type: 'error', message: 'Please select a sale order' });
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
      if (!user) throw new Error('User not authenticated');

      console.log('[NewWorkOrder] Starting work order creation process');

      // Upload all selected images
      let imageUrls: string[] = [];
      for (let i = 0; i < selectedImageFiles.length; i++) {
        const file = selectedImageFiles[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `work-order-${selectedSaleOrder.id}-${Date.now()}-${i}.${fileExt}`;
        const url = await imageUpload.uploadImage(file, fileName);
        imageUrls.push(url);
      }
      console.log('[NewWorkOrder] Image uploaded successfully:', imageUrls);

      // 2. Create work order details
      const totalCost = calculateTotalCost();
      console.log('[NewWorkOrder] Creating order_details record');
      
      const { data: detail, error: detailError } = await supabase
        .from('order_details')
        .insert({
          order_id: selectedSaleOrder.id,
          assigned_to: workOrderData.assigned_to,
          due_date: workOrderData.due_date || null,
          price: workOrderData.price,
          total_cost: totalCost,
          notes: workOrderData.notes || null,
          img_urls: imageUrls,
          process_stage: 'not_started',
        })
        .select()
        .single();

      if (detailError) {
        console.error('[NewWorkOrder] Error creating order_details:', detailError);
        throw detailError;
      }

      console.log('[NewWorkOrder] Created order_details:', detail);

      // 3. CRITICAL: Create order_stages for the work order
      console.log('[NewWorkOrder] Creating order_stages for scheduling');
      
      const stages = WORK_ORDER_STAGES.map((stage) => ({
        order_detail_id: detail.detail_id,
        stage_name: stage.value,
        status: STAGE_STATUSES[0].value, // 'not_started'
        planned_start_date: null,
        planned_finish_date: null,
        actual_start_date: null,
        actual_finish_date: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: createdStages, error: stagesError } = await supabase
        .from('order_stages')
        .insert(stages)
        .select();

      if (stagesError) {
        console.error('[NewWorkOrder] Error creating order_stages:', stagesError);
        throw stagesError;
      }

      console.log('[NewWorkOrder] Created order_stages:', createdStages);

      // 4. Insert cost breakdown items if provided (only items with costs)
      if (costBreakdown && costBreakdown.length > 0) {
        const costBreakdownItems = costBreakdown
          .filter(item => item.total_cost && item.total_cost > 0) // Only include items with actual costs
          .map((item) => ({
            order_detail_id: detail.detail_id,
            type: item.type, // This should now be one of: cutting, finishing, delivery, other
            quantity: item.quantity,
            unit: item.unit,
            cost_per_unit: item.cost_per_unit,
            total_cost: item.total_cost,
            notes: item.notes, // Include notes in the database insert
            added_by: workOrderData.assigned_to,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        if (costBreakdownItems.length > 0) {
          console.log('[NewWorkOrder] Inserting cost breakdown items:', costBreakdownItems);
          
          const { error: costBreakdownError } = await supabase
            .from('order_cost_breakdown')
            .insert(costBreakdownItems);

          if (costBreakdownError) {
            console.error('[NewWorkOrder] Error creating cost breakdown items:', costBreakdownError);
            // Don't throw here, we'll still continue with the work order creation
          } else {
            console.log('[NewWorkOrder] Created cost breakdown items');
          }
        }
      }

      // 5. Update sale order status to 'working'
      console.log('[NewWorkOrder] Updating sale order status to working');
      
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          order_status: 'working',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSaleOrder.id);

      if (orderUpdateError) {
        console.error('[NewWorkOrder] Error updating order status:', orderUpdateError);
        throw orderUpdateError;
      }

      console.log('[NewWorkOrder] Work order creation completed successfully');

      setToast({
        type: 'success',
        message: 'Work order created successfully with stages for scheduling!',
      });

      // Navigate to work orders list after a short delay
      setTimeout(() => {
        navigate('/orders/work');
      }, 2000);

    } catch (error) {
      console.error('Error creating work order:', error);
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create work order',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate('/orders/work')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Work Orders</span>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Box className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-semibold text-gray-900">New Work Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sale Order Selection */}
        <Card>
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Box className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Select Sale Order *
              </h3>
            </div>

            <SaleOrderSelector
              onSelect={handleSaleOrderSelect}
              onClear={() => setSelectedSaleOrder(null)}
            />

            {selectedSaleOrder && (
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
            )}
          </div>
        </Card>

        {/* Work Order Details */}
        <Card>
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
        </Card>

        {/* Image Upload */}
        <Card>
          <div className="space-y-6">
            <ImageUpload
              onImagesSelect={handleImagesSelect}
              onImageRemove={handleImageRemove}
              currentImages={imagePreviews}
              uploading={imageUpload.uploading}
              disabled={isSubmitting}
              maxSizeMB={100}
            />
          </div>
        </Card>

        {/* Cost Breakdown */}
        <Card>
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
                      value={costBreakdown[0].cost_per_unit || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(
                          0,
                          'cost_per_unit',
                          e.target.value
                        )
                      }
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
                      value={costBreakdown[0].quantity || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(0, 'quantity', e.target.value)
                      }
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
                      value={costBreakdown[0].total_cost || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      placeholder="0.00"
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      {costBreakdown[0].cost_per_unit &&
                      costBreakdown[0].quantity ? (
                        <span className="text-green-600 font-medium">
                          {costBreakdown[0].cost_per_unit} ×{' '}
                          {costBreakdown[0].quantity} ={' '}
                          {costBreakdown[0].total_cost?.toFixed(2)} EGP
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
                    value={costBreakdown[0].notes || ''}
                    onChange={(e) =>
                      updateCostBreakdownItem(0, 'notes', e.target.value)
                    }
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
                      value={costBreakdown[1].cost_per_unit || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(
                          1,
                          'cost_per_unit',
                          e.target.value
                        )
                      }
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
                      value={costBreakdown[1].quantity || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(1, 'quantity', e.target.value)
                      }
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
                      value={costBreakdown[1].total_cost || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      placeholder="0.00"
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      {costBreakdown[1].cost_per_unit &&
                      costBreakdown[1].quantity ? (
                        <span className="text-green-600 font-medium">
                          {costBreakdown[1].cost_per_unit} ×{' '}
                          {costBreakdown[1].quantity} ={' '}
                          {costBreakdown[1].total_cost?.toFixed(2)} EGP
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
                    value={costBreakdown[1].notes || ''}
                    onChange={(e) =>
                      updateCostBreakdownItem(1, 'notes', e.target.value)
                    }
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
                      value={costBreakdown[2].total_cost || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(2, 'total_cost', e.target.value)
                      }
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
                    value={costBreakdown[2].notes || ''}
                    onChange={(e) =>
                      updateCostBreakdownItem(2, 'notes', e.target.value)
                    }
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
                      value={costBreakdown[3].total_cost || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(3, 'total_cost', e.target.value)
                      }
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
                    value={costBreakdown[3].notes || ''}
                    onChange={(e) =>
                      updateCostBreakdownItem(3, 'notes', e.target.value)
                    }
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
        </Card>

        {/* Order Summary */}
        <Card>
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
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto flex items-center justify-center space-x-2 text-lg py-4"
            disabled={isSubmitting || imageUpload.uploading}
          >
            {isSubmitting || imageUpload.uploading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>{imageUpload.uploading ? 'Uploading Image...' : 'Creating Work Order...'}</span>
              </>
            ) : (
              <>
                <Plus size={24} />
                <span>Create Work Order</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewWorkOrder;