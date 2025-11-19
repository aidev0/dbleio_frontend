'use client';

import { useState } from 'react';
import Image from 'next/image';
import ChatInterface from './ChatInterface';
import VideoUploadModal from './VideoUploadModal';
import { Video, ChatMessage } from '../types';

interface TimelineSegment {
  start: number;
  end: number;
  description: string;
  elements: string[];
  purpose: string;
}

interface VideosTabProps {
  videos: Video[];
  campaignId: string;
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

export default function VideosTab({
  videos,
  campaignId,
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
  onMentionSelect,
}: VideosTabProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    setDeletingVideoId(videoId);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete video');

      onRefresh();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    } finally {
      setDeletingVideoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">Marketing Videos</h2>
        <p className="text-lg opacity-90">
          Upload and organize your marketing videos - we&apos;ll help you test which ones work best
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Add New Video Card */}
        <div
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 hover:shadow-xl transition-all duration-300 cursor-pointer group"
        >
          <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group-hover:from-blue-50 group-hover:to-blue-100 transition-all">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-200 group-hover:bg-blue-200 flex items-center justify-center transition-all">
                <svg className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-600 group-hover:text-blue-600 text-center transition-colors">
              Upload Video
            </h3>
            <p className="mt-2 text-sm text-gray-500 text-center">
              Add a new marketing video with AI analysis
            </p>
          </div>
        </div>

        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => handleVideoClick(video)}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
          >
            <div className="aspect-video bg-gray-200 flex items-center justify-center relative group">
              {video.thumbnail_url ? (
                <Image
                  src={video.thumbnail_url}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
                  <svg className="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {video.title}
              </h3>
              {video.analysis?.summary && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {video.analysis.summary}
                </p>
              )}
              {video.analysis && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                  {video.analysis.objects && video.analysis.objects.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {video.analysis.objects.length} objects
                    </span>
                  )}
                  {video.analysis.number_of_scene_cut !== undefined && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                      {video.analysis.number_of_scene_cut} cuts
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        campaignId={campaignId}
        onVideoUploaded={() => {
          onRefresh();
          setIsUploadModalOpen(false);
        }}
      />

      {/* Chat Interface */}
      <ChatInterface
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
        title="Chat with Video Understanding AI"
        subtitle="Ask questions about video content, analysis, quality, and which elements perform best"
        examplePrompts={[
          { label: "Video analysis", prompt: "What are the key elements and messaging in @Video 1?", colorScheme: "purple" },
          { label: "Compare videos", prompt: "How do @Video 2 and @Video 4 differ in style and approach?", colorScheme: "blue" },
          { label: "Best moments", prompt: "Which video has the strongest opening hook?", colorScheme: "green" },
          { label: "Quality insights", prompt: "What production elements make @Video 3 effective?", colorScheme: "orange" }
        ]}
      />

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedVideo.title}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <video
                  src={selectedVideo.url}
                  controls
                  className="w-full rounded-lg bg-gray-900"
                />
              </div>

              {selectedVideo.analysis && (
                <div className="space-y-4">
                  {selectedVideo.analysis.summary && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Summary
                      </h3>
                      <p className="text-gray-700">{selectedVideo.analysis.summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVideo.analysis.duration_analysis && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Duration
                        </h3>
                        <p className="text-gray-700">{selectedVideo.analysis.duration_analysis}</p>
                      </div>
                    )}

                    {selectedVideo.analysis.number_of_scene_cut !== undefined && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Scene Cuts
                        </h3>
                        <p className="text-gray-700">{selectedVideo.analysis.number_of_scene_cut}</p>
                      </div>
                    )}
                  </div>

                  {selectedVideo.analysis.objects && selectedVideo.analysis.objects.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Objects Detected
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedVideo.analysis.objects.map((obj: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVideo.analysis.colors && selectedVideo.analysis.colors.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Colors
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedVideo.analysis.colors.map((color: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVideo.analysis.textures && selectedVideo.analysis.textures.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Textures
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedVideo.analysis.textures.map((texture: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                          >
                            {texture}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVideo.analysis.qualities_demonstrated && selectedVideo.analysis.qualities_demonstrated.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Qualities Demonstrated
                      </h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {selectedVideo.analysis.qualities_demonstrated.map((quality: string, idx: number) => (
                          <li key={idx}>{quality}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedVideo.analysis.timeline && selectedVideo.analysis.timeline.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Video Timeline
                      </h3>
                      <div className="space-y-3">
                        {selectedVideo.analysis.timeline.map((segment: TimelineSegment, idx: number) => (
                          <div
                            key={idx}
                            className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-blue-600">
                                {segment.start}s - {segment.end}s
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {segment.purpose.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mb-2">
                              {segment.description}
                            </p>
                            {segment.elements.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {segment.elements.map((element: string, elemIdx: number) => (
                                  <span
                                    key={elemIdx}
                                    className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded"
                                  >
                                    {element}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedVideo.analysis && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No AI analysis available for this video yet</p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${selectedVideo.id}/analyze`, {
                          method: 'POST'
                        });
                        if (response.ok) {
                          onRefresh();
                          alert('Video analysis started! This may take a few minutes.');
                        }
                      } catch (error) {
                        console.error('Error analyzing video:', error);
                        alert('Failed to start video analysis');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Analyze with AI
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-6 border-t mt-6">
                <button
                  onClick={() => handleDeleteVideo(selectedVideo.id)}
                  disabled={deletingVideoId === selectedVideo.id}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                >
                  {deletingVideoId === selectedVideo.id ? 'Deleting...' : 'Delete Video'}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
