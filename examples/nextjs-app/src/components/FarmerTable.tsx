'use client';

import { Farmer } from 'jodex-ai-assistant';

interface FarmerTableProps {
  farmers: Farmer[];
}

export function FarmerTable({ farmers }: FarmerTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
              Farmer
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
              Location
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
              Farm Size
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
              Annual Production
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
              Reliability
            </th>
          </tr>
        </thead>
        <tbody>
          {farmers.map((farmer) => (
            <tr
              key={farmer.farmer_id}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {farmer.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {farmer.farmer_id}
                  </p>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                {farmer.location}
              </td>
              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                {farmer.farm_size_ha} ha
              </td>
              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                {farmer.annual_production_kg.toLocaleString()} kg
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(farmer.reliability_score || 0) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round((farmer.reliability_score || 0) * 100)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}