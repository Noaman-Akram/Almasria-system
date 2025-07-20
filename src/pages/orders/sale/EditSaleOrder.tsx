import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Calculator, 
  Home,
  Phone,
  Plus,
  Trash2,
  User,
  UserPlus,
  MapPin,
  Ruler,
  Box,
  Loader2,
  ArrowLeft,
  Save
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import RadioGroup from '../../../components/ui/RadioGroup';
import Toast from '../../../components/ui/Toast';
import { EGYPTIAN_CITIES, WORK_TYPES, MATERIAL_TYPES, UNITS } from '../../../lib/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { CustomerService } from '../../../services/CustomerService';

interface CustomerInput {
  name: string;
  company: string;
  phone_number: string;
  city: string;
  address_details: string;
}

interface MeasurementInput {
  id?: number;
  material_name: string;
  material_type: string;
  unit: string;
  quantity: number;
  price: number;
  total_price: number;
}

interface OrderInput {
  customer_id?: number;
  work_types: string[];
  order_price: number;
  order_status: 'sale';
  sales_person?: string;
  sales_person_custom?: string;
  discount?: number;
}

const SALES_PERSONS = [
  { value: 'محمد عويس', label: 'محمد عويس' },
  { value: 'عمرو البحراوي', label: 'عمرو البحراوي' },
  { value: 'تريزورى', label: 'تريزورى (تيريزا)' },
  { value: 'باسم الشحات', label: 'باسم الشحات (بصمة)' },
  { value: 'إسلام فؤاد', label: 'إسلام فؤاد' },
  { value: 'other', label: 'Other (Custom)' }
];

const EditSaleOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  
  const [originalOrder, setOriginalOrder] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [realCustomers, setRealCustomers] = useState<any[]>([]);
  
  const [customer, setCustomer] = useState<CustomerInput>({
    name: '',
    company: '',
    phone_number: '',
    city: 'Cairo',
    address_details: ''
  });
  
  const [order, setOrder] = useState<OrderInput>({
    customer_id: undefined,
    work_types: [],
    order_price: 0,
    order_status: 'sale',
    sales_person: '',
    sales_person_custom: '',
    discount: 0,
  });
  
  const [measurements, setMeasurements] = useState<MeasurementInput[]>([{
    material_name: '',
    material_type: 'marble',
    unit: '',
    quantity: 0,
    price: 0,
    total_price: 0
  }]);

  // Fetch customers for the dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const service = new CustomerService();
        const data = await service.getAll();
        setRealCustomers(data);
      } catch (err) {
        console.error('Error fetching customers:', err);
      }
    };

    fetchCustomers();
  }, []);

  // Load existing order data
  useEffect(() => {
    if (!orderId) {
      navigate('/orders/sale');
      return;
    }

    const loadOrderData = async () => {
      try {
        setLoading(true);
        
        // Fetch order with customer and measurements
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            customers (*),
            measurements (*)
          `)
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        if (!orderData) throw new Error('Order not found');

        setOriginalOrder(orderData);

        // Check if this order has an existing customer or is a new customer
        if (orderData.customer_id && orderData.customers) {
          // Existing customer
          setIsNewCustomer(false);
          setSelectedCustomer(orderData.customers);
          setOrder(prev => ({ ...prev, customer_id: orderData.customer_id }));
          
          // Set customer data from the linked customer record
          setCustomer({
            name: orderData.customers.name || '',
            company: orderData.customers.company || '',
            phone_number: orderData.customers.phone_number || '',
            city: orderData.customers.address?.split(' - ')[0] || 'Cairo',
            address_details: orderData.customers.address?.split(' - ').slice(1).join(' - ') || ''
          });
        } else {
          // New customer (data stored in order record)
          setIsNewCustomer(true);
          setSelectedCustomer(null);
          
          // Parse address to extract city and details
          const addressParts = orderData.address?.split(' - ') || ['Cairo', ''];
          const city = addressParts[0] || 'Cairo';
          const addressDetails = addressParts.slice(1).join(' - ') || '';

          setCustomer({
            name: orderData.customer_name || '',
            company: orderData.company || '',
            phone_number: '', // This might not be stored in order record
            city: city,
            address_details: addressDetails
          });
        }

        // Set order data
        setOrder({
          customer_id: orderData.customer_id,
          work_types: Array.isArray(orderData.work_types) ? orderData.work_types : [],
          order_price: orderData.order_price || 0,
          order_status: 'sale',
          sales_person: orderData.sales_person || '',
          sales_person_custom: '',
          discount: orderData.discount || 0,
        });

        // Set measurements data
        const measurementsData = orderData.measurements?.map((m: any) => ({
          id: m.id,
          material_name: m.material_name || '',
          material_type: m.material_type || 'marble',
          unit: m.unit || '',
          quantity: m.quantity || 0,
          price: m.price || 0,
          total_price: m.total_price || 0
        })) || [];

        setMeasurements(measurementsData.length > 0 ? measurementsData : [{
          material_name: '',
          material_type: 'marble',
          unit: '',
          quantity: 0,
          price: 0,
          total_price: 0
        }]);

      } catch (error) {
        console.error('Error loading order:', error);
        setToast({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Failed to load order data' 
        });
        navigate('/orders/sale');
      } finally {
        setLoading(false);
      }
    };

    loadOrderData();
  }, [orderId, navigate]);

  const validatePhoneNumber = (phone: string) => {
    return /^01[0125][0-9]{8}$/.test(phone);
  };

  const handleCustomerTypeChange = (newIsNewCustomer: boolean) => {
    setIsNewCustomer(newIsNewCustomer);
    if (newIsNewCustomer) {
      setSelectedCustomer(null);
      setOrder(prev => ({ ...prev, customer_id: undefined }));
      // Keep current customer data when switching to new customer
    }
  };

  const handleWorkTypeChange = (type: string) => {
    const newTypes = order.work_types.includes(type)
      ? order.work_types.filter(t => t !== type)
      : [...order.work_types, type];
    
    setOrder(prev => ({ ...prev, work_types: newTypes }));
  };

  const addMeasurement = useCallback(() => {
    setMeasurements(prev => [...prev, {
      material_name: '',
      material_type: 'marble',
      unit: '',
      quantity: 0,
      price: 0,
      total_price: 0
    }]);
  }, []);

  const removeMeasurement = useCallback((index: number) => {
    if (measurements.length > 1) {
      setMeasurements(prev => prev.filter((_, i) => i !== index));
    } else {
      setToast({ type: 'error', message: 'At least one measurement is required' });
    }
  }, [measurements.length]);

  const updateMeasurement = useCallback((index: number, field: keyof MeasurementInput, value: string | number) => {
    setMeasurements(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      
      // Auto-calculate total_price when quantity or price changes
      if (field === 'quantity' || field === 'price') {
        updated[index].total_price = updated[index].quantity * updated[index].price;
      }
      
      return updated;
    });
  }, []);

  // Calculate totals - exactly like in creation form
  const orderPrice = measurements.reduce((sum, m) => sum + (m.quantity * m.price), 0);
  const discountedTotal = Math.max(0, orderPrice - (order.discount || 0));

  const validateForm = () => {
    if (!isNewCustomer && !order.customer_id) {
      setToast({ type: 'error', message: 'Please select a customer' });
      return false;
    }

    if (isNewCustomer) {
      if (!customer.name || !customer.phone_number || !customer.address_details) {
        setToast({ type: 'error', message: 'Customer name, phone number, and address are required' });
        return false;
      }

      if (!validatePhoneNumber(customer.phone_number)) {
        setToast({ type: 'error', message: 'Please enter a valid Egyptian phone number (e.g., 01012345678)' });
        return false;
      }
    }

    if (order.work_types.length === 0) {
      setToast({ type: 'error', message: 'Please select at least one work type' });
      return false;
    }

    if (measurements.length === 0) {
      setToast({ type: 'error', message: 'At least one measurement is required' });
      return false;
    }

    for (const m of measurements) {
      if (!m.material_name || !m.unit || m.quantity <= 0 || m.price < 0) {
        setToast({ type: 'error', message: 'Please fill in all measurement fields with valid values' });
        return false;
      }
    }

    if (!order.sales_person || (order.sales_person === 'other' && !order.sales_person_custom)) {
      setToast({ type: 'error', message: 'Please select or enter a sales person' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!orderId) return;

    setIsSubmitting(true);

    try {
      let customerId = order.customer_id;

      // Handle customer update/creation
      if (isNewCustomer) {
        // For new customer, create or update customer record
        if (originalOrder.customer_id) {
          // Update existing customer
          const { error: customerError } = await supabase
            .from('customers')
            .update({
              name: customer.name,
              company: customer.company,
              phone_number: customer.phone_number,
              address: `${customer.city} - ${customer.address_details}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', originalOrder.customer_id);

          if (customerError) throw customerError;
          customerId = originalOrder.customer_id;
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: customer.name,
              company: customer.company,
              phone_number: customer.phone_number,
              address: `${customer.city} - ${customer.address_details}`,
            })
            .select()
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      } else {
        // For existing customer, just update the company field if needed
        if (selectedCustomer && customer.company !== selectedCustomer.company) {
          const { error: customerError } = await supabase
            .from('customers')
            .update({
              company: customer.company,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedCustomer.id);

          if (customerError) throw customerError;
        }
        customerId = order.customer_id;
      }

      // Update order data
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_id: customerId,
          customer_name: isNewCustomer ? customer.name : (selectedCustomer?.name || customer.name),
          company: customer.company,
          address: isNewCustomer ? `${customer.city} - ${customer.address_details}` : (selectedCustomer?.address || `${customer.city} - ${customer.address_details}`),
          work_types: order.work_types,
          order_price: discountedTotal,
          discount: order.discount,
          sales_person: order.sales_person === 'other' ? order.sales_person_custom : order.sales_person,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update measurements
      // First, delete existing measurements
      const { error: deleteError } = await supabase
        .from('measurements')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) throw deleteError;

      // Then insert updated measurements
      const measurementsToInsert = measurements.map(m => ({
        order_id: parseInt(orderId),
        material_name: m.material_name,
        material_type: m.material_type,
        unit: m.unit,
        quantity: m.quantity,
        price: m.price,
        total_price: m.quantity * m.price, // Ensure correct calculation
      }));

      const { error: measurementsError } = await supabase
        .from('measurements')
        .insert(measurementsToInsert);

      if (measurementsError) throw measurementsError;

      setToast({ type: 'success', message: 'Order updated successfully!' });
      
      // Navigate back to orders list after a short delay
      setTimeout(() => {
        navigate('/orders/sale');
      }, 1500);

    } catch (error) {
      console.error('Error updating order:', error);
      setToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update order' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Order...</h2>
          <p className="text-gray-500 mt-2">Fetching order details</p>
        </div>
      </div>
    );
  }

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
          onClick={() => navigate('/orders/sale')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Orders</span>
        </Button>

        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 px-4 py-2 rounded-md">
            <span className="text-sm text-gray-500">Order Code:</span>
            <span className="ml-2 font-mono font-bold text-blue-600">
              {originalOrder?.code || 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Box className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Edit Sale Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <Card>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCustomerTypeChange(!isNewCustomer)}
                className="flex items-center space-x-2"
              >
                <UserPlus size={16} />
                <span>{isNewCustomer ? 'Select Existing' : 'Add New Customer'}</span>
              </Button>
            </div>

            {!isNewCustomer ? (
              <div className="space-y-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Select Customer *</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={order.customer_id || ''}
                      onChange={(e) => {
                        const selected = realCustomers.find((c) => c.id === Number(e.target.value));
                        setOrder({ ...order, customer_id: Number(e.target.value) });
                        setSelectedCustomer(selected || null);
                        setCustomer((prev) => ({ ...prev, company: selected?.company || '' }));
                      }}
                      className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a customer</option>
                      {realCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedCustomer && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedCustomer.name}</p>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Company:</span>
                      <input
                        type="text"
                        value={customer.company}
                        onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Company Name"
                      />
                    </div>
                    <p><span className="font-medium">Phone:</span> {selectedCustomer.phone_number}</p>
                    <p><span className="font-medium">Address:</span> {selectedCustomer.address}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={customer.company}
                      onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={customer.phone_number}
                      onChange={(e) => setCustomer({ ...customer, phone_number: e.target.value })}
                      className={`block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${
                        customer.phone_number && !validatePhoneNumber(customer.phone_number)
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : ''
                      }`}
                      placeholder="01012345678"
                      required
                    />
                  </div>
                  {customer.phone_number && !validatePhoneNumber(customer.phone_number) && (
                    <p className="mt-1 text-sm text-red-600">
                      Please enter a valid Egyptian phone number (e.g., 01012345678)
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">City *</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={customer.city}
                      onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {EGYPTIAN_CITIES.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700">Address Details *</label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Home className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={customer.address_details}
                      onChange={(e) => setCustomer({ ...customer, address_details: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Street, Building, etc."
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Work Types */}
        <Card>
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Box className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Work Types *</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {WORK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleWorkTypeChange(type.value)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    order.work_types.includes(type.value)
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                      : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Measurements */}
        <Card>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ruler className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Measurements *</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMeasurement}
                className="flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add Measurement</span>
              </Button>
            </div>

            <div className="space-y-6">
              {measurements.map((measurement, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">Measurement {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeMeasurement(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Material Name *</label>
                      <input
                        type="text"
                        value={measurement.material_name}
                        onChange={(e) => updateMeasurement(index, 'material_name', e.target.value)}
                        className="mt-1 block w-full px-6 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Material Type *</label>
                      <RadioGroup
                        options={[...MATERIAL_TYPES]}
                        value={measurement.material_type}
                        onChange={(value) => updateMeasurement(index, 'material_type', value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                      <RadioGroup
                        options={[...UNITS]}
                        value={measurement.unit}
                        onChange={(value) => updateMeasurement(index, 'unit', value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={measurement.quantity}
                        onChange={(e) => updateMeasurement(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full px-6 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        required
                        min="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price per Unit (EGP) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={measurement.price}
                        onChange={(e) => updateMeasurement(index, 'price', parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full px-6 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        required
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card>
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
            </div>
                        
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Sales Person *</label>
                <select
                  value={order.sales_person || ''}
                  onChange={(e) => setOrder({ ...order, sales_person: e.target.value })}
                  className="mt-1 block w-full py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select sales person</option>
                  {SALES_PERSONS.map((sp) => (
                    <option key={sp.value} value={sp.value}>{sp.label}</option>
                  ))}
                </select>
                {order.sales_person === 'other' && (
                  <input
                    type="text"
                    value={order.sales_person_custom || ''}
                    onChange={(e) => setOrder({ ...order, sales_person_custom: e.target.value })}
                    className="mt-2 block w-full py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter custom sales person name"
                    required
                  />
                )}
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Discount (EGP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={order.discount || ''}
                  onChange={(e) => setOrder({ ...order, discount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Total Price:</span>
                <span className="text-black-600">{orderPrice.toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Discount:</span>
                <span className="text-gray-600">{(order.discount || 0).toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Final Price:</span>
                <span className="font-bold text-blue-600">{discountedTotal.toLocaleString()} EGP</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/orders/sale')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto flex items-center justify-center space-x-2 text-lg py-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Updating Order...</span>
              </>
            ) : (
              <>
                <Save size={24} />
                <span>Update Order</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditSaleOrder;