'use client';

import { useState, useEffect } from 'react';
import { Study, AnalysisInsight } from '@/lib/types';
import { BarChart3, RefreshCw, Loader2, TrendingUp, Users, Clock, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const NEUTRAL_COLORS = ['#0a0a0a', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

export function AnalysisTab({ study }: { study: Study }) {
    const [insights, setInsights] = useState<AnalysisInsight[]>([]);
    const [topTakeaways, setTopTakeaways] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

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
        } catch {
            // handle error silently
        } finally {
            setIsLoading(false);
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
                <span className="guide-section-title">AI Insights</span>
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
                                                    <button className="btn btn-sm btn-ghost" style={{ fontSize: '11px', padding: '0 4px' }}>
                                                        ▶ {Math.floor(quote.videoTimestamp / 60)}:{String(Math.floor(quote.videoTimestamp % 60)).padStart(2, '0')}
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
        </div>
    );
}
