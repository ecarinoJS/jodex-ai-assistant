'use client';

import { Navigation } from '@/components/Navigation';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              About Jodex AI Assistant
            </h1>

            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  What is Jodex?
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  Jodex is an AI-powered voice assistant specifically designed for agricultural supply chain
                  management, with a focus on cacao farming operations. It provides real-time insights,
                  recommendations, and alerts to help farmers and agricultural cooperatives optimize their operations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Key Features
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">🎙️</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>Voice Interface:</strong> Natural language interaction for hands-free operation
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3">📊</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>Smart Analytics:</strong> Real-time data analysis and forecasting
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-500 mr-3">🌤️</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>Weather Intelligence:</strong> Proactive alerts based on weather patterns
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3">🌱</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>Disease Management:</strong> Early warning for crop diseases and pests
                    </span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}