import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Edit3, Eye, Settings } from 'lucide-react';
import type { EmotionSegment, ShotDecision, ShotDistance, CameraAngle } from '../../types';

interface ShotSequencePreviewProps {
  shotSequence: ShotDecision[];
  emotionSegments: EmotionSegment[];
  selectedShots: number[];
  onShotClick: (index: number) => void;
  onShotEdit: (index: number, shot: Partial<ShotDecision>) => void;
  previewMode: 'storyboard' | 'timeline' | 'detailed';
  onPreviewModeChange: (mode: 'storyboard' | 'timeline' | 'detailed') => void;
}

// Shot type icons and colors
const SHOT_INFO: Record<string, { icon: string; color: string; description: string }> = {
  CU: { icon: '🎯', color: '#ef4444', description: 'Close Up' },
  MCU: { icon: '👤', color: '#f59e0b', description: 'Medium Close Up' },
  MS: { icon: '🧍', color: '#10b981', description: 'Medium Shot' },
  MWS: { icon: '🚶', color: '#3b82f6', description: 'Medium Wide Shot' },
  WS: { icon: '🏞️', color: '#8b5cf6', description: 'Wide Shot' },
  ECU: { icon: '👁️', color: '#ec4899', description: 'Extreme Close Up' }
};

// Angle indicators
const ANGLE_INDICATORS: Record<string, string> = {
  eye_level: '→',
  high_angle: '↓',
  low_angle: '↑',
  dutch_angle: '↗'
};

export const ShotSequencePreview: React.FC<ShotSequencePreviewProps> = ({
  shotSequence,
  emotionSegments,
  selectedShots,
  onShotClick,
  onShotEdit,
  previewMode,
  onPreviewModeChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [editingShot, setEditingShot] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ShotDecision>>({});

  const handlePlay = () => {
    if (!isPlaying && shotSequence.length > 0) {
      setIsPlaying(true);
      // Simple playback simulation
      const interval = setInterval(() => {
        setCurrentShotIndex(prev => {
          if (prev >= shotSequence.length - 1) {
            setIsPlaying(false);
            clearInterval(interval);
            return 0;
          }
          return prev + 1;
        });
      }, 2000); // 2 seconds per shot
    } else {
      setIsPlaying(false);
    }
  };

  const handleShotClick = (index: number) => {
    setCurrentShotIndex(index);
    onShotClick(index);
  };

  const handleShotEdit = (index: number) => {
    setEditingShot(index);
    setEditForm(shotSequence[index]);
  };

  const handleEditSave = () => {
    if (editingShot !== null && editForm) {
      onShotEdit(editingShot, editForm);
      setEditingShot(null);
      setEditForm({});
    }
  };

  const handleEditCancel = () => {
    setEditingShot(null);
    setEditForm({});
  };

  const getEmotionForShot = (shot: ShotDecision) => {
    return emotionSegments.find(segment => 
      segment.emotion === shot.emotion || 
      (segment.start_time <= (shot.start_time || 0) && segment.end_time >= (shot.end_time || 0))
    );
  };

  const renderStoryboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {shotSequence.map((shot, index) => {
        const isSelected = selectedShots.includes(index);
        const isCurrent = index === currentShotIndex;
        const shotInfo = SHOT_INFO[shot.selected_shot] || SHOT_INFO.MS;
        const emotion = getEmotionForShot(shot);
        
        return (
          <div
            key={index}
            className={`relative bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
              isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            } ${isCurrent ? 'ring-2 ring-red-500' : ''} hover:shadow-lg`}
            onClick={() => handleShotClick(index)}
          >
            {/* Shot placeholder */}
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">{shotInfo.icon}</div>
                <div className="text-sm font-medium text-gray-700">{shotInfo.description}</div>
                <div className="text-lg text-gray-500 mt-1">
                  {ANGLE_INDICATORS[shot.vertical_angle] || '→'}
                </div>
              </div>
            </div>
            
            {/* Shot info overlay */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              {shot.selected_shot}
            </div>
            
            {/* Confidence indicator */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              {(shot.confidence * 100).toFixed(0)}%
            </div>
            
            {/* Emotion indicator */}
            {emotion && (
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs capitalize">
                {emotion.emotion}
              </div>
            )}
            
            {/* Edit button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShotEdit(index);
              }}
              className="absolute bottom-2 right-2 p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Edit3 size={12} />
            </button>
            
            {/* Shot number */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-2">
      {shotSequence.map((shot, index) => {
        const isSelected = selectedShots.includes(index);
        const isCurrent = index === currentShotIndex;
        const shotInfo = SHOT_INFO[shot.selected_shot] || SHOT_INFO.MS;
        const emotion = getEmotionForShot(shot);
        const duration = shot.end_time - shot.start_time;
        
        return (
          <div
            key={index}
            className={`flex items-center space-x-4 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            } ${isCurrent ? 'ring-2 ring-red-500' : ''} hover:shadow-md`}
            onClick={() => handleShotClick(index)}
          >
            {/* Shot number */}
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            
            {/* Shot icon */}
            <div className="text-2xl">{shotInfo.icon}</div>
            
            {/* Shot details */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{shotInfo.description}</span>
                <span className="text-gray-500">{ANGLE_INDICATORS[shot.vertical_angle] || '→'}</span>
                {emotion && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                    {emotion.emotion}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {shot.start_time.toFixed(1)}s - {shot.end_time.toFixed(1)}s ({duration.toFixed(1)}s)
              </div>
              {shot.reasoning && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  {shot.reasoning}
                </div>
              )}
            </div>
            
            {/* Confidence */}
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {(shot.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Confidence</div>
            </div>
            
            {/* Edit button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShotEdit(index);
              }}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded"
            >
              <Edit3 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderDetailed = () => (
    <div className="space-y-6">
      {shotSequence.map((shot, index) => {
        const isSelected = selectedShots.includes(index);
        const isCurrent = index === currentShotIndex;
        const shotInfo = SHOT_INFO[shot.selected_shot] || SHOT_INFO.MS;
        const emotion = getEmotionForShot(shot);
        
        return (
          <div
            key={index}
            className={`bg-white border-2 rounded-lg p-6 transition-all ${
              isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            } ${isCurrent ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>Shot {index + 1}</span>
                  <span className="text-2xl">{shotInfo.icon}</span>
                </h3>
                <p className="text-gray-600">{shotInfo.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {(shot.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">Confidence</div>
                </div>
                <button
                  onClick={() => handleShotEdit(index)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Shot Type:</dt>
                    <dd className="font-medium">{shot.selected_shot}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Vertical Angle:</dt>
                    <dd className="font-medium">{shot.vertical_angle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Horizontal Angle:</dt>
                    <dd className="font-medium">{shot.horizontal_angle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Duration:</dt>
                    <dd className="font-medium">
                      {(shot.end_time - shot.start_time).toFixed(1)}s
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Creative Reasoning</h4>
                <p className="text-sm text-gray-600 italic">
                  {shot.reasoning || 'No reasoning provided'}
                </p>
                {emotion && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                      Based on: {emotion.emotion} ({(emotion.confidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Shot Sequence Preview</h3>
          <div className="flex items-center space-x-4">
            {/* View mode selector */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onPreviewModeChange('storyboard')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  previewMode === 'storyboard' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye size={14} className="inline mr-1" />
                Storyboard
              </button>
              <button
                onClick={() => onPreviewModeChange('timeline')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  previewMode === 'timeline' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ⏱️ Timeline
              </button>
              <button
                onClick={() => onPreviewModeChange('detailed')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  previewMode === 'detailed' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings size={14} className="inline mr-1" />
                Detailed
              </button>
            </div>
            
            {/* Playback controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentShotIndex(Math.max(0, currentShotIndex - 1))}
                className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={handlePlay}
                className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => setCurrentShotIndex(Math.min(shotSequence.length - 1, currentShotIndex + 1))}
                className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {shotSequence.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🎬</div>
            <p>No shots generated yet. Start processing to see the shot sequence.</p>
          </div>
        ) : (
          <>
            {/* Shot counter */}
            <div className="mb-4 text-sm text-gray-600 text-center">
              Shot {currentShotIndex + 1} of {shotSequence.length}
            </div>
            
            {/* Render based on preview mode */}
            {previewMode === 'storyboard' && renderStoryboard()}
            {previewMode === 'timeline' && renderTimeline()}
            {previewMode === 'detailed' && renderDetailed()}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingShot !== null && (
        <div className="p-4 border-t border-gray-200 bg-orange-50">
          <h4 className="font-semibold text-gray-900 mb-3">Edit Shot</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shot Type</label>
              <select
                value={editForm.selected_shot || ''}
                onChange={(e) => setEditForm({ ...editForm, selected_shot: e.target.value as ShotDistance })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select shot type...</option>
                {Object.entries(SHOT_INFO).map(([type, info]) => (
                  <option key={type} value={type}>{info.description}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vertical Angle</label>
              <select
                value={editForm.vertical_angle || ''}
                onChange={(e) => setEditForm({ ...editForm, vertical_angle: e.target.value as CameraAngle })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select angle...</option>
                {Object.keys(ANGLE_INDICATORS).map(angle => (
                  <option key={angle} value={angle}>{angle.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={editForm.start_time || 0}
                onChange={(e) => setEditForm({ ...editForm, start_time: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={editForm.end_time || 0}
                onChange={(e) => setEditForm({ ...editForm, end_time: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reasoning</label>
            <textarea
              value={editForm.reasoning || ''}
              onChange={(e) => setEditForm({ ...editForm, reasoning: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mt-3 flex justify-end space-x-2">
            <button
              onClick={handleEditCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};