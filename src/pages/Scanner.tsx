import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import QrScanner from '@/components/QrScanner';
import ScanResult, { ScanStatus } from '@/components/ScanResult';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, RefreshCw } from 'lucide-react';

// Success sound - short beep
const playSuccessSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
};

const Scanner = () => {
  const { user, loading, signOut } = useAuth();
  const [scanning, setScanning] = useState(true);
  const [scannerKey, setScannerKey] = useState(0);
  const [manualId, setManualId] = useState('');
  const [result, setResult] = useState<{
    status: ScanStatus;
    name?: string;
    erpSku?: string;
    scannedAt?: string;
    errorMessage?: string;
    rawData?: any;
  } | null>(null);

  const handleScan = useCallback(async (uuid: string) => {
    setScanning(false);

    try {
      const { data: attendee, error } = await externalSupabase
        .from('attendees')
        .select('*')
        .eq('id', uuid)
        .maybeSingle();

      if (error) {
        setResult({ status: 'error', errorMessage: error.message, rawData: { error } });
        return;
      }

      if (!attendee) {
        setResult({ status: 'not_found', rawData: { queried_id: uuid, result: null } });
        return;
      }

      const isPaid = ['paid', 'approved'].includes(attendee.payment_status?.toLowerCase());

      // Check if already scanned
      if (attendee.scanned_at) {
        setResult({
          status: 'already_scanned',
          name: attendee.name,
          erpSku: attendee.erp_sku,
          scannedAt: attendee.scanned_at,
          rawData: attendee,
        });
        return;
      }

      if (!isPaid) {
        setResult({
          status: 'not_paid',
          name: attendee.name,
          erpSku: attendee.erp_sku,
          rawData: attendee,
        });
        return;
      }

      // Access granted — update scanned_at
      const { error: updateError } = await externalSupabase
        .from('attendees')
        .update({ scanned_at: new Date().toISOString() })
        .eq('id', uuid);

      if (updateError) {
        setResult({ status: 'error', errorMessage: updateError.message, rawData: { updateError, attendee } });
        return;
      }

      playSuccessSound();
      setResult({
        status: 'granted',
        name: attendee.name,
        erpSku: attendee.erp_sku,
        rawData: attendee,
      });
    } catch (err: any) {
      setResult({ status: 'error', errorMessage: err.message || 'Unknown error', rawData: { caught: String(err) } });
    }
  }, []);

  const handleScanNext = () => {
    setResult(null);
    setScanning(true);
  };

  const handleResetCamera = () => {
    setScanning(false);
    setScannerKey((k) => k + 1);
    setTimeout(() => setScanning(true), 100);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (id) handleScan(id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (result) {
    return (
      <ScanResult
        status={result.status}
        name={result.name}
        erpSku={result.erpSku}
        scannedAt={result.scannedAt}
        errorMessage={result.errorMessage}
        rawData={result.rawData}
        onScanNext={handleScanNext}
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetCamera}
          className="text-muted-foreground hover:text-foreground"
          title="Reset Camera"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
      <QrScanner key={scannerKey} onScan={handleScan} active={scanning} />

      {/* Debug: Supabase URL */}
      <div className="fixed bottom-20 left-0 right-0 px-4">
        <p className="text-[10px] text-muted-foreground text-center break-all">
          External Supabase URL: {import.meta.env.VITE_EXTERNAL_SUPABASE_URL}
        </p>
      </div>

      {/* Manual test input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-sm mx-auto">
          <Input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Paste attendee UUID to test..."
            className="text-xs"
          />
          <Button type="submit" size="sm">Test</Button>
        </form>
      </div>
    </div>
  );
};

export default Scanner;
