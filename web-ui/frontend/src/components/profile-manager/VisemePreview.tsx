import { useState } from 'react';
import { apiEndpoints } from '../../utils/api';

interface VisemeData {
  viseme: string;
  path: string;
  exists: boolean;
  valid: boolean;
}

interface VisemePreviewProps {
  viseme: VisemeData;
  profileName: string;
  angle: string;
  emotion: string;
  onClose: () => void;
  onVisemeUpdate: () => void;
}

const VisemePreview = ({ viseme, profileName, angle, emotion, onClose, onVisemeUpdate }: VisemePreviewProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await apiEndpoints.uploadViseme(profileName, angle, emotion, viseme.viseme, formData);
      onVisemeUpdate();
      onClose();
    } catch (error) {
      console.error('Error uploading viseme:', error);
      setUploadError('Failed to upload viseme: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the ${viseme.viseme} viseme?`)) {
      return;
    }

    try {
      await apiEndpoints.deleteViseme(profileName, angle, emotion, viseme.viseme);
      onVisemeUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting viseme:', error);
      setUploadError('Failed to delete viseme: ' + (error as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-modal p-4">
      <div className="bg-surface rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface-variant">
          <div>
            <h3 className="text-xl font-bold text-text-primary">
              Viseme {viseme.viseme}
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {profileName} • {angle} • {emotion}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors duration-200"
          >
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viseme.exists ? (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="flex justify-center bg-surface-variant rounded-xl p-8">
                <div className="relative">
                  <img
                    src={`/api/profiles/${profileName}/angles/${angle}/emotions/${emotion}/visemes/${viseme.viseme}/image`}
                    alt={`Viseme ${viseme.viseme}`}
                    className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                  />
                  <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium ${
                    viseme.valid 
                      ? 'badge-success' 
                      : 'badge-error'
                  }`}>
                    {viseme.valid ? '✓ Valid' : '⚠ Invalid'}
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-variant p-4 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      viseme.valid ? 'bg-success-500' : 'bg-error-500'
                    }`}></div>
                    <h4 className="font-semibold text-text-primary">Status</h4>
                  </div>
                  <p className={`text-sm font-medium ${
                    viseme.valid ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {viseme.valid ? 'Valid Image' : 'Invalid or Corrupted'}
                  </p>
                </div>
                
                <div className="bg-surface-variant p-4 rounded-xl">
                  <h4 className="font-semibold text-text-primary mb-2">File Path</h4>
                  <p className="text-sm text-text-secondary break-all font-mono bg-surface p-2 rounded border border-border">
                    {viseme.path}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <label className="flex-1 btn-primary btn-md font-medium cursor-pointer transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{isUploading ? 'Replacing...' : 'Replace Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                
                <button
                  onClick={handleDelete}
                  className="btn-danger btn-md transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="btn-outline btn-md transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Empty State */}
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  No Viseme Image
                </h3>
                <p className="text-text-secondary max-w-md mx-auto">
                  No viseme image found for {viseme.viseme}. Upload an image to get started.
                </p>
              </div>

              {/* Upload Requirements */}
              <div className="bg-info-50 border border-info-200 rounded-xl p-6">
                <h4 className="font-semibold text-info-900 mb-3 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Upload Requirements</span>
                </h4>
                <ul className="space-y-2 text-sm text-info-800">
                  <li className="flex items-start space-x-2">
                    <span className="text-info-600 mt-1">•</span>
                    <span>Supported formats: PNG, JPG, JPEG, WebP</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-info-600 mt-1">•</span>
                    <span>Recommended: PNG with transparency (alpha channel)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-info-600 mt-1">•</span>
                    <span>Proper mouth shape for the {viseme.viseme} viseme</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-info-600 mt-1">•</span>
                    <span>Recommended size: 256x256px or larger</span>
                  </li>
                </ul>
              </div>

              {/* Upload Button */}
              <div className="space-y-3">
                <label className="block btn-primary btn-md font-medium cursor-pointer transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl">
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Upload Viseme Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>

                <button
                  onClick={onClose}
                  className="w-full btn-outline btn-md transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="mt-6 bg-error-50 border border-error-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-error-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-error-900">Error</h4>
                  <p className="text-sm text-error-700">{uploadError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisemePreview;