import { Profile } from './ProfileManager';

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedProfile: Profile | null;
  onProfileSelect: (profile: Profile) => void;
}

const ProfileSelector = ({ profiles, selectedProfile, onProfileSelect }: ProfileSelectorProps) => {
  if (profiles.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        No profiles found. Please create a profile first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {profiles.map((profile) => (
        <div
          key={profile.profile_name}
          className={`p-3 rounded-md cursor-pointer border ${
            selectedProfile?.profile_name === profile.profile_name
              ? 'border-primary-500 bg-primary-50'
              : 'border-border hover:bg-surface-variant'
          }`}
          onClick={() => onProfileSelect(profile)}
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-text-primary">{profile.profile_name}</h4>
              <p className="text-sm text-text-muted">
                {profile.supported_angles.length} angles, {profile.supported_emotions.core.length} emotions
              </p>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              profile.validation.valid
                ? 'bg-success-100 text-success-800'
                : 'bg-error-100 text-error-800'
            }`}>
              {profile.validation.valid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          <div className="mt-2 w-full bg-neutral-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                profile.validation.stats.completion_percentage === 100
                  ? 'bg-success-500'
                  : profile.validation.stats.completion_percentage > 75
                  ? 'bg-warning-500'
                  : 'bg-error-500'
              }`}
              style={{ width: `${profile.validation.stats.completion_percentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {profile.validation.stats.total_assets} / {profile.validation.stats.expected_assets} assets
          </p>
        </div>
      ))}
    </div>
  );
};

export default ProfileSelector;