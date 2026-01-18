import { useState } from 'react';
import ChatInterface from './ChatInterface';
import { Campaign, ChatMessage, Persona, Video } from '../types';

interface CampaignTabProps {
  campaign?: Campaign;
  personas: Persona[];
  videos: Video[];
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
  onCampaignUpdate?: () => void;
  onCampaignDelete?: () => void;
}

export default function CampaignTab({
  campaign,
  personas,
  videos,
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
  onCampaignUpdate,
  onCampaignDelete,
}: CampaignTabProps) {
  if (!campaign) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No campaign selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-900 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">{campaign.name || 'Unnamed Campaign'}</h2>
        {campaign.description && (
          <p className="text-gray-200 text-lg">{campaign.description}</p>
        )}
      </div>


      {/* Campaign Overview */}
      {(campaign.platform || campaign.campaign_goal || campaign.performance_objective?.value || campaign.advertiser?.business_name || (campaign.strategies && campaign.strategies.length > 0)) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Campaign Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {campaign.platform && (
              <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-400">
                <div className="text-3xl mb-2">📱</div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Platform</div>
                <div className="text-lg font-bold text-gray-900 capitalize">{campaign.platform}</div>
              </div>
            )}
            {campaign.campaign_goal && (
              <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-300">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Campaign Goal</div>
                <div className="text-lg font-bold text-gray-900 capitalize">{campaign.campaign_goal.replace('_', ' ')}</div>
              </div>
            )}
            {campaign.performance_objective?.value && (
              <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-400">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Performance Target</div>
                <div className="text-lg font-bold text-gray-900">{campaign.performance_objective.value} {campaign.performance_objective.kpi}</div>
              </div>
            )}
            {campaign.advertiser?.business_name && (
              <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-400">
                <div className="text-3xl mb-2">🏢</div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Advertiser</div>
                <div className="text-lg font-bold text-gray-900">{campaign.advertiser.business_name}</div>
              </div>
            )}
            {campaign.strategies && campaign.strategies.length > 0 && (
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-3xl mb-2">📋</div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Strategies</div>
                <div className="text-lg font-bold text-gray-900">{campaign.strategies.length} {campaign.strategies.length === 1 ? 'Strategy' : 'Strategies'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <ChatInterface
        campaign={campaign}
        personas={personas}
        videos={videos}
        chatMessages={chatMessages}
        chatInput={chatInput}
        isLoadingChat={isLoadingChat}
        selectedModel={selectedModel}
        showMentionDropdown={showMentionDropdown}
        mentionSearchTerm={mentionSearchTerm}
        onChatInputChange={onChatInputChange}
        onSendMessage={onSendMessage}
        onModelChange={onModelChange}
        onMentionSelect={onMentionSelect}
        title="Chat with Campaign AI"
        subtitle="Ask questions about campaign strategy, goals, budget allocation, performance targets, and optimization recommendations"
        examplePrompts={[
          { label: "Campaign goals", prompt: "What are the primary and secondary goals of @Campaign?", colorScheme: "indigo" },
          { label: "Budget strategy", prompt: "How should the $85,000 budget be allocated across the 4 video variants?", colorScheme: "green" },
          { label: "Performance targets", prompt: "What metrics should we track to measure the 25% conversion increase goal?", colorScheme: "blue" },
          { label: "Optimization tips", prompt: "What strategies can help reduce cost per acquisition by 15%?", colorScheme: "orange" }
        ]}
      />
    </div>
  );
}
