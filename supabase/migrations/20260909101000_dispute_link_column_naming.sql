DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='escrows' AND column_name='disputeinspectionid') THEN ALTER TABLE public.escrows RENAME COLUMN disputeinspectionid TO "disputeInspectionId"; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='escrows' AND column_name='disputechatid') THEN ALTER TABLE public.escrows RENAME COLUMN disputechatid TO "disputeChatId"; END IF;
END $$;
