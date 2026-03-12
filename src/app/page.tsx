'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ResearchType, RESEARCH_TYPES } from '@/lib/types';
import { useStudies } from '@/lib/StudyContext';
import { Search, Clock, Users, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  MonitorSmartphone: Icons.MonitorSmartphone,
  Compass: Icons.Compass,
  Lightbulb: Icons.Lightbulb,
  GraduationCap: Icons.GraduationCap,
  Target: Icons.Target,
  TrendingUp: Icons.TrendingUp,
};

export default function HomePage() {
  const router = useRouter();
  const { studies } = useStudies();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = (type: ResearchType) => {
    router.push(`/new/${type}`);
  };

  const types = Object.entries(RESEARCH_TYPES) as [ResearchType, typeof RESEARCH_TYPES[ResearchType]][];

  const filteredStudies = useMemo(() => {
    if (!searchQuery.trim()) return studies;
    const lowerQ = searchQuery.toLowerCase();
    return studies.filter(s => s.name.toLowerCase().includes(lowerQ) || s.type.toLowerCase().includes(lowerQ));
  }, [studies, searchQuery]);

  // Sort studies by most recently created/updated
  const sortedStudies = useMemo(() => {
    return [...filteredStudies].map(study => {
      const lastUpdated = study.responses.reduce((latest, r) => {
        return new Date(r.completedAt).getTime() > new Date(latest).getTime() ? r.completedAt : latest;
      }, study.createdAt);
      return { ...study, lastUpdated };
    }).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [filteredStudies]);

  return (
    <div>
      <div style={{ paddingTop: 'var(--space-10)' }}>
        <h2 className="display" style={{ marginBottom: 'var(--space-3)' }}>
          What are you researching?
        </h2>
        <p className="body-text" style={{ color: 'var(--neutral-500)', maxWidth: '480px' }}>
          Choose a research type to get started. Fieldwork will generate a tailored interview guide and conduct AI-moderated interviews.
        </p>
      </div>

      <div className="research-grid">
        {types.map(([key, config], index) => {
          const IconComp = iconMap[config.icon];
          return (
            <div
              key={key}
              className="research-card"
              onClick={() => handleSelect(key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(key)}
            >
              <span className="research-card-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="research-card-icon">
                {IconComp && <IconComp size={22} strokeWidth={1.5} />}
              </div>
              <div className="research-card-title">{config.label}</div>
              <div className="research-card-desc">{config.description}</div>
            </div>
          );
        })}
      </div>

      {studies.length > 0 && (
        <div style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--neutral-200)', paddingTop: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Studies</h3>
              <p className="caption" style={{ marginTop: '4px' }}>Manage your existing research</p>
            </div>
            <div style={{ position: 'relative', width: '280px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--neutral-400)', display: 'flex' }}>
                <Search size={16} strokeWidth={1.5} />
              </div>
              <input
                type="text"
                className="input"
                placeholder="Search studies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', fontSize: '14px' }}
              />
            </div>
          </div>

          {sortedStudies.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <p>No studies match your search.</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setSearchQuery('')} style={{ marginTop: 'var(--space-3)' }}>Clear Search</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sortedStudies.map((study) => (
                <div
                  key={study.id}
                  onClick={() => router.push(`/study/${study.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-4)',
                    background: 'white',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover-bg-neutral-50"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/study/${study.id}`)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{study.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Last updated">
                        <Clock size={12} strokeWidth={1.5} />
                        {new Date((study as any).lastUpdated).toLocaleDateString()}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} strokeWidth={1.5} />
                        {study.responses.length} response{study.responses.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {study.responses.length > 0 ? (
                      <span className="badge" style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none' }}>In Progress</span>
                    ) : (
                      <span className="badge">Draft</span>
                    )}
                    <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'var(--neutral-300)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
