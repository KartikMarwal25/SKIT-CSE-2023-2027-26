import { CredentialCard } from '../../components/CredentialCard.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

// Mock rows — replaced with a real "list my credentials" endpoint once one
// exists. Shape matches what GET /certificates/:id already returns per
// docs/api/certificate-endpoints.md.
const MOCK_CREDENTIALS = [
  {
    id: '1',
    title: 'Bachelor of Technology in Computer Science',
    institutionName: 'SKIT',
    issueDate: '2026-06-15',
    certificateNumber: 'SKIT-2026-000000000001',
    status: 'ACTIVE',
  },
  {
    id: '2',
    title: 'Certificate of Completion — Advanced Web Development',
    institutionName: 'SKIT',
    issueDate: '2026-04-02',
    certificateNumber: 'SKIT-2026-000000000002',
    status: 'REVOKED',
  },
];

export function GalleryPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-edge bg-paper px-16 py-16">
        <h1 className="text-[20px] font-bold text-ink">Your credentials</h1>
      </header>
      <main className="mx-auto max-w-[720px] px-16 py-24">
        {MOCK_CREDENTIALS.length === 0 ? (
          <EmptyState title="No credentials yet" hint="Credentials issued to you will appear here." />
        ) : (
          <ul className="flex flex-col gap-12" aria-label="Your credentials">
            {MOCK_CREDENTIALS.map((credential) => (
              <CredentialCard key={credential.id} credential={credential} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
