import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, User, BadgeDollarSign, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import DataTable from '../../../components/ui/DataTable';
import StatusBadge from '../../../components/ui/StatusBadge';
import { useAuth } from '../../../contexts/AuthContext';

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
  sales_person?: string;
  discount?: number;
}

const SaleOrdersList: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_status', 'sale')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching sale orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWorkTypes = (workTypes: string[] | string) => {
    if (Array.isArray(workTypes)) {
      return workTypes.join(', ');
    }
    if (typeof workTypes === 'string') {
      return workTypes;
    }
    return 'N/A';
  };

  const handleConvertToWorkOrder = (orderId: number) => {
    navigate(`/orders/work/new/${orderId}`);
  };

  const columns = [
    {
      header: 'Order',
      accessor: (order: SaleOrder) => (
        <div className="flex items-center space-x-3">
          <Tag className="text-blue-600" size={20} />
          <div>
            <div className="font-mono font-medium text-gray-900">{order.code}</div>
            <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: (order: SaleOrder) => (
        <div className="flex items-center space-x-2">
          <User size={16} className="text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{order.customer_name}</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">{order.address}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Work Types',
      accessor: (order: SaleOrder) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(order.work_types) ? order.work_types : 
            (typeof order.work_types === 'string' ? order.work_types.split(',') : [])).map((type: string, idx: number) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
            >
              {type.trim()}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: (order: SaleOrder) => (
        <div className="flex items-center space-x-2">
          <BadgeDollarSign size={16} className="text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{order.order_price.toLocaleString()} EGP</div>
            {order.discount && order.discount > 0 && (
              <div className="text-xs text-red-500">-{order.discount.toLocaleString()} EGP discount</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Sales Person',
      accessor: (order: SaleOrder) => (
        <div className="text-sm text-gray-600">
          {order.sales_person || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (order: SaleOrder) => <StatusBadge status={order.order_status} />,
    },
    {
      header: 'Actions',
      accessor: (order: SaleOrder) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
            className="flex items-center space-x-1"
          >
            <Eye size={14} />
            <span>View</span>
          </Button>
          {userRole === 'admin' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleConvertToWorkOrder(order.id)}
              className="flex items-center space-x-1"
            >
              <Plus size={14} />
              <span>Convert</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sale Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track your sale orders
          </p>
        </div>
        {(userRole === 'admin' || userRole === 'sales') && (
          <Button
            onClick={() => navigate('/orders/sale/new')}
            className="flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Sale Order</span>
          </Button>
        )}
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search orders..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-gray-400" />
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="sale">Sale</option>
                <option value="converted">Converted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <DataTable
            data={filteredOrders}
            columns={columns}
            keyExtractor={(order) => order.id}
            expandableRow={(order) => (
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Company:</span> {order.company || 'N/A'}</div>
                      <div><span className="font-medium">Work Types:</span> {formatWorkTypes(order.work_types)}</div>
                      <div><span className="font-medium">Created:</span> {formatDate(order.created_at)}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Name:</span> {order.customer_name}</div>
                      <div><span className="font-medium">Address:</span> {order.address}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            expandedRowKey={expandedOrderId}
          />
        </div>
      </Card>
    </div>
  );
};

export default SaleOrdersList;
