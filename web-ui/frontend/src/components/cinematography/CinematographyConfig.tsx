import { useState } from 'react';
import { Save, RotateCcw, Download, Upload, Settings, Sliders } from 'lucide-react';
import type { CinematographyConfig } from '../../types';

interface CinematographyConfigProps {
  config: CinematographyConfig | null;
  onConfigChange: (config: CinematographyConfig) => void;
  onPresetSave: (name: string, config: CinematographyConfig) => void;
  onPresetLoad: (name: string) => void;
}

const DEFAULT_RULES = {
  emotion_shot_mapping: {
    joy: { preferred_shots: ['CU', 'MCU'], weights: { CU: 0.8, MCU: 0.6 } },
    sadness: { preferred_shots: ['MS', 'MWS'], weights: { MS: 0.7, MWS: 0.8 } },
    anger: { preferred_shots: ['CU', 'ECU'], weights: { CU: 0.9, ECU: 0.7 } },
    fear: { preferred_shots: ['CU', 'MCU'], weights: { CU: 0.8, MCU: 0.6 } },
    surprise: { preferred_shots: ['MCU', 'CU'], weights: { MCU: 0.7, CU: 0.8 } },
    disgust: { preferred_shots: ['ECU', 'CU'], weights: { ECU: 0.8, CU: 0.6 } },
    neutral: { preferred_shots: ['MS', 'MCU'], weights: { MS: 0.6, MCU: 0.7 } }
  },
  tension_based_adjustments: {
    high_tension: { shot_preference: 'CU', angle_preference: 'eye_level' },
    low_tension: { shot_preference: 'MS', angle_preference: 'eye_level' },
    building_tension: { progression: ['WS', 'MS', 'MCU', 'CU'] },
    releasing_tension: { progression: ['CU', 'MCU', 'MS', 'WS'] }
  },
  continuity_rules: {
    max_shot_jump: 2,
    preferred_transitions: {
      'CU': ['MCU', 'CU'],
      'MCU': ['CU', 'MS', 'MCU'],
      'MS': ['MCU', 'MWS', 'MS'],
      'MWS': ['MS', 'WS', 'MWS'],
      'WS': ['MWS', 'WS']
    }
  }
} as const;

const DEFAULT_WEIGHTS = {
  emotion_weight: 0.4,
  tension_weight: 0.3,
  grammar_weight: 0.3,
  temporal_smoothing: 0.2,
  shot_duration_range: {
    min: 0.5,
    max: 5.0
  },
  angle_stability_window: 3,
  distance_progression_preference: true
};

const PRESET_TEMPLATES = [
  {
    name: 'Cinematic Film',
    description: 'Classic cinematic style with smooth transitions',
    weights: { ...DEFAULT_WEIGHTS, grammar_weight: 0.4, temporal_smoothing: 0.3 }
  },
  {
    name: 'Dynamic Action',
    description: 'High energy with frequent shot changes',
    weights: { ...DEFAULT_WEIGHTS, temporal_smoothing: 0.1, shot_duration_range: { min: 0.3, max: 3.0 } }
  },
  {
    name: 'Intimate Drama',
    description: 'Focus on close-ups and emotional expression',
    weights: { ...DEFAULT_WEIGHTS, emotion_weight: 0.6, tension_weight: 0.4 }
  },
  {
    name: 'Documentary',
    description: 'Naturalistic shot selection with medium shots',
    weights: { ...DEFAULT_WEIGHTS, emotion_weight: 0.3, grammar_weight: 0.4 }
  }
];

export const CinematographyConfigPanel: React.FC<CinematographyConfigProps> = ({
  config,
  onConfigChange,
  onPresetSave,
  onPresetLoad
}) => {
  const [activeTab, setActiveTab] = useState<'weights' | 'rules' | 'presets'>('weights');
  const [editingWeights, setEditingWeights] = useState(config?.weights || DEFAULT_WEIGHTS);
  const [editingGrammarRules, setEditingGrammarRules] = useState(config?.grammar_rules || (DEFAULT_RULES as any));
  const [newPresetName, setNewPresetName] = useState('');

  const handleWeightChange = (key: string, value: number | boolean) => {
    const updatedWeights = { ...editingWeights, [key]: value };
    setEditingWeights(updatedWeights);
    
    if (config) {
      onConfigChange({
        ...config,
        weights: updatedWeights
      });
    }
  };

  const handleRuleChange = (category: string, rule: string, value: any) => {
    const updatedRules = {
      ...editingGrammarRules,
      [category]: {
        ...editingGrammarRules[category as keyof typeof editingGrammarRules],
        [rule]: value
      }
    };
    setEditingGrammarRules(updatedRules);
    
    if (config) {
      onConfigChange({
        ...config,
        grammar_rules: updatedRules
      });
    }
  };

  const handleReset = () => {
    setEditingWeights(DEFAULT_WEIGHTS);
    setEditingGrammarRules(DEFAULT_RULES as any);
    
    onConfigChange({
      weights: DEFAULT_WEIGHTS,
      emotion_mappings: {},
      tension_mappings: {},
      grammar_rules: DEFAULT_RULES as any
    });
  };

  const handlePresetSave = () => {
    if (newPresetName.trim()) {
      onPresetSave(newPresetName.trim(), {
        weights: editingWeights,
        emotion_mappings: config?.emotion_mappings || {},
        tension_mappings: config?.tension_mappings || {},
        grammar_rules: editingGrammarRules
      });
      setNewPresetName('');
    }
  };

  const handlePresetLoad = (preset: typeof PRESET_TEMPLATES[0]) => {
    setEditingWeights(preset.weights);
    onConfigChange({
      weights: preset.weights,
      emotion_mappings: config?.emotion_mappings || {},
      tension_mappings: config?.tension_mappings || {},
      grammar_rules: editingGrammarRules
    });
  };

  const exportConfig = () => {
    const dataStr = JSON.stringify({ 
      weights: editingWeights,
      grammar_rules: editingGrammarRules
    }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'cinematography-config.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setEditingWeights(imported.weights || DEFAULT_WEIGHTS);
          setEditingGrammarRules(imported.grammar_rules || DEFAULT_RULES);
          
          onConfigChange({
            weights: imported.weights || DEFAULT_WEIGHTS,
            emotion_mappings: imported.emotion_mappings || {},
            tension_mappings: imported.tension_mappings || {},
            grammar_rules: imported.grammar_rules || DEFAULT_RULES
          });
        } catch (error) {
          console.error('Failed to import config:', error);
          alert('Invalid configuration file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Cinematography Configuration</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-3 py-1 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              onClick={exportConfig}
              className="flex items-center space-x-1 px-3 py-1 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <label className="flex items-center space-x-1 px-3 py-1 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
              <Upload size={14} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('weights')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'weights'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Sliders size={14} className="inline mr-1" />
            Weights
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings size={14} className="inline mr-1" />
            Rules
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Save size={14} className="inline mr-1" />
            Presets
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Weights Tab */}
        {activeTab === 'weights' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Decision Weights</h4>
              <p className="text-sm text-gray-600 mb-4">
                Adjust how much each factor influences shot selection decisions.
              </p>
              
              <div className="space-y-4">
                {Object.entries(editingWeights).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      <div className="flex items-center space-x-3">
                        {typeof value === 'object' ? (
                          <div className="text-sm text-gray-600">
                            {JSON.stringify(value)}
                          </div>
                        ) : typeof value === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleWeightChange(key, e.target.checked)}
                            className="h-4 w-4"
                          />
                        ) : (
                          <>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={value}
                              onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                              className="flex-1"
                            />
                            <span className="w-12 text-sm font-medium text-gray-900">
                              {typeof value === 'number' ? value.toFixed(1) : value}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
{/* Distance Progression Rules */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Distance Progression Rules</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Progression Penalty</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={editingGrammarRules.distance_progression?.progression_penalty || 0.3}
                    onChange={(e) => handleRuleChange('distance_progression', 'progression_penalty', parseFloat(e.target.value))}
                    className="w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">180 Degree Rule</label>
                  <input
                    type="checkbox"
                    checked={editingGrammarRules.angle_consistency?.['180_degree_rule'] || true}
                    onChange={(e) => handleRuleChange('angle_consistency', '180_degree_rule', e.target.checked)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Tension Based Adjustments */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Tension-Based Adjustments</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(editingGrammarRules.distance_progression?.allowed_sequences || []).map((sequence, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 capitalize mb-2">
                      Sequence {index + 1}
                    </h5>
<div className="space-y-1 text-sm text-gray-600">
                      <div>Shots: {Array.isArray(sequence) ? sequence.join(' → ') : String(sequence)}</div>
                    </div>
                      </div>
                ))}
              </div>
            </div>

            {/* Simplified Grammar Rules */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Grammar Rules</h4>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Grammar rules are currently configured through the backend configuration files.
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    <div>180 Degree Rule: {editingGrammarRules.angle_consistency?.['180_degree_rule'] ? 'Enabled' : 'Disabled'}</div>
                    <div>Progression Penalty: {editingGrammarRules.distance_progression?.progression_penalty || 0.3}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            {/* Save New Preset */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Save Current Configuration</h4>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handlePresetSave}
                  disabled={!newPresetName.trim()}
                  className="flex items-center space-x-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  <span>Save Preset</span>
                </button>
              </div>
            </div>

            {/* Load Preset */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Load Preset</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESET_TEMPLATES.map((preset) => (
                  <div
                    key={preset.name}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => handlePresetLoad(preset)}
                  >
                    <h5 className="font-medium text-gray-900">{preset.name}</h5>
                    <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Emotion: {preset.weights.emotion_weight.toFixed(1)} | 
                      Tension: {preset.weights.tension_weight.toFixed(1)} | 
                      Grammar: {preset.weights.grammar_weight.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};