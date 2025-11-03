 'use client';

import { useState, useEffect } from 'react';
import { apiEndpoints } from '../../utils/api';

interface Profile {
  profile_name: string;
  profile_path: string;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    missing_assets: string[];
    stats: {
      total_assets: number;
      expected_assets: number;
      completion_percentage: number;
    };
  };
}

interface Job {
  job_id: string;
  audio_path: string;
  profile_name: string;
  output_path: string;
  cinematic_mode: string;
  status: string;
  progress: number;
  start_time: string;
  error?: string;
  end_time?: string;
  result?: any;
}

export default function ProcessPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [outputPath, setOutputPath] = useState('');
  const [cinematicMode, setCinematicMode] = useState('balanced');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

// Initialize WebSocket connection to the processing status endpoint
     useEffect(() => {
       let ws: WebSocket;
       
       // Function to establish WebSocket connection
       const connectWebSocket = () => {
         try {
           // Determine backend URL based on environment and current location
           let wsUrl: string;
           
           if (typeof window !== 'undefined') {
             // Client-side: use environment variable or construct from current location
             const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
             
             if (envBackendUrl) {
               // If NEXT_PUBLIC_BACKEND_URL has protocol, use it; otherwise construct from it
               if (envBackendUrl.startsWith('http://')) {
                 wsUrl = envBackendUrl.replace('http://', 'ws://') + '/ws/processing-status';
               } else if (envBackendUrl.startsWith('https://')) {
                 wsUrl = envBackendUrl.replace('https://', 'wss://') + '/ws/processing-status';
               } else {
                 // Assume it's just host:port
                 const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                 wsUrl = `${wsProtocol}//${envBackendUrl}/ws/processing-status`;
               }
             } else {
               // No environment variable, construct from current location
               // For Docker setup, we may need to try different approaches
               const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
               const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || window.location.hostname;
               const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8001';
               wsUrl = `${wsProtocol}//${backendHost}:${backendPort}/ws/processing-status`;
             }
           } else {
             // Server-side (shouldn't happen in useEffect, but for safety)
             wsUrl = 'ws://localhost:8001/ws/processing-status';
           }
           
           console.log('Attempting to connect to WebSocket:', wsUrl);
           
           ws = new WebSocket(wsUrl);
           
           ws.onopen = () => {
             console.log('Connected to WebSocket');
             setWsConnected(true);
           };

           ws.onclose = (event) => {
             console.log('Disconnected from WebSocket', event);
             setWsConnected(false);
             
             // Attempt to reconnect after a delay
             setTimeout(() => {
               if (typeof window !== 'undefined') {
                 connectWebSocket();
               }
             }, 3000); // Reconnect after 3 seconds
           };

           ws.onerror = (error: Event) => {
             console.error('WebSocket error:', error);
             setWsConnected(false);
           };

           // Listen for processing status updates
           ws.onmessage = (event) => {
             try {
               const data = JSON.parse(event.data);
               // Update jobs list with the received data
               const updatedJobs = Object.values(data.jobs || {}) as Job[];
               setJobs(updatedJobs);
             } catch (error) {
               console.error('Error parsing WebSocket message:', error);
             }
           };
         } catch (error) {
           console.error('Error creating WebSocket connection:', error);
           setWsConnected(false);
         }
       };
       
       connectWebSocket();

      // Cleanup on unmount
      return () => {
        if (ws) {
          ws.close();
        }
      };
    }, []);

  useEffect(() => {
    fetchProfiles();
    fetchJobs();
  }, []);

   const fetchProfiles = async () => {
     try {
       setLoadingProfiles(true);
       const response = await apiEndpoints.getProfiles();
       setProfiles(response.data.profiles);
       setError(null);
     } catch (err) {
       console.error('Error fetching profiles:', err);
       setError('Failed to load profiles');
     } finally {
       setLoadingProfiles(false);
     }
   };

   const fetchJobs = async () => {
     try {
       const response = await apiEndpoints.getJobs();
       setJobs(Object.values(response.data.jobs) as Job[]);
     } catch (err) {
       console.error('Error fetching jobs:', err);
     }
   };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAudioFile(e.target.files[0]);
    }
  };

   const startProcessing = async () => {
     if (!audioFile) {
       setError('Please select an audio file');
       return;
     }

     try {
       // First upload the file to the server
       const uploadResponse = await apiEndpoints.uploadFile(audioFile);
       
       const audioPath = uploadResponse.data.path; // Assuming the server returns the path
       
       // Then start processing
       const processResponse = await apiEndpoints.startProcessing({
         audio_path: audioPath,
         profile: selectedProfile,
         output_path: outputPath || `output/${audioFile.name.replace(/\.[^/.]+$/, '')}_processed.mp4`,
         cinematic_mode: cinematicMode,
       });
       
       if (processResponse.data.error) {
         setError(processResponse.data.error);
         return;
       }
       
       // Reset form
       setAudioFile(null);
       setSelectedProfile('');
       setOutputPath('');
       
       // Jobs will be updated via WebSocket
       console.log('Processing started:', processResponse.data);
     } catch (err) {
       console.error('Error starting processing:', err);
       setError('Failed to start processing');
     }
   };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Processing</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* WebSocket Status */}
        <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200">
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>WebSocket Status: {wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Processing Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Start New Processing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700 mb-1">
                Audio File
              </label>
              <input
                type="file"
                id="audioFile"
                accept="audio/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {audioFile && (
                <p className="mt-1 text-sm text-gray-500">
                  Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="profile" className="block text-sm font-medium text-gray-700 mb-1">
                Character Profile
              </label>
              {loadingProfiles ? (
                <p>Loading profiles...</p>
              ) : (
                <select
                  id="profile"
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a profile</option>
                  {profiles
                    .filter(profile => profile.validation.valid)
                    .map((profile, index) => (
                      <option key={index} value={profile.profile_name}>
                        {profile.profile_name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="outputPath" className="block text-sm font-medium text-gray-700 mb-1">
                Output Path (optional)
              </label>
              <input
                type="text"
                id="outputPath"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="output/output.mp4"
              />
            </div>

            <div>
              <label htmlFor="cinematicMode" className="block text-sm font-medium text-gray-700 mb-1">
                Cinematic Mode
              </label>
              <select
                id="cinematicMode"
                value={cinematicMode}
                onChange={(e) => setCinematicMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="balanced">Balanced</option>
                <option value="dynamic">Dynamic</option>
                <option value="subtle">Subtle</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={startProcessing}
              disabled={!audioFile || !selectedProfile}
              className={`px-4 py-2 rounded-md transition duration-150 ease-in-out ${
                audioFile && selectedProfile
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
            >
              Start Processing
            </button>
          </div>
        </div>

        {/* Active Jobs */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Active Processing Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500">No active jobs</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.job_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.profile_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          job.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : job.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              job.status === 'error' ? 'bg-red-600' : 'bg-blue-600'
                            }`} 
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{job.progress}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(job.start_time).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}