-- Governance lifecycle hardening.
-- The governance domain is backend-owned: the application uses its own
-- users/user_auth identity layer and the backend's service-role connection.
-- These constraints protect the data even if an application path is bypassed.

create extension if not exists pgcrypto;

-- State integrity.
alter table governance_policies drop constraint if exists governance_policies_status_check;
alter table governance_policies add constraint governance_policies_status_check
  check (status in ('draft','active','archived','retired'));
alter table governance_policies drop constraint if exists governance_policies_version_check;
alter table governance_policies add constraint governance_policies_version_check
  check (version > 0);

alter table change_requests drop constraint if exists change_requests_status_check;
alter table change_requests add constraint change_requests_status_check
  check (status in ('draft','pending','approved','rejected','implemented','cancelled'));

alter table approval_rules drop constraint if exists approval_rules_threshold_check;
alter table approval_rules add constraint approval_rules_threshold_check
  check (threshold is null or threshold >= 0);

alter table feature_lifecycles drop constraint if exists feature_lifecycles_stage_check;
alter table feature_lifecycles add constraint feature_lifecycles_stage_check
  check (stage in ('proposed','idea','planning','development','testing','uat','approved','pilot','production','deprecated','retired'));

alter table risk_assessments drop constraint if exists risk_assessments_severity_check;
alter table risk_assessments add constraint risk_assessments_severity_check
  check (severity in ('low','medium','high','critical'));
alter table risk_assessments drop constraint if exists risk_assessments_status_check;
alter table risk_assessments add constraint risk_assessments_status_check
  check (status in ('open','mitigating','accepted','resolved','closed'));

alter table enterprise_standards drop constraint if exists enterprise_standards_status_check;
alter table enterprise_standards add constraint enterprise_standards_status_check
  check (status in ('draft','active','approved','retired'));

alter table releases drop constraint if exists releases_status_check;
alter table releases add constraint releases_status_check
  check (status in ('planned','approved','scheduled','deployed','rolled_back','cancelled'));

alter table decision_registers drop constraint if exists decision_registers_status_check;
alter table decision_registers add constraint decision_registers_status_check
  check (status in ('active','superseded','archived'));

-- Useful lookup/operational indexes.
create index if not exists governance_changes_submitted_idx on change_requests(submitted_at desc);
create index if not exists governance_changes_reviewer_idx on change_requests(reviewed_by);
create index if not exists governance_risks_severity_status_idx on risk_assessments(severity, status);
create index if not exists governance_features_stage_idx on feature_lifecycles(stage);
create index if not exists governance_releases_planned_idx on releases(planned_at);
create index if not exists governance_decisions_decided_idx on decision_registers(decided_at desc);
create index if not exists governance_standards_status_idx on enterprise_standards(status);
create index if not exists governance_partners_type_status_idx on partner_requirements(partner_type, status);

-- Prevent accidental duplicate active configuration while allowing historical rows.
create unique index if not exists governance_country_rules_active_unique_idx
  on country_rules(country_code, name) where status = 'active';
create unique index if not exists governance_partner_requirements_active_unique_idx
  on partner_requirements(partner_type, name) where status = 'active';

-- Keep updated_at trustworthy for every governance write.
create or replace function governance_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists governance_policies_touch_updated_at on governance_policies;
create trigger governance_policies_touch_updated_at before update on governance_policies for each row execute function governance_touch_updated_at();
drop trigger if exists change_requests_touch_updated_at on change_requests;
create trigger change_requests_touch_updated_at before update on change_requests for each row execute function governance_touch_updated_at();
drop trigger if exists approval_rules_touch_updated_at on approval_rules;
create trigger approval_rules_touch_updated_at before update on approval_rules for each row execute function governance_touch_updated_at();
drop trigger if exists feature_lifecycles_touch_updated_at on feature_lifecycles;
create trigger feature_lifecycles_touch_updated_at before update on feature_lifecycles for each row execute function governance_touch_updated_at();
drop trigger if exists risk_assessments_touch_updated_at on risk_assessments;
create trigger risk_assessments_touch_updated_at before update on risk_assessments for each row execute function governance_touch_updated_at();
drop trigger if exists enterprise_standards_touch_updated_at on enterprise_standards;
create trigger enterprise_standards_touch_updated_at before update on enterprise_standards for each row execute function governance_touch_updated_at();
drop trigger if exists country_rules_touch_updated_at on country_rules;
create trigger country_rules_touch_updated_at before update on country_rules for each row execute function governance_touch_updated_at();
drop trigger if exists partner_requirements_touch_updated_at on partner_requirements;
create trigger partner_requirements_touch_updated_at before update on partner_requirements for each row execute function governance_touch_updated_at();
drop trigger if exists releases_touch_updated_at on releases;
create trigger releases_touch_updated_at before update on releases for each row execute function governance_touch_updated_at();
drop trigger if exists decision_registers_touch_updated_at on decision_registers;
create trigger decision_registers_touch_updated_at before update on decision_registers for each row execute function governance_touch_updated_at();
