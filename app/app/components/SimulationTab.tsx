import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ChatInterface from './ChatInterface';
import { Persona, ModelEvaluation, ChatMessage, Campaign } from '../types';

// Alias for backward compatibility
type Evaluation = ModelEvaluation;

interface Simulation {
  _id: string;
  name: string;
  description?: string;
  campaign_id: string;
  model_provider: 'openai' | 'anthropic' | 'google';
  model_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  results?: any;
}

interface SimulationTabProps {
  evaluations: Evaluation[];
  personas: Persona[];
  videos: any[];
  selectedModels: Set<string>;
  onToggleModel: (model: string) => void;
  getAvailableModels: () => string[];
  onEvaluationClick: (evaluation: Evaluation) => void;
  // Per-persona chat
  expandedPersonaChats: Set<string>;
  onTogglePersonaChat: (personaId: string) => void;
  personaChats: { [personaId: string]: ChatMessage[] };
  personaChatInputs: { [personaId: string]: string };
  personaChatLoading: { [personaId: string]: boolean };
  personaChatModels: { [personaId: string]: 'openai' | 'anthropic' | 'google' };
  onPersonaChatInputChange: (personaId: string, value: string) => void;
  onSendPersonaMessage: (personaId: string) => void;
  onPersonaChatModelChange: (personaId: string, model: 'openai' | 'anthropic' | 'google') => void;
  // Results chat
  resultsChat: ChatMessage[];
  resultsChatInput: string;
  isLoadingResultsChat: boolean;
  selectedChatModel: 'openai' | 'anthropic' | 'google';
  onResultsChatInputChange: (value: string) => void;
  onSendResultsMessage: () => void;
  onChatModelChange: (model: 'openai' | 'anthropic' | 'google') => void;
  // Campaign context
  selectedCampaignId: string | null;
  campaign: any;
  // Simulation props
  simulations: Simulation[];
  runningSimulations: Set<string>;
  onCreateAndRunSimulation: (provider: 'openai' | 'anthropic' | 'google', modelName: string, simulationName: string) => Promise<Simulation | undefined>;
  onDeleteSimulation: (simulationId: string) => Promise<void>;
  selectedSimulationIds: Set<string>;
  onToggleSimulationSelection: (simulationId: string) => void;
}

export default function SimulationTab({
  evaluations,
  personas,
  videos,
  selectedModels,
  onToggleModel,
  getAvailableModels,
  onEvaluationClick,
  expandedPersonaChats,
  onTogglePersonaChat,
  personaChats,
  personaChatInputs,
  personaChatLoading,
  personaChatModels,
  onPersonaChatInputChange,
  onSendPersonaMessage,
  onPersonaChatModelChange,
  resultsChat,
  resultsChatInput,
  isLoadingResultsChat,
  selectedChatModel,
  onResultsChatInputChange,
  onSendResultsMessage,
  onChatModelChange,
  selectedCampaignId,
  campaign,
  simulations,
  runningSimulations,
  onCreateAndRunSimulation,
  onDeleteSimulation,
  selectedSimulationIds,
  onToggleSimulationSelection,
}: SimulationTabProps) {
  // Model selection state for running new simulations
  const [selectedSimulationModels, setSelectedSimulationModels] = useState<Set<string>>(new Set(['gpt-5', 'claude-sonnet-4.5', 'gemini-2.5-pro']));
  const [simulationName, setSimulationName] = useState<string>('');

  const toggleSimulationModel = (modelKey: string) => {
    setSelectedSimulationModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelKey)) {
        newSet.delete(modelKey);
      } else {
        newSet.add(modelKey);
      }
      return newSet;
    });
  };

  const handleRunSimulations = async () => {
    if (selectedSimulationModels.size === 0) {
      alert('Please select at least one model to run');
      return;
    }

    if (!simulationName.trim()) {
      alert('Please enter a simulation name');
      return;
    }

    const modelMap: { [key: string]: { provider: 'openai' | 'anthropic' | 'google', modelName: string } } = {
      'gpt-5': { provider: 'openai', modelName: 'gpt-5' },
      'claude-sonnet-4.5': { provider: 'anthropic', modelName: 'claude-sonnet-4.5' },
      'gemini-2.5-pro': { provider: 'google', modelName: 'gemini-2.5-pro' },
    };

    for (const modelKey of Array.from(selectedSimulationModels)) {
      const modelInfo = modelMap[modelKey];
      if (modelInfo) {
        try {
          await onCreateAndRunSimulation(modelInfo.provider, modelInfo.modelName, simulationName.trim());
        } catch (error) {
          console.error(`Failed to create simulation for ${modelKey}:`, error);
        }
      }
    }

    // Clear the simulation name after running
    setSimulationName('');
  };
  // Helper functions - work with simulation results
  const getCompletedSimulations = () => {
    const completed = simulations.filter(s =>
      s.status === 'completed' &&
      s.results?.evaluations &&
      s.campaign_id === selectedCampaignId
    );

    // If no simulations are selected, return all completed simulations
    // If some are selected, only return those
    if (selectedSimulationIds && selectedSimulationIds.size > 0) {
      return completed.filter(s => selectedSimulationIds.has(s._id));
    }

    return completed;
  };

  const getVideoMapping = () => {
    // Get video mapping from the most recent completed simulation for this campaign
    const completed = getCompletedSimulations();
    console.log('Completed simulations:', completed.length);

    // Try to find any completed simulation with video_mapping
    for (const sim of completed) {
      console.log('Checking simulation:', sim._id);
      console.log('Simulation results:', sim.results);
      console.log('Has video_mapping?', !!sim.results?.video_mapping);

      if (sim.results?.video_mapping) {
        console.log('✓ Found video_mapping in simulation:', sim._id);
        console.log('Video mapping data:', sim.results.video_mapping);
        return sim.results.video_mapping;
      }
    }

    console.log('⚠ No video_mapping found in any completed simulation');

    // Fallback: if simulations exist but no video_mapping, check total_videos
    if (completed.length > 0 && completed[0].results?.total_videos) {
      console.log('Using fallback - creating numbered videos');
      const totalVideos = completed[0].results.total_videos;
      // Create a simple mapping with numbered videos
      const mapping: any = {};
      for (let i = 1; i <= totalVideos; i++) {
        mapping[i.toString()] = {
          id: `video_${i}`,
          title: `Video ${i}`,
          url: null
        };
      }
      return mapping;
    }

    return null;
  };

  const getFilteredEvaluations = () => {
    // Collect all evaluations from completed simulations
    const allEvaluations: any[] = [];
    getCompletedSimulations().forEach(sim => {
      if (sim.results?.evaluations) {
        sim.results.evaluations.forEach((evalItem: any) => {
          // Transform backend structure to match frontend ModelEvaluation interface
          allEvaluations.push({
            persona_id: evalItem.persona_id,
            persona_name: evalItem.persona_name,
            provider: sim.model_provider,
            model: sim.model_name,
            simulation_id: sim._id,
            simulation_name: sim.name,
            evaluation: {
              most_preferred_video: evalItem.most_preferred_video,
              preference_ranking: evalItem.preference_ranking,
              confidence_score: evalItem.confidence_score,
              video_opinions: evalItem.video_opinions,
              reasoning: evalItem.reasoning,
              semantic_analysis: evalItem.semantic_analysis
            }
          });
        });
      }
    });

    // Filter by selected models if any
    if (selectedModels.size === 0) return allEvaluations;
    return allEvaluations.filter((e: any) => selectedModels.has(`${e.provider}-${e.model}`));
  };

  const getAvailableVideos = () => {
    const videoMapping = getVideoMapping();
    if (videoMapping) {
      return Object.keys(videoMapping).sort((a, b) => parseInt(a) - parseInt(b));
    }
    // If no video mapping, return empty array (don't extract from evaluations as they may be wrong)
    return [];
  };

  const getVideoVoteCounts = () => {
    const counts: { [key: string]: number } = {};
    const availableVideos = getAvailableVideos();

    // Initialize counts for all available videos
    availableVideos.forEach(video => {
      counts[video] = 0;
    });

    getFilteredEvaluations().forEach((e: any) => {
      const video = e.most_preferred_video || e.evaluation?.most_preferred_video;
      if (video && video in counts) counts[video]++;
    });
    return counts;
  };

  const getRankingDistribution = () => {
    const availableVideos = getAvailableVideos();
    const numVideos = availableVideos.length;

    // Initialize distribution dynamically based on available videos
    const distribution: { [video: string]: { [rank: number]: number } } = {};
    availableVideos.forEach(video => {
      distribution[video] = {};
      for (let rank = 1; rank <= numVideos; rank++) {
        distribution[video][rank] = 0;
      }
    });

    getFilteredEvaluations().forEach((e: any) => {
      const ranking = e.preference_ranking || e.evaluation?.preference_ranking || [];
      ranking.forEach((video: string, index: number) => {
        const rank = index + 1;
        if (video in distribution && rank <= numVideos) {
          distribution[video][rank]++;
        }
      });
    });

    const total = getFilteredEvaluations().length;

    // Initialize percentages dynamically
    const percentages: { [video: string]: { [rank: number]: number } } = {};
    availableVideos.forEach(video => {
      percentages[video] = {};
      for (let rank = 1; rank <= numVideos; rank++) {
        percentages[video][rank] = 0;
      }
    });

    Object.keys(distribution).forEach(video => {
      Object.keys(distribution[video]).forEach(rank => {
        const rankNum = parseInt(rank);
        percentages[video][rankNum] = total > 0 ? (distribution[video][rankNum] / total) * 100 : 0;
      });
    });

    return { distribution, percentages, total, availableVideos };
  };

  const getEvaluationsByPersona = () => {
    const byPersona: { [personaId: string]: any[] } = {};
    getFilteredEvaluations().forEach((e: any) => {
      if (!byPersona[e.persona_id]) byPersona[e.persona_id] = [];
      byPersona[e.persona_id].push(e);
    });
    return byPersona;
  };

  const getVideoTitle = (videoNumber: string) => {
    const videoMapping = getVideoMapping();

    // First try to get from video_mapping in simulation results
    if (videoMapping && videoMapping[videoNumber]) {
      const mappedTitle = videoMapping[videoNumber].title;
      // If it's not just "Video X", use it
      if (mappedTitle && !mappedTitle.match(/^Video \d+$/)) {
        return mappedTitle;
      }
    }

    // Fallback: try to find the video in the videos array by index
    const videoIndex = parseInt(videoNumber) - 1; // Convert 1-based to 0-based
    if (videos && videos.length > videoIndex && videoIndex >= 0) {
      return videos[videoIndex].title || `Video ${videoNumber}`;
    }

    return `Video ${videoNumber}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">Simulations</h2>
        <p className="text-lg opacity-90">
          Run AI-powered simulations to test how different personas respond to your videos and predict campaign performance
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Run Marketing Simulation AI Section */}
        <div className="mb-6">
          {!selectedCampaignId ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 text-sm">
                ⚠️ Please select a campaign from the dropdown at the top to run simulations
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-900">
                  <span className="font-semibold">Selected Campaign:</span> {campaign?.name || 'Loading...'}
                </p>
                {campaign?.platform && (
                  <p className="text-xs text-indigo-700 mt-1">
                    Platform: {campaign.platform}
                  </p>
                )}
              </div>

              {/* Simulation Name Input */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Simulation Name:
                </label>
                <input
                  type="text"
                  value={simulationName}
                  onChange={(e) => setSimulationName(e.target.value)}
                  placeholder="e.g., Q4 Campaign Test, Holiday Season Analysis..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Give your simulation a descriptive name to easily identify it later
                </p>
              </div>

              {/* Model Selection with Checkboxes */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select AI Models to Run:
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSimulationModels.has('gpt-5')}
                      onChange={() => toggleSimulationModel('gpt-5')}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-blue-700">🤖 OpenAI GPT-5</div>
                      <div className="text-xs text-gray-600 mt-0.5">Latest reasoning model with advanced capabilities</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSimulationModels.has('claude-sonnet-4.5')}
                      onChange={() => toggleSimulationModel('claude-sonnet-4.5')}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-purple-700">🧠 Claude Sonnet 4.5</div>
                      <div className="text-xs text-gray-600 mt-0.5">Advanced analysis and reasoning capabilities</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSimulationModels.has('gemini-2.5-pro')}
                      onChange={() => toggleSimulationModel('gemini-2.5-pro')}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-green-700">🔍 Gemini Pro 2.5</div>
                      <div className="text-xs text-gray-600 mt-0.5">Multimodal understanding and analysis</div>
                    </div>
                  </label>
                </div>

                {/* Run Button */}
                <button
                  onClick={handleRunSimulations}
                  disabled={selectedSimulationModels.size === 0 || runningSimulations.size > 0}
                  className={`w-full mt-4 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                    selectedSimulationModels.size === 0 || runningSimulations.size > 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg'
                  }`}
                >
                  <span className="text-xl">🚀</span>
                  {runningSimulations.size > 0
                    ? `Running ${runningSimulations.size} Simulation${runningSimulations.size > 1 ? 's' : ''}...`
                    : `Run ${selectedSimulationModels.size} Selected Model${selectedSimulationModels.size > 1 ? 's' : ''}`
                  }
                </button>
              </div>

              {/* Combined Active Simulations Results */}
              {simulations.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200 p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Active Simulation Results</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {selectedSimulationIds?.size || 0} selected for filtering
                      </span>
                    </div>
                  </div>

                  {/* Simulations List */}
                  <div className="space-y-2">
                    {simulations.slice(0, 10).map(sim => (
                      <div
                        key={sim._id}
                        className={`p-3 rounded-lg border-2 bg-white shadow-sm ${
                          sim.status === 'completed' ? 'border-green-300' :
                          sim.status === 'running' ? 'border-blue-300 animate-pulse' :
                          sim.status === 'failed' ? 'border-red-300' :
                          'border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Selection Checkbox */}
                          {sim.status === 'completed' && (
                            <input
                              type="checkbox"
                              checked={selectedSimulationIds?.has(sim._id) || false}
                              onChange={() => onToggleSimulationSelection?.(sim._id)}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              title="Include in results filtering"
                            />
                          )}

                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-900">{sim.name}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {sim.model_provider === 'openai' && '🤖 OpenAI'}
                              {sim.model_provider === 'anthropic' && '🧠 Anthropic'}
                              {sim.model_provider === 'google' && '🔍 Google'}
                              {' '}{sim.model_name}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              sim.status === 'completed' ? 'bg-green-200 text-green-800' :
                              sim.status === 'running' ? 'bg-blue-200 text-blue-800' :
                              sim.status === 'failed' ? 'bg-red-200 text-red-800' :
                              'bg-gray-200 text-gray-800'
                            }`}>
                              {sim.status.toUpperCase()}
                            </div>

                            {/* Delete Button */}
                            {sim.status !== 'running' && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Delete simulation "${sim.name}"?`)) {
                                    await onDeleteSimulation?.(sim._id);
                                  }
                                }}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Delete simulation"
                              >
                                <span className="text-lg">🗑️</span>
                              </button>
                            )}
                          </div>
                        </div>
                        {sim.status === 'completed' && sim.results && (
                          <div className="mt-2 text-xs text-gray-600 ml-7">
                            ✓ Evaluated {sim.results.total_personas_evaluated} personas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overall video vote summary - Most Preferred */}
        {getFilteredEvaluations().length > 0 && (() => {
          const availableVideos = getAvailableVideos();
          const numVideos = availableVideos.length;
          const gridClass = numVideos === 2 ? 'grid-cols-2' : numVideos === 3 ? 'grid-cols-3' : numVideos >= 4 ? 'grid-cols-4' : 'grid-cols-1';

          return (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Most Preferred Video ({selectedModels.size === 0 ? 'All Models' : `${selectedModels.size} ${selectedModels.size === 1 ? 'Model' : 'Models'}`})
              </h3>
              <div className={`grid ${gridClass} gap-4`}>
                {Object.entries(getVideoVoteCounts()).map(([video, count]) => {
                  const filteredTotal = getFilteredEvaluations().length;
                  const percentage = filteredTotal > 0 ? ((count / filteredTotal) * 100).toFixed(1) : 0;
                  const videoTitle = getVideoTitle(video);
                  return (
                    <div key={video} className="bg-white p-4 rounded-lg text-center shadow">
                      <div className="text-4xl font-bold text-blue-600">{percentage}%</div>
                      <div className="text-sm text-gray-800 font-semibold mt-2">{videoTitle}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {count} / {filteredTotal} votes
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Ranking Distribution */}
        {getFilteredEvaluations().length > 0 && (() => {
          const { distribution, percentages, total, availableVideos } = getRankingDistribution();
          const numVideos = availableVideos.length;
          const ranks = Array.from({ length: numVideos }, (_, i) => i + 1);

          const getRankSuffix = (rank: number) => {
            if (rank === 1) return 'st';
            if (rank === 2) return 'nd';
            if (rank === 3) return 'rd';
            return 'th';
          };

          return (
            <div className="mb-8 p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ranking Distribution Across All Videos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Percentage of times each video appears in each rank position
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Video</th>
                      {ranks.map(rank => (
                        <th key={rank} className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                          Rank {rank}{getRankSuffix(rank)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {availableVideos.map(video => {
                      const videoTitle = getVideoTitle(video);
                      return (
                        <tr key={video} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-900">{videoTitle}</span>
                          </td>
                          {ranks.map(rank => {
                            const percentage = percentages[video][rank];
                            const count = distribution[video][rank];
                            const isHighest = rank === 1 && percentage === Math.max(...availableVideos.map(v => percentages[v][1]));

                            return (
                              <td key={rank} className="px-6 py-4 whitespace-nowrap text-center">
                                <div className={`text-lg font-bold ${isHighest && rank === 1 ? 'text-green-600' : 'text-gray-900'}`}>
                                  {percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  {count} / {total}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Persona-by-persona breakdown */}
        <div className="space-y-6">
          {Object.entries(getEvaluationsByPersona())
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([personaId, personaEvaluations]) => {
              const persona = personas.find(p => p.id === personaId);

              // Get persona name from evaluation data or persona lookup
              const personaName = personaEvaluations[0]?.persona_name || persona?.name || `Persona ${personaId}`;

              return (
                <div key={personaId} className="border rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {personaName}
                    </h3>
                    {persona && (() => {
                      const demographics: string[] = [];

                      // Helper to format key names (snake_case to Title Case)
                      const formatKey = (key: string) => {
                        return key
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                      };

                      // Helper to check if value is valid
                      const isValidValue = (value: any) => {
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string' && value.trim() === '') return false;
                        if (typeof value === 'number' && value === 0) return false;
                        if (Array.isArray(value) && value.length === 0) return false;
                        if (Array.isArray(value) && value.every(v => !v || v.trim() === '')) return false;
                        return true;
                      };

                      // Helper to format value
                      const formatValue = (key: string, value: any) => {
                        if (Array.isArray(value)) {
                          return value.filter(v => v && v.trim && v.trim() !== '').join(', ');
                        }
                        if (typeof value === 'number') {
                          // Format currency fields
                          if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('price')) {
                            return `$${Math.round(value)}`;
                          }
                          // Format percentage fields
                          if (key.toLowerCase().includes('weight') || key.toLowerCase().includes('rate')) {
                            return `${(value * 100).toFixed(1)}%`;
                          }
                          // Round other numbers
                          return Math.round(value).toString();
                        }
                        return value.toString();
                      };

                      // Iterate through all demographics keys
                      Object.keys(persona.demographics).forEach(key => {
                        // Skip custom_fields
                        if (key === 'custom_fields') return;

                        const value = persona.demographics[key as keyof typeof persona.demographics];

                        if (isValidValue(value)) {
                          const formattedKey = formatKey(key);
                          const formattedValue = formatValue(key, value);

                          // Special handling for fields with mean/std pairs
                          if (key.endsWith('_mean')) {
                            const baseKey = key.replace('_mean', '');
                            const stdKey = `${baseKey}_std`;
                            const stdValue = persona.demographics[stdKey as keyof typeof persona.demographics];

                            if (stdValue !== undefined && stdValue !== null) {
                              demographics.push(`${formatKey(baseKey)}: ${formattedValue} ± ${typeof stdValue === 'number' ? stdValue.toFixed(1) : stdValue}`);
                            } else {
                              demographics.push(`${formatKey(baseKey)}: ${formattedValue}`);
                            }
                          } else if (!key.endsWith('_std')) {
                            // Don't show _std fields separately, they're handled with _mean
                            demographics.push(`${formattedKey}: ${formattedValue}`);
                          }
                        }
                      });

                      return demographics.length > 0 ? (
                        <p className="text-sm text-gray-600 mt-1">
                          {demographics.join(' • ')}
                        </p>
                      ) : null;
                    })()}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {personaEvaluations.map((evaluation: any, evalIdx: number) => {
                      const preferredVideo = evaluation.most_preferred_video || evaluation.evaluation?.most_preferred_video;
                      const confidenceScore = evaluation.confidence_score || evaluation.evaluation?.confidence_score || 0;
                      const preferenceRanking = evaluation.preference_ranking || evaluation.evaluation?.preference_ranking || [];
                      const videoTitle = getVideoTitle(preferredVideo);

                      return (
                        <div
                          key={`eval-${evaluation.persona_id || personaId}-${evaluation.provider}-${evaluation.model}-${evalIdx}`}
                          className="border rounded-lg p-3 bg-gray-50 cursor-pointer hover:shadow-md hover:bg-gray-100 transition-all"
                          onClick={() => onEvaluationClick(evaluation)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-sm text-gray-900">
                                {evaluation.provider === 'openai' && '🤖 OpenAI'}
                                {evaluation.provider === 'anthropic' && '🧠 Anthropic'}
                                {evaluation.provider === 'google' && '🔍 Google'}
                              </div>
                              <div className="text-xs text-gray-600">{evaluation.model}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">
                                {videoTitle}
                              </div>
                              <div className="text-xs text-gray-500">
                                {confidenceScore}% confident
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Ranking: {preferenceRanking.map((v: string) => getVideoTitle(v)).join(' → ')}
                          </div>
                          <div className="text-xs text-blue-600 mt-2 font-medium">
                            Click for details →
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-Persona Question Interface */}
                  <div className="mt-4">
                    <button
                      onClick={() => onTogglePersonaChat(personaId)}
                      className="w-full text-left px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium text-indigo-700 transition-colors flex items-center justify-between"
                    >
                      <span>💬 Ask questions about this persona&apos;s results</span>
                      <span className="text-xs">
                        {expandedPersonaChats.has(personaId) ? '▼' : '▶'}
                      </span>
                    </button>

                    {expandedPersonaChats.has(personaId) && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {/* Model Selector */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-600 font-medium">AI Model:</span>
                          <select
                            value={personaChatModels[personaId] || 'anthropic'}
                            onChange={(e) => onPersonaChatModelChange(personaId, e.target.value as 'openai' | 'anthropic' | 'google')}
                            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="anthropic">🧠 Claude Sonnet 4.5</option>
                            <option value="openai">🤖 GPT-5</option>
                            <option value="google">🔍 Gemini Pro 2.5</option>
                          </select>
                        </div>

                        {/* Chat Messages */}
                        <div className="bg-white rounded-lg p-3 mb-3 max-h-60 overflow-y-auto">
                          {(!personaChats[personaId] || personaChats[personaId].length === 0) ? (
                            <div className="text-center py-4 text-gray-400 text-xs">
                              <p>Ask questions about {persona?.name}&apos;s video preferences</p>
                              {personaEvaluations[0] && (
                                <p className="mt-1">e.g., &ldquo;Why did this persona prefer {getVideoTitle(personaEvaluations[0].most_preferred_video || personaEvaluations[0].evaluation?.most_preferred_video)}?&rdquo;</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {personaChats[personaId].map((message, idx) => (
                                <div
                                  key={idx}
                                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                                      message.role === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                    }`}
                                  >
                                    <div className="text-xs prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2">
                                      <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                    <div className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                                      {new Date(message.timestamp).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {personaChatLoading[personaId] && (
                                <div className="flex justify-start">
                                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                                    <div className="flex space-x-1">
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Input */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={personaChatInputs[personaId] || ''}
                            onChange={(e) => onPersonaChatInputChange(personaId, e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSendPersonaMessage(personaId);
                              }
                            }}
                            placeholder="Ask about this persona..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={personaChatLoading[personaId]}
                          />
                          <button
                            onClick={() => onSendPersonaMessage(personaId)}
                            disabled={personaChatLoading[personaId] || !(personaChatInputs[personaId] || '').trim()}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                              personaChatLoading[personaId] || !(personaChatInputs[personaId] || '').trim()
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Chat Interface */}
        <ChatInterface
          personas={personas}
          chatMessages={resultsChat}
          chatInput={resultsChatInput}
          isLoadingChat={isLoadingResultsChat}
          selectedModel={selectedChatModel}
          showMentionDropdown={false}
          mentionSearchTerm=""
          onChatInputChange={(e) => onResultsChatInputChange(e.target.value)}
          onSendMessage={onSendResultsMessage}
          onModelChange={onChatModelChange}
          onMentionSelect={() => {}}
          title="Chat with Simulation AI"
          subtitle="Ask questions about simulation results, video performance across personas, and identify trends in the data"
          examplePrompts={[
            { label: "Overall winner", prompt: "Which video performed best overall across all personas?", colorScheme: "indigo" },
            { label: "Performance trends", prompt: "What patterns do you see in how different personas respond to the videos?", colorScheme: "blue" },
            { label: "Confidence analysis", prompt: "Which evaluations have the highest confidence scores and why?", colorScheme: "green" },
            { label: "Recommendation", prompt: "Based on the simulation results, which video should we use for the campaign?", colorScheme: "purple" }
          ]}
        />
      </div>
    </div>
  );
}
