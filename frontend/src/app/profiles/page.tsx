'use client';

import ProfileManager from '../../components/profile-manager/ProfileManager';

export default function ProfilesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Profile Management</h1>
            <p className="text-slate-400">
              Manage character profiles, angles, emotions, and visemes for lip sync animation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              System Online
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ProfileManager />
    </div>
  );
}