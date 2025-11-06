import { useState } from 'react';
import { Eye, Edit3, Download, RefreshCw, BarChart3 } from 'lucide-react';
import { EmotionHeatmap } from '../visualization';
import { EmotionTimeline } from '../visualization';
import { useAppStore } from '../../stores/appStore';
import type { EmotionSegment } from '../../types';

interface EmotionAnalysisViewerProps {
  className?: string;
}

export const EmotionAnalysisViewer: React.FC<EmotionAnalysisViewerProps> = ({
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline' | 'combined'>('combined');
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    emotionAnalysis,
    selectedSegments,
    setSelectedSegments,
    showConfidence,
    setShowConfidence,
    setEmotionAnalysis
  } = useAppStore();

  const handleSegmentClick = (index: number) => {
    if (isEditing) {
      // Toggle selection in edit mode
      if (selectedSegments.includes(index)) {
        setSelectedSegments(selectedSegments.filter(i => i !== index));
      } else {
        setSelectedSegments([...selectedSegments, index]);
      }
    }
  };

  const handleSegmentEdit = (index: number, updatedSegment: Partial<EmotionSegment>) => {
    if (!emotionAnalysis) return;
    
    const updatedSegments = [...emotionAnalysis.segments];
    updatedSegments[index] = { ...updatedSegments[index], ...updatedSegment };
    
    setEmotionAnalysis({
      ...emotionAnalysis,
      segments: updatedSegments
    });
  };

  const handleExportAnalysis = () => {
    if (!emotionAnalysis) return;
    
    const dataStr = JSON.stringify(emotionAnalysis, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'emotion-analysis.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRefreshAnalysis = () => {
    // This would trigger a re-analysis of the audio
    // For now, we'll just clear the current analysis
    setEmotionAnalysis(null);
    setSelectedSegments([]);
  };

  const getEmotionStats = () => {
    if (!emotionAnalysis || emotionAnalysis.segments.length === 0) {
      return null;
    }

    const emotionCounts: Record<string, number> = {};
    const emotionDurations: Record<string, number> = {};
    let totalConfidence = 0;

    emotionAnalysis.segments.forEach(segment => {
      emotionCounts[segment.emotion] = (emotionCounts[segment.emotion] || 0) + 1;
      const duration = segment.end_time - segment.start_time;
      emotionDurations[segment.emotion] = (emotionDurations[segment.emotion] || 0) + duration;
      totalConfidence += segment.confidence;
    });

    const avgConfidence = totalConfidence / emotionAnalysis.segments.length;
    const mostFrequentEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0];
    const longestEmotion = Object.entries(emotionDurations)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      totalSegments: emotionAnalysis.segments.length,
      avgConfidence,
      mostFrequentEmotion: mostFrequentEmotion ? mostFrequentEmotion[0] : null,
      longestEmotion: longestEmotion ? longestEmotion[0] : null,
      emotionCounts,
      emotionDurations
    };
  };

  const stats = getEmotionStats();

  return (
    <div className={`w-full bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Emotion Analysis</h3>
            {emotionAnalysis && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                {emotionAnalysis.segments.length} segments
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View mode selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'heatmap' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('combined')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'combined' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Combined
              </button>
            </div>

            {/* Toggle confidence */}
            <button
              onClick={() => setShowConfidence(!showConfidence)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                showConfidence 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Confidence
            </button>

            {/* Edit mode */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded transition-colors ${
                isEditing 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 size={16} />
            </button>

            {/* Actions */}
            {emotionAnalysis && (
              <>
                <button
                  onClick={handleRefreshAnalysis}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="Refresh Analysis"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={handleExportAnalysis}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="Export Analysis"
                >
                  <Download size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!emotionAnalysis ? (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Emotion Analysis Available</p>
            <p className="text-sm">
              Upload and process an audio file to see emotion analysis results.
            </p>
          </div>
        ) : (
          <>
            {/* Statistics Summary */}
            {stats && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-900">
                    {stats.totalSegments}
                  </div>
                  <div className="text-sm text-blue-700">Total Segments</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-900">
                    {(stats.avgConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-700">Avg Confidence</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-lg font-bold text-purple-900 capitalize">
                    {stats.mostFrequentEmotion}
                  </div>
                  <div className="text-sm text-purple-700">Most Frequent</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="text-lg font-bold text-orange-900 capitalize">
                    {stats.longestEmotion}
                  </div>
                  <div className="text-sm text-orange-700">Longest Duration</div>
                </div>
              </div>
            )}

            {/* Edit mode indicator */}
            {isEditing && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Edit Mode Active:</strong> Click segments to select them, double-click to edit. 
                  Selected segments: {selectedSegments.length}
                </p>
              </div>
            )}

            {/* Visualization */}
            <div className={`space-y-6 ${viewMode === 'combined' ? 'grid md:grid-cols-2 gap-6' : ''}`}>
              {/* Heatmap */}
              {(viewMode === 'heatmap' || viewMode === 'combined') && (
                <EmotionHeatmap
                  segments={emotionAnalysis.segments}
                  selectedSegments={selectedSegments}
                  onSegmentClick={handleSegmentClick}
                  showConfidence={showConfidence}
                />
              )}

              {/* Timeline */}
              {(viewMode === 'timeline' || viewMode === 'combined') && (
                <EmotionTimeline
                  segments={emotionAnalysis.segments}
                  selectedSegments={selectedSegments}
                  onSegmentClick={handleSegmentClick}
                  onSegmentEdit={handleSegmentEdit}
                  audioDuration={emotionAnalysis.duration}
                  showConfidence={showConfidence}
                />
              )}
            </div>

            {/* Emotion Distribution */}
            {stats && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Emotion Distribution</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(stats.emotionCounts).map(([emotion, count]) => {
                    const percentage = (count / stats.totalSegments) * 100;
                    const duration = stats.emotionDurations[emotion];
                    
                    return (
                      <div key={emotion} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 capitalize">{emotion}</span>
                          <span className="text-sm text-gray-600">{count}x</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600">
                          {percentage.toFixed(1)}% • {duration.toFixed(1)}s
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};