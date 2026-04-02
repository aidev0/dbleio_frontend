'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../../video-simulation/lib/api';
import { ArrowLeft, User as UserIcon, Image as ImageIcon, Play, ChevronRight, ChevronDown, Film } from 'lucide-react';
import Link from 'next/link';

export default function VideoAgentPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const res = await apiGet('/api/agents/brands');
      if (res.ok) {
        const all = await res.json();
        const filtered = all.filter((b: any) => b.has_storyboard && b.name.toLowerCase() !== 'dble');
        // Note: dble brand filtered out above
        setBrands(filtered);
        if (filtered[0]) loadBrand(filtered[0].id);
      }
      setLoading(false);
    })();
  }, []);

  const loadBrand = async (id: string) => {
    setSelectedBrand(id);
    setLoadingData(true);
    setCollapsed(new Set());
    const res = await apiGet(`/api/agents/video/${id}`);
    if (res.ok) setData(await res.json());
    setLoadingData(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;

  return (
    <div className="p-8">
      <Link href="/app/agents" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Agents
      </Link>
      <h1 className="text-xl font-semibold mb-1">Video Generation</h1>
      <p className="text-sm text-muted-foreground mb-6">Concept, characters, storyboard, and generated videos per content piece</p>

      <div className="flex gap-2 mb-6 border-b">
        {brands.map((b) => (
          <button key={b.id} onClick={() => loadBrand(b.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${selectedBrand === b.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >{b.name}</button>
        ))}
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-20"><div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>
      ) : !data ? null : (
        <div className="space-y-8">
          {data.content_pieces?.map((piece: any, pi: number) => {
            const concept = piece.concept;
            const sb = piece.storyboard;
            const videos = piece.videos || [];
            const isCollapsed = collapsed.has(piece.content_id);
            const chars = sb?.characters || [];
            const scenes = sb?.scenes || [];
            const sceneVids = videos.filter((v: any) => v.type === 'scene');
            const stitchedVids = videos.filter((v: any) => v.type === 'stitched');
            const title = concept?.title || sb?.concept_title || sb?.title || `Content ${pi + 1}`;
            const totalDuration = scenes.reduce((s: number, sc: any) => s + (parseInt(String(sc.duration_hint || '0').replace('s', '')) || 0), 0);

            return (
              <div key={piece.content_id} className="rounded-lg border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border cursor-pointer"
                  onClick={() => setCollapsed(prev => { const n = new Set(prev); if (n.has(piece.content_id)) n.delete(piece.content_id); else n.add(piece.content_id); return n; })}>
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-sm font-medium flex-1">{title}</span>
                  <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                    {chars.length > 0 && <span>{chars.length} chars</span>}
                    {scenes.length > 0 && <span>{scenes.length} scenes</span>}
                    {totalDuration > 0 && <span>{totalDuration}s</span>}
                    {sceneVids.length > 0 && <span>{sceneVids.length} videos</span>}
                    {stitchedVids.length > 0 && <span>{stitchedVids.length} stitched</span>}
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-4 space-y-6">

                    {/* ── CONCEPT ── */}
                    {concept && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Concept</div>
                        <div className="border rounded-lg p-4 space-y-2">
                          <div className="text-sm font-medium">{concept.title}</div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {concept.duration && <span className="bg-secondary px-1.5 py-0.5 rounded">{concept.duration}</span>}
                            {concept.tone && <span className="bg-secondary px-1.5 py-0.5 rounded">{concept.tone}</span>}
                            {concept.content_type && <span className="bg-secondary px-1.5 py-0.5 rounded">{concept.content_type}</span>}
                          </div>
                          {concept.hook && (
                            <div>
                              <div className="font-mono text-[8px] text-muted-foreground/50 uppercase mb-0.5">Hook</div>
                              <div className="text-xs italic text-foreground/80">{concept.hook}</div>
                            </div>
                          )}
                          {concept.script && (Array.isArray(concept.script) ? concept.script : [concept.script]).length > 0 && (
                            <div>
                              <div className="font-mono text-[8px] text-muted-foreground/50 uppercase mb-0.5">Script</div>
                              <div className="text-xs text-foreground/80 space-y-1 bg-muted/30 p-3 rounded">
                                {(Array.isArray(concept.script) ? concept.script : [concept.script]).map((line: string, li: number) => (
                                  <p key={li}>{line}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {concept.audio_cues && (
                            <div>
                              <div className="font-mono text-[8px] text-muted-foreground/50 uppercase mb-0.5">Audio</div>
                              <div className="text-xs text-muted-foreground">{concept.audio_cues}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── CHARACTERS ── */}
                    {chars.length > 0 && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Characters</div>
                        <div className="flex gap-3 flex-wrap">
                          {chars.map((ch: any, ci: number) => (
                            <div key={ci} className="w-[200px] rounded-lg border border-border overflow-hidden bg-muted/20">
                              <div className="relative aspect-[3/4] bg-muted">
                                {ch.image_url ? (
                                  <img src={ch.image_url} alt={ch.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center"><UserIcon className="h-5 w-5 text-muted-foreground/20" /></div>
                                )}
                              </div>
                              <div className="p-2 space-y-1">
                                <div className="text-[10px] font-medium">{ch.name}</div>
                                <div className="text-[8px] text-muted-foreground leading-relaxed line-clamp-3">{ch.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── STORYBOARD SCENES + ALIGNED VIDEO ROWS ── */}
                    {scenes.length > 0 && (() => {
                      const gridCols = scenes.length <= 2 ? `repeat(${scenes.length}, minmax(0, 280px))` : `repeat(${scenes.length}, 1fr)`;
                      // Group scene videos by model (task batch)
                      const models = [...new Set(sceneVids.map((v: any) => v.model))];

                      return (
                        <div className="space-y-3">
                          {sb?.storyline && (
                            <div className="text-sm text-foreground/80 leading-relaxed border border-border rounded px-3 py-2" style={{ whiteSpace: 'pre-wrap' }}>{sb.storyline}</div>
                          )}

                          {/* Scenes row */}
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Scenes</div>
                            <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: gridCols }}>
                              {scenes.map((scene: any, si: number) => (
                                <div key={si} className="rounded border border-border overflow-hidden flex flex-col">
                                  <div className="aspect-[9/16] bg-muted relative shrink-0">
                                    {scene.image_url ? (
                                      <img src={scene.image_url} alt={scene.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full items-center justify-center"><ImageIcon className="h-3 w-3 text-muted-foreground/20" /></div>
                                    )}
                                    <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                                      <span className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white">{scene.shot_type}</span>
                                      <span className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white">{scene.duration_hint}</span>
                                    </div>
                                  </div>
                                  <div className="px-1.5 py-1 space-y-0.5 flex-1">
                                    <div className="flex items-center gap-1"><span className="font-mono text-[7px] text-muted-foreground/50">{scene.scene_number}.</span><span className="text-[8px] font-medium truncate">{scene.title}</span></div>
                                    <p className="text-[7px] text-muted-foreground leading-relaxed line-clamp-2">{scene.description}</p>
                                    {scene.dialog && <p className="text-[7px] text-muted-foreground italic line-clamp-1">{scene.dialog}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* One video row per model — aligned to same grid */}
                          {models.map((model) => {
                            const modelVids = sceneVids.filter((v: any) => v.model === model);
                            return (
                              <div key={model}>
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">{model}</div>
                                <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: gridCols }}>
                                  {scenes.map((scene: any) => {
                                    const vid = modelVids.find((v: any) => v.scene_number === scene.scene_number);
                                    return (
                                      <div key={scene.scene_number} className="rounded border border-border overflow-hidden">
                                        {vid?.video_url ? (
                                          <div className="aspect-[9/16] bg-black">
                                            <video src={vid.video_url} className="h-full w-full object-contain" controls playsInline />
                                          </div>
                                        ) : (
                                          <div className="aspect-[9/16] bg-muted/50 flex items-center justify-center">
                                            <span className="font-mono text-[8px] text-muted-foreground/40">—</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* ── STITCHED VIDEOS ── */}
                    {stitchedVids.length > 0 && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Stitched Videos ({stitchedVids.length})</div>
                        <div className="grid grid-cols-2 gap-4">
                          {stitchedVids.map((v: any, vi: number) => (
                            <div key={vi} className="rounded-lg border border-border overflow-hidden bg-muted/20">
                              <div className="relative aspect-[9/16] bg-black">
                                {v.video_url ? (
                                  <video src={v.video_url} controls playsInline className="h-full w-full object-contain" />
                                ) : (
                                  <div className="flex h-full items-center justify-center"><Play className="h-5 w-5 text-white/30" /></div>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="text-xs font-medium">Stitched — {v.model}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {(!data.content_pieces || data.content_pieces.length === 0) && (
            <div className="text-center py-16 text-muted-foreground/50"><p className="text-xs">No content pieces found</p></div>
          )}
        </div>
      )}
    </div>
  );
}
