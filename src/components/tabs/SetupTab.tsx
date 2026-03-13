'use client';

import { Study, RESEARCH_TYPES, SUPPORTED_LANGUAGES } from '@/lib/types';
import { Copy, Check, Target, Users, Mic, Video, Monitor, Hash, Globe, Zap, Pause, Play, Trash2, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useStudies } from '@/lib/StudyContext';

const METHOD_LABELS = {
    'audio': { label: 'Audio Only', icon: Mic },
    'audio-video': { label: 'Audio + Video', icon: Video },
    'video-screenshare': { label: 'Video + Screen Share', icon: Monitor },
};

export function SetupTab({ study }: { study: Study }) {
    const [copied, setCopied] = useState(false);
    const [selectedLang, setSelectedLang] = useState('en-US');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeletingConfirmed, setIsDeletingConfirmed] = useState(false);
    const { updateStudy, deleteStudy } = useStudies();
    const isPaused = study.status === 'paused';

    const interviewLink = typeof window !== 'undefined'
        ? `${window.location.origin}/interview/${study.id}?lang=${selectedLang}`
        : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(interviewLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const MethodIcon = METHOD_LABELS[study.inputMethod]?.icon || Mic;

    const togglePause = () => {
        if (!isPaused) {
            if (confirm("Pausing this study will temporarily disable the interview link. Existing responses will still be viewable. Proceed?")) {
                updateStudy(study.id, { status: 'paused' });
            }
        } else {
            updateStudy(study.id, { status: 'active' });
        }
    };

    const handleDeleteClick = () => {
        setIsDeleting(true);
    };

    const confirmDelete = () => {
        if (isDeletingConfirmed) {
            deleteStudy(study.id);
            // The parent component should handle redirect if currently viewing this study
        }
    };

    return (
        <div style={{ maxWidth: '640px', position: 'relative' }}>
            {/* Confirmation Modal for Delete */}
            {isDeleting && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--error-color, #e11d48)', marginBottom: 'var(--space-4)' }}>
                            <AlertTriangle size={24} strokeWidth={1.5} />
                            <h3 style={{ fontSize: '18px', fontWeight: 500 }}>Delete Study</h3>
                        </div>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>
                            This action cannot be undone. All responses and insights for <strong>{study.name}</strong> will be permanently deleted.
                        </p>

                        {!isDeletingConfirmed ? (
                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsDeleting(false)}>Cancel</button>
                                <button className="btn" style={{ flex: 1, backgroundColor: 'var(--error-color, #e11d48)', color: 'white' }} onClick={() => setIsDeletingConfirmed(true)}>I understand</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <p style={{ fontSize: '13px', color: 'var(--neutral-500)', textAlign: 'center' }}>Are you absolutely sure?</p>
                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setIsDeleting(false); setIsDeletingConfirmed(false); }}>Keep Study</button>
                                    <button className="btn" style={{ flex: 1, backgroundColor: 'var(--text-primary)', color: 'white' }} onClick={confirmDelete}>Yes, Delete it</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                <button
                    className={`btn btn-sm ${isPaused ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={togglePause}
                    style={{ gap: 'var(--space-2)' }}
                >
                    {isPaused ? <Play size={14} strokeWidth={1.5} /> : <Pause size={14} strokeWidth={1.5} />}
                    {isPaused ? 'Resume Study' : 'Pause Study'}
                </button>
                <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleDeleteClick}
                    style={{ gap: 'var(--space-2)', color: 'var(--neutral-400)' }}
                >
                    <Trash2 size={14} strokeWidth={1.5} />
                    Delete
                </button>
            </div>

            {/* Share Link */}
            {!isPaused ? (
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                        <span className="guide-section-title">Interview Link</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={14} strokeWidth={1.5} style={{ color: 'var(--neutral-500)' }} />
                            <select
                                className="input"
                                style={{ padding: '4px 8px', fontSize: '13px', width: 'auto', minWidth: '150px' }}
                                value={selectedLang}
                                onChange={(e) => setSelectedLang(e.target.value)}
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="share-box">
                        <input readOnly value={interviewLink} />
                        <button className="btn btn-sm btn-secondary" onClick={handleCopy}>
                            {copied ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <div className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
                        Share this link with participants to start interviews
                    </div>
                </div>
            ) : (
                <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--neutral-50)', border: '1px dashed var(--neutral-300)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4)', textAlign: 'center' }}>
                        <Pause size={24} strokeWidth={1.5} style={{ color: 'var(--neutral-400)', marginBottom: 'var(--space-2)' }} />
                        <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Study is Paused</h4>
                        <p style={{ fontSize: '13px', color: 'var(--neutral-500)', marginTop: '4px' }}>
                            The interview link is currently disabled. Resume the study to accept new responses.
                        </p>
                    </div>
                </div>
            )}

            {/* Study Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                    <span className="guide-section-title">Research Type</span>
                    <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="badge">{RESEARCH_TYPES[study.type]?.label}</span>
                    </div>
                </div>

                <hr className="divider" />

                <div>
                    <span className="guide-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Target size={12} strokeWidth={1.5} /> Research Goals
                    </span>
                    <p style={{ marginTop: 'var(--space-2)', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-body)' }}>
                        {study.goals}
                    </p>
                </div>

                <hr className="divider" />

                <div>
                    <span className="guide-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Users size={12} strokeWidth={1.5} /> Target Audience
                    </span>
                    <p style={{ marginTop: 'var(--space-2)', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-body)' }}>
                        {study.audience}
                    </p>
                </div>

                <hr className="divider" />

                <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                    <div>
                        <span className="guide-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <MethodIcon size={12} strokeWidth={1.5} /> Interview Method
                        </span>
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <span className="badge">{METHOD_LABELS[study.inputMethod]?.label}</span>
                        </div>
                    </div>
                    <div>
                        <span className="guide-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Hash size={12} strokeWidth={1.5} /> Max Follow-ups
                        </span>
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <span className="badge">{study.maxFollowUps} per question</span>
                        </div>
                    </div>
                </div>

                <hr className="divider" />

                <div>
                    <span className="guide-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Zap size={12} strokeWidth={1.5} /> Smart Question Skipping
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={study.smartSkipping}
                            onChange={(e) => updateStudy(study.id, { smartSkipping: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--text-body)' }}>
                            Allow AI to smartly skip questions if previous responses already cover them.
                        </span>
                    </label>
                    <div className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
                        Ensures the interview feels natural and avoids repetitive questions.
                    </div>
                </div>
            </div>
        </div>
    );
}
