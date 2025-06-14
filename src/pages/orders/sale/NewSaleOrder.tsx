import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Calendar, ArrowLeft } from 'lucide-react';
import Button from '../../../components/ui/Button';
import NewOrder from '../NewOrder';
import { WORK_TYPES } from '../../../lib/constants';
import { supabase } from '../../../lib/supabase';

const NewSaleOrder: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const [nextOrderId, setNextOrderId] = useState<number | null>(null);

  useEffect(() => {
    const fetchNextOrderId = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          setNextOrderId(data[0].id + 1);
        } else {
          setNextOrderId(1);
        }
      } catch (err) {}
    };
    fetchNextOrderId();
  }, []);

  const generateOrderCode = (types: string[]) => {
    if (types.length === 0) return '---';
    const codes = types
      .map((type) => {
        const workType = WORK_TYPES.find((wt) => wt.value === type);
        return workType ? workType.code : '';
      })
      .sort()
      .join('');
    return `${codes}-${nextOrderId}`; // ??? will be replaced with actual order ID after creation
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate('/orders/sale')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Orders</span>
        </Button>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-500">
            <Calendar size={16} />
            <span>{currentDate}</span>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-md">
            <span className="text-sm text-gray-500">Order Code:</span>
            <span className="ml-2 font-mono font-bold text-blue-600">
              {generateOrderCode(selectedTypes)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Store className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">New Sale Order</h1>
      </div>

      <NewOrder onWorkTypesChange={setSelectedTypes} />
    </div>
  );
};

export default NewSaleOrder;
