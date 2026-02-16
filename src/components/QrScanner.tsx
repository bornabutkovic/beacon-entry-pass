import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (uuid: string) => void;
  active: boolean;
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const extractUuid = (raw: string): string | null => {
  const match = raw.trim().match(UUID_REGEX);
  return match ? match[0] : null;
};

const QrScanner = ({ onScan, active }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processedRef = useRef(false);
  const mountedRef = useRef(true);

  const handleDecode = useCallback((decodedText: string) => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Haptic feedback
    try { navigator.vibrate?.(200); } catch {}

    const uuid = extractUuid(decodedText);
    console.log('QR decoded raw:', decodedText, '→ uuid:', uuid);

    // Stop scanner immediately to free mobile resources
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }

    onScan(uuid || '__INVALID__');
  }, [onScan]);

  useEffect(() => {
    mountedRef.current = true;

    if (!active) {
      processedRef.current = false;
      return;
    }

    const scannerId = 'qr-reader';
    processedRef.current = false;

    // Small delay to ensure DOM element is ready
    const timerId = setTimeout(async () => {
      if (!mountedRef.current) return;

      const el = document.getElementById(scannerId);
      if (!el) {
        console.error('QR reader element not found');
        return;
      }

      try {
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => handleDecode(decodedText),
          () => {} // ignore scan misses
        );
        console.log('QR scanner started successfully');
      } catch (err) {
        console.error('Scanner start error:', err);
        if (mountedRef.current && !processedRef.current) {
          processedRef.current = true;
          onScan('__INVALID__');
        }
      }
    }, 300);

    return () => {
      mountedRef.current = false;
      clearTimeout(timerId);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [active, handleDecode, onScan]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">Point camera at QR code</h2>
      <div
        id="qr-reader"
        className="w-full max-w-sm rounded-lg overflow-hidden"
        style={{ minHeight: '300px' }}
      />
      <p className="text-xs text-muted-foreground mt-3">Scanning...</p>
    </div>
  );
};

export default QrScanner;
