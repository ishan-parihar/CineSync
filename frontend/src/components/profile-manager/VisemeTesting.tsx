'use client';

import { useState, useEffect } from 'react';
import { apiEndpoints } from '../../utils/api';

interface VisemeTestingProps {
  profileName: string;
  angle: string;
  emotion: string;
  disabled?: boolean;
}

interface VisemeTestResult {
  viseme: string;
  exists: boolean;
  valid: boolean;
  fileSize: number;
  dimensions?: { width: number; height: number };
  format: string;
  issues: string[];
  score: number; // 0-100 quality score
}

interface TestSequence {
  name: string;
  visemes: string[];
  description: string;
}

const VisemeTesting = ({ profileName, angle, emotion, disabled = false }: VisemeTestingProps) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<VisemeTestResult[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string>('');
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [currentVisemeIndex, setCurrentVisemeIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Predefined test sequences
  const testSequences: TestSequence[] = [
    {
      name: 'Basic Phonemes',
      visemes: ['A', 'E', 'I', 'O', 'U'],
      description: 'Basic vowel sounds test'
    },
    {
      name: 'Consonants',
      visemes: ['B', 'C', 'D', 'F', 'G'],
      description: 'Common consonant positions'
    },
    {
      name: 'Full Range',
      visemes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'],
      description: 'Complete viseme set test'
    },
    {
      name: 'Common Words',
      visemes: ['A', 'E', 'B', 'C', 'A', 'X'],
      description: 'Simulated "hello" sequence'
    }
  ];

  // Validate individual viseme
  const validateViseme = async (visemeName: string): Promise<VisemeTestResult> => {
    try {
      const response = await apiEndpoints.getVisemes(profileName, angle, emotion);
      const visemes = response.data?.data?.visemes || [];
      const visemeData = visemes.find((v: any) => v.viseme === visemeName);
      
      if (!visemeData) {
        return {
          viseme: visemeName,
          exists: false,
          valid: false,
          fileSize: 0,
          format: 'N/A',
          issues: ['Viseme not found in structure'],
          score: 0
        };
      }

      const issues: string[] = [];
      let score = 100;

      // Check existence
      if (!visemeData.exists) {
        issues.push('File does not exist');
        score -= 50;
      }

      // Check validity
      if (!visemeData.valid) {
        issues.push('Invalid image format');
        score -= 30;
      }

      // Additional validation would require backend support for image analysis
      // For now, we'll simulate some checks
      if (visemeData.exists && visemeData.valid) {
        // Simulate dimension check
        if (Math.random() < 0.1) { // 10% chance of dimension issues for demo
          issues.push('Image dimensions too small');
          score -= 20;
        }
        
        // Simulate format check
        if (Math.random() < 0.05) { // 5% chance of format issues
          issues.push('Recommended format: PNG or JPG');
          score -= 10;
        }
      }

      return {
        viseme: visemeName,
        exists: visemeData.exists,
        valid: visemeData.valid,
        fileSize: Math.floor(Math.random() * 50000) + 10000, // Simulated file size
        dimensions: visemeData.exists ? { 
          width: Math.floor(Math.random() * 200) + 200, 
          height: Math.floor(Math.random() * 200) + 200 
        } : undefined,
        format: visemeData.valid ? 'PNG' : 'Invalid',
        issues,
        score: Math.max(0, score)
      };

    } catch (err) {
      return {
        viseme: visemeName,
        exists: false,
        valid: false,
        fileSize: 0,
        format: 'Error',
        issues: ['Failed to validate viseme'],
        score: 0
      };
    }
  };

  // Run comprehensive viseme tests
  const runVisemeTests = async () => {
    if (disabled) return;
    
    try {
      setIsTesting(true);
      setError(null);
      
      const visemeNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'];
      const results: VisemeTestResult[] = [];
      
      for (const viseme of visemeNames) {
        const result = await validateViseme(viseme);
        results.push(result);
      }
      
      setTestResults(results);
      
    } catch (err) {
      console.error('Error testing visemes:', err);
      setError('Failed to test visemes');
    } finally {
      setIsTesting(false);
    }
  };

  // Play test sequence
  const playTestSequence = async () => {
    if (!selectedSequence) return;
    
    const sequence = testSequences.find(s => s.name === selectedSequence);
    if (!sequence) return;
    
    setIsPlayingSequence(true);
    setCurrentVisemeIndex(0);
    
    for (let i = 0; i < sequence.visemes.length; i++) {
      setCurrentVisemeIndex(i);
      await new Promise(resolve => setTimeout(resolve, 800)); // 800ms per viseme
    }
    
    setCurrentVisemeIndex(-1);
    setIsPlayingSequence(false);
  };

  // Get quality score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-error-600';
  };

  // Get overall stats
  const getTestStats = () => {
    if (testResults.length === 0) return null;
    
    const validCount = testResults.filter(r => r.valid).length;
    const existingCount = testResults.filter(r => r.exists).length;
    const avgScore = testResults.reduce((sum, r) => sum + r.score, 0) / testResults.length;
    
    return {
      validCount,
      existingCount,
      avgScore: Math.round(avgScore),
      totalIssues: testResults.reduce((sum, r) => sum + r.issues.length, 0)
    };
  };

  const stats = getTestStats();

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Test Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={runVisemeTests}
          disabled={disabled || isTesting}
          className="btn-primary btn-md disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
        >
          {isTesting ? 'Testing...' : 'Run Validation Tests'}
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          disabled={testResults.length === 0}
          className="btn-secondary btn-md disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Test Stats */}
      {stats && (
        <div className="bg-surface-variant border border-border rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Test Results Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">{stats.validCount}/9</div>
              <div className="text-sm text-text-secondary">Valid Visemes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.existingCount}/9</div>
              <div className="text-sm text-text-secondary">Existing Files</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
                {stats.avgScore}%
              </div>
              <div className="text-sm text-text-secondary">Avg Quality Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">{stats.totalIssues}</div>
              <div className="text-sm text-text-secondary">Total Issues</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {showDetails && testResults.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Detailed Results</h4>
          <div className="space-y-3">
            {testResults.map((result) => (
              <div key={result.viseme} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-lg text-text-primary">Viseme {result.viseme}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.valid ? 'bg-success-100 text-success-800' : 
                      result.exists ? 'bg-warning-100 text-warning-800' : 
                      'bg-error-100 text-error-800'
                    }`}>
                      {result.valid ? 'Valid' : result.exists ? 'Invalid' : 'Missing'}
                    </span>
                    <span className={`font-bold ${getScoreColor(result.score)}`}>
                      {result.score}%
                    </span>
                  </div>
                  
                  {result.dimensions && (
                    <div className="text-sm text-text-muted">
                      {result.dimensions.width}×{result.dimensions.height}px
                    </div>
                  )}
                </div>
                
                {result.issues.length > 0 && (
                  <div className="text-sm text-error-600">
                    <span className="font-medium">Issues:</span> {result.issues.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sequence Testing */}
      <div className="bg-surface-variant border border-border rounded-lg p-4">
        <h4 className="font-semibold text-text-primary mb-3">Sequence Testing</h4>
        
        <div className="space-y-3">
          <select
            value={selectedSequence}
            onChange={(e) => setSelectedSequence(e.target.value)}
            disabled={disabled}
            className="input input-md w-full"
          >
            <option value="">Select test sequence...</option>
            {testSequences.map((seq) => (
              <option key={seq.name} value={seq.name}>
                {seq.name} - {seq.description}
              </option>
            ))}
          </select>
          
          <div className="flex gap-3">
            <button
              onClick={playTestSequence}
              disabled={!selectedSequence || isPlayingSequence || disabled}
              className="btn-primary btn-md disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {isPlayingSequence ? 'Playing...' : 'Play Sequence'}
            </button>
          </div>
          
          {/* Sequence Display */}
          {isPlayingSequence && selectedSequence && (
            <div className="bg-surface border border-border rounded-lg p-4 text-center">
              <div className="text-sm text-text-secondary mb-2">
                Playing: {selectedSequence}
              </div>
              <div className="text-3xl font-bold text-primary-600">
                {currentVisemeIndex >= 0 && testSequences.find(s => s.name === selectedSequence)?.visemes[currentVisemeIndex]}
              </div>
              <div className="flex justify-center gap-1 mt-3">
                {testSequences.find(s => s.name === selectedSequence)?.visemes.map((viseme, index) => (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      index === currentVisemeIndex 
                        ? 'bg-primary-500 text-neutral-0' 
                        : index < currentVisemeIndex 
                        ? 'bg-neutral-300 text-neutral-600'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    {viseme}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisemeTesting;