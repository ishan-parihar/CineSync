// Jest mocks file for global setup

// Mock D3 modules
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    html: jest.fn().mockReturnThis(),
    classed: jest.fn().mockReturnThis(),
    property: jest.fn().mockReturnThis(),
    each: jest.fn().mockReturnThis(),
    node: jest.fn(),
    nodes: jest.fn(() => []),
  })),
  selectAll: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    html: jest.fn().mockReturnThis(),
    classed: jest.fn().mockReturnThis(),
    property: jest.fn().mockReturnThis(),
    each: jest.fn().mockReturnThis(),
    node: jest.fn(),
    nodes: jest.fn(() => []),
  })),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),
  scaleBand: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    bandwidth: jest.fn(() => 10),
  })),
  axisBottom: jest.fn(() => ({})),
  axisLeft: jest.fn(() => ({})),
  max: jest.fn(() => 100),
  min: jest.fn(() => 0),
  extent: jest.fn(() => [0, 100]),
  line: jest.fn(() => ({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
  })),
  area: jest.fn(() => ({
    x: jest.fn().mockReturnThis(),
    y0: jest.fn().mockReturnThis(),
    y1: jest.fn().mockReturnThis(),
  })),
}))

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: jest.fn(({ children }) => <div data-testid="line-chart">{children}</div>),
  Line: jest.fn(() => <div data-testid="line" />),
  BarChart: jest.fn(({ children }) => <div data-testid="bar-chart">{children}</div>),
  Bar: jest.fn(() => <div data-testid="bar" />),
  PieChart: jest.fn(({ children }) => <div data-testid="pie-chart">{children}</div>),
  Pie: jest.fn(() => <div data-testid="pie" />),
  XAxis: jest.fn(() => <div data-testid="x-axis" />),
  YAxis: jest.fn(() => <div data-testid="y-axis" />),
  CartesianGrid: jest.fn(() => <div data-testid="cartesian-grid" />),
  Tooltip: jest.fn(() => <div data-testid="tooltip" />),
  Legend: jest.fn(() => <div data-testid="legend" />),
  ResponsiveContainer: jest.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Play: jest.fn(() => <div data-testid="play-icon" />),
  Pause: jest.fn(() => <div data-testid="pause-icon" />),
  Settings: jest.fn(() => <div data-testid="settings-icon" />),
  ChevronLeft: jest.fn(() => <div data-testid="chevron-left-icon" />),
  ChevronRight: jest.fn(() => <div data-testid="chevron-right-icon" />),
  Upload: jest.fn(() => <div data-testid="upload-icon" />),
  Download: jest.fn(() => <div data-testid="download-icon" />),
  X: jest.fn(() => <div data-testid="x-icon" />),
  Check: jest.fn(() => <div data-testid="check-icon" />),
  AlertCircle: jest.fn(() => <div data-testid="alert-circle-icon" />),
  Info: jest.fn(() => <div data-testid="info-icon" />),
}))

// Mock Zustand stores
jest.mock('@/stores/appStore', () => ({
  useAppStore: jest.fn(() => ({
    isLoading: false,
    error: null,
    setLoading: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
  })),
}))

jest.mock('@/stores/profilesStore', () => ({
  useProfilesStore: jest.fn(() => ({
    profiles: [],
    selectedProfile: null,
    isLoading: false,
    error: null,
    fetchProfiles: jest.fn(),
    selectProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  })),
}))

jest.mock('@/stores/processingStore', () => ({
  useProcessingStore: jest.fn(() => ({
    isProcessing: false,
    progress: 0,
    stage: null,
    queue: [],
    startProcessing: jest.fn(),
    pauseProcessing: jest.fn(),
    resumeProcessing: jest.fn(),
    stopProcessing: jest.fn(),
    addToQueue: jest.fn(),
    removeFromQueue: jest.fn(),
  })),
}))

// Mock WebSocket context
jest.mock('@/contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }) => <div>{children}</div>,
  useWebSocket: () => ({
    isConnected: false,
    messages: [],
    sendMessage: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  }),
}))

// Mock API utilities
jest.mock('@/utils/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
  createApiError: jest.fn(),
  isApiError: jest.fn(),
}))

// Mock html2canvas
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ toDataURL: jest.fn(() => 'data:image/png;base64,mock') })),
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} data-testid="next-image" />,
}))

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}))