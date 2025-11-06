'use client';

import { useState, useEffect } from 'react';
import { Upload, Play, Pause, Plus, FolderOpen, Download, Trash2 } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAppStore } from '../../stores/appStore';
import { BatchQueueManager } from '../../components/processing/BatchQueueManager';
import { ProcessingStagesIndicator } from '../../components/processing/ProcessingStagesIndicator';

// Disable static generation
export const dynamic = 'force-dynamic';

export default function BatchPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  
  const { isConnected } = useWebSocket();
  const {
    profiles,
    activeJobs,
    processingQueue,
    setCurrentJob,
    setActiveJobs
  } = useAppStore();

  useEffect(() => {
    // Simulate some jobs for demonstration
    if (activeJobs.length === 0) {
      const mockJobs = [
        {
          id: 'job_1',
          status: 'completed' as const,
          progress: 100,
          profile_id: 'character_1',
          audio_file: 'interview_01.wav',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString(),
          stages: [
            { name: 'initialization', progress: 100, status: 'completed' as const },
            { name: 'emotion_analysis', progress: 100, status: 'completed' as const },
            { name: 'cinematography_decisions', progress: 100, status: 'completed' as const },
            { name: 'video_composition', progress: 100, status: 'completed' as const }
          ]
        },
        {
          id: 'job_2',
          status: 'processing' as const,
          progress: 65,
          profile_id: 'character_1',
          audio_file: 'podcast_02.mp3',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          updated_at: new Date().toISOString(),
          stages: [
            { name: 'initialization', progress: 100, status: 'completed' as const },
            { name: 'emotion_analysis', progress: 100, status: 'completed' as const },
            { name: 'cinematography_decisions', progress: 75, status: 'in_progress' as const },
            { name: 'video_composition', progress: 0, status: 'pending' as const }
          ]
        },
        {
          id: 'job_3',
          status: 'pending' as const,
          progress: 0,
          profile_id: 'character_1',
          audio_file: 'narration_03.wav',
          created_at: new Date(Date.now() - 900000).toISOString(),
          updated_at: new Date(Date.now() - 900000).toISOString(),
          stages: [
            { name: 'initialization', progress: 0, status: 'pending' as const },
            { name: 'emotion_analysis', progress: 0, status: 'pending' as const },
            { name: 'cinematography_decisions', progress: 0, status: 'pending' as const },
            { name: 'video_composition', progress: 0, status: 'pending' as const }
          ]
        }
      ];
      setActiveJobs(mockJobs);
    }
  }, [activeJobs.length, setActiveJobs]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const addToQueue = () => {
    if (selectedFiles.length === 0 || !selectedProfile) return;

    const newJobs = selectedFiles.map(file => ({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const,
      progress: 0,
      profile_id: selectedProfile,
      audio_file: file.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stages: [
        { name: 'initialization', progress: 0, status: 'pending' as const },
        { name: 'emotion_analysis', progress: 0, status: 'pending' as const },
        { name: 'cinematography_decisions', progress: 0, status: 'pending' as const },
        { name: 'video_composition', progress: 0, status: 'pending' as const }
      ]
    }));

    setActiveJobs([...activeJobs, ...newJobs]);
    setSelectedFiles([]);
    setSelectedProfile('');
  };

  const handleJobStart = (jobId: string) => {
    const updatedJobs = activeJobs.map(job => 
      job.id === jobId 
        ? { ...job, status: 'processing' as const, progress: 0, updated_at: new Date().toISOString() }
        : job
    );
    setActiveJobs(updatedJobs);
  };

  const handleJobPause = (jobId: string) => {
    const updatedJobs = activeJobs.map(job => 
      job.id === jobId 
        ? { ...job, status: 'pending' as const, updated_at: new Date().toISOString() }
        : job
    );
    setActiveJobs(updatedJobs);
  };

  const handleJobStop = (jobId: string) => {
    const updatedJobs = activeJobs.map(job => 
      job.id === jobId 
        ? { ...job, status: 'pending' as const, progress: 0, updated_at: new Date().toISOString() }
        : job
    );
    setActiveJobs(updatedJobs);
  };

  const handleJobRemove = (jobId: string) => {
    setActiveJobs(activeJobs.filter(job => job.id !== jobId));
  };

  const handleJobReorder = (jobId: string, direction: 'up' | 'down') => {
    const queueJobs = activeJobs.filter(job => job.status === 'pending');
    const otherJobs = activeJobs.filter(job => job.status !== 'pending');
    const currentIndex = queueJobs.findIndex(job => job.id === jobId);
    
    if (currentIndex === -1) return;
    
    const newQueue = [...queueJobs];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newQueue.length) return;
    
    // Swap positions
    [newQueue[currentIndex], newQueue[targetIndex]] = [newQueue[targetIndex], newQueue[currentIndex]];
    
    setActiveJobs([...otherJobs, ...newQueue]);
  };

  const handleBatchStart = () => {
    setIsProcessingBatch(true);
    // Start first pending job
    const pendingJobs = activeJobs.filter(job => job.status === 'pending');
    if (pendingJobs.length > 0) {
      handleJobStart(pendingJobs[0].id);
    }
  };

  const handleBatchPause = () => {
    setIsProcessingBatch(false);
    // Pause all processing jobs
    const processingJobs = activeJobs.filter(job => job.status === 'processing');
    processingJobs.forEach(job => handleJobPause(job.id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalFileSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const getQueueJobs = () => {
    return activeJobs.filter(job => job.status === 'pending');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <FolderOpen className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">Batch Processing</h1>
              {isConnected && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  Connected
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Queue:</span> {getQueueJobs().length} jobs
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Active:</span> {activeJobs.filter(job => job.status === 'processing').length} jobs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - File Upload */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Add Files to Batch</h3>
              </div>
              
              <div className="p-4">
                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Supports MP3, WAV, M4A audio files
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Select Files
                  </label>
                </div>

                {/* Profile Selection */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Profile
                  </label>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a profile...</option>
                    {profiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add to Queue Button */}
                <button
                  onClick={addToQueue}
                  disabled={selectedFiles.length === 0 || !selectedProfile}
                  className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {selectedFiles.length} Files to Queue
                </button>
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Selected Files</h3>
                    <span className="text-sm text-gray-600">
                      {formatFileSize(getTotalFileSize())}
                    </span>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-2 p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Jobs:</span>
                  <span className="font-medium">{activeJobs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">
                    {activeJobs.filter(job => job.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing:</span>
                  <span className="font-medium text-blue-600">
                    {activeJobs.filter(job => job.status === 'processing').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-medium text-gray-600">
                    {activeJobs.filter(job => job.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">
                    {activeJobs.filter(job => job.status === 'failed').length}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Estimated total time: ~{activeJobs.length * 2} minutes
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Queue Management */}
          <div className="lg:col-span-2">
            <BatchQueueManager />
          </div>
        </div>

        {/* Processing Stages */}
        {activeJobs.some(job => job.status === 'processing') && (
          <div className="mt-8">
            <ProcessingStagesIndicator className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}