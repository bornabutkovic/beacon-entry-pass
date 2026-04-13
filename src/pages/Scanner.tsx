import { useState, useCallback, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EXTERNAL_PROJECT_URL, hasValidKey } from '@/integrations/supabase/externalClient';
import { lookupTicket } from '@/lib/scanTicket';
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

type ViewState = 'scanning' | 'fetching' | 'result';

const Scanner = () => {
  const { user, loading, signOut } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('scanning');
  const [scannerKey, setScannerKey] = useState(0);
  const [manualId, setManualId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const isProcessing = useRef(false);
  const [result, setResult] = useState<{
    status: ScanStatus;
    attendee?: any;
    errorMessage?: string;
  } | null>(null);

  useEffect(() => {
    const test = async () => {
      if (!hasValidKey) {
        setConnectionStatus('❌ Key missing');
        return;
      }
      try {
        setConnectionStatus('✅ Connected');
      } catch (err: any) {
        setConnectionStatus(`❌ ${err.message}`);
      }
    };
    test();
  }, []);

  const handleAttendeeLookup = useCallback(async (id: string) => {
    console.log('Scanned ID:', id);

    if (isProcessing.current) {
      console.log('Already processing, skipping:', id);
      return;
    }
    isProcessing.current = true;

    setViewState('fetching');

    if (id === '__INVALID__') {
      setResult({ status: 'error', errorMessage: 'Invalid QR Code Format. The scanned code does not contain a valid attendee ID.' });
      setViewState('result');
      isProcessing.current = false;
      return;
    }

    try {
      const data = await lookupTicket(id);

      if (data.status === 'not_found') {
        setResult({ status: 'not_found', errorMessage: `Ticket not found in the database (ID: ${id})` });
        setViewState('result');
        return;
      }

      const status: ScanStatus = data.status;
      setResult({ status, attendee: data.attendee });
      setViewState('result');

      if (status === 'found_paid') playSuccessSound();
    } catch (err: any) {
      console.error('Lookup error:', err);
      setResult({ status: 'error', errorMessage: err.message || 'Unknown error' });
      setViewState('result');
    } finally {
      isProcessing.current = false;
    }
  }, []);

  const handleScanNext = () => {
    setResult(null);
    isProcessing.current = false;
    setScannerKey((k) => k + 1);
    setViewState('scanning');
  };

  const handleResetCamera = () => {
    isProcessing.current = false;
    setScannerKey((k) => k + 1);
    setViewState('scanning');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (id) handleAttendeeLookup(id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (viewState === 'fetching') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'hsl(263 70% 58%)', borderTopColor: 'transparent' }}
        />
        <p className="text-muted-foreground font-medium font-[Poppins]">Verifying Ticket...</p>
      </div>
    );
  }

  if (viewState === 'result' && result) {
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
    <div className="relative bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: 'hsl(222 47% 8%)' }}>
        <div className="flex items-center gap-2">
          <img src="/conwayo-logo.png" alt="Conwayo" style={{ height: '36px', objectFit: 'contain' }} />
          <span className="text-muted-foreground text-sm font-medium">Scanner</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleResetCamera} className="text-muted-foreground hover:text-white">
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <QrScanner key={scannerKey} onScan={handleAttendeeLookup} active={viewState === 'scanning'} />

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-20">
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-sm mx-auto">
          <Input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Paste attendee UUID..."
            className="text-xs bg-input border-border text-white placeholder:text-muted-foreground focus:border-primary"
          />
          <Button
            type="submit"
            size="sm"
            className="text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, hsl(187 94% 43%), hsl(263 70% 58%), hsl(330 81% 60%))' }}
          >
            Test
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Scanner;
