'use client';

import { useState } from 'react';
import PersonaCreationModal from './PersonaCreationModal';
import ChatInterface from './ChatInterface';
import { Persona, ChatMessage, Video } from '../types';
import { API_URL, getApiHeaders } from '../lib/api';

interface PersonasTabProps {
  personas: Persona[];
  campaignId: string;
  campaign: any;
  videos: Video[];
  onRefresh: () => void;
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
}

export default function PersonasTab({
  personas,
  campaignId,
  campaign,
  videos,
  onRefresh,
  chatMessages,
  chatInput,
  isLoadingChat,
  selectedModel,
  showMentionDropdown,
  mentionSearchTerm,
  onChatInputChange,
  onSendMessage,
  onModelChange,
  onMentionSelect
}: PersonasTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const handlePersonaClick = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  const handleCloseDetail = () => {
    setSelectedPersona(null);
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setSelectedPersona(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPersona(null);
  };

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return;

    try {
      const response = await fetch(`${API_URL}/api/personas/${personaId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete persona');

      onRefresh();
      setSelectedPersona(null);
    } catch (error) {
      console.error('Error deleting persona:', error);
      alert('Failed to delete persona');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">Customer Personas</h2>
        <p className="text-lg opacity-90">
          Create and manage diverse customer personas that represent your target audience
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Add New Persona Card */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 mb-3 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-all">
                <svg className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors mb-1">
                Add New Persona
              </h3>
              <p className="text-xs text-gray-500">
                Create manually or generate with AI
              </p>
            </div>
          </div>

          {personas.map((persona) => (
            <div
              key={persona.id}
              onClick={() => handlePersonaClick(persona)}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{persona.name}</h3>
                {persona.ai_generated && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    AI
                  </span>
                )}
              </div>

              {persona.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {persona.description}
                </p>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                {persona.demographics.age && persona.demographics.age.length > 0 && (
                  <p><strong>Age:</strong> {persona.demographics.age.join(', ')}</p>
                )}
                {persona.demographics.gender && persona.demographics.gender.length > 0 && (
                  <p><strong>Gender:</strong> {persona.demographics.gender.join(', ')}</p>
                )}
                {persona.demographics.careers && persona.demographics.careers.length > 0 && (
                  <p><strong>Career:</strong> {persona.demographics.careers.join(', ')}</p>
                )}
                {persona.demographics.region && persona.demographics.region.length > 0 && (
                  <p><strong>Region:</strong> {persona.demographics.region.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {personas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No personas yet</p>
            <p className="text-sm">Click &ldquo;Add New Persona&rdquo; to create your first persona</p>
          </div>
        )}
      </div>

      {/* Persona Creation Modal */}
      <PersonaCreationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        campaignId={campaignId}
        campaign={campaign}
        onPersonaCreated={onRefresh}
        editingPersona={editingPersona}
      />

      {/* Persona Detail Modal */}
      {selectedPersona && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseDetail}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedPersona.name}
                  </h2>
                  {selectedPersona.ai_generated && (
                    <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                      AI Generated ({selectedPersona.model_provider})
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {selectedPersona.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedPersona.description}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Demographics</h3>

                {Object.entries(selectedPersona.demographics).map(([key, values]) => {
                  if (key === 'custom_fields' || !values || (Array.isArray(values) && values.length === 0)) {
                    return null;
                  }

                  // Check if this is a statistical field (number)
                  const isStatField = typeof values === 'number';

                  return (
                    <div key={key} className="border-b pb-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                        {key.replace(/_/g, ' ')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {isStatField ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-mono">
                            {typeof values === 'number' ? values.toFixed(2) : values}
                          </span>
                        ) : (
                          (Array.isArray(values) ? values : [values]).map((value, idx) => (
                            <span
                              key={`${selectedPersona.id}-${key}-${idx}`}
                              className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                            >
                              {value}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedPersona.demographics.custom_fields &&
                  Object.keys(selectedPersona.demographics.custom_fields).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Fields</h3>
                      {Object.entries(selectedPersona.demographics.custom_fields).map(([key, values]) => (
                        <div key={key} className="border-b pb-3 mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">{key}</h4>
                          <div className="flex flex-wrap gap-2">
                            {values.map((value: string, idx: number) => (
                              <span
                                key={`${selectedPersona._id}-${key}-${value}-${idx}`}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                              >
                                {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className="flex justify-between gap-3 pt-6 border-t mt-6">
                <button
                  onClick={() => handleDeletePersona(selectedPersona.id)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete Persona
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEditPersona(selectedPersona)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Edit Persona
                  </button>
                  <button
                    onClick={handleCloseDetail}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Interface */}
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
        title="Chat with Persona AI"
        subtitle="Ask questions about personas, generate AI personas for your campaign, or get insights about your target audience"
        examplePrompts={[
          { label: "Generate personas", prompt: "Generate 20 diverse personas for my campaign", colorScheme: "indigo" },
          { label: "Persona insights", prompt: "What type of personas should I target for this campaign?", colorScheme: "blue" },
          { label: "Demographics", prompt: "Tell me about the demographics of @Persona 1", colorScheme: "green" },
          { label: "Audience strategy", prompt: "What audience segments should I focus on?", colorScheme: "orange" }
        ]}
      />
    </div>
  );
}
