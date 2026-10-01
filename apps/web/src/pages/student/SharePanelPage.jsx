import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { StateChip } from '../../components/StateChip.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';

/**
 * First live (non-blockchain) data on the student side — fetches the real
 * GET /certificates/:id endpoint, same as the institution's detail page
 * (Week 6). No QR code or verify link yet — those need the public verifier
 * route, which doesn't exist in this build.
 */
export function SharePanelPage() {
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
          // malformed id (the mock gallery's ids aren't real UUIDs yet).
          if (!cancelled) setErrorMessage(body.message ?? 'Could not load this credential.');
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
        <div className="flex flex-col gap-16" aria-busy="true" aria-label="Loading credential">
          <Skeleton className="h-24 w-2/3" />
          <Skeleton className="h-16 w-1/3" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col items-start justify-between gap-16 sm:flex-row">
        <h1 className="text-[20px] font-bold text-ink">{certificate.title}</h1>
        <StateChip state={certificate.status} />
      </div>
      <dl className="mt-24 flex flex-col gap-16">
        <div>
          <dt className="text-[12px] font-bold uppercase text-faint">Certificate number</dt>
          <dd className="mt-4 font-mono text-[14px] text-body">{certificate.certificateNumber}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-bold uppercase text-faint">Issued</dt>
          <dd className="mt-4 text-[14px] text-body">{certificate.issueDate}</dd>
        </div>
      </dl>
    </Card>
  );
}
