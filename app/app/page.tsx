"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from './auth/authContext';
import CampaignTab from './components/CampaignTab';
import VideosTab from './components/VideosTab';
import PersonasTab from './components/PersonasTab';
import SimulationTab from './components/SimulationTab';
import FeedbackTab from './components/FeedbackTab';
import SynthesisTab from './components/SynthesisTab';
import IntegrationsTab from './components/IntegrationsTab';
import ShopifyDataTab from './components/ShopifyDataTab';
import VideoUploadModal from './components/VideoUploadModal';
import CampaignWizard, { CampaignData } from './components/CampaignWizard';
import { Video, Persona, Campaign, ChatMessage, ModelEvaluation } from './types';
import { API_URL, getApiHeaders } from './lib/api';

interface TimelineSegment {
  start: number;
  end: number;
  description: string;
  elements: string[];
  purpose: string;
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, logout, isAuthenticated, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaign' | 'videos' | 'personas' | 'simulations' | 'insights' | 'synthesis' | 'integrations' | 'shopify-data'>('campaign');
  const [campaign, setCampaign] = useState<any>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [synthesisVideo, setSynthesisVideo] = useState<any>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(['openai-gpt-5', 'anthropic-claude-sonnet-4.5', 'google-gemini-2.5-pro']));
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<ModelEvaluation | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [selectedShopifyIntegration, setSelectedShopifyIntegration] = useState<any | null>(null);

  // Simulations state
  const [simulations, setSimulations] = useState<any[]>([]);
  const [runningSimulations, setRunningSimulations] = useState<Set<string>>(new Set());
  const [selectedSimulationIds, setSelectedSimulationIds] = useState<Set<string>>(new Set());

  // Ask Persona chat state
  // Separate chat states for each tab
  const [campaignChatMessages, setCampaignChatMessages] = useState<ChatMessage[]>([]);
  const [videosChatMessages, setVideosChatMessages] = useState<ChatMessage[]>([]);
  const [personasChatMessages, setPersonasChatMessages] = useState<ChatMessage[]>([]);
  const [simulationsChatMessages, setSimulationsChatMessages] = useState<ChatMessage[]>([]);
  const [insightsChatMessages, setInsightsChatMessages] = useState<ChatMessage[]>([]);
  const [synthesisChatMessages, setSynthesisChatMessages] = useState<ChatMessage[]>([]);

  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [askPersonaModel, setAskPersonaModel] = useState<'openai' | 'anthropic' | 'google'>('anthropic');

  // Results tab chat state
  const [resultsChat, setResultsChat] = useState<ChatMessage[]>([]);
  const [resultsChatInput, setResultsChatInput] = useState('');
  const [isLoadingResultsChat, setIsLoadingResultsChat] = useState(false);
  const [selectedChatModel, setSelectedChatModel] = useState<'openai' | 'anthropic' | 'google'>('anthropic');

  // Per-persona chat states
  const [personaChats, setPersonaChats] = useState<{[personaId: string]: ChatMessage[]}>({});
  const [personaChatInputs, setPersonaChatInputs] = useState<{[personaId: string]: string}>({});
  const [personaChatLoading, setPersonaChatLoading] = useState<{[personaId: string]: boolean}>({});
  const [personaChatModels, setPersonaChatModels] = useState<{[personaId: string]: 'openai' | 'anthropic' | 'google'}>({});
  const [expandedPersonaChats, setExpandedPersonaChats] = useState<Set<string>>(new Set());

  // Per-evaluation chat states (for modal)
  const [evaluationChats, setEvaluationChats] = useState<{[key: string]: ChatMessage[]}>({});
  const [evaluationChatInput, setEvaluationChatInput] = useState('');

  // Insights state
  const [insightsInput, setInsightsInput] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [generatedInsights, setGeneratedInsights] = useState<any>(null);
  const [insightsHistory, setInsightsHistory] = useState<any[]>([]);
  const [selectedInsightSimulation, setSelectedInsightSimulation] = useState<string | null>(null);
  const [evaluationChatLoading, setEvaluationChatLoading] = useState(false);

  // Synthesis state
  const [synthesisInput, setSynthesisInput] = useState('');
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [generatedSynthesisPlan, setGeneratedSynthesisPlan] = useState<any>(null);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !user) {
      handleAuthCallback(code);
    }

    // Handle Shopify OAuth callback redirect
    const tab = searchParams.get('tab');
    const shopifyStatus = searchParams.get('shopify');
    if (tab === 'integrations') {
      setActiveTab('integrations');
      if (shopifyStatus === 'connected') {
        // Clean up URL
        window.history.replaceState({}, '', '/app');
      }
    }
  }, [searchParams]);

  const handleAuthCallback = async (code: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users/auth/callback`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error('Authentication failed');

      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      // Remove code from URL and force reload to update auth state
      window.history.replaceState({}, '', '/app');
      setTimeout(() => {
        window.location.href = '/app';
      }, 100);
    } catch (error) {
      console.error('Auth callback error:', error);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadCampaignData();
    }
  }, [user, authLoading]);

  // Load videos when navigating to videos tab
  useEffect(() => {
    if (activeTab === 'videos' && videos.length === 0 && (window as any).campaignData) {
      const data = (window as any).campaignData;
      const videoData: Video[] = (data.videos || []).map((video: any) => {
        const understanding = data.video_understandings?.find((vu: any) => vu.video_id === video._id);
        return {
          id: video._id,
          title: video.title,
          url: video.url,
          thumbnail_url: video.thumbnail_url,
          duration: video.duration,
          campaign_id: video.campaign_id,
          analysis: understanding ? {
            summary: understanding.summary,
            objects: understanding.objects || [],
            colors: understanding.colors || [],
            textures: understanding.textures || (understanding.texture ? [understanding.texture] : []),
            number_of_scene_cut: understanding.number_of_scene_cut || 0,
            qualities_demonstrated: understanding.qualities_demonstrated || [],
            duration_analysis: understanding.duration || '',
            timeline: understanding.timeline || []
          } : undefined
        };
      });
      setVideos(videoData);
    }
  }, [activeTab, videos.length]);

  const loadCampaignData = async (campaignId?: string) => {
    try {
      // First, get campaigns for authenticated user
      const campaignsResponse = await fetch(`${API_URL}/api/campaigns${user ? `?workos_user_id=${user.workos_user_id}` : ''}`, { headers: getApiHeaders() });
      const campaignsData = await campaignsResponse.json();

      if (!campaignsData || campaignsData.length === 0) {
        console.error('No campaigns found');
        setLoading(false);
        return;
      }

      // Store all campaigns
      setCampaigns(campaignsData);

      // Use provided campaign ID, current selected campaign, or first campaign
      const targetCampaign = campaignId || selectedCampaign || campaignsData[0]._id;
      setSelectedCampaign(targetCampaign);

      // Fetch campaign data
      const response = await fetch(`${API_URL}/api/campaigns/${targetCampaign}`, { headers: getApiHeaders() });
      const campaignData = await response.json();

      // Store campaign data for lazy loading and state
      (window as any).campaignData = campaignData;
      setCampaign(campaignData);

      // Initialize empty related data (will be populated by other endpoints)
      const data = {
        campaign: campaignData,
        personas: [],
        simulation_results: [],
        feedbacks: [],
        synthesis_video: null
      };

      // Map personas from DB format (demographics already nested in DB)
      const personaData: Persona[] = (data.personas || []).map((p: any) => ({
        id: p._id,
        name: p.name,
        demographics: p.demographics || {},
        ai_generated: p.ai_generated || false,
        description: p.description,
        model_provider: p.model_provider,
        model_name: p.model_name,
        created_at: p.created_at,
        updated_at: p.updated_at
      }));

      // Note: Evaluations, personas, and videos are now fetched separately below

      // Fetch personas for this campaign
      const personasResponse = await fetch(`${API_URL}/api/personas?campaign_id=${targetCampaign}`, { headers: getApiHeaders() });
      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        const mappedPersonas: Persona[] = personasData.map((p: any) => ({
          id: p._id,
          name: p.name,
          description: p.description,
          ai_generated: p.ai_generated || false,
          model_provider: p.model_provider,
          model_name: p.model_name,
          demographics: p.demographics || {},
          created_at: p.created_at,
          updated_at: p.updated_at
        }));
        setPersonas(mappedPersonas);
      }

      // Fetch videos for this campaign
      const videosResponse = await fetch(`${API_URL}/api/videos?campaign_id=${targetCampaign}`, { headers: getApiHeaders() });
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        setVideos(videosData);
      }

      // Fetch evaluations for this campaign
      const evaluationsResponse = await fetch(`${API_URL}/api/evaluations?campaign_id=${targetCampaign}`, { headers: getApiHeaders() });
      if (evaluationsResponse.ok) {
        const evaluationsData = await evaluationsResponse.json();
        const mappedEvaluations: ModelEvaluation[] = evaluationsData.map((e: any) => ({
          persona_id: e.persona_id,
          persona_name: e.persona_name,
          provider: e.provider,
          model: e.model,
          model_full_name: e.model_full_name,
          evaluation: {
            most_preferred_video: e.evaluation?.most_preferred_video || '',
            preference_ranking: e.evaluation?.preference_ranking || [],
            confidence_score: e.evaluation?.confidence_score || 0,
            video_opinions: e.evaluation?.video_opinions || {},
            reasoning: e.evaluation?.reasoning || '',
            semantic_analysis: e.evaluation?.semantic_analysis || ''
          }
        }));
        setEvaluations(mappedEvaluations);
      }

      // Fetch simulations for this campaign
      const simulationsResponse = await fetch(`${API_URL}/api/simulations/?campaign_id=${targetCampaign}`, { headers: getApiHeaders() });
      if (simulationsResponse.ok) {
        const simulationsData = await simulationsResponse.json();
        setSimulations(simulationsData);

        // Update running simulations
        const running = new Set<string>();
        const completedSimIds = new Set<string>();
        simulationsData.forEach((sim: any) => {
          if (sim.status === 'running' || sim.status === 'pending') {
            running.add(sim._id);
            // Start polling for running simulations
            pollSimulationStatus(sim._id);
          } else if (sim.status === 'completed') {
            // Select all completed simulations by default
            completedSimIds.add(sim._id);
          }
        });
        setRunningSimulations(running);
        setSelectedSimulationIds(completedSimIds);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading campaign data:', error);
      setLoading(false);
    }
  };





  // Load insights history for current campaign
  const loadInsightsHistory = async () => {
    if (!selectedCampaign) return;

    try {
      const response = await fetch(`${API_URL}/api/campaigns/${selectedCampaign}/insights`, { headers: getApiHeaders() });
      if (response.ok) {
        const data = await response.json();
        // Backend returns array directly, not wrapped in object
        setInsightsHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading insights history:', error);
    }
  };

  // Generate insights
  const handleGenerateInsights = async () => {
    if (!selectedCampaign) return;

    setLoadingInsights(true);
    setGeneratedInsights(null);

    try {
      // Get evaluations to send (from selected simulation or all)
      const evaluationsToSend = selectedInsightSimulation
        ? simulations.find(s => s._id === selectedInsightSimulation)?.results?.evaluations || []
        : evaluations;

      const response = await fetch(`${API_URL}/api/campaigns/${selectedCampaign}/generate-insights`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          question: insightsInput || undefined,
          evaluations: evaluationsToSend,
          simulations: selectedInsightSimulation ? [simulations.find(s => s._id === selectedInsightSimulation)] : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      setGeneratedInsights(data.insights);

      // Reload insights history
      await loadInsightsHistory();
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights. Please try again.');
    } finally {
      setLoadingInsights(false);
    }
  };

  // Generate synthesis plan
  const handleGenerateSynthesis = async () => {
    if (!selectedCampaign) return;
    if (!synthesisInput.trim()) {
      alert('Please describe what kind of video you want to create');
      return;
    }

    setLoadingSynthesis(true);
    setGeneratedSynthesisPlan(null);

    try {
      const response = await fetch(`${API_URL}/api/synthesis/plans`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          campaign_id: selectedCampaign,
          description: synthesisInput
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate synthesis plan');
      }

      const data = await response.json();
      setGeneratedSynthesisPlan(data);
    } catch (error: any) {
      console.error('Error generating synthesis:', error);
      alert(`Failed to generate synthesis plan: ${error.message}`);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  // Load insights history when campaign changes
  useEffect(() => {
    if (selectedCampaign && activeTab === 'insights') {
      loadInsightsHistory();
    }
  }, [selectedCampaign, activeTab]);

  // Get unique models from evaluations
  const getAvailableModels = () => {
    const models = new Set<string>();
    evaluations.forEach(evaluation => {
      const modelKey = `${evaluation.provider}-${evaluation.model}`;
      models.add(modelKey);
    });
    return Array.from(models).sort();
  };

  // Toggle model selection
  const toggleModel = (modelKey: string) => {
    setSelectedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelKey)) {
        newSet.delete(modelKey);
      } else {
        newSet.add(modelKey);
      }
      return newSet;
    });
  };

  // Filter evaluations by selected models
  const getFilteredEvaluations = () => {
    return evaluations.filter(evaluation => {
      const modelKey = `${evaluation.provider}-${evaluation.model}`;
      return selectedModels.has(modelKey);
    });
  };

  // Group evaluations by persona
  const getEvaluationsByPersona = () => {
    const filtered = getFilteredEvaluations();
    const grouped: { [key: string]: ModelEvaluation[] } = {};

    filtered.forEach(evaluation => {
      if (!grouped[evaluation.persona_id]) {
        grouped[evaluation.persona_id] = [];
      }
      grouped[evaluation.persona_id].push(evaluation);
    });

    return grouped;
  };

  // Calculate video vote counts across selected models only
  const getVideoVoteCounts = () => {
    const counts: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0 };
    const filtered = getFilteredEvaluations();

    filtered.forEach(evaluation => {
      const video = String(evaluation.evaluation.most_preferred_video);
      if (counts[video] !== undefined) {
        counts[video]++;
      }
    });

    return counts;
  };

  // Handle sending persona-specific chat messages
  const handleSendPersonaMessage = async (personaId: string) => {
    const input = personaChatInputs[personaId] || '';
    if (!input.trim() || personaChatLoading[personaId]) return;

    const userMessage = input.trim();

    // Clear input
    setPersonaChatInputs(prev => ({ ...prev, [personaId]: '' }));

    // Add user message to chat
    setPersonaChats(prev => ({
      ...prev,
      [personaId]: [...(prev[personaId] || []), {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      }]
    }));

    setPersonaChatLoading(prev => ({ ...prev, [personaId]: true }));

    try {
      // Get persona-specific evaluations
      const personaEvals = evaluations.filter(e => e.persona_id === personaId);
      const persona = personas.find(p => p.id === personaId);

      // Build context
      const contextData: any = {
        persona: persona,
        evaluations: personaEvals,
        videos: videos.map(v => ({
          id: v.id,
          title: v.title,
          analysis: v.analysis
        })),
        conversation_history: (personaChats[personaId] || []).map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      // Get selected model for this persona (default to anthropic)
      const selectedModel = personaChatModels[personaId] || 'anthropic';

      // Call API
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: userMessage,
          context: contextData,
          provider: selectedModel,
          mode: 'persona_specific'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant message
      setPersonaChats(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }]
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      setPersonaChats(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString()
        }]
      }));
    } finally {
      setPersonaChatLoading(prev => ({ ...prev, [personaId]: false }));
    }
  };

  // Toggle persona chat expansion
  const togglePersonaChat = (personaId: string) => {
    setExpandedPersonaChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personaId)) {
        newSet.delete(personaId);
      } else {
        newSet.add(personaId);
      }
      return newSet;
    });
  };

  // Handle sending evaluation-specific chat messages (in modal)
  const handleSendEvaluationMessage = async (evaluation: ModelEvaluation) => {
    if (!evaluationChatInput.trim() || evaluationChatLoading) return;

    const userMessage = evaluationChatInput.trim();
    const chatKey = `${evaluation.persona_id}-${evaluation.provider}-${evaluation.model}`;

    setEvaluationChatInput('');

    // Add user message to chat
    setEvaluationChats(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      }]
    }));

    setEvaluationChatLoading(true);

    try {
      const persona = personas.find(p => p.id === evaluation.persona_id);

      // Build context with this specific evaluation
      const contextData: any = {
        persona: persona,
        evaluation: evaluation,
        videos: videos.map(v => ({
          id: v.id,
          title: v.title,
          analysis: v.analysis
        })),
        conversation_history: (evaluationChats[chatKey] || []).map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      // Use the same provider as the evaluation
      const providerMap: {[key: string]: 'openai' | 'anthropic' | 'google'} = {
        'openai': 'openai',
        'anthropic': 'anthropic',
        'google': 'google'
      };
      const selectedProvider = providerMap[evaluation.provider] || 'anthropic';

      // Call API
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: userMessage,
          context: contextData,
          provider: selectedProvider,
          mode: 'evaluation_specific'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant message
      setEvaluationChats(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }]
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      setEvaluationChats(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString()
        }]
      }));
    } finally {
      setEvaluationChatLoading(false);
    }
  };

  // Handle sending results chat messages
  const handleSendResultsMessage = async () => {
    if (!resultsChatInput.trim() || isLoadingResultsChat) return;

    const userMessage = resultsChatInput.trim();
    setResultsChatInput('');

    // Add user message to chat
    setResultsChat(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    setIsLoadingResultsChat(true);

    try {
      // Get all filtered evaluations as context
      const filteredEvals = getFilteredEvaluations();
      const voteCounts = getVideoVoteCounts();
      const { distribution, percentages } = getRankingDistribution();

      // Build comprehensive context
      const contextData: any = {
        evaluations: filteredEvals,
        summary: {
          total_evaluations: filteredEvals.length,
          video_vote_counts: voteCounts,
          ranking_distribution: { distribution, percentages }
        },
        personas: personas,
        videos: videos.map(v => ({
          id: v.id,
          title: v.title,
          analysis: v.analysis
        })),
        conversation_history: resultsChat.map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      // Call API with selected model
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: userMessage,
          context: contextData,
          provider: selectedChatModel,
          mode: 'results_analysis'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant message to chat
      setResultsChat(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
      setResultsChat(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingResultsChat(false);
    }
  };
  // Handle input change and detect @ mentions
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    setChatInput(value);

    // Look for @ symbol before cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      // Check if there's a space or beginning of string before @
      const charBeforeAt = lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : ' ';
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

      // Only show dropdown if @ is at start or after space, and no space after @
      if ((charBeforeAt === ' ' || lastAtSymbol === 0) && !textAfterAt.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionSearchTerm(textAfterAt.toLowerCase());
        setMentionCursorPosition(lastAtSymbol);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Handle mention selection from dropdown
  const handleMentionSelect = (mention: string) => {
    const beforeMention = chatInput.substring(0, mentionCursorPosition);
    const afterMention = chatInput.substring(mentionCursorPosition + mentionSearchTerm.length + 1);
    const newValue = beforeMention + mention + ' ' + afterMention;

    setChatInput(newValue);
    setShowMentionDropdown(false);
    setMentionSearchTerm('');
  };

  // Get the correct chat messages and setter based on active tab
  const getChatState = () => {
    switch (activeTab) {
      case 'campaign':
        return { messages: campaignChatMessages, setMessages: setCampaignChatMessages };
      case 'videos':
        return { messages: videosChatMessages, setMessages: setVideosChatMessages };
      case 'personas':
        return { messages: personasChatMessages, setMessages: setPersonasChatMessages };
      case 'simulations':
        return { messages: simulationsChatMessages, setMessages: setSimulationsChatMessages };
      case 'insights':
        return { messages: insightsChatMessages, setMessages: setInsightsChatMessages };
      case 'synthesis':
        return { messages: synthesisChatMessages, setMessages: setSynthesisChatMessages };
      default:
        return { messages: campaignChatMessages, setMessages: setCampaignChatMessages };
    }
  };

  // Handle sending chat messages
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return;

    const userMessage = chatInput.trim();
    const { messages: currentMessages, setMessages: setCurrentMessages } = getChatState();

    setChatInput('');
    setShowMentionDropdown(false);
    setMentionSearchTerm('');

    // Add user message to chat
    setCurrentMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    setIsLoadingChat(true);

    try {
      // Parse @mentions - supports @Persona 1 and @Video 2 formats (with optional space)
      const personaMentions = [...userMessage.matchAll(/@Persona\s*(\d+)/gi)].map(m => m[1]);
      const videoMentions = [...userMessage.matchAll(/@Video\s*(\d+)/gi)].map(m => m[1]);

      // Gather context data
      const contextData: any = {
        mentioned_personas: personaMentions.map(id => {
          const persona = personas.find((p, idx) => (idx + 1).toString() === id);
          if (persona) {
            // Include evaluations for this persona
            const personaEvals = evaluations.filter(e => e.persona_id === persona.id);
            return {
              persona_data: persona,
              evaluations: personaEvals
            };
          }
          return null;
        }).filter(p => p !== null),
        mentioned_videos: videoMentions.map(id => {
          const video = videos.find((v, idx) => (idx + 1).toString() === id);
          if (video) {
            // Include evaluations mentioning this video
            const videoEvals = evaluations.map(e => ({
              persona_id: e.persona_id,
              persona_name: e.persona_name,
              provider: e.provider,
              model: e.model,
              most_preferred: e.evaluation.most_preferred_video,
              ranking: e.evaluation.preference_ranking,
              video_opinion: e.evaluation.video_opinions[id],
              confidence: e.evaluation.confidence_score
            })).filter(e => e.video_opinion);
            return {
              video_data: video,
              evaluations: videoEvals
            };
          }
          return null;
        }).filter(v => v !== null),
        conversation_history: currentMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      // Call API
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: userMessage,
          context: contextData,
          provider: askPersonaModel,
          mode: 'persona_chat'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant message to chat
      setCurrentMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
      setCurrentMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Calculate ranking distribution for all videos
  const handleSaveCampaign = async (campaignData: CampaignData) => {
    try {
      const isEditing = !!editingCampaign;

      // Add user information to campaign data
      const campaignWithUser = {
        ...campaignData,
        user_id: user?._id,
        workos_user_id: user?.workos_user_id,
      };

      const url = isEditing
        ? `${API_URL}/api/campaigns/${editingCampaign._id}`
        : `${API_URL}/api/campaigns`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(campaignWithUser),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} campaign`);
      }

      const savedCampaign = await response.json();

      // Reload campaigns
      await loadCampaignData();
      setShowCampaignWizard(false);
      setEditingCampaign(null);
      setSelectedCampaign(savedCampaign._id);
    } catch (error) {
      console.error(`Error ${editingCampaign ? 'updating' : 'creating'} campaign:`, error);
      throw error;
    }
  };

  // Delete campaign handler
  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    const confirmed = confirm(`Are you sure you want to delete the campaign "${campaignName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      // If the deleted campaign was selected, clear selection
      if (selectedCampaign === campaignId) {
        setSelectedCampaign(null);
      }

      // Reload campaigns
      await loadCampaignData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign. Please try again.');
    }
  };

  // Simulation handlers
  const handleCreateAndRunSimulation = async (
    provider: 'openai' | 'anthropic' | 'google',
    modelName: string,
    simulationName: string
  ) => {
    if (!selectedCampaign) return;

    try {
      const response = await fetch(`${API_URL}/api/simulations/`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          name: simulationName,
          campaign_id: selectedCampaign,
          model_provider: provider,
          model_name: modelName,
          auto_run: true
        }),
      });

      if (!response.ok) throw new Error('Failed to create simulation');

      const newSimulation = await response.json();

      // Add to simulations list and running set
      setSimulations(prev => [newSimulation, ...prev]);
      setRunningSimulations(prev => new Set(prev).add(newSimulation._id));

      // Poll for completion
      pollSimulationStatus(newSimulation._id);

      return newSimulation;
    } catch (error) {
      console.error('Error creating simulation:', error);
      throw error;
    }
  };

  const pollSimulationStatus = async (simulationId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/api/simulations/${simulationId}`, { headers: getApiHeaders() });
        if (!response.ok) return;

        const simulation = await response.json();

        // Update simulation in list
        setSimulations(prev =>
          prev.map(s => s._id === simulationId ? simulation : s)
        );

        if (simulation.status === 'completed' || simulation.status === 'failed') {
          setRunningSimulations(prev => {
            const newSet = new Set(prev);
            newSet.delete(simulationId);
            return newSet;
          });

          // Reload evaluations if completed and auto-select the completed simulation
          if (simulation.status === 'completed') {
            setSelectedSimulationIds(prev => {
              const newSet = new Set(prev);
              newSet.add(simulationId);
              return newSet;
            });
            await loadCampaignData(selectedCampaign || undefined);
          }
        } else if (simulation.status === 'running' && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Error polling simulation:', error);
      }
    };

    poll();
  };

  const handleDeleteSimulation = async (simulationId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/simulations/${simulationId}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete simulation');

      setSimulations(prev => prev.filter(s => s._id !== simulationId));
      setSelectedSimulationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(simulationId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting simulation:', error);
      throw error;
    }
  };

  const handleToggleSimulationSelection = (simulationId: string) => {
    setSelectedSimulationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(simulationId)) {
        newSet.delete(simulationId);
      } else {
        newSet.add(simulationId);
      }
      return newSet;
    });
  };

  const getRankingDistribution = () => {
    const filtered = getFilteredEvaluations();
    const total = filtered.length;

    // Initialize counts: distribution[videoId][rank] = count
    const distribution: { [video: string]: { [rank: number]: number } } = {
      '1': { 1: 0, 2: 0, 3: 0, 4: 0 },
      '2': { 1: 0, 2: 0, 3: 0, 4: 0 },
      '3': { 1: 0, 2: 0, 3: 0, 4: 0 },
      '4': { 1: 0, 2: 0, 3: 0, 4: 0 }
    };

    filtered.forEach(evaluation => {
      const ranking = evaluation.evaluation.preference_ranking;
      ranking.forEach((videoId, index) => {
        const video = String(videoId);
        const rank = index + 1; // Convert 0-indexed to 1-indexed
        if (distribution[video]) {
          distribution[video][rank]++;
        }
      });
    });

    // Convert counts to percentages
    const percentages: { [video: string]: { [rank: number]: number } } = {};
    Object.keys(distribution).forEach(video => {
      percentages[video] = {};
      Object.keys(distribution[video]).forEach(rank => {
        const count = distribution[video][Number(rank)];
        percentages[video][Number(rank)] = total > 0 ? (count / total) * 100 : 0;
      });
    });

    return { distribution, percentages, total };
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <span className="text-2xl font-bold text-purple-600">db</span>
              <span className="text-lg text-gray-500">dble.io</span>
            </Link>

            {/* User info and campaign selector */}
            <div className="flex items-center gap-4">
              {/* Campaign Selector */}
              {isAuthenticated && campaigns.length > 0 && (
                <select
                  value={selectedCampaign || ''}
                  onChange={(e) => {
                    const newCampaignId = e.target.value;
                    if (newCampaignId) {
                      setSelectedCampaign(newCampaignId);
                      loadCampaignData(newCampaignId);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a campaign...</option>
                  {campaigns.map((camp) => (
                    <option key={camp._id} value={camp._id}>
                      {camp.name}
                    </option>
                  ))}
                </select>
              )}

              {/* User Email and Logout */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 font-medium">{user.email}</span>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : !authLoading && (
                <button
                  onClick={login}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
                >
                  Login / Sign Up
                </button>
              )}
            </div>
          </div>

          <nav className="mt-4 flex space-x-4">
            <button
              onClick={() => {
                setActiveTab('campaign');
                setSelectedCampaign(null);
              }}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'campaign'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'integrations' || activeTab === 'shopify-data'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'videos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setActiveTab('personas')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'personas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Personas
            </button>
            <button
              onClick={() => setActiveTab('simulations')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'simulations'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Simulations
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'insights'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Insights
            </button>
            <button
              onClick={() => setActiveTab('synthesis')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'synthesis'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Video Synthesis
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'campaign' && !selectedCampaign && (
            <div className="space-y-6">
              {/* Campaigns Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
                <h2 className="text-3xl font-bold mb-2">Marketing Campaigns</h2>
                <p className="text-purple-100 text-lg">Create campaigns, set your goals, and track how your videos perform</p>
              </div>

              {/* Campaign Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Add New Campaign Card */}
                <div
                  onClick={() => setShowCampaignWizard(true)}
                  className="bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-gray-300 hover:border-purple-500 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] group"
                >
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">➕</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Campaign</h3>
                  <p className="text-gray-600 text-center text-sm">Create a new video marketing campaign</p>
                </div>

                {/* Dynamic Campaign Cards from Database */}
                {campaigns.map((camp) => (
                  <div
                    key={camp._id}
                    className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200 hover:border-purple-500 hover:shadow-xl transition-all min-h-[300px] flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{camp.name}</h3>
                        <p className="text-sm text-gray-600">{camp.description || 'Marketing Campaign'}</p>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Active</div>
                    </div>

                    <div className="flex-1 space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="mr-2">🎯</span>
                        <span className="font-semibold">Goal:</span>
                        <span className="ml-2">{camp.campaign_goal || camp.objective || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="mr-2">📅</span>
                        <span className="font-semibold">Created:</span>
                        <span className="ml-2">{new Date(camp.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setEditingCampaign(camp);
                            setShowCampaignWizard(true);
                          }}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setSelectedCampaign(camp._id)}
                          className="px-3 py-2 bg-white hover:bg-gray-50 text-purple-600 border-2 border-purple-600 rounded-lg font-semibold transition-colors text-sm"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(camp._id, camp.name);
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'campaign' && selectedCampaign && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => setSelectedCampaign(null)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold"
              >
                <span>←</span> Back to Campaigns
              </button>

              <CampaignTab
                campaign={campaign}
                personas={personas}
                videos={videos}
                chatMessages={campaignChatMessages}
                chatInput={chatInput}
                isLoadingChat={isLoadingChat}
                selectedModel={askPersonaModel}
                showMentionDropdown={showMentionDropdown}
                mentionSearchTerm={mentionSearchTerm}
                onChatInputChange={handleChatInputChange}
                onSendMessage={handleSendMessage}
                onModelChange={setAskPersonaModel}
                onMentionSelect={handleMentionSelect}
              />
            </div>
          )}

          {activeTab === 'videos' && !selectedCampaign && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Please create or select a campaign to view videos.</p>
            </div>
          )}

          {activeTab === 'videos' && selectedCampaign && (
            <VideosTab
              videos={videos}
              campaignId={selectedCampaign}
              onRefresh={loadCampaignData}
              chatMessages={videosChatMessages}
              chatInput={chatInput}
              isLoadingChat={isLoadingChat}
              selectedModel={askPersonaModel}
              showMentionDropdown={showMentionDropdown}
              mentionSearchTerm={mentionSearchTerm}
              onChatInputChange={handleChatInputChange}
              onSendMessage={handleSendMessage}
              onModelChange={setAskPersonaModel}
              onMentionSelect={handleMentionSelect}
            />
          )}

          {activeTab === 'personas' && !selectedCampaign && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Please create or select a campaign to view personas.</p>
            </div>
          )}

          {activeTab === 'personas' && selectedCampaign && (
            <PersonasTab
              personas={personas}
              campaignId={selectedCampaign}
              campaign={campaign}
              videos={videos}
              onRefresh={loadCampaignData}
              chatMessages={personasChatMessages}
              chatInput={chatInput}
              isLoadingChat={isLoadingChat}
              selectedModel={askPersonaModel}
              showMentionDropdown={showMentionDropdown}
              mentionSearchTerm={mentionSearchTerm}
              onChatInputChange={handleChatInputChange}
              onSendMessage={handleSendMessage}
              onModelChange={setAskPersonaModel}
              onMentionSelect={handleMentionSelect}
            />
          )}

          {activeTab === 'simulations' && !selectedCampaign && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Please create or select a campaign to view simulations.</p>
            </div>
          )}

          {activeTab === 'simulations' && selectedCampaign && (
            <SimulationTab
              evaluations={evaluations}
              personas={personas}
              videos={videos}
              selectedModels={selectedModels}
              onToggleModel={toggleModel}
              getAvailableModels={getAvailableModels}
              onEvaluationClick={setSelectedEvaluation}
              expandedPersonaChats={expandedPersonaChats}
              onTogglePersonaChat={togglePersonaChat}
              personaChats={personaChats}
              personaChatInputs={personaChatInputs}
              personaChatLoading={personaChatLoading}
              personaChatModels={personaChatModels}
              onPersonaChatInputChange={(personaId, value) => setPersonaChatInputs(prev => ({...prev, [personaId]: value}))}
              onSendPersonaMessage={handleSendPersonaMessage}
              onPersonaChatModelChange={(personaId, model) => setPersonaChatModels(prev => ({...prev, [personaId]: model}))}
              resultsChat={resultsChat}
              resultsChatInput={resultsChatInput}
              isLoadingResultsChat={isLoadingResultsChat}
              selectedChatModel={selectedChatModel}
              onResultsChatInputChange={(value) => setResultsChatInput(value)}
              onSendResultsMessage={handleSendResultsMessage}
              onChatModelChange={setSelectedChatModel}
              selectedCampaignId={selectedCampaign}
              campaign={campaign}
              simulations={simulations}
              runningSimulations={runningSimulations}
              onCreateAndRunSimulation={handleCreateAndRunSimulation}
              onDeleteSimulation={handleDeleteSimulation}
              selectedSimulationIds={selectedSimulationIds}
              onToggleSimulationSelection={handleToggleSimulationSelection}
            />
          )}

          {activeTab === 'insights' && !selectedCampaign && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Please create or select a campaign to view insights.</p>
            </div>
          )}

          {activeTab === 'insights' && selectedCampaign && (
            <FeedbackTab
              feedbacks={feedbacks}
              synthesisVideo={synthesisVideo}
              personas={personas}
              videos={videos}
              getVideoVoteCounts={getVideoVoteCounts}
              getFilteredEvaluations={getFilteredEvaluations}
              getRankingDistribution={getRankingDistribution}
              chatMessages={insightsChatMessages}
              chatInput={chatInput}
              isLoadingChat={isLoadingChat}
              selectedModel={askPersonaModel}
              showMentionDropdown={showMentionDropdown}
              mentionSearchTerm={mentionSearchTerm}
              onChatInputChange={handleChatInputChange}
              onSendMessage={handleSendMessage}
              onModelChange={setAskPersonaModel}
              onMentionSelect={handleMentionSelect}
              generatedInsights={generatedInsights}
              loadingInsights={loadingInsights}
              insightsInput={insightsInput}
              onInsightsInputChange={setInsightsInput}
              onGenerateInsights={handleGenerateInsights}
              insightsHistory={insightsHistory}
              selectedCampaignId={selectedCampaign}
              simulations={simulations}
              selectedSimulation={selectedInsightSimulation}
              onSimulationChange={setSelectedInsightSimulation}
            />
          )}

          {activeTab === 'synthesis' && !selectedCampaign && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Please create or select a campaign to view video synthesis.</p>
            </div>
          )}

          {activeTab === 'synthesis' && selectedCampaign && (
            <SynthesisTab
              videos={videos}
              selectedCampaignId={selectedCampaign}
              synthesisInput={synthesisInput}
              onSynthesisInputChange={setSynthesisInput}
              onGenerateSynthesis={handleGenerateSynthesis}
              loadingSynthesis={loadingSynthesis}
              generatedSynthesisPlan={generatedSynthesisPlan}
            />
          )}

          {activeTab === 'integrations' && user && (
            <IntegrationsTab
              userId={user._id}
              onShopifyConnected={(integration) => {
                setSelectedShopifyIntegration(integration);
                setActiveTab('shopify-data');
              }}
            />
          )}

          {activeTab === 'integrations' && !user && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Please login to manage integrations.</p>
            </div>
          )}

          {activeTab === 'shopify-data' && selectedShopifyIntegration && (
            <ShopifyDataTab
              integration={selectedShopifyIntegration}
              onBack={() => {
                setSelectedShopifyIntegration(null);
                setActiveTab('integrations');
              }}
            />
          )}
        </div>
      </main>

      {selectedEvaluation && (() => {
        // Helper function to get video title from video number
        const getVideoTitleForModal = (videoNumber: string | number) => {
          const videoIndex = parseInt(String(videoNumber)) - 1;
          if (videos && videos.length > videoIndex && videoIndex >= 0) {
            return videos[videoIndex].title || `Video ${videoNumber}`;
          }
          return `Video ${videoNumber}`;
        };

        return (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvaluation(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedEvaluation.provider === 'openai' && '🤖 OpenAI'}
                    {selectedEvaluation.provider === 'anthropic' && '🧠 Anthropic'}
                    {selectedEvaluation.provider === 'google' && '🔍 Google'}
                    {' '}{selectedEvaluation.model}
                  </h2>
                  <p className="text-gray-600">
                    {selectedEvaluation.persona_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Most Preferred</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {getVideoTitleForModal(selectedEvaluation.evaluation.most_preferred_video)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Confidence</div>
                    <div className="text-3xl font-bold text-green-600">
                      {selectedEvaluation.evaluation.confidence_score}%
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-1">Preference Ranking</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedEvaluation.evaluation.preference_ranking.map((v: string | number) => getVideoTitleForModal(v)).join(' → ')}
                  </div>
                </div>
              </div>

              {/* Video Opinions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Video Opinions</h3>
                <div className="space-y-3">
                  {Object.entries(selectedEvaluation.evaluation.video_opinions).map(([videoId, opinion]) => (
                    <div key={videoId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="font-semibold text-gray-900 mb-2">Video {videoId}: {getVideoTitleForModal(videoId)}</div>
                      <p className="text-sm text-gray-700">{opinion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reasoning */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reasoning</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvaluation.evaluation.reasoning}</p>
                </div>
              </div>

              {/* Semantic Analysis */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Semantic Analysis</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvaluation.evaluation.semantic_analysis}</p>
                </div>
              </div>

              {/* Ask Questions About This Evaluation */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-6 border-2 border-teal-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    💬 Ask Questions About This Evaluation
                  </h3>
                  <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full">
                    Using: {selectedEvaluation.provider === 'openai' && '🤖 GPT-5'}
                    {selectedEvaluation.provider === 'anthropic' && '🧠 Claude Sonnet 4.5'}
                    {selectedEvaluation.provider === 'google' && '🔍 Gemini Pro 2.5'}
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="bg-white rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                  {(() => {
                    const chatKey = `${selectedEvaluation.persona_id}-${selectedEvaluation.provider}-${selectedEvaluation.model}`;
                    const messages = evaluationChats[chatKey] || [];

                    return messages.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <p className="text-sm">Ask questions about this specific evaluation</p>
                        <p className="text-xs mt-2">
                          e.g., &ldquo;Why was Video {selectedEvaluation.evaluation.most_preferred_video} preferred?&rdquo; or &ldquo;Explain the reasoning&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message, idx) => (
                          <div
                            key={idx}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                                message.role === 'user'
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-teal-100' : 'text-gray-500'}`}>
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        {evaluationChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-4 py-2">
                              <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Input */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={evaluationChatInput}
                    onChange={(e) => setEvaluationChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendEvaluationMessage(selectedEvaluation);
                      }
                    }}
                    placeholder="Ask about this evaluation..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={evaluationChatLoading}
                  />
                  <button
                    onClick={() => handleSendEvaluationMessage(selectedEvaluation)}
                    disabled={evaluationChatLoading || !evaluationChatInput.trim()}
                    className={`px-6 py-2 rounded-lg font-semibold ${
                      evaluationChatLoading || !evaluationChatInput.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Campaign Wizard Modal */}
      {showCampaignWizard && (
        <CampaignWizard
          onClose={() => {
            setShowCampaignWizard(false);
            setEditingCampaign(null);
          }}
          onSave={handleSaveCampaign}
          existingCampaign={editingCampaign}
          mode={editingCampaign ? 'edit' : 'create'}
        />
      )}

    </div>
  );
}

// Wrapper component with Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Home />
    </Suspense>
  );
}
