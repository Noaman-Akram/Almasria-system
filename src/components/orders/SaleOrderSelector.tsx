import React, { useState, useMemo } from 'react';
import { Search, Calendar, User, BadgeDollarSign, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../ui/StatusBadge';

interface SaleOrder {
  id: number;
  code: string;
  customer_name: string;
  address: string;
  order_status: string;
  order_price: number;
  work_types: string[] | string;
  company: string;
  created_at: string;
  measurements: any[];
}

interface SaleOrderSelectorProps {
  onSelect: (order: SaleOrder | null) => void;
  onClear?: () => void;
}

const SaleOrderSelector: React.FC<SaleOrderSelectorProps> = ({ onSelect, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
  const [hasFetchedOrders, setHasFetchedOrders] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 40;

  const fetchOrders = async (pageNum = 0) => {
    setLoading(true);
    try {
      const offset = pageNum * LIMIT;
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          measurements (*)
        `)
        .eq('order_status', 'sale')
        .order('created_at', { ascending: false })
        .range(offset, offset + LIMIT - 1);
      if (orderError) throw orderError;
      setOrders((prev) => pageNum === 0 ? (orderData || []) : [...prev, ...(orderData || [])]);
      setHasFetchedOrders(true);
      setHasMore((orderData?.length || 0) === LIMIT);
    } catch (err) {
      console.error('[SaleOrderSelector] Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen && !hasFetchedOrders) {
      fetchOrders(0); // Fetch first page when opening the selector
    }
    setIsOpen(!isOpen);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => 
      order.code.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (order.address || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [orders, search]);

  const handleSelect = (order: SaleOrder) => {
    setSelectedOrder(order);
    onSelect(order);
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative">
      <div 
        className="w-full border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleToggle}
      >
        {selectedOrder ? (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Tag className="text-green-600" size={20} />
                <div>
                  <div className="font-medium text-gray-900">{selectedOrder.code}</div>
                  <div className="text-sm text-gray-500">{selectedOrder.customer_name}</div>
                </div>
              </div>
              <StatusBadge status={selectedOrder.order_status} />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(null);
                onSelect(null);
                if (onClear) {
                  onClear();
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1 border-t border-gray-200 pt-2 mt-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Cancel Selection</span>
            </button>
          </div>
        ) : (
          <div className="text-gray-500">Select a sale order to convert</div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}>
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-25" />
          <div 
            className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No orders found
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Tag className="text-green-600" size={20} />
                        <div className="font-mono font-medium text-gray-900">{order.code}</div>
                        <StatusBadge status={order.order_status} />
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar size={16} />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-900">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BadgeDollarSign size={16} className="text-gray-400" />
                        <span className="text-gray-900">{order.order_price} EGP</span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-500 truncate">
                      {order.address}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {(Array.isArray(order.work_types) ? order.work_types : 
                        (typeof order.work_types === 'string' ? order.work_types.split(',') : [])).map((type: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                        >
                          {type}
                        </span>
                      ))}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleOrderSelector;