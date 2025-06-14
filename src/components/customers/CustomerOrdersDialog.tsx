import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../components/ui/dialog';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  address?: string | null;
  phone_number: string;
  company?: string | null;
  paid_total?: number | null;
  to_be_paid?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Order {
  id: number;
  code: string;
  customer_id?: number;
  customer_name?: string;
  address: string;
  order_status?: string;
  order_price?: number;
  work_types?: string[];
  created_by?: string;
  company?: string;
  created_at?: string;
  updated_at?: string;
  sales_person?: string;
}

interface OrderDetail {
  detail_id: number;
  order_id?: number;
  assigned_to?: string;
  updated_date?: string;
  due_date?: string;
  price?: number;
  total_cost?: number;
  notes?: string;
  img_url?: string;
  process_stage?: string;
  updated_at?: string;
}

interface Measurement {
  id: number;
  order_id?: number;
  material_name?: string;
  material_type?: string;
  unit?: string;
  quantity?: number; // Now float8/double
  price?: number; // Renamed from cost, now float8/double
  total_price?: number; // Renamed from total_cost, now float8/double
}

interface Transaction {
  transaction_id: number;
  order_id?: number;
  amount: number;
  method: string;
  img_url?: string;
  created_at?: string;
}

interface CustomerOrdersDialogProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}

const CustomerOrdersDialog: React.FC<CustomerOrdersDialogProps> = ({
  open,
  onClose,
  customer,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<
    Record<number, OrderDetail[]>
  >({});
  const [measurements, setMeasurements] = useState<
    Record<number, Measurement[]>
  >({});
  const [transactions, setTransactions] = useState<
    Record<number, Transaction[]>
  >({});

  useEffect(() => {
    if (open && customer) {
      const fetchOrders = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });
          if (!error && data) {
            setOrders(data);
          }
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    } else {
      setOrders([]);
      setExpandedOrder(null);
      setOrderDetails({});
      setMeasurements({});
      setTransactions({});
    }
  }, [open, customer]);

  useEffect(() => {
    if (expandedOrder) {
      supabase
        .from('order_details')
        .select('*')
        .eq('order_id', expandedOrder)
        .then(({ data, error }) => {
          if (!error && data) {
            setOrderDetails((prev) => ({ ...prev, [expandedOrder]: data }));
          }
        });
      supabase
        .from('measurements')
        .select('*')
        .eq('order_id', expandedOrder)
        .then(({ data, error }) => {
          if (!error && data) {
            setMeasurements((prev) => ({ ...prev, [expandedOrder]: data }));
          }
        });
      supabase
        .from('transactions')
        .select('*')
        .eq('order_id', expandedOrder)
        .then(({ data, error }) => {
          if (!error && data) {
            setTransactions((prev) => ({ ...prev, [expandedOrder]: data }));
          }
        });
    }
  }, [expandedOrder]);

  const toggleOrder = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>
            {customer ? `Orders for ${customer.name}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-4">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No orders for this customer.
            </div>
          ) : (
            orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              return (
                <div
                  key={order.id}
                  className="border rounded-lg bg-white shadow-sm overflow-hidden"
                >
                  <div
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                      isExpanded ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => toggleOrder(order.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-base font-medium text-gray-900">
                          {order.code}
                        </span>
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          {order.order_status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString()
                          : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {order.order_price?.toLocaleString()} EGP
                      </div>
                    </div>
                    <div className="flex items-center ml-4">
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      maxHeight: isExpanded ? 600 : 0,
                      overflow: 'hidden',
                      transition:
                        'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {isExpanded && (
                      <div className="border-t px-4 py-3 space-y-4">
                        {/* Order Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Order Details
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="text-gray-600">Status:</span>{' '}
                              {order.order_status}
                            </p>
                            <p>
                              <span className="text-gray-600">
                                Total Price:
                              </span>{' '}
                              {order.order_price?.toLocaleString()} EGP
                            </p>
                            <p>
                              <span className="text-gray-600">Address:</span>{' '}
                              {order.address}
                            </p>
                            <p>
                              <span className="text-gray-600">Company:</span>{' '}
                              {order.company}
                            </p>
                            <p>
                              <span className="text-gray-600">
                                Sales Person:
                              </span>{' '}
                              {order.sales_person}
                            </p>
                          </div>
                        </div>
                        {/* Order Details Table */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Order Details Table
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Detail ID
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Assigned To
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Due Date
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Price
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Total Cost
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Stage
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {(orderDetails[order.id] || []).map(
                                  (detail) => (
                                    <tr key={detail.detail_id}>
                                      <td className="px-2 py-1">
                                        {detail.detail_id}
                                      </td>
                                      <td className="px-2 py-1">
                                        {detail.assigned_to}
                                      </td>
                                      <td className="px-2 py-1">
                                        {detail.due_date
                                          ? new Date(
                                              detail.due_date
                                            ).toLocaleDateString()
                                          : ''}
                                      </td>
                                      <td className="px-2 py-1">
                                        {detail.price?.toLocaleString()} EGP
                                      </td>
                                      <td className="px-2 py-1">
                                        {detail.total_cost?.toLocaleString()}{' '}
                                        EGP
                                      </td>
                                      <td className="px-2 py-1">
                                        {detail.process_stage}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* Measurements Table */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Measurements
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Material
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Type
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Quantity
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Unit
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Price
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {(measurements[order.id] || []).map((m) => (
                                  <tr key={m.id}>
                                    <td className="px-2 py-1">
                                      {m.material_name}
                                    </td>
                                    <td className="px-2 py-1">
                                      {m.material_type}
                                    </td>
                                    <td className="px-2 py-1">{m.quantity}</td>
                                    <td className="px-2 py-1">{m.unit}</td>
                                    <td className="px-2 py-1">
                                      {m.price?.toLocaleString()} EGP
                                    </td>
                                    <td className="px-2 py-1">
                                      {m.total_price?.toLocaleString()} EGP
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* Transactions Table */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Transactions
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    ID
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Amount
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Method
                                  </th>
                                  <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">
                                    Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {(transactions[order.id] || []).map((t) => (
                                  <tr key={t.transaction_id}>
                                    <td className="px-2 py-1">
                                      {t.transaction_id}
                                    </td>
                                    <td className="px-2 py-1">
                                      {t.amount?.toLocaleString()} EGP
                                    </td>
                                    <td className="px-2 py-1">{t.method}</td>
                                    <td className="px-2 py-1">
                                      {t.created_at
                                        ? new Date(
                                            t.created_at
                                          ).toLocaleDateString()
                                        : ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerOrdersDialog;
