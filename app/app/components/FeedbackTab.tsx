import React from 'react';
import ChatInterface from './ChatInterface';
import { Persona, ChatMessage, Video } from '../types';

interface Feedback {
  _id?: string;
  videoNumber?: number;
  title?: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface TimelineSegment {
  output_start: number;
  output_end: number;
  source_video_num: number;
  video_id: string;
  source_start: number;
  source_end: number;
  duration: number;
  description: string;
}

interface ProductionSpecifications {
  pacing_strategy: string[];
  color_palette: string[];
  text_overlay_philosophy: string[];
  audio_strategy: string[];
}

interface SynthesisElement {
  source: string;
  elements: string;
}

interface SynthesisVideo {
  campaign_id: string;
  title: string;
  description: string;
  source_videos: string[];
  timeline: TimelineSegment[];
  total_duration: number;
  output_url: string;
  status: string;
  production_specifications?: ProductionSpecifications;
  synthesis_elements?: SynthesisElement[];
}

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

interface InsightHistory {
  id: string;
  campaign_id: string;
  question: string;
  insights: any;
  evaluations_count: number;
  videos_count: number;
  created_at: string;
  generated_by: string;
}

interface FeedbackTabProps {
  feedbacks: Feedback[];
  synthesisVideo: SynthesisVideo | null;
  personas: Persona[];
  videos: Video[];
  getVideoVoteCounts: () => { [key: string]: number };
  getFilteredEvaluations: () => any[];
  getRankingDistribution: () => {
    distribution: { [video: string]: { [rank: number]: number } };
    percentages: { [video: string]: { [rank: number]: number } };
    total: number;
  };
  chatMessages: ChatMessage[];
  chatInput: string;
  isLoadingChat: boolean;
  selectedModel: 'openai' | 'anthropic' | 'google';
  showMentionDropdown: boolean;
  mentionSearchTerm: string;
  onChatInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onModelChange: (model: 'openai' | 'anthropic' | 'google') => void;
  onMentionSelect: (mention: string) => void;
  dynamicInsights?: any;
  loadingInsights?: boolean;
  loadingVideoAnalysis?: boolean;
  generatedInsights?: any;
  simulations?: Simulation[];
  selectedSimulation?: string | null;
  onSimulationChange?: (simulationId: string | null) => void;
  onGenerateInsights?: () => void;
  selectedCampaignId?: string | null;
  insightsInput?: string;
  onInsightsInputChange?: (value: string) => void;
  insightsHistory?: InsightHistory[];
}

export default function FeedbackTab({
  feedbacks,
  synthesisVideo,
  personas,
  videos,
  getVideoVoteCounts,
  getFilteredEvaluations,
  getRankingDistribution,
  chatMessages,
  chatInput,
  isLoadingChat,
  selectedModel,
  showMentionDropdown,
  mentionSearchTerm,
  onChatInputChange,
  onSendMessage,
  onModelChange,
  onMentionSelect,
  dynamicInsights,
  loadingInsights,
  loadingVideoAnalysis = false,
  generatedInsights,
  simulations = [],
  selectedSimulation,
  onSimulationChange,
  onGenerateInsights,
  selectedCampaignId,
  insightsInput = '',
  onInsightsInputChange,
  insightsHistory = [],
}: FeedbackTabProps) {
  // State for managing which insights are expanded
  const [expandedInsights, setExpandedInsights] = React.useState<Set<string>>(new Set());

  const toggleInsightExpansion = (id: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInsights(newExpanded);
  };

  // Get simulation-specific evaluations if a simulation is selected
  const getSimulationEvaluations = () => {
    if (!selectedSimulation) {
      // Use overall evaluations when no simulation is selected
      const allEvals = getFilteredEvaluations();
      console.log('Using overall evaluations:', allEvals.length);
      return allEvals;
    }

    const simulation = simulations.find(s => s._id === selectedSimulation);
    if (simulation && simulation.results && simulation.results.evaluations) {
      console.log('Using simulation evaluations:', simulation.results.evaluations.length);
      return simulation.results.evaluations;
    }

    console.log('No evaluations found for simulation');
    return [];
  };

  // Calculate performance metrics for selected simulation or overall
  const getPerformanceMetrics = () => {
    const evaluations = getSimulationEvaluations();
    const total = evaluations.length;

    console.log('=== Performance Metrics Debug ===');
    console.log('Total evaluations:', total);
    console.log('Number of videos:', videos.length);

    // Initialize votes and distribution for all videos dynamically
    // Evaluations use "1", "2", "3", "4" as video IDs
    const votes: { [key: string]: number } = {};
    const distribution: { [video: string]: { [rank: number]: number } } = {};

    // Initialize for each video index
    for (let i = 1; i <= videos.length; i++) {
      const videoKey = String(i);
      votes[videoKey] = 0;
      distribution[videoKey] = {};
      for (let rank = 1; rank <= videos.length; rank++) {
        distribution[videoKey][rank] = 0;
      }
    }

    // Process each evaluation
    evaluations.forEach((evaluation: any, idx: number) => {
      const preferred = String(evaluation.evaluation?.most_preferred_video);
      const ranking = evaluation.evaluation?.preference_ranking || [];

      if (idx < 3) { // Log first 3 for debugging
        console.log(`Evaluation ${idx + 1}:`, {
          preferred,
          ranking,
          persona: evaluation.persona_name
        });
      }

      // Count most preferred votes
      if (preferred && votes[preferred] !== undefined) {
        votes[preferred]++;
      } else if (preferred) {
        console.warn('Unknown video ID:', preferred);
      }

      // Count ranking positions
      ranking.forEach((videoId: string | number, index: number) => {
        const videoIdStr = String(videoId);
        const rank = index + 1;
        if (distribution[videoIdStr]) {
          distribution[videoIdStr][rank]++;
        }
      });
    });

    console.log('Final vote counts:', votes);
    console.log('=== End Debug ===');

    const percentages: { [video: string]: { [rank: number]: number } } = {};
    Object.keys(distribution).forEach(video => {
      percentages[video] = {};
      Object.keys(distribution[video]).forEach(rank => {
        const count = distribution[video][Number(rank)];
        percentages[video][Number(rank)] = total > 0 ? (count / total) * 100 : 0;
      });
    });

    return { votes, distribution, percentages, total };
  };

  const metrics = getPerformanceMetrics();
  const completedSimulations = simulations.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-3">Video Insights & Recommendations</h2>
            <p className="text-lg opacity-90">
              Get detailed insights on each video and discover how to create the perfect video by combining the best moments
            </p>
          </div>

          {/* Simulation Selector */}
          {completedSimulations.length > 0 && onSimulationChange && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[300px]">
              <label className="block text-sm font-semibold mb-2">View Simulation Results:</label>
              <select
                value={selectedSimulation || ''}
                onChange={(e) => onSimulationChange(e.target.value || null)}
                className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-purple-300 font-medium text-sm"
              >
                <option value="">All Evaluations (Overall)</option>
                {completedSimulations.map((sim) => (
                  <option key={sim._id} value={sim._id}>
                    {sim.name}
                  </option>
                ))}
              </select>
              {selectedSimulation && (
                <p className="text-xs mt-2 opacity-80">
                  Showing {metrics.total} persona evaluations
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Performance Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Video Performance Overview</h3>
          {selectedSimulation && (
            <div className="text-sm text-gray-600 bg-purple-50 px-4 py-2 rounded-lg">
              <span className="font-semibold text-purple-700">Simulation Results</span>
            </div>
          )}
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${videos.length > 2 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
          {videos.map((video, idx) => {
            const videoId = String(idx + 1);
            const percentage = metrics.total > 0 ? ((metrics.votes[videoId] / metrics.total) * 100).toFixed(1) : 0;

            return (
              <div key={videoId} className="border-2 rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="text-center mb-3">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">Video {videoId}</h4>
                  <p className="text-xs text-gray-500 mb-2 truncate">{video.title || 'Untitled'}</p>
                  <div className="text-4xl font-bold text-blue-600">{percentage}%</div>
                  <div className="text-sm text-gray-500">Most Preferred</div>
                </div>
                <div className="border-t pt-3 space-y-1">
                  {Array.from({ length: videos.length }, (_, rankIdx) => {
                    const rank = rankIdx + 1;
                    const rankPercent = metrics.percentages[videoId]?.[rank]?.toFixed(1) || '0.0';
                    return (
                      <div key={rank} className="flex justify-between text-xs">
                        <span className="text-gray-600">{rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} Place:</span>
                        <span className="font-semibold">{rankPercent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* AI-Powered Insights Display */}
      {selectedCampaignId && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Insights</h3>
            <p className="text-sm text-gray-600">Ask a question or request specific analysis powered by Gemini 2.5</p>
          </div>

          {/* Input Section */}
          <div className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={insightsInput}
                onChange={(e) => onInsightsInputChange?.(e.target.value)}
                placeholder="Ask a question or describe what insights you want... (e.g., 'Which video works best for young professionals?' or 'Analyze psychological triggers')"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loadingInsights}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loadingInsights) {
                    onGenerateInsights?.();
                  }
                }}
              />
              {onGenerateInsights && (
                <button
                  onClick={onGenerateInsights}
                  disabled={loadingInsights}
                  className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all flex items-center gap-2 whitespace-nowrap ${
                    loadingInsights
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                  }`}
                >
                  {loadingInsights ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">✨</span>
                      <span>Generate</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Example prompts */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Try:</span>
              <button
                onClick={() => onInsightsInputChange?.('Overall performance summary')}
                className="text-xs px-3 py-1 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
              >
                Overall performance summary
              </button>
              <button
                onClick={() => onInsightsInputChange?.('Which personas prefer Video 1?')}
                className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                Which personas prefer Video 1?
              </button>
              <button
                onClick={() => onInsightsInputChange?.('Psychological principles analysis')}
                className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
              >
                Psychological principles analysis
              </button>
              <button
                onClick={() => onInsightsInputChange?.('Recommendations for synthesis')}
                className="text-xs px-3 py-1 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors"
              >
                Recommendations for synthesis
              </button>
            </div>
          </div>

          {loadingInsights ? (
            <div className="text-center py-16">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-lg text-gray-700 font-medium">Analyzing your campaign data with Gemini 2.5...</p>
              <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
            </div>
          ) : !generatedInsights ? (
            <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-lg text-gray-700 mb-2">Ready to generate insights!</p>
              <p className="text-sm text-gray-600">
                Click &ldquo;Generate Insights&rdquo; to analyze your campaign performance
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dynamically render ALL insight sections */}
              {Object.entries(generatedInsights).map(([key, value]: [string, any], index) => {
                // Skip if value is null or undefined
                if (!value) return null;

                const formatTitle = (k: string) => {
                  return k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                };

                const colorSchemes = [
                  { gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
                  { gradient: 'from-purple-600 to-pink-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
                  { gradient: 'from-green-600 to-teal-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
                  { gradient: 'from-orange-600 to-red-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
                  { gradient: 'from-cyan-600 to-blue-600', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600' },
                  { gradient: 'from-violet-600 to-purple-600', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600' }
                ];
                const colors = colorSchemes[index % colorSchemes.length];

                // SPECIAL RENDERERS FOR SPECIFIC SECTIONS

                // Summary section
                if (key === 'summary' && value.bottom_line) {
                  return (
                    <div key={key} className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-6 text-white">
                      <h4 className="text-2xl font-bold mb-3 flex items-center gap-2">
                        <span>📊</span>
                        <span>Executive Summary</span>
                      </h4>
                      <p className="text-lg mb-4 leading-relaxed">{value.bottom_line}</p>
                      <div className="flex gap-4 text-sm flex-wrap">
                        {value.confidence_score !== undefined && (
                          <div className="bg-white/20 px-4 py-2 rounded">
                            <span className="opacity-80">Confidence:</span>{' '}
                            <span className="font-bold">{value.confidence_score}%</span>
                          </div>
                        )}
                        {value.data_quality && (
                          <div className="bg-white/20 px-4 py-2 rounded">
                            <span className="opacity-80">Data Quality:</span>{' '}
                            <span className="font-bold capitalize">{value.data_quality}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Video analyses section
                if (key === 'video_analyses' && Array.isArray(value)) {
                  return (
                    <div key={key} className="bg-white rounded-lg shadow-lg p-6">
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">🎬 Video Analysis Breakdown</h4>
                      <div className="space-y-4">
                        {value.map((analysis: any, idx: number) => (
                          <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="font-bold text-lg text-gray-900 mb-3">
                              Video {analysis.videoNumber}: {analysis.title}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="font-semibold text-green-700 mb-2">✓ Strengths:</p>
                                <ul className="space-y-1">
                                  {analysis.strengths?.map((strength: string, i: number) => (
                                    <li key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-green-400">{strength}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-red-700 mb-2">✗ Weaknesses:</p>
                                <ul className="space-y-1">
                                  {analysis.weaknesses?.map((weakness: string, i: number) => (
                                    <li key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-red-400">{weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Performance insights section
                if (key === 'performance_insights' && value.top_performer) {
                  return (
                    <div key={key} className={`bg-white rounded-lg shadow-lg p-6 border-2 ${colors.border}`}>
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">📊 Performance Insights</h4>
                      {value.top_performer && (
                        <div className={`${colors.bg} rounded-lg p-4 mb-4`}>
                          <div className="flex items-start gap-3 mb-2">
                            <span className="text-4xl">🏆</span>
                            <div className="flex-1">
                              <p className="font-bold text-xl text-gray-900">
                                Video {value.top_performer.video_number} - Top Performer
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {value.top_performer.percentage}% preference rate
                              </p>
                              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                                {value.top_performer.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {value.key_findings && Array.isArray(value.key_findings) && (
                        <div>
                          <p className="font-semibold text-gray-900 mb-3">Key Findings:</p>
                          <ul className="space-y-2">
                            {value.key_findings.map((finding: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className={`${colors.text} mt-1 font-bold`}>▸</span>
                                <span className="leading-relaxed">{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }

                // Audience insights section
                if (key === 'audience_insights') {
                  return (
                    <div key={key} className={`bg-white rounded-lg shadow-lg p-6 border-2 ${colors.border}`}>
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">👥 Audience Insights</h4>
                      {value.persona_preferences && Array.isArray(value.persona_preferences) && (
                        <div className="mb-4">
                          <p className="font-semibold text-gray-900 mb-3">Persona Preferences:</p>
                          <div className="space-y-3">
                            {value.persona_preferences.map((pref: any, idx: number) => (
                              <div key={idx} className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}>
                                <p className="font-bold text-gray-900 mb-1">{pref.segment}</p>
                                <p className="text-sm text-gray-600 mb-2">Prefers: Video {pref.preferred_video}</p>
                                {pref.characteristics && Array.isArray(pref.characteristics) && (
                                  <ul className="space-y-1 mt-2">
                                    {pref.characteristics.map((char: string, i: number) => (
                                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                        <span className={colors.text}>•</span>
                                        <span>{char}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {value.key_patterns && Array.isArray(value.key_patterns) && (
                        <div>
                          <p className="font-semibold text-gray-900 mb-3">Key Patterns:</p>
                          <ul className="space-y-2">
                            {value.key_patterns.map((pattern: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className={`${colors.text} font-bold`}>•</span>
                                <span className="leading-relaxed">{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }

                // Psychological principles section
                if (key === 'psychological_principles' && typeof value === 'object') {
                  return (
                    <div key={key} className="bg-white rounded-lg shadow-lg p-6">
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">🧠 Psychological Principles</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(value).map(([principleKey, principle]: [string, any], idx: number) => {
                          const pColors = colorSchemes[idx % colorSchemes.length];
                          return (
                            <div key={principleKey} className={`border-2 ${pColors.border} rounded-lg p-4 ${pColors.bg} hover:shadow-md transition-shadow`}>
                              <h5 className="font-bold text-gray-900 mb-2">{principle.title || formatTitle(principleKey)}</h5>
                              {principle.description && (
                                <p className="text-sm text-gray-700 mb-3 leading-relaxed">{principle.description}</p>
                              )}
                              {principle.key_points && Array.isArray(principle.key_points) && (
                                <ul className="space-y-1">
                                  {principle.key_points.map((point: string, i: number) => (
                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                      <span className={pColors.text}>✓</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Recommendations section
                if (key === 'recommendations') {
                  return (
                    <div key={key} className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">💡 Recommendations</h4>
                      <div className="space-y-4">
                        {value.immediate_actions && Array.isArray(value.immediate_actions) && (
                          <div>
                            <p className="font-semibold text-green-700 mb-3">Immediate Actions:</p>
                            <ul className="space-y-2">
                              {value.immediate_actions.map((action: string, idx: number) => (
                                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2 pl-4 border-l-2 border-green-400">
                                  <span className="text-green-600 font-bold">▸</span>
                                  <span className="leading-relaxed">{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {value.optimization_opportunities && Array.isArray(value.optimization_opportunities) && (
                          <div>
                            <p className="font-semibold text-blue-700 mb-3">Optimization Opportunities:</p>
                            <ul className="space-y-2">
                              {value.optimization_opportunities.map((opp: string, idx: number) => (
                                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2 pl-4 border-l-2 border-blue-400">
                                  <span className="text-blue-600 font-bold">▸</span>
                                  <span className="leading-relaxed">{opp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {value.synthesis_strategy && (
                          <div className="pt-4 border-t border-gray-200">
                            <p className="font-semibold text-gray-900 mb-2">Synthesis Strategy:</p>
                            <p className="text-sm text-gray-700 bg-amber-50 p-4 rounded-lg border border-amber-200 leading-relaxed">
                              {value.synthesis_strategy}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // GENERIC FALLBACK for any other section types (new format support)
                const sectionTitle = value.title || formatTitle(key);
                const content = value.content;
                const insights = value.insights;

                // Special handling for video performance arrays
                if (Array.isArray(content) && content.length > 0 && content[0].video_number !== undefined) {
                  return (
                    <div key={key} className={`bg-white rounded-lg shadow-lg p-6 border-2 ${colors.border}`}>
                      <h4 className={`text-xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent mb-4`}>
                        {sectionTitle}
                      </h4>
                      <div className="space-y-3">
                        {content.map((video: any, idx: number) => {
                          const tierColors: any = {
                            'Top Performer': 'border-green-400 bg-green-50',
                            'Niche Performer': 'border-blue-400 bg-blue-50',
                            'Mid-Tier Performer': 'border-yellow-400 bg-yellow-50',
                            'Lowest Performer': 'border-red-400 bg-red-50'
                          };
                          const tierClass = tierColors[video.performance_tier] || 'border-gray-400 bg-gray-50';

                          return (
                            <div key={idx} className={`border-2 ${tierClass} rounded-lg p-4`}>
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h5 className="font-bold text-gray-900 text-lg">
                                    Video {video.video_number}: {video.video_title}
                                  </h5>
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-semibold">{video.preference_rate}</span> preference rate
                                  </p>
                                </div>
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white border-2 border-current">
                                  {video.performance_tier}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {video.ranking_summary}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      {insights && Array.isArray(insights) && insights.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="font-semibold text-gray-900 mb-2">Key Takeaways:</p>
                          <ul className="space-y-2">
                            {insights.map((insight: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-600 font-bold mt-0.5">✓</span>
                                <span className="leading-relaxed">{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={key} className={`bg-white rounded-lg shadow-lg p-6 border-2 ${colors.border}`}>
                    <h4 className={`text-xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent mb-4`}>
                      {sectionTitle}
                    </h4>

                    <div className="space-y-4">
                      {/* String content */}
                      {typeof content === 'string' && (
                        <p className="text-gray-700 leading-relaxed">{content}</p>
                      )}

                      {/* Array content - generic */}
                      {Array.isArray(content) && (
                        <div className="space-y-2">
                          {content.map((item: any, idx: number) => (
                            <div key={idx} className={`${colors.bg} rounded-lg p-3`}>
                              {typeof item === 'string' ? (
                                <p className="text-sm text-gray-700">{item}</p>
                              ) : (
                                <div className="text-sm space-y-1">
                                  {Object.entries(item).map(([k, v]: [string, any]) => (
                                    <div key={k} className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-900 min-w-32">{formatTitle(k)}:</span>
                                      <span className="text-gray-700 flex-1">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Object content */}
                      {typeof content === 'object' && !Array.isArray(content) && (
                        <div className={`${colors.bg} rounded-lg p-4`}>
                          {Object.entries(content).map(([k, v]: [string, any]) => (
                            <div key={k} className="mb-3 last:mb-0">
                              <p className="font-semibold text-gray-900 mb-1">{formatTitle(k)}</p>
                              {typeof v === 'string' ? (
                                <p className="text-sm text-gray-700 leading-relaxed">{v}</p>
                              ) : Array.isArray(v) ? (
                                <ul className="space-y-1">
                                  {v.map((item: any, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                      <span className={`${colors.text} mt-1`}>▸</span>
                                      <span>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <pre className="text-xs text-gray-600 bg-white p-2 rounded overflow-x-auto">
                                  {JSON.stringify(v, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Insights array */}
                      {insights && Array.isArray(insights) && insights.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="font-semibold text-gray-900 mb-2">Key Takeaways:</p>
                          <ul className="space-y-2">
                            {insights.map((insight: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-600 font-bold mt-0.5">✓</span>
                                <span className="leading-relaxed">{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>
      )}

      {/* Insights History */}
      {selectedCampaignId && insightsHistory && insightsHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Previous Insights Reports</h3>
          <p className="text-sm text-gray-600 mb-6">View previously generated insights for this campaign</p>

          <div className="space-y-4">
            {insightsHistory.map((insight) => {
              const isExpanded = expandedInsights.has(insight.id);
              const date = new Date(insight.created_at);
              const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

              return (
                <div key={insight.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div
                    className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors"
                    onClick={() => toggleInsightExpansion(insight.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {insight.question}
                        </h4>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>📅 {formattedDate}</span>
                          <span>📊 {insight.evaluations_count} evaluations</span>
                          <span>🎥 {insight.videos_count} videos</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-2xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - Use Same Rich Renderer */}
                  {isExpanded && insight.insights && (
                    <div className="p-6 bg-gray-50 space-y-4">
                      {Object.entries(insight.insights).map(([key, value]: [string, any], idx) => {
                        if (!value) return null;

                        const formatTitle = (k: string) => {
                          return k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        };

                        // Summary
                        if (key === 'summary' && value.bottom_line) {
                          return (
                            <div key={key} className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-4 text-white">
                              <h5 className="text-lg font-bold mb-2">📊 Summary</h5>
                              <p className="text-sm leading-relaxed mb-3">{value.bottom_line}</p>
                              <div className="flex gap-3 text-xs flex-wrap">
                                {value.confidence_score !== undefined && (
                                  <div className="bg-white/20 px-3 py-1 rounded">
                                    <span className="opacity-80">Confidence:</span> <span className="font-bold">{value.confidence_score}%</span>
                                  </div>
                                )}
                                {value.data_quality && (
                                  <div className="bg-white/20 px-3 py-1 rounded">
                                    <span className="opacity-80">Quality:</span> <span className="font-bold capitalize">{value.data_quality}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Video Analyses
                        if (key === 'video_analyses' && Array.isArray(value)) {
                          return (
                            <div key={key} className="bg-white rounded-lg border border-gray-300 p-4">
                              <h5 className="text-lg font-bold text-gray-900 mb-3">🎬 Video Analyses</h5>
                              <div className="space-y-3">
                                {value.map((analysis: any, i: number) => (
                                  <div key={i} className="border border-gray-200 rounded p-3">
                                    <div className="font-semibold text-gray-900 mb-2">
                                      Video {analysis.videoNumber}: {analysis.title}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="font-semibold text-green-700 mb-1">✓ Strengths:</p>
                                        <ul className="space-y-1 text-xs">
                                          {analysis.strengths?.map((s: string, j: number) => (
                                            <li key={j} className="pl-3 border-l-2 border-green-400 text-gray-700">{s}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-red-700 mb-1">✗ Weaknesses:</p>
                                        <ul className="space-y-1 text-xs">
                                          {analysis.weaknesses?.map((w: string, j: number) => (
                                            <li key={j} className="pl-3 border-l-2 border-red-400 text-gray-700">{w}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // Performance Insights
                        if (key === 'performance_insights' && value.top_performer) {
                          return (
                            <div key={key} className="bg-white rounded-lg border border-blue-300 p-4">
                              <h5 className="text-lg font-bold text-gray-900 mb-3">📊 Performance Insights</h5>
                              {value.top_performer && (
                                <div className="bg-blue-50 rounded p-3 mb-3">
                                  <div className="flex items-start gap-2">
                                    <span className="text-2xl">🏆</span>
                                    <div className="flex-1">
                                      <p className="font-bold text-gray-900">Video {value.top_performer.video_number} - Top Performer</p>
                                      <p className="text-xs text-gray-600 mt-1">{value.top_performer.percentage}% preference</p>
                                      <p className="text-sm text-gray-700 mt-1">{value.top_performer.reason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {value.key_findings && Array.isArray(value.key_findings) && (
                                <div>
                                  <p className="font-semibold text-gray-900 mb-2 text-sm">Key Findings:</p>
                                  <ul className="space-y-1 text-xs">
                                    {value.key_findings.map((f: string, i: number) => (
                                      <li key={i} className="flex items-start gap-1 text-gray-700">
                                        <span className="text-blue-600">▸</span>
                                        <span>{f}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Audience Insights
                        if (key === 'audience_insights') {
                          return (
                            <div key={key} className="bg-white rounded-lg border border-purple-300 p-4">
                              <h5 className="text-lg font-bold text-gray-900 mb-3">👥 Audience Insights</h5>
                              {value.persona_preferences && Array.isArray(value.persona_preferences) && (
                                <div className="mb-3">
                                  <p className="font-semibold text-gray-900 mb-2 text-sm">Persona Preferences:</p>
                                  <div className="space-y-2">
                                    {value.persona_preferences.map((p: any, i: number) => (
                                      <div key={i} className="bg-purple-50 rounded p-2 border border-purple-200">
                                        <p className="font-bold text-gray-900 text-sm">{p.segment}</p>
                                        <p className="text-xs text-gray-600">Prefers: Video {p.preferred_video}</p>
                                        {p.characteristics && (
                                          <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
                                            {p.characteristics.map((c: string, j: number) => (
                                              <li key={j}>• {c}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {value.key_patterns && Array.isArray(value.key_patterns) && (
                                <div>
                                  <p className="font-semibold text-gray-900 mb-2 text-sm">Key Patterns:</p>
                                  <ul className="space-y-1 text-xs text-gray-700">
                                    {value.key_patterns.map((p: string, i: number) => (
                                      <li key={i} className="flex items-start gap-1">
                                        <span className="text-purple-600">•</span>
                                        <span>{p}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Psychological Principles
                        if (key === 'psychological_principles' && typeof value === 'object') {
                          return (
                            <div key={key} className="bg-white rounded-lg border border-gray-300 p-4">
                              <h5 className="text-lg font-bold text-gray-900 mb-3">🧠 Psychological Principles</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(value).map(([pKey, principle]: [string, any], i: number) => (
                                  <div key={pKey} className="border border-indigo-200 bg-indigo-50 rounded p-3">
                                    <h6 className="font-bold text-gray-900 text-sm mb-1">{principle.title || formatTitle(pKey)}</h6>
                                    {principle.description && (
                                      <p className="text-xs text-gray-700 mb-2">{principle.description}</p>
                                    )}
                                    {principle.key_points && Array.isArray(principle.key_points) && (
                                      <ul className="space-y-0.5 text-xs text-gray-600">
                                        {principle.key_points.map((pt: string, j: number) => (
                                          <li key={j} className="flex items-start gap-1">
                                            <span className="text-indigo-600">✓</span>
                                            <span>{pt}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // Recommendations
                        if (key === 'recommendations') {
                          return (
                            <div key={key} className="bg-white rounded-lg border border-green-300 p-4">
                              <h5 className="text-lg font-bold text-gray-900 mb-3">💡 Recommendations</h5>
                              <div className="space-y-3">
                                {value.immediate_actions && Array.isArray(value.immediate_actions) && (
                                  <div>
                                    <p className="font-semibold text-green-700 mb-2 text-sm">Immediate Actions:</p>
                                    <ul className="space-y-1 text-xs text-gray-700">
                                      {value.immediate_actions.map((a: string, i: number) => (
                                        <li key={i} className="pl-3 border-l-2 border-green-400">{a}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {value.optimization_opportunities && Array.isArray(value.optimization_opportunities) && (
                                  <div>
                                    <p className="font-semibold text-blue-700 mb-2 text-sm">Optimization Opportunities:</p>
                                    <ul className="space-y-1 text-xs text-gray-700">
                                      {value.optimization_opportunities.map((o: string, i: number) => (
                                        <li key={i} className="pl-3 border-l-2 border-blue-400">{o}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {value.synthesis_strategy && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="font-semibold text-gray-900 mb-1 text-sm">Synthesis Strategy:</p>
                                    <p className="text-xs text-gray-700 bg-amber-50 p-2 rounded border border-amber-200">{value.synthesis_strategy}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Generic fallback
                        const sectionTitle = value.title || formatTitle(key);
                        const content = value.content;
                        const insights = value.insights;

                        // Special handling for video performance arrays
                        if (Array.isArray(content) && content.length > 0 && content[0].video_number !== undefined) {
                          return (
                            <div key={key} className="bg-white rounded-lg border border-gray-300 p-4">
                              <h5 className="font-bold text-gray-900 mb-3 text-sm">{sectionTitle}</h5>
                              <div className="space-y-2">
                                {content.map((video: any, i: number) => {
                                  const tierColors: any = {
                                    'Top Performer': 'border-green-400 bg-green-50',
                                    'Niche Performer': 'border-blue-400 bg-blue-50',
                                    'Mid-Tier Performer': 'border-yellow-400 bg-yellow-50',
                                    'Lowest Performer': 'border-red-400 bg-red-50'
                                  };
                                  const tierClass = tierColors[video.performance_tier] || 'border-gray-400 bg-gray-50';

                                  return (
                                    <div key={i} className={`border ${tierClass} rounded p-3`}>
                                      <div className="flex items-start justify-between mb-1">
                                        <div>
                                          <h6 className="font-bold text-gray-900 text-sm">
                                            Video {video.video_number}: {video.video_title}
                                          </h6>
                                          <p className="text-xs text-gray-600 mt-0.5">
                                            <span className="font-semibold">{video.preference_rate}</span> preference
                                          </p>
                                        </div>
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white border">
                                          {video.performance_tier}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-700 leading-relaxed">
                                        {video.ranking_summary}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                              {insights && Array.isArray(insights) && insights.length > 0 && (
                                <ul className="space-y-1 text-xs text-gray-600 mt-3">
                                  {insights.map((ins: string, i: number) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-green-600">✓</span>
                                      <span>{ins}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={key} className="bg-white rounded-lg border border-gray-300 p-4">
                            <h5 className="font-bold text-gray-900 mb-2 text-sm">{sectionTitle}</h5>
                            {typeof content === 'string' && <p className="text-xs text-gray-700 mb-2 leading-relaxed">{content}</p>}
                            {Array.isArray(content) && (
                              <div className="space-y-1 mb-2 text-xs text-gray-700">
                                {content.map((item: any, i: number) => (
                                  <div key={i} className="bg-gray-50 rounded p-2">
                                    {typeof item === 'string' ? (
                                      `• ${item}`
                                    ) : (
                                      <div className="space-y-0.5">
                                        {Object.entries(item).map(([k, v]: [string, any]) => (
                                          <div key={k} className="flex gap-2">
                                            <span className="font-semibold">{formatTitle(k)}:</span>
                                            <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {insights && Array.isArray(insights) && (
                              <ul className="space-y-1 text-xs text-gray-600 mt-2">
                                {insights.map((ins: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-green-600">✓</span>
                                    <span>{ins}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
