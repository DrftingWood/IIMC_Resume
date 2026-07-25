-- Reference data. Must stay in step with src/lib/universities.ts — the client
-- copy drives UI grouping, this one is authoritative for membership.

insert into public.universities (id, name, short_name, country) values
  ('iimc', 'Indian Institute of Management Calcutta', 'IIM Calcutta', 'IN')
on conflict (id) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      country = excluded.country;

insert into public.university_domains (university_id, domain) values
  ('iimc', 'iimcal.ac.in')
on conflict do nothing;
