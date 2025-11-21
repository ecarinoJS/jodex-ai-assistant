'use client';

import { Users, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { Farmer, Harvest, Inventory } from 'jodex-ai-assistant';

interface MetricsGridProps {
  farmers: Farmer[];
  harvests: Harvest[];
  inventory: Inventory;
}

export function MetricsGrid({ farmers, harvests, inventory }: MetricsGridProps) {
  const metrics = [
    {
      title: 'Active Farmers',
      value: farmers.length,
      icon: Users,
      color: 'blue',
      change: '+2 this month',
    },
    {
      title: 'Monthly Production',
      value: `${harvests.reduce((sum, h) => sum + h.beans_kg, 0).toLocaleString()} kg`,
      icon: Package,
      color: 'green',
      change: '+12% vs last month',
    },
    {
      title: 'Inventory Level',
      value: `${inventory.current_stock_kg.toLocaleString()} kg`,
      icon: Package,
      color: inventory.current_stock_kg < inventory.reorder_point_kg ? 'red' : 'yellow',
      change: inventory.current_stock_kg < inventory.reorder_point_kg ? 'Below reorder point' : 'Healthy',
    },
    {
      title: 'Avg Quality Grade',
      value: harvests.length > 0 ?
        (harvests.filter(h => h.quality_grade === 'A').length / harvests.length * 100).toFixed(0) + '%' :
        '0%',
      icon: TrendingUp,
      color: 'green',
      change: 'Grade A focus',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getIconColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600 dark:text-blue-400';
      case 'green':
        return 'text-green-600 dark:text-green-400';
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'red':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                  {metric.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {metric.change}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${getColorClasses(metric.color)} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${getIconColorClasses(metric.color)}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}