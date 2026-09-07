-- Integration domain hardening: enforce safe lifecycle values and useful indexes.
alter table partner_organizations drop constraint if exists partner_organizations_status_check;
alter table partner_organizations add constraint partner_organizations_status_check check (status in ('active','suspended','disabled'));
alter table partner_applications drop constraint if exists partner_applications_status_check;
alter table partner_applications add constraint partner_applications_status_check check (status in ('pending','under_review','approved','rejected','suspended'));
alter table api_credentials drop constraint if exists api_credentials_status_check;
alter table api_credentials add constraint api_credentials_status_check check (status in ('active','revoked','expired'));
alter table webhook_configs drop constraint if exists webhook_configs_status_check;
alter table webhook_configs add constraint webhook_configs_status_check check (status in ('active','paused','disabled'));
alter table webhook_deliveries drop constraint if exists webhook_deliveries_status_check;
alter table webhook_deliveries add constraint webhook_deliveries_status_check check (status in ('pending','delivered','failed','retrying'));
create index if not exists idx_integration_usage_partner_created on api_usage_logs(partner_id, created_at desc);
create index if not exists idx_integration_delivery_status on webhook_deliveries(status, next_retry_at);
create index if not exists idx_integration_events_type_created on integration_events(event_type, created_at desc);
