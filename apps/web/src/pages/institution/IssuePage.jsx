import { useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Button } from '../../components/Button.jsx';

const CERTIFICATE_TYPES = [
  { value: 'DEGREE', label: 'Degree' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'COURSE_COMPLETION', label: 'Course completion' },
];

const INITIAL_FORM = {
  holderName: '',
  holderEmail: '',
  enrollmentNumber: '',
  title: '',
  certificateType: 'DEGREE',
  course: '',
  gradeOrResult: '',
  issueDate: '',
};

/**
 * Wired to the real POST /certificates validation this week (Jaideep's
 * issuanceRequestSchema) — server-side field errors surface inline.
 * holderEmail is marked mandatory: it's the AD-06 matching key the backend
 * uses to find or create the student's account (FR-ISS-001), so nothing
 * else in this form should be allowed to omit it.
 */
export function IssuePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | error | not-implemented

  const setField = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setFieldErrors({});

    const res = await fetch('/api/v1/certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json();

    if (res.status === 400) {
      const errors = {};
      for (const field of body.fields) {
        errors[field.path] = field.message;
      }
      setFieldErrors(errors);
      setStatus('error');
      return;
    }
    // The issuance service itself isn't implemented until Week 6 — a valid
    // payload still comes back 501 today, which is expected, not a bug.
    setStatus('not-implemented');
  };

  return (
    <Card>
      <h1 className="text-[20px] font-bold text-ink">Issue a credential</h1>
      <form onSubmit={handleSubmit} className="mt-16 flex flex-col gap-16">
        <FormField
          id="holderName"
          label="Holder name"
          value={form.holderName}
          onChange={setField('holderName')}
          required
          error={fieldErrors.holderName}
        />
        <FormField
          id="holderEmail"
          label="Holder email"
          type="email"
          value={form.holderEmail}
          onChange={setField('holderEmail')}
          required
          error={fieldErrors.holderEmail}
          hint="Matches this credential to the student's account — required for every certificate type."
        />
        <FormField
          id="enrollmentNumber"
          label="Enrollment number"
          value={form.enrollmentNumber}
          onChange={setField('enrollmentNumber')}
          required
          error={fieldErrors.enrollmentNumber}
        />
        <FormField id="title" label="Credential title" value={form.title} onChange={setField('title')} required error={fieldErrors.title} />

        <div>
          <label htmlFor="certificateType" className="text-[12px] font-bold uppercase text-body">
            Certificate type <span className="text-bad">*</span>
          </label>
          <select
            id="certificateType"
            value={form.certificateType}
            onChange={setField('certificateType')}
            className="mt-4 min-h-[44px] w-full rounded border border-edge-ctl bg-paper px-12 py-8 text-[16px] text-body"
          >
            {CERTIFICATE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <FormField id="course" label="Programme" value={form.course} onChange={setField('course')} required error={fieldErrors.course} />
        <FormField id="gradeOrResult" label="Grade / result (optional)" value={form.gradeOrResult} onChange={setField('gradeOrResult')} />
        <FormField
          id="issueDate"
          label="Issue date"
          type="date"
          value={form.issueDate}
          onChange={setField('issueDate')}
          required
          error={fieldErrors.issueDate}
        />

        {status === 'not-implemented' ? (
          <p className="text-[13px] text-faint">Validated — issuance itself isn't wired up yet (lands Week 6).</p>
        ) : null}

        <Button type="submit" disabled={status === 'submitting'}>
          Issue credential
        </Button>
      </form>
    </Card>
  );
}
