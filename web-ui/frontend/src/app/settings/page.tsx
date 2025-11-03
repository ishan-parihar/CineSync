 'use client';

 import { useState, useEffect } from 'react';
 import { apiEndpoints } from '../../utils/api';

interface SystemInfo {
  dependencies: {
    ffmpeg: boolean;
    rhubarb: boolean;
  };
  config: {
    profile_directory: string;
    cache_directory: string;
    temp_directory: string;
  };
  profiles: {
    count: number;
  };
  processing: {
    active_jobs: number;
  };
}

export default function SettingsPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchSystemInfo();
    fetchSettings();
  }, []);

   const fetchSystemInfo = async () => {
     try {
       setLoading(true);
       const response = await apiEndpoints.getSystemInfo();
       setSystemInfo(response.data);
       setError(null);
     } catch (err) {
       console.error('Error fetching system info:', err);
       setError('Failed to load system information');
     } finally {
       setLoading(false);
     }
   };

   const fetchSettings = async () => {
     try {
       const response = await apiEndpoints.getSettings();
       // Extract the actual settings from the response
       setSettings(response.data.settings || {});
     } catch (err) {
       console.error('Error fetching settings:', err);
     }
   };

   const updateSettings = async () => {
     try {
       await apiEndpoints.updateSettings(settings);
       alert('Settings updated successfully');
     } catch (err) {
       console.error('Error updating settings:', err);
       setError('Failed to update settings');
     }
   };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* System Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Dependencies</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className={`h-3 w-3 rounded-full mr-2 ${systemInfo?.dependencies.ffmpeg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>FFmpeg: {systemInfo?.dependencies.ffmpeg ? 'Available' : 'Missing'}</span>
                </div>
                <div className="flex items-center">
                  <span className={`h-3 w-3 rounded-full mr-2 ${systemInfo?.dependencies.rhubarb ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>Rhubarb: {systemInfo?.dependencies.rhubarb ? 'Available' : 'Missing'}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Configuration</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500">Profiles Directory: </span>
                  <span className="text-gray-800">{systemInfo?.config.profile_directory}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cache Directory: </span>
                  <span className="text-gray-800">{systemInfo?.config.cache_directory}</span>
                </div>
                <div>
                  <span className="text-gray-500">Temp Directory: </span>
                  <span className="text-gray-800">{systemInfo?.config.temp_directory}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Profile
              </label>
              <input
                type="text"
                value={settings.default_profile || ''}
                onChange={(e) => setSettings({...settings, default_profile: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Directory
              </label>
              <input
                type="text"
                value={settings.output_directory || ''}
                onChange={(e) => setSettings({...settings, output_directory: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cache Expiration (hours)
              </label>
              <input
                type="number"
                value={settings.cache_expiration_hours || 24}
                onChange={(e) => setSettings({...settings, cache_expiration_hours: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Concurrent Jobs
              </label>
              <input
                type="number"
                value={settings.max_concurrent_jobs || 2}
                onChange={(e) => setSettings({...settings, max_concurrent_jobs: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={updateSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
            >
              Save Settings
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700">Active Jobs</h3>
              <p className="text-3xl font-semibold text-blue-600">{systemInfo?.processing.active_jobs}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700">Total Profiles</h3>
              <p className="text-3xl font-semibold text-green-600">{systemInfo?.profiles.count}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700">System Health</h3>
              <p className="text-3xl font-semibold text-purple-600">Good</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}