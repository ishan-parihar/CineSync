'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiEndpoints } from '../utils/api';

interface Profile {
  profile_name: string;
  path: string;
  validation?: {
    valid: boolean;
  };
}

interface SystemInfo {
  dependencies: {
    ffmpeg: boolean;
    rhubarb: boolean;
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
      const response = await apiEndpoints.getSystemInfo();
      
      const systemInfoData: SystemInfo = {
        dependencies: {
          ffmpeg: response.data?.dependencies?.ffmpeg || false,
          rhubarb: response.data?.dependencies?.rhubarb || false,
        },
        profiles: {
          count: response.data?.profiles?.count || 0,
          profiles: response.data?.profiles?.profiles || [],
        },
        processing: {
          active_jobs: response.data?.processing?.active_jobs || 0,
          pending_jobs: response.data?.processing?.pending_jobs || 0,
          completed_jobs: response.data?.processing?.completed_jobs || 0,
        }
      };
      
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-neutral-300">Loading system information...</p>
          <p className="mt-2 text-sm text-neutral-400">Make sure the backend server is running on port 8002</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">System Dashboard</h1>
            <p className="text-slate-400">
              Monitor system status, profiles, and processing activity
            </p>
          </div>
          <button 
            onClick={() => router.push('/profiles')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 ease-in-out flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Manage Profiles</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
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
              <span className={`h-3 w-3 rounded-full mr-2 ${systemInfo?.dependencies?.ffmpeg ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-neutral-300">FFmpeg: {systemInfo?.dependencies?.ffmpeg ? 'Available' : 'Missing'}</span>
            </div>
            <div className="flex items-center">
              <span className={`h-3 w-3 rounded-full mr-2 ${systemInfo?.dependencies?.rhubarb ? 'bg-green-500' : 'bg-red-500'}`}></span>
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

        {/* Quick Actions Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-neutral-50 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button 
              onClick={() => router.push('/process')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
            >
              New Process
            </button>
            <button 
              onClick={() => router.push('/batch')}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-2 px-3 rounded text-sm"
            >
              Batch Process
            </button>
            <button 
              onClick={() => router.push('/settings')}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-2 px-3 rounded text-sm"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {systemInfo?.profiles?.profiles && systemInfo.profiles.profiles.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-neutral-50 mb-4">Recent Profiles</h2>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-700">
              <thead>
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
    </div>
  );
}