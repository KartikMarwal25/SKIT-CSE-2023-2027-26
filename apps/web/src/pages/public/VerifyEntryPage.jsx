import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Button } from '../../components/Button.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';

/**
 * Identifier-based verification — type in a certificate number, or scan a
 * QR code that encodes a /verify/:certificateNumber link. Still no document
 * upload (§5.5 / UX-OPEN-3 is still open, so there's nowhere to send an
 * uploaded file yet).
 */
export function VerifyEntryPage() {
  const navigate = useNavigate();
  const [certificateNumber, setCertificateNumber] = useState('');
  const [scanning, setScanning] = useState(false);

  const goToOutcome = (number) => {
    if (!number.trim()) return;
    navigate(`/verify/${encodeURIComponent(number.trim())}`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    goToOutcome(certificateNumber);
  };

  if (scanning) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-16">
        <Card className="w-full max-w-[420px]">
          <h1 className="text-[20px] font-bold text-ink">Scan the QR code</h1>
          <div className="mt-16">
            <QrScanner onDecode={goToOutcome} onClose={() => setScanning(false)} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-16">
      <Card className="w-full max-w-[420px]">
        <h1 className="text-[20px] font-bold text-ink">Verify a credential</h1>
        <p className="mt-4 text-[14px] text-faint">Enter the certificate number printed on the document, or scan its QR code.</p>
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
          <Button type="button" variant="secondary" onClick={() => setScanning(true)}>
            Scan QR code instead
          </Button>
        </form>
      </Card>
    </div>
  );
}
