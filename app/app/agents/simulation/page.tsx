'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../../video-simulation/lib/api';
import { ArrowLeft, BarChart3, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Play } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

const providerLabel: Record<string, string> = { google: 'Gemini', anthropic: 'Claude', openai: 'GPT' };

function CircleScore({ score, size = 48 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={size * 0.06} className="text-border" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size * 0.06} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.23} fontWeight="700" fontFamily="monospace">{score}</text>
    </svg>
  );
}

export default function SimulationAgentPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [activeSim, setActiveSim] = useState(0);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiGet('/api/agents/simulations/brands');
      if (res.ok) {
        const all = await res.json();
        setBrands(all);
        const first = all.find((b: any) => b.simulation_count > 0);
        if (first) loadSlug(first.slug);
      }
      setLoading(false);
    })();
  }, []);

  const loadSlug = async (slug: string) => {
    setSelectedSlug(slug);
    setLoadingData(true);
    setActiveSim(0);
    setExpandedPersona(null);
    const res = await apiGet(`/api/agents/simulations/${slug}`);
    if (res.ok) setData(await res.json());
    setLoadingData(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;

  const currentSim = data?.sim_type === 'campaign' ? data?.simulations?.[activeSim] : null;

  return (
    <div className="p-8">
      <Link href="/app/agents" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Agents
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Pre-deploy Simulation</h1>
      <p className="text-sm text-muted-foreground mb-6">AI persona evaluations, predictive modeling, and content ranking</p>

      {/* Brand tabs */}
      <div className="flex gap-2 mb-8 border-b">
        {brands.map((b) => (
          <button key={b.slug} onClick={() => loadSlug(b.slug)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${selectedSlug === b.slug ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {b.name}
            {b.simulation_count > 0 && <span className="ml-1.5 text-[10px] bg-secondary px-1.5 py-0.5 rounded">{b.simulation_count}</span>}
          </button>
        ))}
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-20"><div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>
      ) : !data ? null : data.sim_type === 'campaign' ? (
        /* ─── CAMPAIGN-BASED (HPD) ─── */
        <div>
          {data.simulations.length === 0 ? (
            <div className="text-center py-20"><BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No simulation results yet</p></div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm font-medium">{data.campaign?.name}</p>
                {data.campaign?.description && <p className="text-xs text-muted-foreground mt-0.5">{data.campaign.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{data.total_personas} personas &middot; {data.total_videos} videos &middot; {data.simulations.length} models</p>
              </div>

              {/* Videos under test */}
              {data.videos && Object.keys(data.videos).length > 0 && (
                <div className="mb-6">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Videos Under Test ({Object.keys(data.videos).length})</div>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.values(data.videos).map((v: any) => (
                      <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted/20">
                        {v.url ? (
                          <video src={v.url} controls playsInline muted className="w-full aspect-video bg-black object-contain" />
                        ) : (
                          <div className="w-full aspect-video bg-muted flex items-center justify-center"><Play className="h-5 w-5 text-muted-foreground/30" /></div>
                        )}
                        <div className="p-2">
                          <div className="text-xs font-medium truncate">{v.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model tabs — includes "All Combined" */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => { setActiveSim(-1); setExpandedPersona(null); }}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${activeSim === -1 ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground/30'}`}
                >All Combined</button>
                {data.simulations.map((sim: any, i: number) => (
                  <button key={sim.id} onClick={() => { setActiveSim(i); setExpandedPersona(null); }}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${activeSim === i ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground/30'}`}
                  >{providerLabel[sim.model_provider] || sim.model_provider} &middot; {sim.model_name}</button>
                ))}
              </div>

              {/* ALL COMBINED view */}
              {activeSim === -1 && (() => {
                // Merge vote counts across all simulations
                const allVoteCounts: Record<string, number> = {};
                let totalEvals = 0;
                for (const sim of data.simulations) {
                  for (const ev of sim.evaluations) {
                    const pref = ev.most_preferred_video;
                    allVoteCounts[pref] = (allVoteCounts[pref] || 0) + 1;
                    totalEvals++;
                  }
                }
                const sortedVotes = Object.entries(allVoteCounts).sort(([,a],[,b]) => (b as number) - (a as number));
                const videoMapping = data.simulations[0]?.video_mapping || {};

                return (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-5">
                      <h3 className="text-sm font-medium mb-4">Combined preference across {data.simulations.length} models ({totalEvals} total votes)</h3>
                      <div className="space-y-3">
                        {sortedVotes.map(([vn, vc], i) => (
                          <div key={vn} className="flex items-center gap-3">
                            <div className="w-40 shrink-0">
                              <p className="text-xs font-medium truncate">{videoMapping[vn]?.title || `Video ${vn}`}</p>
                              <p className="text-[10px] text-muted-foreground">#{vn}</p>
                            </div>
                            <div className="flex-1 h-7 bg-secondary rounded overflow-hidden">
                              <div className={`h-full rounded transition-all ${i === 0 ? 'bg-foreground' : 'bg-foreground/40'}`} style={{ width: `${Math.round(((vc as number) / totalEvals) * 100)}%` }} />
                            </div>
                            <div className="w-20 text-right">
                              <span className="text-sm font-medium tabular-nums">{Math.round(((vc as number) / totalEvals) * 100)}%</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({vc as number})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Per-model breakdown side by side */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${data.simulations.length}, 1fr)` }}>
                      {data.simulations.map((sim: any) => {
                        const winner = sim.vote_summary[0];
                        return (
                          <div key={sim.id} className="border rounded-lg p-4">
                            <div className="font-mono text-[10px] font-semibold mb-1">{providerLabel[sim.model_provider] || sim.model_provider} &middot; {sim.model_name}</div>
                            <p className="text-[10px] text-muted-foreground mb-3">{sim.total_personas} personas</p>
                            <div className="space-y-2">
                              {sim.vote_summary.slice(0, 5).map((v: any, i: number) => (
                                <div key={v.video_number} className="flex items-center gap-2">
                                  <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
                                    <div className={`h-full rounded ${i === 0 ? 'bg-foreground' : 'bg-foreground/40'}`} style={{ width: `${v.percentage}%` }} />
                                  </div>
                                  <span className="text-[10px] font-medium tabular-nums w-10 text-right">{v.percentage}%</span>
                                  <span className="text-[9px] text-muted-foreground truncate w-24">#{v.video_number} {v.video_info?.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {currentSim && (
                <div className="space-y-6">
                  {/* Vote summary */}
                  <div className="border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4">Content preference ({currentSim.total_personas} personas)</h3>
                    <div className="space-y-3">
                      {currentSim.vote_summary.map((v: any, i: number) => (
                        <div key={v.video_number} className="flex items-center gap-3">
                          <div className="w-40 shrink-0">
                            <p className="text-xs font-medium truncate">{v.video_info?.title || `Video ${v.video_number}`}</p>
                            <p className="text-[10px] text-muted-foreground">#{v.video_number}</p>
                          </div>
                          <div className="flex-1 h-7 bg-secondary rounded overflow-hidden">
                            <div className={`h-full rounded transition-all ${i === 0 ? 'bg-foreground' : 'bg-foreground/40'}`} style={{ width: `${v.percentage}%` }} />
                          </div>
                          <div className="w-20 text-right">
                            <span className="text-sm font-medium tabular-nums">{v.percentage}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({v.votes})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual evaluations */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Individual evaluations ({currentSim.evaluations.length})</h3>
                    <div className="border rounded-lg divide-y">
                      {currentSim.evaluations.map((ev: any) => (
                        <div key={ev.persona_id}>
                          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => setExpandedPersona(expandedPersona === ev.persona_id ? null : ev.persona_id)}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[10px] font-medium">{ev.persona_name?.charAt(0)?.toUpperCase() || 'P'}</div>
                              <p className="text-sm font-medium truncate">{ev.persona_name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Preferred #{ev.most_preferred_video}</span>
                              <span className="text-xs bg-secondary px-1.5 py-0.5 rounded tabular-nums">{ev.confidence_score}%</span>
                              {expandedPersona === ev.persona_id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                          </div>
                          {expandedPersona === ev.persona_id && (
                            <div className="px-4 pb-4 space-y-3">
                              {ev.reasoning && <div className="bg-secondary/50 rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1 font-medium">Reasoning</p><p className="text-xs">{ev.reasoning}</p></div>}
                              {ev.preference_ranking?.length > 0 && (
                                <div><p className="text-xs text-muted-foreground mb-1">Ranking</p>
                                  <div className="flex items-center gap-1 text-xs">{ev.preference_ranking.map((r: string, i: number) => (
                                    <span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-muted-foreground">&gt;</span>}<span className={`px-1.5 py-0.5 rounded ${i === 0 ? 'bg-foreground text-background' : 'bg-secondary'}`}>#{r}</span></span>
                                  ))}</div>
                                </div>
                              )}
                              {ev.video_opinions && Object.keys(ev.video_opinions).length > 0 && (
                                <div className="space-y-1.5"><p className="text-xs text-muted-foreground font-medium">Per-video opinions</p>
                                  {Object.entries(ev.video_opinions).map(([num, opinion]: [string, any]) => (
                                    <div key={num} className="text-xs bg-secondary/30 px-3 py-2 rounded"><span className="font-medium">#{num} ({currentSim.video_mapping[num]?.title || `Video ${num}`}): </span><span className="text-muted-foreground">{opinion}</span></div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ─── WORKFLOW-BASED (Stitch Fix) ─── */
        <div className="space-y-8">
          <div className="mb-2">
            <p className="text-sm font-medium">{data.workflow_title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Persona scoring, predictive modeling, and content ranking</p>
          </div>

          {/* Rankings */}
          {data.rankings?.length > 0 && (
            <section>
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-4">Content Ranking</div>
              {data.rank_weights && <p className="text-xs text-muted-foreground mb-3">Weights: {data.rank_weights.simulation_weight}% simulation + {data.rank_weights.prediction_weight}% prediction</p>}
              <div className="border rounded-lg divide-y">
                {data.rankings.map((r: any) => (
                  <div key={r.rank} className="flex items-center gap-4 px-4 py-4">
                    <CircleScore score={r.composite_score} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.video_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm shrink-0">
                      <div className="text-center"><p className="text-xs text-muted-foreground">Sim</p><p className="font-medium">{r.simulation_score}</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground">Pred</p><p className="font-medium">{r.prediction_score}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Persona Simulation — grouped by video_id, video on left, scores on right */}
          {data.persona_results?.length > 0 && (() => {
            // Group persona results by video_id
            const videoIds = [...new Set(data.persona_results.map((r: any) => r.video_id || 'all'))];
            return (
              <section className="space-y-6">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Persona Simulation</div>
                  {data.sim_config && (
                    <p className="text-xs text-muted-foreground">
                      Model: {data.sim_config.model_name}
                      {data.sim_config.genders && <> &middot; {data.sim_config.genders.join(', ')}</>}
                      {data.sim_config.ages && <> &middot; {data.sim_config.ages.join(', ')}</>}
                    </p>
                  )}
                </div>
                {videoIds.map((vidId: string) => {
                  const vidResults = data.persona_results.filter((r: any) => (r.video_id || 'all') === vidId);
                  const vidTitle = vidResults[0]?.video_title || 'All Content';
                  const avgScore = Math.round(vidResults.reduce((s: number, r: any) => s + r.score, 0) / vidResults.length);
                  const stitchedVid = data.stitched_videos?.find((v: any) => v.id === vidId || v.id?.startsWith(vidId) || vidId?.startsWith(v.id));
                  return (
                    <div key={vidId}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-[10px] font-semibold">{vidTitle}</span>
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">avg {avgScore}</span>
                      </div>
                      <div className="grid gap-4" style={{ gridTemplateColumns: stitchedVid ? '1fr 2fr' : '1fr' }}>
                        {stitchedVid && (
                          <div className="rounded-lg overflow-hidden bg-black sticky top-4" style={{ maxHeight: '60vh' }}>
                            <video src={stitchedVid.video_url} className="w-full h-full object-contain" controls playsInline />
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          {[...vidResults].sort((a: any, b: any) => b.score - a.score).map((r: any, i: number) => {
                            const scoreColor = r.score >= 75 ? 'border-l-green-500' : r.score >= 50 ? 'border-l-yellow-500' : r.score >= 25 ? 'border-l-orange-500' : 'border-l-red-500';
                            return (
                              <div key={i} className={`rounded-lg border border-l-[3px] ${scoreColor} px-4 py-2.5 flex items-center border-border`}>
                                <div className="grid items-center gap-4 w-full" style={{ gridTemplateColumns: 'auto auto 1fr' }}>
                                  <CircleScore score={r.score} />
                                  <div className="font-mono text-sm font-semibold whitespace-nowrap">{r.gender}, {r.age}</div>
                                  <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-2">{r.reasoning}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })()}

          {/* Predictions */}
          {data.predictions?.length > 0 && (
            <section>
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-4">Predictive Modeling</div>
              <div className="space-y-4">
                {data.predictions.map((p: any, i: number) => {
                  const vid = data.stitched_videos?.find((v: any) => v.id === p.video_id || v.id?.startsWith(p.video_id) || p.video_id?.startsWith(v.id));
                  return (
                    <div key={i} className="rounded-lg border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                        <span className="font-mono text-[10px] font-semibold">{p.video_title}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[8px]">confidence {p.confidence}%</span>
                      </div>
                      <div className="grid gap-4 p-4" style={{ gridTemplateColumns: vid?.video_url ? '1fr 2fr' : '1fr' }}>
                        {vid?.video_url && (
                          <div className="rounded-lg overflow-hidden bg-black">
                            <video src={vid.video_url} className="w-full h-full object-contain" controls playsInline style={{ maxHeight: '300px' }} />
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="rounded-lg border border-border p-3 text-center"><div className="text-lg font-bold font-mono">{fmt(p.expected_views || 0)}</div><div className="text-[10px] text-muted-foreground">Views</div></div>
                            <div className="rounded-lg border border-border p-3 text-center"><div className="text-lg font-bold font-mono">{fmt(p.expected_likes || 0)}</div><div className="text-[10px] text-muted-foreground">Likes</div></div>
                            <div className="rounded-lg border border-border p-3 text-center"><div className="text-lg font-bold font-mono">{fmt(p.expected_comments || 0)}</div><div className="text-[10px] text-muted-foreground">Comments</div></div>
                            <div className="rounded-lg border border-border p-3 text-center"><div className="text-lg font-bold font-mono">{p.engagement_rate}%</div><div className="text-[10px] text-muted-foreground">Engagement</div></div>
                          </div>
                          {p.reasoning && <p className="text-xs text-muted-foreground">{p.reasoning}</p>}
                          {p.strengths?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Strengths</p>
                              <div className="flex flex-wrap gap-1.5">{p.strengths.map((s: string, j: number) => (
                                <span key={j} className="text-[11px] bg-secondary px-2 py-0.5 rounded">{s}</span>
                              ))}</div>
                            </div>
                          )}
                          {p.risks?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risks</p>
                              <div className="flex flex-wrap gap-1.5">{p.risks.map((r: string, j: number) => (
                                <span key={j} className="text-[11px] bg-secondary px-2 py-0.5 rounded">{r}</span>
                              ))}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {data.persona_results?.length === 0 && data.predictions?.length === 0 && data.rankings?.length === 0 && (
            <div className="text-center py-20"><BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No simulation data yet for {data.brand_name}</p></div>
          )}
        </div>
      )}
    </div>
  );
}
