import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { StateChip } from '../../components/StateChip.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';

/**
 * Status, hash, and (once storage completes) CID — no raw ledger-telemetry
 * panel here (no gas figures, no block explorer links, no event log dump).
 * Fetches the real GET /certificates/:id endpoint Jaideep wired in Week 5.
 */
export function CertificateDetailPage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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
    </Card>
  );
}
