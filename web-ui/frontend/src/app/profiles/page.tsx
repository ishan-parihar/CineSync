'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Profile {
  profile_name: string;
  profile_path: string;
  validation: {
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

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAngles, setNewProfileAngles] = useState<string[]>([]);
  const [newProfileEmotions, setNewProfileEmotions] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8001/api/profiles');
      setProfiles(response.data.profiles);
      setError(null);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const response = await axios.post('http://localhost:8001/api/profiles', {
        profile_name: newProfileName,
        supported_angles: newProfileAngles,
        supported_emotions: newProfileEmotions,
      });
      
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      
      // Reset form
      setNewProfileName('');
      setNewProfileAngles([]);
      setNewProfileEmotions([]);
      setShowCreateForm(false);
      
      // Refresh profiles
      fetchProfiles();
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile');
    }
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked && !newProfileAngles.includes(value)) {
      setNewProfileAngles([...newProfileAngles, value]);
    } else {
      setNewProfileAngles(newProfileAngles.filter(angle => angle !== value));
    }
  };

  const handleEmotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked && !newProfileEmotions.includes(value)) {
      setNewProfileEmotions([...newProfileEmotions, value]);
    } else {
      setNewProfileEmotions(newProfileEmotions.filter(emotion => emotion !== value));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Profile Management</h1>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
          >
            {showCreateForm ? 'Cancel' : '+ New Profile'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Profile Form */}
        {showCreateForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Profile</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  id="profileName"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter profile name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supported Angles
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['CU', 'ECU', 'MCU', 'MS', 'WS'].map((angle) => (
                    <div key={angle} className="flex items-center">
                      <input
                        id={`angle-${angle}`}
                        type="checkbox"
                        value={angle}
                        checked={newProfileAngles.includes(angle)}
                        onChange={handleAngleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`angle-${angle}`} className="ml-2 text-sm text-gray-700">
                        {angle}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supported Emotions
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'contempt'].map((emotion) => (
                    <div key={emotion} className="flex items-center">
                      <input
                        id={`emotion-${emotion}`}
                        type="checkbox"
                        value={emotion}
                        checked={newProfileEmotions.includes(emotion)}
                        onChange={handleEmotionChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`emotion-${emotion}`} className="ml-2 text-sm text-gray-700">
                        {emotion}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={createProfile}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
              >
                Create Profile
              </button>
            </div>
          </div>
        )}

        {/* Profiles List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Profiles</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.profile_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.profile_path}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                         profile.validation.valid 
                           ? 'bg-green-100 text-green-800' 
                           : 'bg-red-100 text-red-800'
                       }`}>
                         {profile.validation.valid ? 'Valid' : 'Invalid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}