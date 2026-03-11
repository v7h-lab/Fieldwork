'use client';

import { useStudies } from '@/lib/StudyContext';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, FileText, Compass } from 'lucide-react';
import { RESEARCH_TYPES } from '@/lib/types';

export function Sidebar() {
    const { studies, activeStudyId, setActiveStudyId } = useStudies();
    const router = useRouter();
    const pathname = usePathname();

    const handleNewStudy = () => {
        setActiveStudyId(null);
        router.push('/');
    };

    const handleStudyClick = (id: string) => {
        setActiveStudyId(id);
        router.push(`/study/${id}`);
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <button className="sidebar-brand" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
                    <Compass size={20} strokeWidth={1.5} />
                    <span className="sidebar-brand-text">Fieldwork</span>
                </button>
            </div>

            <button className="sidebar-new-btn" onClick={handleNewStudy}>
                <Plus size={14} strokeWidth={1.5} />
                New Study
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
                        >
                            <FileText size={14} strokeWidth={1.5} />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
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
        </aside>
    );
}
