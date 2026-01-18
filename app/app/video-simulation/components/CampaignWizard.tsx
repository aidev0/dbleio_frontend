"use client";

import { useState, useEffect } from 'react';

// Types
export interface Advertiser {
  business_name: string;
  website_url: string;
}

export interface PerformanceObjective {
  value: number;
  kpi: string;
}

export interface AudienceControl {
  location: string[];
  zip_codes: string[];
  in_market_interests: string[];
}

export interface Strategy {
  name: string;
  budget_amount: number;
  budget_type: 'daily' | 'weekly' | 'monthly';
  audience_control: AudienceControl;
}

export interface CampaignData {
  name: string;
  description?: string;
  platform: string;
  advertiser: Advertiser;
  campaign_goal: string;
  performance_objective: PerformanceObjective;
  strategies: Strategy[];
}

interface CampaignWizardProps {
  onClose: () => void;
  onSave: (campaign: CampaignData) => Promise<void>;
  existingCampaign?: any;
  mode?: 'create' | 'edit';
}

export default function CampaignWizard({ onClose, onSave, existingCampaign, mode = 'create' }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState<CampaignData>(
    existingCampaign || {
      name: '',
      description: '',
      platform: '',
      advertiser: {
        business_name: '',
        website_url: '',
      },
      campaign_goal: '',
      performance_objective: {
        value: 0,
        kpi: '',
      },
      strategies: [],
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update campaign data when existingCampaign changes
  useEffect(() => {
    if (existingCampaign) {
      setCampaignData({
        name: existingCampaign.name || '',
        description: existingCampaign.description || '',
        platform: existingCampaign.platform || '',
        advertiser: existingCampaign.advertiser || {
          business_name: '',
          website_url: '',
        },
        campaign_goal: existingCampaign.campaign_goal || '',
        performance_objective: existingCampaign.performance_objective || {
          value: 0,
          kpi: '',
        },
        strategies: existingCampaign.strategies || [],
      });
    }
  }, [existingCampaign]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(campaignData);
      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return campaignData.platform !== '';
      case 2:
        return (
          campaignData.name.trim() !== '' &&
          campaignData.advertiser.business_name.trim() !== '' &&
          campaignData.advertiser.website_url.trim() !== '' &&
          campaignData.campaign_goal !== '' &&
          campaignData.performance_objective.value > 0 &&
          campaignData.performance_objective.kpi !== ''
        );
      case 3:
        return campaignData.strategies.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Create New Campaign' : 'Edit Campaign'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    step === currentStep
                      ? 'bg-gray-900 text-white'
                      : step < currentStep
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <div className="ml-3 flex-1">
                  <div
                    className={`text-sm font-semibold ${
                      step === currentStep ? 'text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {step === 1 && 'Platforms'}
                    {step === 2 && 'Campaign Details'}
                    {step === 3 && 'Strategies'}
                    {step === 4 && 'Summary'}
                  </div>
                </div>
                {step < 4 && (
                  <div
                    className={`h-1 w-full ${
                      step < currentStep ? 'bg-gray-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Step 1: Platform Selection */}
          {currentStep === 1 && (
            <Step1PlatformSelection
              selectedPlatform={campaignData.platform}
              onChange={(platform) =>
                setCampaignData({ ...campaignData, platform })
              }
            />
          )}

          {/* Step 2: Campaign Details */}
          {currentStep === 2 && (
            <Step2CampaignDetails
              campaignData={campaignData}
              onChange={setCampaignData}
            />
          )}

          {/* Step 3: Strategies */}
          {currentStep === 3 && (
            <Step3Strategies
              strategies={campaignData.strategies}
              onChange={(strategies) =>
                setCampaignData({ ...campaignData, strategies })
              }
            />
          )}

          {/* Step 4: Summary */}
          {currentStep === 4 && <Step4Summary campaignData={campaignData} />}
        </div>

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-between">
          <button
            onClick={currentStep === 1 ? onClose : handlePrevious}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
              className={`px-6 py-2 rounded-lg font-semibold ${
                canProceedToNextStep()
                  ? 'bg-gray-900 text-white hover:bg-black'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-semibold ${
                isSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-black'
              }`}
            >
              {isSaving ? 'Saving...' : mode === 'create' ? 'Create Campaign' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Platform Selection
function Step1PlatformSelection({
  selectedPlatform,
  onChange,
}: {
  selectedPlatform: string;
  onChange: (platform: string) => void;
}) {
  const platforms = [
    { id: 'vibe.co', name: "Vibe's Performance Network", icon: '📺', color: 'purple' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'blue' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'pink' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'indigo' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'gray' },
    { id: 'x', name: 'X (Twitter)', icon: '🐦', color: 'sky' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Select Platform</h3>
        <p className="text-gray-600">Choose where you want to run your campaign</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          return (
            <button
              key={platform.id}
              onClick={() => onChange(platform.id)}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `border-${platform.color}-500 bg-${platform.color}-50`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{platform.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{platform.name}</div>
                </div>
                {isSelected && (
                  <div className="text-gray-600 text-2xl">✓</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 2: Campaign Details
function Step2CampaignDetails({
  campaignData,
  onChange,
}: {
  campaignData: CampaignData;
  onChange: (data: CampaignData) => void;
}) {
  const goals = [
    { id: 'awareness', name: 'Awareness', icon: '👁️', description: 'Increase brand visibility' },
    { id: 'traffic', name: 'Traffic', icon: '🚗', description: 'Drive website visits' },
    { id: 'leads', name: 'Leads', icon: '🎯', description: 'Generate qualified leads' },
    { id: 'sales', name: 'Sales', icon: '💰', description: 'Boost conversions' },
    { id: 'retargeting', name: 'Retargeting', icon: '🔄', description: 'Re-engage visitors' },
    { id: 'app_promotion', name: 'App Promotion', icon: '📱', description: 'Increase app installs' },
  ];

  const kpiOptions = [
    { value: 'ROAS', label: 'ROAS (Return on Ad Spend)' },
    { value: 'CPA', label: 'CPA (Cost per Acquisition)' },
    { value: 'CPL', label: 'CPL (Cost per Lead)' },
    { value: 'CPC', label: 'CPC (Cost per Click)' },
    { value: 'CTR', label: 'CTR (Click-through Rate)' },
    { value: 'CPM', label: 'CPM (Cost per Mille)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Campaign Details</h3>
        <p className="text-gray-600">Set up your campaign information</p>
      </div>

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          value={campaignData.name}
          onChange={(e) =>
            onChange({ ...campaignData, name: e.target.value })
          }
          placeholder="e.g., Summer Product Launch 2025"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
        />
      </div>

      {/* Campaign Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Campaign Description
        </label>
        <textarea
          value={campaignData.description || ''}
          onChange={(e) =>
            onChange({ ...campaignData, description: e.target.value })
          }
          placeholder="Describe the purpose and goals of this campaign..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none"
        />
      </div>

      {/* Advertiser */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h4 className="font-bold text-gray-900">Advertiser Information</h4>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            type="text"
            value={campaignData.advertiser.business_name}
            onChange={(e) =>
              onChange({
                ...campaignData,
                advertiser: {
                  ...campaignData.advertiser,
                  business_name: e.target.value,
                },
              })
            }
            placeholder="e.g., Acme Corporation"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Website URL *
          </label>
          <input
            type="url"
            value={campaignData.advertiser.website_url}
            onChange={(e) =>
              onChange({
                ...campaignData,
                advertiser: {
                  ...campaignData.advertiser,
                  website_url: e.target.value,
                },
              })
            }
            placeholder="https://example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>
      </div>

      {/* Campaign Goal */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Campaign Goal *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {goals.map((goal) => {
            const isSelected = campaignData.campaign_goal === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() =>
                  onChange({ ...campaignData, campaign_goal: goal.id })
                }
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-gray-800 bg-gray-100'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-2xl mb-2">{goal.icon}</div>
                <div className="font-semibold text-gray-900 text-sm">
                  {goal.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {goal.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Performance Objective */}
      <div className="bg-gray-100 rounded-lg p-6 space-y-4">
        <h4 className="font-bold text-gray-900">Performance Objective</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Value *
            </label>
            <input
              type="number"
              step="0.01"
              value={campaignData.performance_objective.value || ''}
              onChange={(e) =>
                onChange({
                  ...campaignData,
                  performance_objective: {
                    ...campaignData.performance_objective,
                    value: e.target.value === '' ? 0 : Number(e.target.value),
                  },
                })
              }
              placeholder="e.g., 50"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              KPI Metric *
            </label>
            <select
              value={campaignData.performance_objective.kpi}
              onChange={(e) =>
                onChange({
                  ...campaignData,
                  performance_objective: {
                    ...campaignData.performance_objective,
                    kpi: e.target.value,
                  },
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            >
              <option value="">Select KPI</option>
              {kpiOptions.map((kpi) => (
                <option key={kpi.value} value={kpi.value}>
                  {kpi.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Strategies
function Step3Strategies({
  strategies,
  onChange,
}: {
  strategies: Strategy[];
  onChange: (strategies: Strategy[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState<Strategy>({
    name: '',
    budget_amount: 0,
    budget_type: 'daily',
    audience_control: {
      location: [],
      zip_codes: [],
      in_market_interests: [],
    },
  });

  const [locationInput, setLocationInput] = useState('');
  const [zipCodeInput, setZipCodeInput] = useState('');
  const [interestInput, setInterestInput] = useState('');

  const addStrategy = () => {
    if (editingIndex !== null) {
      const updated = [...strategies];
      updated[editingIndex] = currentStrategy;
      onChange(updated);
      setEditingIndex(null);
    } else {
      onChange([...strategies, currentStrategy]);
    }
    resetForm();
  };

  const editStrategy = (index: number) => {
    setCurrentStrategy(strategies[index]);
    setEditingIndex(index);
  };

  const deleteStrategy = (index: number) => {
    onChange(strategies.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCurrentStrategy({
      name: '',
      budget_amount: 0,
      budget_type: 'daily',
      audience_control: {
        location: [],
        zip_codes: [],
        in_market_interests: [],
      },
    });
    setLocationInput('');
    setZipCodeInput('');
    setInterestInput('');
  };

  const addLocation = () => {
    if (locationInput.trim()) {
      setCurrentStrategy({
        ...currentStrategy,
        audience_control: {
          ...currentStrategy.audience_control,
          location: [...currentStrategy.audience_control.location, locationInput.trim()],
        },
      });
      setLocationInput('');
    }
  };

  const addZipCode = () => {
    if (zipCodeInput.trim()) {
      setCurrentStrategy({
        ...currentStrategy,
        audience_control: {
          ...currentStrategy.audience_control,
          zip_codes: [...currentStrategy.audience_control.zip_codes, zipCodeInput.trim()],
        },
      });
      setZipCodeInput('');
    }
  };

  const addInterest = () => {
    if (interestInput.trim()) {
      setCurrentStrategy({
        ...currentStrategy,
        audience_control: {
          ...currentStrategy.audience_control,
          in_market_interests: [
            ...currentStrategy.audience_control.in_market_interests,
            interestInput.trim(),
          ],
        },
      });
      setInterestInput('');
    }
  };

  const removeLocation = (index: number) => {
    setCurrentStrategy({
      ...currentStrategy,
      audience_control: {
        ...currentStrategy.audience_control,
        location: currentStrategy.audience_control.location.filter((_, i) => i !== index),
      },
    });
  };

  const removeZipCode = (index: number) => {
    setCurrentStrategy({
      ...currentStrategy,
      audience_control: {
        ...currentStrategy.audience_control,
        zip_codes: currentStrategy.audience_control.zip_codes.filter((_, i) => i !== index),
      },
    });
  };

  const removeInterest = (index: number) => {
    setCurrentStrategy({
      ...currentStrategy,
      audience_control: {
        ...currentStrategy.audience_control,
        in_market_interests: currentStrategy.audience_control.in_market_interests.filter(
          (_, i) => i !== index
        ),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Strategies</h3>
        <p className="text-gray-600">Define your campaign strategies and audience targeting</p>
      </div>

      {/* Existing Strategies */}
      {strategies.length > 0 && (
        <div className="space-y-3">
          {strategies.map((strategy, index) => (
            <div
              key={index}
              className="p-4 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{strategy.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  ${Number(strategy.budget_amount).toFixed(2).replace(/\.00$/, '')} {strategy.budget_type} •{' '}
                  {strategy.audience_control.location.length} locations
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => editStrategy(index)}
                  className="px-3 py-1 text-sm bg-gray-200 text-black rounded hover:bg-gray-400"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteStrategy(index)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Strategy Form */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h4 className="font-bold text-gray-900">
          {editingIndex !== null ? 'Edit Strategy' : 'Add New Strategy'}
        </h4>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Strategy Name *
          </label>
          <input
            type="text"
            value={currentStrategy.name}
            onChange={(e) =>
              setCurrentStrategy({ ...currentStrategy, name: e.target.value })
            }
            placeholder="e.g., All Apps & Channels - TV - Entire US"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Budget Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={currentStrategy.budget_amount || ''}
              onChange={(e) =>
                setCurrentStrategy({
                  ...currentStrategy,
                  budget_amount: e.target.value === '' ? 0 : Number(e.target.value),
                })
              }
              placeholder="100"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Budget Type *
            </label>
            <select
              value={currentStrategy.budget_type}
              onChange={(e) =>
                setCurrentStrategy({
                  ...currentStrategy,
                  budget_type: e.target.value as 'daily' | 'weekly' | 'monthly',
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            >
              <option value="daily">Daily Budget</option>
              <option value="weekly">Weekly Budget</option>
              <option value="monthly">Monthly Budget</option>
            </select>
          </div>
        </div>

        {/* Audience Control */}
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h5 className="font-semibold text-gray-900">Audience Control</h5>

          {/* Locations */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Locations (Countries)
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                placeholder="e.g., United States"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
              <button
                onClick={addLocation}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentStrategy.audience_control.location.map((loc, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-200 text-purple-800 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{loc}</span>
                  <button
                    onClick={() => removeLocation(idx)}
                    className="text-gray-900 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Zip Codes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Zip Codes
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={zipCodeInput}
                onChange={(e) => setZipCodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addZipCode())}
                placeholder="e.g., 10001"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
              <button
                onClick={addZipCode}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentStrategy.audience_control.zip_codes.map((zip, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-200 text-blue-800 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{zip}</span>
                  <button
                    onClick={() => removeZipCode(idx)}
                    className="text-gray-900 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* In-Market & Interests */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              In-Market & Interests
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                placeholder="e.g., Technology, Sports"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
              <button
                onClick={addInterest}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentStrategy.audience_control.in_market_interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-200 text-gray-900 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{interest}</span>
                  <button
                    onClick={() => removeInterest(idx)}
                    className="text-gray-700 hover:text-gray-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={addStrategy}
            disabled={!currentStrategy.name || currentStrategy.budget_amount <= 0}
            className={`px-6 py-2 rounded-lg font-semibold ${
              currentStrategy.name && currentStrategy.budget_amount > 0
                ? 'bg-gray-900 text-white hover:bg-black'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {editingIndex !== null ? 'Update Strategy' : 'Add Strategy'}
          </button>
          {editingIndex !== null && (
            <button
              onClick={() => {
                setEditingIndex(null);
                resetForm();
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 4: Summary
function Step4Summary({ campaignData }: { campaignData: CampaignData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Campaign Summary</h3>
        <p className="text-gray-600">Review your campaign details before creating</p>
      </div>

      {/* Campaign Name */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-700 mb-2">Campaign Name</h4>
        <p className="text-xl font-bold text-gray-900">{campaignData.name}</p>
        {campaignData.description && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-sm font-semibold text-gray-600 mb-1">Description</h5>
            <p className="text-gray-700">{campaignData.description}</p>
          </div>
        )}
      </div>

      {/* Platform */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-700 mb-3">Platform</h4>
        <span className="px-4 py-2 bg-gray-200 text-purple-800 rounded-full font-semibold inline-block">
          {campaignData.platform}
        </span>
      </div>

      {/* Advertiser */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-700 mb-3">Advertiser</h4>
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-600">Business Name: </span>
            <span className="font-semibold text-gray-900">
              {campaignData.advertiser.business_name}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Website: </span>
            <a
              href={campaignData.advertiser.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:underline"
            >
              {campaignData.advertiser.website_url}
            </a>
          </div>
        </div>
      </div>

      {/* Campaign Goal */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-700 mb-2">Campaign Goal</h4>
        <p className="text-lg font-bold text-gray-900 capitalize">
          {campaignData.campaign_goal.replace('_', ' ')}
        </p>
      </div>

      {/* Performance Objective */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-700 mb-3">Performance Objective</h4>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">
            {campaignData.performance_objective.value}
          </span>
          <span className="text-lg text-gray-600">
            {campaignData.performance_objective.kpi}
          </span>
        </div>
      </div>

      {/* Strategies */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-700 mb-4">Strategies ({campaignData.strategies.length})</h4>
        <div className="space-y-4">
          {campaignData.strategies.map((strategy, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold text-gray-900 mb-2">{strategy.name}</div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  Budget: ${Number(strategy.budget_amount).toFixed(2).replace(/\.00$/, '')} {strategy.budget_type}
                </div>
                <div>
                  Locations: {strategy.audience_control.location.join(', ') || 'None'}
                </div>
                {strategy.audience_control.zip_codes.length > 0 && (
                  <div>Zip Codes: {strategy.audience_control.zip_codes.join(', ')}</div>
                )}
                {strategy.audience_control.in_market_interests.length > 0 && (
                  <div>
                    Interests: {strategy.audience_control.in_market_interests.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
