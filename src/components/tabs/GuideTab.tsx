'use client';

import { Study } from '@/lib/types';

export function GuideTab({ study }: { study: Study }) {
    const { guide } = study;

    return (
        <div style={{ maxWidth: '640px' }}>
            {/* Pre-screen */}
            <div className="guide-section">
                <div className="guide-section-header">
                    <span className="guide-section-title">Pre-screening Questions</span>
                    <span className="badge">{guide.preScreen.length}</span>
                </div>
                {guide.preScreen.map((q, i) => (
                    <div key={q.id} className="guide-question">
                        <span className="guide-question-index">{String(i + 1).padStart(2, '0')}</span>
                        <div style={{ flex: 1 }}>
                            <div className="guide-question-text">{q.text}</div>
                            {(q.mediaUrls || []).length > 0 && (
                                <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {q.mediaUrls!.map((url, uidx) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img key={uidx} src={url} alt="Question Media" style={{ maxWidth: '120px', borderRadius: '4px', border: '1px solid var(--neutral-200)' }} />
                                    ))}
                                </div>
                            )}
                            {q.type && q.type !== 'open' && (q.options || []).length > 0 && (
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {q.options!.map((opt, oidx) => (
                                        <div key={oidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--neutral-600)' }}>
                                            <div style={{
                                                width: '12px', height: '12px', border: '1px solid var(--neutral-400)',
                                                borderRadius: q.type === 'binary-choice' ? '50%' : '2px'
                                            }} />
                                            <span style={{ fontSize: '11px', color: 'var(--neutral-400)', marginRight: '4px' }}>
                                                {q.type === 'binary-choice' ? '(one)' : '(many)'}
                                            </span>
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Questions */}
            <div className="guide-section">
                <div className="guide-section-header">
                    <span className="guide-section-title">Main Interview Questions</span>
                    <span className="badge">{guide.mainQuestions.length}</span>
                </div>
                {guide.mainQuestions.map((q, i) => (
                    <div key={q.id}>
                        <div className="guide-question">
                            <span className="guide-question-index">{String(i + 1).padStart(2, '0')}</span>
                            <div style={{ flex: 1 }}>
                                <div className="guide-question-text">{q.text}</div>
                                {(q.mediaUrls || []).length > 0 && (
                                    <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {q.mediaUrls!.map((url, uidx) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={uidx} src={url} alt="Question Media" style={{ maxWidth: '120px', borderRadius: '4px', border: '1px solid var(--neutral-200)' }} />
                                        ))}
                                    </div>
                                )}
                                {q.type && q.type !== 'open' && (q.options || []).length > 0 && (
                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {q.options!.map((opt, oidx) => (
                                            <div key={oidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--neutral-600)' }}>
                                                <div style={{
                                                    width: '12px', height: '12px', border: '1px solid var(--neutral-400)',
                                                    borderRadius: q.type === 'binary-choice' ? '50%' : '2px'
                                                }} />
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {q.followUps.map((fu, fi) => (
                            <div key={fi} className="guide-followup">
                                ↳ {fu}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Exit Questions */}
            <div className="guide-section">
                <div className="guide-section-header">
                    <span className="guide-section-title">Exit Questions</span>
                    <span className="badge">{guide.exitQuestions.length}</span>
                </div>
                {guide.exitQuestions.map((q, i) => (
                    <div key={q.id} className="guide-question">
                        <span className="guide-question-index">{String(i + 1).padStart(2, '0')}</span>
                        <div style={{ flex: 1 }}>
                            <div className="guide-question-text">{q.text}</div>
                            {(q.mediaUrls || []).length > 0 && (
                                <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {q.mediaUrls!.map((url, uidx) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img key={uidx} src={url} alt="Question Media" style={{ maxWidth: '120px', borderRadius: '4px', border: '1px solid var(--neutral-200)' }} />
                                    ))}
                                </div>
                            )}
                            {q.type && q.type !== 'open' && (q.options || []).length > 0 && (
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {q.options!.map((opt, oidx) => (
                                        <div key={oidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--neutral-600)' }}>
                                            <div style={{
                                                width: '12px', height: '12px', border: '1px solid var(--neutral-400)',
                                                borderRadius: q.type === 'binary-choice' ? '50%' : '2px'
                                            }} />
                                            <span style={{ fontSize: '11px', color: 'var(--neutral-400)', marginRight: '4px' }}>
                                                {q.type === 'binary-choice' ? '(one)' : '(many)'}
                                            </span>
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
