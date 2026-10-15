import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';

/**
 * All four FR-VER-003 outcomes get their own distinct treatment — never
 * collapsed to a single "VALID" label (the F-2 pitfall). No verification
 * endpoint exists yet (that needs Kartik's verifyCertificate() wired
 * through the API, not built this week), so the outcome shown here is
 * resolved from a small mock table by certificate number, purely to prove
 * all four result states render distinctly.
 */
const MOCK_OUTCOMES = {
  'SKIT-2026-000000000001': 'VERIFIED',
  'SKIT-2026-000000000002': 'REVOKED',
  'SKIT-2026-000000000003': 'TAMPERED',
};

const OUTCOME_COPY = {
  VERIFIED: {
    heading: 'This credential is verified',
    detail: 'The hash on file matches this certificate, and it has not been revoked.',
    className: 'border-ok bg-ok-bg text-ok',
  },
  REVOKED: {
    heading: 'This credential has been revoked',
    detail: 'The issuing institution has revoked this certificate. It is no longer valid.',
    className: 'border-bad bg-bad-bg text-bad',
  },
  TAMPERED: {
    heading: 'This document does not match our records',
    detail: 'The hash of the document you checked does not match what was originally issued under this certificate number. Do not treat it as genuine.',
    className: 'border-bad bg-bad-bg text-bad',
  },
  NOT_FOUND: {
    heading: 'No record of this certificate',
    detail: "We have no certificate on file with this number. Double check it, or ask the issuing institution.",
    className: 'border-edge bg-surface text-faint',
  },
};

export function VerifyOutcomePage() {
  const { certificateNumber } = useParams();
  const outcome = MOCK_OUTCOMES[certificateNumber] ?? 'NOT_FOUND';
  const copy = OUTCOME_COPY[outcome];

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-16">
      <Card className="w-full max-w-[480px]">
        <p className="font-mono text-[13px] text-faint">{certificateNumber}</p>
        <div className={`mt-16 rounded border p-16 ${copy.className}`}>
          <p className="text-[16px] font-bold">{copy.heading}</p>
          <p className="mt-8 text-[14px]">{copy.detail}</p>
        </div>
        <Link to="/verify" className="mt-16 inline-block text-[14px] text-brand hover:underline">
          Check another certificate
        </Link>
      </Card>
    </div>
  );
}
