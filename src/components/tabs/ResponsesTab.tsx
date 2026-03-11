'use client';

import React, { useState } from 'react';
import { Study, TranscriptEntry } from '@/lib/types';
import { MessageSquare, Play, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export function ResponsesTab({ study }: { study: Study }) {
    const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
    if (study.responses.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <MessageSquare size={40} strokeWidth={1.5} />
                </div>
                <h3>No responses yet</h3>
                <p>Share the interview link to start collecting responses from participants.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="caption">{study.responses.length} response{study.responses.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>#</th>
                            <th>Participant</th>
                            <th>Status</th>
                            <th>Completed</th>
                            <th>Messages</th>
                            <th>Recording</th>
                        </tr>
                    </thead>
                    <tbody>
                        {study.responses.map((response, i) => {
                            const isExpanded = expandedResponseId === response.id;

                            // Group transcript into Q&A pairs
                            const pairs: { q: TranscriptEntry, a: TranscriptEntry[] }[] = [];
                            let currentQ: TranscriptEntry | null = null;
                            let currentA: TranscriptEntry[] = [];
                            for (const entry of response.transcript) {
                                if (entry.role === 'agent') {
                                    if (currentQ) pairs.push({ q: currentQ, a: currentA });
                                    currentQ = entry;
                                    currentA = [];
                                } else {
                                    currentA.push(entry);
                                }
                            }
                            if (currentQ) pairs.push({ q: currentQ, a: currentA });

                            return (
                                <React.Fragment key={response.id}>
                                    <tr
                                        onClick={() => setExpandedResponseId(isExpanded ? null : response.id)}
                                        style={{ cursor: 'pointer', background: isExpanded ? 'var(--neutral-50)' : 'transparent', transition: 'background 0.2s ease' }}
                                        className="hover-bg-neutral-50"
                                    >
                                        <td style={{ color: 'var(--neutral-400)' }}>
                                            {isExpanded ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
                                        </td>
                                        <td>
                                            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                                        </td>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {response.participantName || 'Anonymous'}
                                        </td>
                                        <td>
                                            {response.screenedOut ? (
                                                <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <XCircle size={10} strokeWidth={1.5} />
                                                    Screened Out
                                                </span>
                                            ) : (
                                                <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle size={10} strokeWidth={1.5} />
                                                    Completed
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="caption">
                                                <Clock size={10} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                {new Date(response.completedAt).toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="mono">{response.transcript.length}</span>
                                        </td>
                                        <td>
                                            {response.videoPath ? (
                                                <button className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Play size={10} strokeWidth={1.5} />
                                                    Play
                                                </button>
                                            ) : (
                                                <span className="caption">—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '0', borderBottom: 'none' }}>
                                                <div style={{ background: 'var(--neutral-50)', padding: 'var(--space-6) var(--space-8)', borderTop: '1px solid var(--neutral-200)', borderBottom: '1px solid var(--neutral-200)' }}>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>Transcript</h3>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                                        {pairs.map((pair, idx) => (
                                                            <div key={idx} style={{ padding: 'var(--space-4)', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                                                                <div style={{ color: 'var(--neutral-500)', marginBottom: '12px', fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>
                                                                    <span style={{ marginRight: '6px', fontWeight: 600 }}>Q:</span>
                                                                    {pair.q.text}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {pair.a.length > 0 ? pair.a.map((ans, aIdx) => (
                                                                        <div key={aIdx} style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.6, fontWeight: 400, paddingLeft: '16px', borderLeft: '2px solid var(--primary)' }}>
                                                                            {ans.text}
                                                                        </div>
                                                                    )) : (
                                                                        <div style={{ color: 'var(--neutral-400)', fontSize: '14px', fontStyle: 'italic', paddingLeft: '16px', borderLeft: '2px solid var(--neutral-200)' }}>
                                                                            No response given.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {pairs.length === 0 && (
                                                            <div className="caption" style={{ fontStyle: 'italic' }}>Transcript is empty.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
