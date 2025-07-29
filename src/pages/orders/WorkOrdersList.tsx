'use client';

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  ListFilter,
  ArrowUpDown,
  Hammer,
  Calendar,
  User,
  BadgeDollarSign,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  MapPin,
  Box,
  Clock,
  ClipboardList,
  Pencil,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  Calculator,
  Printer,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import EditWorkOrderDialog from '../../components/orders/EditWorkOrderDialog';
import { STAGE_STATUSES } from '../../lib/constants';
import { OrderCostBreakdown, WorkOrderDetail } from '../../types/order';

interface WorkOrder {
  detail_id: string;
  order_id: string;
  assigned_to: string;
  due_date: string;
  process_stage: string;
  price: number;
  total_cost: number;
  notes?: string;
  img_url?: string;
  img_urls?: string[]; // Changed from img_url to img_urls
  cost_breakdown?: OrderCostBreakdown[];
  order?: {
    id: string;
    code: string;
    customer_id: number;
    customer_name: string;
    company: string;
    address: string;
    work_types: string[];
    created_at: string;
    customer?: {
      id: number;
      name: string;
      company: string;
      phone_number: string;
      address: string;
      city: string;
      address_details: string;
    };
    measurements?: {
      id: string;
      material_name: string;
      material_type: string;
      unit: string;
      quantity: number;
      price: number;
      total_price: number;
    }[];
  };
  stages?: {
    id: string;
    stage_name: string;
    status: string;
    planned_start_date: string;
    planned_finish_date: string;
    actual_start_date: string | null;
    actual_finish_date: string | null;
    notes: string;
    assignments?: {
      id: string;
      employee_name: string;
      work_date: string;
      note: string | null;
      is_done: boolean;
      employee_rate: number;
    }[];
  }[];
}

type SortableField = keyof WorkOrder | 'customer_name' | 'code';

// Add this helper at the top of the file
const getImageUrls = (imgUrls: string[] | null | undefined) => {
  if (!imgUrls || imgUrls.length === 0) return [];
  return imgUrls;
};

// Image Modal Component
const ImageModal = ({ isOpen, onClose, imageUrl, orderCode }: { isOpen: boolean, onClose: () => void, imageUrl: string, orderCode: string }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-4xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
        >
          <X size={20} className="text-gray-600" />
        </button>
        <img
          src={imageUrl}
          alt={`Work Order ${orderCode}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://via.placeholder.com/400x300?text=Image+Not+Found';
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3 rounded-b-lg">
          <p className="text-center font-medium">Work Order {orderCode}</p>
        </div>
      </div>
    </div>
  );
};

const WorkOrdersList = () => {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentOrderCode, setCurrentOrderCode] = useState<string | null>(null);

  const navigate = useNavigate();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortableField>('detail_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Changed to desc for most recent first
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [costBreakdowns, setCostBreakdowns] = useState<
    Record<string, OrderCostBreakdown[]>
  >({});

  const fetchOrders = async () => {
    try {
      console.log('[WorkOrdersList] Fetching work orders with customer data');
      const { data, error } = await supabase
        .from('order_details')
        .select(
          `
          *,
          order:orders(
            *,
            measurements(*),
            customer:customers(
              id,
              name,
              company,
              phone_number,
              address
            )
          ),
          stages:order_stages(
            *,
            assignments:order_stage_assignments(*)
          )
        `
        )
        .order('updated_at', { ascending: false }); // Changed to show most recent first

      if (error) throw error;
      console.log('[WorkOrdersList] Fetched work orders:', data);
      setOrders(data || []);

      // Fetch cost breakdowns for each order
      if (data && data.length > 0) {
        const orderDetailIds = data.map((order) => order.detail_id);
        const { data: breakdownsData, error: breakdownsError } = await supabase
          .from('order_cost_breakdown')
          .select('*')
          .in('order_detail_id', orderDetailIds);

        if (breakdownsError) {
          console.error(
            '[WorkOrdersList] Error fetching cost breakdowns:',
            breakdownsError
          );
        } else if (breakdownsData) {
          // Group breakdowns by order_detail_id
          const breakdownsByOrderId = breakdownsData.reduce((acc, item) => {
            const detailId = item.order_detail_id.toString();
            if (!acc[detailId]) {
              acc[detailId] = [];
            }
            acc[detailId].push(item);
            return acc;
          }, {} as Record<string, OrderCostBreakdown[]>);

          setCostBreakdowns(breakdownsByOrderId);
        }
      }
    } catch (err) {
      console.error('[WorkOrdersList] Error fetching work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [sortField, sortDirection]);

  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for most recent first
    }
  };

  const openImageModal = (imageUrl: string, orderCode: string) => {
    setCurrentImage(imageUrl);
    setCurrentOrderCode(orderCode);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setCurrentImage(null);
    setCurrentOrderCode(null);
  };

  const getSortValue = (
    order: WorkOrder,
    field: SortableField
  ): string | number => {
    if (field === 'customer_name' || field === 'code') {
      return order.order?.[field] || '';
    }
    const value = order[field as keyof WorkOrder];
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    return '';
  };

  const handleEdit = (order: WorkOrder) => {
    // Add cost breakdowns to the order before editing
    const orderWithBreakdowns = {
      ...order,
      cost_breakdown: costBreakdowns[order.detail_id] || [],
    };
    setEditingOrder(orderWithBreakdowns);
  };

  const handleEditClose = () => {
    setEditingOrder(null);
  };

  const handleEditSave = () => {
    setEditingOrder(null);
    // Refresh the orders list
    fetchOrders();
  };

  const handleViewDetails = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  // NEW: Handle sending work order to schedule
  const handleSendToSchedule = (order: WorkOrder) => {
    // Navigate to scheduling page with the order ID as a URL parameter
    // The scheduling page will automatically select this order
    navigate(`/scheduling?orderId=${order.order?.id}`);
  };

  // Calculate scheduled stages count
  const getScheduledStagesInfo = (order: WorkOrder) => {
    if (!order.stages || order.stages.length === 0) {
      return { total: 0, scheduled: 0 };
    }

    const total = order.stages.length;
    const scheduled = order.stages.filter(
      (stage) => stage.status === 'scheduled'
    ).length;

    return { total, scheduled };
  };

  // Calculate profit margin
  const calculateProfitMargin = (price: number, cost: number) => {
    if (!price || !cost || cost === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  // Format date with time

  // Format date only
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Enhanced stage status color system
  const getStageStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get process stage color
  const getProcessStageColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get image URL from Supabase storage
  const getImageUrl = (imgUrl: string | null) => {
    if (!imgUrl) return null;

    // If it's already a full URL, return as is
    if (imgUrl.startsWith('http')) {
      return imgUrl;
    }

    // Otherwise, construct the Supabase storage URL
    const { data } = supabase.storage
      .from('word-order-img')
      .getPublicUrl(imgUrl);

    return data.publicUrl;
  };

  // Print work order function
  const handlePrintWorkOrder = (order: WorkOrder) => {
    const costBreakdownItems = costBreakdowns[order.detail_id] || [];
    const measurements = order.order?.measurements || [];

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Work Order ${order.order?.code} - Print</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px; 
              color: #333; 
              line-height: 1.4;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #2563eb; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .header h1 { 
              color: #2563eb; 
              margin: 0; 
              font-size: 24px; 
              font-weight: bold; 
            }
            .header p { 
              margin: 5px 0 0 0; 
              color: #666; 
              font-size: 14px; 
            }
            .section { 
              margin-bottom: 20px; 
              page-break-inside: avoid; 
            }
            .section-title { 
              font-size: 14px; 
              font-weight: bold; 
              color: #2563eb; 
              margin-bottom: 8px; 
              padding-bottom: 4px; 
              border-bottom: 1px solid #e5e7eb; 
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 10px; 
              margin-bottom: 10px; 
            }
            .info-item { 
              display: flex; 
              margin-bottom: 4px; 
            }
            .info-label { 
              font-weight: 600; 
              color: #555; 
              min-width: 120px; 
            }
            .info-value { 
              color: #333; 
            }
            .work-types { 
              display: flex; 
              flex-wrap: wrap; 
              gap: 6px; 
              margin-top: 5px; 
            }
            .work-type { 
              background: #dbeafe; 
              color: #1e40af; 
              padding: 3px 8px; 
              border-radius: 12px; 
              font-size: 11px; 
              font-weight: 500; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 8px; 
              font-size: 11px; 
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 6px 8px; 
              text-align: left; 
            }
            th { 
              background: #f9fafb; 
              font-weight: 600; 
              color: #374151; 
            }
            .summary-box { 
              background: #f0fdf4; 
              border: 1px solid #bbf7d0; 
              border-radius: 6px; 
              padding: 12px; 
              margin-top: 15px; 
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 4px; 
              font-size: 13px; 
            }
            .summary-label { 
              color: #166534; 
              font-weight: 500; 
            }
            .summary-value { 
              font-weight: bold; 
              color: #166534; 
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 15px; 
              border-top: 1px solid #e5e7eb; 
              text-align: center; 
              color: #666; 
              font-size: 10px; 
            }
            .status-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 500;
              background: #e5e7eb;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Work Order ${order.order?.code || order.order_id}</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Work Order Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Work Order ID:</span>
                <span class="info-value">${order.detail_id}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Order Code:</span>
                <span class="info-value">${order.order?.code || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Assigned To:</span>
                <span class="info-value">${order.assigned_to}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Due Date:</span>
                <span class="info-value">${formatDate(order.due_date)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Process Stage:</span>
                <span class="info-value status-badge">${
                  order.process_stage
                }</span>
              </div>
              <div class="info-item">
                <span class="info-label">Created:</span>
                <span class="info-value">${
                  order.order?.created_at
                    ? formatDate(order.order.created_at)
                    : 'N/A'
                }</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Customer Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Customer Name:</span>
                <span class="info-value">${
                  order.order?.customer_name || 'N/A'
                }</span>
              </div>
              <div class="info-item">
                <span class="info-label">Company:</span>
                <span class="info-value">${order.order?.company || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${
                  order.order?.customer?.phone_number || 'N/A'
                }</span>
              </div>
              <div class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value">${order.order?.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Work Types</div>
            <div class="work-types">
              ${(order.order?.work_types || [])
                .map((type) => `<span class="work-type">${type}</span>`)
                .join('')}
            </div>
          </div>

          ${
            measurements.length > 0
              ? `
          <div class="section">
            <div class="section-title">Measurements</div>
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${measurements
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.material_name}</td>
                    <td>${item.material_type}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>${item.price} EGP</td>
                    <td>${item.total_price} EGP</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          `
              : ''
          }

          ${
            costBreakdownItems.length > 0
              ? `
          <div class="section">
            <div class="section-title">Cost Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Cost per Unit</th>
                  <th>Total Cost</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${costBreakdownItems
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.type}</td>
                    <td>${item.quantity || '-'}</td>
                    <td>${item.unit || '-'}</td>
                    <td>${
                      item.cost_per_unit ? item.cost_per_unit + ' EGP' : '-'
                    }</td>
                    <td>${item.total_cost ? item.total_cost + ' EGP' : '-'}</td>
                    <td>${item.notes || '-'}</td>
                  </tr>
                `
                  )
                  .join('')}
                <tr style="background: #f9fafb; font-weight: bold;">
                  <td colspan="4" style="text-align: right;">Total Cost:</td>
                  <td>${costBreakdownItems.reduce(
                    (sum, item) => sum + (item.total_cost || 0),
                    0
                  )} EGP</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          `
              : ''
          }

          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Work Order Price:</span>
              <span class="summary-value">${order.price.toLocaleString()} EGP</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Cost:</span>
              <span class="summary-value">${order.total_cost.toLocaleString()} EGP</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Expected Profit:</span>
              <span class="summary-value">${(
                order.price - order.total_cost
              ).toLocaleString()} EGP</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Profit Margin:</span>
              <span class="summary-value">${calculateProfitMargin(
                order.price,
                order.total_cost
              ).toFixed(1)}%</span>
            </div>
          </div>

          ${
            order.notes
              ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <p>${order.notes}</p>
          </div>
          `
              : ''
          }

          <div class="footer">
            <p>This work order was generated automatically from the Marble & Granite CRM System</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredOrders = orders
    .filter(
      (order) =>
        order.order?.customer_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.order?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.assigned_to.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = getSortValue(a, sortField);
      const bValue = getSortValue(b, sortField);
      if (aValue === bValue) return 0;
      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-700 flex items-center gap-2">
            <Hammer className="text-green-600" /> Work Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track work orders (Most recent first)
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search
              className="absolute left-2 top-2.5 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-8 pr-3 py-2 rounded border border-gray-300 focus:ring-green-500 focus:border-green-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <ListFilter size={16} /> Filter
          </Button>
          <Button
            onClick={() => navigate('/orders/work/new')}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <PlusCircle size={16} />
            <span>New Work Order</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase cursor-pointer"
                  onClick={() => handleSort('order_id')}
                >
                  <div className="flex items-center gap-1">
                    Order Code <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase cursor-pointer"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center gap-1">
                    Customer <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase cursor-pointer"
                  onClick={() => handleSort('assigned_to')}
                >
                  <div className="flex items-center gap-1">
                    Assigned To <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase cursor-pointer"
                  onClick={() => handleSort('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Due Date <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase cursor-pointer"
                  onClick={() => handleSort('process_stage')}
                >
                  <div className="flex items-center gap-1">
                    Stage <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase">
                  <div className="flex items-center gap-1">Stages</div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase cursor-pointer"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    Price <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No work orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const stagesInfo = getScheduledStagesInfo(order);
                  const orderCostBreakdowns =
                    costBreakdowns[order.detail_id] || [];
                  const imageUrls = getImageUrls(order.img_urls || null);

                  return (
                    <React.Fragment key={order.detail_id}>
                      <tr
                        className="hover:bg-green-50 cursor-pointer"
                        onClick={() => handleViewDetails(order.detail_id)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="font-medium text-gray-900">
                              {order.order?.code || `#${order.order_id}`}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <User size={16} className="text-gray-400 mr-2" />
                            <span>{order.order?.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <User size={16} className="text-gray-400 mr-2" />
                            <span>{order.assigned_to}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <Calendar
                              size={16}
                              className="text-gray-400 mr-2"
                            />
                            <span>
                              {new Date(order.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getProcessStageColor(
                              order.process_stage
                            )}`}
                          >
                            {STAGE_STATUSES.find(
                              (s) => s.value === order.process_stage
                            )?.label || order.process_stage}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <CalendarClock
                              size={16}
                              className="text-blue-500 mr-2"
                            />
                            <span className="text-blue-600 font-medium">
                              {stagesInfo.scheduled}
                            </span>
                            <span className="text-gray-500 mx-1">of</span>
                            <span>{stagesInfo.total}</span>
                            <span className="text-gray-500 ml-1">
                              scheduled
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <BadgeDollarSign
                              size={16}
                              className="text-gray-400 mr-2"
                            />
                            <span>{order.price.toLocaleString()} EGP</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            {expandedOrderId === order.detail_id ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedOrderId === order.detail_id && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={8} className="bg-gray-50 p-6">
                              <div className="space-y-6">
                                {/* Customer Information */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <User size={16} />
                                      <span className="font-medium">
                                        Customer Name:
                                      </span>
                                    </div>
                                    <p className="text-gray-900">
                                      {order.order?.customer_name}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <Building2 size={16} />
                                      <span className="font-medium">
                                        Company:
                                      </span>
                                    </div>
                                    <p className="text-gray-900">
                                      {order.order?.company || 'N/A'}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <Phone size={16} />
                                      <span className="font-medium">
                                        Phone:
                                      </span>
                                    </div>
                                    <p className="text-gray-900">
                                      {order.order?.customer?.phone_number ||
                                        'N/A'}
                                    </p>
                                  </div>
                                  <div className="md:col-span-3 space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <MapPin size={16} />
                                      <span className="font-medium">
                                        Address:
                                      </span>
                                    </div>
                                    <p className="text-gray-900">
                                      {order.order?.address || 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                {/* Work Order Images */}
                                {imageUrls.length > 0 && (
                                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                      <ImageIcon size={20} className="mr-2 text-green-600" />
                                      Work Order Images
                                    </h4>
                                    <div className="flex flex-wrap gap-4">
                                      {imageUrls.map((url, idx) => (
                                        <div
                                          key={idx}
                                          className="relative cursor-pointer group overflow-hidden rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                                          onClick={e => {
                                            e.stopPropagation();
                                            openImageModal(url, order.order?.code || order.order_id);
                                          }}
                                        >
                                          <img
                                            src={url}
                                            alt={`Work Order ${order.order?.code} Image ${idx + 1}`}
                                            className="w-32 h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                                            onError={e => {
                                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x128?text=No+Image';
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Cost Breakdown */}
                                {orderCostBreakdowns.length > 0 && (
                                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                      <Calculator
                                        size={20}
                                        className="mr-2 text-green-600"
                                      />
                                      Cost Breakdown
                                    </h4>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                              Type
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                              Quantity
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                              Unit
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                              Cost Per Unit
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                              Total Cost
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                              Notes
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {orderCostBreakdowns.map(
                                            (item) => (
                                              <tr key={item.id}>
                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                  {item.type}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                  {item.quantity || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                  {item.unit || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                  {item.cost_per_unit
                                                    ? `${item.cost_per_unit.toLocaleString()} EGP`
                                                    : '-'}
                                                </td>
                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                  {item.total_cost
                                                    ? `${item.total_cost.toLocaleString()} EGP`
                                                    : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                  {item.notes || '-'}
                                                </td>
                                              </tr>
                                            )
                                          )}
                                          <tr className="bg-green-50 font-bold">
                                            <td
                                              colSpan={4}
                                              className="px-4 py-2 text-right font-medium text-green-800"
                                            >
                                              Total Cost:
                                            </td>
                                            <td className="px-4 py-2 font-bold text-green-800">
                                              {orderCostBreakdowns
                                                .reduce(
                                                  (sum, item) =>
                                                    sum +
                                                    (item.total_cost || 0),
                                                  0
                                                )
                                                .toLocaleString()}{' '}
                                              EGP
                                            </td>
                                            <td></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Measurements */}
                                {order.order?.measurements &&
                                  order.order.measurements.length > 0 && (
                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                        <Box
                                          size={20}
                                          className="mr-2 text-green-600"
                                        />
                                        Measurements
                                      </h4>
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Material
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Type
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Quantity
                                              </th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Unit
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {order.order.measurements.map(
                                              (item) => (
                                                <tr key={item.id}>
                                                  <td className="px-4 py-2 font-medium text-gray-900">
                                                    {item.material_name}
                                                  </td>
                                                  <td className="px-4 py-2 text-gray-700">
                                                    {item.material_type}
                                                  </td>
                                                  <td className="px-4 py-2 text-gray-700">
                                                    {item.quantity}
                                                  </td>
                                                  <td className="px-4 py-2 text-gray-700">
                                                    {item.unit}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                {/* Work Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <Box size={16} />
                                      <span className="font-medium">
                                        Work Types:
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {order.order?.work_types.map(
                                        (type, index) => (
                                          <span
                                            key={index}
                                            className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm"
                                          >
                                            {type}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <Clock size={16} />
                                      <span className="font-medium">
                                        Due Date:
                                      </span>
                                    </div>
                                    <p className="text-gray-900">
                                      {new Date(
                                        order.due_date
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-gray-600">
                                      <User size={16} />
                                      <span className="font-medium">
                                        Assigned To:
                                      </span>
                                    </div>
                                    <p className="text-gray-900">
                                      {order.assigned_to}
                                    </p>
                                  </div>
                                </div>

                                {/* Work Stages with Enhanced Colors */}
                                {order.stages && order.stages.length > 0 && (
                                  <div className="space-y-4">
                                    <h4 className="text-lg font-medium text-gray-900 flex items-center">
                                      <ClipboardList
                                        size={20}
                                        className="mr-2 text-green-600"
                                      />
                                      Work Stages
                                    </h4>
                                    <div className="flex flex-wrap justify-start space-x-4 overflow-x-auto py-2">
                                      {order.stages.map((stage, index) => {
                                        const statusInfo = STAGE_STATUSES.find(
                                          (s) => s.value === stage.status
                                        );
                                        const statusColor = getStageStatusColor(
                                          stage.status
                                        );
                                        const assignmentsCount =
                                          stage.assignments?.length || 0;
                                        const completedAssignments =
                                          stage.assignments?.filter(
                                            (a) => a.is_done
                                          ).length || 0;

                                        return (
                                          <div
                                            key={index}
                                            className="min-w-[220px] m-3 bg-white p-3 rounded-lg border border-gray-200 shadow flex-shrink-0"
                                          >
                                            <div className="flex items-center justify-between">
                                              <h5 className="text-sm font-medium text-gray-900">
                                                {stage.stage_name}
                                              </h5>
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}
                                              >
                                                {statusInfo?.label ||
                                                  stage.status}
                                              </span>
                                            </div>

                                            <div className="text-xs space-y-1">
                                              <p className="">
                                                <span className="font-semibold text-gray-500">
                                                  Start:
                                                </span>{' '}
                                                <span className="text-gray-900">
                                                  {formatDate(
                                                    stage.planned_start_date
                                                  )}
                                                </span>
                                              </p>
                                              <p>
                                                <span className="font-semibold text-gray-500">
                                                  Finish:
                                                </span>{' '}
                                                <span className="text-gray-900">
                                                  {formatDate(
                                                    stage.planned_finish_date
                                                  )}
                                                </span>
                                              </p>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between text-sm">
                                              <span className="text-gray-700">
                                                {completedAssignments}/
                                                {assignmentsCount}
                                              </span>
                                              {stage.status === 'completed' && (
                                                <CheckCircle2
                                                  size={16}
                                                  className="text-green-600"
                                                />
                                              )}
                                              {stage.status ===
                                                'in_progress' && (
                                                <AlertCircle
                                                  size={16}
                                                  className="text-yellow-600"
                                                />
                                              )}
                                              {stage.status === 'scheduled' && (
                                                <CalendarClock
                                                  size={16}
                                                  className="text-blue-600"
                                                />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Notes */}
                                {order.notes && (
                                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                                      Notes
                                    </h4>
                                    <p className="text-gray-700 whitespace-pre-line">
                                      {order.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end space-x-4">
                                  <Button
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintWorkOrder(order);
                                    }}
                                    className="flex items-center space-x-2"
                                  >
                                    <Printer size={16} />
                                    <span>Print Work Order</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(order);
                                    }}
                                    className="flex items-center space-x-2"
                                  >
                                    <Pencil size={16} />
                                    <span>Edit Order</span>
                                  </Button>
                                  {/* NEW: Send to Schedule Button in expanded view */}
                                  <Button
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendToSchedule(order);
                                    }}
                                    className="flex items-center space-x-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                  >
                                    <Calendar size={16} />
                                    <span>Send to Schedule</span>
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add the dialog */}
      {editingOrder && (
        <EditWorkOrderDialog
          workOrder={editingOrder as WorkOrderDetail}
          onClose={handleEditClose}
          onSave={handleEditSave}
        />
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalOpen}
        onClose={closeImageModal}
        imageUrl={currentImage || ''}
        orderCode={currentOrderCode || ''}
      />
    </div>
  );
};

export default WorkOrdersList;