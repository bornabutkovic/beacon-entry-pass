import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import QrScanner from '@/components/QrScanner';
import ScanResult, { ScanStatus } from '@/components/ScanResult';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, RefreshCw } from 'lucide-react';

// Force the external Supabase URL
const FORCED_URL = 'https://yqusqfdaikkvvjflgmmh.supabase.co';
const ENV_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const ENV_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;

// Lazy-init to avoid crash if key is missing
let _client: ReturnType<typeof createClient> | null = null;
const getClient = () => {
  if (!_client && ENV_KEY) {
    _client = createClient(FORCED_URL, ENV_KEY);
  }
  return _client;
};

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
  const [debugInfo, setDebugInfo] = useState<{
    tableCheck: string;
    rowCount: string;
    envSync: string;
    lastError: string;
  }>({ tableCheck: 'Checking...', rowCount: 'Checking...', envSync: 'Checking...', lastError: 'None' });
  const [result, setResult] = useState<{
    status: ScanStatus;
    name?: string;
    erpSku?: string;
    scannedAt?: string;
    errorMessage?: string;
    rawData?: any;
  } | null>(null);

  // Run connection diagnostics on mount
  useEffect(() => {
    const runDiagnostics = async () => {
      // Check env sync
      const envSync = ENV_URL === FORCED_URL
        ? `✅ Env matches forced URL`
        : `⚠️ Env URL: ${ENV_URL || '(not set)'} — Using forced: ${FORCED_URL}`;
      
      // Try querying public.attendees
      try {
        const client = getClient();
        if (!client) {
          setDebugInfo({
            tableCheck: '❌ Cannot connect — Anon Key missing',
            rowCount: 'N/A',
            envSync,
            lastError: 'VITE_EXTERNAL_SUPABASE_ANON_KEY is not set',
          });
          return;
        }
        const { count, error } = await client
          .from('attendees')
          .select('*', { count: 'exact', head: true });

        if (error) {
          setDebugInfo({
            tableCheck: `❌ Error querying public.attendees`,
            rowCount: 'N/A',
            envSync,
            lastError: `${error.message} (code: ${error.code}, details: ${error.details}, hint: ${error.hint})`,
          });
        } else {
          setDebugInfo({
            tableCheck: '✅ public.attendees accessible',
            rowCount: `${count ?? 0} rows`,
            envSync,
            lastError: 'None',
          });
        }
      } catch (err: any) {
        setDebugInfo({
          tableCheck: '❌ Connection failed',
          rowCount: 'N/A',
          envSync,
          lastError: err.message || String(err),
        });
      }
    };
    runDiagnostics();
  }, []);

  const handleScan = useCallback(async (uuid: string) => {
    setScanning(false);

    try {
      const client = getClient();
      if (!client) {
        setResult({ status: 'error', errorMessage: 'Anon Key not configured — cannot connect to external database', rawData: { ENV_KEY: '(not set)' } });
        return;
      }
      const { data: attendee, error }: any = await client
        .from('attendees')
        .select('*')
        .eq('id', uuid)
        .maybeSingle();

      if (error) {
        const fullError = `${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`;
        setDebugInfo(prev => ({ ...prev, lastError: fullError }));
        setResult({ status: 'error', errorMessage: fullError, rawData: { error } });
        return;
      }

      if (!attendee) {
        const msg = `No row found for id="${uuid}" in public.attendees at ${FORCED_URL}`;
        setDebugInfo(prev => ({ ...prev, lastError: msg }));
        setResult({ status: 'not_found', errorMessage: msg, rawData: { queried_id: uuid, result: null, project: FORCED_URL } });
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

      const { error: updateError }: any = await (client as any)
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

      {/* Manual test input */}
      <div className="fixed bottom-[220px] left-0 right-0 bg-background border-t p-3 z-20">
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

      {/* Connection Debug Info */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-green-400 font-mono text-[10px] p-3 z-20 space-y-1 max-h-[200px] overflow-auto">
        <p className="text-yellow-400 font-bold text-xs mb-1">🔧 Connection Debug Info</p>
        <p><span className="text-gray-400">Project URL:</span> {FORCED_URL}</p>
        <p><span className="text-gray-400">Env VITE_EXTERNAL_SUPABASE_URL:</span> {ENV_URL || '(not set)'}</p>
        <p><span className="text-gray-400">Anon Key:</span> {ENV_KEY ? `${ENV_KEY.substring(0, 20)}...` : '❌ NOT SET'}</p>
        <p><span className="text-gray-400">Table Check:</span> {debugInfo.tableCheck}</p>
        <p><span className="text-gray-400">Row Count:</span> {debugInfo.rowCount}</p>
        <p><span className="text-gray-400">Environment Sync:</span> {debugInfo.envSync}</p>
        <p><span className="text-gray-400">Last Error:</span> <span className="text-red-400">{debugInfo.lastError}</span></p>
      </div>
    </div>
  );
};

export default Scanner;
