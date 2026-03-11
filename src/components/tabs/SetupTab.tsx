'use client';

import { Study, RESEARCH_TYPES } from '@/lib/types';
import { Copy, Check, Target, Users, Mic, Video, Monitor, Hash } from 'lucide-react';
import { useState } from 'react';

const METHOD_LABELS = {
    'audio': { label: 'Audio Only', icon: Mic },
    'audio-video': { label: 'Audio + Video', icon: Video },
    'video-screenshare': { label: 'Video + Screen Share', icon: Monitor },
};

export function SetupTab({ study }: { study: Study }) {
    const [copied, setCopied] = useState(false);

    const interviewLink = typeof window !== 'undefined'
        ? `${window.location.origin}/interview/${study.id}`
        : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(interviewLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const MethodIcon = METHOD_LABELS[study.inputMethod]?.icon || Mic;

    return (
        <div style={{ maxWidth: '640px' }}>
            {/* Share Link */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <span className="guide-section-title">Interview Link</span>
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
            </div>
        </div>
    );
}
