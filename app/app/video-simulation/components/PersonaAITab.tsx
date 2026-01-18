import ChatInterface from './ChatInterface';
import { Persona, ChatMessage, Video } from '../types';

interface PersonaAITabProps {
  personas: Persona[];
  videos: Video[];
  chatMessages: ChatMessage[];
  chatInput: string;
  isLoadingChat: boolean;
  askPersonaModel: 'openai' | 'anthropic' | 'google';
  showMentionDropdown: boolean;
  mentionSearchTerm: string;
  onChatInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onModelChange: (model: 'openai' | 'anthropic' | 'google') => void;
  onMentionSelect: (mention: string) => void;
}

export default function PersonaAITab({
  personas,
  videos,
  chatMessages,
  chatInput,
  isLoadingChat,
  askPersonaModel,
  showMentionDropdown,
  mentionSearchTerm,
  onChatInputChange,
  onSendMessage,
  onModelChange,
  onMentionSelect,
}: PersonaAITabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-900 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">Personas</h2>
        <p className="text-lg opacity-90">
          Create personas you want to reach out to, or ask AI to generate personas for your campaign
        </p>
      </div>

      {/* Personas Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Add New Persona Card */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-700 hover:shadow-md transition-all cursor-pointer group">
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 mb-3 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-all">
                <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors mb-1">
                Add New Persona
              </h3>
              <p className="text-xs text-gray-500">
                Create a custom persona
              </p>
            </div>
          </div>

          {personas.map((persona) => (
            <div key={persona.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{persona.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                {persona.demographics.gender && <p><strong>Gender:</strong> {Array.isArray(persona.demographics.gender) ? persona.demographics.gender.join(', ') : persona.demographics.gender}</p>}
                {persona.demographics.age_mean !== undefined && persona.demographics.age_std !== undefined && (
                  <p><strong>Age:</strong> {Math.round(persona.demographics.age_mean)} ± {persona.demographics.age_std.toFixed(1)} years</p>
                )}
                {persona.demographics.num_orders_mean !== undefined && persona.demographics.num_orders_std !== undefined && (
                  <p><strong>Avg Orders:</strong> {persona.demographics.num_orders_mean.toFixed(1)} ± {persona.demographics.num_orders_std.toFixed(1)}</p>
                )}
                {persona.demographics.revenue_per_customer_mean !== undefined && (
                  <p><strong>Avg Revenue:</strong> ${Math.round(persona.demographics.revenue_per_customer_mean)}</p>
                )}
                {persona.demographics.region && <p><strong>Region:</strong> {Array.isArray(persona.demographics.region) ? persona.demographics.region.join(', ') : persona.demographics.region}</p>}
                {persona.demographics.weight !== undefined && <p><strong>Weight:</strong> {(persona.demographics.weight * 100).toFixed(1)}%</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Chat Interface */}
      <ChatInterface
        personas={personas}
        videos={videos}
        chatMessages={chatMessages}
        chatInput={chatInput}
        isLoadingChat={isLoadingChat}
        selectedModel={askPersonaModel}
        showMentionDropdown={showMentionDropdown}
        mentionSearchTerm={mentionSearchTerm}
        onChatInputChange={onChatInputChange}
        onSendMessage={onSendMessage}
        onModelChange={onModelChange}
        onMentionSelect={onMentionSelect}
        title="Chat with Persona AI"
        subtitle="Ask questions about personas - their demographics, preferences, behaviors, and how they respond to videos"
        examplePrompts={[
          { label: "Persona profile", prompt: "Tell me about @Persona 1's demographics and buying behavior", colorScheme: "indigo" },
          { label: "Video response", prompt: "How would @Persona 5 react to @Video 3?", colorScheme: "blue" },
          { label: "Compare personas", prompt: "What are the key differences between @Persona 1 and @Persona 10?", colorScheme: "green" },
          { label: "Preferences", prompt: "Which personas are most likely to respond to lifestyle messaging?", colorScheme: "orange" }
        ]}
      />
    </div>
  );
}
