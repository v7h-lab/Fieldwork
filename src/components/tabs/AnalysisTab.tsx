'use client';

import { useState, useEffect, useRef } from 'react';
import { useStudies } from '@/lib/StudyContext';
import { Study, AnalysisInsight } from '@/lib/types';
import { BarChart3, RefreshCw, Loader2, TrendingUp, Users, Clock, MessageSquare, Play, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const NEUTRAL_COLORS = ['#0a0a0a', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

export function AnalysisTab({ study }: { study: Study }) {
    const { updateStudy } = useStudies();
    const [insights, setInsights] = useState<AnalysisInsight[]>(study.analysis?.insights || []);
    const [topTakeaways, setTopTakeaways] = useState<string[]>(study.analysis?.topTakeaways || []);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(!!study.analysis);

    // Video modal state
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const completedResponses = study.responses.filter(r => !r.screenedOut);
    const totalMessages = study.responses.reduce((sum, r) => sum + r.transcript.length, 0);

    const runAnalysis = async () => {
        if (study.responses.length === 0) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studyType: study.type,
                    goals: study.goals,
                    responses: study.responses,
                }),
            });
            const data = await res.json();
            if (data.insights) setInsights(data.insights);
            if (data.topTakeaways) setTopTakeaways(data.topTakeaways);
            setHasAnalyzed(true);

            if (data.insights || data.topTakeaways) {
                updateStudy(study.id, {
                    analysis: {
                        insights: data.insights || [],
                        topTakeaways: data.topTakeaways || [],
                        updatedAt: new Date().toISOString(),
                    }
                });
            }
        } catch {
            // handle error silently
        } finally {
            setIsLoading(false);
        }
    };

    const playQuoteBack = async (participantName: string, timestamp: number) => {
        const response = study.responses.find(r => r.participantName === participantName);
        if (!response || !response.videoPath) return;

        setVideoModalOpen(true);
        setIsVideoLoading(true);
        setActiveVideoUrl(null);
        setActiveTimestamp(timestamp);

        try {
            const res = await fetch('/api/playback-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: response.videoPath }),
            });
            if (res.ok) {
                const { publicUrl } = await res.json();
                setActiveVideoUrl(publicUrl);
            }
        } catch (err) {
            console.error('Failed to load video URL', err);
        } finally {
            setIsVideoLoading(false);
        }
    };

    if (study.responses.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <BarChart3 size={40} strokeWidth={1.5} />
                </div>
                <h3>No data to analyze</h3>
                <p>Analysis will become available once participants complete interviews.</p>
            </div>
        );
    }

    // Chart data
    const responseData = study.responses.map((r, i) => ({
        name: r.participantName || `P${i + 1}`,
        messages: r.transcript.filter(t => t.role === 'participant').length,
    }));

    const statusData = [
        { name: 'Completed', value: completedResponses.length },
        { name: 'Screened Out', value: study.responses.length - completedResponses.length },
    ].filter(d => d.value > 0);

    return (
        <div>
            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label"><Users size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Participants</div>
                    <div className="stat-value">{study.responses.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label"><TrendingUp size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Completion</div>
                    <div className="stat-value">{study.responses.length > 0 ? Math.round((completedResponses.length / study.responses.length) * 100) : 0}%</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label"><MessageSquare size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Messages</div>
                    <div className="stat-value">{totalMessages}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label"><Clock size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Insights</div>
                    <div className="stat-value">{insights.length}</div>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
                <div className="card">
                    <span className="guide-section-title">Response Volume</span>
                    <div style={{ marginTop: 'var(--space-4)', height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={responseData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--white)',
                                        border: '1px solid var(--neutral-200)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                    }}
                                />
                                <Bar dataKey="messages" fill="var(--black)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <span className="guide-section-title">Completion Rate</span>
                    <div style={{ marginTop: 'var(--space-4)', height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0}>
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={NEUTRAL_COLORS[i]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--white)',
                                        border: '1px solid var(--neutral-200)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Analysis */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="guide-section-title">AI Insights</span>
                    {study.analysis?.updatedAt && !isLoading && (
                        <span className="caption">Last updated {new Date(study.analysis.updatedAt).toLocaleString()}</span>
                    )}
                </div>
                <button className="btn btn-sm btn-secondary" onClick={runAnalysis} disabled={isLoading}>
                    {isLoading ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: 'spin 0.6s linear infinite' }} /> : <RefreshCw size={12} strokeWidth={1.5} />}
                    {hasAnalyzed ? 'Refresh' : 'Generate'} Analysis
                </button>
            </div>

            {isLoading && (
                <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
                    <div className="spinner" style={{ marginBottom: 'var(--space-3)' }} />
                    <p>Analyzing responses…</p>
                </div>
            )}

            {!isLoading && hasAnalyzed && (
                <div>
                    {/* Takeaways */}
                    {topTakeaways.length > 0 && (
                        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                            <span className="guide-section-title" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>Key Takeaways</span>
                            {topTakeaways.map((t, i) => (
                                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', fontSize: '14px' }}>
                                    <span className="mono" style={{ marginTop: '2px' }}>{String(i + 1).padStart(2, '0')}</span>
                                    <span style={{ color: 'var(--text-body)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Insights with quotes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {insights.map((insight) => (
                            <div key={insight.id} className="card">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                    <h3>{insight.theme}</h3>
                                    <span className="badge">{Math.round(insight.confidence * 100)}% confidence</span>
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.7, marginBottom: 'var(--space-4)' }}>
                                    {insight.summary}
                                </p>
                                {insight.quotes?.map((quote, qi) => (
                                    <div key={qi} className="quote-card">
                                        <div className="quote-text">&ldquo;{quote.text}&rdquo;</div>
                                        <div className="quote-meta">
                                            <span>{quote.participantName}</span>
                                            {quote.videoTimestamp !== undefined && quote.videoTimestamp !== null && (
                                                <>
                                                    <span>·</span>
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        style={{ fontSize: '11px', padding: '0 4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={() => playQuoteBack(quote.participantName, quote.videoTimestamp!)}
                                                    >
                                                        <Play size={10} strokeWidth={2} />
                                                        {Math.floor(quote.videoTimestamp / 60)}:{String(Math.floor(quote.videoTimestamp % 60)).padStart(2, '0')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Video Modal Overlay */}
            {videoModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setVideoModalOpen(false)}>
                    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '800px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--neutral-200)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 500 }}>Quote Playback</h3>
                            <button className="btn-icon" onClick={() => setVideoModalOpen(false)} style={{ background: 'transparent' }}>
                                <X size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative' }}>
                            {isVideoLoading ? (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="spinner" style={{ animation: 'spin 0.6s linear infinite' }} />
                                </div>
                            ) : activeVideoUrl ? (
                                <video
                                    ref={videoRef}
                                    src={activeVideoUrl}
                                    controls
                                    autoPlay
                                    onLoadedMetadata={() => {
                                        if (videoRef.current && activeTimestamp !== null) {
                                            videoRef.current.currentTime = Math.max(0, activeTimestamp - 1); // slight buffer
                                        }
                                    }}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                                    Failed to load video recording.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
