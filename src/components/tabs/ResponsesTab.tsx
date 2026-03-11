'use client';

import { Study } from '@/lib/types';
import { MessageSquare, Play, Clock, CheckCircle, XCircle } from 'lucide-react';

export function ResponsesTab({ study }: { study: Study }) {
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
                            <th>#</th>
                            <th>Participant</th>
                            <th>Status</th>
                            <th>Completed</th>
                            <th>Messages</th>
                            <th>Recording</th>
                        </tr>
                    </thead>
                    <tbody>
                        {study.responses.map((response, i) => (
                            <tr key={response.id}>
                                <td>
                                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                                </td>
                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {response.participantName}
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
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Transcript view for selected response */}
            {study.responses.length > 0 && (
                <div style={{ marginTop: 'var(--space-8)' }}>
                    <span className="guide-section-title">Latest Transcript</span>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {study.responses[0].transcript.map((entry, i) => (
                            <div key={i} className={`chat-message ${entry.role}`} style={{ maxWidth: '100%', alignSelf: entry.role === 'agent' ? 'flex-start' : 'flex-end' }}>
                                <div className="chat-bubble" style={{ maxWidth: '70%' }}>
                                    {entry.isFollowUp && <span className="caption" style={{ display: 'block', marginBottom: '2px' }}>Follow-up</span>}
                                    {entry.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
