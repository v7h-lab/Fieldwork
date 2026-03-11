'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudies } from '@/lib/StudyContext';
import { ResearchType, InputMethod, RESEARCH_TYPES, Study, ResearchGuide } from '@/lib/types';
import { VoiceInput } from '@/components/VoiceInput';
import { Check, ArrowRight, ArrowLeft, Loader2, Mic, Video, Monitor, Pencil } from 'lucide-react';

const STEPS = ['Goals', 'Audience', 'Method', 'Review'];

const INPUT_METHODS: { value: InputMethod; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'audio', label: 'Audio Only', desc: 'Voice conversation — no video', icon: <Mic size={18} strokeWidth={1.5} /> },
    { value: 'audio-video', label: 'Audio + Video', desc: 'Face-to-face video interview', icon: <Video size={18} strokeWidth={1.5} /> },
    { value: 'video-screenshare', label: 'Video + Screen Share', desc: 'Video with screen sharing for usability tests', icon: <Monitor size={18} strokeWidth={1.5} /> },
];

export default function NewStudyPage() {
    const params = useParams();
    const router = useRouter();
    const { addStudy } = useStudies();
    const researchType = params.type as ResearchType;
    const typeConfig = RESEARCH_TYPES[researchType];

    const [step, setStep] = useState(0);
    const [goals, setGoals] = useState('');
    const [audience, setAudience] = useState('');
    const [inputMethod, setInputMethod] = useState<InputMethod>('audio-video');
    const [maxFollowUps, setMaxFollowUps] = useState(2);
    const [studyName, setStudyName] = useState('');
    const [guide, setGuide] = useState<ResearchGuide | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const generateGuide = async () => {
        setIsGenerating(true);
        setError('');
        try {
            const res = await fetch('/api/generate-guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    researchType,
                    goals,
                    audience,
                    inputMethod,
                    maxFollowUps,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate guide');
            setGuide(data.guide);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = async () => {
        if (step === 2) {
            await generateGuide();
        }
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        }
    };

    const handleCreate = () => {
        if (!guide) return;
        const name = studyName.trim() || `${typeConfig.label} — ${new Date().toLocaleDateString()}`;
        const study: Study = {
            id: crypto.randomUUID(),
            name,
            type: researchType,
            goals,
            audience,
            inputMethod,
            maxFollowUps,
            guide,
            responses: [],
            createdAt: new Date().toISOString(),
            status: 'active',
        };
        addStudy(study);
        router.push(`/study/${study.id}`);
    };

    const canNext = () => {
        if (step === 0) return goals.trim().length > 10;
        if (step === 1) return audience.trim().length > 5;
        if (step === 2) return !!inputMethod;
        return !!guide;
    };

    const updateQuestionText = (section: 'preScreen' | 'mainQuestions' | 'exitQuestions', idx: number, text: string) => {
        if (!guide) return;
        const updated = { ...guide };
        if (section === 'mainQuestions') {
            updated.mainQuestions = [...updated.mainQuestions];
            updated.mainQuestions[idx] = { ...updated.mainQuestions[idx], text };
        } else {
            const arr = [...updated[section]];
            arr[idx] = { ...arr[idx], text };
            updated[section] = arr;
        }
        setGuide(updated);
    };

    if (!typeConfig) {
        return <div className="empty-state"><h3>Invalid research type</h3></div>;
    }

    return (
        <div className="wizard">
            <div style={{ marginBottom: 'var(--space-3)' }}>
                <span className="label">{typeConfig.label}</span>
            </div>
            <h1 style={{ marginBottom: 'var(--space-8)' }}>New Study</h1>

            {/* Step indicator */}
            <div className="wizard-steps">
                {STEPS.map((s, i) => (
                    <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {i > 0 && <div className="wizard-step-connector" />}
                        <div className={`wizard-step ${i === step ? 'active' : i < step ? 'completed' : ''}`}>
                            <span className="wizard-step-number">
                                {i < step ? <Check size={12} strokeWidth={2} /> : i + 1}
                            </span>
                            <span>{s}</span>
                        </div>
                    </span>
                ))}
            </div>

            {/* Step content */}
            <div className="wizard-body">
                {step === 0 && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Study Name</label>
                            <input
                                className="input"
                                value={studyName}
                                onChange={(e) => setStudyName(e.target.value)}
                                placeholder={`${typeConfig.label} — ${new Date().toLocaleDateString()}`}
                            />
                            <div className="form-hint">Optional — a default name will be used if empty</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Research Goals</label>
                            <div className="form-hint" style={{ marginBottom: 'var(--space-2)', marginTop: 0 }}>
                                What do you want to learn? What questions are you trying to answer?
                            </div>
                            <VoiceInput
                                value={goals}
                                onChange={setGoals}
                                placeholder="e.g., We want to understand why users abandon the checkout flow after adding items to cart. Specifically, we're looking at the payment step and any friction points in the address entry..."
                                rows={5}
                            />
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Audience Description</label>
                            <div className="form-hint" style={{ marginBottom: 'var(--space-2)', marginTop: 0 }}>
                                Who should participate? Describe the ideal participant profile and any screening criteria.
                            </div>
                            <VoiceInput
                                value={audience}
                                onChange={setAudience}
                                placeholder="e.g., Online shoppers aged 25–45 who have used our platform at least twice in the past month and have experienced the checkout flow..."
                                rows={5}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Interview Medium</label>
                            <div className="radio-group">
                                {INPUT_METHODS.map(method => (
                                    <div
                                        key={method.value}
                                        className={`radio-option ${inputMethod === method.value ? 'selected' : ''}`}
                                        onClick={() => setInputMethod(method.value)}
                                    >
                                        <div className="radio-dot"><div className="radio-dot-inner" /></div>
                                        <div style={{ flex: 1 }}>
                                            <div className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {method.icon} {method.label}
                                            </div>
                                            <div className="radio-desc">{method.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Follow-ups per Question</label>
                            <div className="form-hint" style={{ marginBottom: 'var(--space-2)', marginTop: 0 }}>
                                How many adaptive follow-up questions should the AI ask per main question?
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <input
                                    type="number"
                                    className="input"
                                    value={maxFollowUps}
                                    onChange={(e) => setMaxFollowUps(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))}
                                    min={0}
                                    max={5}
                                    style={{ width: '80px' }}
                                />
                                <span className="caption">0–5 follow-ups</span>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        {isGenerating && (
                            <div className="empty-state" style={{ padding: 'var(--space-12) 0' }}>
                                <div className="spinner" style={{ marginBottom: 'var(--space-4)' }} />
                                <p style={{ color: 'var(--text-secondary)' }}>Generating research guide with AI…</p>
                            </div>
                        )}

                        {error && (
                            <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--neutral-100)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', fontSize: '13px', color: 'var(--text-primary)' }}>
                                {error}
                                <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'var(--space-3)' }} onClick={generateGuide}>
                                    Retry
                                </button>
                            </div>
                        )}

                        {guide && !isGenerating && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                    <Pencil size={12} strokeWidth={1.5} style={{ color: 'var(--neutral-400)' }} />
                                    <span className="caption">All questions are editable — click to modify</span>
                                </div>

                                {/* Pre-screen */}
                                <div className="guide-section">
                                    <div className="guide-section-header">
                                        <span className="guide-section-title">Pre-screening Questions</span>
                                        <span className="badge">{guide.preScreen.length}</span>
                                    </div>
                                    {guide.preScreen.map((q, i) => (
                                        <div key={q.id} className="guide-question">
                                            <span className="guide-question-index">{String(i + 1).padStart(2, '0')}</span>
                                            <div
                                                className="guide-question-text editable-text"
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => updateQuestionText('preScreen', i, e.currentTarget.textContent || '')}
                                            >
                                                {q.text}
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
                                                <div
                                                    className="guide-question-text editable-text"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateQuestionText('mainQuestions', i, e.currentTarget.textContent || '')}
                                                >
                                                    {q.text}
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
                                            <div
                                                className="guide-question-text editable-text"
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => updateQuestionText('exitQuestions', i, e.currentTarget.textContent || '')}
                                            >
                                                {q.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="wizard-actions">
                <button
                    className="btn btn-ghost"
                    onClick={() => step === 0 ? router.push('/') : setStep(step - 1)}
                >
                    <ArrowLeft size={14} strokeWidth={1.5} />
                    {step === 0 ? 'Cancel' : 'Back'}
                </button>
                {step < STEPS.length - 1 ? (
                    <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={!canNext() || isGenerating}>
                        {isGenerating ? <Loader2 size={14} strokeWidth={1.5} className="spinner" style={{ animation: 'spin 0.6s linear infinite', border: 'none', width: 'auto', height: 'auto' }} /> : null}
                        Next
                        <ArrowRight size={14} strokeWidth={1.5} />
                    </button>
                ) : (
                    <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={!guide}>
                        Create Study
                    </button>
                )}
            </div>
        </div>
    );
}
