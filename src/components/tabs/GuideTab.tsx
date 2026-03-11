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
                        <span className="guide-question-text">{q.text}</span>
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
                            <span className="guide-question-text">{q.text}</span>
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
                        <span className="guide-question-text">{q.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
