'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudies } from '@/lib/StudyContext';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SetupTab } from '@/components/tabs/SetupTab';
import { GuideTab } from '@/components/tabs/GuideTab';
import { ResponsesTab } from '@/components/tabs/ResponsesTab';
import { AnalysisTab } from '@/components/tabs/AnalysisTab';

const TABS = [
    { value: 'setup', label: 'Setup' },
    { value: 'guide', label: 'Guide' },
    { value: 'responses', label: 'Responses' },
    { value: 'analysis', label: 'Analysis' },
];

export default function StudyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { getStudy, setActiveStudyId } = useStudies();
    const [tab, setTab] = useState('setup');

    const studyId = params.id as string;
    const study = getStudy(studyId);

    useEffect(() => {
        if (studyId) setActiveStudyId(studyId);
    }, [studyId, setActiveStudyId]);

    if (!study) {
        return (
            <div className="empty-state">
                <h3>Study not found</h3>
                <p>This study may have been deleted.</p>
                <button className="btn btn-secondary" onClick={() => router.push('/')} style={{ marginTop: 'var(--space-4)' }}>
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                <div>
                    <h1>{study.name}</h1>
                    <div className="caption" style={{ marginTop: 'var(--space-1)' }}>
                        Created {new Date(study.createdAt).toLocaleDateString()} · {study.responses.length} response{study.responses.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className={`status-dot ${study.status}`} />
                    <span className="badge">{study.status}</span>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
                <SegmentedControl options={TABS} value={tab} onChange={setTab} />
            </div>

            {tab === 'setup' && <SetupTab study={study} />}
            {tab === 'guide' && <GuideTab study={study} />}
            {tab === 'responses' && <ResponsesTab study={study} />}
            {tab === 'analysis' && <AnalysisTab study={study} />}
        </div>
    );
}
