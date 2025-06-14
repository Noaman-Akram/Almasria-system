import React from 'react';
import { Calculator, Scissors, Wrench, Truck, Settings } from 'lucide-react';

interface CostBreakdown {
  cutting_cost?: number | null;
  cutting_cpm?: number | null;
  cutting_quantity?: number | null;
  finishing_cost?: number | null;
  finishing_cpm?: number | null;
  finishing_quantity?: number | null;
  delivery_cost?: number | null;
  other_cost?: number | null;
}

interface CostBreakdownSectionProps {
  costBreakdown: CostBreakdown;
  onCostBreakdownChange: (breakdown: CostBreakdown) => void;
}

const CostBreakdownSection: React.FC<CostBreakdownSectionProps> = ({
  costBreakdown,
  onCostBreakdownChange,
}) => {
  const updateCostBreakdown = (
    field: keyof CostBreakdown,
    value: number | null
  ) => {
    const updated = { ...costBreakdown, [field]: value };

    // Auto-calculate cutting cost if CPM and quantity are provided
    if (field === 'cutting_cpm' || field === 'cutting_quantity') {
      const cpm = field === 'cutting_cpm' ? value : updated.cutting_cpm;
      const quantity =
        field === 'cutting_quantity' ? value : updated.cutting_quantity;

      if (cpm && quantity) {
        updated.cutting_cost = cpm * quantity;
      } else if (!cpm || !quantity) {
        updated.cutting_cost = null;
      }
    }

    // Auto-calculate finishing cost if CPM and quantity are provided
    if (field === 'finishing_cpm' || field === 'finishing_quantity') {
      const cpm = field === 'finishing_cpm' ? value : updated.finishing_cpm;
      const quantity =
        field === 'finishing_quantity' ? value : updated.finishing_quantity;

      if (cpm && quantity) {
        updated.finishing_cost = cpm * quantity;
      } else if (!cpm || !quantity) {
        updated.finishing_cost = null;
      }
    }

    onCostBreakdownChange(updated);
  };

  const handleInputChange = (
    field: keyof CostBreakdown,
    inputValue: string
  ) => {
    const numericValue = inputValue === '' ? null : Number(inputValue);
    updateCostBreakdown(field, numericValue);
  };

  const getTotalCost = () => {
    const costs = [
      costBreakdown.cutting_cost,
      costBreakdown.finishing_cost,
      costBreakdown.delivery_cost,
      costBreakdown.other_cost,
    ];

    return costs.reduce((sum, cost) => sum + (cost || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Calculator className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-medium text-gray-900">Cost Breakdown</h3>
      </div>

      <div className="space-y-4">
        {/* Cutting Cost Row */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Scissors className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">Cutting</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPM (Cost Per Meter)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBreakdown.cutting_cpm || ''}
                onChange={(e) =>
                  handleInputChange('cutting_cpm', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity (Meters)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBreakdown.cutting_quantity || ''}
                onChange={(e) =>
                  handleInputChange('cutting_quantity', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost (Auto-calculated)
              </label>
              <input
                type="number"
                step="0.01"
                value={costBreakdown.cutting_cost || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                placeholder="0.00"
                readOnly
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {costBreakdown.cutting_cpm && costBreakdown.cutting_quantity ? (
                  <span className="text-green-600 font-medium">
                    {costBreakdown.cutting_cpm} ×{' '}
                    {costBreakdown.cutting_quantity} ={' '}
                    {costBreakdown.cutting_cost?.toFixed(2)} EGP
                  </span>
                ) : (
                  <span className="text-gray-400">Enter CPM and quantity</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Finishing Cost Row */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Wrench className="h-4 w-4 text-purple-600" />
            <h4 className="font-medium text-gray-900">Finishing</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPM (Cost Per Meter)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBreakdown.finishing_cpm || ''}
                onChange={(e) =>
                  handleInputChange('finishing_cpm', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity (Meters)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBreakdown.finishing_quantity || ''}
                onChange={(e) =>
                  handleInputChange('finishing_quantity', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost (Auto-calculated)
              </label>
              <input
                type="number"
                step="0.01"
                value={costBreakdown.finishing_cost || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                placeholder="0.00"
                readOnly
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {costBreakdown.finishing_cpm &&
                costBreakdown.finishing_quantity ? (
                  <span className="text-green-600 font-medium">
                    {costBreakdown.finishing_cpm} ×{' '}
                    {costBreakdown.finishing_quantity} ={' '}
                    {costBreakdown.finishing_cost?.toFixed(2)} EGP
                  </span>
                ) : (
                  <span className="text-gray-400">Enter CPM and quantity</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Cost Row */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Truck className="h-4 w-4 text-orange-600" />
            <h4 className="font-medium text-gray-900">Delivery</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Cost
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBreakdown.delivery_cost || ''}
                onChange={(e) =>
                  handleInputChange('delivery_cost', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">Direct cost input</div>
            </div>
          </div>
        </div>

        {/* Other Cost Row */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Settings className="h-4 w-4 text-gray-600" />
            <h4 className="font-medium text-gray-900">Other</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Cost
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBreakdown.other_cost || ''}
                onChange={(e) =>
                  handleInputChange('other_cost', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">Miscellaneous costs</div>
            </div>
          </div>
        </div>

        {/* Total Cost Summary */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Total Cost Breakdown</h4>
            <div className="text-xl font-bold text-green-600">
              {getTotalCost().toFixed(2)} EGP
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            {costBreakdown.cutting_cost && (
              <div className="flex justify-between">
                <span>Cutting:</span>
                <span>{costBreakdown.cutting_cost.toFixed(2)} EGP</span>
              </div>
            )}
            {costBreakdown.finishing_cost && (
              <div className="flex justify-between">
                <span>Finishing:</span>
                <span>{costBreakdown.finishing_cost.toFixed(2)} EGP</span>
              </div>
            )}
            {costBreakdown.delivery_cost && (
              <div className="flex justify-between">
                <span>Delivery:</span>
                <span>{costBreakdown.delivery_cost.toFixed(2)} EGP</span>
              </div>
            )}
            {costBreakdown.other_cost && (
              <div className="flex justify-between">
                <span>Other:</span>
                <span>{costBreakdown.other_cost.toFixed(2)} EGP</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostBreakdownSection;
