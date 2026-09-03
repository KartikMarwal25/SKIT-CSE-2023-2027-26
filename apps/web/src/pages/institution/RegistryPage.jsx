import { Card } from '../../components/Card.jsx';
import { Table } from '../../components/Table.jsx';
import { StateChip } from '../../components/StateChip.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

// Mock rows — replaced with real GET /certificates data once that endpoint
// is implemented (Week 4+). Shape matches docs/api/certificate-endpoints.md.
const MOCK_CERTIFICATES = [
  { id: '1', title: 'Bachelor of Technology in Computer Science', holderName: 'Asha Verma', status: 'ACTIVE' },
  { id: '2', title: 'Certificate of Completion — Advanced Web Development', holderName: 'Rohan Mehta', status: 'PENDING_STORAGE' },
  { id: '3', title: 'Diploma in Data Science', holderName: 'Priya Nair', status: 'REVOKED' },
];

export function RegistryPage() {
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
              { key: 'title', label: 'Title' },
              { key: 'holderName', label: 'Holder' },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StateChip state={row.status} />,
              },
            ]}
            rows={MOCK_CERTIFICATES}
          />
        )}
      </div>
    </Card>
  );
}
