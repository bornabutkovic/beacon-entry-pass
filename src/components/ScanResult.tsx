import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export type ScanStatus = 'granted' | 'not_paid' | 'already_scanned' | 'not_found' | 'error';

interface ScanResultProps {
  status: ScanStatus;
  name?: string;
  erpSku?: string;
  scannedAt?: string;
  errorMessage?: string;
  onScanNext: () => void;
}

const config: Record<ScanStatus, { bg: string; icon: React.ReactNode; title: string }> = {
  granted: {
    bg: 'bg-green-500',
    icon: <CheckCircle className="h-24 w-24 text-white" />,
    title: 'ACCESS GRANTED',
  },
  not_paid: {
    bg: 'bg-red-500',
    icon: <XCircle className="h-24 w-24 text-white" />,
    title: 'NOT PAID',
  },
  already_scanned: {
    bg: 'bg-yellow-500',
    icon: <AlertTriangle className="h-24 w-24 text-white" />,
    title: 'ALREADY SCANNED',
  },
  not_found: {
    bg: 'bg-red-500',
    icon: <XCircle className="h-24 w-24 text-white" />,
    title: 'NOT FOUND',
  },
  error: {
    bg: 'bg-red-500',
    icon: <XCircle className="h-24 w-24 text-white" />,
    title: 'ERROR',
  },
};

const ScanResult = ({ status, name, erpSku, scannedAt, errorMessage, onScanNext }: ScanResultProps) => {
  const { bg, icon, title } = config[status];

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${bg} p-6 text-white`}>
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        {icon}
        <h1 className="text-4xl font-black tracking-wider text-center">{title}</h1>

        {name && (
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold">{name}</p>
            {erpSku && <p className="text-lg opacity-90">SKU: {erpSku}</p>}
          </div>
        )}

        {status === 'already_scanned' && scannedAt && (
          <p className="text-sm opacity-80">
            Scanned at: {new Date(scannedAt).toLocaleString()}
          </p>
        )}

        {status === 'error' && errorMessage && (
          <p className="text-sm opacity-80">{errorMessage}</p>
        )}

        <Button
          onClick={onScanNext}
          variant="outline"
          className="mt-6 text-lg px-8 py-6 bg-white/20 border-white text-white hover:bg-white/30 hover:text-white"
        >
          Scan Next
        </Button>
      </div>
    </div>
  );
};

export default ScanResult;
