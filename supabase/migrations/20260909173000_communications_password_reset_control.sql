insert into public.communication_event_controls(event_type, channel, enabled)
values
  ('account.password_reset', 'email', true),
  ('account.password_reset', 'sms', false),
  ('account.password_reset', 'whatsapp', false)
on conflict (event_type, channel) do nothing;
