'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Breadcrumb } from './Breadcrumb';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInterviewPage = pathname.startsWith('/interview/');

    if (isInterviewPage) {
        return <>{children}</>;
    }

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="app-main">
                <nav className="app-topnav">
                    <Breadcrumb />
                </nav>
                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
