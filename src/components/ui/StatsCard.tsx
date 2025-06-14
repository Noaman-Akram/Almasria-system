import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  change,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon && (
          <div className="p-3 rounded-full bg-gray-50 text-blue-600">
            {icon}
          </div>
        )}
      </div>
      
      {change && (
        <div className="mt-4">
          <div className={`flex items-center text-sm ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
            <span className="font-medium">
              {change.positive ? '↑' : '↓'} {Math.abs(change.value)}%
            </span>
            <span className="ml-2 text-gray-500">from last month</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsCard;