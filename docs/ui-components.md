# UI Components Documentation

## Overview
This document analyzes the UI component architecture, design system, and component organization in the LipSyncAutomation frontend application.

## Component Architecture

### Design System Structure
```
frontend/src/components/ui/
├── atoms/           # Smallest reusable components
├── molecules/       # Combinations of atoms
├── organisms/       # Complex sections
├── templates/       # Page layouts
└── __tests__/       # Component testing
```

### Atomic Design Implementation

#### Atoms (Basic Building Blocks)
**File**: `frontend/src/components/ui/atoms/`

##### Button Component
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
```

##### Input Component
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'file';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
}
```

##### Badge Component
```typescript
interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}
```

##### Avatar Component
```typescript
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}
```

#### Molecules (Component Combinations)
**File**: `frontend/src/components/ui/molecules/`

##### FormField Component
```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}
```

##### Card Component
```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

##### Modal Component
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}
```

##### Alert Component
```typescript
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  children: React.ReactNode;
}
```

#### Organisms (Complex UI Sections)
**File**: `frontend/src/components/ui/organisms/`

##### DataTable Component
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  selection?: SelectionConfig<T>;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  onRowClick?: (row: T) => void;
  className?: string;
}
```

##### Form Component
```typescript
interface FormProps {
  onSubmit: (data: FormData) => void;
  validation?: ValidationSchema;
  defaultValues?: Record<string, any>;
  loading?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}
```

## Domain-Specific Components

### Profile Management Components
**File**: `frontend/src/components/profile-manager/`

#### ProfileManager Component
```typescript
interface ProfileManagerProps {
  profiles: ProfileConfig[];
  activeProfile?: string;
  onProfileSelect: (profileName: string) => void;
  onProfileCreate: (profileData: Partial<ProfileConfig>) => void;
  onProfileUpdate: (profileName: string, updates: Partial<ProfileConfig>) => void;
  onProfileDelete: (profileName: string) => void;
  loading?: boolean;
  className?: string;
}
```

#### ProfileSelector Component
```typescript
interface ProfileSelectorProps {
  profiles: ProfileConfig[];
  selectedProfile?: string;
  onProfileChange: (profileName: string) => void;
  allowCreate?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}
```

#### VisemeGrid Component
```typescript
interface VisemeGridProps {
  visemes: Viseme[];
  selectedVisemes: string[];
  onVisemeSelect: (visemeName: string) => void;
  onVisemeUpload: (visemeData: VisemeUploadData) => void;
  onVisemeDelete: (visemeName: string) => void;
  loading?: boolean;
  editable?: boolean;
  className?: string;
}
```

#### AngleSelector Component
```typescript
interface AngleSelectorProps {
  angles: string[];
  selectedAngle?: string;
  onAngleChange: (angle: string) => void;
  disabled?: boolean;
  className?: string;
}
```

#### EmotionSelector Component
```typescript
interface EmotionSelectorProps {
  emotions: string[];
  selectedEmotion?: string;
  onEmotionChange: (emotion: string) => void;
  disabled?: boolean;
  className?: string;
}
```

#### BulkVisemeOperations Component
```typescript
interface BulkVisemeOperationsProps {
  profileName: string;
  angleName: string;
  emotionName: string;
  onBulkUpload: (files: File[]) => void;
  onBulkDelete: (visemeNames: string[]) => void;
  onValidate: () => void;
  loading?: boolean;
  className?: string;
}
```

### Processing Components
**File**: `frontend/src/components/processing/`

#### ProcessingStagesIndicator Component
```typescript
interface ProcessingStagesIndicatorProps {
  stages: ProcessingStage[];
  currentStage?: string;
  jobId: string;
  className?: string;
}
```

#### InteractiveTimeline Component
```typescript
interface InteractiveTimelineProps {
  duration: number;
  segments: TimelineSegment[];
  selectedSegment?: number;
  onSegmentSelect: (segmentIndex: number) => void;
  onTimeChange: (time: number) => void;
  zoom?: number;
  className?: string;
}
```

#### BatchQueueManager Component
```typescript
interface BatchQueueManagerProps {
  jobs: Job[];
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  className?: string;
}
```

#### ShotDecisionPreview Component
```typescript
interface ShotDecisionPreviewProps {
  shotDecision: ShotDecisionEvent;
  emotionSegment?: EmotionSegment;
  showAlternatives?: boolean;
  onAlternativeSelect: (shot: string) => void;
  className?: string;
}
```

### Cinematography Components
**File**: `frontend/src/components/cinematography/`

#### CinematographyConfig Component
```typescript
interface CinematographyConfigProps {
  config: CinematographyConfig;
  onConfigUpdate: (updates: Partial<CinematographyConfig>) => void;
  loading?: boolean;
  className?: string;
}
```

#### EmotionAnalysisViewer Component
```typescript
interface EmotionAnalysisViewerProps {
  analysis: EmotionAnalysis;
  selectedSegment?: number;
  onSegmentSelect: (segmentIndex: number) => void;
  showConfidence?: boolean;
  showIntensity?: boolean;
  className?: string;
}
```

#### ShotSequencePreview Component
```typescript
interface ShotSequencePreviewProps {
  shots: ShotDecisionEvent[];
  selectedShot?: number;
  onShotSelect: (shotIndex: number) => void;
  viewMode?: 'timeline' | 'storyboard' | 'detailed';
  className?: string;
}
```

### Visualization Components
**File**: `frontend/src/components/visualization/`

#### EmotionHeatmap Component
```typescript
interface EmotionHeatmapProps {
  segments: EmotionSegment[];
  width?: number;
  height?: number;
  colorScheme?: 'viridis' | 'plasma' | 'warm' | 'cool';
  interactive?: boolean;
  onSegmentHover?: (segment: EmotionSegment) => void;
  className?: string;
}
```

#### EmotionRadar Component
```typescript
interface EmotionRadarProps {
  emotions: Record<string, number>;
  width?: number;
  height?: number;
  animated?: boolean;
  showLabels?: boolean;
  className?: string;
}
```

#### EmotionTimeline Component
```typescript
interface EmotionTimelineProps {
  segments: EmotionSegment[];
  width?: number;
  height?: number;
  showConfidence?: boolean;
  interactive?: boolean;
  onSegmentClick?: (segment: EmotionSegment) => void;
  className?: string;
}
```

#### SystemPerformanceDashboard Component
```typescript
interface SystemPerformanceDashboardProps {
  performance: SystemPerformance;
  metrics: MetricPoint[];
  timeRange?: '1h' | '6h' | '24h' | '7d';
  refreshInterval?: number;
  className?: string;
}
```

#### TensionCurve Component
```typescript
interface TensionCurveProps {
  tensionData: TensionPoint[];
  width?: number;
  height?: number;
  showThresholds?: boolean;
  interactive?: boolean;
  onPointClick?: (point: TensionPoint) => void;
  className?: string;
}
```

## Layout Components

### Navigation Component
**File**: `frontend/src/components/Navigation.tsx`

```typescript
interface NavigationProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  user?: User;
  notifications?: Notification[];
  className?: string;
}
```

### Dashboard Component
**File**: `frontend/src/components/Dashboard.tsx`

```typescript
interface DashboardProps {
  profiles: ProfileConfig[];
  jobs: Job[];
  systemHealth: SystemHealth;
  className?: string;
}
```

### WebSocketStatus Component
**File**: `frontend/src/components/WebSocketStatus.tsx`

```typescript
interface WebSocketStatusProps {
  isConnected: boolean;
  connectionState: ConnectionState;
  lastError?: string;
  onReconnect?: () => void;
  className?: string;
}
```

### PerformanceDashboard Component
**File**: `frontend/src/components/PerformanceDashboard.tsx`

```typescript
interface PerformanceDashboardProps {
  performance: SystemPerformance;
  alerts: SystemAlert[];
  onAlertDismiss: (alertId: string) => void;
  className?: string;
}
```

## Component Patterns

### 1. Container/Presentation Pattern
```typescript
// Container Component (logic)
const ProfileManagerContainer: React.FC = () => {
  const profiles = useProfilesStore(state => state.profiles);
  const loadProfiles = useProfilesStore(state => state.loadProfiles);
  const createProfile = useProfilesStore(state => state.createProfile);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <ProfileManager
      profiles={profiles}
      onProfileCreate={createProfile}
      // ... other props
    />
  );
};

// Presentation Component (UI only)
const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  onProfileCreate,
  className
}) => {
  return (
    <div className={className}>
      {/* UI implementation */}
    </div>
  );
};
```

### 2. Compound Component Pattern
```typescript
const VisemeGrid = Object.assign(
  ({ children, ...props }: VisemeGridProps) => (
    <div className="viseme-grid" {...props}>
      {children}
    </div>
  ),
  {
    Item: VisemeGridItem,
    Upload: VisemeUploadButton,
    Preview: VisemePreview
  }
);

// Usage
<VisemeGrid>
  <VisemeGrid.Item viseme={viseme} />
  <VisemeGrid.Upload onUpload={handleUpload} />
</VisemeGrid>
```

### 3. Render Props Pattern
```typescript
interface DataProviderProps<T> {
  data: T[];
  children: (data: T[], actions: DataActions<T>) => React.ReactNode;
}

const DataProvider = <T,>({ data, children }: DataProviderProps<T>) => {
  const [filteredData, setFilteredData] = useState(data);

  const actions = {
    filter: (predicate: (item: T) => boolean) => {
      setFilteredData(data.filter(predicate));
    },
    sort: (compareFn: (a: T, b: T) => number) => {
      setFilteredData([...filteredData].sort(compareFn));
    }
  };

  return <>{children(filteredData, actions)}</>;
};
```

### 4. Higher-Order Component Pattern
```typescript
const withLoadingState = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.memo((props: P & { loading?: boolean }) => {
    const { loading, ...rest } = props;

    if (loading) {
      return <LoadingSpinner />;
    }

    return <Component {...(rest as P)} />;
  });
};

const ProfileCard = withLoadingState(ProfileCardComponent);
```

## Component Testing Strategy

### Testing Structure
```typescript
// Button component test
describe('Button', () => {
  it('renders with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### Component Integration Tests
```typescript
describe('ProfileManager Integration', () => {
  it('creates and displays new profile', async () => {
    const mockCreateProfile = jest.fn();
    
    render(
      <ProfileManager
        profiles={[]}
        onProfileCreate={mockCreateProfile}
      />
    );

    fireEvent.click(screen.getByText('Create Profile'));
    fireEvent.change(screen.getByLabelText('Profile Name'), {
      target: { value: 'test-profile' }
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateProfile).toHaveBeenCalledWith({
        profile_name: 'test-profile'
      });
    });
  });
});
```

## Component Performance Optimizations

### 1. React.memo Usage
```typescript
const VisemeGrid = React.memo<VisemeGridProps>(({ 
  visemes, 
  selectedVisemes, 
  onVisemeSelect 
}) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.visemes === nextProps.visemes &&
    prevProps.selectedVisemes === nextProps.selectedVisemes
  );
});
```

### 2. useMemo and useCallback
```typescript
const ProfileSelector: React.FC<ProfileSelectorProps> = ({ 
  profiles, 
  selectedProfile, 
  onProfileChange 
}) => {
  const profileOptions = useMemo(() => 
    profiles.map(profile => ({
      value: profile.profile_name,
      label: profile.profile_name
    })), [profiles]
  );

  const handleProfileChange = useCallback((value: string) => {
    onProfileChange(value);
  }, [onProfileChange]);

  return (
    <Select
      options={profileOptions}
      value={selectedProfile}
      onChange={handleProfileChange}
    />
  );
};
```

### 3. Virtual Scrolling
```typescript
const VirtualizedVisemeGrid: React.FC<VirtualizedVisemeGridProps> = ({ 
  visemes 
}) => {
  return (
    <FixedSizeGrid
      columnCount={4}
      columnWidth={150}
      height={400}
      rowCount={Math.ceil(visemes.length / 4)}
      rowHeight={150}
      width={600}
    >
      {({ columnIndex, rowIndex, style }) => {
        const visemeIndex = rowIndex * 4 + columnIndex;
        const viseme = visemes[visemeIndex];
        
        return viseme ? (
          <div style={style}>
            <VisemeCard viseme={viseme} />
          </div>
        ) : null;
      }}
    </FixedSizeGrid>
  );
};
```

## Component Styling Strategy

### Tailwind CSS Integration
```typescript
// Consistent styling with Tailwind classes
const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'hover:bg-gray-100 text-gray-700'
};

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  children,
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors duration-200';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${buttonVariants[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Component-Specific Styles
```typescript
// CSS-in-JS for complex components
const VisemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  padding: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;
```

## Component Accessibility

### ARIA Implementation
```typescript
const Button: React.FC<ButtonProps> = ({ 
  children, 
  disabled, 
  loading, 
  ...props 
}) => {
  return (
    <button
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      aria-describedby={loading ? 'loading-description' : undefined}
      {...props}
    >
      {loading && (
        <span id="loading-description" className="sr-only">
          Loading, please wait
        </span>
      )}
      {children}
    </button>
  );
};
```

### Keyboard Navigation
```typescript
const VisemeGrid: React.FC<VisemeGridProps> = ({ 
  visemes, 
  selectedVisemes, 
  onVisemeSelect 
}) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        onVisemeSelect(visemes[index].name);
        break;
      case 'ArrowRight':
        focusNext(index);
        break;
      case 'ArrowLeft':
        focusPrevious(index);
        break;
    }
  }, [visemes, onVisemeSelect]);

  return (
    <div role="grid" aria-label="Viseme grid">
      {visemes.map((viseme, index) => (
        <div
          key={viseme.name}
          role="gridcell"
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, index)}
          aria-selected={selectedVisemes.includes(viseme.name)}
        >
          <VisemeCard viseme={viseme} />
        </div>
      ))}
    </div>
  );
};
```

---

**Analysis Date**: 2025-11-10  
**Scan Depth**: Deep Analysis  
**Component Framework**: React + TypeScript  
**Design System**: Atomic Design with Tailwind CSS  
**Testing**: Jest + React Testing Library