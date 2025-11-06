import { Profile } from './ProfileManager';

interface EmotionSelectorProps {
  profile: Profile | null;
  selectedEmotion: string | null;
  onEmotionSelect: (emotion: string) => void;
  disabled: boolean;
  selectedAngle: string | null;
  structureAnalysis: any;
}

const EmotionSelector = ({ profile, selectedEmotion, onEmotionSelect, disabled, selectedAngle, structureAnalysis }: EmotionSelectorProps) => {
  if (disabled || !profile || !selectedAngle) {
    return (
      <div className="text-center py-8 text-text-muted">
        Select a profile and angle first
      </div>
    );
  }

  const emotions = profile.supported_emotions.core;

  if (emotions.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        No emotions configured for this profile
      </div>
    );
  }

  // Get actual available emotions for the selected angle
  const angleData = structureAnalysis?.actual_structure[selectedAngle];
  const availableEmotions = angleData ? 
    Object.keys(angleData.emotions).filter(emotion => 
      angleData.emotions[emotion].exists
    ) : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {emotions.map((emotion) => {
          const isAvailable = availableEmotions.includes(emotion);
          const emotionData = angleData?.emotions[emotion];
          
          return (
            <div
              key={emotion}
              className={`p-3 rounded-md cursor-pointer border text-center relative ${
                selectedEmotion === emotion
                  ? 'border-primary-500 bg-primary-50'
                  : isAvailable
                  ? 'border-border hover:bg-surface-variant'
                  : 'border-error-200 bg-error-50 hover:bg-error-100'
              }`}
              onClick={() => onEmotionSelect(emotion)}
            >
              <div className="font-medium text-text-primary capitalize">{emotion}</div>
              {!isAvailable && (
                <div className="text-xs text-error-600 mt-1">Missing</div>
              )}
              {isAvailable && emotionData && (
                <div className="text-xs text-success-600 mt-1">
                  {emotionData.completion.toFixed(0)}% complete
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {availableEmotions.length < emotions.length && (
        <div className="text-sm text-warning-600 bg-warning-50 p-2 rounded">
          ⚠️ Some emotions are missing for this angle. Use the profile dashboard to repair the structure.
        </div>
      )}
    </div>
  );
};

export default EmotionSelector;