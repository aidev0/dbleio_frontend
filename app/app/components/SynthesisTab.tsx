'use client';

import { useState, useEffect } from 'react';
import { Video } from '../types';
import { API_URL, getApiHeaders } from '../lib/api';

interface SynthesisTabProps {
  videos: Video[];
  selectedCampaignId: string | null;
  synthesisInput: string;
  onSynthesisInputChange: (value: string) => void;
  onGenerateSynthesis: () => void;
  loadingSynthesis: boolean;
  generatedSynthesisPlan: any;
}

export default function SynthesisTab({
  videos,
  selectedCampaignId,
  synthesisInput,
  onSynthesisInputChange,
  onGenerateSynthesis,
  loadingSynthesis,
  generatedSynthesisPlan,
}: SynthesisTabProps) {
  const [isProducing, setIsProducing] = useState(false);
  const [synthesisPlans, setSynthesisPlans] = useState<any[]>([]);
  const [synthesisVideos, setSynthesisVideos] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editedTimeline, setEditedTimeline] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load synthesis plans and videos when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      loadSynthesisData();
    }
  }, [selectedCampaignId]);

  // Auto-refresh every 5 seconds if there are processing videos
  useEffect(() => {
    if (!selectedCampaignId) return;

    const hasProcessingVideos = synthesisVideos.some(
      v => v.status === 'processing' || v.status === 'pending'
    );

    if (hasProcessingVideos) {
      const interval = setInterval(() => {
        // Silent refresh - only updates videos, no loading state, no plans reload
        loadSynthesisData(true);
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [selectedCampaignId, synthesisVideos]);

  const loadSynthesisData = async (silent = false) => {
    if (!selectedCampaignId) return;

    if (!silent) {
      setLoadingPlans(true);
    }

    try {
      // Load synthesis videos (only what we need for auto-refresh)
      const videosResponse = await fetch(
        `${API_URL}/api/synthesis/videos?campaign_id=${selectedCampaignId}`,
        { headers: getApiHeaders() }
      );
      if (videosResponse.ok) {
        const videos = await videosResponse.json();

        // Only update if data actually changed
        const hasChanged = JSON.stringify(videos) !== JSON.stringify(synthesisVideos);
        if (hasChanged) {
          setSynthesisVideos(videos);
        }
      }

      // Only load plans on initial load, not during auto-refresh
      if (!silent) {
        const plansResponse = await fetch(
          `${API_URL}/api/synthesis/plans?campaign_id=${selectedCampaignId}`,
          { headers: getApiHeaders() }
        );
        if (plansResponse.ok) {
          const plans = await plansResponse.json();
          setSynthesisPlans(plans);
        }
      }
    } catch (error) {
      console.error('Error loading synthesis data:', error);
    } finally {
      if (!silent) {
        setLoadingPlans(false);
      }
    }
  };

  const startEditing = (plan: any) => {
    setEditingPlan(plan);
    setEditedTimeline(JSON.parse(JSON.stringify(plan.synthesis_plan?.timeline || [])));
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setEditedTimeline([]);
  };

  const updateSegment = (index: number, field: string, value: any) => {
    const newTimeline = [...editedTimeline];
    newTimeline[index] = { ...newTimeline[index], [field]: value };
    setEditedTimeline(newTimeline);
  };

  const addSegment = () => {
    const newSegment = {
      output_start: editedTimeline.length > 0 ? editedTimeline[editedTimeline.length - 1].output_end : 0,
      output_end: editedTimeline.length > 0 ? editedTimeline[editedTimeline.length - 1].output_end + 5 : 5,
      source_video_num: 1,
      source_start: 0,
      source_end: 5,
      purpose: 'new_segment',
      description: 'New segment description'
    };
    setEditedTimeline([...editedTimeline, newSegment]);
  };

  const deleteSegment = (index: number) => {
    const newTimeline = editedTimeline.filter((_, i) => i !== index);
    setEditedTimeline(newTimeline);
  };

  const savePlan = async () => {
    if (!editingPlan) return;

    setIsSaving(true);
    try {
      const updatedPlan = {
        ...editingPlan.synthesis_plan,
        timeline: editedTimeline,
        total_duration: editedTimeline.length > 0
          ? Math.max(...editedTimeline.map(s => s.output_end))
          : 0
      };

      const response = await fetch(
        `${API_URL}/api/synthesis/plans/${editingPlan._id}`,
        {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({ synthesis_plan: updatedPlan })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save synthesis plan');
      }

      const savedPlan = await response.json();

      // Update the selected plan with the saved data
      setSelectedPlan(savedPlan);

      alert('✅ Synthesis plan saved successfully!');
      setEditingPlan(null);
      setEditedTimeline([]);
      await loadSynthesisData(false);
    } catch (error: any) {
      console.error('Error saving plan:', error);
      alert(`Failed to save plan:\n${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProduceVideo = async (specificPlanId?: string) => {
    if (!selectedCampaignId) {
      alert('No campaign selected');
      return;
    }

    if (!specificPlanId && !generatedSynthesisPlan) {
      alert('Please generate a synthesis plan first by clicking "Generate Edit"');
      return;
    }

    setIsProducing(true);

    try {
      console.log('Producing video for campaign:', selectedCampaignId, 'with plan:', specificPlanId || 'latest');

      const requestBody: any = {
        campaign_id: selectedCampaignId
      };

      if (specificPlanId) {
        requestBody.synthesis_plan_id = specificPlanId;
      }

      const response = await fetch(
        `${API_URL}/api/synthesis/videos`,
        {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to produce video';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Production result:', result);

      alert(
        `🎬 Video rendering started!\n\n` +
        `Title: ${result.title}\n` +
        `Status: ${result.status.toUpperCase()}\n` +
        `Duration: ${result.synthesis_plan.total_duration}s\n` +
        `Segments: ${result.synthesis_plan.timeline.length}\n\n` +
        `The video is now being rendered in the background.\n` +
        `Check the "Produced Videos" section below to track progress.`
      );

      // Reload synthesis data to show the new video
      await loadSynthesisData(false);

    } catch (error: any) {
      console.error('Error producing video:', error);
      alert(`Failed to produce video:\n${error.message || 'Unknown error'}`);
    } finally {
      setIsProducing(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">Video Synthesis</h2>
        <p className="text-lg opacity-90">
          Generate an AI-edited video combining the best moments from your campaign videos powered by Gemini 2.5
        </p>
      </div>

      {/* Video Synthesis Section */}
      {selectedCampaignId && videos.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Synthesis Input */}
          <div className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={synthesisInput}
                onChange={(e) => onSynthesisInputChange(e.target.value)}
                placeholder="Describe the synthesis you want... (e.g., 'Create a 30-second ad combining the best hooks' or 'Combine top-performing moments')"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loadingSynthesis}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loadingSynthesis) {
                    onGenerateSynthesis();
                  }
                }}
              />
              <button
                onClick={onGenerateSynthesis}
                disabled={loadingSynthesis}
                className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all flex items-center gap-2 whitespace-nowrap ${
                  loadingSynthesis
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                }`}
              >
                {loadingSynthesis ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🎬</span>
                    <span>Generate Edit</span>
                  </>
                )}
              </button>
            </div>

            {/* Example synthesis prompts */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Try:</span>
              <button
                onClick={() => onSynthesisInputChange('Create a 30-second video combining the best hooks from all videos')}
                className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
              >
                Best hooks compilation
              </button>
              <button
                onClick={() => onSynthesisInputChange('Combine top-performing moments into one video')}
                className="text-xs px-3 py-1 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
              >
                Top moments
              </button>
              <button
                onClick={() => onSynthesisInputChange('Create an optimized version using highest-rated segments')}
                className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                Optimized version
              </button>
            </div>
          </div>

          {/* Synthesis Results */}
          {loadingSynthesis ? (
            <div className="text-center py-16">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-lg text-gray-700 font-medium">Analyzing videos and creating edit timeline...</p>
              <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
            </div>
          ) : !generatedSynthesisPlan ? (
            <div className="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-lg text-gray-700 mb-2">Ready to create a synthesis!</p>
              <p className="text-sm text-gray-600">
                Describe what kind of video you want to create and we&apos;ll analyze your videos to generate an edit plan
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Synthesis Plan Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <h4 className="text-2xl font-bold mb-3 flex items-center gap-2">
                  <span>🎬</span>
                  <span>Synthesis Plan</span>
                </h4>
                <p className="text-lg mb-4">{generatedSynthesisPlan.description || 'AI-generated video synthesis'}</p>
                <div className="flex gap-4 text-sm">
                  <div className="bg-white/20 px-4 py-2 rounded">
                    <span className="opacity-80">Duration:</span>{' '}
                    <span className="font-bold">{generatedSynthesisPlan.total_duration || 30}s</span>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded">
                    <span className="opacity-80">Segments:</span>{' '}
                    <span className="font-bold">{generatedSynthesisPlan.timeline?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              {generatedSynthesisPlan.recommendations && generatedSynthesisPlan.recommendations.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow-lg p-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>💡</span>
                    <span>AI Recommendations</span>
                  </h4>
                  <ul className="space-y-3">
                    {generatedSynthesisPlan.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold mt-1">•</span>
                        <span className="text-gray-800">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Edit Timeline Table */}
              {generatedSynthesisPlan.timeline && generatedSynthesisPlan.timeline.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-4">📋 Edit Timeline</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clip</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {generatedSynthesisPlan.timeline.map((segment: any, idx: number) => {
                          const formatTime = (seconds: number) => {
                            const mins = Math.floor(seconds / 60);
                            const secs = seconds % 60;
                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                          };

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-mono text-indigo-600">
                                  {formatTime(segment.output_start)}-{formatTime(segment.output_end)}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  Video {segment.source_video_num}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-xs text-gray-600">
                                  {formatTime(segment.source_start)}-{formatTime(segment.source_end)}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                  {segment.purpose || 'segment'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-700">{segment.description}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Production Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => handleProduceVideo()}
                  disabled={isProducing}
                  className={`px-8 py-4 rounded-lg font-bold shadow-lg transition-all flex items-center gap-3 ${
                    isProducing
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'
                  }`}
                >
                  {isProducing ? (
                    <>
                      <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full"></div>
                      <span>Producing Video...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🎥</span>
                      <span>Produce Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-lg text-gray-700 mb-2">No videos available</p>
          <p className="text-sm text-gray-500">
            Upload videos to your campaign to start creating synthesis videos
          </p>
        </div>
      )}

      {/* Synthesis History Section */}
      {selectedCampaignId && (
        <div className="space-y-4">
          {/* Synthesis Plans */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>Synthesis Plans</span>
              {synthesisPlans.length > 0 && (
                <span className="text-sm font-normal text-gray-500">({synthesisPlans.length})</span>
              )}
            </h3>

            {loadingPlans ? (
              <div className="text-center py-8">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                <p className="text-sm text-gray-500 mt-2">Loading...</p>
              </div>
            ) : synthesisPlans.length > 0 ? (
              <div className="space-y-3">
                {synthesisPlans.map((plan, idx) => (
                  <div
                    key={plan._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {plan.synthesis_plan?.description || 'Synthesis Plan'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {plan.user_description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan(plan);
                          }}
                          className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          View Details
                        </button>
                        <span className="text-xs text-gray-500">
                          {new Date(plan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Duration: {plan.synthesis_plan?.total_duration || 0}s</span>
                      <span>Segments: {plan.synthesis_plan?.timeline?.length || 0}</span>
                      <span>Videos: {plan.videos_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No synthesis plans yet</p>
            )}
          </div>

          {/* Synthesis Videos */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎥</span>
              <span>Produced Videos</span>
              {synthesisVideos.length > 0 && (
                <span className="text-sm font-normal text-gray-500">({synthesisVideos.length})</span>
              )}
            </h3>

            {loadingPlans ? (
              <div className="text-center py-8">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
                <p className="text-sm text-gray-500 mt-2">Loading...</p>
              </div>
            ) : synthesisVideos.length > 0 ? (
              <div className="space-y-4">
                {synthesisVideos.map((video, idx) => (
                  <div key={video._id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{video.title}</p>
                        <p className="text-sm text-gray-600">{video.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          video.status === 'completed' ? 'bg-green-100 text-green-800' :
                          video.status === 'processing' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                          video.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {video.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(video.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mb-3">
                      <span>Duration: {video.total_duration || 0}s</span>
                      <span>Segments: {video.timeline?.length || 0}</span>
                      <span>Sources: {video.source_videos?.length || 0}</span>
                    </div>

                    {/* Video Player for Completed Videos */}
                    {video.status === 'completed' && video.video_url && (
                      <div className="mt-4 bg-black rounded-lg overflow-hidden">
                        <video
                          controls
                          className="w-full max-h-96"
                          src={video.video_url}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="bg-gray-900 p-3 flex justify-between items-center">
                          <a
                            href={video.video_url}
                            download
                            className="text-sm text-white hover:text-green-400 flex items-center gap-2"
                          >
                            <span>⬇️</span>
                            <span>Download Video</span>
                          </a>
                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-white hover:text-blue-400 flex items-center gap-2"
                          >
                            <span>🔗</span>
                            <span>Open in New Tab</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {video.note && (
                      <p className="text-xs text-gray-500 mt-2 italic">{video.note}</p>
                    )}

                    {video.error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <span className="font-semibold">Error:</span> {video.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No produced videos yet</p>
            )}
          </div>
        </div>
      )}

      {/* Plan Details Modal */}
      {selectedPlan && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPlan(null)}
        >
          <div
            className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Synthesis Plan Details
                  </h2>
                  <p className="text-gray-600">{selectedPlan.user_description}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {new Date(selectedPlan.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Plan Info */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white mb-6">
                <h4 className="text-xl font-bold mb-3">
                  {selectedPlan.synthesis_plan?.description || 'Synthesis Plan'}
                </h4>
                <div className="flex gap-4 text-sm">
                  <div className="bg-white/20 px-4 py-2 rounded">
                    <span className="opacity-80">Duration:</span>{' '}
                    <span className="font-bold">{selectedPlan.synthesis_plan?.total_duration || 0}s</span>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded">
                    <span className="opacity-80">Segments:</span>{' '}
                    <span className="font-bold">{selectedPlan.synthesis_plan?.timeline?.length || 0}</span>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded">
                    <span className="opacity-80">Videos:</span>{' '}
                    <span className="font-bold">{selectedPlan.videos_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              {selectedPlan.synthesis_plan?.recommendations && selectedPlan.synthesis_plan.recommendations.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow-lg p-6 mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>💡</span>
                    <span>AI Recommendations</span>
                  </h4>
                  <ul className="space-y-3">
                    {selectedPlan.synthesis_plan.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold mt-1">•</span>
                        <span className="text-gray-800">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline Table */}
              {((editingPlan && editingPlan._id === selectedPlan._id) ? editedTimeline : selectedPlan.synthesis_plan?.timeline) &&
               ((editingPlan && editingPlan._id === selectedPlan._id) ? editedTimeline.length : selectedPlan.synthesis_plan.timeline.length) > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-gray-900">📋 Edit Timeline</h4>
                    {editingPlan && editingPlan._id === selectedPlan._id && (
                      <button
                        onClick={addSegment}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-sm flex items-center gap-2"
                      >
                        <span>➕</span>
                        <span>Add Segment</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Video</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Clip</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          {editingPlan && editingPlan._id === selectedPlan._id && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {((editingPlan && editingPlan._id === selectedPlan._id) ? editedTimeline : selectedPlan.synthesis_plan.timeline).map((segment: any, idx: number) => {
                          const isEditing = editingPlan && editingPlan._id === selectedPlan._id;

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="number"
                                      value={segment.output_start}
                                      onChange={(e) => updateSegment(idx, 'output_start', parseFloat(e.target.value))}
                                      className="w-16 px-2 py-1 text-xs border rounded"
                                    />
                                    <span>-</span>
                                    <input
                                      type="number"
                                      value={segment.output_end}
                                      onChange={(e) => updateSegment(idx, 'output_end', parseFloat(e.target.value))}
                                      className="w-16 px-2 py-1 text-xs border rounded"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-sm font-mono text-indigo-600">
                                    {Math.floor(segment.output_start / 60)}:{(segment.output_start % 60).toString().padStart(2, '0')}-
                                    {Math.floor(segment.output_end / 60)}:{(segment.output_end % 60).toString().padStart(2, '0')}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={segment.source_video_num}
                                    onChange={(e) => updateSegment(idx, 'source_video_num', parseInt(e.target.value))}
                                    className="w-20 px-2 py-1 text-sm border rounded"
                                  />
                                ) : (
                                  <div className="text-sm font-semibold text-gray-900">
                                    Video {segment.source_video_num}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="number"
                                      value={segment.source_start}
                                      onChange={(e) => updateSegment(idx, 'source_start', parseFloat(e.target.value))}
                                      className="w-16 px-2 py-1 text-xs border rounded"
                                    />
                                    <span>-</span>
                                    <input
                                      type="number"
                                      value={segment.source_end}
                                      onChange={(e) => updateSegment(idx, 'source_end', parseFloat(e.target.value))}
                                      className="w-16 px-2 py-1 text-xs border rounded"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-600">
                                    {Math.floor(segment.source_start / 60)}:{(segment.source_start % 60).toString().padStart(2, '0')}-
                                    {Math.floor(segment.source_end / 60)}:{(segment.source_end % 60).toString().padStart(2, '0')}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={segment.purpose || ''}
                                    onChange={(e) => updateSegment(idx, 'purpose', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                  />
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                    {segment.purpose || 'segment'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {isEditing ? (
                                  <textarea
                                    value={segment.description || ''}
                                    onChange={(e) => updateSegment(idx, 'description', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    rows={2}
                                  />
                                ) : (
                                  <div className="text-sm text-gray-700">{segment.description}</div>
                                )}
                              </td>
                              {isEditing && (
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => deleteSegment(idx)}
                                    className="text-red-600 hover:text-red-800 font-semibold text-sm"
                                  >
                                    🗑️ Delete
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    if (editingPlan && editingPlan._id === selectedPlan._id) {
                      cancelEditing();
                    } else {
                      startEditing(selectedPlan);
                    }
                  }}
                  className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-semibold"
                >
                  {editingPlan && editingPlan._id === selectedPlan._id ? 'Cancel Edit' : '✏️ Edit Timeline'}
                </button>
                <div className="flex gap-3">
                  {editingPlan && editingPlan._id === selectedPlan._id && (
                    <button
                      onClick={savePlan}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Close
                  </button>
                  {(!editingPlan || editingPlan._id !== selectedPlan._id) && (
                    <button
                      onClick={async () => {
                        const planId = selectedPlan._id;
                        setSelectedPlan(null);
                        await handleProduceVideo(planId);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
                    >
                      <span className="text-xl">🎥</span>
                      <span>Produce Video</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
