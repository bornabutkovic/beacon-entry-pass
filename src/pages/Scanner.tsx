import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { externalSupabase, EXTERNAL_PROJECT_URL, hasValidKey } from '@/integrations/supabase/externalClient';
import QrScanner from '@/components/QrScanner';
import ScanResult, { ScanStatus } from '@/components/ScanResult';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, RefreshCw } from 'lucide-react';

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
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [result, setResult] = useState<{
    status: ScanStatus;
    name?: string;
    erpSku?: string;
    scannedAt?: string;
    errorMessage?: string;
    rawData?: any;
  } | null>(null);

  // Test connection on mount
  useEffect(() => {
    const test = async () => {
      if (!externalSupabase) {
        setConnectionStatus('❌ Anon Key missing — cannot connect');
        return;
      }
      try {
        const { count, error }: any = await externalSupabase
          .from('attendees')
          .select('*', { count: 'exact', head: true });
        if (error) {
          setConnectionStatus(`❌ ${error.message}`);
        } else {
          setConnectionStatus(`✅ Connected — ${count ?? 0} attendees`);
        }
      } catch (err: any) {
        setConnectionStatus(`❌ ${err.message}`);
      }
    };
    test();
  }, []);

  const handleScan = useCallback(async (uuid: string) => {
    setScanning(false);

    if (!externalSupabase) {
      setResult({
        status: 'error',
        errorMessage: 'Supabase Anon Key nije konfiguriran. Kontaktirajte administratora.',
        rawData: { key_set: false, url: EXTERNAL_PROJECT_URL },
      });
      return;
    }

    try {
      const { data: attendee, error }: any = await externalSupabase
        .from('attendees')
        .select('*')
        .eq('id', uuid)
        .maybeSingle();

      if (error) {
        setResult({
          status: 'error',
          errorMessage: `${error.message} | code: ${error.code} | hint: ${error.hint || 'none'}`,
          rawData: { error },
        });
        return;
      }

      if (!attendee) {
        setResult({
          status: 'not_found',
          errorMessage: `Karta nije pronađena u congressOS bazi (ID: ${uuid})`,
          rawData: { queried_id: uuid, project: EXTERNAL_PROJECT_URL, result: null },
        });
        return;
      }

      const isPaid = ['paid', 'approved'].includes(attendee.payment_status?.toLowerCase());

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

      const { error: updateError }: any = await (externalSupabase as any)
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
      {/* Debug: Connection status */}
      <div className="bg-muted px-3 py-1 text-[11px] font-mono text-muted-foreground z-30 relative">
        Connected to: {EXTERNAL_PROJECT_URL} | Key: {hasValidKey ? '✅' : '❌'} | {connectionStatus}
      </div>

      <div className="absolute top-12 right-4 z-10 flex gap-2">
        <Button variant="ghost" size="icon" onClick={handleResetCamera} className="text-muted-foreground hover:text-foreground" title="Reset Camera">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <QrScanner key={scannerKey} onScan={handleScan} active={scanning} />

      {/* Manual test input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-20">
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
