import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';

/**
 * Shell only — no verification endpoint exists yet (that needs Kartik's
 * verifyCertificate() wired through an API route, not built this week), so
 * this just proves the identifier makes it through the URL correctly.
 */
export function VerifyOutcomePage() {
  const { certificateNumber } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-16">
      <Card className="w-full max-w-[420px]">
        <h1 className="text-[20px] font-bold text-ink">Checking a credential</h1>
        <p className="mt-8 font-mono text-[14px] text-body">{certificateNumber}</p>
        <p className="mt-16 text-[14px] text-faint">
          Verification isn't wired up yet — the on-chain lookup exists (Kartik's
          verifyCertificate(), this week), but nothing calls it from here yet.
        </p>
        <Link to="/verify" className="mt-16 inline-block text-[14px] text-brand hover:underline">
          Check another certificate
        </Link>
      </Card>
    </div>
  );
}
