import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button } from './Button.jsx';

function extractCertificateNumber(decodedText) {
  if (!decodedText || !decodedText.includes('/verify/')) return null;
  const afterMarker = decodedText.split('/verify/')[1];
  if (!afterMarker) return null;
  return afterMarker.split(/[/?#]/)[0] || null;
}

/**
 * Camera permission is requested only when this component mounts (i.e. only
 * once the user has clicked "Scan the QR code"), never on page load. All
 * media tracks are stopped on close and unmount.
 */
export function QrScanner({ onDecode, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  const stopStream = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height);
      if (code) {
        const certificateNumber = extractCertificateNumber(code.data);
        if (certificateNumber) {
          stopStream();
          onDecode(certificateNumber);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onDecode, stopStream]);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (unavailable) {
    return (
      <div className="flex flex-col items-center gap-16 p-24 text-center">
        <p className="text-[14px] text-faint">Couldn't access the camera. Type the certificate number instead.</p>
        <Button variant="secondary" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-16 p-16">
      <video ref={videoRef} className="w-full max-w-[320px] rounded" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}
