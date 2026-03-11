'use client';

import { usePathname } from 'next/navigation';
import { useStudies } from '@/lib/StudyContext';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function Breadcrumb() {
    const pathname = usePathname();
    const { getStudy } = useStudies();

    const parts: { label: string; href?: string }[] = [{ label: 'Fieldwork', href: '/' }];

    if (pathname === '/') {
        parts.push({ label: 'Home' });
    } else if (pathname.startsWith('/study/')) {
        const id = pathname.split('/')[2];
        const study = getStudy(id);
        parts.push({ label: study?.name || 'Study', href: `/study/${id}` });
    } else if (pathname.startsWith('/new/')) {
        parts.push({ label: 'New Study' });
    }

    return (
        <div className="breadcrumb">
            {parts.map((part, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {i > 0 && <ChevronRight size={12} strokeWidth={1.5} className="breadcrumb-separator" />}
                    {part.href && i < parts.length - 1 ? (
                        <Link href={part.href} className="breadcrumb-link">{part.label}</Link>
                    ) : (
                        <span className={i === parts.length - 1 ? 'breadcrumb-current' : ''}>{part.label}</span>
                    )}
                </span>
            ))}
        </div>
    );
}
