import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import QrScanner from '@/components/QrScanner';
import ScanResult, { ScanStatus } from '@/components/ScanResult';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

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
      // Look up attendee
      const { data: attendee, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', uuid)
        .maybeSingle();

      if (error) {
        setResult({ status: 'error', errorMessage: error.message });
        return;
      }

      if (!attendee) {
        setResult({ status: 'not_found' });
        return;
      }

      const isPaid = attendee.payment_status?.toLowerCase() === 'paid';

      // Check payment status
      if (!isPaid) {
        setResult({
          status: 'not_paid',
          name: attendee.name,
          erpSku: attendee.erp_sku,
          rawData: attendee,
        });
        return;
      }

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

      // Access granted — update scanned_at
      const { error: updateError } = await supabase
        .from('attendees')
        .update({ scanned_at: new Date().toISOString() })
        .eq('id', uuid);

      if (updateError) {
        setResult({ status: 'error', errorMessage: updateError.message });
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
      setResult({ status: 'error', errorMessage: err.message || 'Unknown error' });
    }
  }, []);

  const handleScanNext = () => {
    setResult(null);
    setScanning(true);
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
      <Button
        variant="ghost"
        size="icon"
        onClick={signOut}
        className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
      </Button>
      <QrScanner onScan={handleScan} active={scanning} />
    </div>
  );
};

export default Scanner;
