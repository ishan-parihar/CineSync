'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiEndpoints } from '../utils/api';
import { EnhancedEmotionHeatmap } from '../components/visualization/EmotionHeatmap';

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
      
      // Ensure all required properties exist with defaults
      systemInfoData.dependencies = systemInfoData.dependencies || { ffmpeg: false, rhubarb: false };
      systemInfoData.config = systemInfoData.config || { profile_directory: '', cache_directory: '', temp_directory: '' };
      systemInfoData.profiles = systemInfoData.profiles || { count: 0, profiles: [] };
      systemInfoData.processing = systemInfoData.processing || { active_jobs: 0, pending_jobs: 0, completed_jobs: 0 };
      
      // Fetch profiles with validation separately
      try {
        const profilesResponse = await apiEndpoints.getProfiles();
        const profilesWithValidation = profilesResponse.data?.data?.profiles || [];
        
        // Update the profiles in system info with validation data
        // Ensure the profiles object exists before trying to access it
        if (systemInfoData.profiles) {
          systemInfoData.profiles.profiles = profilesWithValidation;
        } else {
          // If profiles object doesn't exist, create it
          systemInfoData.profiles = {
            count: profilesWithValidation ? profilesWithValidation.length : 0,
            profiles: profilesWithValidation || []
          };
        }
      } catch (profilesErr) {
        console.error('Error fetching profiles with validation:', profilesErr);
        // Continue with basic profile data if validation fetch fails
        // Ensure profiles object exists with default values
        if (!systemInfoData.profiles) {
          systemInfoData.profiles = {
            count: 0,
            profiles: []
          };
        }
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
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-neutral-300">Loading system information...</p>
           <p className="mt-2 text-sm text-neutral-400">Make sure the backend server is running on port 8002</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-neutral-50">LipSyncAutomation Dashboard</h1>
          <button 
            onClick={() => router.push('/profiles')}
            className="bg-primary-600 hover:bg-primary-700 text-neutral-50 px-4 py-2 rounded-md transition duration-fast ease-in-out"
          >
            Manage Profiles
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* System Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Dependencies Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">Dependencies</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className={`h-3 w-3 rounded-full mr-2 ${systemInfo?.dependencies?.ffmpeg ? 'bg-success-500' : 'bg-error-500'}`}></span>
                <span className="text-neutral-300">FFmpeg: {systemInfo?.dependencies?.ffmpeg ? 'Available' : 'Missing'}</span>
              </div>
              <div className="flex items-center">
                <span className={`h-3 w-3 rounded-full mr-2 ${systemInfo?.dependencies?.rhubarb ? 'bg-success-500' : 'bg-error-500'}`}></span>
                <span className="text-neutral-300">Rhubarb: {systemInfo?.dependencies?.rhubarb ? 'Available' : 'Missing'}</span>
              </div>
            </div>
          </div>

          {/* Profiles Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">Profiles</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-300">Total Profiles:</span>
                <span className="font-medium text-neutral-50">{systemInfo?.profiles?.count || 0}</span>
              </div>
              <button 
                onClick={() => router.push('/profiles')}
                className="mt-2 w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 py-1 px-3 rounded text-sm"
              >
                View All Profiles
              </button>
            </div>
          </div>

          {/* Processing Jobs Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">Processing Jobs</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-300">Active:</span>
                <span className="font-medium text-neutral-50">{systemInfo?.processing?.active_jobs || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-300">Pending:</span>
                <span className="font-medium text-neutral-50">{systemInfo?.processing?.pending_jobs || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-300">Completed:</span>
                <span className="font-medium text-neutral-50">{systemInfo?.processing?.completed_jobs || 0}</span>
              </div>
            </div>
          </div>

          {/* Emotion Heatmap Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-50">System Activity Heatmap</h2>
              <button
                className="text-sm text-primary-400 hover:text-primary-300"
                onClick={() => {
                  // Refresh heatmap data
                }}
              >
                Refresh
              </button>
            </div>
            <EnhancedEmotionHeatmap
              segments={Array.from({ length: 10 }, (_, i) => ({
                emotion: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'][Math.floor(Math.random() * 7)],
                valence: Math.random() * 2 - 1,
                arousal: Math.random(),
                confidence: Math.random(),
                start_time: i * 2,
                end_time: (i + 1) * 2
              }))}
              selectedSegments={[]}
              onSegmentClick={(index) => console.log('Clicked segment:', index)}
              width={400}
              height={200}
              theme="dark"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-neutral-50 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => router.push('/process')}
              className="bg-primary-600 hover:bg-primary-700 text-neutral-50 py-3 px-4 rounded-md transition duration-fast ease-in-out"
            >
              Start New Processing
            </button>
            <button 
              onClick={() => router.push('/profiles')}
              className="bg-success-600 hover:bg-success-700 text-neutral-50 py-3 px-4 rounded-md transition duration-fast ease-in-out"
            >
              Create New Profile
            </button>
            <button 
              onClick={() => router.push('/settings')}
              className="bg-secondary-600 hover:bg-secondary-700 text-neutral-50 py-3 px-4 rounded-md transition duration-fast ease-in-out"
            >
              Open Settings
            </button>
          </div>
        </div>

        {/* Recent Profiles */}
        {systemInfo?.profiles?.profiles && Array.isArray(systemInfo.profiles.profiles) && systemInfo.profiles.profiles.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">Recent Profiles</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-700">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Path</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-neutral-900 divide-y divide-neutral-700">
                  {systemInfo.profiles.profiles.slice(0, 5).map((profile, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-50">{profile.profile_name}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{profile.path}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            profile.validation?.valid 
                              ? 'bg-success-100 text-success-800' 
                              : 'bg-error-100 text-error-800'
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