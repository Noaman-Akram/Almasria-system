import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, User } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import { Customer } from '../../types';
import { CustomerService } from '../../services/CustomerService';
import CustomerOrdersDialog from '../../components/customers/CustomerOrdersDialog';
import OrdersList from '../../components/orders/OrdersList';
import OrderDetailsDialog from '../../components/orders/OrderDetailsDialog';

const CustomersList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<
    string | number | null
  >(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const service = new CustomerService();
    service
      .getAll()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      header: 'Name',
      accessor: (customer: Customer) => (
        <div className="flex items-center">
          <div className="bg-gray-100 p-2 rounded-full text-gray-600 mr-3">
            <User size={18} />
          </div>
          <div>
            <div className="font-medium text-gray-900">{customer.name}</div>
            <div className="text-gray-500 text-xs">{customer.company}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: (customer: Customer) => (
        <div>
          <div className="text-gray-900">{customer.phone_number}</div>
          <div className="text-gray-500 text-xs truncate max-w-xs">
            {customer.address}
          </div>
        </div>
      ),
    },
    {
      header: 'Paid',
      accessor: (customer: Customer) => (
        <div className="font-medium text-gray-900">
          ${customer.paid_total.toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Outstanding',
      accessor: (customer: Customer) => (
        <div
          className={`font-medium ${
            customer.to_be_paid > 0 ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          ${customer.to_be_paid.toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Created',
      accessor: (customer: Customer) =>
        new Date(customer.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your customer database
          </p>
        </div>
      </div>
      <Card>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => {
              const expanded = expandedCustomerId === customer.id;
              return expanded ? (
                <tr key={customer.id}>
                  <td colSpan={columns.length} className="p-0 border-none">
                    <div className="bg-gray-50 border border-gray-300 rounded-2xl p-0 overflow-hidden">
                      <div
                        className="flex items-center cursor-pointer px-6 py-4 gap-6"
                        onClick={() => setExpandedCustomerId(null)}
                      >
                        <div className="bg-gray-100 p-2 rounded-full text-gray-600 mr-3">
                          <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {customer.name}
                          </div>
                          <div className="text-gray-500 text-xs truncate">
                            {customer.company}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 truncate">
                            {customer.phone_number}
                          </div>
                          <div className="text-gray-500 text-xs truncate max-w-xs">
                            {customer.address}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {customer.paid_total?.toLocaleString() || 0} EGP
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium ${
                              customer.to_be_paid && customer.to_be_paid > 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {customer.to_be_paid?.toLocaleString() || 0} EGP
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-500 text-xs">
                            {customer.created_at
                              ? new Date(
                                  customer.created_at
                                ).toLocaleDateString()
                              : ''}
                          </div>
                        </div>
                      </div>
                      <div className="pl-12 pr-6 pb-4">
                        <OrdersList
                          customerId={customer.id}
                          onOrderClick={(order) => {
                            setSelectedOrderId(order.id);
                            setOrderDialogOpen(true);
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  key={customer.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedCustomerId(customer.id)}
                >
                  {columns.map((column, idx) => (
                    <td
                      key={idx}
                      className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {typeof column.accessor === 'function'
                        ? column.accessor(customer)
                        : (customer[column.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
      />
    </div>
  );
};

export default CustomersList;
