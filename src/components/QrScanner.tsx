import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (uuid: string) => void;
  active: boolean;
}

const QrScanner = ({ onScan, active }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const scannerId = 'qr-reader';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(decodedText)) {
          scanner.stop().catch(() => {});
          onScan(decodedText);
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
        ref={containerRef}
        className="w-full max-w-sm rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default QrScanner;
