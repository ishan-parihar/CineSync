import axios from 'axios';

// Create an axios instance with base configuration
const api = axios.create({
  baseURL: '', // Use relative paths for proxy
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication if needed
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here (e.g., auth tokens)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle responses globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const apiEndpoints = {
  // System info
  getSystemInfo: () => api.get('/api/system-info'),
  
   // Profiles
   getProfiles: () => api.get('/api/profiles'),
   createProfile: (profileData: any) => api.post('/api/profiles', profileData),
   getProfile: (profileName: string) => api.get(`/api/profiles/${profileName}`),
   updateProfile: (profileName: string, profileData: any) => api.put(`/api/profiles/${profileName}`, profileData),
  
  // Processing
  startProcessing: (jobData: any) => api.post('/api/process', jobData),
  getJobs: () => api.get('/api/jobs'),
  getJob: (jobId: string) => api.get(`/api/jobs/${jobId}`),
  
  // File upload
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
   // Settings
   getSettings: () => api.get('/api/settings'),
   updateSettings: (settingsData: any) => api.put('/api/settings', settingsData),
   
   // Health check
   healthCheck: () => api.get('/api/health'),
 };