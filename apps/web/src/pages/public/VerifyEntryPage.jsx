import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Button } from '../../components/Button.jsx';

/**
 * Identifier-based verification only this week — type in a certificate
 * number, no document upload (§5.5 / UX-OPEN-3 is still open, so there's
 * nowhere to send an uploaded file yet).
 */
export function VerifyEntryPage() {
  const navigate = useNavigate();
  const [certificateNumber, setCertificateNumber] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!certificateNumber.trim()) return;
    navigate(`/verify/${encodeURIComponent(certificateNumber.trim())}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-16">
      <Card className="w-full max-w-[420px]">
        <h1 className="text-[20px] font-bold text-ink">Verify a credential</h1>
        <p className="mt-4 text-[14px] text-faint">Enter the certificate number printed on the document.</p>
        <form onSubmit={handleSubmit} className="mt-24 flex flex-col gap-16">
          <FormField
            id="certificateNumber"
            label="Certificate number"
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            placeholder="SKIT-2026-XXXXXXXXXXXX"
            required
          />
          <Button type="submit">Verify</Button>
        </form>
      </Card>
    </div>
  );
}
