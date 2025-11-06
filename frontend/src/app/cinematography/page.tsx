'use client';

import { useState, useEffect } from 'react';
import { Film, Settings, Play, Pause, BarChart3, Eye } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAppStore } from '../../stores/appStore';
import { EmotionAnalysisViewer } from '../../components/cinematography/EmotionAnalysisViewer';
import { ShotSequencePreview } from '../../components/cinematography/ShotSequencePreview';
import { CinematographyConfigPanel } from '../../components/cinematography/CinematographyConfig';
import { ProcessingStagesIndicator } from '../../components/processing/ProcessingStagesIndicator';
import { EmotionRadar } from '../../components/visualization/EmotionRadar';
import { EmotionTimeline } from '../../components/visualization/EmotionTimeline';

// Disable static generation
export const dynamic = 'force-dynamic';

export default function CinematographyPage() {
  const [activeView, setActiveView] = useState<'overview' | 'emotion' | 'shots' | 'config'>('overview');
  const { isConnected } = useWebSocket();
  
  const {
    currentJob,
    emotionAnalysis,
    shotSequence,
    cinematographyConfig,
    processingStages,
    selectedSegments,
    setSelectedSegments,
    setShotSequence,
    setCinematographyConfig
  } = useAppStore();

  useEffect(() => {
    // Initialize default cinematography config if not present
    if (!cinematographyConfig) {
      setCinematographyConfig({
        weights: {
          emotion_weight: 0.4,
          tension_weight: 0.3,
          grammar_weight: 0.3,
          temporal_smoothing: 0.2,
          shot_duration_range: {
            min: 0.5,
            max: 5.0
          },
          angle_stability_window: 3,
          distance_progression_preference: true
        },
        emotion_mappings: {},
        tension_mappings: {},
        grammar_rules: {
          distance_progression: {
            allowed_sequences: [],
            forbidden_sequences: [],
            progression_penalty: 0.3
          },
          angle_consistency: {
            '180_degree_rule': true,
            axis_break_penalty: 0.8,
            angle_transition_rules: {}
          },
          emotional_rhythm: {
            tempo_matching: true,
            intensity_matching: true,
            valence_continuity: true
          }
        }
      });
    }
  }, [cinematographyConfig, setCinematographyConfig]);

  const handleShotEdit = (index: number, shot: any) => {
    const updatedSequence = [...shotSequence];
    updatedSequence[index] = { ...updatedSequence[index], ...shot };
    setShotSequence(updatedSequence);
  };

  const handleConfigChange = (config: any) => {
    setCinematographyConfig(config);
  };

  const handlePresetSave = (name: string, config: any) => {
    // Save preset logic here
    console.log('Saving preset:', name, config);
  };

  const handlePresetLoad = (name: string) => {
    // Load preset logic here
    console.log('Loading preset:', name);
  };

  const getViewIcon = (view: string) => {
    switch (view) {
      case 'overview': return <BarChart3 size={16} />;
      case 'emotion': return <Eye size={16} />;
      case 'shots': return <Film size={16} />;
      case 'config': return <Settings size={16} />;
      default: return <BarChart3 size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Film className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">Cinematography Dashboard</h1>
              {isConnected && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  Connected
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {currentJob && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Current Job:</span> {currentJob.id}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', description: 'System status and summary' },
              { id: 'emotion', name: 'Emotion Analysis', description: 'Emotion detection and segments' },
              { id: 'shots', name: 'Shot Sequence', description: 'Camera shots and angles' },
              { id: 'config', name: 'Configuration', description: 'Cinematography settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {getViewIcon(tab.id)}
                  <span>{tab.name}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Processing Status */}
            <ProcessingStagesIndicator className="w-full" />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Segments Detected:</span>
                    <span className="font-medium">{emotionAnalysis?.segments.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{emotionAnalysis?.duration.toFixed(1) || 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selected:</span>
                    <span className="font-medium">{selectedSegments.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shot Sequence</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Shots:</span>
                    <span className="font-medium">{shotSequence.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Confidence:</span>
                    <span className="font-medium">
                      {shotSequence.length > 0 
                        ? `${(shotSequence.reduce((sum, shot) => sum + shot.confidence, 0) / shotSequence.length * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Most Used:</span>
                    <span className="font-medium">
                      {shotSequence.length > 0 
                        ? Object.entries(
                            shotSequence.reduce((acc, shot) => {
                              acc[shot.selected_shot] = (acc[shot.selected_shot] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">WebSocket:</span>
                    <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Job:</span>
                    <span className="font-medium">
                      {currentJob ? currentJob.id : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Status:</span>
                    <span className="font-medium capitalize">
                      {currentJob ? currentJob.status : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveView('emotion')}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="text-sm font-medium text-blue-900">View Emotions</div>
                </button>
                <button
                  onClick={() => setActiveView('shots')}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Film className="w-6 h-6 text-green-600 mb-2" />
                  <div className="text-sm font-medium text-green-900">Edit Shots</div>
                </button>
                <button
                  onClick={() => setActiveView('config')}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Settings className="w-6 h-6 text-purple-600 mb-2" />
                  <div className="text-sm font-medium text-purple-900">Configure</div>
                </button>
                <button
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Play className="w-6 h-6 text-orange-600 mb-2" />
                  <div className="text-sm font-medium text-orange-900">Start Processing</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emotion Analysis */}
        {activeView === 'emotion' && (
          <div className="space-y-6">
            <EmotionAnalysisViewer className="w-full" />
            
            {/* Advanced Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emotion Radar Chart */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emotion Intensity Radar</h3>
                  <button
                    className="text-sm text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      // Refresh radar data
                    }}
                  >
                    Refresh
                  </button>
                </div>
                <EmotionRadar
                  segments={emotionAnalysis?.segments || []}
                />
              </div>

              {/* Emotion Timeline */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emotion Timeline</h3>
                  <button
                    className="text-sm text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      // Refresh timeline data
                    }}
                  >
                    Refresh
                  </button>
                </div>
                <EmotionTimeline
                  segments={emotionAnalysis?.segments || []}
                  selectedSegments={[]}
                  onSegmentClick={() => {}}
                  onSegmentEdit={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        {/* Shot Sequence */}
        {activeView === 'shots' && (
          <ShotSequencePreview
            shotSequence={shotSequence}
            emotionSegments={emotionAnalysis?.segments || []}
            selectedShots={selectedSegments}
            onShotClick={(index) => {
              if (selectedSegments.includes(index)) {
                setSelectedSegments(selectedSegments.filter(i => i !== index));
              } else {
                setSelectedSegments([...selectedSegments, index]);
              }
            }}
            onShotEdit={handleShotEdit}
            previewMode={'storyboard'}
            onPreviewModeChange={(mode) => console.log('Preview mode:', mode)}
          />
        )}

        {/* Configuration */}
        {activeView === 'config' && (
          <CinematographyConfigPanel
            config={cinematographyConfig}
            onConfigChange={handleConfigChange}
            onPresetSave={handlePresetSave}
            onPresetLoad={handlePresetLoad}
          />
        )}
      </div>
    </div>
  );
}