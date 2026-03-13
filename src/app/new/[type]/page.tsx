'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudies } from '@/lib/StudyContext';
import { ResearchType, InputMethod, RESEARCH_TYPES, Study, ResearchGuide } from '@/lib/types';
import { VoiceInput } from '@/components/VoiceInput';
import { Check, ArrowRight, ArrowLeft, Loader2, Mic, Video, Monitor, Pencil, Trash2, Plus, Image as ImageIcon, X } from 'lucide-react';

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
    const [maxQuestions, setMaxQuestions] = useState(5);
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
                    maxQuestions,
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
            maxQuestions,
            maxFollowUps,
            smartSkipping: false,
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

    const updateQuestionMediaUrls = (section: 'preScreen' | 'mainQuestions' | 'exitQuestions', idx: number, action: 'add' | 'remove', mediaUrl: string) => {
        if (!guide) return;
        const updated = { ...guide };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applyToQuestion = (q: any) => {
            const currentUrls = q.mediaUrls || [];
            if (action === 'add' && currentUrls.length < 5) {
                return { ...q, mediaUrls: [...currentUrls, mediaUrl] };
            } else if (action === 'remove') {
                return { ...q, mediaUrls: currentUrls.filter((url: string) => url !== mediaUrl) };
            }
            return q;
        };

        if (section === 'mainQuestions') {
            updated.mainQuestions = [...updated.mainQuestions];
            updated.mainQuestions[idx] = applyToQuestion(updated.mainQuestions[idx]);
        } else {
            const arr = [...updated[section]];
            arr[idx] = applyToQuestion(arr[idx]);
            updated[section] = arr;
        }
        setGuide(updated);
    };

    const deleteQuestion = (section: 'preScreen' | 'mainQuestions' | 'exitQuestions', idx: number) => {
        if (!guide) return;
        const updated = { ...guide };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated[section] = [...updated[section]] as any;
        updated[section].splice(idx, 1);
        setGuide(updated);
    };

    const updateQuestionType = (section: 'preScreen' | 'mainQuestions' | 'exitQuestions', idx: number, type: 'open' | 'multiple-choice' | 'binary-choice') => {
        if (!guide) return;
        const updated = { ...guide };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applyToQuestion = (q: any) => ({ ...q, type, options: type === 'open' ? undefined : (q.options || []) });

        if (section === 'mainQuestions') {
            updated.mainQuestions = [...updated.mainQuestions];
            updated.mainQuestions[idx] = applyToQuestion(updated.mainQuestions[idx]);
        } else {
            const arr = [...updated[section]];
            arr[idx] = applyToQuestion(arr[idx]);
            updated[section] = arr;
        }
        setGuide(updated);
    };

    const updateQuestionOption = (section: 'preScreen' | 'mainQuestions' | 'exitQuestions', questionIdx: number, action: 'add' | 'remove' | 'edit', optionIdx?: number, value?: string) => {
        if (!guide) return;
        const updated = { ...guide };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applyToQuestion = (q: any) => {
            const currentOptions = q.options || [];
            if (action === 'add') {
                return { ...q, options: [...currentOptions, value || `Option ${currentOptions.length + 1}`] };
            } else if (action === 'remove' && optionIdx !== undefined) {
                return { ...q, options: currentOptions.filter((_: string, i: number) => i !== optionIdx) };
            } else if (action === 'edit' && optionIdx !== undefined) {
                const newOptions = [...currentOptions];
                newOptions[optionIdx] = value || '';
                return { ...q, options: newOptions };
            }
            return q;
        };

        if (section === 'mainQuestions') {
            updated.mainQuestions = [...updated.mainQuestions];
            updated.mainQuestions[questionIdx] = applyToQuestion(updated.mainQuestions[questionIdx]);
        } else {
            const arr = [...updated[section]];
            arr[questionIdx] = applyToQuestion(arr[questionIdx]);
            updated[section] = arr;
        }
        setGuide(updated);
    };

    const addQuestion = (section: 'preScreen' | 'mainQuestions' | 'exitQuestions') => {
        if (!guide) return;
        const updated = { ...guide };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newQ: any = { id: crypto.randomUUID(), text: 'New Question' };
        if (section === 'mainQuestions') newQ.followUps = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated[section] = [...updated[section], newQ] as any;
        setGuide(updated);
    };

    const deleteFollowUp = (mainIdx: number, fuIdx: number) => {
        if (!guide) return;
        const updated = { ...guide };
        const updatedMain = [...updated.mainQuestions];
        const updatedFollowUps = [...updatedMain[mainIdx].followUps];
        updatedFollowUps.splice(fuIdx, 1);
        updatedMain[mainIdx] = { ...updatedMain[mainIdx], followUps: updatedFollowUps };
        updated.mainQuestions = updatedMain;
        setGuide(updated);
    };

    const addFollowUp = (mainIdx: number) => {
        if (!guide) return;
        const updated = { ...guide };
        const updatedMain = [...updated.mainQuestions];
        const updatedFollowUps = [...updatedMain[mainIdx].followUps, 'New follow-up'];
        updatedMain[mainIdx] = { ...updatedMain[mainIdx], followUps: updatedFollowUps };
        updated.mainQuestions = updatedMain;
        setGuide(updated);
    };

    const updateFollowUpText = (mainIdx: number, fuIdx: number, text: string) => {
        if (!guide) return;
        const updated = { ...guide };
        const updatedMain = [...updated.mainQuestions];
        const updatedFollowUps = [...updatedMain[mainIdx].followUps];
        updatedFollowUps[fuIdx] = text;
        updatedMain[mainIdx] = { ...updatedMain[mainIdx], followUps: updatedFollowUps };
        updated.mainQuestions = updatedMain;
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
                                placeholder={
                                    researchType === 'usability' ? "e.g., We want to understand why users abandon the checkout flow after adding items to cart..." :
                                        researchType === 'discovery' ? "e.g., We want to learn how remote workers manage their daily focus and what tools they currently combine..." :
                                            researchType === 'concept' ? "e.g., We want to validate if the proposed dashboard layout resolves the navigation confusion reported by users..." :
                                                researchType === 'jtbd' ? "e.g., We want to uncover the core 'job' users are trying to hire our software for when they export reports..." :
                                                    researchType === 'longitudinal' ? "e.g., We want to track how users' reliance on the AI assistant changes over their first 30 days..." :
                                                        "e.g., We want to uncover the main pain points users face when onboarding to the platform..."
                                }
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
                            <label className="form-label">Maximum Main Questions</label>
                            <div className="form-hint" style={{ marginBottom: 'var(--space-2)', marginTop: 0 }}>
                                How many core questions should the AI generate?
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <input
                                    type="number"
                                    className="input"
                                    value={maxQuestions}
                                    onChange={(e) => setMaxQuestions(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                                    min={1}
                                    max={15}
                                    style={{ width: '80px' }}
                                />
                                <span className="caption">1–15 questions</span>
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
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    className="guide-question-text editable-text"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateQuestionText('preScreen', i, e.currentTarget.textContent || '')}
                                                >
                                                    {q.text}
                                                </div>
                                                {(q.mediaUrls || []).length > 0 && (
                                                    <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {q.mediaUrls!.map((url, uidx) => (
                                                            <div key={uidx} style={{ position: 'relative', width: 'fit-content' }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={url} alt={`Question Media ${uidx + 1}`} style={{ maxWidth: '120px', borderRadius: '4px', border: '1px solid var(--neutral-200)' }} />
                                                                <button onClick={() => updateQuestionMediaUrls('preScreen', i, 'remove', url)} className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 4, right: 4, padding: 2, background: 'rgba(0,0,0,0.5)', color: 'white' }}><X size={12} strokeWidth={2} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {(q.mediaUrls || []).length < 5 && (
                                                    <label className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)', cursor: 'pointer' }} title="Add Media">
                                                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            files.slice(0, 5 - (q.mediaUrls?.length || 0)).forEach(file => {
                                                                updateQuestionMediaUrls('preScreen', i, 'add', URL.createObjectURL(file));
                                                            });
                                                        }} />
                                                        <ImageIcon size={14} strokeWidth={1.5} />
                                                    </label>
                                                )}
                                                <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)' }} onClick={() => deleteQuestion('preScreen', i)} title="Delete Question">
                                                    <Trash2 size={14} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => addQuestion('preScreen')}>
                                        <Plus size={14} strokeWidth={1.5} /> Add Pre-screening Question
                                    </button>
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
                                                    <div
                                                        className="guide-question-text editable-text"
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onBlur={(e) => updateQuestionText('mainQuestions', i, e.currentTarget.textContent || '')}
                                                    >
                                                        {q.text}
                                                    </div>
                                                    {(q.mediaUrls || []).length > 0 && (
                                                        <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {q.mediaUrls!.map((url, uidx) => (
                                                                <div key={uidx} style={{ position: 'relative', width: 'fit-content' }}>
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={url} alt={`Question Media ${uidx + 1}`} style={{ maxWidth: '120px', borderRadius: '4px', border: '1px solid var(--neutral-200)' }} />
                                                                    <button onClick={() => updateQuestionMediaUrls('mainQuestions', i, 'remove', url)} className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 4, right: 4, padding: 2, background: 'rgba(0,0,0,0.5)', color: 'white' }}><X size={12} strokeWidth={2} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Type label toggle */}
                                                <div style={{ marginTop: '8px', marginBottom: q.type && q.type !== 'open' ? '8px' : '0' }}>
                                                    <select
                                                        value={q.type || 'open'}
                                                        onChange={(e) => updateQuestionType('mainQuestions', i, e.target.value as any)}
                                                        style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--neutral-200)', background: 'var(--bg-card)', color: 'var(--neutral-600)' }}
                                                    >
                                                        <option value="open">Open Ended</option>
                                                        <option value="multiple-choice">Multiple Choice (select many)</option>
                                                        <option value="binary-choice">Multiple Choice (select one)</option>
                                                    </select>
                                                </div>

                                                {/* Options Manager */}
                                                {q.type && q.type !== 'open' && (
                                                    <div style={{ marginLeft: '12px', borderLeft: '2px solid var(--neutral-200)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {(q.options || []).map((opt, optIdx) => (
                                                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{
                                                                    width: '12px', height: '12px', border: '1px solid var(--neutral-400)',
                                                                    borderRadius: q.type === 'binary-choice' ? '50%' : '2px'
                                                                }} />
                                                                <input
                                                                    type="text"
                                                                    className="input"
                                                                    style={{ padding: '2px 8px', fontSize: '13px', height: 'auto', flex: 1 }}
                                                                    value={opt}
                                                                    onChange={(e) => updateQuestionOption('mainQuestions', i, 'edit', optIdx, e.target.value)}
                                                                    placeholder="Option text..."
                                                                />
                                                                <button onClick={() => updateQuestionOption('mainQuestions', i, 'remove', optIdx)} className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)' }}><X size={14} strokeWidth={1.5} /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => updateQuestionOption('mainQuestions', i, 'add')} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--primary)', padding: '0 4px' }}>
                                                            <Plus size={12} strokeWidth={1.5} /> Add Option
                                                        </button>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                                    {(q.mediaUrls || []).length < 5 && (
                                                        <label className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)', cursor: 'pointer' }} title="Add Media">
                                                            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                files.slice(0, 5 - (q.mediaUrls?.length || 0)).forEach(file => {
                                                                    updateQuestionMediaUrls('mainQuestions', i, 'add', URL.createObjectURL(file));
                                                                });
                                                            }} />
                                                            <ImageIcon size={14} strokeWidth={1.5} />
                                                        </label>
                                                    )}
                                                    <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)' }} onClick={() => deleteQuestion('mainQuestions', i)} title="Delete Question">
                                                        <Trash2 size={14} strokeWidth={1.5} />
                                                    </button>
                                                </div>
                                            </div>
                                            {q.followUps.map((fu, fi) => (
                                                <div key={fi} className="guide-followup" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    ↳ <div
                                                        className="editable-text"
                                                        style={{ flex: 1 }}
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onBlur={(e) => updateFollowUpText(i, fi, e.currentTarget.textContent || '')}
                                                    >
                                                        {fu}
                                                    </div>
                                                    <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)' }} onClick={() => deleteFollowUp(i, fi)} title="Delete Follow-up">
                                                        <Trash2 size={14} strokeWidth={1.5} />
                                                    </button>
                                                </div>
                                            ))}
                                            <div style={{ marginLeft: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => addFollowUp(i)} style={{ color: 'var(--neutral-400)' }}>
                                                    <Plus size={12} strokeWidth={1.5} /> Add Follow-up
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="btn btn-ghost btn-sm" onClick={() => addQuestion('mainQuestions')}>
                                        <Plus size={14} strokeWidth={1.5} /> Add Main Question
                                    </button>
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
                                                <div
                                                    className="guide-question-text editable-text"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateQuestionText('exitQuestions', i, e.currentTarget.textContent || '')}
                                                >
                                                    {q.text}
                                                </div>
                                                {(q.mediaUrls || []).length > 0 && (
                                                    <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {q.mediaUrls!.map((url, uidx) => (
                                                            <div key={uidx} style={{ position: 'relative', width: 'fit-content' }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={url} alt={`Question Media ${uidx + 1}`} style={{ maxWidth: '120px', borderRadius: '4px', border: '1px solid var(--neutral-200)' }} />
                                                                <button onClick={() => updateQuestionMediaUrls('exitQuestions', i, 'remove', url)} className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 4, right: 4, padding: 2, background: 'rgba(0,0,0,0.5)', color: 'white' }}><X size={12} strokeWidth={2} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {(q.mediaUrls || []).length < 5 && (
                                                    <label className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)', cursor: 'pointer' }} title="Add Media">
                                                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            files.slice(0, 5 - (q.mediaUrls?.length || 0)).forEach(file => {
                                                                updateQuestionMediaUrls('exitQuestions', i, 'add', URL.createObjectURL(file));
                                                            });
                                                        }} />
                                                        <ImageIcon size={14} strokeWidth={1.5} />
                                                    </label>
                                                )}
                                                <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--neutral-400)' }} onClick={() => deleteQuestion('exitQuestions', i)} title="Delete Question">
                                                    <Trash2 size={14} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => addQuestion('exitQuestions')}>
                                        <Plus size={14} strokeWidth={1.5} /> Add Exit Question
                                    </button>
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
