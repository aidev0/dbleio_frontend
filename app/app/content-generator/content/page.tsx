"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/app/content-generator');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-24">
      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
    </div>
  );
}
