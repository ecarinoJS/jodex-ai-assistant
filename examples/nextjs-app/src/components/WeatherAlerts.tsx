'use client';

import { Cloud, Droplets, AlertTriangle } from 'lucide-react';
import { Weather, Disease } from 'jodex-ai-assistant';

interface WeatherAlertsProps {
  weather: Weather[];
  diseases: Disease[];
}

export function WeatherAlerts({ weather, diseases }: WeatherAlertsProps) {
  const currentWeather = weather[0];
  const highRiskDiseases = diseases.filter(d => d.severity === 'critical' || d.severity === 'high');

  return (
    <div className="space-y-4">
      {/* Current Weather */}
      {currentWeather && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Current Weather
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {currentWeather.temperature_min}° - {currentWeather.temperature_max}°C
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Droplets className="w-4 h-4" />
            {currentWeather.humidity}% humidity
          </div>
        </div>
      )}

      {/* Disease Risk Alerts */}
      {highRiskDiseases.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Disease Risk Alert
          </h4>
          {highRiskDiseases.slice(0, 2).map((disease) => (
            <div
              key={disease.id}
              className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {disease.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {disease.severity === 'critical' ? 'Critical risk' : 'High risk'} •
                  {' '}{disease.seasonal_pattern.weather_trigger}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rainfall Alert */}
      {currentWeather && currentWeather.rainfall_mm > 10 && (
        <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Heavy Rainfall
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {currentWeather.rainfall_mm}mm today
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}