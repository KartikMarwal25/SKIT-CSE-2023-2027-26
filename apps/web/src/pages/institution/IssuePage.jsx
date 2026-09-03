import { useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Button } from '../../components/Button.jsx';

/**
 * Layout only this week — matches the request shape Jaideep designed
 * (docs/api/certificate-endpoints.md). Real submission wiring lands once
 * POST /certificates actually does something (Week 4+).
 */
export function IssuePage() {
  const [form, setForm] = useState({
    holderName: '',
    holderEmail: '',
    enrollmentNumber: '',
    title: '',
    course: '',
    gradeOrResult: '',
    issueDate: '',
  });

  const setField = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO(Week 4+): call POST /certificates once it's implemented.
  };

  return (
    <Card>
      <h1 className="text-[20px] font-bold text-ink">Issue a credential</h1>
      <form onSubmit={handleSubmit} className="mt-16 flex flex-col gap-16">
        <FormField id="holderName" label="Holder name" value={form.holderName} onChange={setField('holderName')} />
        <FormField id="holderEmail" label="Holder email" type="email" value={form.holderEmail} onChange={setField('holderEmail')} />
        <FormField id="enrollmentNumber" label="Enrollment number" value={form.enrollmentNumber} onChange={setField('enrollmentNumber')} />
        <FormField id="title" label="Credential title" value={form.title} onChange={setField('title')} />
        <FormField id="course" label="Programme" value={form.course} onChange={setField('course')} />
        <FormField id="gradeOrResult" label="Grade / result (optional)" value={form.gradeOrResult} onChange={setField('gradeOrResult')} />
        <FormField id="issueDate" label="Issue date" type="date" value={form.issueDate} onChange={setField('issueDate')} />
        <Button type="submit">Issue credential</Button>
      </form>
    </Card>
  );
}
