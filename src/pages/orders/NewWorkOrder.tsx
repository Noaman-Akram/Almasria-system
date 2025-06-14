import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  MapPin,
  Box,
  Clock,
  Calculator,
  Scissors,
  Wrench,
  Truck,
  Settings,
  Plus,
  Trash2,
  DollarSign,
  Loader2,
  Package,
  Upload,
  Image,
  X,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';
import { WORK_TYPES, ENGINEERS } from '../../lib/constants';
import SaleOrderSelector from '../../components/orders/SaleOrderSelector';
import { useAuth } from '../../contexts/AuthContext';
import { CreateWorkOrderDTO, OrderCostBreakdown } from '../../types/order';
import { WorkOrderService } from '../../services/WorkOrderService';
import Toast from '../../components/ui/Toast';
import { ImageCompression } from '../../services/ImageCompression';

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
    value: 'material',
    label: 'Material',
    icon: Package,
    color: 'text-green-600',
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
  const workOrderService = new WorkOrderService();
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  
  const [selectedSaleOrder, setSelectedSaleOrder] = useState<any | null>(null);
  const [workOrderData, setWorkOrderData] = useState({
    assigned_to: '',
    due_date: '',
    price: 0,
    notes: '',
    img_url: '',
  });

  // Initialize with all cost breakdown types by default
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
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setCompressionStatus(null);
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

      // 1. Compress and upload image if selected
      let imageUrl = '';
      if (selectedImage) {
        setImageUploading(true);
        try {
          // Compress the image before upload
          setCompressionStatus('Compressing image...');
          const compressedImage = await ImageCompression.compressImage(selectedImage, 1, 1920);
          setCompressionStatus(`Compressed: ${(compressedImage.size / 1024 / 1024).toFixed(2)}MB (${(selectedImage.size / compressedImage.size).toFixed(1)}x reduction)`);
          
          // Generate unique filename
          const fileExt = compressedImage.name.split('.').pop();
          const fileName = `work-order-${selectedSaleOrder.id}-${Date.now()}.${fileExt}`;

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
          console.log('[NewWorkOrder] Image uploaded successfully:', imageUrl);
          setCompressionStatus('Upload complete!');
        } catch (error) {
          console.error('[NewWorkOrder] Error uploading image:', error);
          setToast({
            type: 'error',
            message: 'Failed to upload image. Please try again.',
          });
          setIsSubmitting(false);
          setImageUploading(false);
          return;
        } finally {
          setImageUploading(false);
        }
      }

      // 2. Create work order
      const totalCost = calculateTotalCost();

      // Only include cost breakdown items that have values
      const validCostBreakdown = costBreakdown.filter(
        (item) => item.total_cost !== null && item.total_cost > 0
      );

      const workOrderDto: CreateWorkOrderDTO = {
        order_id: selectedSaleOrder.id,
        assigned_to: workOrderData.assigned_to,
        due_date:
          workOrderData.due_date ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0], // Default to 7 days from now if not provided
        price: workOrderData.price,
        total_cost: totalCost,
        notes: workOrderData.notes,
        img_url: imageUrl,
        cost_breakdown: validCostBreakdown.map((item) => ({
          type: item.type,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          total_cost: item.total_cost,
          notes: item.notes,
          added_by: workOrderData.assigned_to,
        })),
      };

      // 3. Create work order
      const createdWorkOrder = await workOrderService.create(workOrderDto);

      // 4. Update sale order status to 'working' (not 'converted')
      await supabase
        .from('orders')
        .update({ order_status: 'working' })
        .eq('id', selectedSaleOrder.id);

      setToast({
        type: 'success',
        message: 'Work order created successfully!',
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

  // Helper function to get icon for cost breakdown type
  const getCostBreakdownIcon = (type: string) => {
    const typeConfig = COST_BREAKDOWN_TYPES.find((t) => t.value === type);
    if (typeConfig) {
      const IconComponent = typeConfig.icon;
      return <IconComponent className={`h-4 w-4 ${typeConfig.color}`} />;
    }
    return <Settings className="h-4 w-4 text-gray-600" />;
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
                      onChange={handleImageSelect}
                    />
                  </label>
                  {imagePreview && (
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
                      alt="Work order preview"
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
              </div>

              {/* Material */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">Material</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost per Unit (EGP)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[2].cost_per_unit || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(
                          2,
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
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costBreakdown[2].quantity || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(2, 'quantity', e.target.value)
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
                      value={costBreakdown[2].total_cost || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      placeholder="0.00"
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      {costBreakdown[2].cost_per_unit &&
                      costBreakdown[2].quantity ? (
                        <span className="text-green-600 font-medium">
                          {costBreakdown[2].cost_per_unit} ×{' '}
                          {costBreakdown[2].quantity} ={' '}
                          {costBreakdown[2].total_cost?.toFixed(2)} EGP
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Enter cost and quantity
                        </span>
                      )}
                    </div>
                  </div>
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
                      Direct cost input
                    </div>
                  </div>
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
                      value={costBreakdown[4].total_cost || ''}
                      onChange={(e) =>
                        updateCostBreakdownItem(4, 'total_cost', e.target.value)
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
            disabled={isSubmitting || imageUploading}
          >
            {isSubmitting || imageUploading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Creating Work Order...</span>
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