'use client';

import { useState, useEffect, useRef } from 'react';
import { useStudies } from '@/lib/StudyContext';
import { Study, AnalysisInsight } from '@/lib/types';
import { BarChart3, RefreshCw, Loader2, TrendingUp, Users, Clock, MessageSquare, Play, X, Download, Printer, Smile, Meh, Frown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
    const avgDuration = completedResponses.length > 0
        ? completedResponses.reduce((sum, r) => sum + (r.videoDuration || 0), 0) / completedResponses.length
        : 0;

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

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

            if (data.insights || data.topTakeaways || data.participantAnalysis) {
                const updatedResponses = study.responses.map(r => {
                    const analysis = data.participantAnalysis?.find((pa: any) => pa.participantId === r.id);
                    if (analysis) {
                        return { ...r, sentiment: analysis.sentiment, sentimentScore: analysis.sentimentScore };
                    }
                    return r;
                });

                updateStudy(study.id, {
                    responses: updatedResponses,
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

    // MCQ Aggregation Logic
    const mcqChartsData = study.guide.mainQuestions
        .filter(q => q.type === 'multiple-choice' || q.type === 'binary-choice')
        .map(q => {
            const counts: Record<string, number> = {};
            // Initialize with all options
            q.options?.forEach(opt => counts[opt] = 0);

            // Count responses
            completedResponses.forEach(r => {
                const answer = r.transcript.find(t => t.role === 'participant' && t.questionIndex !== undefined && study.guide.mainQuestions[t.questionIndex]?.id === q.id);
                if (answer) {
                    const matchedOpt = q.options?.find(opt => answer.text.toLowerCase().includes(opt.toLowerCase()));
                    if (matchedOpt) counts[matchedOpt]++;
                }
            });

            return {
                questionId: q.id,
                questionText: q.text,
                data: Object.entries(counts).map(([name, value]) => ({ name, value }))
            };
        });

    // Sentiment Data
    const sentimentCounts = {
        Positive: completedResponses.filter(r => r.sentiment === 'Positive').length,
        Neutral: completedResponses.filter(r => (r.sentiment === 'Neutral' || !r.sentiment)).length,
        Negative: completedResponses.filter(r => r.sentiment === 'Negative').length,
    };

    const sentimentChartData = [
        { name: 'Positive', value: sentimentCounts.Positive, color: '#22c55e' },
        { name: 'Neutral', value: sentimentCounts.Neutral, color: '#94a3b8' },
        { name: 'Negative', value: sentimentCounts.Negative, color: '#ef4444' },
    ].filter(d => d.value > 0);

    const statusData = [
        { name: 'Completed', value: completedResponses.length },
        { name: 'Screened Out', value: study.responses.length - completedResponses.length },
    ].filter(d => d.value > 0);

    const downloadCSV = () => {
        const headers = ['Participant', 'Date', 'Duration', 'Sentiment', 'Transcript'];
        const rows = study.responses.map(r => [
            r.participantName,
            new Date(r.completedAt).toLocaleDateString(),
            formatDuration(r.videoDuration || 0),
            r.sentiment || 'N/A',
            r.transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join(' | ')
        ]);

        const csvContent = [headers, ...rows].map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${study.name.replace(/\s+/g, '_')}_responses.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

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
                    <div className="stat-label"><Clock size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Avg. Duration</div>
                    <div className="stat-value">{formatDuration(avgDuration)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label"><BarChart3 size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Insights</div>
                    <div className="stat-value">{insights.length}</div>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
                {/* Sentiment Chart */}
                <div className="card">
                    <span className="guide-section-title">Sentiment Distribution</span>
                    <div style={{ marginTop: 'var(--space-4)', height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sentimentChartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    strokeWidth={0}
                                >
                                    {sentimentChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
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
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Completion Rate Chart */}
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
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* MCQ Charts */}
                {mcqChartsData.map((chart) => (
                    <div key={chart.questionId} className="card">
                        <span className="guide-section-title" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chart.questionText}
                        </span>
                        <div style={{ marginTop: 'var(--space-4)', height: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chart.data} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fontSize: 10, fill: 'var(--neutral-500)' }}
                                        width={80}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--white)',
                                            border: '1px solid var(--neutral-200)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Bar dataKey="value" fill="var(--black)" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Analysis */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="guide-section-title">AI Insights</span>
                    {study.analysis?.updatedAt && !isLoading && (
                        <span className="caption">Last updated {new Date(study.analysis.updatedAt).toLocaleString()}</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={downloadCSV}>
                        <Download size={12} strokeWidth={1.5} />
                        Export Data
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={handlePrint}>
                        <Printer size={12} strokeWidth={1.5} />
                        Print Report
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={runAnalysis} disabled={isLoading}>
                        {isLoading ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: 'spin 0.6s linear infinite' }} /> : <RefreshCw size={12} strokeWidth={1.5} />}
                        {hasAnalyzed ? 'Refresh' : 'Generate'} Analysis
                    </button>
                </div>
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
