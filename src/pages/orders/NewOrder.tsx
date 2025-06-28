import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Copy
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import RadioGroup from '../../components/ui/RadioGroup';
import Toast from '../../components/ui/Toast';
import { EGYPTIAN_CITIES, WORK_TYPES, MATERIAL_TYPES, UNITS } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { OrderService } from '../../services/OrderService';
import { CreateOrderDTO } from '../../types/order';
import { CustomerService } from '../../services/CustomerService';

interface CustomerInput {
  name: string;
  company: string;
  phone_number: string;
  city: string;
  address_details: string;
}

interface MeasurementInput {
  material_name: string;
  material_type: string;
  unit: string;
  quantity: number;
  cost: number;
}

interface OrderInput {
  customer_id?: number;
  work_types: string[];
  order_price: number;
  order_status: 'lead' | 'working';
  sales_person?: string;
  sales_person_custom?: string;
  discount?: number;
}

interface NewOrderProps {
  onWorkTypesChange?: (types: string[]) => void;
}

const SALES_PERSONS = [
  { value: 'محمد عويس', label: 'محمد عويس' },
  { value: 'عمرو البحراوي', label: 'عمرو البحراوي' },
  { value: 'تريزورى', label: 'تريزورى (تيريزا)' },
  { value: 'باسم الشحات', label: 'باسم الشحات (بصمة)' },
  { value: 'إسلام فؤاد', label: 'إسلام فؤاد' },
  { value: 'other', label: 'Other (Custom)' }
];

const NewOrder: React.FC<NewOrderProps> = ({ onWorkTypesChange }) => {
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
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
    order_status: 'lead',
    sales_person: '',
    sales_person_custom: '',
  });
  const [measurements, setMeasurements] = useState<MeasurementInput[]>([{
    material_name: '',
    material_type: 'marble',
    unit: '',
    quantity: 0,
    cost: 0
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const { user } = useAuth();
  const orderService = new OrderService();
  const [realCustomers, setRealCustomers] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderSummary, setLastOrderSummary] = useState<any | null>(null);
  const orderPrice = measurements.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
  const discountedTotal = Math.max(0, orderPrice - (order.discount || 0));
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const service = new CustomerService();
        const data = await service.getAll();
        setRealCustomers(data);
      } catch (err) {}
    };

    fetchCustomers();

  }, []);

  useEffect(() => {
    // Load draft from localStorage
    const draft = localStorage.getItem('saleOrderDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.customer) setCustomer(parsed.customer);
        if (parsed.order) setOrder(parsed.order);
        if (parsed.measurements) setMeasurements(parsed.measurements);
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Save draft to localStorage on change
    localStorage.setItem('saleOrderDraft', JSON.stringify({ customer, order, measurements }));
  }, [customer, order, measurements]);

  const validatePhoneNumber = (phone: string) => {
    return /^01[0125][0-9]{8}$/.test(phone);
  };

  const handleCustomerTypeChange = (newIsNewCustomer: boolean) => {
    setIsNewCustomer(newIsNewCustomer);
    if (newIsNewCustomer) {
      setSelectedCustomer(null);
      setOrder(prev => ({ ...prev, customer_id: undefined }));
      setCustomer({
        name: '',
        company: '',
        phone_number: '',
        city: 'Cairo',
        address_details: ''
      });
    }
  };

  const handleWorkTypeChange = (type: string) => {
    const newTypes = order.work_types.includes(type)
      ? order.work_types.filter(t => t !== type)
      : [...order.work_types, type];
    
    setOrder(prev => ({ ...prev, work_types: newTypes }));
    if (onWorkTypesChange) {
      onWorkTypesChange(newTypes);
    }
  };

  const totals = useMemo(() => {
    const totalCost = measurements.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
    const profit = order.order_price - totalCost;
    const profitMargin = totalCost > 0 ? (profit / totalCost * 100) : 0;
    
    return {
      totalCost,
      profit,
      profitMargin: Math.round(profitMargin)
    };
  }, [measurements, order.order_price]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (measurements.length === 0) {
      setToast({ type: 'error', message: 'At least one measurement is required' });
      return;
    }

    // Validate measurements
    for (const m of measurements) {
      if (m.quantity <= 0) {
        setToast({ type: 'error', message: 'Quantity must be greater than 0' });
        return;
      }
      if (m.cost < 0) {
        setToast({ type: 'error', message: 'Cost cannot be negative' });
        return;
      }
    }

    const hasUnitSelected = measurements.some(m => m.unit !== '');
    if (!hasUnitSelected) {
      setToast({ type: 'error', message: 'Please select at least one unit for the measurements' });
      return;
    }

    if (!isNewCustomer && !order.customer_id) {
      setToast({ type: 'error', message: 'Please select a customer' });
      return;
    }

    if (isNewCustomer) {
      if (!customer.name || !customer.phone_number) {
        setToast({ type: 'error', message: 'Customer name and phone number are required' });
        return;
      }

      if (!validatePhoneNumber(customer.phone_number)) {
        setToast({ type: 'error', message: 'Please enter a valid Egyptian phone number (e.g., 01012345678)' });
        return;
      }
    }

    if (order.work_types.length === 0) {
      setToast({ type: 'error', message: 'Please select at least one work type' });
      return;
    }
 

    if (!order.sales_person || (order.sales_person === 'other' && !order.sales_person_custom)) {
      setToast({ type: 'error', message: 'Please select or enter a sales person' });
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateOrderDTO = {
        customer: isNewCustomer
          ? {
              name: customer.name,
              company: customer.company,
              phone_number: customer.phone_number,
              address: `${customer.city} - ${customer.address_details}`
            }
          : selectedCustomer, // Use the full selected customer object
        order: {
          customer_id: order.customer_id || 0,
          customer_name: isNewCustomer ? customer.name : (selectedCustomer?.name || ''),
          address: isNewCustomer ? `${customer.city} - ${customer.address_details}` : (selectedCustomer?.address || ''),
          order_status: 'sale',
          order_price: discountedTotal,
          discount: order.discount,
          work_types: order.work_types,
          company: isNewCustomer ? customer.company : (selectedCustomer?.company || ''),
          sales_person: order.sales_person === 'other' ? order.sales_person_custom : order.sales_person,
        },
        measurements: measurements.map((m) => ({
          material_name: m.material_name,
          material_type: m.material_type,
          unit: m.unit,
          quantity: m.quantity,
          price: m.cost,
          total_price: m.quantity * m.cost,
        }))
      };
      if (!user) throw new Error('Not authenticated');
      const createdOrder = await orderService.createOrder(dto, user.id);
      setLastOrderSummary(createdOrder);
      setShowSuccessModal(true);
      setToast({ type: 'success', message: 'Order created successfully!' });
      setOrder({ customer_id: undefined, work_types: [], order_price: 0, order_status: 'lead', sales_person: '', sales_person_custom: '' });
      setCustomer({ name: '', company: '', phone_number: '', city: 'Cairo', address_details: '' });
      setMeasurements([{ material_name: '', material_type: 'marble', unit: '', quantity: 0, cost: 0 }]);
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      localStorage.removeItem('saleOrderDraft');

    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsSubmitting(false);
    }
  }, [customer, isNewCustomer, measurements, order, realCustomers, selectedCustomer, user, orderService]);

  const addMeasurement = useCallback(() => {
    setMeasurements(prev => [...prev, {
      material_name: '',
      material_type: 'marble',
      unit: '',
      quantity: 0,
      cost: 0
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
      return updated;
    });
  }, []);

  const handleCopyToClipboard = () => {
    if (!lastOrderSummary) return;
    
    const orderText = `Order Created Successfully!

Order Details:
- Order ID: ${lastOrderSummary.id}
- Order Code: ${lastOrderSummary.code}
- Customer: ${lastOrderSummary.customer_name}
- Company: ${lastOrderSummary.company || 'N/A'}
- Address: ${lastOrderSummary.address}
- Status: ${lastOrderSummary.order_status}
- Sales Person: ${lastOrderSummary.sales_person || 'N/A'}

Work Types: ${(lastOrderSummary.work_types || []).join(', ')}

Order Items:
${(lastOrderSummary.items || []).map((item: any, idx: number) => 
  `${idx + 1}. ${item.material_name} (${item.material_type})
   - Quantity: ${item.quantity} ${item.unit}
   - Unit Cost: ${item.cost} EGP
   - Total: ${item.total_cost} EGP`
).join('\n')}

Order Price: ${lastOrderSummary.order_price} EGP`;

    navigator.clipboard.writeText(orderText).then(() => {
      setToast({ type: 'success', message: 'Order details copied to clipboard!' });
    }).catch(() => {
      setToast({ type: 'error', message: 'Failed to copy to clipboard' });
    });
  };

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
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
                        console.log('[NewOrder] Selected customer:', selected);
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

        <Card>
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Box className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Work Types *</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {WORK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleWorkTypeChange(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    order.work_types.includes(type.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

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
                        value={measurement.cost}
                        onChange={(e) => updateMeasurement(index, 'cost', parseFloat(e.target.value) || 0)}
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
                <span className="text-black-600">{totals.totalCost.toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Discount:</span>
                <span className="text-gray-600">{(order.discount || 0).toLocaleString()} EGP</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">Final Price:</span>
                <span className="font-bold text-blue-600">{(discountedTotal).toLocaleString()} EGP</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="w-full flex items-center justify-center space-x-2 text-lg py-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Creating Order...</span>
              </>
            ) : (
              <>
                <Plus size={24} />
                <span>Create Order</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      <Modal open={showSuccessModal}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-green-700">Order Created Successfully!</h2>
          {lastOrderSummary && (
            <div className="space-y-2">
              <div><span className="font-medium">Order ID:</span> {lastOrderSummary.id}</div>
              <div><span className="font-medium">Order Code:</span> {lastOrderSummary.code}</div>
              <div><span className="font-medium">Customer:</span> {lastOrderSummary.customer_name}</div>
              <div><span className="font-medium">Order Price:</span> {lastOrderSummary.order_price} EGP</div>
            </div>
          )}
          <div className="flex flex-col gap-3 mt-6">
            <Button className="w-full"   onClick={() => { 
              setShowSuccessModal(false);
              window.location.reload(); // Reload current page
            }}>
              Close
            </Button>
            <Button className="w-full" variant="outline" onClick={handleCopyToClipboard}>
              <Copy className="inline-block mr-2" /> Copy Details
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

// Fallback Modal if not present
const Modal = ({ open, onClose, children }: any) => open ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full relative">
      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
      {children}
    </div>
  </div>
) : null;

export default NewOrder;