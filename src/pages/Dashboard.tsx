import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Hammer,
  Calendar,
  ClipboardList,
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Activity,
  RefreshCw,
} from 'lucide-react';
import Card from '../components/ui/Card';
import StatsCard from '../components/ui/StatsCard';
import { supabase } from '../lib/supabase';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement,
  ChartDataLabels
);

interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  totalWorkOrders: number;
  averageOrderValue: number;
  customerGrowth: number;
  revenueGrowth: number;
}

interface OrderStatusData {
  status: string;
  count: number;
  percentage: number;
}

interface OrderTypeData {
  type: string;
  count: number;
  percentage: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

const Dashboard: React.FC = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalWorkOrders: 0,
    averageOrderValue: 0,
    customerGrowth: 0,
    revenueGrowth: 0,
  });

  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [orderTypeData, setOrderTypeData] = useState<OrderTypeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch basic data
      const [{ data: customers }, { data: orders }, { data: workOrders }] =
        await Promise.all([
          supabase.from('customers').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('order_details').select('*'),
        ]);

      // Calculate basic stats
      const totalCustomers = customers?.length || 0;
      const totalOrders = orders?.length || 0;
      const totalWorkOrders = workOrders?.length || 0;
      const totalRevenue =
        orders?.reduce((sum, order) => sum + (order.order_price || 0), 0) || 0;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Order status breakdown
      const statusCounts =
        orders?.reduce((acc, order) => {
          acc[order.order_status] = (acc[order.order_status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      const orderStatusData = Object.entries(statusCounts).map(
        ([status, count]) => ({
          status,
          count: count as number,
          percentage: ((count as number) / totalOrders) * 100,
        })
      );

      // Order type breakdown (sale vs work)
      const typeCounts =
        orders?.reduce((acc, order) => {
          const type =
            order.order_status === 'sale'
              ? 'Sale Orders'
              : order.order_status === 'working'
              ? 'Work Orders'
              : 'Other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      const orderTypeData = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count: count as number,
        percentage: ((count as number) / totalOrders) * 100,
      }));

      // Monthly data for the last 6 months
      const monthlyStats = generateMonthlyData(orders || [], customers || []);

      // Calculate growth rates
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      const currentMonthRevenue =
        orders
          ?.filter(
            (order) => new Date(order.created_at).getMonth() === currentMonth
          )
          .reduce((sum, order) => sum + (order.order_price || 0), 0) || 0;

      const lastMonthRevenue =
        orders
          ?.filter(
            (order) => new Date(order.created_at).getMonth() === lastMonth
          )
          .reduce((sum, order) => sum + (order.order_price || 0), 0) || 0;

      const revenueGrowth =
        lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      const currentMonthCustomers =
        customers?.filter(
          (customer) =>
            new Date(customer.created_at).getMonth() === currentMonth
        ).length || 0;

      const lastMonthCustomers =
        customers?.filter(
          (customer) => new Date(customer.created_at).getMonth() === lastMonth
        ).length || 0;

      const customerGrowth =
        lastMonthCustomers > 0
          ? ((currentMonthCustomers - lastMonthCustomers) /
              lastMonthCustomers) *
            100
          : 0;

      setStats({
        totalCustomers,
        totalOrders,
        totalRevenue,
        totalWorkOrders,
        averageOrderValue,
        customerGrowth,
        revenueGrowth,
      });

      setOrderStatusData(orderStatusData);
      setOrderTypeData(orderTypeData);
      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (
    orders: any[],
    _customers: any[]
  ): MonthlyData[] => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      const monthOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return (
          orderDate.getMonth() === date.getMonth() &&
          orderDate.getFullYear() === date.getFullYear()
        );
      });

      months.push({
        month: monthName,
        revenue: monthOrders.reduce(
          (sum, order) => sum + (order.order_price || 0),
          0
        ),
        orders: monthOrders.length,
      });
    }

    return months;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    // Only fetch data for admin users
    if (userRole === 'admin') {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  // Non-Admin Dashboard - Simple Quick Links
  if (userRole !== 'admin') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
              <LayoutDashboard size={28} />
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome! Access your available features below
            </p>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sale Orders - Available for sales and admin */}
          {(userRole === 'sales' || userRole === 'admin') && (
            <>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/orders/sale')}>
                <div className="p-6 text-center">
                  <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Sale Orders</h3>
                  <p className="text-gray-600 mb-4">View and manage sale orders</p>
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                    Click to Access
                  </div>
                </div>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/orders/sale/new')}>
                <div className="p-6 text-center">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ClipboardList size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">New Sale Order</h3>
                  <p className="text-gray-600 mb-4">Create a new sale order</p>
                  <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                    Click to Create
                  </div>
                </div>
              </Card>

              {/* Convert to Work Order - Available for sales users */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/orders/work/new')}>
                <div className="p-6 text-center">
                  <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Hammer size={32} className="text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Work Order</h3>
                  <p className="text-gray-600 mb-4">Convert sale orders to work orders</p>
                  <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium">
                    Click to Create
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Work Orders - Available for internal and admin only (NOT sales) */}
          {(userRole === 'internal' || userRole === 'admin') && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/orders/work')}>
              <div className="p-6 text-center">
                <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Hammer size={32} className="text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Work Orders</h3>
                <p className="text-gray-600 mb-4">View and manage work orders</p>
                <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium">
                  Click to Access
                </div>
              </div>
            </Card>
          )}

          {/* Scheduling - Available for all roles */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/scheduling')}>
            <div className="p-6 text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Scheduling</h3>
              <p className="text-gray-600 mb-4">View and manage schedules</p>
              <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium">
                Click to Access
              </div>
            </div>
          </Card>

          {/* User Role Info */}
          <Card className="hover:shadow-lg transition-shadow">
            <div className="p-6 text-center">
              <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Activity size={32} className="text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Role</h3>
              <p className="text-gray-600 mb-4 capitalize">{userRole || 'User'}</p>
              <div className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                {userRole === 'admin' ? 'Full Access' : userRole === 'sales' ? 'Sales Access + Work Order Creation' : 'Limited Access'}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Tips */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Tips</h3>
            <div className="space-y-3 text-sm text-gray-600">
              {(userRole === 'sales' || userRole === 'admin') && (
                <>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p>Use <strong>Sale Orders</strong> to view all your existing orders and their status</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p>Create <strong>New Sale Orders</strong> for customers with detailed measurements</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <p>Convert sale orders to <strong>Work Orders</strong> when ready for production</p>
                  </div>
                </>
              )}
              {(userRole === 'internal' || userRole === 'admin') && (
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <p>Manage <strong>Work Orders</strong> to track production progress</p>
                </div>
              )}
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <p>Check <strong>Scheduling</strong> to see work assignments and timelines</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Admin Dashboard - Full analytics (existing code)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">
            Loading Dashboard...
          </h2>
          <p className="text-gray-500 mt-2">Fetching your business insights</p>
        </div>
      </div>
    );
  }

  // Chart configurations
  const orderStatusChartData = {
    labels: orderStatusData.map((item) =>
      item.status.replace('_', ' ').toUpperCase()
    ),
    datasets: [
      {
        data: orderStatusData.map((item) => item.count),
        backgroundColor: [
          '#3B82F6', // blue
          '#10B981', // green
          '#F59E0B', // amber
          '#EF4444', // red
          '#8B5CF6', // purple
        ],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const orderTypeChartData = {
    labels: orderTypeData.map((item) => item.type),
    datasets: [
      {
        data: orderTypeData.map((item) => item.count),
        backgroundColor: [
          '#10B981', // green for sale orders
          '#3B82F6', // blue for work orders
          '#F59E0B', // amber for other
        ],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const revenueChartData = {
    labels: monthlyData.map((item) => item.month),
    datasets: [
      {
        label: 'Revenue (EGP)',
        data: monthlyData.map((item) => item.revenue),
        fill: true,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const ordersChartData = {
    labels: monthlyData.map((item) => item.month),
    datasets: [
      {
        label: 'Orders',
        data: monthlyData.map((item) => item.orders),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10B981',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      datalabels: {
        color: '#ffffff',
        font: {
          weight: 'bold' as const,
          size: 12,
        },
        formatter: (value: number, context: any) => {
          const total = context.chart.data.datasets[0].data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const percent = ((value / total) * 100).toFixed(1);
          return `${percent}%`;
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    cutout: '60%',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <LayoutDashboard size={28} />
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Overview of your business performance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString()} EGP`}
          icon={<DollarSign size={24} />}
          change={{
            value: stats.revenueGrowth,
            positive: stats.revenueGrowth >= 0,
          }}
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          icon={<ClipboardList size={24} />}
          change={{
            value: 12.5,
            positive: true,
          }}
        />
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers.toString()}
          icon={<Users size={24} />}
          change={{
            value: stats.customerGrowth,
            positive: stats.customerGrowth >= 0,
          }}
        />
        <StatsCard
          title="Average Order Value"
          value={`${stats.averageOrderValue.toLocaleString()} EGP`}
          icon={<Target size={24} />}
          change={{
            value: 8.2,
            positive: true,
          }}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card title="Orders by Status">
          <div className="h-80">
            <Doughnut
              data={orderStatusChartData}
              options={doughnutOptions as any}
              plugins={[ChartDataLabels]}
            />
          </div>
        </Card>

        {/* Orders by Type */}
        <Card title="Orders by Type">
          <div className="h-80">
            <Doughnut
              data={orderTypeChartData}
              options={doughnutOptions as any}
              plugins={[ChartDataLabels]}
            />
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Over Time */}
        <Card title="Orders Over Time">
          <div className="h-80">
            <Line data={revenueChartData} options={chartOptions as any} />
          </div>
        </Card>

        {/* Average Order Value */}
        <Card title="Monthly Orders">
          <div className="h-80">
            <Bar data={ordersChartData} options={chartOptions as any} />
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Quick Stats">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Work Orders</span>
              <span className="font-bold text-gray-800">
                {stats.totalWorkOrders}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">This Month Revenue</span>
              <span className="font-bold text-blue-600">
                {monthlyData[
                  monthlyData.length - 1
                ]?.revenue.toLocaleString() || 0}{' '}
                EGP
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Revenue Growth</span>
              <span
                className={`font-bold ${
                  stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stats.revenueGrowth >= 0 ? '↑' : '↓'}{' '}
                {Math.abs(stats.revenueGrowth).toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>

        <Card title="Business Insights">
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" />
              Revenue is {stats.revenueGrowth >= 0 ? 'up' : 'down'}{' '}
              {Math.abs(stats.revenueGrowth).toFixed(1)}% this month
            </p>
            <p className="flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              {stats.customerGrowth >= 0 ? 'Growing' : 'Declining'} customer
              base
            </p>
            <p className="flex items-center gap-2">
              <Target size={16} className="text-purple-500" />
              Average order value: {stats.averageOrderValue.toLocaleString()}{' '}
              EGP
            </p>
          </div>
        </Card>

        <Card title="System Status">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Database</span>
              <span className="flex items-center text-green-600">
                <Activity size={16} className="mr-1" />
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Updated</span>
              <span className="text-gray-800">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Data Sync</span>
              <span className="flex items-center text-green-600">
                <Clock size={16} className="mr-1" />
                Real-time
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;