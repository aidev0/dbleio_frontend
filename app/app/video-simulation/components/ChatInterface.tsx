import ReactMarkdown from 'react-markdown';
import { Persona, Campaign, ChatMessage, Video } from '../types';

interface ExamplePrompt {
  label: string;
  prompt: string;
  colorScheme: 'indigo' | 'blue' | 'green' | 'orange' | 'purple';
}

interface ChatInterfaceProps {
  personas?: Persona[];
  videos?: Video[];
  campaign?: Campaign;
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
  title?: string;
  subtitle?: string;
  examplePrompts?: ExamplePrompt[];
  generatedInsights?: any;
  onGenerateInsights?: () => void;
  loadingInsights?: boolean;
}

export default function ChatInterface({
  personas = [],
  videos = [],
  campaign,
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
  title = "AI Assistant",
  subtitle = "Chat with our AI to get insights about your videos, customers, and test results",
  examplePrompts = [
    { label: "Compare personas", prompt: "What are the key differences between @Persona 1 and @Persona 2?", colorScheme: "indigo" },
    { label: "Persona response", prompt: "How would @Persona 5 respond to @Video 3?", colorScheme: "blue" },
    { label: "Video preferences", prompt: "Which personas prefer @Video 2 over @Video 4 and why?", colorScheme: "green" },
    { label: "Persona insights", prompt: "Summarize the demographics of @Persona 10 and their buying behavior", colorScheme: "orange" }
  ],
  generatedInsights,
  onGenerateInsights,
  loadingInsights = false
}: ChatInterfaceProps) {
  const getColorClasses = (colorScheme: ExamplePrompt['colorScheme']) => {
    const colorMap = {
      indigo: 'from-gray-100 to-gray-100 hover:from-gray-200 hover:to-gray-200 border-gray-400 hover:border-gray-600',
      blue: 'from-gray-100 to-gray-100 hover:from-gray-200 hover:to-gray-200 border-gray-400 hover:border-gray-600',
      green: 'from-gray-100 to-emerald-50 hover:from-gray-200 hover:to-emerald-100 border-gray-300 hover:border-gray-400',
      orange: 'from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-orange-200 hover:border-orange-300',
      purple: 'from-gray-100 to-pink-50 hover:from-gray-200 hover:to-pink-100 border-gray-400 hover:border-gray-600'
    };
    return colorMap[colorScheme];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg mt-6">
      <div className="bg-gradient-to-r from-gray-900 to-gray-900 rounded-t-lg p-6 text-white">
        <div className="flex justify-between items-start mb-3 gap-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{title}</h3>
            <p className="text-sm opacity-90">{subtitle}</p>
          </div>

          {/* Generate Insights Button */}
          {onGenerateInsights && (
            <button
              onClick={onGenerateInsights}
              disabled={loadingInsights}
              className={`px-4 py-2 rounded-lg font-semibold shadow-md transition-all flex items-center gap-2 ${
                loadingInsights
                  ? 'bg-white/20 cursor-not-allowed'
                  : 'bg-white text-gray-900 hover:bg-white/90'
              }`}
            >
              {loadingInsights ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Generating...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">✨</span>
                  <span className="text-sm">{generatedInsights ? 'Regenerate' : 'Generate'} Insights</span>
                </>
              )}
            </button>
          )}

          {/* Model Selector */}
          <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
            <label className="text-xs font-semibold mb-2 block">AI Model</label>
            <div className="flex space-x-2">
              <button
                onClick={() => onModelChange('anthropic')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  selectedModel === 'anthropic'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                🧠 Claude Sonnet 4.5
              </button>
              <button
                onClick={() => onModelChange('openai')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  selectedModel === 'openai'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                🤖 GPT-5
              </button>
              <button
                onClick={() => onModelChange('google')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  selectedModel === 'google'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                🔍 Gemini Pro 2.5
              </button>
            </div>
          </div>
        </div>

        {(campaign || personas.length > 0 || videos.length > 0) && (
          <div className="bg-white/10 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">💡 How to use:</p>
            <ul className="space-y-1 opacity-90">
              {campaign && (
                <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Campaign</code> to discuss the campaign strategy and goals</li>
              )}
              {personas.length > 0 && (
                <>
                  <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Persona1</code> - persona responds as themselves (first person)</li>
                  <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Persona1 @Persona2</code> - AI analyzes personas (third person)</li>
                </>
              )}
              {videos.length > 0 && (
                <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Video2</code> to discuss specific videos</li>
              )}
              <li>• No mentions - AI assistant provides general insights</li>
            </ul>
          </div>
        )}
      </div>

      {/* Chat Messages and Insights */}
      <div className="h-[600px] overflow-y-auto p-6 space-y-4">
        {/* Generated Insights Section */}
        {generatedInsights && (
          <div className="space-y-4 mb-6 pb-6 border-b-2 border-gray-400">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h4 className="text-lg font-bold text-gray-900">AI-Generated Insights</h4>
              <span className="text-xs text-gray-500 ml-auto">Generated by Gemini 2.5</span>
            </div>

            {/* Summary Card */}
            {generatedInsights.summary && (
              <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg shadow p-4 text-white">
                <h5 className="font-bold mb-2 flex items-center gap-2">
                  <span>📊</span>
                  <span>Executive Summary</span>
                </h5>
                <p className="text-sm mb-3">{generatedInsights.summary.bottom_line}</p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-white/20 px-3 py-1 rounded">
                    Confidence: <span className="font-bold">{generatedInsights.summary.confidence_score}%</span>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded">
                    Quality: <span className="font-bold capitalize">{generatedInsights.summary.data_quality}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Performance & Audience Insights - Compact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Performance Insights */}
              {generatedInsights.performance_insights && (
                <div className="bg-gray-100 rounded-lg shadow p-4 border border-gray-400">
                  <h5 className="font-bold text-gray-900 mb-2">📊 Performance</h5>
                  {generatedInsights.performance_insights.top_performer && (
                    <div className="text-sm mb-2">
                      <span className="font-semibold">Top: Video {generatedInsights.performance_insights.top_performer.video_number}</span>
                      <span className="text-gray-600"> ({generatedInsights.performance_insights.top_performer.percentage}%)</span>
                    </div>
                  )}
                  {generatedInsights.performance_insights.key_findings?.slice(0, 2).map((finding: string, idx: number) => (
                    <p key={idx} className="text-xs text-gray-700 mt-1">• {finding}</p>
                  ))}
                </div>
              )}

              {/* Audience Insights */}
              {generatedInsights.audience_insights && (
                <div className="bg-gray-100 rounded-lg shadow p-4 border border-gray-400">
                  <h5 className="font-bold text-gray-900 mb-2">👥 Audience</h5>
                  {generatedInsights.audience_insights.key_patterns?.slice(0, 3).map((pattern: string, idx: number) => (
                    <p key={idx} className="text-xs text-gray-700 mt-1">• {pattern}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations - Compact */}
            {generatedInsights.recommendations && (
              <div className="bg-gray-100 rounded-lg shadow p-4 border border-gray-300">
                <h5 className="font-bold text-gray-900 mb-2">💡 Recommendations</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {generatedInsights.recommendations.immediate_actions?.slice(0, 2).map((action: string, idx: number) => (
                    <p key={idx} className="text-gray-700">▸ {action}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Messages */}
        {chatMessages.length > 0 ? (
          chatMessages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-gray-200' : 'text-gray-500'}`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        ) : null}

        {isLoadingChat && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t p-4">
        <div className="flex space-x-4 relative">
          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={onChatInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && showMentionDropdown) {
                  e.preventDefault();
                } else if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder="Ask a question... (Type @ to mention personas, videos, or campaign)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
              disabled={isLoadingChat}
            />

            {/* Mention Autocomplete Dropdown */}
            {showMentionDropdown && (campaign || personas.length > 0 || videos.length > 0) && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                <div className="p-2">
                  {campaign && (
                    <>
                      <div className="text-xs font-semibold text-gray-500 px-2 py-1">CAMPAIGN</div>
                      <button
                        onClick={() => onMentionSelect(`@Campaign[${campaign._id || campaign.id}] ${campaign.name}`)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                      >
                        <div className="text-gray-700 font-semibold">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-gray-500 text-xs mt-0.5 truncate">{campaign.description}</div>
                        )}
                      </button>
                    </>
                  )}

                  {personas.length > 0 && (
                    <>
                      <div className={`text-xs font-semibold text-gray-500 px-2 py-1 ${campaign ? 'mt-2' : ''}`}>PERSONAS</div>
                      {personas
                        .filter(p =>
                          mentionSearchTerm === '' ||
                          p.name.toLowerCase().includes(mentionSearchTerm) ||
                          p.id.toString().includes(mentionSearchTerm)
                        )
                        .map(persona => {
                          // Build persona details string
                          const details = [];
                          if (persona.demographics.gender) {
                            const gender = Array.isArray(persona.demographics.gender)
                              ? persona.demographics.gender[0]
                              : persona.demographics.gender;
                            details.push(gender);
                          }
                          if (persona.demographics.age) {
                            const age = Array.isArray(persona.demographics.age)
                              ? persona.demographics.age[0]
                              : persona.demographics.age;
                            details.push(age);
                          }
                          if (persona.demographics.locations) {
                            const location = Array.isArray(persona.demographics.locations)
                              ? persona.demographics.locations[0]
                              : persona.demographics.locations;
                            details.push(location);
                          } else if (persona.demographics.region) {
                            const region = Array.isArray(persona.demographics.region)
                              ? persona.demographics.region[0]
                              : persona.demographics.region;
                            details.push(region);
                          }

                          const detailsStr = details.length > 0 ? details.join(', ') : '';

                          const personaId = persona._id || persona.id || `idx-${personas.indexOf(persona)}`;
                          return (
                            <button
                              key={`persona-${personaId}`}
                              onClick={() => onMentionSelect(`@Persona[${personaId}] ${persona.name}`)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                            >
                              <div className="text-gray-900 font-semibold">{persona.name}</div>
                              {detailsStr && (
                                <div className="text-gray-500 text-xs mt-0.5">{detailsStr}</div>
                              )}
                            </button>
                          );
                        })}
                    </>
                  )}

                  {videos.length > 0 && (
                    <>
                      <div className={`text-xs font-semibold text-gray-500 px-2 py-1 ${campaign || personas.length > 0 ? 'mt-2' : ''}`}>VIDEOS</div>
                      {videos
                        .filter(v =>
                          mentionSearchTerm === '' ||
                          v.title.toLowerCase().includes(mentionSearchTerm) ||
                          v.id.toLowerCase().includes(mentionSearchTerm)
                        )
                        .map(video => {
                          return (
                            <button
                              key={video.id}
                              onClick={() => onMentionSelect(`@Video[${video.id}] ${video.title}`)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex flex-col"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-900 font-semibold">{video.title}</span>
                              </div>
                            </button>
                          );
                        })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onSendMessage}
            disabled={isLoadingChat || !chatInput.trim()}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isLoadingChat || !chatInput.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-black'
            }`}
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Type @ to mention personas or videos
        </div>

        {/* Example Prompts */}
        {chatMessages.length === 0 && examplePrompts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-3">💡 Try these examples:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const syntheticEvent = {
                      target: { value: example.prompt },
                      currentTarget: { value: example.prompt }
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChatInputChange(syntheticEvent);
                  }}
                  className={`text-left p-3 bg-gradient-to-r rounded-lg text-sm text-gray-700 transition-all border ${getColorClasses(example.colorScheme)}`}
                >
                  <span className="font-medium">{example.label}:</span>
                  <br />
                  <span className="text-xs text-gray-600">&ldquo;{example.prompt}&rdquo;</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
