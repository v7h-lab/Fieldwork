'use client';

import { useState } from 'react';
import { useStudies } from '@/lib/StudyContext';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, FileText, Compass, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { RESEARCH_TYPES } from '@/lib/types';

export function Sidebar() {
    const { studies, activeStudyId, setActiveStudyId } = useStudies();
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleNewStudy = () => {
        setActiveStudyId(null);
        router.push('/');
    };

    const handleStudyClick = (id: string) => {
        setActiveStudyId(id);
        router.push(`/study/${id}`);
    };

    return (
        <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <button className="sidebar-brand" onClick={() => router.push('/')} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                    <Compass size={20} strokeWidth={1.5} />
                    <span className="sidebar-brand-text">Fieldwork</span>
                </button>
            </div>

            <button className="sidebar-new-btn" onClick={handleNewStudy} title="New Study">
                <Plus size={16} strokeWidth={1.5} />
                <span className="sidebar-new-btn-text">New Study</span>
            </button>

            <div className="sidebar-section">
                <div className="sidebar-section-label">Studies</div>
                {studies.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--neutral-400)' }}>
                        No studies yet
                    </div>
                ) : (
                    studies.map(study => (
                        <button
                            key={study.id}
                            className={`sidebar-item ${activeStudyId === study.id || pathname === `/study/${study.id}` ? 'active' : ''}`}
                            onClick={() => handleStudyClick(study.id)}
                            title={study.name}
                        >
                            <FileText size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                            <div className="sidebar-item-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{study.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--neutral-400)' }}>
                                    {RESEARCH_TYPES[study.type]?.label}
                                </div>
                            </div>
                            <span className={`status-dot ${study.status}`} />
                        </button>
                    ))
                )}
            </div>

            <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
                <span className="sidebar-toggle-text">Collapse</span>
            </button>
        </aside >
    );
}
