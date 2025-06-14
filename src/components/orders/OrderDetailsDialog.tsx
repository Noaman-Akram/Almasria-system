import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../components/ui/dialog';
import { supabase } from '../../lib/supabase';

interface Order {
  id: number;
  code: string;
  order_status?: string;
  order_price?: number;
  address: string;
  company?: string;
  sales_person?: string;
  created_at?: string;
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

interface OrderDetailsDialogProps {
  orderId: number | null;
  open: boolean;
  onClose: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  orderId,
  open,
  onClose,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      const fetchAll = async () => {
        setLoading(true);
        try {
          const [
            { data: orderData },
            { data: detailsData },
            { data: measurementsData },
            { data: transactionsData },
          ] = await Promise.all([
            supabase.from('orders').select('*').eq('id', orderId).single(),
            supabase.from('order_details').select('*').eq('order_id', orderId),
            supabase.from('measurements').select('*').eq('order_id', orderId),
            supabase.from('transactions').select('*').eq('order_id', orderId),
          ]);
          setOrder(orderData || null);
          setOrderDetails(detailsData || []);
          setMeasurements(measurementsData || []);
          setTransactions(transactionsData || []);
        } finally {
          setLoading(false);
        }
      };
      fetchAll();
    } else {
      setOrder(null);
      setOrderDetails([]);
      setMeasurements([]);
      setTransactions([]);
    }
  }, [open, orderId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-4">
              Loading order details...
            </div>
          ) : !order ? (
            <div className="text-center text-gray-500 py-4">
              No order data found.
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Order Info</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">Code:</span> {order.code}
                  </p>
                  <p>
                    <span className="text-gray-600">Status:</span>{' '}
                    {order.order_status}
                  </p>
                  <p>
                    <span className="text-gray-600">Total Price:</span>{' '}
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
                    <span className="text-gray-600">Sales Person:</span>{' '}
                    {order.sales_person}
                  </p>
                  <p>
                    <span className="text-gray-600">Created At:</span>{' '}
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString()
                      : ''}
                  </p>
                </div>
              </div>
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
                      {orderDetails.map((detail) => (
                        <tr key={detail.detail_id}>
                          <td className="px-2 py-1">{detail.detail_id}</td>
                          <td className="px-2 py-1">{detail.assigned_to}</td>
                          <td className="px-2 py-1">
                            {detail.due_date
                              ? new Date(detail.due_date).toLocaleDateString()
                              : ''}
                          </td>
                          <td className="px-2 py-1">
                            {detail.price?.toLocaleString()} EGP
                          </td>
                          <td className="px-2 py-1">
                            {detail.total_cost?.toLocaleString()} EGP
                          </td>
                          <td className="px-2 py-1">{detail.process_stage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Measurements</h4>
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
                      {measurements.map((m) => (
                        <tr key={m.id}>
                          <td className="px-2 py-1">{m.material_name}</td>
                          <td className="px-2 py-1">{m.material_type}</td>
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
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Transactions</h4>
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
                      {transactions.map((t) => (
                        <tr key={t.transaction_id}>
                          <td className="px-2 py-1">{t.transaction_id}</td>
                          <td className="px-2 py-1">
                            {t.amount?.toLocaleString()} EGP
                          </td>
                          <td className="px-2 py-1">{t.method}</td>
                          <td className="px-2 py-1">
                            {t.created_at
                              ? new Date(t.created_at).toLocaleDateString()
                              : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
