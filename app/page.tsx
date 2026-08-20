// app/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Building2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['home-projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (projects && projects.length > 0 && projects[0].sheets?.length > 0) {
      const defaultSheetId = projects[0].sheets[0].id;
      router.replace(`/sheets/${defaultSheetId}`);
    }
  }, [projects, router]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-500 animate-pulse">
          <Building2 className="h-5 w-5" />
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Ledger Workspace</h1>
      <p className="text-sm text-zinc-500">
        No projects found. Seed the database or create a project to get started.
      </p>
    </div>
  );
}