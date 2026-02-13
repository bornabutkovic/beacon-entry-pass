import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, User, Ticket, CreditCard, Clock } from 'lucide-react';
import { externalSupabase } from '@/integrations/supabase/externalClient';

export type ScanStatus = 'found_paid' | 'found_unpaid' | 'already_scanned' | 'not_found' | 'error';

interface ScanResultProps {
  status: ScanStatus;
  attendee?: any;
  errorMessage?: string;
  onScanNext: () => void;
  onConfirmed?: () => void;
}

const ScanResult = ({ status, attendee, errorMessage, onScanNext, onConfirmed }: ScanResultProps) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const name = attendee?.name || 'Nepoznato';
  const email = attendee?.email || '';
  const phone = attendee?.phone || '';
  const eventId = attendee?.event_id || attendee?.id?.substring(0, 8) || '';
  const paymentMethod = attendee?.payment_method || '';
  const services = attendee?.erp_sku
    ? attendee.erp_sku.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const isPaid = status === 'found_paid' || status === 'already_scanned';

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
      }
    } catch (err: any) {
      setConfirmError(err.message || 'Greška pri ažuriranju');
    } finally {
      setConfirming(false);
    }
  };

  // --- Not Found / Error states ---
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

  // --- Already Scanned ---
  if (status === 'already_scanned') {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6">
        <div className="max-w-sm w-full mx-auto space-y-6 flex-1 flex flex-col">
          {/* Status Badge */}
          <div className="rounded-2xl bg-amber-500 p-5 text-center space-y-2">
            <AlertTriangle className="h-12 w-12 text-white mx-auto" />
            <h1 className="text-2xl font-black text-white tracking-wide">VEĆ SKENIRANO</h1>
          </div>

          {/* Attendee Info */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{name}</p>
                  {email && <p className="text-sm text-muted-foreground">{email}</p>}
                  {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan time */}
          {attendee?.scanned_at && (
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Vrijeme skeniranja</p>
                  <p className="text-sm font-medium text-foreground">{new Date(attendee.scanned_at).toLocaleString('hr-HR')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services */}
          {services.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sadržaj karte</p>
                </div>
                <ul className="space-y-1.5">
                  {services.map((service: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{service}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex-1" />
          <Button onClick={onScanNext} className="w-full h-14 text-lg">
            Skeniraj Sljedeći
          </Button>
        </div>
      </div>
    );
  }

  // --- Found (paid or unpaid) ---
  const statusBg = isPaid ? 'bg-emerald-500' : 'bg-destructive';
  const statusTitle = isPaid ? 'ULAZ ODOBREN' : 'PLAĆANJE NIJE POTVRĐENO';
  const StatusIcon = isPaid ? CheckCircle : XCircle;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="max-w-sm w-full mx-auto space-y-5 flex-1 flex flex-col">
        {/* Status Badge */}
        <div className={`rounded-2xl ${statusBg} p-5 text-center space-y-2`}>
          <StatusIcon className="h-12 w-12 text-white mx-auto" />
          <h1 className="text-2xl font-black text-white tracking-wide">{statusTitle}</h1>
        </div>

        {/* Attendee Info */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{name}</p>
                {email && <p className="text-sm text-muted-foreground">{email}</p>}
                {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        {services.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sadržaj karte</p>
              </div>
              <ul className="space-y-1.5">
                {services.map((service: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-foreground">{service}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Meta Info */}
        {(eventId || paymentMethod) && (
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Info</p>
              </div>
              {eventId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Event ID</span>
                  <span className="text-foreground font-mono">{eventId}</span>
                </div>
              )}
              {paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Način plaćanja</span>
                  <span className="text-foreground">{paymentMethod}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {confirmError && (
          <p className="text-destructive text-sm text-center">{confirmError}</p>
        )}

        <div className="flex-1" />

        {/* Action Buttons */}
        {isPaid && !confirmed ? (
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {confirming ? 'Potvrđivanje...' : '✓ POTVRDI ULAZAK'}
          </Button>
        ) : confirmed ? (
          <div className="space-y-3">
            <div className="text-center text-emerald-600 font-semibold text-sm">✓ Ulazak potvrđen</div>
            <Button onClick={onScanNext} className="w-full h-14 text-lg">
              Skeniraj Sljedeći
            </Button>
          </div>
        ) : (
          <Button onClick={onScanNext} className="w-full h-14 text-lg">
            Skeniraj Sljedeći
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScanResult;
