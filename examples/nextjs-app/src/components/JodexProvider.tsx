'use client';

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
  },
  {
    id: 'F002',
    name: 'Juan Reyes',
    location: {
      latitude: 7.3905,
      longitude: 126.2048,
      region: 'Compostela Valley'
    },
    contact: {
      phone: '+639987654321'
    },
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
    reliability_score: 0.85,
    crops: ['cacao'],
    production: {
      annual_kg: 2375,
      avg_yield_per_tree_kg: 2.5
    }
  }
];

const sampleHarvests: Harvest[] = [
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

const sampleWeather: Weather[] = [
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

const sampleDiseases: Disease[] = [
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

const sampleInventory: Inventory = {
  current_stock_kg: 2500,
  daily_usage_rate: 85,
  safety_stock_kg: 500,
  reorder_point_kg: 850,
  last_updated: '2024-02-01T10:00:00Z'
};

interface JodexProviderProps {
  children: React.ReactNode;
}

export function JodexProvider({ children }: JodexProviderProps) {
  const handleAction = (action: Action) => {
    console.log('Jodex Action triggered:', action);

    switch (action.type) {
      case 'show_farmer_list':
        console.log('👥 Farmer directory requested');
        break;
      case 'open_farmer_profile':
        if (action.data.id) {
          const farmer = sampleFarmers.find(f => f.id === action.data.id);
          console.log('👤 Farmer profile:', farmer?.name);
        }
        break;
      case 'show_supply_forecast':
        console.log('📊 Supply forecast requested');
        break;
      case 'show_weather_alerts':
        console.log('🌤️ Weather alerts requested');
        break;
      case 'show_inventory':
        console.log('📦 Inventory status:', sampleInventory.current_stock_kg, 'kg');
        break;
      case 'send_notification':
        console.log('🔔 Notification:', action.data);
        break;
      default:
        console.log('⚡ Custom action:', action);
    }
  };

  const handleError = (error: Error) => {
    console.error('🚨 Jodex Error:', error);
    // You could show a toast notification here in the future
  };

  const handleReady = () => {
    console.log('✅ Jodex AI Assistant is ready!');
  };

  const handleMessage = (message: any) => {
    console.log('💬 Jodex Message:', message);
  };

  const handleVoiceStart = () => {
    console.log('🎙️ Voice recording started');
  };

  const handleVoiceEnd = () => {
    console.log('🔇 Voice recording ended');
  };

  return (
    <>
      {children}

      {/* Global Jodex AI Assistant - Floating on all pages */}
      <JodexAI
        apiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}
        livekitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
        livekitToken={process.env.NEXT_PUBLIC_LIVEKIT_TOKEN || ''}
        datasets={{
          farmers: sampleFarmers,
          harvests: sampleHarvests,
          weather: sampleWeather,
          diseases: sampleDiseases,
          inventory: sampleInventory
        }}
        onAction={handleAction}
        onMessage={handleMessage}
        onError={handleError}
        onReady={handleReady}
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        theme="dark"
        position="bottom-right"
        voiceEnabled={true}
        title="Cacao Assistant"
        systemPrompt={`You are Jodex, an AI assistant specializing in cacao farming and agricultural supply chain management in the Philippines.

Your expertise includes:
- Cacao farming best practices in tropical climates
- Disease and pest management for cacao crops
- Weather patterns and their impact on cacao production
- Supply chain management for cacao processors
- Farmer relationship management and cooperatives
- Quality assessment and grading of cacao beans
- Market trends and pricing information

Current context: You're helping manage operations for Cacao de Davao, a cacao processing company working with smallholder farmers in the Davao region.

When providing advice:
1. Consider local conditions in Mindanao, Philippines
2. Suggest practical, actionable steps
3. Be aware of seasonal patterns and weather risks
4. Consider both immediate needs and long-term sustainability
5. Help optimize the supply chain from farm to processor

Always be helpful, proactive, and base your recommendations on the provided data about farmers, weather conditions, harvest records, and inventory levels.`}
      />
    </>
  );
}
