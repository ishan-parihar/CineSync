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

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAngles, setNewProfileAngles] = useState<string[]>([]);
  const [newProfileEmotions, setNewProfileEmotions] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // State for editing profile
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileAngles, setEditProfileAngles] = useState<string[]>([]);
  const [editProfileEmotions, setEditProfileEmotions] = useState<string[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

   const fetchProfiles = async () => {
     try {
       setLoading(true);
       const response = await apiEndpoints.getProfiles();
       setProfiles(response.data.profiles);
       setError(null);
     } catch (err) {
       console.error('Error fetching profiles:', err);
       setError('Failed to load profiles');
     } finally {
       setLoading(false);
     }
   };

   const createProfile = async () => {
     try {
       const response = await apiEndpoints.createProfile({
         profile_name: newProfileName,
         supported_angles: newProfileAngles,
         supported_emotions: newProfileEmotions,
       });
       
       if (response.data.error) {
         setError(response.data.error);
         return;
       }
       
       // Reset form
       setNewProfileName('');
       setNewProfileAngles([]);
       setNewProfileEmotions([]);
       setShowCreateForm(false);
       
       // Refresh profiles
       fetchProfiles();
     } catch (err) {
       console.error('Error creating profile:', err);
       setError('Failed to create profile');
     }
   };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked && !newProfileAngles.includes(value)) {
      setNewProfileAngles([...newProfileAngles, value]);
    } else {
      setNewProfileAngles(newProfileAngles.filter(angle => angle !== value));
    }
  };

  const handleEmotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked && !newProfileEmotions.includes(value)) {
      setNewProfileEmotions([...newProfileEmotions, value]);
    } else {
      setNewProfileEmotions(newProfileEmotions.filter(emotion => emotion !== value));
    }
  };

   const openEditModal = async (profile: Profile) => {
     try {
       // Fetch the full profile data for editing
       const response = await apiEndpoints.getProfile(profile.profile_name);
       const fullProfileData = response.data;
       
       // Set the edit form fields with current values
       setEditProfileName(profile.profile_name);
       // For supported_angles, use the values from the config if available
       const supportedAngles = Array.isArray(fullProfileData.profile_info.supported_angles) 
         ? fullProfileData.profile_info.supported_angles 
         : profile.profile_name === 'character_1' 
           ? ['CU', 'ECU', 'MCU', 'MS'] // Default angles
           : [];
       
       // For supported_emotions, extract from the config structure
       let supportedEmotions: string[] = [];
       if (fullProfileData.profile_info.supported_emotions) {
         if (Array.isArray(fullProfileData.profile_info.supported_emotions)) {
           supportedEmotions = fullProfileData.profile_info.supported_emotions;
         } else if (typeof fullProfileData.profile_info.supported_emotions === 'object' && fullProfileData.profile_info.supported_emotions.core) {
           supportedEmotions = fullProfileData.profile_info.supported_emotions.core;
         }
       }
       
       setEditProfileAngles(supportedAngles);
       setEditProfileEmotions(supportedEmotions);
       setEditingProfile(profile);
       setShowEditForm(true);
     } catch (err) {
       console.error('Error fetching profile for editing:', err);
       setError('Failed to load profile data for editing');
     }
   };

  const closeEditModal = () => {
    setShowEditForm(false);
    setEditingProfile(null);
    setEditProfileName('');
    setEditProfileAngles([]);
    setEditProfileEmotions([]);
  };

  const handleEditAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked && !editProfileAngles.includes(value)) {
      setEditProfileAngles([...editProfileAngles, value]);
    } else {
      setEditProfileAngles(editProfileAngles.filter(angle => angle !== value));
    }
  };

  const handleEditEmotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked && !editProfileEmotions.includes(value)) {
      setEditProfileEmotions([...editProfileEmotions, value]);
    } else {
      setEditProfileEmotions(editProfileEmotions.filter(emotion => emotion !== value));
    }
  };

   const updateProfile = async () => {
     if (!editingProfile) return;

     try {
       const response = await apiEndpoints.updateProfile(editingProfile.profile_name, {
         supported_angles: editProfileAngles,
         supported_emotions: editProfileEmotions,
         character_metadata: {
           full_name: editProfileName,
           last_modified: new Date().toISOString()
         }
       });
       
       if (response.data.error) {
         setError(response.data.error);
         return;
       }
       
       // Close the modal and refresh profiles
       closeEditModal();
       fetchProfiles();
     } catch (err) {
       console.error('Error updating profile:', err);
       setError('Failed to update profile');
     }
   };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Profile Management</h1>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
          >
            {showCreateForm ? 'Cancel' : '+ New Profile'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Profile Form */}
        {showCreateForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Profile</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  id="profileName"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter profile name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supported Angles
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['CU', 'ECU', 'MCU', 'MS', 'WS'].map((angle) => (
                    <div key={angle} className="flex items-center">
                      <input
                        id={`angle-${angle}`}
                        type="checkbox"
                        value={angle}
                        checked={newProfileAngles.includes(angle)}
                        onChange={handleAngleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`angle-${angle}`} className="ml-2 text-sm text-gray-700">
                        {angle}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supported Emotions
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'contempt'].map((emotion) => (
                    <div key={emotion} className="flex items-center">
                      <input
                        id={`emotion-${emotion}`}
                        type="checkbox"
                        value={emotion}
                        checked={newProfileEmotions.includes(emotion)}
                        onChange={handleEmotionChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`emotion-${emotion}`} className="ml-2 text-sm text-gray-700">
                        {emotion}
                      </label>
                    </div>
                  ))}
                </div>
               </div>
 
               <button
                 onClick={createProfile}
                 className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
               >
                 Create Profile
               </button>
             </div>
           </div>
         )}
 
         {/* Edit Profile Modal */}
         {showEditForm && editingProfile && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-semibold text-gray-800">Edit Profile: {editingProfile.profile_name}</h2>
                 <button 
                   onClick={closeEditModal}
                   className="text-gray-500 hover:text-gray-700"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label htmlFor="editProfileName" className="block text-sm font-medium text-gray-700 mb-1">
                     Profile Name
                   </label>
                   <input
                     type="text"
                     id="editProfileName"
                     value={editProfileName}
                     onChange={(e) => setEditProfileName(e.target.value)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Enter profile name"
                   />
                 </div>
 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Supported Angles
                   </label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                     {['CU', 'ECU', 'MCU', 'MS', 'WS'].map((angle) => (
                       <div key={angle} className="flex items-center">
                         <input
                           id={`edit-angle-${angle}`}
                           type="checkbox"
                           value={angle}
                           checked={editProfileAngles.includes(angle)}
                           onChange={handleEditAngleChange}
                           className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                         />
                         <label htmlFor={`edit-angle-${angle}`} className="ml-2 text-sm text-gray-700">
                           {angle}
                         </label>
                       </div>
                     ))}
                   </div>
                 </div>
 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Supported Emotions
                   </label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                     {['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'contempt'].map((emotion) => (
                       <div key={emotion} className="flex items-center">
                         <input
                           id={`edit-emotion-${emotion}`}
                           type="checkbox"
                           value={emotion}
                           checked={editProfileEmotions.includes(emotion)}
                           onChange={handleEditEmotionChange}
                           className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                         />
                         <label htmlFor={`edit-emotion-${emotion}`} className="ml-2 text-sm text-gray-700">
                           {emotion}
                         </label>
                       </div>
                     ))}
                   </div>
                 </div>
 
                 <div className="flex justify-end space-x-3 pt-4">
                   <button
                     onClick={closeEditModal}
                     className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-150 ease-in-out"
                   >
                     Cancel
                   </button>
                   <button
                     onClick={updateProfile}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out"
                   >
                     Update Profile
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}
 
         {/* Profiles List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Profiles</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.profile_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.profile_path}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                         profile.validation.valid 
                           ? 'bg-green-100 text-green-800' 
                           : 'bg-red-100 text-red-800'
                       }`}>
                         {profile.validation.valid ? 'Valid' : 'Invalid'}
                      </span>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <button 
                         onClick={() => openEditModal(profile)}
                         className="text-blue-600 hover:text-blue-900 mr-3"
                       >
                         Edit
                       </button>
                       <button className="text-red-600 hover:text-red-900">Delete</button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}