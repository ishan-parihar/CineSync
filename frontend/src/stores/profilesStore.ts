/**
 * Profiles Store - Domain-specific store for profile management
 * Handles character profiles, validation, and asset management
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware';
import type { 
  ProfileConfig, 
  ProfileStructureAnalysis, 
  ShotDistance, 
  AssetSpecifications,
  CharacterMetadata 
} from '../types';

// Store state interface
interface ProfilesState {
  // Core data
  profiles: ProfileConfig[];
  activeProfileId: string | null;
  profileAnalyses: Record<string, ProfileStructureAnalysis>;
  
  // Loading states
  loading: {
    profiles: boolean;
    profile: boolean;
    analysis: boolean;
    validation: boolean;
  };
  
  // Error states
  errors: Record<string, string | null>;
  
  // UI state
  selectedProfileId: string | null;
  filterCriteria: {
    emotion?: string;
    shotType?: ShotDistance;
    isValid?: boolean;
  };
  sortBy: 'name' | 'created' | 'modified' | 'completeness';
  sortOrder: 'asc' | 'desc';
  
  // Optimistic updates
  pendingOperations: Record<string, {
    type: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }>;
  
  // Cache
  lastFetchTime: number | null;
  cacheExpiry: number; // 5 minutes
}

// Store actions interface
interface ProfilesActions {
  // Basic actions
  setProfiles: (profiles: ProfileConfig[]) => void;
  setActiveProfile: (profileId: string | null) => void;
  addProfile: (profile: ProfileConfig) => void;
  updateProfile: (profileId: string, updates: Partial<ProfileConfig>) => void;
  deleteProfile: (profileId: string) => void;
  
  // Analysis actions
  setProfileAnalysis: (profileId: string, analysis: ProfileStructureAnalysis) => void;
  clearProfileAnalysis: (profileId: string) => void;
  
  // Loading and error actions
  setLoading: (key: keyof ProfilesState['loading'], value: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  
  // UI actions
  setSelectedProfile: (profileId: string | null) => void;
  setFilterCriteria: (criteria: Partial<ProfilesState['filterCriteria']>) => void;
  setSorting: (sortBy: ProfilesState['sortBy'], sortOrder: ProfilesState['sortOrder']) => void;
  
  // Optimistic updates
  addPendingOperation: (profileId: string, operation: ProfilesState['pendingOperations'][string]) => void;
  removePendingOperation: (profileId: string) => void;
  commitPendingOperation: (profileId: string) => void;
  rollbackPendingOperation: (profileId: string) => void;
  
  // Cache management
  invalidateCache: () => void;
  refreshProfiles: () => Promise<void>;
  
  // Bulk operations
  bulkDelete: (profileIds: string[]) => void;
  bulkValidate: (profileIds: string[]) => Promise<Record<string, ProfileStructureAnalysis>>;
  
  // Utility actions
  resetStore: () => void;
}

// Computed selectors
interface ProfilesSelectors {
  // Derived data
  activeProfile: ProfileConfig | null;
  selectedProfile: ProfileConfig | null;
  filteredProfiles: ProfileConfig[];
  validProfiles: ProfileConfig[];
  invalidProfiles: ProfileConfig[];
  
  // Statistics
  totalProfiles: number;
  validProfileCount: number;
  averageCompleteness: number;
  
  // Status checks
  hasProfiles: boolean;
  isLoading: boolean;
  hasErrors: boolean;
  hasPendingOperations: boolean;
  
  // Cache status
  isCacheExpired: boolean;
}

// Initial state
const initialState: ProfilesState = {
  profiles: [],
  activeProfileId: null,
  profileAnalyses: {},
  
  loading: {
    profiles: false,
    profile: false,
    analysis: false,
    validation: false,
  },
  
  errors: {},
  
  selectedProfileId: null,
  filterCriteria: {},
  sortBy: 'name',
  sortOrder: 'asc',
  
  pendingOperations: {},
  
  lastFetchTime: null,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
};

// Create the store
export const useProfilesStore = create<ProfilesState & ProfilesActions & ProfilesSelectors>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        // Basic actions
        setProfiles: (profiles) => {
          set({ 
            profiles,
            lastFetchTime: Date.now(),
            errors: { ...get().errors, profiles: null }
          });
        },
        
        setActiveProfile: (profileId) => {
          set({ activeProfileId: profileId });
        },
        
        addProfile: (profile) => {
          set((state) => ({
            profiles: [...state.profiles, profile],
            errors: { ...state.errors, create: null }
          }));
        },
        
        updateProfile: (profileId, updates) => {
          set((state) => ({
            profiles: state.profiles.map(p => 
              p.profile_name === profileId ? { ...p, ...updates } : p
            ),
            errors: { ...state.errors, update: null }
          }));
        },
        
        deleteProfile: (profileId) => {
          set((state) => ({
            profiles: state.profiles.filter(p => p.profile_name !== profileId),
            activeProfileId: state.activeProfileId === profileId ? null : state.activeProfileId,
            selectedProfileId: state.selectedProfileId === profileId ? null : state.selectedProfileId,
            errors: { ...state.errors, delete: null }
          }));
        },
        
        // Analysis actions
        setProfileAnalysis: (profileId, analysis) => {
          set((state) => ({
            profileAnalyses: { ...state.profileAnalyses, [profileId]: analysis },
            loading: { ...state.loading, analysis: false },
            errors: { ...state.errors, analysis: null }
          }));
        },
        
        clearProfileAnalysis: (profileId) => {
          set((state) => {
            const newAnalyses = { ...state.profileAnalyses };
            delete newAnalyses[profileId];
            return { profileAnalyses: newAnalyses };
          });
        },
        
        // Loading and error actions
        setLoading: (key, value) => {
          set((state) => ({
            loading: { ...state.loading, [key]: value }
          }));
        },
        
        setError: (key, error) => {
          set((state) => ({
            errors: { ...state.errors, [key]: error }
          }));
        },
        
        clearErrors: () => {
          set({ errors: {} });
        },
        
        // UI actions
        setSelectedProfile: (profileId) => {
          set({ selectedProfileId: profileId });
        },
        
        setFilterCriteria: (criteria) => {
          set((state) => ({
            filterCriteria: { ...state.filterCriteria, ...criteria }
          }));
        },
        
        setSorting: (sortBy, sortOrder) => {
          set({ sortBy, sortOrder });
        },
        
        // Optimistic updates
        addPendingOperation: (profileId, operation) => {
          set((state) => ({
            pendingOperations: { ...state.pendingOperations, [profileId]: operation }
          }));
        },
        
        removePendingOperation: (profileId) => {
          set((state) => {
            const newPending = { ...state.pendingOperations };
            delete newPending[profileId];
            return { pendingOperations: newPending };
          });
        },
        
        commitPendingOperation: (profileId) => {
          const operation = get().pendingOperations[profileId];
          if (!operation) return;
          
          switch (operation.type) {
            case 'create':
              // Already added optimistically, just remove pending
              break;
            case 'update':
              // Already updated optimistically, just remove pending
              break;
            case 'delete':
              // Already deleted optimistically, just remove pending
              break;
          }
          
          get().removePendingOperation(profileId);
        },
        
        rollbackPendingOperation: (profileId) => {
          const operation = get().pendingOperations[profileId];
          if (!operation) return;
          
          // Rollback based on operation type
          switch (operation.type) {
            case 'create':
              // Remove the optimistically added profile
              set((state) => ({
                profiles: state.profiles.filter(p => p.profile_name !== profileId)
              }));
              break;
            case 'update':
              // Restore original data
              if (operation.data.original) {
                get().updateProfile(profileId, operation.data.original);
              }
              break;
            case 'delete':
              // Restore the deleted profile
              if (operation.data.original) {
                get().addProfile(operation.data.original);
              }
              break;
          }
          
          get().removePendingOperation(profileId);
        },
        
        // Cache management
        invalidateCache: () => {
          set({ lastFetchTime: null });
        },
        
        refreshProfiles: async () => {
          const state = get();
          if (state.loading.profiles) return;
          
          get().setLoading('profiles', true);
          
          try {
            // This would be replaced with actual API call
            // const response = await profilesAPI.getAllProfiles();
            // get().setProfiles(response.data);
            
            // Mock implementation
            get().setProfiles([]);
          } catch (error) {
            get().setError('profiles', error instanceof Error ? error.message : 'Failed to fetch profiles');
          } finally {
            get().setLoading('profiles', false);
          }
        },
        
        // Bulk operations
        bulkDelete: (profileIds) => {
          set((state) => ({
            profiles: state.profiles.filter(p => !profileIds.includes(p.profile_name)),
            activeProfileId: profileIds.includes(state.activeProfileId || '') ? null : state.activeProfileId,
            selectedProfileId: profileIds.includes(state.selectedProfileId || '') ? null : state.selectedProfileId
          }));
        },
        
        bulkValidate: async (profileIds) => {
          const results: Record<string, ProfileStructureAnalysis> = {};
          
          for (const profileId of profileIds) {
            try {
              // Mock validation - replace with actual API call
              results[profileId] = {
                profile_id: profileId,
                is_valid: true,
                errors: [],
                warnings: [],
                missing_emotions: [],
                missing_angles: [],
                completeness_percentage: 100,
                total_assets: 0,
                valid_assets: 0
              };
            } catch (error) {
              results[profileId] = {
                profile_id: profileId,
                is_valid: false,
                errors: [error instanceof Error ? error.message : 'Validation failed'],
                warnings: [],
                missing_emotions: [],
                missing_angles: [],
                completeness_percentage: 0,
                total_assets: 0,
                valid_assets: 0
              };
            }
          }
          
          return results;
        },
        
        // Utility actions
        resetStore: () => {
          set(initialState);
        },
        
        // Selectors
        get activeProfile() {
          try {
            const profiles = this.profiles || [];
            return profiles.find(p => p.profile_name === this.activeProfileId) || null;
          } catch {
            return null;
          }
        },
        get selectedProfile() {
          try {
            const profiles = this.profiles || [];
            return profiles.find(p => p.profile_name === this.selectedProfileId) || null;
          } catch {
            return null;
          }
        },
        get filteredProfiles() {
          try {
            const profiles = this.profiles || [];
            let filtered = [...profiles];
            
            // Apply filters
            const { searchTerm, emotion, angle, status } = this.filterCriteria || {};
            
            if (searchTerm) {
              filtered = filtered.filter(p => 
                p.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }
            
            if (emotion && emotion !== 'all') {
              filtered = filtered.filter(p => 
                this.profileAnalyses?.[p.profile_name]?.available_emotions?.includes(emotion)
              );
            }
            
            if (angle && angle !== 'all') {
              filtered = filtered.filter(p => 
                this.profileAnalyses?.[p.profile_name]?.available_angles?.includes(angle)
              );
            }
            
            if (status === 'valid') {
              filtered = filtered.filter(p => this.profileAnalyses?.[p.profile_name]?.is_valid);
            } else if (status === 'invalid') {
              filtered = filtered.filter(p => !this.profileAnalyses?.[p.profile_name]?.is_valid);
            }
            
            // Apply sorting
            filtered.sort((a, b) => {
              let comparison = 0;
              
              switch (this.sortBy) {
                case 'name':
                  comparison = a.profile_name.localeCompare(b.profile_name);
                  break;
                case 'created':
                  comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                  break;
                case 'updated':
                  comparison = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
                  break;
                case 'completeness':
                  const aCompleteness = this.profileAnalyses?.[a.profile_name]?.completeness_percentage || 0;
                  const bCompleteness = this.profileAnalyses?.[b.profile_name]?.completeness_percentage || 0;
                  comparison = aCompleteness - bCompleteness;
                  break;
              }
              
              return this.sortOrder === 'asc' ? comparison : -comparison;
            });
            
            return filtered;
          } catch {
            return [];
          }
        },
        get validProfiles() {
          try {
            const profiles = this.profiles || [];
            return profiles.filter(p => this.profileAnalyses?.[p.profile_name]?.is_valid);
          } catch {
            return [];
          }
        },
        get invalidProfiles() {
          try {
            const profiles = this.profiles || [];
            return profiles.filter(p => !this.profileAnalyses?.[p.profile_name]?.is_valid);
          } catch {
            return [];
          }
        },
        get totalProfiles() {
          try {
            return this.profiles?.length || 0;
          } catch {
            return 0;
          }
        },
        get validProfileCount() {
          try {
            const profiles = this.profiles || [];
            return profiles.filter(p => this.profileAnalyses?.[p.profile_name]?.is_valid).length;
          } catch {
            return 0;
          }
        },
        get averageCompleteness() {
          try {
            const profiles = this.profiles || [];
            return profiles.length > 0 
              ? profiles.reduce((sum, p) => 
                  sum + (this.profileAnalyses?.[p.profile_name]?.completeness_percentage || 0), 0
                ) / profiles.length
              : 0;
          } catch {
            return 0;
          }
        },
        get hasProfiles() {
          try {
            return (this.profiles?.length || 0) > 0;
          } catch {
            return false;
          }
        },
        get isLoading() {
          try {
            const loading = this.loading || {};
            return Object.values(loading).some(loading => loading);
          } catch {
            return false;
          }
        },
        get hasErrors() {
          try {
            const errors = this.errors || {};
            return Object.values(errors).some(error => error !== null);
          } catch {
            return false;
          }
        },
        get hasPendingOperations() {
          try {
            const pendingOperations = this.pendingOperations || {};
            return Object.keys(pendingOperations).length > 0;
          } catch {
            return false;
          }
        },
        get isCacheExpired() {
          try {
            return this.lastFetchTime 
              ? Date.now() - new Date(this.lastFetchTime).getTime() > this.cacheExpiry
              : true;
          } catch {
            return true;
          }
        }
      })),
      {
        name: 'profiles-store',
        partialize: (state) => ({
          // Only persist specific fields
          activeProfileId: state.activeProfileId,
          selectedProfileId: state.selectedProfileId,
          filterCriteria: state.filterCriteria,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          profiles: state.profiles,
          lastFetchTime: state.lastFetchTime,
        }),
      }
    ),
    {
      name: 'profiles-store',
    }
  )
);

// Computed selectors (using zustand's pattern)
export const useActiveProfile = () => useProfilesStore(state => {
  try {
    if (!state || !state.profiles) return null;
    return state.profiles.find(p => p?.profile_name === state.activeProfileId) || null;
  } catch (error) {
    console.warn('Error in useActiveProfile selector:', error);
    return null;
  }
});

export const useSelectedProfile = () => useProfilesStore(state => {
  try {
    if (!state || !state.profiles) return null;
    return state.profiles.find(p => p?.profile_name === state.selectedProfileId) || null;
  } catch (error) {
    console.warn('Error in useSelectedProfile selector:', error);
    return null;
  }
});

export const useFilteredProfiles = () => useProfilesStore(state => {
  try {
    if (!state || !state.profiles) return [];
    let filtered = [...state.profiles];
    
    // Apply filters
    if (state.filterCriteria?.emotion) {
      filtered = filtered.filter(p => 
        p?.supported_emotions?.core?.includes(state.filterCriteria.emotion!) ||
        p?.supported_emotions?.compound?.includes(state.filterCriteria.emotion!)
      );
    }
    
    if (state.filterCriteria?.shotType) {
      filtered = filtered.filter(p => 
        p?.supported_angles?.includes(state.filterCriteria.shotType!)
      );
    }
    
    if (state.filterCriteria?.isValid !== undefined) {
      filtered = filtered.filter(p => {
        const analysis = state.profileAnalyses?.[p.profile_name];
        return analysis ? analysis.is_valid === state.filterCriteria.isValid : false;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sortBy) {
        case 'name':
          comparison = (a?.profile_name || '').localeCompare(b?.profile_name || '');
          break;
        case 'created':
          comparison = new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime();
          break;
        case 'modified':
          comparison = new Date(a?.last_modified || 0).getTime() - new Date(b?.last_modified || 0).getTime();
          break;
        case 'completeness':
          const aCompleteness = state.profileAnalyses?.[a.profile_name]?.completeness_percentage || 0;
          const bCompleteness = state.profileAnalyses?.[b.profile_name]?.completeness_percentage || 0;
          comparison = aCompleteness - bCompleteness;
          break;
      }
      
      return state.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  } catch (error) {
    console.warn('Error in useFilteredProfiles selector:', error);
    return [];
  }
});

export const useValidProfiles = () => useProfilesStore(state => {
  try {
    if (!state || !state.profiles) return [];
    return state.profiles.filter(p => state.profileAnalyses?.[p.profile_name]?.is_valid);
  } catch (error) {
    console.warn('Error in useValidProfiles selector:', error);
    return [];
  }
});

export const useInvalidProfiles = () => useProfilesStore(state => {
  try {
    if (!state || !state.profiles) return [];
    return state.profiles.filter(p => !state.profileAnalyses?.[p.profile_name]?.is_valid);
  } catch (error) {
    console.warn('Error in useInvalidProfiles selector:', error);
    return [];
  }
});

export const useProfileStats = () => useProfilesStore(state => {
  try {
    if (!state || !state.profiles) {
      return {
        totalProfiles: 0,
        validProfileCount: 0,
        averageCompleteness: 0
      };
    }
    
    const totalProfiles = state.profiles.length;
    const validProfileCount = state.profiles.filter(p => 
      state.profileAnalyses?.[p.profile_name]?.is_valid
    ).length;
    const averageCompleteness = totalProfiles > 0 
      ? state.profiles.reduce((sum, p) => 
          sum + (state.profileAnalyses?.[p.profile_name]?.completeness_percentage || 0), 0
        ) / totalProfiles
      : 0;
    
    return {
      totalProfiles,
      validProfileCount,
      averageCompleteness
    };
  } catch (error) {
    console.warn('Error in useProfileStats selector:', error);
    return {
      totalProfiles: 0,
      validProfileCount: 0,
      averageCompleteness: 0
    };
  }
});

export const useProfileStatus = () => useProfilesStore(state => ({
  hasProfiles: state.profiles.length > 0,
  isLoading: Object.values(state.loading).some(loading => loading),
  hasErrors: Object.values(state.errors).some(error => error !== null),
  hasPendingOperations: Object.keys(state.pendingOperations).length > 0,
  isCacheExpired: state.lastFetchTime 
    ? Date.now() - state.lastFetchTime > state.cacheExpiry
    : true
}));

// Export the main store hook
export default useProfilesStore;