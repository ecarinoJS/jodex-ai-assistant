// Farmer Profile
export interface Farmer {
  farmer_id: string;
  name: string;
  location: string;
  contact: string;
  farm_size_ha: number;
  trees_count: number;
  trees_per_ha: number;
  farming_experience_years: number;
  cooperative?: string;
  avg_yield_per_tree_kg: number;
  annual_production_kg: number;
  primary_buyer: string;
  has_fermentation_facility: boolean;
  preferred_contact: 'SMS' | 'WhatsApp' | 'Phone Call';
  reliability_score?: number;
}

// Harvest Record
export interface Harvest {
  farmer_id: string;
  harvest_date: string;
  beans_kg: number;
  quality_grade: 'A' | 'B' | 'C';
  price_per_kg: number;
  total_value: number;
  notes?: string;
}

// Weather Data
export interface Weather {
  date: string;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  rainfall_mm: number;
  forecast?: {
    next_7_days: WeatherForecast[];
  };
}

export interface WeatherForecast {
  date: string;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  rainfall_chance: number;
  conditions: string;
}

// Disease/Pest Entry
export interface Disease {
  id: string;
  name: string;
  scientific_name: string;
  type: 'fungal_disease' | 'insect_pest';
  severity: 'critical' | 'high' | 'medium' | 'low';
  parts_affected: string[];
  symptoms: string[];
  seasonal_pattern: {
    peak_months: string[];
    low_months: string[];
    weather_trigger: string;
  };
  prevention_measures: PreventionMeasure[];
}

export interface PreventionMeasure {
  measure: string;
  timing: string;
  effectiveness: number; // 0-100
  cost_level: 'low' | 'medium' | 'high';
}

// Inventory Status
export interface Inventory {
  current_stock_kg: number;
  daily_usage_rate: number;
  safety_stock_kg: number;
  reorder_point_kg: number;
  last_updated: string;
}

// Dataset collection
export interface Datasets {
  farmers?: Farmer[];
  harvests?: Harvest[];
  weather?: Weather[];
  diseases?: Disease[];
  inventory?: Inventory;
  [key: string]: any; // Allow custom datasets
}