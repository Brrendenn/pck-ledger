// components/docs/react-swagger.tsx
'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-zinc-500">Loading Swagger UI...</div>,
});

export function ReactSwagger({ spec }: { spec: Record<string, any> }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800">
      <SwaggerUI spec={spec} />
    </div>
  );
}