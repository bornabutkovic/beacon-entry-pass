import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, AlertTriangle, Clock, Ticket } from 'lucide-react';
import { checkin, type LookupStatus, type ScannerAttendee } from '@/lib/scannerApi';

export type EventScanStatus = LookupStatus | 'error';

interface Props {
  status: EventScanStatus;
  attendee?: ScannerAttendee;
  onScanNext: () => void;
  onCheckedIn?: () => void;
}

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
};

const config: Record<EventScanStatus, { bg: string; icon: any; label: string }> = {
  found_paid: { bg: 'bg-emerald-600', icon: CheckCircle, label: 'ODOBRENO' },
  found_invoiced: { bg: 'bg-amber-500', icon: AlertTriangle, label: 'RAČUN IZDAN – NIJE PLAĆENO' },
  found_unpaid: { bg: 'bg-red-600', icon: XCircle, label: 'NIJE PLAĆENO – ULAZ ODBIJEN' },
  already_scanned: { bg: 'bg-amber-500', icon: AlertTriangle, label: 'VEĆ SKENIRANO' },
  cancelled: { bg: 'bg-red-900', icon: XCircle, label: 'OTKAZANO – ULAZ ODBIJEN' },
  wrong_event: { bg: 'bg-red-900', icon: XCircle, label: 'ULAZNICA ZA DRUGI DOGAĐAJ' },
  not_found: { bg: 'bg-muted', icon: XCircle, label: 'ULAZNICA NIJE PRONAĐENA' },
  invalid_qr: { bg: 'bg-muted', icon: XCircle, label: 'ULAZNICA NIJE PRONAĐENA' },
  error: { bg: 'bg-muted', icon: XCircle, label: 'GREŠKA – POKUŠAJTE PONOVNO' },
};

const EventScanResult = ({ status: initialStatus, attendee, onScanNext, onCheckedIn }: Props) => {
  const [status, setStatus] = useState<EventScanStatus>(initialStatus);
  const [scannedAt, setScannedAt] = useState<string | null | undefined>(attendee?.scanned_at);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!confirmed) return;
    const t = setTimeout(onScanNext, 1200);
    return () => clearTimeout(t);
  }, [confirmed, onScanNext]);

  const doCheckin = async (override: boolean) => {
    if (!attendee?.id) return;
    setBusy(true);
    setErr('');
    try {
      const res = await checkin(attendee.id, override);
      if (res.ok) {
        setConfirmed(true);
        try { navigator.vibrate?.(100); } catch {}
        onCheckedIn?.();
      } else if (res.reason === 'already_scanned') {
        setScannedAt(res.scanned_at ?? scannedAt);
        setStatus('already_scanned');
      } else if (res.reason === 'cancelled') setStatus('cancelled');
      else if (res.reason === 'wrong_event') setStatus('wrong_event');
      else if (res.reason === 'not_found') setStatus('not_found');
      else if (res.reason === 'unpaid') setStatus('found_unpaid');
    } catch {
      setErr('Greška – pokušajte ponovno.');
    } finally {
      setBusy(false);
    }
  };

  const c = config[status];
  const Icon = c.icon;
  const name = [attendee?.first_name, attendee?.last_name].filter(Boolean).join(' ');
  const services = attendee?.services || [];
  const showAttendee = !['not_found', 'invalid_qr', 'error'].includes(status) && !!attendee;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className={`${c.bg} px-5 py-8 text-center space-y-3`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}>
        <Icon className="h-16 w-16 text-white mx-auto" />
        <h1 className="text-3xl font-black text-white tracking-wide font-[Poppins] leading-tight">{c.label}</h1>
      </div>

      <div className="flex-1 flex flex-col p-5 max-w-md w-full mx-auto space-y-4">
        {showAttendee && name && (
          <p className="text-3xl font-bold text-foreground font-[Poppins] text-center break-words">{name}</p>
        )}

        {status === 'found_invoiced' && (
          <p className="text-base text-muted-foreground text-center">
            Sudionik je prijavljen na račun, uplata još nije evidentirana.
          </p>
        )}

        {status === 'already_scanned' && scannedAt && (
          <div className="rounded-2xl bg-card border border-border py-4 px-5 flex items-center justify-center gap-3">
            <Clock className="h-6 w-6 text-amber-500" />
            <p className="text-xl font-semibold text-foreground">Ušao: {formatTime(scannedAt)}</p>
          </div>
        )}

        {status === 'wrong_event' && attendee?.otherEvent && (
          <div className="rounded-2xl bg-card border border-border py-4 px-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Ulaznica vrijedi za</p>
            <p className="text-xl font-semibold text-foreground">{attendee.otherEvent}</p>
          </div>
        )}

        {showAttendee && services.length > 0 && (
          <div className="rounded-2xl bg-card border border-border py-4 px-5 space-y-2">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usluge</p>
            </div>
            <ul className="space-y-2">
              {services.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                  <span className="text-lg text-foreground leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {err && <p className="text-destructive text-center">{err}</p>}

        <div className="flex-1 min-h-4" />

        <div className="space-y-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {confirmed ? (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-5 text-center">
              <p className="text-emerald-400 font-bold text-2xl">✓ Ulaz potvrđen</p>
            </div>
          ) : status === 'found_paid' ? (
            <>
              <Button
                onClick={() => doCheckin(false)}
                disabled={busy}
                className="w-full h-16 text-xl font-bold font-[Poppins] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {busy ? 'Potvrđujem...' : '✓ POTVRDI ULAZ'}
              </Button>
              <Button onClick={onScanNext} variant="ghost" className="w-full h-12 text-base text-muted-foreground">
                Vrati na skeniranje
              </Button>
            </>
          ) : status === 'found_invoiced' ? (
            <>
              <Button onClick={onScanNext} className="w-full h-16 text-xl font-bold font-[Poppins]">
                Vrati na skeniranje
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(true)}
                disabled={busy}
                className="w-full h-14 text-base font-semibold border-amber-500 text-amber-500 bg-transparent hover:bg-amber-500/10"
              >
                Pusti unutra (račun izdan)
              </Button>
            </>
          ) : (
            <Button onClick={onScanNext} className="w-full h-16 text-xl font-bold font-[Poppins]">
              Vrati na skeniranje
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potvrđujete ulaz bez evidentirane uplate?</AlertDialogTitle>
            <AlertDialogDescription>Sudionik je prijavljen na račun.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={() => doCheckin(true)}>Potvrdi ulaz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventScanResult;
