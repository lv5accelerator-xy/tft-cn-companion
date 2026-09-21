"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function QueryReader({ onChange }: { onChange: (query: string) => void }) {
  const query = useSearchParams().toString();
  useEffect(() => { onChange(query); }, [query, onChange]);
  return null;
}

// Only the URL reader suspends; the complete page still renders on the server.
export default function PageQuerySync({ onChange }: { onChange: (query: string) => void }) {
  return <Suspense fallback={null}><QueryReader onChange={onChange} /></Suspense>;
}
