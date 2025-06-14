import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  BadgeDollarSign,
  Receipt,
  ListFilter,
  Search,
  Info,
  Tag,
  ArrowUpDown,
  MapPin,
  Building2,
  Phone,
  Box,
  Ruler,
  Trash2,
  Calculator
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import StatusBadge from '../../../components/ui/StatusBadge';
import { Order } from '../../../types/order';
import { OrderService } from '../../../services/OrderService';
import { supabase } from '../../../lib/supabase';
import { EGYPTIAN_CITIES, WORK_TYPES, MATERIAL_TYPES, UNITS } from '../../../lib/constants';

const SaleOrdersList = () => {
  const navigate = useNavigate();
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 40;
  const [orderMeasurements, setOrderMeasurements] = useState<Record<number, any[]>>({});
  const [orderDetails, setOrderDetails] = useState<Record<number, any[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editMeasurements, setEditMeasurements] = useState<any[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editToast, setEditToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const toggleOrder = async (orderId: number) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      console.log('[SaleOrdersList] Collapsed order:', orderId);
      return;
    }
    setExpandedOrder(orderId);
    setLoadingDetails(orderId);
    console.log('[SaleOrdersList] Expanding order:', orderId);
    const [measurementsRes, detailsRes] = await Promise.all([
      supabase.from('measurements').select('*').eq('order_id', orderId),
      supabase.from('order_details').select('*').eq('order_id', orderId),
    ]);
    if (measurementsRes.error) console.error('[SaleOrdersList] Measurements error:', measurementsRes.error);
    if (detailsRes.error) console.error('[SaleOrdersList] Order details error:', detailsRes.error);
    setOrderMeasurements((prev) => ({ ...prev, [orderId]: measurementsRes.data || [] }));
    setOrderDetails((prev) => ({ ...prev, [orderId]: detailsRes.data || [] }));
    setLoadingDetails(null);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    console.log('[SaleOrdersList] Sorting by:', field, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const fetchOrders = async (pageNum = 0, reset = false) => {
    setLoading(true);
    try {
      const offset = pageNum * LIMIT;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });
      if (!error && data) {
        const paged = data.slice(offset, offset + LIMIT);
        setOrders((prev) => reset ? paged : [...prev, ...paged]);
        setHasMore(paged.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrders([]);
    setPage(0);
    setHasMore(true);
    fetchOrders(0, true);
    // eslint-disable-next-line
  }, [sortField, sortDirection]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage);
  };
  
  // Helper to render customer info
  const renderCustomerInfo = (order: any) => (
    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4 border-b border-gray-200 pb-2">
      <div className="flex items-center gap-1"><User size={14} /> <b>Name:</b> {order.customer_name}</div>
      <div className="flex items-center gap-1"><Building2 size={14} /> <b>Company:</b> {order.company}</div>
      <div className="flex items-center gap-1"><MapPin size={14} /> <b>City:</b> {order.address?.split(' - ')[0] || '-'}</div>
      <div className="col-span-2 flex items-center gap-1"><MapPin size={14} /> <b>Address:</b> {order.address}</div>
    </div>
  );

  // Helper to render work types as badges
  const renderWorkTypes = (workTypes: string[] | string) => {
    if (!workTypes) return null;
    const types = Array.isArray(workTypes) ? workTypes : String(workTypes).split(',');
    return (
      <div className="flex flex-wrap gap-1">
        {types.map((type, idx) => (
          <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">{type}</span>
        ))}
      </div>
    );
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  // Helper to format date in Egypt/Cairo time with minutes and seconds
  const formatDateTimeCairo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', { timeZone: 'Africa/Cairo', hour12: false });
  };

  // Helper to render order summary
  const renderOrderSummary = (order: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 mb-2 text-xs text-gray-700">
      <div><b>Order Price:</b> <span className="text-blue-700 font-bold">{order.order_price} EGP</span></div>
      <div><b>Created At:</b> {formatDate(order.created_at)}</div>
    </div>
  );

  // Open edit modal and prefill form
  const handleEditOrder = async (order: any) => {
    setEditOrder(order);
    // Parse address into city and address_details
    let city = '', address_details = '';
    if (order.address && order.address.includes(' - ')) {
      [city, address_details] = order.address.split(' - ');
    } else {
      city = order.address || '';
      address_details = '';
    }
    setEditForm({
      customer_name: order.customer_name,
      company: order.company,
      city,
      address_details,
      work_types: Array.isArray(order.work_types) ? order.work_types : String(order.work_types).split(','),
      order_price: order.order_price,
    });
    console.log('[SaleOrdersList] Fetching measurements for order:', order.id);
    const { data: measurements } = await supabase.from('measurements').select('*').eq('order_id', order.id);
    console.log('[SaleOrdersList] Fetched measurements:', measurements);
    setEditMeasurements(measurements || []);
    setShowEditModal(true);
    console.log('[EditOrder] Opened for order:', order);
  };

  // Handle edit form changes
  const handleEditFormChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // Handle measurement changes
  const handleEditMeasurementChange = (idx: number, field: string, value: any) => {
    setEditMeasurements((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Add/remove measurement
  const addEditMeasurement = () => {
    setEditMeasurements((prev) => [...prev, { material_name: '', material_type: '', unit: '', quantity: 0, price: 0 }]);
  };
  const removeEditMeasurement = (idx: number) => {
    setEditMeasurements((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!editForm.customer_name || !editForm.city || !editForm.address_details) {
      setEditToast({ type: 'error', message: 'Please fill all required fields.' });
      return;
    }
    if (!editForm.work_types || editForm.work_types.length === 0) {
      setEditToast({ type: 'error', message: 'Please select at least one work type.' });
      return;
    }
    if (!editMeasurements.length) {
      setEditToast({ type: 'error', message: 'At least one measurement is required.' });
      return;
    }
    for (const m of editMeasurements) {
      if (!m.material_name || !m.material_type || !m.unit || m.quantity <= 0 || m.price < 0) {
        setEditToast({ type: 'error', message: 'Please fill all measurement fields with valid values.' });
        return;
      }
    }
    // Prepare summary of changes
    const changes = [];
    if (editOrder.customer_name !== editForm.customer_name) changes.push(`Customer Name: ${editOrder.customer_name} → ${editForm.customer_name}`);
    if (editOrder.company !== editForm.company) changes.push(`Company: ${editOrder.company} → ${editForm.company}`);
    if (editOrder.address !== `${editForm.city} - ${editForm.address_details}`) changes.push(`Address: ${editOrder.address} → ${editForm.city} - ${editForm.address_details}`);
    if (JSON.stringify(Array.isArray(editOrder.work_types) ? editOrder.work_types : String(editOrder.work_types).split(',')) !== JSON.stringify(editForm.work_types)) changes.push(`Work Types: ${editOrder.work_types} → ${editForm.work_types}`);
    if (editOrder.order_price !== editForm.order_price) changes.push(`Order Price: ${editOrder.order_price} → ${editForm.order_price}`);
    // Measurements summary (detailed)
    const oldMs = orderMeasurements[editOrder.id] || [];
    const measurementChanges = [];
    // Check for added/removed
    if (editMeasurements.length !== oldMs.length) measurementChanges.push(`Measurements count: ${oldMs.length} → ${editMeasurements.length}`);
    // Check for changed fields
    editMeasurements.forEach((m, idx) => {
      const old = oldMs[idx];
      if (!old) {
        measurementChanges.push(`Added: ${m.material_name} (${m.material_type}, ${m.unit}, Qty: ${m.quantity}, Price: ${m.price})`);
      } else {
        const diffs = [];
        if (m.material_name !== old.material_name) diffs.push(`Name: ${old.material_name} → ${m.material_name}`);
        if (m.material_type !== old.material_type) diffs.push(`Type: ${old.material_type} → ${m.material_type}`);
        if (m.unit !== old.unit) diffs.push(`Unit: ${old.unit} → ${m.unit}`);
        if (m.quantity !== old.quantity) diffs.push(`Qty: ${old.quantity} → ${m.quantity}`);
        if (m.price !== old.price) diffs.push(`Price: ${old.price} → ${m.price}`);
        if (diffs.length) measurementChanges.push(`Measurement ${idx + 1}: ${diffs.join(', ')}`);
      }
    });
    // Removed measurements
    oldMs.forEach((old, idx) => {
      if (!editMeasurements[idx]) measurementChanges.push(`Removed: ${old.material_name} (${old.material_type}, ${old.unit})`);
    });
    if (measurementChanges.length) changes.push('Measurements: ' + measurementChanges.join(' | '));
    // Confirm
    const confirmMsg = `You are about to update this order with the following changes:\n\n${changes.join('\n') || 'No changes detected.'}\n\nProceed?`;
    if (!window.confirm(confirmMsg)) {
      console.log('[EditOrder] Update cancelled by user.');
      return;
    }
    setEditSubmitting(true);
    try {
      // If work_types changed, regenerate order code
      let newCode = editOrder.code;
      if (JSON.stringify(Array.isArray(editOrder.work_types) ? editOrder.work_types : String(editOrder.work_types).split(',')) !== JSON.stringify(editForm.work_types)) {
        const WORK_TYPE_CODE_MAP: Record<string, string> = { kitchen: 'K', walls: 'W', floor: 'F', other: 'X' };
        const sortedCodes = (editForm.work_types || [])
          .map((type: string) => (type in WORK_TYPE_CODE_MAP ? WORK_TYPE_CODE_MAP[type] : type.charAt(0).toUpperCase()))
          .sort()
          .join('');
        newCode = `${sortedCodes}-${editOrder.id}`;
        console.log('[EditOrder] Regenerated order code:', newCode);
      }
      // Calculate new order cost
      const newOrderCost = editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0);
      // Update order
      console.log('[SaleOrdersList] Updating order:', editOrder.id);
      const { error: orderError } = await supabase.from('orders').update({
        customer_name: editForm.customer_name,
        company: editForm.company,
        address: `${editForm.city} - ${editForm.address_details}`,
        work_types: editForm.work_types,
        order_price: editForm.order_price,
        updated_at: new Date().toISOString(),
        code: newCode,
      }).eq('id', editOrder.id);
      console.log('[SaleOrdersList] Order update result:', { error: orderError });
      if (orderError) throw orderError;
      // Update measurements (delete old, insert new for simplicity)
      console.log('[SaleOrdersList] Deleting old measurements for order:', editOrder.id);
      await supabase.from('measurements').delete().eq('order_id', editOrder.id);
      console.log('[SaleOrdersList] Deleted old measurements');
      console.log('[SaleOrdersList] Inserting new measurements for order:', editOrder.id);
      for (const m of editMeasurements) {
        await supabase.from('measurements').insert({ ...m, order_id: editOrder.id, total_price: m.quantity * m.price });
      }
      console.log('[SaleOrdersList] Inserted new measurements');
      setEditToast({ type: 'success', message: 'Order updated successfully!' });
      setShowEditModal(false);
      setEditOrder(null);
      console.log('[EditOrder] Order updated:', { ...editForm, code: newCode, measurements: editMeasurements });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setEditToast({ type: 'error', message: err.message || 'Failed to update order' });
      console.error('[EditOrder] Update error:', err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePrintOrder = (order: any) => {
    const measurements = orderMeasurements[order.id] || [];
   
    const printWindow = window.open('');
    if (!printWindow) return;
  
    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.code} - Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
            h2 { color: #2563eb; margin-bottom: 24px; }
            .section { margin-bottom: 32px; }
            .section-title { font-size: 1.2rem; font-weight: bold; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
            .info-row { display: flex; margin-bottom: 8px; }
            .info-label { width: 180px; font-weight: 500; color: #555; }
            .info-value { flex: 1; }
            .work-types { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
            .work-type { background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 999px; font-size: 0.95rem; font-weight: 500; }
            .items-list { margin-bottom: 8px; }
            .item-card { background: #f3f4f6; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
            .item-title { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
            .item-details { font-size: 0.97rem; color: #444; }
            .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 24px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 1.08rem; }
            .summary-label { color: #166534; font-weight: 500; }
            .summary-value { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Order Summary - ${order.code}</h2>
          <div class="section">
            <div class="section-title">Order Details</div>
            <div class="info-row"><div class="info-label">Order Code:</div><div class="info-value">${order.code}</div></div>
            <div class="info-row"><div class="info-label">Status:</div><div class="info-value">${order.order_status}</div></div>
            <div class="info-row"><div class="info-label">Created At:</div><div class="info-value">${order.created_at}</div></div>
          </div>
          <div class="section">
            <div class="section-title">Customer Information</div>
            <div class="info-row"><div class="info-label">Name:</div><div class="info-value">${order.customer_name}</div></div>
            <div class="info-row"><div class="info-label">Company:</div><div class="info-value">${order.company || '-'}</div></div>
            <div class="info-row"><div class="info-label">Address:</div><div class="info-value">${order.address}</div></div>
          </div>
          <div class="section">
            <div class="section-title">Work Types</div>
            <div class="work-types">
              ${(Array.isArray(order.work_types) ? order.work_types : String(order.work_types).split(',')).map((type: string) => `<span class="work-type">${type}</span>`).join('')}
            </div>
          </div>
          <div class="section">
            <div class="section-title">Measurements</div>
            <div class="items-list">
              ${measurements.map((item, idx) => `
                <div class="item-card">
                  <div class="item-title">Item ${idx + 1}: ${item.material_name}</div>
                  <div class="item-details">
                    <div>Type: ${item.material_type}</div>
                    <div>Unit: ${item.unit}</div>
                    <div>Quantity: ${item.quantity}</div>
                    <div>Unit Price: ${item.price} EGP</div>
                    <div>Total Price: ${item.total_price} EGP</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="summary-box">
            <div class="summary-row"><span class="summary-label">Order Price:</span><span class="summary-value">${order.order_price} EGP</span></div>
    </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="text-blue-600" size={28} /> Sale Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage your sale orders and proposals</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => window.location.reload()}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.582 9A7.003 7.003 0 0112 5c3.314 0 6.127 2.01 7.418 4.857M18.418 15A7.003 7.003 0 0112 19c-3.314 0-6.127-2.01-7.418-4.857" /></svg>
            Refresh
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-8 pr-3 py-2 rounded border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ListFilter size={16} /> Filter
          </Button>
          <Button
            onClick={() => navigate('/orders/sale/new')}
            className="flex items-center space-x-2"
          >
            <PlusCircle size={16} />
            <span>New Sale Order</span>
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-gray-50 rounded-t-lg border border-gray-200 grid grid-cols-8 text-sm font-semibold text-gray-600 items-center" style={{minHeight: '48px'}}>
        <div className="px-4 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('code')}>Order <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('created_at')}>Created At <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('customer_name')}>Customer <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('address')}>Address <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('work_types')}>Work Types <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('order_price')}>Price <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('order_status')}>Status <ArrowUpDown size={14} /></div>
        <div className="px-2 py-3 text-right">Expand</div>
      </div>
      <div className="divide-y divide-gray-200">
        {orders
          .filter(order =>
            order.code.toLowerCase().includes(search.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            (order.address || '').toLowerCase().includes(search.toLowerCase())
          )
          .map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* Main Row */}
              <div
                className="grid grid-cols-8 items-center hover:bg-gray-50 cursor-pointer" style={{minHeight: '56px'}}
                onClick={() => toggleOrder(order.id)}
              >
                <div className="px-4 py-2 flex items-center gap-1">
                  <Tag className="text-blue-600" size={18} />
                  <span className="font-mono font-bold text-blue-700">{order.code}</span>
                </div>
                <div className="px-2 py-2 text-gray-700">{formatDate(order.created_at)}</div>
                <div className="px-2 py-2 flex items-center gap-1 text-gray-900">
                  <User size={16} className="text-gray-400" />
                  {order.customer_name}
                </div>
                <div className="px-2 py-2 text-gray-700 truncate">{order.address}</div>
                <div className="px-2 py-2">{renderWorkTypes(order.work_types)}</div>
                <div className="px-2 py-2 text-gray-900">{order.order_price} EGP</div>
                <div className="px-2 py-2"><StatusBadge status={order.order_status} /></div>
                <div className="px-2 py-2 flex items-center justify-end">{expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
              </div>
              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-6 space-y-6">
                  {loadingDetails === order.id ? (
                    <div className="text-center text-gray-500 py-4">Loading details...</div>
                  ) : (
                    <>
                      {/* Group: Customer Info */}
                      {renderCustomerInfo(order)}
                      {/* Group: Order Summary (created at removed) */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 mb-2 text-xs text-gray-700">
                        <div><b>Order Price:</b> <span className="text-blue-700 font-bold">{order.order_price} EGP</span></div>
                        <div><b>Discount:</b> <span className="text-blue-700 font-bold">{order.discount || 0} EGP</span></div>
                      </div>
                      {/* Group: Measurements Table */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Measurements</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm border border-gray-200 rounded">
                            <thead>
                              <tr className="text-gray-500 text-xs border-b border-gray-200">
                                <th className="text-left py-2 px-2">Material</th>
                                <th className="text-left py-2 px-2">Type</th>
                                <th className="text-left py-2 px-2">Quantity</th>
                                <th className="text-left py-2 px-2">Price</th>
                                <th className="text-left py-2 px-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(orderMeasurements[order.id] || []).map((item: any, idx: number) => (
                                <tr key={idx} className="border-b last:border-0 border-gray-100">
                                  <td className="py-2 px-2 font-medium text-gray-900">{item.material_name}</td>
                                  <td className="py-2 px-2 text-gray-700">{item.material_type}</td>
                                  <td className="py-2 px-2 text-gray-900">{item.quantity} {item.unit}</td>
                                  <td className="py-2 px-2 text-gray-900">{item.price} EGP</td>
                                  <td className="py-2 px-2 text-blue-900 font-semibold">{item.total_price} EGP</td>
                                </tr>
                              ))}

                            </tbody>
                          </table>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 mb-2 text-xs text-gray-700 pr-32 justify-self-end">
                          <b>Total:</b>{" "}
                          <span className="text-blue-700 font-bold">
                            {
                              (orderMeasurements[order.id] || []).reduce(
                                (sum, item) => sum + (item.total_price || (item.quantity * item.price)), 0
                              )
                            } EGP
                          </span>
                        </div>
                      </div>
                      {/* Group: Order Details (bottom, only 3 fields + created at) */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs text-gray-600 border-t border-gray-200 pt-4">
                        <div><b>Created At:</b> {formatDateTimeCairo(order.created_at)}</div>
                        <div><b>Updated At:</b> {formatDateTimeCairo(order.updated_at)}</div>
                        <div><b>Customer ID:</b> {order.customer_id}</div>
                        <div><b>Created By:</b> {order.created_by}</div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handlePrintOrder(order);
                          }}
                        >
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrder(order);
                          }}
                        >
                          Edit Order
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/work/new/${order.id}`);
                          }}
                        >
                          Convert to Work Order
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        {hasMore && (
          <button
            className="w-full py-2 mt-2 bg-gray-100 rounded text-gray-700 hover:bg-gray-200"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
      {/* Edit Order Modal */}
      {showEditModal && (
        <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditSubmit} className="space-y-8 max-w-2xl w-full p-4 overflow-y-auto max-h-[90vh]">
            {/* Customer Info Card */}
            <Card>
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                    <input type="text" className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" value={editForm.customer_name} onChange={e => handleEditFormChange('customer_name', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input type="text" className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" value={editForm.company} onChange={e => handleEditFormChange('company', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City *</label>
                    <select className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" value={editForm.city || ''} onChange={e => handleEditFormChange('city', e.target.value)} required>
                      <option value="">Select City</option>
                      {EGYPTIAN_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address Details *</label>
                    <input type="text" className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" value={editForm.address_details || ''} onChange={e => handleEditFormChange('address_details', e.target.value)} required />
                  </div>
                </div>
              </div>
            </Card>
            {/* Work Types Card */}
            <Card>
              <div className="flex items-center space-x-2 mb-2">
                <Box className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Work Types *</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {WORK_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editForm.work_types.includes(type.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => {
                      const exists = editForm.work_types.includes(type.value);
                      handleEditFormChange('work_types', exists ? editForm.work_types.filter((t: string) => t !== type.value) : [...editForm.work_types, type.value]);
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </Card>
            {/* Measurements Card */}
            <Card>
              <div className="flex items-center space-x-2 mb-2">
                <Ruler className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Measurements *</h3>
                <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={addEditMeasurement}>+ Add Measurement</Button>
              </div>
              <div className="space-y-6">
                {editMeasurements.map((m, idx) => (
                  <div key={idx} className="bg-gray-50 p-6 rounded-lg space-y-6 relative">
                    <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-red-500" onClick={() => removeEditMeasurement(idx)} title="Remove"><Trash2 size={18} /></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Material Name *</label>
                        <input type="text" className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" value={m.material_name} onChange={e => handleEditMeasurementChange(idx, 'material_name', e.target.value)} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Material Type *</label>
                        <div className="flex gap-2">
                          {MATERIAL_TYPES.map(mt => (
                            <button
                              key={mt.value}
                              type="button"
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${m.material_type === mt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              onClick={() => handleEditMeasurementChange(idx, 'material_type', mt.value)}
                            >
                              {mt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                        <div className="flex gap-2">
                          {UNITS.map(u => (
                            <button
                              key={u.value}
                              type="button"
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${m.unit === u.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              onClick={() => handleEditMeasurementChange(idx, 'unit', u.value)}
                            >
                              {u.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                          value={m.quantity} 
                          onChange={e => handleEditMeasurementChange(idx, 'quantity', Number(e.target.value))} 
                          required 
                          min="0.01" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price per Unit (EGP) *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                          value={m.price} 
                          onChange={e => handleEditMeasurementChange(idx, 'price', Number(e.target.value))} 
                          required 
                          min="0" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            {/* Order Summary Card */}
            <Card>
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Price (EGP) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="block w-full pl-3 pr-3 py-3 text-lg rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                    value={editForm.order_price} 
                    onChange={e => handleEditFormChange('order_price', Number(e.target.value))} 
                    required 
                    min="0" 
                  />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4 mt-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium text-gray-700">Order Price (input):</span>
                  <span className="font-bold text-blue-600">{editForm.order_price.toLocaleString()} EGP</span>
                </div>
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium text-gray-700">Total Price:</span>
                  <span className="font-bold text-gray-900">{editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0).toLocaleString()} EGP</span>
                </div>
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium text-gray-700">Expected Profit:</span>
                  <span className={`font-bold ${(editForm.order_price - editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(editForm.order_price - editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0)).toLocaleString()} EGP</span>
                </div>
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium text-gray-700">Profit Margin:</span>
                  <span className={`font-bold ${editForm.order_price > 0 ? ((editForm.order_price - editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0)) / editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0) * 100 >= 20 ? 'text-green-600' : 'text-yellow-600') : 'text-gray-400'}`}>{editForm.order_price > 0 && editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0) > 0 ? Math.round((editForm.order_price - editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0)) / editMeasurements.reduce((sum, m) => sum + (m.quantity * m.price), 0) * 100) : 0}%</span>
                </div>
              </div>
            </Card>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>{editSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
            {editToast && (
              <div className={`mt-2 text-sm ${editToast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{editToast.message}</div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};

// Simple Modal (copied from NewOrder fallback)
const Modal = ({ open, onClose, children }: any) => open ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full relative">
      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
      {children}
    </div>
  </div>
) : null;

export default SaleOrdersList;