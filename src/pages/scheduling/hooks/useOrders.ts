import { useState, useEffect } from 'react';
import { Order } from '../types';
import { getAllOrders } from '../schedulingService';
import { DEBUG } from '../constants';

function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        if (DEBUG.LOG_API_CALLS) {
          console.log('[useOrders] Fetching all orders');
        }
        
        const fetchedOrders = await getAllOrders();
        
        if (DEBUG.LOG_API_CALLS) {
          console.log(`[useOrders] Fetched ${fetchedOrders.length} orders`);
        }
        
        if (DEBUG.VERBOSE) {
          console.log('[useOrders] First order details:', fetchedOrders[0]);
        }
        
        setOrders(fetchedOrders);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch orders');
        console.error('[useOrders] Error fetching orders:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    error,
  };
}

export default useOrders;