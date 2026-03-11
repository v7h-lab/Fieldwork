'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Study } from './types';

interface StudyContextType {
    studies: Study[];
    activeStudyId: string | null;
    setActiveStudyId: (id: string | null) => void;
    addStudy: (study: Study) => void;
    updateStudy: (id: string, updates: Partial<Study>) => void;
    deleteStudy: (id: string) => void;
    getStudy: (id: string) => Study | undefined;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

const STORAGE_KEY = 'fieldwork_studies';

export function StudyProvider({ children }: { children: React.ReactNode }) {
    const [studies, setStudies] = useState<Study[]>([]);
    const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setStudies(JSON.parse(stored));
            }
        } catch {
            // ignore parse errors
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (loaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(studies));
        }
    }, [studies, loaded]);

    const addStudy = useCallback((study: Study) => {
        setStudies(prev => [study, ...prev]);
        setActiveStudyId(study.id);
    }, []);

    const updateStudy = useCallback((id: string, updates: Partial<Study>) => {
        setStudies(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }, []);

    const deleteStudy = useCallback((id: string) => {
        setStudies(prev => prev.filter(s => s.id !== id));
        setActiveStudyId(prev => prev === id ? null : prev);
    }, []);

    const getStudy = useCallback((id: string) => {
        return studies.find(s => s.id === id);
    }, [studies]);

    return (
        <StudyContext.Provider value={{ studies, activeStudyId, setActiveStudyId, addStudy, updateStudy, deleteStudy, getStudy }}>
            {children}
        </StudyContext.Provider>
    );
}

export function useStudies() {
    const ctx = useContext(StudyContext);
    if (!ctx) throw new Error('useStudies must be used within a StudyProvider');
    return ctx;
}
