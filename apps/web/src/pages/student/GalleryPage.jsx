import { useEffect, useState } from 'react';
import { CredentialCard } from '../../components/CredentialCard.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

// The roster itself is still mock data — replaced once a real "list my
// credentials" endpoint exists. What IS live this week: each credential's
// status, fetched from the real GET /certificates/verify/:certificateNumber
// endpoint (built Week 12) instead of a static mock field.
const MOCK_CREDENTIALS = [
  {
    id: '1',
    title: 'Bachelor of Technology in Computer Science',
    institutionName: 'SKIT',
    issueDate: '2026-06-15',
    certificateNumber: 'SKIT-2026-000000000001',
  },
  {
    id: '2',
    title: 'Certificate of Completion — Advanced Web Development',
    institutionName: 'SKIT',
    issueDate: '2026-04-02',
    certificateNumber: 'SKIT-2026-000000000002',
  },
];

export function GalleryPage() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;
    MOCK_CREDENTIALS.forEach((credential) => {
      fetch(`/api/v1/certificates/verify/${credential.certificateNumber}`)
        .then((res) => (res.ok ? res.json() : { outcome: 'DEGRADED' }))
        .then((body) => {
          if (!cancelled) setStatuses((prev) => ({ ...prev, [credential.id]: body.outcome }));
        })
        .catch(() => {
          if (!cancelled) setStatuses((prev) => ({ ...prev, [credential.id]: 'DEGRADED' }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const credentials = MOCK_CREDENTIALS.map((c) => ({ ...c, status: statuses[c.id] ?? 'LOADING' }));

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-edge bg-paper px-16 py-16 sm:px-24">
        <h1 className="text-[20px] font-bold text-ink">Your credentials</h1>
      </header>
      <main className="mx-auto max-w-[720px] px-16 py-24 sm:px-24">
        {credentials.length === 0 ? (
          <EmptyState title="No credentials yet" hint="Credentials issued to you will appear here." />
        ) : (
          <ul className="flex flex-col gap-12" aria-label="Your credentials">
            {credentials.map((credential) => (
              <CredentialCard key={credential.id} credential={credential} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
