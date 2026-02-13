
-- Create attendees table
CREATE TABLE public.attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  erp_sku TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read all attendees
CREATE POLICY "Staff can read attendees"
  ON public.attendees FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated staff can update attendees (for scanned_at)
CREATE POLICY "Staff can update attendees"
  ON public.attendees FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
