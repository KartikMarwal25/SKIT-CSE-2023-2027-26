import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { StateChip } from '../../components/StateChip.jsx';

/**
 * Status, hash, and (once storage completes) CID — no raw ledger-telemetry
 * panel here (no gas figures, no block explorer links, no event log dump).
 * Fetches the real GET /certificates/:id endpoint Jaideep wired this week.
 */
export function CertificateDetailPage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCertificate(null);
    setNotFound(false);

    fetch(`/api/v1/certificates/${id}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((body) => {
        if (!cancelled && body) setCertificate(body);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <Card>
        <p className="text-[15px] text-faint">No certificate found with that id.</p>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Card>
        <p className="text-[15px] text-faint">Loading…</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-16">
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
