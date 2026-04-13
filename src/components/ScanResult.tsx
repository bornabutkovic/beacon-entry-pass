import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, User, Ticket, Clock } from 'lucide-react';
import { checkinAttendee } from '@/lib/scanTicket';

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
  return attendee?.name || 'Unknown';
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
    if (!attendee?.id) return;
    setConfirming(true);
    setConfirmError('');
    try {
      await checkinAttendee(attendee.id);
      setConfirmed(true);
      onConfirmed?.();
      setTimeout(() => onScanNext(), 1500);
    } catch (err: any) {
      setConfirmError(err.message || 'Error updating record');
    } finally {
      setConfirming(false);
    }
  };

  // --- Not Found / Error ---
  if (status === 'not_found' || status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white font-[Poppins]">
            {status === 'not_found' ? 'TICKET NOT FOUND' : 'ERROR'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {errorMessage || 'This ticket was not found in the database.'}
          </p>
          <Button
            onClick={onScanNext}
            className="w-full h-14 text-lg text-white font-[Poppins] font-bold border border-primary bg-transparent hover:bg-primary/10"
          >
            Back to Scanner
          </Button>
        </div>
      </div>
    );
  }

  // --- Status Header ---
  const headerConfig = {
    found_paid: { bg: 'bg-emerald-500', icon: CheckCircle, label: 'APPROVED' },
    found_unpaid: { bg: 'bg-red-600', icon: XCircle, label: 'INVALID TICKET - UNPAID' },
    already_scanned: { bg: 'bg-amber-500', icon: AlertTriangle, label: 'ALREADY SCANNED' },
  } as const;

  const header = headerConfig[status as keyof typeof headerConfig];
  const HeaderIcon = header.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col p-5">
      <div className="max-w-sm w-full mx-auto space-y-4 flex-1 flex flex-col">

        {/* Status Header */}
        <div className={`rounded-2xl ${header.bg} p-6 text-center space-y-2`}>
          <HeaderIcon className="h-14 w-14 text-white mx-auto" />
          <h1 className="text-2xl font-black text-white tracking-wide font-[Poppins]">{header.label}</h1>
          {eventTitle && <p className="text-white/80 text-sm font-medium">{eventTitle}</p>}
        </div>

        {/* Attendee Identity */}
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-white truncate font-[Poppins]">{displayName}</p>
              {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
            </div>
          </div>
        </div>

        {/* Event & Venue Info */}
        {(eventTitle || venueName) && (
          <div className="rounded-2xl bg-card border border-border py-4 px-5 space-y-1">
            {eventTitle && (
              <p className="text-sm text-white"><span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Event:</span> {eventTitle}</p>
            )}
            {venueName && (
              <p className="text-sm text-white"><span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Venue:</span> {venueName}</p>
            )}
          </div>
        )}

        {/* Already scanned time */}
        {status === 'already_scanned' && attendee?.scanned_at && (
          <div className="rounded-2xl bg-card border border-border py-4 px-5 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Entry Time</p>
              <p className="text-sm font-medium text-white">
                {new Date(attendee.scanned_at).toLocaleString('hr-HR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        )}

        {/* Purchased Services */}
        {services.length > 0 && (
          <div className="rounded-2xl bg-card border border-border py-4 px-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purchased Services</p>
            </div>
            <ul className="space-y-2">
              {services.map((service: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                  <span className="text-sm text-white leading-snug">{service}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {confirmError && (
          <p className="text-destructive text-sm text-center">{confirmError}</p>
        )}

        <div className="flex-1 min-h-4" />

        {/* Action Bar */}
        {status === 'found_paid' && !confirmed ? (
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full h-14 text-lg text-white font-bold font-[Poppins]"
            style={{ background: 'linear-gradient(135deg, hsl(187 94% 43%), hsl(263 70% 58%), hsl(330 81% 60%))' }}
          >
            {confirming ? 'Confirming...' : '✓ CONFIRM ENTRY'}
          </Button>
        ) : confirmed ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
              <p className="text-emerald-400 font-semibold text-sm">✓ Check-in Successful</p>
            </div>
            <Button
              onClick={onScanNext}
              className="w-full h-14 text-lg font-bold font-[Poppins] text-white"
              style={{ background: 'linear-gradient(135deg, hsl(187 94% 43%), hsl(263 70% 58%), hsl(330 81% 60%))' }}
            >
              Scan Next
            </Button>
          </div>
        ) : (
          <Button
            onClick={onScanNext}
            className="w-full h-14 text-lg font-bold font-[Poppins] text-primary border border-primary bg-transparent hover:bg-primary/10"
          >
            Back to Scanner
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScanResult;
