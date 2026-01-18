import ReactMarkdown from 'react-markdown';
import { Persona, ChatMessage, Video } from '../types';

interface AskPersonaTabProps {
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

export default function AskPersonaTab({
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
}: AskPersonaTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-900 rounded-lg shadow-lg p-8 text-white">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-3">Ask Questions</h2>
            <p className="text-lg opacity-90 mb-4">
              Chat with our AI assistant to get answers about your videos, customers, and test results
            </p>
          </div>

          {/* Model Selector */}
          <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
            <label className="text-xs font-semibold mb-2 block">AI Model</label>
            <div className="flex space-x-2">
              <button
                onClick={() => onModelChange('anthropic')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  askPersonaModel === 'anthropic'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                🧠 Claude Sonnet 4.5
              </button>
              <button
                onClick={() => onModelChange('openai')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  askPersonaModel === 'openai'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                🤖 GPT-5
              </button>
              <button
                onClick={() => onModelChange('google')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  askPersonaModel === 'google'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                🔍 Gemini Pro 2.5
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-2">💡 How to use:</p>
          <ul className="space-y-1 opacity-90">
            <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Persona1</code> - persona responds as themselves (first person)</li>
            <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Persona1 @Persona2</code> - AI analyzes personas (third person)</li>
            <li>• Type <code className="bg-white/20 px-2 py-1 rounded">@Video2</code> to discuss specific videos</li>
            <li>• No mentions - AI assistant provides general insights</li>
          </ul>
        </div>
      </div>

      {/* Example Prompts */}
      {chatMessages.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => {
                const syntheticEvent = {
                  target: { value: 'Tell me about yourself @Persona 1' },
                  currentTarget: { value: 'Tell me about yourself @Persona 1' }
                } as React.ChangeEvent<HTMLInputElement>;
                onChatInputChange(syntheticEvent);
              }}
              className="text-left p-4 bg-gradient-to-r from-gray-100 to-gray-100 rounded-lg hover:shadow-md transition-all border-2 border-transparent hover:border-gray-600"
            >
              <div className="font-semibold text-black mb-1">First-person persona</div>
              <div className="text-sm text-gray-600">Tell me about yourself @Persona 1</div>
            </button>

            <button
              onClick={() => {
                const syntheticEvent = {
                  target: { value: 'What are the key differences between @Persona 1 and @Persona 2?' },
                  currentTarget: { value: 'What are the key differences between @Persona 1 and @Persona 2?' }
                } as React.ChangeEvent<HTMLInputElement>;
                onChatInputChange(syntheticEvent);
              }}
              className="text-left p-4 bg-gradient-to-r from-gray-100 to-gray-100 rounded-lg hover:shadow-md transition-all border-2 border-transparent hover:border-gray-600"
            >
              <div className="font-semibold text-black mb-1">Compare personas</div>
              <div className="text-sm text-gray-600">What are the key differences between @Persona 1 and @Persona 2?</div>
            </button>

            <button
              onClick={() => {
                const syntheticEvent = {
                  target: { value: 'How does @Persona 1 feel about @Video 2?' },
                  currentTarget: { value: 'How does @Persona 1 feel about @Video 2?' }
                } as React.ChangeEvent<HTMLInputElement>;
                onChatInputChange(syntheticEvent);
              }}
              className="text-left p-4 bg-gradient-to-r from-gray-100 to-gray-100 rounded-lg hover:shadow-md transition-all border-2 border-transparent hover:border-gray-400"
            >
              <div className="font-semibold text-gray-800 mb-1">Persona + video</div>
              <div className="text-sm text-gray-600">How does @Persona 1 feel about @Video 2?</div>
            </button>

            <button
              onClick={() => {
                const syntheticEvent = {
                  target: { value: 'Which video performs best overall?' },
                  currentTarget: { value: 'Which video performs best overall?' }
                } as React.ChangeEvent<HTMLInputElement>;
                onChatInputChange(syntheticEvent);
              }}
              className="text-left p-4 bg-gradient-to-r from-gray-100 to-pink-50 rounded-lg hover:shadow-md transition-all border-2 border-transparent hover:border-gray-600"
            >
              <div className="font-semibold text-black mb-1">General analysis</div>
              <div className="text-sm text-gray-600">Which video performs best overall?</div>
            </button>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="bg-white rounded-lg shadow-lg">
        {/* Chat Messages */}
        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">Start a conversation</p>
                <p className="text-sm mt-2">Try asking: &ldquo;What are the key differences between @Persona 1 and @Persona 2?&rdquo;</p>
              </div>
            </div>
          ) : (
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
          )}
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
                    // Need to close dropdown - this will be handled by parent
                  } else if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
                    e.preventDefault();
                    onSendMessage();
                  }
                }}
                placeholder="Ask a question... (e.g., 'How does @Persona 1 respond to @Video 2?')"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                disabled={isLoadingChat}
              />

              {/* Mention Autocomplete Dropdown */}
              {showMentionDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-500 px-2 py-1">PERSONAS</div>
                    {personas
                      .filter(p =>
                        mentionSearchTerm === '' ||
                        p.name.toLowerCase().includes(mentionSearchTerm) ||
                        p.id.toString().includes(mentionSearchTerm)
                      )
                      .map(persona => (
                        <button
                          key={`persona-${persona._id || persona.id}`}
                          onClick={() => onMentionSelect(`@Persona ${persona._id || persona.id}`)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
                        >
                          <span className="text-gray-900 font-semibold">@Persona {persona._id || persona.id}</span>
                          <span className="text-gray-600 text-sm">- {persona.name}</span>
                        </button>
                      ))}

                    <div className="text-xs font-semibold text-gray-500 px-2 py-1 mt-2">VIDEOS</div>
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
                            onClick={() => onMentionSelect(`@Video ${video.id}`)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex flex-col"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-900 font-semibold">{video.title}</span>
                            </div>
                            <span className="text-gray-500 text-xs font-mono">ID: {video.id}</span>
                          </button>
                        );
                      })}
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
        </div>
      </div>
    </div>
  );
}
