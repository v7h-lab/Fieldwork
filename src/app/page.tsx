'use client';

import { useRouter } from 'next/navigation';
import { ResearchType, RESEARCH_TYPES } from '@/lib/types';
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

  const handleSelect = (type: ResearchType) => {
    router.push(`/new/${type}`);
  };

  const types = Object.entries(RESEARCH_TYPES) as [ResearchType, typeof RESEARCH_TYPES[ResearchType]][];

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
    </div>
  );
}
