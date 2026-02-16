import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, User, Ticket, Clock } from 'lucide-react';
import { externalSupabase } from '@/integrations/supabase/externalClient';

export type ScanStatus = 'found_paid' | 'found_unpaid' | 'already_scanned' | 'not_found' | 'error';

interface ScanResultProps {
  status: ScanStatus;
  attendee?: any;
  errorMessage?: string;
  onScanNext: () => void;
  onConfirmed?: () => void;
}

const getDisplayName = (attendee: any): string => {
  if (attendee?.first_name || attendee?.last_name) {
    return [attendee.first_name, attendee.last_name].filter(Boolean).join(' ');
  }
  return attendee?.name || 'Nepoznato';
};

const ScanResult = ({ status, attendee, errorMessage, onScanNext, onConfirmed }: ScanResultProps) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const displayName = getDisplayName(attendee);
  const email = attendee?.email || '';
  const eventTitle = attendee?.eventTitle || '';
  const venueName = attendee?.venueName || '';
  const services: string[] = attendee?.serviceNames || [];
  const orderStatus = attendee?.orderStatus || '';
  const isPaid = ['paid', 'approved', 'completed'].includes(orderStatus?.toLowerCase()) || status === 'already_scanned';

  const handleConfirm = async () => {
    if (!externalSupabase || !attendee?.id) return;
    setConfirming(true);
    setConfirmError('');
    try {
      const { error }: any = await (externalSupabase as any)
        .from('attendees')
        .update({ scanned_at: new Date().toISOString() })
        .eq('id', attendee.id);
      if (error) {
        setConfirmError(error.message);
      } else {
        setConfirmed(true);
        onConfirmed?.();
        // Auto-reset to camera after short delay
        setTimeout(() => onScanNext(), 1500);
      }
    } catch (err: any) {
      setConfirmError(err.message || 'Greška pri ažuriranju');
    } finally {
      setConfirming(false);
    }
  };

  // --- Not Found / Error ---
  if (status === 'not_found' || status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {status === 'not_found' ? 'KARTA NIJE PRONAĐENA' : 'GREŠKA'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {errorMessage || 'Karta nije pronađena u congressOS bazi.'}
          </p>
          <Button onClick={onScanNext} className="w-full h-14 text-lg">
            Skeniraj Sljedeći
          </Button>
        </div>
      </div>
    );
  }

  // --- Status Header ---
  const headerConfig = {
    found_paid: { bg: 'bg-emerald-500', icon: CheckCircle, label: 'ODOBRENO' },
    found_unpaid: { bg: 'bg-destructive', icon: XCircle, label: 'NA ČEKANJU' },
    already_scanned: { bg: 'bg-amber-500', icon: AlertTriangle, label: 'VEĆ SKENIRANO' },
  } as const;

  const header = headerConfig[status as keyof typeof headerConfig];
  const HeaderIcon = header.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col p-5">
      <div className="max-w-sm w-full mx-auto space-y-4 flex-1 flex flex-col">

        {/* Status Header with Event Title */}
        <div className={`rounded-2xl ${header.bg} p-6 text-center space-y-2`}>
          <HeaderIcon className="h-14 w-14 text-white mx-auto" />
          <h1 className="text-2xl font-black text-white tracking-wide">{header.label}</h1>
          {eventTitle && <p className="text-white/80 text-sm font-medium">{eventTitle}</p>}
        </div>

        {/* Attendee Identity */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-foreground truncate">{displayName}</p>
                {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event & Venue Info */}
        {(eventTitle || venueName) && (
          <Card>
            <CardContent className="py-4 space-y-1">
              {eventTitle && (
                <p className="text-sm text-foreground"><span className="font-semibold text-muted-foreground">Događaj:</span> {eventTitle}</p>
              )}
              {venueName && (
                <p className="text-sm text-foreground"><span className="font-semibold text-muted-foreground">Lokacija:</span> {venueName}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Already scanned time */}
        {status === 'already_scanned' && attendee?.scanned_at && (
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Vrijeme ulaska</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(attendee.scanned_at).toLocaleString('hr-HR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchased Services */}
        {services.length > 0 && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kupljene usluge</p>
              </div>
              <ul className="space-y-2">
                {services.map((service: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    <span className="text-sm text-foreground leading-snug">{service}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {confirmError && (
          <p className="text-destructive text-sm text-center">{confirmError}</p>
        )}

        <div className="flex-1 min-h-4" />

        {/* Action Bar */}
        {isPaid && !confirmed && status !== 'already_scanned' ? (
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {confirming ? 'Potvrđivanje...' : '✓ POTVRDI ULAZ'}
          </Button>
        ) : confirmed ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-emerald-700 font-semibold text-sm">✓ Ulaz uspješno potvrđen</p>
            </div>
            <Button onClick={onScanNext} className="w-full h-14 text-lg font-bold">
              Skeniraj Sljedeći
            </Button>
          </div>
        ) : (
          <Button onClick={onScanNext} className="w-full h-14 text-lg font-bold">
            Skeniraj Sljedeći
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScanResult;