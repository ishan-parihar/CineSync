import { useState } from 'react';
import VisemePreview from './VisemePreview';

interface VisemeData {
  viseme: string;
  path: string;
  exists: boolean;
  valid: boolean;
}

interface VisemeGridProps {
  visemes: VisemeData[];
  profileName: string;
  angle: string;
  emotion: string;
  onVisemeUpdate: () => void;
}

const VisemeGrid = ({ visemes, profileName, angle, emotion, onVisemeUpdate }: VisemeGridProps) => {
  const [selectedViseme, setSelectedViseme] = useState<VisemeData | null>(null);

  // Define standard visemes with descriptions
  const standardVisemes = [
    { name: 'A', description: 'Open mouth' },
    { name: 'B', description: 'Lips closed' },
    { name: 'C', description: 'Teeth visible' },
    { name: 'D', description: 'Tongue forward' },
    { name: 'E', description: 'Wide smile' },
    { name: 'F', description: 'Bottom lip out' },
    { name: 'G', description: 'Tongue back' },
    { name: 'H', description: 'Round mouth' },
    { name: 'X', description: 'Neutral/rest' }
  ];

  // Create a map of existing visemes for quick lookup
  const visemeMap = new Map(visemes.map(v => [v.viseme, v]));

  // Create grid of visemes with status
  const visemeGrid = standardVisemes.map(({ name, description }) => {
    const visemeData = visemeMap.get(name);
    return {
      viseme: name,
      description,
      path: `/api/profiles/${profileName}/angles/${angle}/emotions/${emotion}/visemes/${name}/image`,
      ...visemeData,
      exists: !!visemeData,
      valid: visemeData?.valid || false
    };
  });

  const handleVisemeClick = (visemeData: any) => {
    setSelectedViseme(visemeData);
  };

  const handlePreviewClose = () => {
    setSelectedViseme(null);
  };

  // Get status indicator styles
  const getStatusStyles = (exists: boolean, valid: boolean) => {
    if (!exists) {
      return {
        border: 'border-neutral-300',
        bg: 'bg-neutral-100',
        hover: 'hover:bg-neutral-200',
        textColor: 'text-neutral-500',
        statusColor: 'text-neutral-600',
        badgeColor: 'bg-neutral-100 text-neutral-800'
      };
    }
    if (!valid) {
      return {
        border: 'border-error-300',
        bg: 'bg-error-50',
        hover: 'hover:bg-error-100',
        textColor: 'text-error-700',
        statusColor: 'text-error-600',
        badgeColor: 'bg-error-100 text-error-800'
      };
    }
    return {
      border: 'border-success-300',
      bg: 'bg-success-50',
      hover: 'hover:bg-success-100',
      textColor: 'text-success-700',
      statusColor: 'text-success-600',
      badgeColor: 'bg-success-100 text-success-800'
    };
  };

  // Get completion stats
  const completionStats = {
    total: visemeGrid.length,
    exists: visemeGrid.filter(v => v.exists).length,
    valid: visemeGrid.filter(v => v.valid).length,
    missing: visemeGrid.filter(v => !v.exists).length,
    invalid: visemeGrid.filter(v => v.exists && !v.valid).length
  };

  return (
    <div>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="text-center p-3 bg-primary-50 rounded-lg">
          <div className="text-xl font-bold text-primary-600">{completionStats.total}</div>
          <div className="text-xs text-primary-600">Total Visemes</div>
        </div>
        <div className="text-center p-3 bg-success-50 rounded-lg">
          <div className="text-xl font-bold text-success-600">{completionStats.valid}</div>
          <div className="text-xs text-success-600">Valid</div>
        </div>
        <div className="text-center p-3 bg-warning-50 rounded-lg">
          <div className="text-xl font-bold text-warning-600">{completionStats.invalid}</div>
          <div className="text-xs text-warning-600">Invalid</div>
        </div>
        <div className="text-center p-3 bg-error-50 rounded-lg">
          <div className="text-xl font-bold text-error-600">{completionStats.missing}</div>
          <div className="text-xs text-error-600">Missing</div>
        </div>
        <div className="text-center p-3 bg-secondary-50 rounded-lg">
          <div className="text-xl font-bold text-secondary-600">
            {Math.round((completionStats.valid / completionStats.total) * 100)}%
          </div>
          <div className="text-xs text-secondary-600">Complete</div>
        </div>
      </div>

      {/* Viseme Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {visemeGrid.map((visemeData) => {
          const styles = getStatusStyles(visemeData.exists, visemeData.valid);
          
          return (
            <div
              key={visemeData.viseme}
              className={`
                relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
                ${styles.border} ${styles.bg} ${styles.hover}
                ${!visemeData.exists ? 'opacity-60' : ''}
              `}
              onClick={() => handleVisemeClick(visemeData)}
            >
              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles.badgeColor}`}>
                  {visemeData.exists 
                    ? visemeData.valid ? '✓' : '!'
                    : '—'
                  }
                </span>
              </div>

              {/* Viseme Info */}
              <div className="text-center">
                <div className={`text-3xl font-bold mb-1 ${styles.textColor}`}>
                  {visemeData.viseme}
                </div>
                <div className={`text-xs font-medium mb-2 ${styles.statusColor}`}>
                  {visemeData.exists 
                    ? visemeData.valid ? 'Valid' : 'Invalid' 
                    : 'Missing'
                  }
                </div>
                <div className="text-xs text-text-muted">
                  {visemeData.description}
                </div>
              </div>

              {/* Quick Action Indicator */}
              {visemeData.exists && (
                <div className="absolute bottom-2 left-2">
                  <div className="text-xs text-text-disabled">
                    Click to manage
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="text-sm text-text-secondary">
          <span className="font-medium">Quick tips:</span>
          <ul className="mt-1 space-y-1">
            <li>• Click any viseme to upload, replace, or delete it</li>
            <li>• Use the "Bulk Operations" tab for batch uploads</li>
            <li>• Use the "Testing & Validation" tab to check quality</li>
          </ul>
        </div>
      </div>

      {selectedViseme && (
        <VisemePreview
          viseme={selectedViseme}
          profileName={profileName}
          angle={angle}
          emotion={emotion}
          onClose={handlePreviewClose}
          onVisemeUpdate={onVisemeUpdate}
        />
      )}
    </div>
  );
};

export default VisemeGrid;