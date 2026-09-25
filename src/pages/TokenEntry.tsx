import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setToken } from '@/lib/scannerApi';

const TokenEntry = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) setToken(token);
    navigate('/scan', { replace: true });
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Učitavanje...</div>
    </div>
  );
};

export default TokenEntry;
