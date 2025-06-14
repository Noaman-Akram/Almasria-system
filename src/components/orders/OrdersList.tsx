import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Order {
  id: number;
  code: string;
  order_status?: string;
  order_price?: number;
  created_at?: string;
  company?: string;
  sales_person?: string;
}

interface OrdersListProps {
  customerId: number | string;
  onOrderClick: (order: Order) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ customerId, onOrderClick }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 40;

  const fetchOrders = async (pageNum = 0) => {
    setLoading(true);
    try {
      const offset = pageNum * LIMIT;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + LIMIT - 1);
      if (!error && data) {
        setOrders((prev) => pageNum === 0 ? data : [...prev, ...data]);
        setHasMore(data.length === LIMIT);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrders([]);
    setPage(0);
    setHasMore(true);
    fetchOrders(0);
    // eslint-disable-next-line
  }, [customerId]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage);
  };

  if (loading && orders.length === 0) return <div className="text-center text-gray-500 py-2">Loading orders...</div>;
  if (!loading && orders.length === 0) return <div className="text-center text-gray-500 py-2">No orders for this customer.</div>;

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="border rounded bg-white shadow-sm p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
          onClick={() => onOrderClick(order)}
        >
          <div>
            <div className="font-mono text-base font-medium text-gray-900">{order.code}</div>
            <div className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</div>
          </div>
          <div className="flex flex-col items-end">
            <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs mb-1">{order.order_status}</span>
            <span className="font-medium text-gray-900">{order.order_price?.toLocaleString()} EGP</span>
          </div>
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
  );
};

export default OrdersList; 