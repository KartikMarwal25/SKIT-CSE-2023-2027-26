import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';

/**
 * All four FR-VER-003 outcomes get their own distinct treatment — never
 * collapsed to a single "VALID" label (the F-2 pitfall). Wired to the real
 * GET /certificates/verify/:certificateNumber endpoint Jaideep built this
 * week (replacing the mock table used through Week 11).
 *
 * A fifth state, DEGRADED, is FR-VER-006: if the check itself fails (the
 * request errors or times out — most likely an unreachable chain RPC on the
 * server), that is explicitly NOT the same as any of the four real
 * outcomes. Never silently falls back to VERIFIED, and is careful to say
 * "last confirmed state" rather than implying a fresh check happened, since
 * the API doesn't return a cached prior outcome yet — there is genuinely
 * nothing confirmed to show here until that caching exists server-side.
 */
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
  DEGRADED: {
    heading: 'Verification is temporarily unavailable',
    detail:
      "We couldn't reach the verification service just now (most likely a blockchain connectivity issue on our " +
      'end). This is not a result — we have no confirmed state to show you for this certificate right now. ' +
      'Please try again shortly.',
    className: 'border-edge bg-surface text-faint',
  },
};

export function VerifyOutcomePage() {
  const { certificateNumber } = useParams();
  const [result, setResult] = useState(null);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setDegraded(false);

    fetch(`/api/v1/certificates/verify/${encodeURIComponent(certificateNumber)}`)
      .then(async (res) => {
        if (!res.ok) {
          // A verify request should only ever fail this way for
          // infrastructure reasons (validation already happened client-side
          // on the entry form) — treat any failure here as FR-VER-006's
          // degraded state, not as a certificate-level outcome.
          if (!cancelled) setDegraded(true);
          return;
        }
        const body = await res.json();
        if (!cancelled) setResult(body);
      })
      .catch(() => {
        if (!cancelled) setDegraded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [certificateNumber]);

  if (!degraded && !result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-16">
        <Card className="w-full max-w-[480px]">
          <div className="flex flex-col gap-16" aria-busy="true" aria-label="Checking certificate">
            <Skeleton className="h-16 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  const outcome = degraded ? 'DEGRADED' : result.outcome;
  const copy = OUTCOME_COPY[outcome];

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-16">
      <Card className="w-full max-w-[480px]">
        <p className="font-mono text-[13px] text-faint">{certificateNumber}</p>
        <div className={`mt-16 rounded border p-16 ${copy.className}`}>
          <p className="text-[16px] font-bold">{copy.heading}</p>
          <p className="mt-8 text-[14px]">{copy.detail}</p>
        </div>

        {/* AD-05/UI-07 — mandatory on every real outcome (not the degraded
            state, which isn't an outcome at all), so it can never be
            mistaken for something specific to a bad result (the F-1
            pitfall: implying the system vouches for the academic claim
            itself, not just the document's authenticity). */}
        {!degraded && (
          <p className="mt-16 text-[12px] leading-[18px] text-faint">
            This check confirms whether the certificate document is authentic and unaltered, and
            whether it has been revoked. It does not evaluate or vouch for the academic claim itself
            — the grades, honours, or completion status printed on the document remain the issuing
            institution's own record, not something this system independently assesses.
          </p>
        )}

        <Link to="/verify" className="mt-16 inline-block text-[14px] text-brand hover:underline">
          Check another certificate
        </Link>
      </Card>
    </div>
  );
}
