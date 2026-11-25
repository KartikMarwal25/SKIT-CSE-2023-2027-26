import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { StateChip } from '../../components/StateChip.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Button } from '../../components/Button.jsx';

/**
 * Status, hash, and (once storage completes) CID — no raw ledger-telemetry
 * panel here (no gas figures, no block explorer links, no event log dump).
 * Fetches the real GET /certificates/:id endpoint Jaideep wired in Week 5.
 *
 * Week 16 adds the live revoke flow: a reason field submitting to the real
 * POST /:certificateNumber/revoke endpoint (Week 12), plus a local activity
 * log — deliberately labelled "this session's activity", not "history":
 * nothing persists revocation history server-side yet (no repository/
 * service writes to the `revocation` table migration 008 already created),
 * so a real "history" section would either be empty forever or lying about
 * what it shows. The `authToken` field below is a stand-in for real sign-in
 * — there's no login UI anywhere in this build yet, so an institution
 * actor's Bearer token has nowhere else to come from.
 */
export function CertificateDetailPage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [authToken, setAuthToken] = useState('');
  const [reason, setReason] = useState('');
  const [revokeStatus, setRevokeStatus] = useState('idle'); // idle | submitting | error
  const [revokeError, setRevokeError] = useState(null);
  const [sessionActivity, setSessionActivity] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setCertificate(null);
    setErrorMessage(null);

    fetch(`/api/v1/certificates/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          // Any non-2xx — not just 404 — is an error, including 400 for a
          // malformed id (the mock registry's ids aren't real UUIDs yet).
          if (!cancelled) setErrorMessage(body.message ?? 'Could not load this certificate.');
          return;
        }
        if (!cancelled) setCertificate(body);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRevoke = async (event) => {
    event.preventDefault();
    setRevokeStatus('submitting');
    setRevokeError(null);

    const res = await fetch(`/api/v1/certificates/${certificate.certificateNumber}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });
    const body = await res.json();

    if (!res.ok) {
      setRevokeStatus('error');
      setRevokeError(body.message ?? 'Could not revoke this certificate.');
      return;
    }

    setRevokeStatus('idle');
    setReason('');
    setSessionActivity((prev) => [{ reason, txHash: body.txHash, at: new Date().toISOString() }, ...prev]);
    setCertificate((prev) => ({ ...prev, status: 'REVOKED' }));
  };

  if (errorMessage) {
    return (
      <Card>
        <p className="text-[15px] text-faint">{errorMessage}</p>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Card>
        <div className="flex flex-col gap-16" aria-busy="true" aria-label="Loading certificate">
          <Skeleton className="h-24 w-2/3" />
          <Skeleton className="h-16 w-1/3" />
          <Skeleton className="mt-16 h-16 w-full" />
          <Skeleton className="h-16 w-1/2" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col items-start justify-between gap-16 sm:flex-row">
        <div>
          <h1 className="text-[20px] font-bold text-ink">{certificate.title}</h1>
          <p className="mt-4 text-[14px] text-faint">{certificate.holderName}</p>
        </div>
        <StateChip state={certificate.status} />
      </div>

      <dl className="mt-24 flex flex-col gap-16">
        <div>
          <dt className="text-[12px] font-bold uppercase text-faint">Certificate hash</dt>
          <dd className="mt-4 break-all font-mono text-[14px] text-body">{certificate.certificateHash}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-bold uppercase text-faint">IPFS CID</dt>
          <dd className="mt-4 text-[14px] text-faint">
            {certificate.ipfsCid ?? 'Not stored yet — this certificate has not completed the storage step.'}
          </dd>
        </div>
      </dl>

      {certificate.status !== 'REVOKED' && (
        <form onSubmit={handleRevoke} className="mt-24 flex flex-col gap-16 border-t border-edge pt-24">
          <p className="text-[13px] font-bold uppercase text-faint">Revoke this certificate</p>
          <FormField
            id="authToken"
            label="Institution auth token (dev — no sign-in flow exists yet)"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
          />
          <FormField
            id="reason"
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            hint="10-160 characters."
          />
          {revokeStatus === 'error' && <p className="text-[13px] text-bad">{revokeError}</p>}
          <Button type="submit" variant="secondary" disabled={revokeStatus === 'submitting'}>
            {revokeStatus === 'submitting' ? 'Revoking…' : 'Revoke'}
          </Button>
        </form>
      )}

      {sessionActivity.length > 0 && (
        <div className="mt-24 border-t border-edge pt-24">
          <p className="text-[13px] font-bold uppercase text-faint">This session's activity</p>
          <ul className="mt-8 flex flex-col gap-8">
            {sessionActivity.map((entry) => (
              <li key={entry.txHash} className="text-[13px] text-body">
                Revoked — "{entry.reason}" — <span className="font-mono text-faint">{entry.txHash}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
