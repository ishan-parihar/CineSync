import { Profile } from './ProfileManager';

interface AngleSelectorProps {
  profile: Profile | null;
  structureAnalysis: any;
  selectedAngle: string | null;
  onAngleSelect: (angle: string) => void;
  disabled: boolean;
}

const AngleSelector = ({ profile, structureAnalysis, selectedAngle, onAngleSelect, disabled }: AngleSelectorProps) => {
  if (disabled || !profile) {
    return (
      <div className="text-center py-8 text-text-muted">
        Select a profile first
      </div>
    );
  }

  if (profile.supported_angles.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        No angles configured for this profile
      </div>
    );
  }

  // Get actual available angles from structure analysis
  const availableAngles = structureAnalysis ? 
    Object.keys(structureAnalysis.actual_structure).filter(angle => 
      structureAnalysis.actual_structure[angle].exists
    ) : [];

  const angles = profile.supported_angles;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {angles.map((angle) => {
          const isAvailable = availableAngles.includes(angle);
          const angleData = structureAnalysis?.actual_structure[angle];
          
          return (
            <div
              key={angle}
              className={`p-3 rounded-md cursor-pointer border text-center relative ${
                selectedAngle === angle
                  ? 'border-primary-500 bg-primary-50'
                  : isAvailable
                  ? 'border-border hover:bg-surface-variant'
                  : 'border-error-200 bg-error-50 hover:bg-error-100'
              }`}
              onClick={() => onAngleSelect(angle)}
            >
              <div className="font-medium text-text-primary">{angle}</div>
              {!isAvailable && (
                <div className="text-xs text-error-600 mt-1">Missing</div>
              )}
              {isAvailable && angleData && (
                <div className="text-xs text-success-600 mt-1">
                  {angleData.completion.toFixed(0)}% complete
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {availableAngles.length < angles.length && (
        <div className="text-sm text-warning-600 bg-warning-50 p-2 rounded">
          ⚠️ Some angles are missing. Use the profile dashboard to repair the structure.
        </div>
      )}
    </div>
  );
};

export default AngleSelector;