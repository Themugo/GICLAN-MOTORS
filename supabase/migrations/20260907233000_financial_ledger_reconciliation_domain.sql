-- KAYAD Financial Ledger & Reconciliation Domain
-- Canonicalizes financial audit/reconciliation persistence around the append-only ledger.

CREATE TABLE IF NOT EXISTS public.reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed')),
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  reconciled INTEGER NOT NULL DEFAULT 0,
  unreconciled INTEGER NOT NULL DEFAULT 0,
  matched INTEGER NOT NULL DEFAULT 0,
  unmatched INTEGER NOT NULL DEFAULT 0,
  missing INTEGER NOT NULL DEFAULT 0,
  overpaid INTEGER NOT NULL DEFAULT 0,
  underpaid INTEGER NOT NULL DEFAULT 0,
  financials JSONB NOT NULL DEFAULT '{}'::jsonb,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  financial_integrity_score NUMERIC(6,2),
  success_rate NUMERIC(6,2),
  duration INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time >= start_time),
  CHECK (total_transactions >= 0),
  CHECK (reconciled >= 0 AND unreconciled >= 0),
  CHECK (matched >= 0 AND unmatched >= 0 AND missing >= 0 AND overpaid >= 0 AND underpaid >= 0)
);

CREATE TABLE IF NOT EXISTS public.reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report UUID NOT NULL REFERENCES public.reconciliation_reports(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  expected_type TEXT,
  expected_id TEXT,
  expected_model TEXT,
  expected_amount NUMERIC,
  actual_type TEXT,
  actual_id TEXT,
  actual_model TEXT,
  actual_amount NUMERIC,
  outcome TEXT NOT NULL CHECK (outcome IN ('matched','unmatched','missing','overpaid','underpaid')),
  amount_difference NUMERIC NOT NULL DEFAULT 0,
  status_match BOOLEAN,
  status_expected TEXT,
  status_actual TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_created_at ON public.reconciliation_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_type_status ON public.reconciliation_reports(report_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_report_outcome ON public.reconciliation_records(report, outcome, resolved);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_expected ON public.reconciliation_records(expected_id, expected_model);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_actual ON public.reconciliation_records(actual_id, actual_model);

ALTER TABLE public.reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.reconciliation_reports FROM anon, authenticated;
REVOKE ALL ON TABLE public.reconciliation_records FROM anon, authenticated;
GRANT ALL ON TABLE public.reconciliation_reports TO service_role;
GRANT ALL ON TABLE public.reconciliation_records TO service_role;

DROP POLICY IF EXISTS reconciliation_reports_service_only ON public.reconciliation_reports;
CREATE POLICY reconciliation_reports_service_only ON public.reconciliation_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reconciliation_records_service_only ON public.reconciliation_records;
CREATE POLICY reconciliation_records_service_only ON public.reconciliation_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.kayad_touch_reconciliation_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reconciliation_reports_updated_at ON public.reconciliation_reports;
CREATE TRIGGER trg_reconciliation_reports_updated_at
BEFORE UPDATE ON public.reconciliation_reports
FOR EACH ROW EXECUTE FUNCTION public.kayad_touch_reconciliation_report();

COMMENT ON TABLE public.reconciliation_reports IS 'Canonical KAYAD financial reconciliation run and issue summary.';
COMMENT ON TABLE public.reconciliation_records IS 'Canonical per-record reconciliation evidence linked to a reconciliation report.';
