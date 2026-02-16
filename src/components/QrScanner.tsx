import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (uuid: string) => void;
  active: boolean;
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extract a UUID from any string: raw UUID, URL containing UUID, or JSON with a UUID field.
 */
const extractUuid = (raw: string): string | null => {
  const trimmed = raw.trim();
  const match = trimmed.match(UUID_REGEX);
  return match ? match[0] : null;
};

const QrScanner = ({ onScan, active }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      processedRef.current = false;
      return;
    }

    const scannerId = 'qr-reader';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    processedRef.current = false;

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        if (processedRef.current) return;

        const uuid = extractUuid(decodedText);
        if (uuid) {
          processedRef.current = true;
          scanner.stop().catch(() => {});
          onScan(uuid);
        } else {
          // Non-UUID QR code — trigger error once
          processedRef.current = true;
          scanner.stop().catch(() => {});
          onScan('__INVALID__');
        }
      },
      () => {} // ignore scan failures
    ).catch((err) => {
      console.error('Scanner start error:', err);
    });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [active, onScan]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">Point camera at QR code</h2>
      <div
        id="qr-reader"
        className="w-full max-w-sm rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default QrScanner;
