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
    attendee?: any;
    errorMessage?: string;
  } | null>(null);

  useEffect(() => {
    const test = async () => {
      if (!externalSupabase) {
        setConnectionStatus('❌ Key missing');
        return;
      }
      try {
        const { count, error }: any = await externalSupabase
          .from('attendees')
          .select('*', { count: 'exact', head: true });
        setConnectionStatus(error ? `❌ ${error.message}` : `✅ ${count ?? 0} attendees`);
      } catch (err: any) {
        setConnectionStatus(`❌ ${err.message}`);
      }
    };
    test();
  }, []);

  const handleScan = useCallback(async (uuid: string) => {
    setScanning(false);

    if (!externalSupabase) {
      setResult({ status: 'error', errorMessage: 'Supabase nije konfiguriran.' });
      return;
    }

    try {
      // 1. Fetch attendee
      const { data: attendee, error: attErr }: any = await externalSupabase
        .from('attendees')
        .select('*')
        .eq('id', uuid)
        .maybeSingle();

      if (attErr) {
        setResult({ status: 'error', errorMessage: `${attErr.message} (${attErr.code})` });
        return;
      }
      if (!attendee) {
        setResult({ status: 'not_found', errorMessage: `Karta nije pronađena u congressOS bazi (ID: ${uuid})` });
        return;
      }

      // 2. Fetch event title
      let eventTitle = attendee.event_id || '';
      if (attendee.event_id) {
        const { data: evt }: any = await externalSupabase
          .from('events')
          .select('title')
          .eq('id', attendee.event_id)
          .maybeSingle();
        if (evt?.title) eventTitle = evt.title;
      }

      // 3. Fetch most recent order
      const { data: order }: any = await externalSupabase
        .from('orders')
        .select('*')
        .eq('attendee_id', uuid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. Fetch order items with service names
      let serviceNames: string[] = [];
      let orderStatus = order?.status || '';
      if (order) {
        const { data: items }: any = await externalSupabase
          .from('order_items')
          .select('*, event_services(name)')
          .eq('order_id', order.id);
        if (items) {
          serviceNames = items.map((item: any) => item.event_services?.name || item.service_id).filter(Boolean);
        }
      }

      // Build enriched attendee object
      const enriched = {
        ...attendee,
        eventTitle,
        orderStatus,
        serviceNames,
        orderId: order?.id,
      };

      if (attendee.scanned_at) {
        setResult({ status: 'already_scanned', attendee: enriched });
        return;
      }

      const isPaid = ['paid', 'approved', 'completed'].includes(orderStatus?.toLowerCase());
      setResult({ status: isPaid ? 'found_paid' : 'found_unpaid', attendee: enriched });

      if (isPaid) playSuccessSound();
    } catch (err: any) {
      setResult({ status: 'error', errorMessage: err.message || 'Unknown error' });
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
        attendee={result.attendee}
        errorMessage={result.errorMessage}
        onScanNext={handleScanNext}
      />
    );
  }

  return (
    <div className="relative">
      <div className="bg-muted px-3 py-1 text-[11px] font-mono text-muted-foreground z-30 relative">
        {EXTERNAL_PROJECT_URL} | {hasValidKey ? '✅' : '❌'} | {connectionStatus}
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

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-20">
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-sm mx-auto">
          <Input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Paste attendee UUID..."
            className="text-xs"
          />
          <Button type="submit" size="sm">Test</Button>
        </form>
      </div>
    </div>
  );
};

export default Scanner;
