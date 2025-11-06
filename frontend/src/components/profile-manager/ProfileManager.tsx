'use client';

import { useState, useEffect } from 'react';
import { apiEndpoints } from '../../utils/api';
import ProfileSelector from './ProfileSelector';
import AngleSelector from './AngleSelector';
import EmotionSelector from './EmotionSelector';
import VisemeGrid from './VisemeGrid';
import ProfileDashboard from './ProfileDashboard';
import BulkVisemeOperations from './BulkVisemeOperations';
import VisemeTesting from './VisemeTesting';

export interface Profile {
  profile_name: string;
  supported_angles: string[];
  supported_emotions: {
    core: string[];
    compound: string[];
  };
  path: string;
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

interface StructureAnalysis {
  profile_name: string;
  config: {
    supported_angles: string[];
    supported_emotions: string[];
  };
  actual_structure: any;
  completion_stats: {
    total_angles: number;
    completed_angles: number;
    total_emotions: number;
    completed_emotions: number;
    total_visemes: number;
    completed_visemes: number;
    overall_completion: number;
  };
}

interface VisemeData {
  viseme: string;
  path: string;
  exists: boolean;
  valid: boolean;
}

const ProfileManager = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [visemes, setVisemes] = useState<VisemeData[]>([]);
  const [structureAnalysis, setStructureAnalysis] = useState<StructureAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visemes' | 'bulk' | 'testing'>('visemes');

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile && selectedAngle && selectedEmotion) {
      fetchVisemes();
    }
  }, [selectedProfile, selectedAngle, selectedEmotion]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.getProfiles();
      const profilesData = response.data?.data?.profiles || [];
      setProfiles(profilesData.map((p: any) => ({
        ...p,
        profile_name: p.profile_name,
        supported_angles: p.supported_angles || [],
        supported_emotions: p.supported_emotions || { core: [], compound: [] },
        path: p.path || p.profile_path,
        validation: p.validation
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisemes = async () => {
    if (!selectedProfile || !selectedAngle || !selectedEmotion) return;

    try {
      const response = await apiEndpoints.getVisemes(
        selectedProfile.profile_name,
        selectedAngle,
        selectedEmotion
      );
      setVisemes(response.data?.data?.visemes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching visemes:', err);
      setError('Failed to load visemes');
    }
  };

  const fetchStructureAnalysis = async (profile: Profile) => {
    try {
      const response = await apiEndpoints.getProfileStructure(profile.profile_name);
      setStructureAnalysis(response.data?.data?.structure_analysis || null);
    } catch (err) {
      console.error('Error fetching structure analysis:', err);
      setStructureAnalysis(null);
    }
  };

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setSelectedAngle(null);
    setSelectedEmotion(null);
    setVisemes([]);
    fetchStructureAnalysis(profile);
  };

  const handleAngleSelect = (angle: string) => {
    setSelectedAngle(angle);
    setSelectedEmotion(null);
    setVisemes([]);
  };

  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotion(emotion);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner spinner-md"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Profile Management</h2>
        <p className="text-text-secondary">
          Select a character profile, angle, and emotion to manage visemes.
        </p>
      </div>

      {/* Profile Dashboard - shows when profile is selected */}
      {selectedProfile && (
        <div className="mb-8">
          <ProfileDashboard
            selectedProfile={selectedProfile}
            onStructureUpdate={() => {
              fetchStructureAnalysis(selectedProfile);
              fetchProfiles(); // Refresh profile list to update validation
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Selection */}
        <div className="bg-surface rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Select Profile</h3>
          <ProfileSelector
            profiles={profiles}
            selectedProfile={selectedProfile}
            onProfileSelect={handleProfileSelect}
          />
        </div>

        {/* Angle Selection */}
        <div className="bg-surface rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Select Angle</h3>
          <AngleSelector
            profile={selectedProfile}
            structureAnalysis={structureAnalysis}
            selectedAngle={selectedAngle}
            onAngleSelect={handleAngleSelect}
            disabled={!selectedProfile}
          />
        </div>

        {/* Emotion Selection */}
        <div className="bg-surface rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Select Emotion</h3>
          <EmotionSelector
            profile={selectedProfile}
            selectedEmotion={selectedEmotion}
            onEmotionSelect={handleEmotionSelect}
            disabled={!selectedProfile || !selectedAngle}
            selectedAngle={selectedAngle}
            structureAnalysis={structureAnalysis}
          />
        </div>
      </div>

      {/* Viseme Management Tabs */}
      {selectedProfile && selectedAngle && selectedEmotion && (
        <div className="bg-surface rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-text-primary">
              {selectedProfile.profile_name} - {selectedAngle} - {selectedEmotion}
            </h3>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                {selectedProfile.supported_angles.length} angles
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                {selectedProfile.supported_emotions.core.length} emotions
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('visemes')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'visemes'
                    ? 'border-primary-500 text-primary-600 bg-primary-50 -mt-1 px-4 rounded-t-lg'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Individual Visemes</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'bulk'
                    ? 'border-success-500 text-success-600 bg-success-50 -mt-1 px-4 rounded-t-lg'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Bulk Operations</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('testing')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'testing'
                    ? 'border-secondary-500 text-secondary-600 bg-secondary-50 -mt-1 px-4 rounded-t-lg'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Testing & Validation</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'visemes' && (
            <VisemeGrid
              visemes={visemes}
              profileName={selectedProfile.profile_name}
              angle={selectedAngle}
              emotion={selectedEmotion}
              onVisemeUpdate={fetchVisemes}
            />
          )}

          {activeTab === 'bulk' && (
            <BulkVisemeOperations
              profileName={selectedProfile.profile_name}
              angle={selectedAngle}
              emotion={selectedEmotion}
              onVisemesUpdate={fetchVisemes}
            />
          )}

          {activeTab === 'testing' && (
            <VisemeTesting
              profileName={selectedProfile.profile_name}
              angle={selectedAngle}
              emotion={selectedEmotion}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileManager;