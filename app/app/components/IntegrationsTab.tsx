"use client";

import { useState, useEffect } from 'react';
import { API_URL, getApiHeaders } from '../lib/api';

interface Integration {
  _id: string;
  user_id: string;
  type: string;
  store_url?: string;
  shop_name?: string;
  status: string;
  properties?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface IntegrationsTabProps {
  onShopifyConnected?: (integration: Integration) => void;
}

export default function IntegrationsTab({ onShopifyConnected }: IntegrationsTabProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyUrl, setShopifyUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      // User ID is now extracted from JWT on the backend
      const response = await fetch(`${API_URL}/api/integrations/`, { headers: getApiHeaders() });
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = async () => {
    if (!shopifyUrl.trim()) {
      setError('Please enter your Shopify store URL');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // User ID is now extracted from JWT on the backend
      const response = await fetch(`${API_URL}/api/integrations/shopify/connect`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          store_url: shopifyUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to initiate connection');
      }

      const data = await response.json();

      // Redirect to Shopify OAuth
      window.location.href = data.auth_url;
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Shopify');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;

    try {
      const response = await fetch(`${API_URL}/api/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (response.ok) {
        setIntegrations(prev => prev.filter(i => i._id !== integrationId));
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const shopifyIntegration = integrations.find(i => i.type === 'shopify' && i.status === 'connected');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Integrations</h2>
        <p className="text-purple-100 text-lg">Connect your e-commerce platforms and data sources</p>
      </div>

      {/* Available Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Shopify Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-green-500 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 109.5 124.5" className="w-8 h-8" fill="#95BF47">
                  <path d="M74.7,14.8c0,0-1.4,0.4-3.7,1.1c-0.4-1.3-1-2.8-1.8-4.4c-2.6-5-6.5-7.7-11.1-7.7c0,0,0,0,0,0 c-0.3,0-0.6,0-1,0.1c-0.1-0.2-0.3-0.3-0.4-0.5c-2-2.2-4.6-3.2-7.7-3.2c-6,0.2-11.9,4.5-16.7,12.2c-3.4,5.4-6,12.2-6.7,17.5 c-6.9,2.1-11.7,3.6-11.8,3.7c-3.5,1.1-3.6,1.2-4,4.5c-0.3,2.5-9.5,73.1-9.5,73.1l75.6,13.1V14.6C75.5,14.7,75.1,14.7,74.7,14.8z M57.2,20.2c-4,1.2-8.4,2.6-12.7,3.9c1.2-4.7,3.6-9.4,6.4-12.5c1.1-1.1,2.6-2.4,4.3-3.2C56.9,12,57.3,16.9,57.2,20.2z M49.1,4.3 c1.4,0,2.6,0.3,3.6,0.9c-1.6,0.8-3.2,2.1-4.7,3.6c-3.8,4.1-6.7,10.5-7.9,16.6c-3.6,1.1-7.2,2.2-10.5,3.2 C31.7,18.9,39.9,4.6,49.1,4.3z M37.4,59.3c0.4,6.4,17.3,7.8,18.3,22.9c0.7,11.9-6.3,20-16.4,20.6c-12.2,0.8-18.9-6.4-18.9-6.4 l2.6-11c0,0,6.7,5.1,12.1,4.7c3.5-0.2,4.8-3.1,4.7-5.1c-0.5-8.4-14.3-7.9-15.2-21.7C23.8,51.8,31.4,40.1,48.2,39 c6.5-0.4,9.8,1.2,9.8,1.2l-3.6,13.7c0,0-4.3-2-9.4-1.6C37.4,52.8,37.3,57.3,37.4,59.3z M60.1,18.8c0-2.8-0.4-6.8-1.8-10.1 c4.4,0.9,6.5,5.7,7.4,8.6C63.7,18,61.9,18.4,60.1,18.8z"/>
                  <path d="M78.1,123.9l31.4-7.8c0,0-13.5-91.3-13.6-91.9c-0.1-0.6-0.6-1-1.1-1c-0.5,0-9.3-0.2-9.3-0.2s-5.4-5.2-7.4-7.2 V123.9z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Shopify</h3>
                <p className="text-sm text-gray-500">E-commerce platform</p>
              </div>
            </div>
            {shopifyIntegration && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Connected
              </span>
            )}
          </div>

          {shopifyIntegration ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Store</p>
                <p className="font-semibold text-gray-900">{shopifyIntegration.shop_name || shopifyIntegration.store_url}</p>
              </div>
              {shopifyIntegration.properties && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {shopifyIntegration.properties.country && (
                    <div>
                      <span className="text-gray-500">Country:</span>
                      <span className="ml-1 font-medium">{shopifyIntegration.properties.country}</span>
                    </div>
                  )}
                  {shopifyIntegration.properties.currency && (
                    <div>
                      <span className="text-gray-500">Currency:</span>
                      <span className="ml-1 font-medium">{shopifyIntegration.properties.currency}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onShopifyConnected?.(shopifyIntegration)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
                >
                  View Data
                </button>
                <button
                  onClick={() => handleDisconnect(shopifyIntegration._id)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Connect your Shopify store to import products, customers, and order data.
              </p>
              <button
                onClick={() => setShowShopifyModal(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Connect Shopify
              </button>
            </div>
          )}
        </div>

        {/* More integrations placeholder */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-gray-300 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">More Coming Soon</h3>
              <p className="text-sm text-gray-500">Meta, Google Ads, etc.</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Additional integrations will be available in future updates.
          </p>
        </div>
      </div>

      {/* Connected Integrations List */}
      {integrations.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Connected Integrations</h3>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    integration.status === 'connected' ? 'bg-green-500' :
                    integration.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{integration.type}</p>
                    <p className="text-sm text-gray-500">
                      {integration.shop_name || integration.store_url || 'Pending connection'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    integration.status === 'connected' ? 'bg-green-100 text-green-800' :
                    integration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {integration.status}
                  </span>
                  <button
                    onClick={() => handleDisconnect(integration._id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shopify Connection Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Connect Shopify Store</h3>
              <button
                onClick={() => {
                  setShowShopifyModal(false);
                  setShopifyUrl('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shopify Store URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shopifyUrl}
                    onChange={(e) => setShopifyUrl(e.target.value)}
                    placeholder="mystore"
                    className="flex-1 px-4 py-2 border border-r-0 border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-r-lg text-gray-500">
                    .myshopify.com
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your store name (e.g., &quot;mystore&quot; for mystore.myshopify.com)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowShopifyModal(false);
                    setShopifyUrl('');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnectShopify}
                  disabled={connecting}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    connecting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
