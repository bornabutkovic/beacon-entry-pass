import { useCallback, useEffect, useRef, useState } from 'react';
import QrScanner from '@/components/QrScanner';
import EventScanResult, { type EventScanStatus } from '@/components/EventScanResult';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search } from 'lucide-react';
import {
  clearToken, getToken, lookup, search, stats, whoami,
  TokenInvalidError, type EventInfo, type ScannerAttendee,
} from '@/lib/scannerApi';

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
  } catch {}
};

type View = 'loading' | 'invalid' | 'scanning' | 'fetching' | 'result';
type SearchResult = { id: string; name: string; scanned: boolean; cancelled: boolean };

const InvalidScreen = ({ message }: { message: string }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center gap-6">
    <img src="/conwayo-logo.png" alt="Conwayo" style={{ height: '48px', objectFit: 'contain' }} />
    <p className="text-xl font-semibold text-foreground font-[Poppins]">{message}</p>
    <p className="text-base text-muted-foreground">Zatražite novi link od organizatora.</p>
  </div>
);

const EventScanner = () => {
  const [view, setView] = useState<View>('loading');
  const [invalidMsg, setInvalidMsg] = useState('Link za skeniranje nije valjan.');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [counter, setCounter] = useState<{ checked_in: number; total: number } | null>(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [result, setResult] = useState<{ status: EventScanStatus; attendee?: ScannerAttendee } | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const processing = useRef(false);

  const handleTokenError = useCallback((err: unknown) => {
    if (err instanceof TokenInvalidError) {
      clearToken();
      setInvalidMsg('Link je istekao ili je opozvan.');
      setView('invalid');
      return true;
    }
    return false;
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setCounter(await stats());
    } catch (err) {
      handleTokenError(err);
    }
  }, [handleTokenError]);

  useEffect(() => {
    if (!getToken()) {
      setInvalidMsg('Link za skeniranje nije valjan.');
      setView('invalid');
      return;
    }
    (async () => {
      try {
        const res = await whoami();
        setEvent(res.event);
        setView('scanning');
        refreshStats();
      } catch (err) {
        if (!handleTokenError(err)) {
          setInvalidMsg('Greška pri povezivanju. Pokušajte ponovno.');
          setView('invalid');
        }
      }
    })();
  }, [handleTokenError, refreshStats]);

  useEffect(() => {
    if (!event) return;
    const id = setInterval(refreshStats, 30000);
    return () => clearInterval(id);
  }, [event, refreshStats]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await search(q);
        setResults(res.results || []);
      } catch (err) {
        handleTokenError(err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, handleTokenError]);

  const runLookup = useCallback(async (id: string) => {
    if (processing.current) return;
    processing.current = true;
    setView('fetching');

    if (id === '__INVALID__') {
      setResult({ status: 'invalid_qr' });
      setView('result');
      processing.current = false;
      return;
    }

    try {
      const data = await lookup(id);
      setResult({ status: data.status, attendee: data.attendee });
      setView('result');
      if (data.status === 'found_paid') playSuccessSound();
    } catch (err) {
      if (!handleTokenError(err)) {
        setResult({ status: 'error' });
        setView('result');
      }
    } finally {
      processing.current = false;
    }
  }, [handleTokenError]);

  const handleScanNext = useCallback(() => {
    setResult(null);
    setQuery('');
    setResults([]);
    processing.current = false;
    setScannerKey((k) => k + 1);
    setView('scanning');
  }, []);

  if (view === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Učitavanje...</div>
      </div>
    );
  }

  if (view === 'invalid') return <InvalidScreen message={invalidMsg} />;

  if (view === 'fetching') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'hsl(263 70% 58%)', borderTopColor: 'transparent' }}
        />
        <p className="text-muted-foreground font-medium font-[Poppins]">Provjera ulaznice...</p>
      </div>
    );
  }

  if (view === 'result' && result) {
    return (
      <EventScanResult
        key={result.attendee?.id ?? result.status}
        status={result.status}
        attendee={result.attendee}
        onScanNext={handleScanNext}
        onCheckedIn={refreshStats}
      />
    );
  }

  return (
    <div className="relative bg-background min-h-screen pb-40">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border"
        style={{ background: 'hsl(222 47% 8%)', paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img src="/conwayo-logo.png" alt="Conwayo" style={{ height: '32px', objectFit: 'contain' }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate font-[Poppins]">{event?.name}</p>
            {counter && (
              <p className="text-xs text-muted-foreground">
                Ušlo: <span className="text-foreground font-semibold">{counter.checked_in}</span> / {counter.total}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleScanNext} className="text-muted-foreground shrink-0">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <QrScanner key={scannerKey} onScan={runLookup} active={view === 'scanning'} />

      <div
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="max-w-md mx-auto space-y-2">
          {query.trim().length >= 3 && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background">
              {searching && results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Traženje...</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nema rezultata.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => runLookup(r.id)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left border-b border-border last:border-b-0 hover:bg-muted"
                  >
                    <span className="text-base text-foreground truncate">{r.name}</span>
                    {r.cancelled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900 text-white shrink-0">OTKAZANO</span>
                    ) : r.scanned ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black shrink-0">UŠAO</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Traži po imenu ili emailu"
              className="pl-9 h-12 text-base bg-input border-border text-foreground placeholder:text-muted-foreground"
              style={{ fontSize: '16px' }}
              inputMode="search"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventScanner;
