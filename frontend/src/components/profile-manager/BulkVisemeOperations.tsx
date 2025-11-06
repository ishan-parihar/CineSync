'use client';

import { useState, useCallback } from 'react';
import { apiEndpoints } from '../../utils/api';

interface BulkVisemeOperationsProps {
  profileName: string;
  angle: string;
  emotion: string;
  onVisemesUpdate: () => void;
  disabled?: boolean;
}

interface MissingViseme {
  viseme: string;
  status: 'missing' | 'invalid' | 'empty';
  issue: string;
}

interface BulkUploadResult {
  success: boolean;
  uploaded: string[];
  failed: { viseme: string; error: string }[];
  total: number;
}

const BulkVisemeOperations = ({ 
  profileName, 
  angle, 
  emotion, 
  onVisemesUpdate, 
  disabled = false 
}: BulkVisemeOperationsProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [scanResults, setScanResults] = useState<MissingViseme[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Scan for missing or invalid visemes
  const scanForMissingVisemes = useCallback(async () => {
    if (disabled) return;
    
    try {
      setIsScanning(true);
      setError(null);
      
      const response = await apiEndpoints.getVisemes(profileName, angle, emotion);
      const visemes = response.data?.data?.visemes || [];
      
      const missing: MissingViseme[] = visemes
        .filter((v: any) => !v.exists || !v.valid)
        .map((v: any) => ({
          viseme: v.viseme,
          status: !v.exists ? 'missing' : !v.valid ? 'invalid' : 'empty',
          issue: !v.exists ? 'File not found' : !v.valid ? 'Invalid image format' : 'Empty file'
        }));
      
      setScanResults(missing);
      
      if (missing.length === 0) {
        setSuccess('All visemes are present and valid!');
      } else {
        setSuccess(`Found ${missing.length} viseme(s) that need attention`);
      }
    } catch (err) {
      console.error('Error scanning visemes:', err);
      setError('Failed to scan visemes');
    } finally {
      setIsScanning(false);
    }
  }, [profileName, angle, emotion, disabled]);

  // Handle file selection for bulk upload
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Validate file types
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const invalidFiles = Array.from(files).filter(f => !validTypes.includes(f.type));
      
      if (invalidFiles.length > 0) {
        setError(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      setSelectedFiles(files);
      setError(null);
    }
  };

  // Bulk upload visemes
  const handleBulkUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      setError(null);
      setSuccess(null);
      
      const results: BulkUploadResult = {
        success: true,
        uploaded: [],
        failed: [],
        total: selectedFiles.length
      };
      
      // Map files to visemes based on filename
      const visemeMap = new Map<string, File>();
      Array.from(selectedFiles).forEach(file => {
        // Extract viseme name from filename (e.g., "viseme_A.jpg" -> "A")
        const match = file.name.match(/viseme_([A-HX])\.(jpg|jpeg|png|webp)$/i);
        if (match) {
          visemeMap.set(match[1].toUpperCase(), file);
        }
      });
      
      let processed = 0;
      for (const [viseme, file] of visemeMap) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          
          await apiEndpoints.uploadViseme(profileName, angle, emotion, viseme, formData);
          results.uploaded.push(viseme);
        } catch (err) {
          console.error(`Failed to upload viseme ${viseme}:`, err);
          results.failed.push({ 
            viseme, 
            error: err instanceof Error ? err.message : 'Upload failed' 
          });
          results.success = false;
        }
        
        processed++;
        setUploadProgress(Math.round((processed / visemeMap.size) * 100));
      }
      
      if (results.success || results.uploaded.length > 0) {
        setSuccess(`Successfully uploaded ${results.uploaded.length} viseme(s)`);
        if (results.failed.length > 0) {
          setError(`Failed to upload ${results.failed.length} viseme(s)`);
        }
      } else {
        setError('All uploads failed');
      }
      
      // Refresh visemes and reset
      onVisemesUpdate();
      setSelectedFiles(null);
      setShowBulkUpload(false);
      setScanResults([]);
      
    } catch (err) {
      console.error('Bulk upload error:', err);
      setError('Bulk upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFiles, profileName, angle, emotion, onVisemesUpdate]);

  // Batch delete invalid visemes
  const handleBatchDelete = useCallback(async () => {
    if (scanResults.length === 0) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      const invalidVisemes = scanResults
        .filter(v => v.status === 'invalid' || v.status === 'empty')
        .map(v => v.viseme);
      
      for (const viseme of invalidVisemes) {
        try {
          await apiEndpoints.deleteViseme(profileName, angle, emotion, viseme);
        } catch (err) {
          console.error(`Failed to delete viseme ${viseme}:`, err);
        }
      }
      
      setSuccess(`Removed ${invalidVisemes.length} invalid viseme(s)`);
      onVisemesUpdate();
      setScanResults([]);
      
    } catch (err) {
      console.error('Batch delete error:', err);
      setError('Failed to delete invalid visemes');
    } finally {
      setIsUploading(false);
    }
  }, [scanResults, profileName, angle, emotion, onVisemesUpdate]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-error-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-error-900">Error</h4>
              <p className="text-sm text-error-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-success-900">Success</h4>
              <p className="text-sm text-success-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-surface-variant rounded-lg">
        <button
          onClick={scanForMissingVisemes}
          disabled={disabled || isScanning}
          className="flex-1 btn-outline btn-md border-2 border-primary-500 text-primary-600 hover:bg-primary-50 disabled:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {isScanning ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Scan for Issues</span>
            </>
          )}
        </button>
        
        <button
          onClick={() => setShowBulkUpload(!showBulkUpload)}
          disabled={disabled}
          className="flex-1 btn-outline btn-md border-2 border-success-500 text-success-600 hover:bg-success-50 disabled:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Bulk Upload</span>
        </button>
        
        {scanResults.length > 0 && (
          <button
            onClick={handleBatchDelete}
            disabled={disabled || isUploading || !scanResults.some(v => v.status === 'invalid' || v.status === 'empty')}
            className="flex-1 btn-outline btn-md border-2 border-error-500 text-error-600 hover:bg-error-50 disabled:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Invalid</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-warning-900">Issues Detected</h4>
              <p className="text-sm text-warning-700">
                Found {scanResults.length} viseme(s) that need attention
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scanResults.map((viseme) => (
              <div
                key={viseme.viseme}
                className={`
                  p-3 rounded-lg border flex items-center justify-between
                  ${
                    viseme.status === 'missing' 
                      ? 'bg-error-50 border-error-200' 
                      : viseme.status === 'invalid' 
                      ? 'bg-warning-50 border-warning-200'
                      : 'bg-warning-100 border-warning-200'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${
                      viseme.status === 'missing' 
                        ? 'bg-error-100 text-error-800' 
                        : viseme.status === 'invalid' 
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-warning-100 text-warning-800'
                    }
                  `}>
                    {viseme.viseme}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Viseme {viseme.viseme}</p>
                    <p className="text-xs text-text-secondary capitalize">{viseme.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${
                      viseme.status === 'missing' 
                        ? 'bg-error-100 text-error-800' 
                        : viseme.status === 'invalid' 
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-warning-100 text-warning-800'
                    }
                  `}>
                    {viseme.issue}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-warning-100 rounded-lg">
            <p className="text-sm text-warning-800">
              <strong>Recommended actions:</strong> Use "Bulk Upload" to add missing visemes or "Delete Invalid" to remove corrupted files.
            </p>
          </div>
        </div>
      )}

      {/* Bulk Upload Interface */}
      {showBulkUpload && (
        <div className="bg-surface border-2 border-border rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-text-primary">Bulk Upload Visemes</h4>
            <button
              onClick={() => {
                setShowBulkUpload(false);
                setSelectedFiles(null);
                setError(null);
              }}
              disabled={isUploading}
              className="text-text-muted hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Select viseme images (JPG, PNG, WebP)
              </label>
              
              {/* Drag and Drop Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelection}
                  className="hidden"
                  id="bulk-file-input"
                />
                <label
                  htmlFor="bulk-file-input"
                  className="cursor-pointer flex flex-col items-center space-y-3"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">Click to upload or drag and drop</p>
                    <p className="text-text-muted text-sm">PNG, JPG, WebP up to 10MB each</p>
                  </div>
                </label>
              </div>
              
              <div className="mt-3 p-3 bg-info-50 rounded-lg">
                <p className="text-sm text-info-800">
                  <strong>Naming convention:</strong> Files should be named exactly as:
                  <code className="ml-1 px-2 py-1 bg-info-100 rounded text-xs">viseme_A.jpg</code>, 
                  <code className="ml-1 px-2 py-1 bg-info-100 rounded text-xs">viseme_B.jpg</code>, ..., 
                  <code className="ml-1 px-2 py-1 bg-info-100 rounded text-xs">viseme_X.jpg</code>
                </p>
              </div>
            </div>

            {/* Selected Files Display */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="bg-surface-variant rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-text-primary">Selected Files ({selectedFiles.length})</h5>
                  <button
                    onClick={() => setSelectedFiles(null)}
                    className="text-sm text-error-600 hover:text-error-800 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {Array.from(selectedFiles).map((file, index) => {
                    const visemeMatch = file.name.match(/viseme_([A-HX])\./i);
                    const visemeName = visemeMatch ? visemeMatch[1].toUpperCase() : '?';
                    const isValidName = !!visemeMatch;
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isValidName 
                            ? 'bg-surface border-success-200' 
                            : 'bg-error-50 border-error-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isValidName ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                          }`}>
                            {visemeName}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{file.name}</p>
                            <p className="text-xs text-text-muted">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        {!isValidName && (
                          <div className="text-xs text-error-600 font-medium">
                            Invalid name
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">Uploading...</span>
                  <span className="text-sm text-text-secondary">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="h-full bg-neutral-0 bg-opacity-20 animate-pulse"></div>
                  </div>
                </div>
                <p className="text-xs text-text-muted text-center">
                  Please wait while we process your files...
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <button
                onClick={handleBulkUpload}
                disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
                className="flex-1 btn-primary btn-md disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Uploading... {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload All Files</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowBulkUpload(false);
                  setSelectedFiles(null);
                  setError(null);
                }}
                disabled={isUploading}
                className="btn-outline btn-md disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkVisemeOperations;