import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Table } from '../../components/Table.jsx';
import { StateChip } from '../../components/StateChip.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

// The roster itself is still mock data — replaced once a real GET
// /certificates list endpoint exists. What IS live this week: each row's
// status, fetched from the real GET /certificates/verify/:certificateNumber
// endpoint (built Week 12) instead of a static mock field, so the one thing
// on this page most likely to actually change (whether a certificate is
// still valid) is never stale.
const MOCK_CERTIFICATES = [
  { id: '1', certificateNumber: 'SKIT-2026-000000000001', title: 'Bachelor of Technology in Computer Science', holderName: 'Asha Verma' },
  { id: '2', certificateNumber: 'SKIT-2026-000000000002', title: 'Certificate of Completion — Advanced Web Development', holderName: 'Rohan Mehta' },
  { id: '3', certificateNumber: 'SKIT-2026-000000000003', title: 'Diploma in Data Science', holderName: 'Priya Nair' },
];

export function RegistryPage() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;
    MOCK_CERTIFICATES.forEach((row) => {
      fetch(`/api/v1/certificates/verify/${row.certificateNumber}`)
        .then((res) => (res.ok ? res.json() : { outcome: 'DEGRADED' }))
        .then((body) => {
          if (!cancelled) setStatuses((prev) => ({ ...prev, [row.id]: body.outcome }));
        })
        .catch(() => {
          if (!cancelled) setStatuses((prev) => ({ ...prev, [row.id]: 'DEGRADED' }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <h1 className="text-[20px] font-bold text-ink">Certificates</h1>
      <div className="mt-16">
        {MOCK_CERTIFICATES.length === 0 ? (
          <EmptyState
            title="No certificates issued yet"
            hint="Certificates you issue will appear here once submitted."
          />
        ) : (
          <Table
            columns={[
              {
                key: 'title',
                label: 'Title',
                render: (row) => (
                  <Link to={`/app/certificate/${row.id}`} className="text-brand hover:underline">
                    {row.title}
                  </Link>
                ),
              },
              { key: 'holderName', label: 'Holder' },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (statuses[row.id] ? <StateChip state={statuses[row.id]} /> : <StateChip state="LOADING" />),
              },
            ]}
            rows={MOCK_CERTIFICATES}
          />
        )}
      </div>
    </Card>
  );
}
