// app/api-docs/page.tsx
import { openApiSpec } from "@/lib/openapi-spec";
import { ReactSwagger } from "@/components/docs/react-swagger";
import { notFound } from "next/navigation";

export default function ApiDocsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          API Explorer & Playground
        </h1>
        <p className="text-sm text-zinc-500">
          Test and execute Next.js Route Handlers with real database calls.
        </p>
      </div>

      <ReactSwagger spec={openApiSpec} />
    </div>
  );
}
