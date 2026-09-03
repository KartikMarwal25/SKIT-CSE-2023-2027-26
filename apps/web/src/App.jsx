import { useState } from 'react';
import { Button } from './components/Button.jsx';
import { FormField } from './components/FormField.jsx';
import { Card } from './components/Card.jsx';
import { Table } from './components/Table.jsx';
import { NavShell } from './components/NavShell.jsx';

/**
 * Temporary component-preview page — lets the team sanity-check the base
 * component set visually before any real page is built on top of it. Gets
 * replaced by real routing once the dashboard shells exist (Weeks 3+).
 */
export function App() {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen bg-surface">
      <NavShell>
        <Button variant="secondary">Sign in</Button>
      </NavShell>
      <main className="flex flex-col gap-24 p-24">
        <Card>
          <FormField id="name" label="Holder name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Verma" />
          <div className="mt-16">
            <Button>Submit</Button>
          </div>
        </Card>
        <Card>
          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
            ]}
            rows={[
              { id: 1, title: 'Bachelor of Technology', status: 'ACTIVE' },
              { id: 2, title: 'Certificate of Completion', status: 'REVOKED' },
            ]}
          />
        </Card>
      </main>
    </div>
  );
}
