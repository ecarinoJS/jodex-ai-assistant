'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Harvest } from 'jodex-ai-assistant';

interface SupplyChartProps {
  harvests: Harvest[];
}

export function SupplyChart({ harvests }: SupplyChartProps) {
  // Generate mock data for the past 6 months
  const data = [
    { month: 'Aug', supply: 2400 },
    { month: 'Sep', supply: 2210 },
    { month: 'Oct', supply: 2890 },
    { month: 'Nov', supply: 3200 },
    { month: 'Dec', supply: 2780 },
    { month: 'Jan', supply: harvests.reduce((sum, h) => sum + h.beans_kg, 0) },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="month"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(31, 41, 55)',
              border: '1px solid rgb(75, 85, 99)',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: 'rgb(243, 244, 246)' }}
            itemStyle={{ color: 'rgb(59, 130, 246)' }}
          />
          <Line
            type="monotone"
            dataKey="supply"
            stroke="rgb(59, 130, 246)"
            strokeWidth={2}
            dot={{ fill: 'rgb(59, 130, 246)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}