'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../../video-simulation/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Import the EXACT components from content-generator
import {
  CompetitiveAnalysisChart,
  TopPostsComparison,
  AIAnalyzedPostsSection,
  ExtractedIdeasSection,
  FinancialCard,
  BrandUrlCard,
} from '../../content-generator/components/ResearchStagePanel';

interface Brand {
  id: string;
  name: string;
  has_research: boolean;
}

export default function ResearchAgentPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [research, setResearch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResearch, setLoadingResearch] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiGet('/api/agents/brands');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((b: Brand) => b.has_research);
        setBrands(filtered);
        if (filtered[0]) loadBrand(filtered[0].id);
      }
      setLoading(false);
    })();
  }, []);

  const loadBrand = async (id: string) => {
    setSelectedBrand(id);
    setLoadingResearch(true);
    const res = await apiGet(`/api/agents/research/${id}`);
    if (res.ok) setResearch(await res.json());
    setLoadingResearch(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;

  const brandIg = research?.brand_instagram;
  const competitors = research?.competitor_instagram || {};
  const firstCompetitor = Object.values(competitors)[0] as any;

  return (
    <div className="p-8">
      <Link href="/app/agents" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Agents
      </Link>
      <h1 className="text-xl font-semibold mb-1">Market Research & Competitive Analysis</h1>
      <p className="text-sm text-muted-foreground mb-6">Instagram analytics, competitor benchmarking, trend analysis, and financial intelligence</p>

      {/* Brand tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {brands.map((b) => (
          <button key={b.id} onClick={() => loadBrand(b.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${selectedBrand === b.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >{b.name}</button>
        ))}
      </div>

      {loadingResearch ? (
        <div className="flex items-center justify-center py-20"><div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>
      ) : !research || !brandIg ? null : (
        <div className="space-y-6">
          {/* Competitive Analysis Chart — exact same component */}
          {firstCompetitor && (
            <CompetitiveAnalysisChart
              brandUsername={brandIg.username}
              competitorUsername={firstCompetitor.username}
              brandFollowers={brandIg.followers}
              competitorFollowers={firstCompetitor.followers}
            />
          )}

          {/* Top Posts Comparison — exact same component */}
          {firstCompetitor && (
            <TopPostsComparison
              brandUsername={brandIg.username}
              competitorUsername={firstCompetitor.username}
            />
          )}

          {/* AI Analyzed Posts — exact same component */}
          {firstCompetitor && (
            <AIAnalyzedPostsSection
              brandUsername={brandIg.username}
              competitorUsername={firstCompetitor.username}
            />
          )}

          {/* Extracted Ideas — exact same component */}
          {firstCompetitor && (
            <ExtractedIdeasSection
              brandUsername={brandIg.username}
              competitorUsername={firstCompetitor.username}
            />
          )}

          {/* Financial Data */}
          {research.financial && Object.keys(research.financial).length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium">Financial Intelligence</div>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(research.financial).map(([key, data]: [string, any]) => (
                  <div key={key} className="border rounded-lg p-3">
                    <FinancialCard data={data} name={key} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brand URL Analysis */}
          {research.brand_url_analysis && Object.keys(research.brand_url_analysis).length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium">Brand Analysis</div>
              <BrandUrlCard data={research.brand_url_analysis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
