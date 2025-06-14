import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Phone,
  MapPin,
  Box,
  Clock,
  Ruler,
  Trash2,
  Plus,
  DollarSign,
  Loader2,
  Calculator,
  Scissors,
  Wrench,
  Truck,
  Settings,
  Package,
  Upload,
  Image,
} from 'lucide-react';
import { WorkOrderDetail, OrderCostBreakdown } from '../../types/order';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import {
  EGYPTIAN_CITIES,
  MATERIAL_TYPES,
  UNITS,
  WORK_TYPES,
} from '../../lib/constants';
import { formatDate } from '../../utils/date';
import RadioGroup from '../ui/RadioGroup';
import { ImageUploadService } from '../../services/ImageUploadService';
import { ImageCompression } from '../../services/ImageCompression';

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

const COST_BREAKDOWN_TYPES = [
  { value: 'cutting', label: 'Cutting' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'material', label: 'Material' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
];

const EditWorkOrderDialog = ({
  workOrder,
  onClose,
  onSave,
}: EditWorkOrderDialogProps) => {
  const [customer, setCustomer] = useState({
    name:
      workOrder.order?.customer?.name || workOrder.order?.customer_name || '',
    company:
      workOrder.order?.customer?.company || workOrder.order?.company || '',
    phone_number: workOrder.order?.customer?.phone_number || '',
    address:
      workOrder.order?.customer?.address || workOrder.order?.address || '',
  });

  const [workTypes, setWorkTypes] = useState<string[]>(
    workOrder.order?.work_types || []
  );
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>(
    workOrder.cost_breakdown
      ? workOrder.cost_breakdown.map((item) => ({
          id: item.id,
          type: item.type,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          total_cost: item.total_cost,
          notes: item.notes,
        }))
      : [
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
            type: 'material',
            quantity: null,
            unit: 'piece',
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
        ]
  );

  const [workOrderData, setWorkOrderData] = useState({
    assigned_to: workOrder.assigned_to,
    due_date: workOrder.due_date.split('T')[0], // Format date for input
    price: workOrder.price,
    notes: workOrder.notes || '',
    img_url: workOrder.img_url || '',
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(workOrder.img_url || null);
  const [imageUploading, setImageUploading] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleWorkTypeChange = (type: string) => {
    setWorkTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToast({
        type: 'error',
        message: 'Please select an image file',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setToast({
        type: 'error',
        message: 'Image size should be less than 10MB',
      });
      return;
    }

    setSelectedImage(file);
    
    // Create and set preview from the original file
    const previewUrl = await ImageCompression.createPreview(file);
    setImagePreview(previewUrl);
    
    // Show file size info
    setCompressionStatus(`Original: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview && !workOrder.img_url) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setWorkOrderData(prev => ({ ...prev, img_url: '' }));
    setCompressionStatus(null);
  };

  const addCostBreakdownItem = () => {
    setCostBreakdown((prev) => [
      ...prev,
      {
        type: 'other',
        quantity: null,
        unit: null,
        cost_per_unit: null,
        total_cost: null,
        notes: null,
      },
    ]);
  };

  const removeCostBreakdownItem = (index: number) => {
    if (costBreakdown.length > 1) {
      setCostBreakdown((prev) => prev.filter((_, i) => i !== index));
    } else {
      setToast({
        type: 'error',
        message: 'At least one cost breakdown item is required',
      });
    }
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
    if (!customer.name || !customer.phone_number || !customer.address) {
      setToast({
        type: 'error',
        message: 'Please fill in all required customer fields',
      });
      return false;
    }

    if (workTypes.length === 0) {
      setToast({
        type: 'error',
        message: 'Please select at least one work type',
      });
      return false;
    }

    if (!workOrderData.assigned_to || !workOrderData.due_date) {
      setToast({
        type: 'error',
        message: 'Please fill in all required work order fields',
      });
      return false;
    }

    if (costBreakdown.length === 0) {
      setToast({
        type: 'error',
        message: 'At least one cost breakdown item is required',
      });
      return false;
    }

    for (const item of costBreakdown) {
      if (!item.type) {
        setToast({
          type: 'error',
          message: 'Please select a type for all cost breakdown items',
        });
        return false;
      }

      // Only validate quantity and cost_per_unit if total_cost is not directly set
      if (
        item.total_cost === null &&
        (item.quantity === null || item.cost_per_unit === null)
      ) {
        setToast({
          type: 'error',
          message:
            'Please provide either both quantity and cost per unit, or a direct total cost',
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      console.log('[EditWorkOrderDialog] Starting work order update');

      // 1. Compress and upload image if selected
      let imageUrl = workOrderData.img_url;
      if (selectedImage) {
        setImageUploading(true);
        try {
          // Compress the image before upload
          setCompressionStatus('Compressing image...');
          const compressedImage = await ImageCompression.compressImage(selectedImage, 1, 1920);
          setCompressionStatus(`Compressed: ${(compressedImage.size / 1024 / 1024).toFixed(2)}MB (${(selectedImage.size / compressedImage.size).toFixed(1)}x reduction)`);
          
          // Generate unique filename
          const fileExt = compressedImage.name.split('.').pop();
          const fileName = `work-order-${workOrder.detail_id}-${Date.now()}.${fileExt}`;

          // Upload file to Supabase storage
          setCompressionStatus('Uploading compressed image...');
          const { data, error } = await supabase.storage
            .from('word-order-img')
            .upload(fileName, compressedImage, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            throw new Error(`Upload failed: ${error.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('word-order-img')
            .getPublicUrl(data.path);

          imageUrl = urlData.publicUrl;
          console.log('[EditWorkOrderDialog] Image uploaded successfully:', imageUrl);
          setCompressionStatus('Upload complete!');
        } catch (error) {
          console.error('[EditWorkOrderDialog] Error uploading image:', error);
          setToast({
            type: 'error',
            message: 'Failed to upload image. Please try again.',
          });
          setSubmitting(false);
          setImageUploading(false);
          return;
        } finally {
          setImageUploading(false);
        }
      }

      // 2. Update customer data
      console.log('[EditWorkOrderDialog] Updating customer data');
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          name: customer.name,
          company: customer.company,
          phone_number: customer.phone_number,
          address: customer.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workOrder.order?.customer_id);

      if (customerError) throw customerError;
      console.log('[EditWorkOrderDialog] Customer data updated successfully');

      // 3. Update order
      console.log('[EditWorkOrderDialog] Updating order data');
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: customer.name,
          company: customer.company,
          address: customer.address,
          work_types: workTypes,
          order_price: workOrderData.price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(workOrder.order_id));

      if (orderError) throw orderError;
      console.log('[EditWorkOrderDialog] Order data updated successfully');

      // 4. Update work order details
      console.log('[EditWorkOrderDialog] Updating work order details');
      const totalCost = calculateTotalCost();
      const { error: workOrderError } = await supabase
        .from('order_details')
        .update({
          assigned_to: workOrderData.assigned_to,
          due_date: new Date(workOrderData.due_date).toISOString(),
          price: workOrderData.price,
          total_cost: totalCost,
          notes: workOrderData.notes,
          img_url: imageUrl, // Save the image URL
          process_stage: workOrder.process_stage,
          updated_at: new Date().toISOString(),
        })
        .eq('detail_id', Number(workOrder.detail_id));

      if (workOrderError) throw workOrderError;
      console.log(
        '[EditWorkOrderDialog] Work order details updated successfully'
      );

      // 5. Update cost breakdown items
      console.log('[EditWorkOrderDialog] Updating cost breakdown items');
      // First delete existing items
      await supabase
        .from('order_cost_breakdown')
        .delete()
        .eq('order_detail_id', Number(workOrder.detail_id));

      // Then insert new items
      const costBreakdownItems = costBreakdown.map((item) => ({
        order_detail_id: Number(workOrder.detail_id),
        type: item.type,
        quantity: item.quantity,
        unit: item.unit,
        cost_per_unit: item.cost_per_unit,
        total_cost: item.total_cost,
        notes: item.notes,
        added_by: workOrder.assigned_to,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: costBreakdownError } = await supabase
        .from('order_cost_breakdown')
        .insert(costBreakdownItems);

      if (costBreakdownError) throw costBreakdownError;
      console.log(
        '[EditWorkOrderDialog] Cost breakdown items updated successfully'
      );

      setToast({
        type: 'success',
        message: 'Work order updated successfully!',
      });
      setTimeout(onSave, 1500);
    } catch (err) {
      console.error('[EditWorkOrderDialog] Error updating work order:', err);
      setToast({ type: 'error', message: 'Failed to update work order' });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to get icon for cost breakdown type
  const getCostBreakdownIcon = (type: string) => {
    switch (type) {
      case 'cutting':
        return <Scissors className="h-4 w-4 text-blue-600" />;
      case 'finishing':
        return <Wrench className="h-4 w-4 text-purple-600" />;
      case 'material':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'delivery':
        return <Truck className="h-4 w-4 text-orange-600" />;
      default:
        return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Customer Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name *
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) =>
                      setCustomer((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={customer.company}
                    onChange={(e) =>
                      setCustomer((prev) => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                    className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={customer.phone_number}
                    onChange={(e) =>
                      setCustomer((prev) => ({
                        ...prev,
                        phone_number: e.target.value,
                      }))
                    }
                    className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                    required
                    pattern="^01[0125][0-9]{8}$"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address *
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={customer.address}
                    onChange={(e) =>
                      setCustomer((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Work Types */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Box className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Work Types *
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {WORK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleWorkTypeChange(type.value)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    workTypes.includes(type.value)
                      ? 'bg-green-100 text-green-800 border-2 border-green-500'
                      : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Work Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Work Details
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assigned To *
                </label>
                <input
                  type="text"
                  value={workOrderData.assigned_to}
                  onChange={(e) =>
                    setWorkOrderData((prev) => ({
                      ...prev,
                      assigned_to: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date *
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
                  required
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
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Work Order Image
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image (Max 10MB)
                </label>
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="h-5 w-5 mr-2" />
                    <span>Select Image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  {(imagePreview || selectedImage) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                {compressionStatus && (
                  <p className="mt-2 text-xs text-blue-600">{compressionStatus}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Images will be automatically compressed to save storage while preserving quality.
                </p>
              </div>
              <div>
                {imageUploading ? (
                  <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Work order"
                      className="h-40 object-contain rounded-lg border border-gray-200"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg">
                    <div className="text-center text-gray-400">
                      <Image className="h-8 w-8 mx-auto mb-2" />
                      <p>No image selected</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Cost Breakdown *
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCostBreakdownItem}
                className="flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add Cost Item</span>
              </Button>
            </div>

            <div className="space-y-4">
              {costBreakdown.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {getCostBreakdownIcon(item.type)}
                      <h4 className="text-lg font-medium text-gray-900">
                        {COST_BREAKDOWN_TYPES.find((t) => t.value === item.type)
                          ?.label || 'Cost Item'}{' '}
                        {index + 1}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCostBreakdownItem(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type *
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          updateCostBreakdownItem(index, 'type', e.target.value)
                        }
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        {COST_BREAKDOWN_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit
                      </label>
                      <select
                        value={item.unit || ''}
                        onChange={(e) =>
                          updateCostBreakdownItem(
                            index,
                            'unit',
                            e.target.value || null
                          )
                        }
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select Unit</option>
                        <option value="meter">Meter</option>
                        <option value="square_meter">Square Meter</option>
                        <option value="piece">Piece</option>
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity === null ? '' : item.quantity}
                        onChange={(e) =>
                          updateCostBreakdownItem(
                            index,
                            'quantity',
                            e.target.value
                          )
                        }
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cost per Unit (EGP)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          item.cost_per_unit === null ? '' : item.cost_per_unit
                        }
                        onChange={(e) =>
                          updateCostBreakdownItem(
                            index,
                            'cost_per_unit',
                            e.target.value
                          )
                        }
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Total Cost (EGP) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.total_cost === null ? '' : item.total_cost}
                        onChange={(e) =>
                          updateCostBreakdownItem(
                            index,
                            'total_cost',
                            e.target.value
                          )
                        }
                        className={`mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 ${
                          item.quantity !== null && item.cost_per_unit !== null
                            ? 'bg-gray-50'
                            : ''
                        }`}
                        min="0"
                        required
                        readOnly={
                          item.quantity !== null && item.cost_per_unit !== null
                        }
                      />
                      {item.quantity !== null &&
                        item.cost_per_unit !== null && (
                          <p className="text-xs text-gray-500 mt-1">
                            Auto-calculated: {item.quantity} ×{' '}
                            {item.cost_per_unit} = {item.total_cost}
                          </p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        value={item.notes || ''}
                        onChange={(e) =>
                          updateCostBreakdownItem(
                            index,
                            'notes',
                            e.target.value
                          )
                        }
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        rows={2}
                        placeholder="Add any notes about this cost item"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
                <span className="font-medium text-gray-700">Total Cost:</span>
                <span className="font-bold text-gray-900">
                  {calculateTotalCost().toLocaleString()} EGP
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || imageUploading}>
              {submitting || imageUploading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {toast && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                toast.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
              }`}
            >
              {toast.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditWorkOrderDialog;