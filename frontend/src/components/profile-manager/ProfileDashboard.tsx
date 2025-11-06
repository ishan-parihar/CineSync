import { useState, useEffect } from 'react';
import { apiEndpoints } from '../../utils/api';

interface StructureAnalysis {
  profile_name: string;
  config: {
    supported_angles: string[];
    supported_emotions: string[];
  };
  actual_structure: any;
  missing_structure: any;
  completion_stats: {
    total_angles: number;
    completed_angles: number;
    total_emotions: number;
    completed_emotions: number;
    total_visemes: number;
    completed_visemes: number;
    overall_completion: number;
  };
  repair_needed: boolean;
}

interface ProfileDashboardProps {
  selectedProfile: any;
  onStructureUpdate: () => void;
}

const ProfileDashboard = ({ selectedProfile, onStructureUpdate }: ProfileDashboardProps) => {
  const [structureAnalysis, setStructureAnalysis] = useState<StructureAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProfile) {
      fetchStructureAnalysis();
    }
  }, [selectedProfile]);

  const fetchStructureAnalysis = async () => {
    if (!selectedProfile) return;

    try {
      setLoading(true);
      const response = await apiEndpoints.getProfileStructure(selectedProfile.profile_name);
      setStructureAnalysis(response.data?.data?.structure_analysis || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching structure analysis:', err);
      setError('Failed to load structure analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleRepairStructure = async () => {
    if (!selectedProfile || !structureAnalysis) return;

    try {
      setRepairing(true);
      const response = await apiEndpoints.repairProfileStructure(selectedProfile.profile_name, {
        create_placeholders: true
      });

      if (response.data?.success) {
        // Refresh the structure analysis
        await fetchStructureAnalysis();
        onStructureUpdate();
        setError(null);
      } else {
        setError('Repair failed: ' + (response.data?.errors || []).join(', '));
      }
    } catch (err) {
      console.error('Error repairing structure:', err);
      setError('Failed to repair structure');
    } finally {
      setRepairing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="spinner spinner-md"></div>
      </div>
    );
  }

  if (!selectedProfile) {
    return (
      <div className="text-center py-8 text-text-muted">
        Select a profile to view its structure
      </div>
    );
  }

  if (!structureAnalysis) {
    return (
      <div className="text-center py-8 text-text-muted">
        No structure analysis available
      </div>
    );
  }

  const { completion_stats, actual_structure, config } = structureAnalysis;

  return (
    <div className="space-y-6">
      {/* Header with completion status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-text-primary">
              {selectedProfile.profile_name} Structure Analysis
            </h3>
            <p className="text-text-secondary mt-1">
              Complete profile structure with completion status
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${
              completion_stats.overall_completion === 100 ? 'text-success-600' :
              completion_stats.overall_completion >= 75 ? 'text-warning-600' :
              'text-error-600'
            }`}>
              {completion_stats.overall_completion.toFixed(1)}%
            </div>
            <div className="text-sm text-text-muted">Complete</div>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Angles ({completion_stats.completed_angles}/{completion_stats.total_angles})</span>
              <span>{((completion_stats.completed_angles / completion_stats.total_angles) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completion_stats.completed_angles / completion_stats.total_angles) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Emotions ({completion_stats.completed_emotions}/{completion_stats.total_emotions})</span>
              <span>{((completion_stats.completed_emotions / completion_stats.total_emotions) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-success-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completion_stats.completed_emotions / completion_stats.total_emotions) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Visemes ({completion_stats.completed_visemes}/{completion_stats.total_visemes})</span>
              <span>{((completion_stats.completed_visemes / completion_stats.total_visemes) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-secondary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completion_stats.completed_visemes / completion_stats.total_visemes) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Repair button */}
        {structureAnalysis.repair_needed && (
          <div className="mt-6">
            <button
              onClick={handleRepairStructure}
              disabled={repairing}
              className="btn-danger btn-md flex items-center space-x-2"
            >
              {repairing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Repairing...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Repair Missing Structure</span>
                </>
              )}
            </button>
            <p className="text-sm text-text-secondary mt-2">
              This will create missing directories and placeholder files for the profile structure.
            </p>
          </div>
        )}
      </div>

      {/* Angle details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-text-primary mb-4">Angle Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.supported_angles.map((angle) => {
            const angleData = actual_structure[angle];
            if (!angleData) return null;

            return (
              <div key={angle} className="border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-text-primary">{angle}</h5>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    angleData.exists 
                      ? angleData.completion === 100 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-warning-100 text-warning-800'
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {angleData.exists ? `${angleData.completion.toFixed(0)}%` : 'Missing'}
                  </span>
                </div>

                {angleData.exists && (
                  <div className="space-y-2">
                    <div className="text-sm text-text-secondary">
                      {angleData.completion.toFixed(0)}% complete
                    </div>
                    {angleData.missing_emotions.length > 0 && (
                      <div className="text-xs text-error-600">
                        Missing: {angleData.missing_emotions.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {!angleData.exists && (
                  <div className="text-sm text-error-600">
                    Angle directory missing
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ProfileDashboard;