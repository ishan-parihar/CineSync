/**
 * UI Store - Domain-specific store for UI preferences and interface state
 * Handles user preferences, UI state, and interface interactions
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware';
import type { UIPreferences } from '../types';

// Store state interface
interface UIState {
  // User preferences
  preferences: UIPreferences;
  
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  compactMode: boolean;
  highContrast: boolean;
  
  // Layout preferences
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  showMinimap: boolean;
  showRulers: boolean;
  showGrid: boolean;
  workspaceLayout: 'horizontal' | 'vertical' | 'tabs';
  
  // Panel states
  panels: {
    profiles: { visible: boolean; width: number; order: number };
    processing: { visible: boolean; width: number; order: number };
    cinematography: { visible: boolean; width: number; order: number };
    system: { visible: boolean; width: number; order: number };
    timeline: { visible: boolean; height: number; order: number };
    properties: { visible: boolean; width: number; order: number };
    console: { visible: boolean; height: number; order: number };
  };
  
  // Modal and overlay states
  modals: {
    jobCreate: boolean;
    profileEdit: boolean;
    settings: boolean;
    help: boolean;
    about: boolean;
    export: boolean;
    import: boolean;
  };
  
  // Loading states
  loading: {
    preferences: boolean;
    theme: boolean;
    layout: boolean;
  };
  
  // Error states
  errors: Record<string, string | null>;
  
  // Navigation state
  currentRoute: string;
  breadcrumbs: Array<{
    label: string;
    path: string;
  }>;
  navigationHistory: string[];
  
  // Search and filter state
  globalSearch: {
    query: string;
    active: boolean;
    results: Array<{
      type: 'profile' | 'job' | 'shot' | 'config' | 'log';
      id: string;
      title: string;
      description: string;
      action: () => void;
    }>;
    selectedIndex: number;
  };
  
  // Keyboard shortcuts
  shortcuts: Record<string, string>;
  shortcutsEnabled: boolean;
  showShortcutHelp: boolean;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    autoHide: boolean;
    duration?: number;
    actions?: Array<{
      label: string;
      action: () => void;
      primary?: boolean;
    }>;
  }>;
  
  // Tooltip and help state
  tooltips: {
    enabled: boolean;
    delay: number;
    position: 'top' | 'bottom' | 'left' | 'right';
    persistent: boolean;
  };
  
  // Tour and onboarding
  tour: {
    active: boolean;
    currentStep: number;
    completedSteps: string[];
    skipTour: boolean;
  };
  
  // Workspace state
  workspace: {
    unsavedChanges: boolean;
    lastSaveTime: string | null;
    autoSave: boolean;
    autoSaveInterval: number;
    sessionStartTime: string;
  };
  
  // Performance settings
  performance: {
    animationsEnabled: boolean;
    reducedMotion: boolean;
    virtualScrolling: boolean;
    lazyLoading: boolean;
    maxItemsPerList: number;
  };
  
  // Cache
  lastPreferencesUpdate: number | null;
  cacheExpiry: number; // 1 hour for preferences
}

// Store actions interface
interface UIActions {
  // Preferences management
  setPreferences: (preferences: UIPreferences) => void;
  updatePreferences: (updates: Partial<UIPreferences>) => void;
  resetPreferences: () => void;
  
  // Theme and appearance
  setTheme: (theme: UIState['theme']) => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: UIState['fontSize']) => void;
  setFontFamily: (font: string) => void;
  setCompactMode: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  
  // Layout management
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setShowMinimap: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setWorkspaceLayout: (layout: UIState['workspaceLayout']) => void;
  
  // Panel management
  setPanelVisibility: (panel: keyof UIState['panels'], visible: boolean) => void;
  setPanelSize: (panel: keyof UIState['panels'], dimension: number) => void;
  setPanelOrder: (panel: keyof UIState['panels'], order: number) => void;
  resetPanelLayout: () => void;
  
  // Modal management
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Loading and error actions
  setLoading: (key: keyof UIState['loading'], value: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  
  // Navigation actions
  setCurrentRoute: (route: string) => void;
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void;
  addToHistory: (route: string) => void;
  goBack: () => void;
  goForward: () => void;
  
  // Search actions
  setGlobalSearch: (search: Partial<UIState['globalSearch']>) => void;
  performSearch: (query: string) => void;
  clearSearch: () => void;
  selectSearchResult: (index: number) => void;
  executeSearchAction: () => void;
  
  // Keyboard shortcuts
  setShortcut: (action: string, shortcut: string) => void;
  removeShortcut: (action: string) => void;
  setShortcutsEnabled: (enabled: boolean) => void;
  setShowShortcutHelp: (show: boolean) => void;
  resetShortcuts: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateNotification: (id: string, updates: Partial<UIState['notifications'][0]>) => void;
  
  // Tooltip actions
  setTooltipsEnabled: (enabled: boolean) => void;
  setTooltipDelay: (delay: number) => void;
  setTooltipPosition: (position: UIState['tooltips']['position']) => void;
  setTooltipsPersistent: (persistent: boolean) => void;
  
  // Tour actions
  startTour: () => void;
  nextTourStep: () => void;
  previousTourStep: () => void;
  completeTourStep: (stepId: string) => void;
  skipTour: () => void;
  resetTour: () => void;
  
  // Workspace actions
  setUnsavedChanges: (hasChanges: boolean) => void;
  saveWorkspace: () => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  
  // Performance actions
  setAnimationsEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setVirtualScrolling: (enabled: boolean) => void;
  setLazyLoading: (enabled: boolean) => void;
  setMaxItemsPerList: (max: number) => void;
  
  // Import/Export
  exportPreferences: () => string;
  importPreferences: (data: string) => void;
  
  // Utility actions
  resetStore: () => void;
  applySystemTheme: () => void;
  detectSystemTheme: () => 'light' | 'dark';
}

// Computed selectors
interface UISelectors {
  // Derived theme state
  currentTheme: 'light' | 'dark';
  isDarkMode: boolean;
  isCompactMode: boolean;
  
  // Layout calculations
  availableWidth: number;
  availableHeight: number;
  panelConfiguration: UIState['panels'];
  
  // Status checks
  hasUnsavedChanges: boolean;
  hasActiveModals: boolean;
  hasNotifications: boolean;
  isLoading: boolean;
  hasErrors: boolean;
  
  // Navigation helpers
  canGoBack: boolean;
  canGoForward: boolean;
  currentBreadcrumb: string;
  
  // Search state
  isSearchActive: boolean;
  hasSearchResults: boolean;
  selectedSearchResult: UIState['globalSearch']['results'][0] | null;
  
  // Tour state
  tourProgress: number;
  isTourCompleted: boolean;
  
  // Performance mode
  isPerformanceMode: boolean;
}

// Default preferences
const defaultPreferences: UIPreferences = {
  previewMode: 'storyboard',
  selectedSegments: [],
  showConfidence: true,
  showTension: true,
  gridColumns: 3,
  theme: 'auto',
  language: 'en',
  autoSave: true,
  notifications: {
    enabled: true,
    sound: false,
    desktop: false
  }
};

// Default shortcuts
const defaultShortcuts = {
  'save': 'Ctrl+S',
  'open': 'Ctrl+O',
  'export': 'Ctrl+E',
  'import': 'Ctrl+I',
  'search': 'Ctrl+F',
  'help': 'F1',
  'settings': 'Ctrl+,',
  'toggleSidebar': 'Ctrl+B',
  'toggleTheme': 'Ctrl+Shift+T',
  'undo': 'Ctrl+Z',
  'redo': 'Ctrl+Y',
  'copy': 'Ctrl+C',
  'paste': 'Ctrl+V',
  'delete': 'Delete',
  'playPause': 'Space',
  'nextFrame': 'ArrowRight',
  'previousFrame': 'ArrowLeft'
};

// Initial state
const initialState: UIState = {
  preferences: defaultPreferences,
  
  theme: 'auto',
  primaryColor: '#3b82f6',
  fontSize: 'medium',
  fontFamily: 'Inter, system-ui, sans-serif',
  compactMode: false,
  highContrast: false,
  
  sidebarCollapsed: false,
  sidebarWidth: 280,
  showMinimap: false,
  showRulers: false,
  showGrid: false,
  workspaceLayout: 'horizontal',
  
  panels: {
    profiles: { visible: true, width: 300, order: 1 },
    processing: { visible: true, width: 350, order: 2 },
    cinematography: { visible: true, width: 400, order: 3 },
    system: { visible: false, width: 300, order: 4 },
    timeline: { visible: true, height: 200, order: 1 },
    properties: { visible: true, width: 250, order: 5 },
    console: { visible: false, height: 150, order: 2 }
  },
  
  modals: {
    jobCreate: false,
    profileEdit: false,
    settings: false,
    help: false,
    about: false,
    export: false,
    import: false
  },
  
  loading: {
    preferences: false,
    theme: false,
    layout: false
  },
  
  errors: {},
  
  currentRoute: '/',
  breadcrumbs: [],
  navigationHistory: [],
  
  globalSearch: {
    query: '',
    active: false,
    results: [],
    selectedIndex: 0
  },
  
  shortcuts: defaultShortcuts,
  shortcutsEnabled: true,
  showShortcutHelp: false,
  
  notifications: [],
  
  tooltips: {
    enabled: true,
    delay: 800,
    position: 'top',
    persistent: false
  },
  
  tour: {
    active: false,
    currentStep: 0,
    completedSteps: [],
    skipTour: false
  },
  
  workspace: {
    unsavedChanges: false,
    lastSaveTime: null,
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    sessionStartTime: new Date().toISOString()
  },
  
  performance: {
    animationsEnabled: true,
    reducedMotion: false,
    virtualScrolling: true,
    lazyLoading: true,
    maxItemsPerList: 100
  },
  
  lastPreferencesUpdate: null,
  cacheExpiry: 60 * 60 * 1000, // 1 hour
};

// Create the store
export const useUIStore = create<UIState & UIActions & UISelectors>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        // Preferences management
        setPreferences: (preferences) => {
          set({
            preferences,
            lastPreferencesUpdate: Date.now(),
            errors: { ...get().errors, preferences: null }
          });
          
          // Apply theme if needed
          if (preferences.theme !== 'auto') {
            get().setTheme(preferences.theme);
          }
        },
        
        updatePreferences: (updates) => {
          set((state) => ({
            preferences: { ...state.preferences, ...updates },
            lastPreferencesUpdate: Date.now()
          }));
        },
        
        resetPreferences: () => {
          set({
            preferences: defaultPreferences,
            lastPreferencesUpdate: Date.now()
          });
        },
        
        // Theme and appearance
        setTheme: (theme) => {
          set({ theme });
          get().applySystemTheme();
        },
        
        setPrimaryColor: (color) => {
          set({ primaryColor: color });
        },
        
        setFontSize: (size) => {
          set({ fontSize: size });
        },
        
        setFontFamily: (font) => {
          set({ fontFamily: font });
        },
        
        setCompactMode: (enabled) => {
          set({ compactMode: enabled });
        },
        
        setHighContrast: (enabled) => {
          set({ highContrast: enabled });
        },
        
        // Layout management
        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed });
        },
        
        setSidebarWidth: (width) => {
          set({ sidebarWidth: Math.max(200, Math.min(500, width)) });
        },
        
        setShowMinimap: (show) => {
          set({ showMinimap: show });
        },
        
        setShowRulers: (show) => {
          set({ showRulers: show });
        },
        
        setShowGrid: (show) => {
          set({ showGrid: show });
        },
        
        setWorkspaceLayout: (layout) => {
          set({ workspaceLayout: layout });
        },
        
        // Panel management
        setPanelVisibility: (panel, visible) => {
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: { ...state.panels[panel], visible }
            }
          }));
        },
        
        setPanelSize: (panel, dimension) => {
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: { 
                ...state.panels[panel], 
                ['width' in state.panels[panel] ? 'width' : 'height']: dimension 
              }
            }
          }));
        },
        
        setPanelOrder: (panel, order) => {
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: { ...state.panels[panel], order }
            }
          }));
        },
        
        resetPanelLayout: () => {
          set({ panels: initialState.panels });
        },
        
        // Modal management
        openModal: (modal) => {
          set((state) => ({
            modals: { ...state.modals, [modal]: true }
          }));
        },
        
        closeModal: (modal) => {
          set((state) => ({
            modals: { ...state.modals, [modal]: false }
          }));
        },
        
        closeAllModals: () => {
          set({
            modals: Object.keys(initialState.modals).reduce((acc, key) => {
              acc[key as keyof typeof initialState.modals] = false;
              return acc;
            }, {} as UIState['modals'])
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
        
        // Navigation actions
        setCurrentRoute: (route) => {
          set((state) => {
            const newHistory = [...state.navigationHistory];
            if (newHistory[newHistory.length - 1] !== route) {
              newHistory.push(route);
            }
            
            return {
              currentRoute: route,
              navigationHistory: newHistory.slice(-50) // Keep last 50 routes
            };
          });
        },
        
        setBreadcrumbs: (breadcrumbs) => {
          set({ breadcrumbs });
        },
        
        addToHistory: (route) => {
          set((state) => ({
            navigationHistory: [...state.navigationHistory.slice(-49), route]
          }));
        },
        
        goBack: () => {
          const state = get();
          if (state.navigationHistory.length > 1) {
            const newHistory = [...state.navigationHistory];
            newHistory.pop(); // Remove current
            const previousRoute = newHistory[newHistory.length - 1];
            
            set({
              currentRoute: previousRoute,
              navigationHistory: newHistory
            });
          }
        },
        
        goForward: () => {
          // This would need forward history tracking
          // For now, just a placeholder
        },
        
        // Search actions
        setGlobalSearch: (search) => {
          set((state) => ({
            globalSearch: { ...state.globalSearch, ...search }
          }));
        },
        
        performSearch: (query) => {
          // Mock search implementation
          const results = [
            {
              type: 'profile' as const,
              id: 'profile1',
              title: 'Character Profile 1',
              description: 'Main character profile with basic emotions',
              action: () => console.log('Navigate to profile1')
            },
            {
              type: 'job' as const,
              id: 'job1',
              title: 'Processing Job #1',
              description: 'Lip sync job for audio file',
              action: () => console.log('Navigate to job1')
            }
          ].filter(result => 
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.description.toLowerCase().includes(query.toLowerCase())
          );
          
          set((state) => ({
            globalSearch: {
              ...state.globalSearch,
              query,
              active: true,
              results,
              selectedIndex: 0
            }
          }));
        },
        
        clearSearch: () => {
          set({
            globalSearch: {
              query: '',
              active: false,
              results: [],
              selectedIndex: 0
            }
          });
        },
        
        selectSearchResult: (index) => {
          set((state) => ({
            globalSearch: {
              ...state.globalSearch,
              selectedIndex: Math.max(0, Math.min(index, state.globalSearch.results.length - 1))
            }
          }));
        },
        
        executeSearchAction: () => {
          const state = get();
          const selectedResult = state.globalSearch.results[state.globalSearch.selectedIndex];
          
          if (selectedResult) {
            selectedResult.action();
            get().clearSearch();
          }
        },
        
        // Keyboard shortcuts
        setShortcut: (action, shortcut) => {
          set((state) => ({
            shortcuts: { ...state.shortcuts, [action]: shortcut }
          }));
        },
        
        removeShortcut: (action) => {
          set((state) => {
            const newShortcuts = { ...state.shortcuts };
            delete newShortcuts[action];
            return { shortcuts: newShortcuts };
          });
        },
        
        setShortcutsEnabled: (enabled) => {
          set({ shortcutsEnabled: enabled });
        },
        
        setShowShortcutHelp: (show) => {
          set({ showShortcutHelp: show });
        },
        
        resetShortcuts: () => {
          set({ shortcuts: defaultShortcuts });
        },
        
        // Notification actions
        addNotification: (notification) => {
          const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newNotification = {
            ...notification,
            id: notificationId,
            timestamp: new Date().toISOString()
          };
          
          set((state) => ({
            notifications: [...state.notifications, newNotification]
          }));
          
          // Auto-hide if enabled
          if (notification.autoHide !== false) {
            setTimeout(() => {
              get().removeNotification(notificationId);
            }, notification.duration || 5000);
          }
        },
        
        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        },
        
        clearNotifications: () => {
          set({ notifications: [] });
        },
        
        updateNotification: (id, updates) => {
          set((state) => ({
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, ...updates } : n
            )
          }));
        },
        
        // Tooltip actions
        setTooltipsEnabled: (enabled) => {
          set((state) => ({
            tooltips: { ...state.tooltips, enabled: enabled }
          }));
        },
        
        setTooltipDelay: (delay) => {
          set((state) => ({
            tooltips: { ...state.tooltips, delay }
          }));
        },
        
        setTooltipPosition: (position) => {
          set((state) => ({
            tooltips: { ...state.tooltips, position }
          }));
        },
        
        setTooltipsPersistent: (persistent) => {
          set((state) => ({
            tooltips: { ...state.tooltips, persistent }
          }));
        },
        
        // Tour actions
        startTour: () => {
          set((state) => ({
            tour: {
              ...state.tour,
              active: true,
              currentStep: 0,
              completedSteps: []
            }
          }));
        },
        
        nextTourStep: () => {
          set((state) => ({
            tour: {
              ...state.tour,
              currentStep: state.tour.currentStep + 1
            }
          }));
        },
        
        previousTourStep: () => {
          set((state) => ({
            tour: {
              ...state.tour,
              currentStep: Math.max(0, state.tour.currentStep - 1)
            }
          }));
        },
        
        completeTourStep: (stepId) => {
          set((state) => ({
            tour: {
              ...state.tour,
              completedSteps: [...state.tour.completedSteps, stepId]
            }
          }));
        },
        
        skipTour: () => {
          set((state) => ({
            tour: {
              ...state.tour,
              active: false,
              skipTour: true
            }
          }));
        },
        
        resetTour: () => {
          set({
            tour: {
              active: false,
              currentStep: 0,
              completedSteps: [],
              skipTour: false
            }
          });
        },
        
        // Workspace actions
        setUnsavedChanges: (hasChanges) => {
          set((state) => ({
            workspace: { ...state.workspace, unsavedChanges: hasChanges }
          }));
        },
        
        saveWorkspace: () => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              unsavedChanges: false,
              lastSaveTime: new Date().toISOString()
            }
          }));
          
          get().addNotification({
            type: 'success',
            title: 'Workspace Saved',
            message: 'Your workspace has been saved successfully.',
            autoHide: true
          });
        },
        
        setAutoSave: (enabled) => {
          set((state) => ({
            workspace: { ...state.workspace, autoSave: enabled }
          }));
        },
        
        setAutoSaveInterval: (interval) => {
          set((state) => ({
            workspace: { ...state.workspace, autoSaveInterval: interval }
          }));
        },
        
        // Performance actions
        setAnimationsEnabled: (enabled) => {
          set((state) => ({
            performance: { ...state.performance, animationsEnabled: enabled }
          }));
        },
        
        setReducedMotion: (enabled) => {
          set((state) => ({
            performance: { ...state.performance, reducedMotion: enabled }
          }));
        },
        
        setVirtualScrolling: (enabled) => {
          set((state) => ({
            performance: { ...state.performance, virtualScrolling: enabled }
          }));
        },
        
        setLazyLoading: (enabled) => {
          set((state) => ({
            performance: { ...state.performance, lazyLoading: enabled }
          }));
        },
        
        setMaxItemsPerList: (max) => {
          set((state) => ({
            performance: { ...state.performance, maxItemsPerList: max }
          }));
        },
        
        // Import/Export
        exportPreferences: () => {
          const state = get();
          return JSON.stringify({
            preferences: state.preferences,
            theme: state.theme,
            panels: state.panels,
            shortcuts: state.shortcuts,
            workspace: state.workspace,
            performance: state.performance,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
          }, null, 2);
        },
        
        importPreferences: (data) => {
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.preferences) get().setPreferences(parsed.preferences);
            if (parsed.theme) get().setTheme(parsed.theme);
            if (parsed.panels) set({ panels: parsed.panels });
            if (parsed.shortcuts) set({ shortcuts: parsed.shortcuts });
            if (parsed.workspace) set({ workspace: parsed.workspace });
            if (parsed.performance) set({ performance: parsed.performance });
            
            get().addNotification({
              type: 'success',
              title: 'Preferences Imported',
              message: 'Your preferences have been imported successfully.',
              autoHide: true
            });
          } catch (error) {
            get().setError('import', 'Invalid preferences data format');
            get().addNotification({
              type: 'error',
              title: 'Import Failed',
              message: 'Failed to import preferences. Please check the file format.',
              autoHide: true
            });
          }
        },
        
        // Utility actions
        resetStore: () => {
          set(initialState);
        },
        
        applySystemTheme: () => {
          const state = get();
          const effectiveTheme = state.theme === 'auto' ? get().detectSystemTheme() : state.theme;
          
          // Apply theme to document
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', effectiveTheme);
            document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
          }
        },
        
        detectSystemTheme: () => {
          if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return 'light';
        },
        
        // Selectors
        get currentTheme() {
          return this.theme === 'auto' ? this.detectSystemTheme() : this.theme;
        },
        get isDarkMode() {
          return this.currentTheme === 'dark';
        },
        get isCompactMode() {
          return this.compactMode;
        },
        get availableWidth() {
          const layout = this.layout || {};
          const windowSize = layout.windowSize || { width: 1024, height: 768 };
          const sidebarWidth = layout.sidebarWidth || 250;
          const sidebarCollapsed = layout.sidebarCollapsed || false;
          return windowSize.width - sidebarWidth - (sidebarCollapsed ? 0 : sidebarWidth);
        },
        get availableHeight() {
          const layout = this.layout || {};
          const windowSize = layout.windowSize || { width: 1024, height: 768 };
          const headerHeight = layout.headerHeight || 60;
          const footerHeight = layout.footerHeight || 40;
          return windowSize.height - headerHeight - footerHeight;
        },
        get panelConfiguration() {
          return this.panels || {};
        },
        get hasUnsavedChanges() {
          const unsavedChanges = this.unsavedChanges || {};
          return Object.values(unsavedChanges).some(hasChanges => hasChanges);
        },
        get hasActiveModals() {
          const activeModals = this.activeModals || [];
          return activeModals.length > 0;
        },
        get hasNotifications() {
          const notifications = this.notifications || [];
          return notifications.some(n => !n.read);
        },
        get isLoading() {
          const loading = this.loading || {};
          return Object.values(loading).some(loading => loading);
        },
        get hasErrors() {
          const errors = this.errors || {};
          return Object.values(errors).some(error => error !== null);
        },
        get canGoBack() {
          const navigation = this.navigation || {};
          return (navigation.historyIndex || 0) > 0;
        },
        get canGoForward() {
          const navigation = this.navigation || {};
          const history = navigation.history || [];
          return (navigation.historyIndex || 0) < history.length - 1;
        },
        get currentBreadcrumb() {
          const navigation = this.navigation || {};
          const breadcrumbs = navigation.breadcrumbs || [];
          return breadcrumbs[breadcrumbs.length - 1]?.label || '';
        },
        get isSearchActive() {
          const globalSearch = this.globalSearch || {};
          return globalSearch.isActive || false;
        },
        get hasSearchResults() {
          const globalSearch = this.globalSearch || {};
          const results = globalSearch.results || [];
          return results.length > 0;
        },
        get selectedSearchResult() {
          const globalSearch = this.globalSearch || {};
          const results = globalSearch.results || [];
          return results[globalSearch.selectedIndex || 0] || null;
        },
        get tourProgress() {
          const totalSteps = 5; // Mock total steps
          const interactiveTour = this.interactiveTour || {};
          return ((interactiveTour.currentStep || 0) / totalSteps) * 100;
        },
        get isTourCompleted() {
          const interactiveTour = this.interactiveTour || {};
          return interactiveTour.completed || false;
        },
        get isPerformanceMode() {
          return this.performanceMode || false;
        }
      })),
      {
        name: 'ui-store',
        partialize: (state) => ({
          // Persist most UI state
          preferences: state.preferences,
          theme: state.theme,
          primaryColor: state.primaryColor,
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          compactMode: state.compactMode,
          highContrast: state.highContrast,
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth,
          workspaceLayout: state.workspaceLayout,
          panels: state.panels,
          shortcuts: state.shortcuts,
          tooltips: state.tooltips,
          tour: state.tour,
          workspace: state.workspace,
          performance: state.performance,
          lastPreferencesUpdate: state.lastPreferencesUpdate,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);

// Computed selectors
export const useThemeState = () => useUIStore(state => {
  try {
    if (!state) {
      return {
        currentTheme: 'light',
        isDarkMode: false,
        isCompactMode: false
      };
    }
    
    const effectiveTheme = state.theme === 'auto' ? (state.detectSystemTheme?.() || 'light') : state.theme;
    return {
      currentTheme: effectiveTheme,
      isDarkMode: effectiveTheme === 'dark',
      isCompactMode: state.compactMode || false
    };
  } catch (error) {
    console.warn('Error in useThemeState selector:', error);
    return {
      currentTheme: 'light',
      isDarkMode: false,
      isCompactMode: false
    };
  }
});

export const useLayoutState = () => useUIStore(state => {
  try {
    if (!state || typeof window === 'undefined') {
      return {
        availableWidth: 800,
        availableHeight: 600,
        panelConfiguration: {}
      };
    }
    
    return {
      availableWidth: window.innerWidth - (state.sidebarCollapsed ? 60 : (state.sidebarWidth || 250)),
      availableHeight: window.innerHeight,
      panelConfiguration: state.panels || {}
    };
  } catch (error) {
    console.warn('Error in useLayoutState selector:', error);
    return {
      availableWidth: 800,
      availableHeight: 600,
      panelConfiguration: {}
    };
  }
});

export const useWorkspaceState = () => useUIStore(state => {
  try {
    if (!state || !state.workspace) {
      return {
        hasUnsavedChanges: false,
        lastSaveTime: null,
        autoSaveEnabled: true,
        sessionDuration: 0
      };
    }
    
    return {
      hasUnsavedChanges: state.workspace.unsavedChanges || false,
      lastSaveTime: state.workspace.lastSaveTime || null,
      autoSaveEnabled: state.workspace.autoSave !== false,
      sessionDuration: Date.now() - new Date(state.workspace.sessionStartTime || Date.now()).getTime()
    };
  } catch (error) {
    console.warn('Error in useWorkspaceState selector:', error);
    return {
      hasUnsavedChanges: false,
      lastSaveTime: null,
      autoSaveEnabled: true,
      sessionDuration: 0
    };
  }
});

export const useModalState = () => useUIStore(state => {
  try {
    if (!state) {
      return {
        hasActiveModals: false,
        activeModals: []
      };
    }
    
    const modals = state.modals || {};
    return {
      hasActiveModals: Object.values(modals).some(open => open),
      activeModals: Object.entries(modals).filter(([_, open]) => open).map(([name]) => name)
    };
  } catch (error) {
    console.warn('Error in useModalState selector:', error);
    return {
      hasActiveModals: false,
      activeModals: []
    };
  }
});

export const useNotificationState = () => useUIStore(state => {
  try {
    if (!state) {
      return {
        hasNotifications: false,
        unreadCount: 0,
        hasUnreadNotifications: false
      };
    }
    
    const notifications = state.notifications || [];
    return {
      hasNotifications: notifications.length > 0,
      unreadCount: notifications.length, // Since there's no read property, treat all as unread
      hasUnreadNotifications: notifications.length > 0
    };
  } catch (error) {
    console.warn('Error in useNotificationState selector:', error);
    return {
      hasNotifications: false,
      unreadCount: 0,
      hasUnreadNotifications: false
    };
  }
});

export const useNavigationState = () => useUIStore(state => {
  try {
    if (!state) {
      return {
        currentRoute: '/',
        breadcrumbs: [],
        canGoBack: false,
        canGoForward: false
      };
    }
    
    return {
      currentRoute: state.currentRoute || '/',
      breadcrumbs: state.breadcrumbs || [],
  canGoBack: (state.navigationHistory?.length || 0) > 1,
      canGoForward: false, // Would need forward history tracking
      currentBreadcrumb: (state.breadcrumbs?.[state.breadcrumbs.length - 1])?.label || ''
    };
  } catch (error) {
    console.warn('Error in useNavigationState selector:', error);
    return {
      currentRoute: '/',
      breadcrumbs: [],
      canGoBack: false,
      canGoForward: false
    };
  }
});

export const useSearchState = () => useUIStore(state => {
  try {
    if (!state || !state.globalSearch) {
      return {
        isSearchActive: false,
        hasSearchResults: false,
        selectedSearchResult: null,
        query: '',
        resultCount: 0
      };
    }
    
    const globalSearch = state.globalSearch;
    return {
      isSearchActive: globalSearch.active || false,
      hasSearchResults: (globalSearch.results?.length || 0) > 0,
      selectedSearchResult: globalSearch.results?.[globalSearch.selectedIndex || 0] || null,
      query: globalSearch.query || '',
      resultCount: globalSearch.results?.length || 0
    };
  } catch (error) {
    console.warn('Error in useSearchState selector:', error);
    return {
      isSearchActive: false,
      hasSearchResults: false,
      selectedSearchResult: null,
      query: '',
      resultCount: 0
    };
  }
});

export const useTourState = () => useUIStore(state => {
  try {
    if (!state || !state.tour) {
      return {
        tourProgress: 0,
        isTourCompleted: false,
        isTourActive: false,
        completedSteps: []
      };
    }
    
    const tour = state.tour;
    return {
      tourProgress: tour.currentStep || 0,
      isTourCompleted: tour.skipTour || (tour.completedSteps?.length || 0) > 0,
      isTourActive: tour.active || false,
      completedSteps: tour.completedSteps || []
    };
  } catch (error) {
    console.warn('Error in useTourState selector:', error);
    return {
      tourProgress: 0,
      isTourCompleted: false,
      isTourActive: false,
      completedSteps: []
    };
  }
});

export const useUIStatus = () => useUIStore(state => {
  try {
    if (!state) {
      return {
        isLoading: false,
        hasErrors: false,
        isPerformanceMode: false
      };
    }
    
    return {
      isLoading: Object.values(state.loading || {}).some(loading => loading),
      hasErrors: Object.values(state.errors || {}).some(error => error !== null),
      isPerformanceMode: !state.performance?.animationsEnabled || state.performance?.reducedMotion || false
    };
  } catch (error) {
    console.warn('Error in useUIStatus selector:', error);
    return {
      isLoading: false,
      hasErrors: false,
      isPerformanceMode: false
    };
  }
});

// Auto-save effect
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useUIStore.getState();
    if (state.workspace.autoSave && state.workspace.unsavedChanges) {
      useUIStore.getState().saveWorkspace();
    }
  }, useUIStore.getState().workspace.autoSaveInterval);
}

// System theme detection effect
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const state = useUIStore.getState();
    if (state.theme === 'auto') {
      useUIStore.getState().applySystemTheme();
    }
  });
}

// Export the main store hook
export default useUIStore;