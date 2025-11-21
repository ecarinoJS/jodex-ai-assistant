'use client';

// Test page with Jodex AI Assistant - now using local component
import { JodexAI, Action, Farmer, Harvest, Weather, Disease, Inventory } from 'jodex-ai-assistant';

// Sample data for demonstration
const sampleFarmers: Farmer[] = [
  {
    id: 'F001',
    name: 'Maria Santos',
    location: {
      latitude: 7.0731,
      longitude: 125.6128,
      region: 'Davao City'
    },
    contact: {
      email: 'maria.santos@example.com',
      phone: '+639123456789'
    },
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
    reliability_score: 0.92,
    crops: ['cacao'],
    production: {
      annual_kg: 3640,
      avg_yield_per_tree_kg: 2.8
    }
  }
];

const testDatasets = {
  farmers: sampleFarmers,
  harvests: [],
  weather: [],
  diseases: [],
  inventory: {
    current_stock_kg: 2500,
    daily_usage_rate: 85,
    safety_stock_kg: 500,
    reorder_point_kg: 850,
    last_updated: '2024-02-01T10:00:00Z'
  }
};

import { Navigation } from '@/components/Navigation';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Jodex AI Assistant Test Page
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Information</h2>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              This page demonstrates the Jodex AI Assistant integration.
              Notice that the assistant is floating in the bottom-right corner of this page.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                ✅ Test Features:
              </h3>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Global Jodex Assistant (floating on all pages)</li>
                <li>• LiveKit voice integration</li>
                <li>• Agricultural data context</li>
                <li>• Real-time chat interface</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                🎤 Voice Testing:
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Click the microphone button in the floating Jodex assistant to test voice recording and speech-to-text functionality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Jodex AI Assistant - already included globally via layout.tsx */}
      <JodexAI
        apiUrl={process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}
        apiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}
        livekitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
        livekitToken={process.env.NEXT_PUBLIC_LIVEKIT_TOKEN || ''}
        datasets={testDatasets}
        theme="dark"
      />
    </div>
  );
}
