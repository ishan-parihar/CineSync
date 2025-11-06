# State Management Architecture

This directory contains the comprehensive state management system for the LipSyncAutomation frontend, built with Zustand and organized into domain-specific stores with advanced features.

## Architecture Overview

```
stores/
├── profilesStore.ts          # Profile management and validation
├── processingStore.ts        # Job processing and queue management
├── cinematographyStore.ts    # Shot decisions and visual configuration
├── systemStore.ts           # Performance monitoring and health checks
├── uiStore.ts              # UI preferences and interface state
├── index.ts                # Store orchestration and cross-store communication
├── MIGRATION_GUIDE.md      # Detailed migration instructions
├── __tests__/             # Comprehensive test suite
│   └── stores.test.ts     # Unit and integration tests
└── README.md              # This file
```

## Key Features

### 🏗️ Domain-Specific Architecture
- **Separated Concerns**: Each store handles a specific domain
- **Scalable Design**: Easy to add new stores and features
- **Type Safety**: Full TypeScript support with strict typing
- **Performance Optimized**: Selective subscriptions and computed selectors

### ⚡ Advanced Features
- **Optimistic Updates**: Immediate UI feedback with rollback capability
- **Persistence**: Automatic localStorage with selective field persistence
- **Real-time Sync**: Cross-store event-driven updates
- **Undo/Redo**: Full history management for critical actions
- **Computed Selectors**: Efficient derived state calculations
- **Error Handling**: Comprehensive error management across stores

### 🔄 Store Orchestration
- **Event Bus**: Global event system for cross-store communication
- **Unified Actions**: Orchestrated operations across multiple stores
- **Workspace Persistence**: Automatic save/restore of application state
- **Health Monitoring**: System-wide status and performance tracking

## Store Details

### 📁 Profiles Store (`profilesStore.ts`)
Manages character profiles, validation, and asset management.

**Key Features:**
- Profile CRUD operations with optimistic updates
- Real-time validation and analysis
- Filtering, sorting, and search capabilities
- Bulk operations and batch validation
- Cache management with expiry

**Main Selectors:**
```typescript
useActiveProfile()          // Current active profile
useValidProfiles()          // Filtered valid profiles
useProfileStats()          // Profile statistics
useProfileStatus()         // Loading and error states
```

**Example Usage:**
```typescript
const profilesStore = useProfilesStore();
const activeProfile = useActiveProfile();

const handleProfileSelect = (profileId: string) => {
  profilesStore.setActiveProfile(profileId);
  // Cross-store events automatically fired
};
```

### ⚙️ Processing Store (`processingStore.ts`)
Handles job processing, queue management, and real-time updates.

**Key Features:**
- Job lifecycle management with WebSocket integration
- Processing stage tracking and progress monitoring
- Queue management with position and wait time estimates
- Bulk operations (cancel, retry multiple jobs)
- Performance metrics and statistics

**Main Selectors:**
```typescript
useCurrentJob()            // Currently processing job
useFilteredJobs()          // Filtered and sorted jobs
useProcessingStatus()      // Overall processing status
useJobCounts()            // Job count by status
```

**Example Usage:**
```typescript
const { createJob, currentJob } = useProcessingStore();
const { createOrchestratedJob } = useStoreOrchestration();

const handleJobCreate = async (profileId: string, audioFile: File) => {
  const job = await createOrchestratedJob(profileId, audioFile);
  // Automatic cross-store updates and notifications
};
```

### 🎬 Cinematography Store (`cinematographyStore.ts`)
Manages shot decisions, camera configurations, and visual storytelling.

**Key Features:**
- Shot sequence editing with undo/redo support
- Emotion analysis integration
- Real-time validation and suggestions
- Override management and presets
- Import/export functionality

**Main Selectors:**
```typescript
useSelectedShot()          // Currently selected shot
useCinematographyStatus()   // Editing and validation status
useCurrentShot()          // Shot at current playback time
```

**Example Usage:**
```typescript
const cinematographyStore = useCinematographyStore();
const { editShot, saveEdits, undo } = cinematographyStore;

const handleShotEdit = (index: number, updates: Partial<ShotDecision>) => {
  cinematographyStore.editShot(index, updates);
  // Optimistic updates with undo/redo support
};
```

### 🖥️ System Store (`systemStore.ts`)
Monitors system performance, health checks, and application metrics.

**Key Features:**
- Real-time performance monitoring
- Health checks with service status
- Alert management and notifications
- Metrics history and trending
- Log management and export

**Main Selectors:**
```typescript
useSystemHealth()          // Overall system health
usePerformanceInsights()   // Performance metrics
useSystemStatistics()      // System statistics
```

**Example Usage:**
```typescript
const systemStore = useSystemStore();
const { isSystemHealthy, addAlert } = systemStore;

const handleHealthCheck = async () => {
  await systemStore.performHealthCheck();
  // Automatic alerts and notifications on status changes
};
```

### 🎨 UI Store (`uiStore.ts`)
Manages user preferences, interface state, and UI interactions.

**Key Features:**
- Theme management with system detection
- Layout and panel configuration
- Modal and overlay management
- Keyboard shortcuts and tour system
- Workspace persistence

**Main Selectors:**
```typescript
useThemeState()           // Current theme and appearance
useNotificationState()    // Notification management
useModalState()          // Active modals state
```

**Example Usage:**
```typescript
const uiStore = useUIStore();
const { setTheme, openModal, addNotification } = uiStore;

const handleThemeChange = (theme: 'light' | 'dark') => {
  uiStore.setTheme(theme);
  // Automatic theme application and persistence
};
```

## Store Orchestration (`index.ts`)

The orchestration system provides unified management across all stores.

### Key Features:
- **Event Bus**: Global event system for cross-store communication
- **Unified Actions**: Complex operations spanning multiple stores
- **Workspace Management**: Automatic save/restore of application state
- **WebSocket Integration**: Centralized event handling

### Main Hooks:
```typescript
useStoreOrchestration()    // Main orchestration hook
useApplicationState()      // Global application status
useWebSocketEventHandler()  // WebSocket event management
useWorkspacePersistence()  // Workspace save/restore
```

### Example Usage:
```typescript
const { 
  createOrchestratedJob, 
  getApplicationStatus,
  eventBus 
} = useStoreOrchestration();

// Create job with full cross-store integration
const job = await createOrchestratedJob(profileId, audioFile);

// Listen to cross-store events
useEffect(() => {
  const unsubscribe = eventBus.on('job:completed', (job) => {
    // Handle job completion across stores
  });
  return unsubscribe;
}, []);
```

## Getting Started

### Installation
The stores use Zustand with middleware. Ensure dependencies are installed:

```bash
npm install zustand
```

### Basic Usage

```typescript
import { 
  useProfilesStore,
  useProcessingStore,
  useCinematographyStore,
  useSystemStore,
  useUIStore 
} from '../stores';

function MyComponent() {
  // Use individual stores
  const profilesStore = useProfilesStore();
  const processingStore = useProcessingStore();
  
  // Or use orchestration for complex operations
  const { createOrchestratedJob } = useStoreOrchestration();
  
  // Access state
  const { profiles, activeProfile } = profilesStore;
  const { currentJob } = processingStore;
  
  // Use optimized selectors
  const validProfiles = useValidProfiles();
  const currentJob = useCurrentJob();
  
  return (
    // Component JSX
  );
}
```

### Advanced Usage

#### Optimistic Updates
```typescript
const handleProfileDelete = async (profileId: string) => {
  // Optimistic update
  profilesStore.deleteProfile(profileId);
  
  try {
    await profilesAPI.deleteProfile(profileId);
    profilesStore.commitPendingOperation(profileId);
  } catch (error) {
    profilesStore.rollbackPendingOperation(profileId);
  }
};
```

#### Cross-Store Events
```typescript
// Emit events
eventBus.emit('profile:selected', { profileId });

// Listen to events
useEffect(() => {
  const unsubscribe = eventBus.on('job:completed', handleJobComplete);
  return unsubscribe;
}, []);
```

#### Workspace Persistence
```typescript
const { saveWorkspace, loadWorkspace } = useWorkspacePersistence();

// Auto-save workspace
useEffect(() => {
  const interval = setInterval(() => {
    if (hasUnsavedChanges) {
      saveWorkspace();
    }
  }, 30000);
  return () => clearInterval(interval);
}, [hasUnsavedChanges, saveWorkspace]);
```

## Testing

The stores include comprehensive test coverage. Run tests with:

```bash
npm test stores/
```

### Test Structure
- **Unit Tests**: Individual store functionality
- **Integration Tests**: Cross-store interactions
- **Performance Tests**: Large dataset handling
- **Event Bus Tests**: Cross-store communication

### Example Test
```typescript
describe('ProfilesStore', () => {
  it('should add and retrieve profiles', () => {
    const { result } = renderHook(() => useProfilesStore());
    
    act(() => {
      result.current.addProfile(mockProfile);
    });
    
    expect(result.current.profiles).toContain(mockProfile);
  });
});
```

## Performance Optimizations

### Selective Subscriptions
```typescript
// Only subscribe to specific state changes
const activeProfile = useProfilesStore(state => state.activeProfile);

// Use memoized selectors
const expensiveValue = useProfilesStore(
  useCallback(state => complexCalculation(state.profiles), [])
);
```

### Persistence Optimization
```typescript
// Only persist necessary fields
const store = create<StoreState>()(
  persist(
    (set, get) => ({ /* store implementation */ }),
    {
      name: 'store-name',
      partialize: (state) => ({
        preferences: state.preferences,
        selectedItems: state.selectedItems,
      })
    }
  )
);
```

## Migration from Monolithic Store

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions from the old `appStore.ts` to the new domain-specific architecture.

### Quick Migration Steps
1. Replace `useAppStore` imports with specific store imports
2. Update state access patterns
3. Replace manual state management with store actions
4. Implement cross-store event handling
5. Add optimistic updates for better UX
6. Update component tests

## Best Practices

### ✅ Do
- Use domain-specific stores for related state
- Leverage orchestration for complex operations
- Implement optimistic updates for better UX
- Use computed selectors for derived state
- Test store logic thoroughly
- Document cross-store events

### ❌ Don't
- Mix unrelated state in single stores
- Bypass store actions for direct state mutation
- Forget to handle errors across stores
- Ignore performance implications of large state
- Skip testing critical store functionality

## Debugging

### DevTools Integration
All stores include Zustand DevTools integration:

```typescript
// Enable tracing for debugging
const store = create<StoreState>()(
  devtools(
    (set, get) => ({ /* store implementation */ }),
    {
      name: 'store-name',
      trace: true
    }
  )
);
```

### Event Bus Debugging
```typescript
// Monitor cross-store events
storeEventBus.getHistory().forEach(event => {
  console.log(`${event.type}:`, event.data);
});
```

### State Inspection
```typescript
// Log store changes
useStoreOrchestration().stores.profiles.subscribe(
  (state) => console.log('Profiles store changed:', state)
);
```

## Contributing

When adding new features to the state management system:

1. **Domain Planning**: Determine which store should handle the new state
2. **Type Definitions**: Add comprehensive TypeScript types
3. **Action Implementation**: Implement actions with proper error handling
4. **Selector Creation**: Create optimized selectors for derived state
5. **Event Integration**: Add cross-store events if needed
6. **Test Coverage**: Write comprehensive tests
7. **Documentation**: Update relevant documentation

## Troubleshooting

### Common Issues

1. **Store Not Updating**: Check for proper action calls and event subscriptions
2. **Performance Issues**: Use selective subscriptions and memoized selectors
3. **Persistence Problems**: Verify partialize configuration
4. **Cross-Store Sync**: Ensure event bus subscriptions are properly set up

### Getting Help

- Check the [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration issues
- Review test files for usage examples
- Use DevTools to inspect store state
- Enable tracing for debugging complex issues

## Architecture Benefits

### 🚀 Performance
- **Optimized Re-renders**: Selective subscriptions prevent unnecessary updates
- **Efficient Computation**: Memoized selectors for derived state
- **Memory Management**: Automatic cleanup and history limits

### 🔧 Maintainability
- **Separation of Concerns**: Clear domain boundaries
- **Type Safety**: Full TypeScript coverage
- **Testability**: Comprehensive test suite
- **Documentation**: Extensive guides and examples

### 📈 Scalability
- **Modular Design**: Easy to extend and modify
- **Event System**: Flexible cross-store communication
- **Orchestration**: Unified management of complex operations
- **Performance Monitoring**: Built-in system health tracking

This architecture provides a robust, scalable, and maintainable foundation for the LipSyncAutomation application's state management needs.