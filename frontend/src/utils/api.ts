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
     getProfiles: () => api.get('/api/profiles/'),
     createProfile: (profileData: any) => api.post('/api/profiles', profileData),
     getProfile: (profileName: string) => api.get(`/api/profiles/${profileName}`),
     updateProfile: (profileName: string, profileData: any) => api.put(`/api/profiles/${profileName}`, profileData),
     getProfileAngles: (profileName: string) => api.get(`/api/profiles/${profileName}/angles`),
     getProfileAngleEmotions: (profileName: string, angleName: string) => api.get(`/api/profiles/${profileName}/angles/${angleName}/emotions`),
    
    // Visemes
    getVisemes: (profileName: string, angleName: string, emotionName: string) => 
      api.get(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}/visemes`),
    uploadViseme: (profileName: string, angleName: string, emotionName: string, visemeName: string, formData: FormData) => 
      api.post(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}/visemes/${visemeName}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    deleteViseme: (profileName: string, angleName: string, emotionName: string, visemeName: string) => 
      api.delete(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}/visemes/${visemeName}`),
    
    // Bulk Viseme Operations
    bulkUploadVisemes: (profileName: string, angleName: string, emotionName: string, formData: FormData) => 
      api.post(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}/visemes/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for bulk upload
      }),
    validateViseme: (profileName: string, angleName: string, emotionName: string, visemeName: string) => 
      api.get(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}/visemes/${visemeName}/validate`),
    batchDeleteVisemes: (profileName: string, angleName: string, emotionName: string, visemeList: string[]) => 
      api.post(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}/visemes/batch-delete`, { visemes: visemeList }),
    
    // Enhanced Profile Management
    getProfileStructure: (profileName: string) => 
      api.get(`/api/profiles/${profileName}/structure`),
    repairProfileStructure: (profileName: string, repairData: any) => 
      api.post(`/api/profiles/${profileName}/repair`, repairData),
    createAngle: (profileName: string, angleName: string, angleData?: any) => 
      api.post(`/api/profiles/${profileName}/angles/${angleName}`, angleData),
    createEmotion: (profileName: string, angleName: string, emotionName: string, emotionData?: any) => 
      api.post(`/api/profiles/${profileName}/angles/${angleName}/emotions/${emotionName}`, emotionData),
    copyEmotion: (profileName: string, copyData: any) => 
      api.post(`/api/profiles/${profileName}/copy-emotion`, copyData),
   
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