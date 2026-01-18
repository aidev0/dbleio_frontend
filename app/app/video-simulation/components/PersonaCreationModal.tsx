'use client';

import { useState, useEffect, useRef } from 'react';
import { Persona, Demographics } from '../types';
import { API_URL, getApiHeaders } from '../lib/api';

interface PersonaCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaign?: any;
  onPersonaCreated: () => void;
  editingPersona?: Persona | null;
}

// Demographic options
const DEMOGRAPHIC_OPTIONS = {
  age: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  gender: ['Male', 'Female'],
  race: ['Asian', 'Black/African American', 'Hispanic/Latino', 'White', 'Middle Eastern', 'Pacific Islander', 'Multiracial'],
  careers: ['CEO', 'Engineering', 'Finance and Accounting', 'Marketing', 'Military', 'Nurses', 'Physicians', 'Small Business Owners'],
  education: ['High School', 'Some College', 'College Degree', 'Graduate Degree'],
  country: ['United States', 'Canada', 'United Kingdom', 'Australia', 'China', 'India', 'Brazil', 'Mexico'],
  region: ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'Pacific Northwest', 'Western Europe', 'East Asia', 'South America', 'North America', 'LATAM'],
  locations: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'Miami', 'Washington'],
  income_level: ['Under $25k', '$25k-$50k', '$50k-$75k', '$75k-$100k', '$100k-$150k', '$150k-$200k', 'Over $200k'],
  household_count: ['1', '2', '3', '4', '5', '6+'],
  household_type: ['Owner', 'Renter', 'Apartment', 'Home', 'Condo', 'Townhouse'],
};

// Available demographic dimensions
const DEMOGRAPHIC_DIMENSIONS = [
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'race', label: 'Race/Ethnicity' },
  { key: 'careers', label: 'Career/Occupation' },
  { key: 'education', label: 'Education Level' },
  { key: 'country', label: 'Country' },
  { key: 'region', label: 'Region' },
  { key: 'locations', label: 'Specific Locations' },
  { key: 'income_level', label: 'Income Level' },
  { key: 'household_count', label: 'Household Size' },
  { key: 'household_type', label: 'Housing Type' },
];

export default function PersonaCreationModal({
  isOpen,
  onClose,
  campaignId,
  campaign,
  onPersonaCreated,
  editingPersona
}: PersonaCreationModalProps) {
  const isEditMode = !!editingPersona;
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [personaName, setPersonaName] = useState('');
  const [description, setDescription] = useState('');
  const [demographics, setDemographics] = useState<Demographics>({
    age: [],
    gender: [],
    locations: [],
    country: [],
    region: [],
    zip_codes: [],
    race: [],
    careers: [],
    education: [],
    income_level: [],
    household_count: [],
    household_type: [],
    custom_fields: {}
  });
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [aiNumPersonas, setAiNumPersonas] = useState(20);
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'google'>('anthropic');
  const [aiSelectedDimensions, setAiSelectedDimensions] = useState<string[]>(['age', 'gender', 'careers', 'locations']);
  const [aiDistributionDescription, setAiDistributionDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingPersona) {
      setPersonaName(editingPersona.name);
      setDescription(editingPersona.description || '');
      setDemographics({
        age: editingPersona.demographics.age || [],
        gender: editingPersona.demographics.gender || [],
        locations: editingPersona.demographics.locations || [],
        country: editingPersona.demographics.country || [],
        region: editingPersona.demographics.region || [],
        zip_codes: editingPersona.demographics.zip_codes || [],
        race: editingPersona.demographics.race || [],
        careers: editingPersona.demographics.careers || [],
        education: editingPersona.demographics.education || [],
        income_level: editingPersona.demographics.income_level || [],
        household_count: editingPersona.demographics.household_count || [],
        household_type: editingPersona.demographics.household_type || [],
        custom_fields: editingPersona.demographics.custom_fields || {}
      });
    } else {
      // Reset form when not editing
      setPersonaName('');
      setDescription('');
      setDemographics({
        age: [],
        gender: [],
        locations: [],
        country: [],
        region: [],
        zip_codes: [],
        race: [],
        careers: [],
        education: [],
        income_level: [],
        household_count: [],
        household_type: [],
        custom_fields: {}
      });
    }
  }, [editingPersona]);

  if (!isOpen) return null;

  const toggleDemographic = (field: keyof Demographics, value: string) => {
    if (field === 'custom_fields') return;

    setDemographics(prev => {
      const currentValues = prev[field] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      return { ...prev, [field]: newValues };
    });
  };

  const addCustomField = () => {
    if (!customFieldKey.trim()) return;

    setDemographics(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [customFieldKey]: customFieldValue ? [customFieldValue] : []
      }
    }));
    setCustomFieldKey('');
    setCustomFieldValue('');
  };

  const removeCustomField = (key: string) => {
    setDemographics(prev => {
      const newCustomFields = { ...prev.custom_fields };
      delete newCustomFields[key];
      return { ...prev, custom_fields: newCustomFields };
    });
  };

  const handleManualCreate = async () => {
    try {
      const url = isEditMode
        ? `${API_URL}/api/personas/${editingPersona!.id}`
        : `${API_URL}/api/personas`;

      const method = isEditMode ? 'PUT' : 'POST';

      const body = isEditMode
        ? {
            name: personaName,
            description,
            demographics
          }
        : {
            campaign_id: campaignId || null,
            name: personaName,
            description,
            demographics,
            ai_generated: false
          };

      const response = await fetch(url, {
        method,
        headers: getApiHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} persona`);

      onPersonaCreated();
      resetForm();
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} persona:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} persona`);
    }
  };

  const pollTaskStatus = async (taskIdToPoll: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskIdToPoll}`, { headers: getApiHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch task status');
      }

      const taskStatus = await response.json();

      // Update progress and message
      setGenerationProgress(taskStatus.progress);
      setGenerationMessage(taskStatus.message || 'Generating personas...');

      // Check if completed
      if (taskStatus.status === 'completed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setGenerationProgress(100);
        const count = taskStatus.result?.count || aiNumPersonas;
        alert(`Successfully generated ${count} personas!`);

        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationMessage('');
        setTaskId(null);
        onPersonaCreated();
        resetForm();
        onClose();
      } else if (taskStatus.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        alert(`Failed to generate personas: ${taskStatus.error || 'Unknown error'}`);
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationMessage('');
        setTaskId(null);
      }
    } catch (error) {
      console.error('Error polling task status:', error);
    }
  };

  const handleAIGenerate = async () => {
    if (aiSelectedDimensions.length === 0) {
      alert('Please select at least one demographic dimension');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Starting persona generation...');

    try {
      const response = await fetch(`${API_URL}/api/personas/generate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          campaign_id: campaignId || null,
          num_personas: aiNumPersonas,
          model_provider: aiProvider,
          selected_dimensions: aiSelectedDimensions,
          distribution_description: aiDistributionDescription || null
        })
      });

      if (!response.ok) throw new Error('Failed to generate personas');

      const result = await response.json();

      // Start polling for task status
      if (result.task_id) {
        setTaskId(result.task_id);

        // Start polling every 2 seconds
        pollIntervalRef.current = setInterval(() => {
          pollTaskStatus(result.task_id);
        }, 2000);

        // Poll immediately once
        pollTaskStatus(result.task_id);
      } else {
        // Old response format without task_id - just show success
        alert(`Successfully generated personas!`);
        setIsGenerating(false);
        onPersonaCreated();
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Error generating personas:', error);
      alert('Failed to generate personas');
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationMessage('');
    }
  };

  const resetForm = () => {
    // Clean up poll interval if active
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setPersonaName('');
    setDescription('');
    setDemographics({
      age: [],
      gender: [],
      locations: [],
      country: [],
      region: [],
      zip_codes: [],
      race: [],
      careers: [],
      education: [],
      income_level: [],
      household_count: [],
      household_type: [],
      custom_fields: {}
    });
    setCustomFieldKey('');
    setCustomFieldValue('');
    setMode('manual');
    setAiSelectedDimensions(['age', 'gender', 'careers', 'locations']);
    setAiDistributionDescription('');
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationMessage('');
    setTaskId(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Persona' : 'Create Personas'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Mode Toggle - Hidden in edit mode */}
          {!isEditMode && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  mode === 'manual'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Manual Creation
              </button>
              <button
                onClick={() => setMode('ai')}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  mode === 'ai'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                AI Generation
              </button>
            </div>
          )}

          {/* Manual Mode - Always show when editing */}
          {(mode === 'manual' || isEditMode) && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Persona Name *
                </label>
                <input
                  type="text"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                  placeholder="e.g., Tech-Savvy Millennial"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                  placeholder="Describe this persona's characteristics, lifestyle, and preferences..."
                />
              </div>

              {/* Demographics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Demographics</h3>

                {/* Age */}
                <DemographicSection
                  title="Age"
                  options={DEMOGRAPHIC_OPTIONS.age}
                  selected={demographics.age || []}
                  onToggle={(value) => toggleDemographic('age', value)}
                />

                {/* Gender */}
                <DemographicSection
                  title="Gender"
                  options={DEMOGRAPHIC_OPTIONS.gender}
                  selected={demographics.gender || []}
                  onToggle={(value) => toggleDemographic('gender', value)}
                />

                {/* Race */}
                <DemographicSection
                  title="Race"
                  options={DEMOGRAPHIC_OPTIONS.race}
                  selected={demographics.race || []}
                  onToggle={(value) => toggleDemographic('race', value)}
                />

                {/* Careers */}
                <DemographicSection
                  title="Careers"
                  options={DEMOGRAPHIC_OPTIONS.careers}
                  selected={demographics.careers || []}
                  onToggle={(value) => toggleDemographic('careers', value)}
                />

                {/* Education */}
                <DemographicSection
                  title="Education"
                  options={DEMOGRAPHIC_OPTIONS.education}
                  selected={demographics.education || []}
                  onToggle={(value) => toggleDemographic('education', value)}
                />

                {/* Country */}
                <DemographicSection
                  title="Country"
                  options={DEMOGRAPHIC_OPTIONS.country}
                  selected={demographics.country || []}
                  onToggle={(value) => toggleDemographic('country', value)}
                />

                {/* Region */}
                <DemographicSection
                  title="Region"
                  options={DEMOGRAPHIC_OPTIONS.region}
                  selected={demographics.region || []}
                  onToggle={(value) => toggleDemographic('region', value)}
                />

                {/* Locations */}
                <DemographicSection
                  title="Locations"
                  options={DEMOGRAPHIC_OPTIONS.locations}
                  selected={demographics.locations || []}
                  onToggle={(value) => toggleDemographic('locations', value)}
                />

                {/* Income Level */}
                <DemographicSection
                  title="Income Level"
                  options={DEMOGRAPHIC_OPTIONS.income_level}
                  selected={demographics.income_level || []}
                  onToggle={(value) => toggleDemographic('income_level', value)}
                />

                {/* Household Count */}
                <DemographicSection
                  title="Household Count"
                  options={DEMOGRAPHIC_OPTIONS.household_count}
                  selected={demographics.household_count || []}
                  onToggle={(value) => toggleDemographic('household_count', value)}
                />

                {/* Household Type */}
                <DemographicSection
                  title="Household Type"
                  options={DEMOGRAPHIC_OPTIONS.household_type}
                  selected={demographics.household_type || []}
                  onToggle={(value) => toggleDemographic('household_type', value)}
                />
              </div>

              {/* Custom Fields */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields</h3>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={customFieldKey}
                    onChange={(e) => setCustomFieldKey(e.target.value)}
                    placeholder="Field name (e.g., Income Level)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={customFieldValue}
                    onChange={(e) => setCustomFieldValue(e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                  />
                  <button
                    onClick={addCustomField}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-semibold"
                  >
                    Add
                  </button>
                </div>

                {demographics.custom_fields && Object.entries(demographics.custom_fields).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(demographics.custom_fields || {}).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold text-gray-700">{key}:</span>
                        <span className="text-gray-600">{values.join(', ')}</span>
                        <button
                          onClick={() => removeCustomField(key)}
                          className="ml-auto text-red-600 hover:text-red-800 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualCreate}
                  disabled={!personaName.trim()}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isEditMode ? 'Update Persona' : 'Create Persona'}
                </button>
              </div>
            </div>
          )}

          {/* AI Mode */}
          {mode === 'ai' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Persona Generation Instructions
                </label>
                <textarea
                  value={aiDistributionDescription}
                  onChange={(e) => setAiDistributionDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg bg-gray-100 text-blue-900 focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder-gray-900"
                  placeholder="Generate diverse, realistic personas automatically using AI. The system will create personas with varied demographics based on your campaign details."
                />
                <p className="text-sm text-gray-600 mt-2">
                  Customize the instructions for how personas should be generated and distributed (optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Personas
                </label>
                <input
                  type="number"
                  value={aiNumPersonas}
                  onChange={(e) => setAiNumPersonas(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Demographic Dimensions to Generate
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Select which demographic attributes the AI should generate for each persona
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DEMOGRAPHIC_DIMENSIONS.map(dimension => {
                    const isSelected = aiSelectedDimensions.includes(dimension.key);
                    return (
                      <button
                        key={dimension.key}
                        onClick={() => {
                          if (isSelected) {
                            setAiSelectedDimensions(prev => prev.filter(d => d !== dimension.key));
                          } else {
                            setAiSelectedDimensions(prev => [...prev, dimension.key]);
                          }
                        }}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-gray-900 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="flex-shrink-0">
                          {isSelected ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1 text-left">{dimension.label}</span>
                      </button>
                    );
                  })}
                </div>
                {aiSelectedDimensions.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">⚠️ Please select at least one demographic dimension</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  AI Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setAiProvider('openai')}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      aiProvider === 'openai'
                        ? 'bg-gray-700 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    onClick={() => setAiProvider('anthropic')}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      aiProvider === 'anthropic'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Anthropic
                  </button>
                  <button
                    onClick={() => setAiProvider('google')}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      aiProvider === 'google'
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Google
                  </button>
                </div>
              </div>

              {/* Generation Progress */}
              {isGenerating && (
                <div className="space-y-4 py-4">
                  <div className="flex flex-col items-center justify-center">
                    {/* Rotating Spinner */}
                    <div className="relative w-16 h-16 mb-4">
                      <svg className="animate-spin w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ color: '#4f46e5' }}></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ color: '#4f46e5' }}></path>
                      </svg>
                    </div>

                    {/* Status Message */}
                    <p className="text-lg font-semibold text-black text-center mb-2">
                      {generationMessage || 'Generating personas with AI...'}
                    </p>

                    <p className="text-xs text-gray-800 mt-2">
                      Please wait while AI generates {aiNumPersonas} personas...
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || aiSelectedDimensions.length === 0}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    `Generate ${aiNumPersonas} Personas`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for demographic sections
function DemographicSection({
  title,
  options,
  selected,
  onToggle
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selected.includes(option)
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {selected.includes(option) && (
              <span className="mr-1">+</span>
            )}
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
