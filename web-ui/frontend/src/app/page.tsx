'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiEndpoints } from '../utils/api';

// Define TypeScript interfaces
interface Profile {
  profile_name: string;
  profile_path?: string; // This might not always be present
  path: string; // This is what's actually in the API response
  version?: string;
  status?: string;
  supported_angles?: string[];
  supported_emotions?: string[];
  asset_count?: number;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    missing_assets: string[];
    stats: {
      total_assets: number;
      expected_assets: number;
      completion_percentage: number;
    };
  };
}

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
    profiles: Profile[];
  };
  processing: {
    active_jobs: number;
    pending_jobs: number;
    completed_jobs: number;
  };
}

export default function DashboardPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      
      // Fetch basic system info
      const systemInfoResponse = await apiEndpoints.getSystemInfo();
      const systemInfoData = { ...systemInfoResponse.data };
      
      // Fetch profiles with validation separately
      try {
        const profilesResponse = await apiEndpoints.getProfiles();
        const profilesWithValidation = profilesResponse.data.profiles;
        
        // Update the profiles in system info with validation data
        systemInfoData.profiles.profiles = profilesWithValidation;
      } catch (profilesErr) {
        console.error('Error fetching profiles with validation:', profilesErr);
        // Continue with basic profile data if validation fetch fails
      }
      
      setSystemInfo(systemInfoData);
      setError(null);
    } catch (err) {
      console.error('Error fetching system info:', err);
      setError('Failed to load system information. Backend server might not be running.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading system information...</p>
          <p className="mt-2 text-sm text-gray-500">Make sure the backend server is running on port 8001</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">LipSyncAutomation Dashboard</h1>
          <button 
            onClick={() => router.push('/profiles')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
          >
            Manage Profiles
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Dependencies Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Dependencies</h2>
            <div className="space-y-3">
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

          {/* Profiles Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Profiles</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Profiles:</span>
                <span className="font-medium">{systemInfo?.profiles.count}</span>
              </div>
              <button 
                onClick={() => router.push('/profiles')}
                className="mt-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm"
              >
                View All Profiles
              </button>
            </div>
          </div>

          {/* Processing Jobs Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Processing Jobs</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium">{systemInfo?.processing.active_jobs}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-medium">{systemInfo?.processing.pending_jobs}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium">{systemInfo?.processing.completed_jobs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => router.push('/process')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Start New Processing
            </button>
            <button 
              onClick={() => router.push('/profiles')}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Create New Profile
            </button>
            <button 
              onClick={() => router.push('/settings')}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Open Settings
            </button>
          </div>
        </div>

        {/* Recent Profiles */}
        {systemInfo?.profiles?.profiles && systemInfo.profiles.profiles.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Profiles</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {systemInfo.profiles.profiles.slice(0, 5).map((profile, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.profile_name}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.path}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            profile.validation?.valid 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {profile.validation?.valid ? 'Valid' : 'Invalid'}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}