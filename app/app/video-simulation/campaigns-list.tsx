"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function CampaignsList() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`);
      const data = await response.json();
      // FastAPI returns array directly, not wrapped in {campaigns: [...]}
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity cursor-pointer text-2xl font-light italic tracking-tight text-foreground">
            <Image src="/logo.png" alt="dble" width={28} height={28} className="h-7 w-7" />
            dble
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Video Marketing Simulation AI
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {/* Campaigns Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">Marketing Campaigns</h2>
              <p className="text-purple-100 text-lg">Create campaigns, set your goals, and track how your videos perform</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading campaigns...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Add New Campaign Card */}
                <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-gray-300 hover:border-purple-500 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] group">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">➕</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Campaign</h3>
                  <p className="text-gray-600 text-center text-sm">Create a new video marketing campaign</p>
                </div>

                {/* Existing Campaigns */}
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/app/${campaign.id}`}
                    className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer min-h-[300px] flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.name}</h3>
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        {campaign.status || 'Active'}
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 mb-4">
                      {campaign.goals?.primary && (
                        <div className="flex items-center text-sm text-gray-700">
                          <span className="mr-2">🎯</span>
                          <span className="font-semibold">Goal:</span>
                          <span className="ml-2 truncate">{campaign.goals.primary.substring(0, 30)}...</span>
                        </div>
                      )}
                      {campaign.budget && (
                        <div className="flex items-center text-sm text-gray-700">
                          <span className="mr-2">💰</span>
                          <span className="font-semibold">Budget:</span>
                          <span className="ml-2">${campaign.budget.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="mr-2">🎬</span>
                        <span className="font-semibold">Platform:</span>
                        <span className="ml-2">{campaign.platform || 'N/A'}</span>
                      </div>
                      {campaign.products && (
                        <div className="flex items-center text-sm text-gray-700">
                          <span className="mr-2">🪟</span>
                          <span className="font-semibold">Products:</span>
                          <span className="ml-2">{campaign.products}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Click to view details</span>
                        <span className="text-purple-600 font-semibold">→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
