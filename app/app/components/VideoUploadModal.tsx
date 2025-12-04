'use client';

import { useState, useEffect, useRef } from 'react';
import { API_URL, API_KEY, getApiHeaders } from '../lib/api';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onVideoUploaded: () => void;
}

export default function VideoUploadModal({
  isOpen,
  onClose,
  campaignId,
  onVideoUploaded
}: VideoUploadModalProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analyzeVideo, setAnalyzeVideo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdate = useRef<number>(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up any pending timeouts
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Use a timeout to reset state after modal transition
      const resetTimeout = setTimeout(() => {
        setTitle('');
        setFile(null);
        setUploading(false);
        setUploadProgress(0);
        setAnalyzing(false);
        setAnalysisProgress(0);
        setAnalyzeVideo(true);
        setError(null);
        setDragOver(false);
        setTaskId(null);
        lastProgressUpdate.current = 0;
      }, 300); // Delay to allow modal close animation

      return () => clearTimeout(resetTimeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid video file (MP4, MOV, AVI, or MPEG)');
        return;
      }

      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB in bytes
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 500MB');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Auto-generate title from filename if not set
      if (!title) {
        const filename = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(filename);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
      if (!validTypes.includes(droppedFile.type)) {
        setError('Please select a valid video file (MP4, MOV, AVI, or MPEG)');
        return;
      }

      setFile(droppedFile);
      setError(null);

      // Auto-generate title from filename if not set
      if (!title) {
        const filename = droppedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(filename);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const pollTaskStatus = async (taskIdToPoll: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskIdToPoll}`, { headers: getApiHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch task status');
      }

      const taskStatus = await response.json();

      // Update progress
      setAnalysisProgress(taskStatus.progress);

      // Check if completed
      if (taskStatus.status === 'completed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setAnalysisProgress(100);

        // Clean up any existing timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
        }

        // Brief delay to show completion, then reset and close
        completionTimeoutRef.current = setTimeout(() => {
          setTitle('');
          setFile(null);
          setUploadProgress(0);
          setAnalysisProgress(0);
          setAnalyzeVideo(true);
          setUploading(false);
          setAnalyzing(false);
          setTaskId(null);
          onVideoUploaded();
          onClose();
        }, 500);
      } else if (taskStatus.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setError(taskStatus.error || 'Video analysis failed');
        setAnalyzing(false);
        setAnalysisProgress(0);
      }
    } catch (error) {
      console.error('Error polling task status:', error);
    }
  };

  const handleUpload = () => {
    if (!file || !title.trim()) {
      setError('Please provide a title and select a video file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaign_id', campaignId);
    formData.append('title', title.trim());
    formData.append('analyze_video', analyzeVideo.toString());

    // Use XMLHttpRequest for upload progress tracking
    const xhr = new XMLHttpRequest();

    // Track upload progress with throttling to make it visible
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        const now = Date.now();

        // Update at most every 100ms to make progress visible
        if (now - lastProgressUpdate.current >= 100 || percentComplete === 100) {
          lastProgressUpdate.current = now;
          setUploadProgress(percentComplete);
        }
      }
    });

    // Upload completes - just ensure we show 100%
    xhr.upload.addEventListener('loadend', () => {
      setUploadProgress(100);
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('Video uploaded successfully:', data);

          // If there's a task_id, start polling for analysis status
          if (data.task_id) {
            // Transition from upload to analysis
            setUploading(false);
            setAnalyzing(true);
            setAnalysisProgress(0);
            setTaskId(data.task_id);

            // Start polling every 2 seconds
            pollIntervalRef.current = setInterval(() => {
              pollTaskStatus(data.task_id);
            }, 2000);

            // Poll immediately once
            pollTaskStatus(data.task_id);
          } else {
            // No analysis task - just close
            setUploading(false);

            // Clean up any existing timeout
            if (completionTimeoutRef.current) {
              clearTimeout(completionTimeoutRef.current);
            }

            // Brief delay, then reset and close
            completionTimeoutRef.current = setTimeout(() => {
              setTitle('');
              setFile(null);
              setUploadProgress(0);
              setAnalysisProgress(0);
              setAnalyzeVideo(true);
              setUploading(false);
              setAnalyzing(false);
              onVideoUploaded();
              onClose();
            }, 500);
          }
        } catch (err) {
          console.error('Error parsing response:', err);
          setError('Failed to parse server response');
          setUploading(false);
          setAnalyzing(false);
          setAnalysisProgress(0);
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          setError(errorData.detail || 'Failed to upload video');
        } catch {
          setError(`Failed to upload video (Status: ${xhr.status})`);
        }
        setUploading(false);
        setAnalyzing(false);
        setAnalysisProgress(0);
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      console.error('Upload error');
      setError('Network error - failed to upload video');
      setUploading(false);
      setAnalyzing(false);
      setAnalysisProgress(0);
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      console.log('Upload aborted');
      setError('Upload cancelled');
      setUploading(false);
      setAnalyzing(false);
      setAnalysisProgress(0);
    });

    // Send request
    xhr.open('POST', `${API_URL}/api/videos/upload`);
    if (API_KEY) {
      xhr.setRequestHeader('X-API-Key', API_KEY);
    }
    xhr.send(formData);
  };

  const handleClose = () => {
    if (!uploading && !analyzing) {
      // Clean up any pending timeouts and intervals
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      setTitle('');
      setFile(null);
      setError(null);
      setUploadProgress(0);
      setAnalyzing(false);
      setAnalysisProgress(0);
      setTaskId(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upload Video</h2>
            <button
              onClick={handleClose}
              disabled={uploading || analyzing}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Video Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={uploading || analyzing}
              />
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Video File *
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {!file ? (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-2">
                      Drag and drop your video file here, or
                    </p>
                    <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      Browse Files
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/x-msvideo,video/mpeg"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading || analyzing}
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      Supported formats: MP4, MOV, AVI, MPEG (Max 500MB)
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {!uploading && !analyzing && (
                      <button
                        onClick={() => setFile(null)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="analyzeVideo"
                checked={analyzeVideo}
                onChange={(e) => setAnalyzeVideo(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={uploading || analyzing}
              />
              <label htmlFor="analyzeVideo" className="text-sm text-gray-700">
                Analyze video with AI (recommended) - Extracts objects, colors, and content insights
              </label>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center">
                  {/* Rotating Spinner */}
                  <div className="relative w-16 h-16 mb-4">
                    <svg className="animate-spin w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ color: '#2563eb' }}></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ color: '#2563eb' }}></path>
                    </svg>
                  </div>

                  {/* Status Message */}
                  <p className="text-lg font-semibold text-blue-700 text-center mb-2">
                    Uploading video...
                  </p>

                  <p className="text-xs text-blue-500">
                    Please wait while your file uploads
                  </p>
                </div>
              </div>
            )}

            {/* AI Analysis Progress */}
            {analyzing && (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center">
                  {/* Rotating Spinner */}
                  <div className="relative w-16 h-16 mb-4">
                    <svg className="animate-spin w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ color: '#9333ea' }}></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ color: '#9333ea' }}></path>
                    </svg>
                  </div>

                  {/* Status Message */}
                  <p className="text-lg font-semibold text-purple-700 text-center mb-2">
                    Analyzing video with AI...
                  </p>

                  {/* Detailed Steps */}
                  <div className="space-y-2 text-sm text-purple-600 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span>Extracting visual elements and objects</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <span>Analyzing colors and textures</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <span>Creating timeline breakdown</span>
                    </div>
                  </div>

                  <p className="text-xs text-purple-500 mt-4">
                    This may take 30-60 seconds...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={handleClose}
              disabled={uploading || analyzing}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploading || analyzing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Upload Video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
