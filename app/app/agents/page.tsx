'use client';

import Link from 'next/link';
import { Search, Video, BarChart3, ArrowRight } from 'lucide-react';

const agents = [
  {
    id: 'research',
    title: 'Market Research & Competitive Analysis',
    description: 'Discover trends, analyze competitors, and identify content patterns that drive engagement.',
    href: '/app/agents/research',
    icon: Search,
    capabilities: ['Instagram analysis', 'Competitor benchmarking', 'Financial data', 'Trend tracking', 'AI content analysis', 'Success patterns'],
  },
  {
    id: 'video',
    title: 'Video Generation',
    description: 'Generate concepts, storyboards with scene composition, character design, and AI video production.',
    href: '/app/agents/video',
    icon: Video,
    capabilities: ['Concept generation', 'Script writing', 'Storyboard scenes', 'Character design', 'AI image generation', 'Video production'],
  },
  {
    id: 'simulation',
    title: 'Pre-deploy Simulation',
    description: 'Test marketing content against AI consumer personas with predictive modeling and content ranking.',
    href: '/app/agents/simulation',
    icon: BarChart3,
    capabilities: ['Persona simulation', 'Predictive modeling', 'Content ranking', 'Multi-model evaluation', 'Engagement forecasting'],
  },
];

export default function AgentsPage() {
  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Agents</h1>
        <p className="text-muted-foreground">
          Specialized AI agents that power the DBLE content pipeline.
        </p>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={agent.href}
            className="block border border-border rounded-lg p-6 hover:shadow-sm transition-all group bg-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <agent.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h2 className="text-base font-medium mb-1">{agent.title}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">{cap}</span>
                    ))}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
