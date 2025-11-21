'use client';

import { useState } from 'react';
import { Farmer, Harvest, Weather, Disease, Inventory } from 'jodex-ai-assistant';
import { Navigation } from '@/components/Navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MetricsGrid } from '@/components/MetricsGrid';
import { SupplyChart } from '@/components/SupplyChart';
import { FarmerTable } from '@/components/FarmerTable';
import { WeatherAlerts } from '@/components/WeatherAlerts';

// Import the global data from JodexProvider
// Note: The sample data is now handled globally in JodexProvider.tsx

// Sample data for the dashboard components
// In a real app, this would come from your database or API
const dashboardFarmers: Farmer[] = [
  {
    farmer_id: 'F001',
    name: 'Maria Santos',
    location: 'Davao City',
    contact: '+639123456789',
    farm_size_ha: 5.2,
    trees_count: 1300,
    trees_per_ha: 250,
    farming_experience_years: 12,
    cooperative: 'Davao Cacao Growers Association',
    avg_yield_per_tree_kg: 2.8,
    annual_production_kg: 3640,
    primary_buyer: 'Cacao de Davao',
    has_fermentation_facility: true,
    preferred_contact: 'WhatsApp',
    reliability_score: 0.92
  },
  {
    farmer_id: 'F002',
    name: 'Juan Reyes',
    location: 'Compostela Valley',
    contact: '+639987654321',
    farm_size_ha: 3.8,
    trees_count: 950,
    trees_per_ha: 250,
    farming_experience_years: 8,
    cooperative: 'Compostela Cacao Cooperative',
    avg_yield_per_tree_kg: 2.5,
    annual_production_kg: 2375,
    primary_buyer: 'Cacao de Davao',
    has_fermentation_facility: false,
    preferred_contact: 'SMS',
    reliability_score: 0.85
  }
];

const dashboardHarvests: Harvest[] = [
  {
    farmer_id: 'F001',
    harvest_date: '2024-01-15',
    beans_kg: 320,
    quality_grade: 'A',
    price_per_kg: 180,
    total_value: 57600,
    notes: 'Excellent fermentation quality'
  },
  {
    farmer_id: 'F002',
    harvest_date: '2024-01-20',
    beans_kg: 280,
    quality_grade: 'B',
    price_per_kg: 160,
    total_value: 44800,
    notes: 'Slightly wet due to rain'
  }
];

const dashboardWeather: Weather[] = [
  {
    date: '2024-02-01',
    temperature_min: 24,
    temperature_max: 32,
    humidity: 78,
    rainfall_mm: 12,
    forecast: {
      next_7_days: [
        {
          date: '2024-02-02',
          temperature_min: 25,
          temperature_max: 33,
          humidity: 75,
          rainfall_chance: 30,
          conditions: 'Partly cloudy'
        }
      ]
    }
  }
];

const dashboardDiseases: Disease[] = [
  {
    id: 'D001',
    name: 'Black Pod Rot',
    scientific_name: 'Phytophthora spp.',
    type: 'fungal_disease',
    severity: 'high',
    parts_affected: ['pods', 'stems'],
    symptoms: ['Dark brown lesions on pods', 'White fungal growth in humid conditions'],
    seasonal_pattern: {
      peak_months: ['July', 'August', 'September'],
      low_months: ['January', 'February', 'March'],
      weather_trigger: 'High humidity (>80%) and rainfall'
    },
    prevention_measures: [
      {
        measure: 'Proper drainage',
        timing: 'Before rainy season',
        effectiveness: 75,
        cost_level: 'low'
      }
    ]
  }
];

const dashboardInventory: Inventory = {
  current_stock_kg: 2500,
  daily_usage_rate: 85,
  safety_stock_kg: 500,
  reorder_point_kg: 850,
  last_updated: '2024-02-01T10:00:00Z'
};

export default function HomePage() {
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  // Function to handle farmer selection (can be used by JodexAI actions)
  const selectFarmer = (farmerId: string) => {
    const farmer = dashboardFarmers.find(f => f.farmer_id === farmerId);
    setSelectedFarmer(farmer || null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <Navigation />

      {/* Dashboard Header */}
      <DashboardHeader />

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="mb-8">
          <MetricsGrid
            farmers={dashboardFarmers}
            harvests={dashboardHarvests}
            inventory={dashboardInventory}
          />
        </div>

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Supply Forecast Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Supply Forecast</h3>
            <SupplyChart harvests={dashboardHarvests} />
          </div>

          {/* Weather Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Weather Conditions</h3>
            <WeatherAlerts weather={dashboardWeather} diseases={dashboardDiseases} />
          </div>
        </div>

        {/* Farmers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">Farmer Directory</h3>
          </div>
          <FarmerTable farmers={dashboardFarmers} />
        </div>
      </main>

      {/* Jodex AI Assistant is now globally available through JodexProvider in layout.tsx */}

      {/* Modals and Overlays */}
      {showFarmerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold">Farmer Directory</h3>
              <button
                onClick={() => setShowFarmerModal(false)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <FarmerTable farmers={dashboardFarmers} />
            </div>
          </div>
        </div>
      )}

      {selectedFarmer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold">Farmer Profile</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg">{selectedFarmer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p>{selectedFarmer.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Farm Size</label>
                  <p>{selectedFarmer.farm_size_ha} hectares</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Annual Production</label>
                  <p>{selectedFarmer.annual_production_kg} kg</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reliability Score</label>
                  <p>{(selectedFarmer.reliability_score || 0) * 100}%</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}