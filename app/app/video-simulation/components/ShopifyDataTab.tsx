"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { API_URL, getApiHeaders } from '../lib/api';

interface Integration {
  _id: string;
  user_id: string;
  type: string;
  store_url?: string;
  shop_name?: string;
  status: string;
  properties?: Record<string, any>;
}

interface Product {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  status: string;
  images: Array<{ src: string }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
}

interface Order {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
}

interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

interface ShopifyDataTabProps {
  integration: Integration;
  onBack: () => void;
}

type TabType = 'overview' | 'products' | 'orders' | 'customers';

export default function ShopifyDataTab({ integration, onBack }: ShopifyDataTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    products_count: number;
    orders_count: number;
    customers_count: number;
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productsNextPage, setProductsNextPage] = useState<string | null>(null);
  const [ordersNextPage, setOrdersNextPage] = useState<string | null>(null);
  const [customersNextPage, setCustomersNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/integrations/shopify/${integration._id}/analytics`, { headers: getApiHeaders() });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [integration._id]);

  const loadProducts = useCallback(async (pageInfo?: string) => {
    try {
      setLoadingMore(!!pageInfo);
      const url = pageInfo
        ? `${API_URL}/api/integrations/shopify/${integration._id}/products?page_info=${pageInfo}`
        : `${API_URL}/api/integrations/shopify/${integration._id}/products`;

      const response = await fetch(url, { headers: getApiHeaders() });
      if (response.ok) {
        const data = await response.json();
        if (pageInfo) {
          setProducts(prev => [...prev, ...data.products]);
        } else {
          setProducts(data.products);
        }
        setProductsNextPage(data.next_page_info);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [integration._id]);

  const loadOrders = useCallback(async (pageInfo?: string) => {
    try {
      setLoadingMore(!!pageInfo);
      const url = pageInfo
        ? `${API_URL}/api/integrations/shopify/${integration._id}/orders?page_info=${pageInfo}`
        : `${API_URL}/api/integrations/shopify/${integration._id}/orders`;

      const response = await fetch(url, { headers: getApiHeaders() });
      if (response.ok) {
        const data = await response.json();
        if (pageInfo) {
          setOrders(prev => [...prev, ...data.orders]);
        } else {
          setOrders(data.orders);
        }
        setOrdersNextPage(data.next_page_info);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [integration._id]);

  const loadCustomers = useCallback(async (pageInfo?: string) => {
    try {
      setLoadingMore(!!pageInfo);
      const url = pageInfo
        ? `${API_URL}/api/integrations/shopify/${integration._id}/customers?page_info=${pageInfo}`
        : `${API_URL}/api/integrations/shopify/${integration._id}/customers`;

      const response = await fetch(url, { headers: getApiHeaders() });
      if (response.ok) {
        const data = await response.json();
        if (pageInfo) {
          setCustomers(prev => [...prev, ...data.customers]);
        } else {
          setCustomers(data.customers);
        }
        setCustomersNextPage(data.next_page_info);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [integration._id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (activeTab === 'products' && products.length === 0) {
      loadProducts();
    } else if (activeTab === 'orders' && orders.length === 0) {
      loadOrders();
    } else if (activeTab === 'customers' && customers.length === 0) {
      loadCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-emerald-600 rounded-lg shadow-lg p-8 text-white">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Integrations
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 109.5 124.5" className="w-10 h-10" fill="white">
              <path d="M74.7,14.8c0,0-1.4,0.4-3.7,1.1c-0.4-1.3-1-2.8-1.8-4.4c-2.6-5-6.5-7.7-11.1-7.7c0,0,0,0,0,0 c-0.3,0-0.6,0-1,0.1c-0.1-0.2-0.3-0.3-0.4-0.5c-2-2.2-4.6-3.2-7.7-3.2c-6,0.2-11.9,4.5-16.7,12.2c-3.4,5.4-6,12.2-6.7,17.5 c-6.9,2.1-11.7,3.6-11.8,3.7c-3.5,1.1-3.6,1.2-4,4.5c-0.3,2.5-9.5,73.1-9.5,73.1l75.6,13.1V14.6C75.5,14.7,75.1,14.7,74.7,14.8z"/>
              <path d="M78.1,123.9l31.4-7.8c0,0-13.5-91.3-13.6-91.9c-0.1-0.6-0.6-1-1.1-1c-0.5,0-9.3-0.2-9.3-0.2s-5.4-5.2-7.4-7.2 V123.9z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold">{integration.shop_name || 'Shopify Store'}</h2>
            <p className="text-gray-200">{integration.store_url}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['overview', 'products', 'orders', 'customers'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-gray-600 text-gray-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 font-medium">Products</p>
                          <p className="text-3xl font-bold text-blue-900">{analytics?.products_count || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-700 font-medium">Orders</p>
                          <p className="text-3xl font-bold text-green-900">{analytics?.orders_count || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 font-medium">Customers</p>
                          <p className="text-3xl font-bold text-purple-900">{analytics?.customers_count || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Store Info */}
                  {integration.properties && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Store Information</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {integration.properties.shop_domain && (
                          <div>
                            <p className="text-sm text-gray-500">Domain</p>
                            <p className="font-medium text-gray-900">{integration.properties.shop_domain}</p>
                          </div>
                        )}
                        {integration.properties.country && (
                          <div>
                            <p className="text-sm text-gray-500">Country</p>
                            <p className="font-medium text-gray-900">{integration.properties.country}</p>
                          </div>
                        )}
                        {integration.properties.currency && (
                          <div>
                            <p className="text-sm text-gray-500">Currency</p>
                            <p className="font-medium text-gray-900">{integration.properties.currency}</p>
                          </div>
                        )}
                        {integration.properties.plan_name && (
                          <div>
                            <p className="text-sm text-gray-500">Plan</p>
                            <p className="font-medium text-gray-900 capitalize">{integration.properties.plan_name}</p>
                          </div>
                        )}
                        {integration.properties.timezone && (
                          <div>
                            <p className="text-sm text-gray-500">Timezone</p>
                            <p className="font-medium text-gray-900">{integration.properties.timezone}</p>
                          </div>
                        )}
                        {integration.properties.shop_email && (
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-gray-900">{integration.properties.shop_email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {products.length === 0 && !loadingMore ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Loading products...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {product.images[0] && (
                          <Image
                            src={product.images[0].src}
                            alt={product.title}
                            className="w-full h-48 object-cover"
                            width={400}
                            height={192}
                            unoptimized
                          />
                        )}
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 truncate">{product.title}</h4>
                          <p className="text-sm text-gray-500">{product.vendor}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-gray-700">
                              ${product.variants[0]?.price || '0.00'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              product.status === 'active' ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {productsNextPage && (
                    <div className="text-center">
                      <button
                        onClick={() => loadProducts(productsNextPage)}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
                      >
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 && !loadingMore ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Loading orders...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium text-gray-900">#{order.order_number}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm text-gray-900">
                                  {order.customer?.first_name} {order.customer?.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{order.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-gray-900">
                                {order.currency} {order.total_price}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                order.financial_status === 'paid' ? 'bg-gray-200 text-gray-900' :
                                order.financial_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.financial_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {ordersNextPage && (
                    <div className="text-center">
                      <button
                        onClick={() => loadOrders(ordersNextPage)}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
                      >
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              {customers.length === 0 && !loadingMore ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Loading customers...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customers.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium text-gray-900">
                                {customer.first_name} {customer.last_name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {customer.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.orders_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-gray-900">${customer.total_spent}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(customer.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {customersNextPage && (
                    <div className="text-center">
                      <button
                        onClick={() => loadCustomers(customersNextPage)}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
                      >
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
