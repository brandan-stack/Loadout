# Supabase Changelog

## Developer Update - July 2026

2026-07-09 · self-hosted, realtime, graphql, integrations, wrappers, multigres · [supabase.com/changelog/47796-developer-update-july-2026](https://supabase.com/changelog/47796-developer-update-july-2026)

Here's everything that happened with Supabase in the last month:  ## OpenCode integrates with Supabase  <img width="1200" height="630" alt="opencode-thumb"…

---

## log_connections is to be turned off by default for new projects and existing Free/Pro projects

2026-06-22 · [supabase.com/changelog/47197-log-connections-is-to-be-turned-off-by-default-for-new-projects-and-existing-fre](https://supabase.com/changelog/47197-log-connections-is-to-be-turned-off-by-default-for-new-projects-and-existing-fre)

We are changing the default value of the Postgres `log_connections` setting from on to off for new projects, and will be migrating all Free and Pro projects to the new default configuration. This…

---

## Self-hosted Supabase: API_EXTERNAL_URL to include /auth/v1

2026-06-18 · auth, self-hosted · [supabase.com/changelog/47093-self-hosted-supabase-api-external-url-to-include-auth-v1](https://supabase.com/changelog/47093-self-hosted-supabase-api-external-url-to-include-auth-v1)

---

## Realtime Broadcast now supports binary payloads

2026-06-11 · realtime · [supabase.com/changelog/46834-realtime-broadcast-now-supports-binary-payloads](https://supabase.com/changelog/46834-realtime-broadcast-now-supports-binary-payloads)

Realtime Broadcast can now send and receive binary payloads in addition to JSON. This lets you broadcast compact binary data without the overhead of JSON encoding.  Binary payloads are supported…

---

## Developer Update - June 2026

2026-06-06 · documentation, cli, auth, multigres · [supabase.com/changelog/46689-developer-update-june-2026](https://supabase.com/changelog/46689-developer-update-june-2026)

Here's everything that happened with Supabase in the last month:  ## Supabase Series F  <img width="1200" height="675" alt="supabase-series-f (1)"…

---

## Changes to Email Template Customisation on Free Tier

2026-06-03 · [supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)

For the past six months we've been tracking a steady increase in coordinated abuse of Supabase's free-tier email infrastructure. Bad actors were standing up free Supabase projects, rewriting the auth…

---

## Passkeys for Supabase Auth (Beta)

2026-05-28 · [supabase.com/changelog/46458-passkeys-for-supabase-auth-beta](https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta)

We're excited to announce the **beta release of Passkeys** for Supabase Auth — a passwordless, phishing-resistant credential built on the [WebAuthn](https://www.w3.org/TR/webauthn-3/) standard.…

---

## Feature Preview: Temporary token-based database access

2026-05-25 · database · [supabase.com/changelog/46346-feature-preview-temporary-token-based-database-access](https://supabase.com/changelog/46346-feature-preview-temporary-token-based-database-access)

---

## Breaking change in pg_graphql 1.6.0 — GraphQL introspection disabled by default

2026-05-25 · extensions, breaking-change, postgres · [supabase.com/changelog/46320-breaking-change-in-pg-graphql-1-6-0-graphql-introspection-disabled-by-default](https://supabase.com/changelog/46320-breaking-change-in-pg-graphql-1-6-0-graphql-introspection-disabled-by-default)

> **Edit 2026-06-13:** Rollout date pushed from 2026-06-15 to 2026-06-29 to allow additional AMI build verification. No other changes to the rollout plan.

---

## Self-hosted Supabase: making Analytics and Vector opt-in

2026-05-18 · self-hosted, analytics · [supabase.com/changelog/46084-self-hosted-supabase-making-analytics-and-vector-opt-in](https://supabase.com/changelog/46084-self-hosted-supabase-making-analytics-and-vector-opt-in)

---

## Self-hosted Supabase: switching Studio from supabase_admin to postgres (breaking change)

2026-05-18 · self-hosted, database, breaking-change · [supabase.com/changelog/46081-self-hosted-supabase-switching-studio-from-supabase-admin-to-postgres-breaking-c](https://supabase.com/changelog/46081-self-hosted-supabase-switching-studio-from-supabase-admin-to-postgres-breaking-c)

---

## Self-hosted Supabase: upgrading from PG 15 to 17 (breaking change)

2026-05-18 · self-hosted, database, breaking-change · [supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change](https://supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change)

---

## Deprecation Notice: Support for Postgres 14 ending on 1st July 2026

2026-05-12 · [supabase.com/changelog/45827-deprecation-notice-support-for-postgres-14-ending-on-1st-july-2026](https://supabase.com/changelog/45827-deprecation-notice-support-for-postgres-14-ending-on-1st-july-2026)

Supabase support for Postgres 14 is deprecated as of **1st July 2026** and support for it will be fully removed from this date on.  All projects still on a deprecated Postgres version on the **1st…

---

## Deprecation Notice: Dropping Support for Node.js 20

2026-05-08 · javascript · [supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20)

As part of our ongoing commitment to providing a secure and reliable experience for all developers, we will drop support for Node.js 20 in accordance with our [Support…

---

## Developer Update - May 2026

2026-05-07 · security, frontend, edge functions, postgrest, auth, database, breaking-change, wrappers, branching, sdk, postgres · [supabase.com/changelog/45702-developer-update-may-2026](https://supabase.com/changelog/45702-developer-update-may-2026)

Here's everything that happened with Supabase in the last month:  ## Custom OAuth/OIDC providers for Supabase Auth  <img width="1200" height="630" alt="customoidcproviders"…

---

## Breaking Change: OAuth token endpoint will return HTTP 200 instead of 201

2026-05-01 · integrations, breaking-change · [supabase.com/changelog/45468-breaking-change-oauth-token-endpoint-will-return-http-200-instead-of-201](https://supabase.com/changelog/45468-breaking-change-oauth-token-endpoint-will-return-http-200-instead-of-201)

---

## Breaking Change: Tables not exposed to Data and GraphQL API automatically

2026-04-28 · database, graphql, breaking-change · [supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

New tables in the public schema will no longer be exposed to the Data API automatically.  ## When this change takes effect  - Starting today (April 28, 2026), you can create new Supabase projects…

---

## Feature Preview: RLS Tester

2026-04-24 · frontend · [supabase.com/changelog/45233-feature-preview-rls-tester](https://supabase.com/changelog/45233-feature-preview-rls-tester)

---

## Automatic PostgREST retries for transient errors

2026-04-20 · python, javascript, supabase-flutter, swift · [supabase.com/changelog/45071-automatic-postgrest-retries-for-transient-errors](https://supabase.com/changelog/45071-automatic-postgrest-retries-for-transient-errors)

All official Supabase client libraries now automatically retry failed database queries when they encounter transient network errors — no code changes required.

---

## Upcoming: Tax Collection on Supabase Invoices

2026-04-17 · billing · [supabase.com/changelog/44968-upcoming-tax-collection-on-supabase-invoices](https://supabase.com/changelog/44968-upcoming-tax-collection-on-supabase-invoices)

We are changing how taxes are calculated on your Supabase invoices for your organizations.  **What's changing** Within the next several weeks, applicable taxes (such as sales tax, VAT, or GST)…

---

## [Public Alpha] Declarative Schema Management with pg-delta

2026-04-16 · cli · [supabase.com/changelog/44938-public-alpha-declarative-schema-management-with-pg-delta](https://supabase.com/changelog/44938-public-alpha-declarative-schema-management-with-pg-delta)

---

## Developer Update - April 2026

2026-04-09 · documentation, frontend, branching, multigres · [supabase.com/changelog/44713-developer-update-april-2026](https://supabase.com/changelog/44713-developer-update-april-2026)

Here’s everything that happened with Supabase in the last month:  ## Multigres Operator is now open source…

---

## Edge Functions rate limits on recursive/nested Edge Functions calls

2026-03-11 · edge functions · [supabase.com/changelog/43644-edge-functions-rate-limits-on-recursive-nested-edge-functions-calls](https://supabase.com/changelog/43644-edge-functions-rate-limits-on-recursive-nested-edge-functions-calls)

On Friday, March 06 2026, 08:00:00 UTC, we introduced a new rate limit on recursive/nested Edge Functions calls on the hosted platform.  ### What gets rate-limited?  Rate limiting applies to…

---

## Developer Update - March 2026

2026-03-05 · documentation, edge functions, storage, analytics, multigres · [supabase.com/changelog/43465-developer-update-march-2026](https://supabase.com/changelog/43465-developer-update-march-2026)

Here’s everything that happened with Supabase in the last month:  ## Webinar: Ship Fast, Stay Safe  <img width="1200" height="675" alt="agencywebinar"…

---

## Breaking Change: Removing access to OpenAPI spec via the anon key

2026-02-17 · postgrest, breaking-change · [supabase.com/changelog/42949-breaking-change-removing-access-to-openapi-spec-via-the-anon-key](https://supabase.com/changelog/42949-breaking-change-removing-access-to-openapi-spec-via-the-anon-key)

---

## Developer Update - February 2026

2026-02-05 · security, edge functions, ai · [supabase.com/changelog/42531-developer-update-february-2026](https://supabase.com/changelog/42531-developer-update-february-2026)

Here’s everything that happened with Supabase in the last month:  ## Supabase PrivateLink is now available  <img width="1200" height="630" alt="og"…

---

## Queue table Inserts, edits and deletes on the table editor

2026-02-04 · frontend · [supabase.com/changelog/42460-queue-table-inserts-edits-and-deletes-on-the-table-editor](https://supabase.com/changelog/42460-queue-table-inserts-edits-and-deletes-on-the-table-editor)

---

## Breaking Change: pg_graphql no longer enabled automatically (within approx 3 weeks from today)

2026-01-26 · breaking-change · [supabase.com/changelog/42180-breaking-change-pg-graphql-no-longer-enabled-automatically-within-approx-3-weeks](https://supabase.com/changelog/42180-breaking-change-pg-graphql-no-longer-enabled-automatically-within-approx-3-weeks)

In a  forthcoming release within approximately 3 weeks, `pg_graphql` will be disabled by default on new Supabase projects.  This change aligns `pg_graphql` with our security-first approach of…

---

## SQL snippets can now be saved in local Studio

2026-01-21 · cli, self-hosted · [supabase.com/changelog/42031-sql-snippets-can-now-be-saved-in-local-studio](https://supabase.com/changelog/42031-sql-snippets-can-now-be-saved-in-local-studio)

Saving SQL snippets now works in the local Studio!  This has been a top community request for a long time, and we’re happy to finally release it.  You can save SQL snippets directly while working…

---

## Developer Update - January 2026

2026-01-08 · documentation, security, frontend, python, ai · [supabase.com/changelog/41796-developer-update-january-2026](https://supabase.com/changelog/41796-developer-update-january-2026)

Here’s everything that happened with Supabase in the last month:  ## Update on security progress and roadmap  <img width="2400" height="1600" alt="security-roadmap"…

---

## Data API upgrade to PostgREST v14

2025-12-11 · postgrest · [supabase.com/changelog/41288-data-api-upgrade-to-postgrest-v14](https://supabase.com/changelog/41288-data-api-upgrade-to-postgrest-v14)

**Update**: v14 is now available worlwide :world_map:   Hey everyone, PostgREST v14 is now available for new projects on the `ap-northeast-1` region. Please try it out and give us your feedback!…

---

## Developer Update - December 2025

2025-12-10 · edge functions, auth, ai, analytics, infra, etl · [supabase.com/changelog/41231-developer-update-december-2025](https://supabase.com/changelog/41231-developer-update-december-2025)

Here’s everything that happened with Supabase in the last month. Be sure to keep reading for a special gift:  ## Supabase ETL <img width="1200" height="800" alt="etl"…

---

## [Public Alpha] Manage Vector Buckets from the dashboard

2025-11-26 · ai · [supabase.com/changelog/40815-public-alpha-manage-vector-buckets-from-the-dashboard](https://supabase.com/changelog/40815-public-alpha-manage-vector-buckets-from-the-dashboard)

---

## Dashboard Updates (101125 - 251125)

2025-11-24 · frontend · [supabase.com/changelog/40734-dashboard-updates-101125-251125](https://supabase.com/changelog/40734-dashboard-updates-101125-251125)

Another brief summary of changes that went into the dashboard over the past 2 weeks 🙂 🙏  ## Update to the Storage UI  <img width="1440" alt="image"…

---

## Notify users about security-sensitive actions on their accounts

2025-11-11 · security, auth · [supabase.com/changelog/40349-notify-users-about-security-sensitive-actions-on-their-accounts](https://supabase.com/changelog/40349-notify-users-about-security-sensitive-actions-on-their-accounts)

Letting users know about security-sensitive actions on their account is an increasingly common authentication feature.  We’re excited to announce an expansion of our email templates to handle these…

---

## [Public Alpha] Manage Analytics Buckets from the dashboard

2025-11-04 · frontend, storage, analytics · [supabase.com/changelog/40116-public-alpha-manage-analytics-buckets-from-the-dashboard](https://supabase.com/changelog/40116-public-alpha-manage-analytics-buckets-from-the-dashboard)

---

## Dashboard Updates (201025 - 031125)

2025-11-03 · frontend · [supabase.com/changelog/40083-dashboard-updates-201025-031125](https://supabase.com/changelog/40083-dashboard-updates-201025-031125)

Here's another brief summary of changes that went into the dashboard over the past 2 weeks 😄🙏  ## Upcoming: Storage UI update  <img width="1440" height="843" alt="image"…

---

## Enhanced Type Inference for Embedded Functions (Computed Relationships)

2025-10-22 · javascript · [supabase.com/changelog/39773-enhanced-type-inference-for-embedded-functions-computed-relationships](https://supabase.com/changelog/39773-enhanced-type-inference-for-embedded-functions-computed-relationships)

With `@supabase/supabase-js@2.75.1` and a CLI version **> 2.53.1**, the type-generation and runtime support for embedded functions / computed relationships has been improved. The introspection now…

---

## Dashboard Updates (061025 - 201025)

2025-10-21 · frontend · [supabase.com/changelog/39709-dashboard-updates-061025-201025](https://supabase.com/changelog/39709-dashboard-updates-061025-201025)

Another brief summary of changes that went into the dashboard over the past 2 weeks 🙂🙏  ## Update to the Authentication Users page  <img width="1278" height="485" alt="image"…

---

## Supabase Remote MCP server

2025-10-10 · mcp · [supabase.com/changelog/39434-supabase-remote-mcp-server](https://supabase.com/changelog/39434-supabase-remote-mcp-server)

---

## Potential breaking change in pgmq from 1.4.4 to 1.5.1 and temporary halt on upgrade for existing projects

2025-10-08 · postgres · [supabase.com/changelog/39378-potential-breaking-change-in-pgmq-from-1-4-4-to-1-5-1-and-temporary-halt-on-upgr](https://supabase.com/changelog/39378-potential-breaking-change-in-pgmq-from-1-4-4-to-1-5-1-and-temporary-halt-on-upgr)

We recently rolled out a change that updates pgmq version from 1.4.4 to 1.5.1 for new projects created with release version https://github.com/supabase/postgres/releases/tag/17.6.1.016 and newer.…

---

## Dashboard Updates (220925 - 061025)

2025-10-06 · frontend · [supabase.com/changelog/39292-dashboard-updates-220925-061025](https://supabase.com/changelog/39292-dashboard-updates-220925-061025)

Another brief summary of changes that went into the dashboard over the past 2 weeks, but before that...  ## Supabase Select just wrapped up over the weekend!  <img width="1200" height="650"…

---

## Supabase JS Client Libs: Migration to Monorepo

2025-10-02 · javascript · [supabase.com/changelog/39197-supabase-js-client-libs-migration-to-monorepo](https://supabase.com/changelog/39197-supabase-js-client-libs-migration-to-monorepo)

---

## Dashboard Updates (080925 - 220925)

2025-09-24 · frontend · [supabase.com/changelog/38974-dashboard-updates-080925-220925](https://supabase.com/changelog/38974-dashboard-updates-080925-220925)

Another brief summary of changes that went into the dashboard over the past 2 weeks! 🙂  ## Couple of improvements to the Query Performance Advisor  <img width="1918" height="953" alt="image"…

---

## Changes to Custom JWT and Signing Keys issue resolution

2025-09-17 · postgrest · [supabase.com/changelog/38771-changes-to-custom-jwt-and-signing-keys-issue-resolution](https://supabase.com/changelog/38771-changes-to-custom-jwt-and-signing-keys-issue-resolution)

On July 24, 2025 Supabase deployed an updated version of our Data API (Postgrest) v13 that came with a more strict approach to JWT validation.  Some customers experienced issues when using custom…

---

## Dashboard Updates (180825 - 010925)

2025-09-01 · frontend · [supabase.com/changelog/38356-dashboard-updates-180825-010925](https://supabase.com/changelog/38356-dashboard-updates-180825-010925)

Here's a brief summary of the changes that went into the Supabase dashboard over the past two weeks between the 18th of August to 1st September 2025! 🙏 As always - we promise that we read through…

---

## Personal Access Tokens: Expiration & Usage Tracking

2025-08-27 · security · [supabase.com/changelog/38248-personal-access-tokens-expiration-usage-tracking](https://supabase.com/changelog/38248-personal-access-tokens-expiration-usage-tracking)

You can now set an expiration date when creating Personal Access Tokens. Expiration can be configured using preset durations, a custom date (up to 1 year), or set to never expire.  Additionally,…

---

## 3x cheaper egress for cache hits

2025-08-22 · storage, billing · [supabase.com/changelog/38119-3x-cheaper-egress-for-cache-hits](https://supabase.com/changelog/38119-3x-cheaper-egress-for-cache-hits)

We are happy to announce that we are rolling out the cached egress changes for everyone as previously [announced](https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing) in the last…

---

## OAuth 2.1 Server Capabilities for Supabase Auth

2025-08-19 · auth · [supabase.com/changelog/38022-oauth-2-1-server-capabilities-for-supabase-auth](https://supabase.com/changelog/38022-oauth-2-1-server-capabilities-for-supabase-auth)

> **📢 UPDATE [November 26, 2025]: Public beta is live now!** >  > - See the [latest comment below](https://github.com/orgs/supabase/discussions/38022#discussioncomment-15087788) for full details…

---

## All regions now run Deno 2.1 compatible release

2025-08-15 · edge functions · [supabase.com/changelog/37941-all-regions-now-run-deno-2-1-compatible-release](https://supabase.com/changelog/37941-all-regions-now-run-deno-2-1-compatible-release)

We've fully rolled out the Deno 2.1 compatible release on all regions serving Edge Functions. You don't need to change your existing Edge Function invocations; the nearest region will automatically…

---

## Change in `realtime-js` affecting Node.js < 22

2025-08-12 · realtime, persist-in-search · [supabase.com/changelog/37869-change-in-realtime-js-affecting-node-js-22](https://supabase.com/changelog/37869-change-in-realtime-js-affecting-node-js-22)

---

## Deprecation Notice: Dropping support for python's gotrue and supafunc

2025-08-08 · python · [supabase.com/changelog/37798-deprecation-notice-dropping-support-for-python-s-gotrue-and-supafunc](https://supabase.com/changelog/37798-deprecation-notice-dropping-support-for-python-s-gotrue-and-supafunc)

As part of the restructuring of the python environments, both the `gotrue` and `supafunc` python packages are being deprecated, in favor of `supabase_auth` and `supabase_functions` respectively.…

---

## Dashboard Navigation Updates: Project Settings

2025-08-04 · frontend · [supabase.com/changelog/37655-dashboard-navigation-updates-project-settings](https://supabase.com/changelog/37655-dashboard-navigation-updates-project-settings)

As part of our [ongoing efforts](https://github.com/orgs/supabase/discussions/33670) to make Dashboard easier to use, **we’re moving service-related settings in their respective areas**. Take…

---

## supabase v17.4.1.062 was withdrawn

2025-07-23 · javascript · [supabase.com/changelog/37415-supabase-v17-4-1-062-was-withdrawn](https://supabase.com/changelog/37415-supabase-v17-4-1-062-was-withdrawn)

Version 17.4.1.062 of supabase was withdrawn.  "Withdrawn" means a problem was found with the image, and so it is set to "withdrawn" to prevent it's continued use for new projects.  An update…

---

## Unified Logs

2025-07-17 · frontend · [supabase.com/changelog/37234-unified-logs](https://supabase.com/changelog/37234-unified-logs)

---

## Deprecation Notice: Dropping Support for Node.js 18

2025-07-16 · javascript · [supabase.com/changelog/37217-deprecation-notice-dropping-support-for-node-js-18](https://supabase.com/changelog/37217-deprecation-notice-dropping-support-for-node-js-18)

As part of our ongoing commitment to providing a secure and reliable experience for all developers, we will drop support for Node.js 18 in accordance with our [Support…

---

## Realtime Settings

2025-07-11 · realtime · [supabase.com/changelog/37041-realtime-settings](https://supabase.com/changelog/37041-realtime-settings)

---

## Update to Edge Functions Regional Invocations

2025-07-03 · edge functions · [supabase.com/changelog/36850-update-to-edge-functions-regional-invocations](https://supabase.com/changelog/36850-update-to-edge-functions-regional-invocations)

Edge Functions are executed in the region closest to the user making the request. This helps to reduce network latency and provide faster responses to the user.  However, if your Function performs…

---

## Deno 2.1 Preview - Hosted Environment

2025-07-01 · edge functions · [supabase.com/changelog/36814-deno-2-1-preview-hosted-environment](https://supabase.com/changelog/36814-deno-2-1-preview-hosted-environment)

A couple of months ago, we started migrating our Edge Functions platform to use [Deno 2.1](https://deno.com/blog/v2.0). Deno 2 bridges the gap between Node and Deno by supporting Node's built-in…

---

## Forthcoming Postgres 17 Release Notes

2025-05-22 · infra · [supabase.com/changelog/35851-forthcoming-postgres-17-release-notes](https://supabase.com/changelog/35851-forthcoming-postgres-17-release-notes)

The upcoming release of Supabase Platform will use Postgres 17. The Postgres 17 bundle will no longer include the following Postgres extensions:  - `timescaledb` - `plv8` - `plls` - `plcoffee`…

---

## Feature Preview: Tabs for Table and SQL Editor

2025-05-13 · frontend · [supabase.com/changelog/35636-feature-preview-tabs-for-table-and-sql-editor](https://supabase.com/changelog/35636-feature-preview-tabs-for-table-and-sql-editor)

> [!NOTE]  > This change has now been fully rolled out - thank you everyone for the feedback! 🙏  ## Tabs for Table and SQL Editor  ![Screenshot 2025-04-07 at 19 47…

---

## Developer Update - April 2025

2025-05-07 · security, frontend, mcp · [supabase.com/changelog/35523-developer-update-april-2025](https://supabase.com/changelog/35523-developer-update-april-2025)

Here’s everything that happened with Supabase in the last month:  ## Project scoped roles ![project-scoped-roles](https://github.com/user-attachments/assets/95d1cf7b-6622-4817-85ed-ff32e826e61a)…

---

## Dashboard Updates [210425 - 050525]

2025-05-06 · frontend · [supabase.com/changelog/35495-dashboard-updates-210425-050525](https://supabase.com/changelog/35495-dashboard-updates-210425-050525)

---

## Project scoped roles now available in Team plans

2025-04-21 · security · [supabase.com/changelog/35172-project-scoped-roles-now-available-in-team-plans](https://supabase.com/changelog/35172-project-scoped-roles-now-available-in-team-plans)

[Project scoped roles](https://supabase.com/docs/guides/platform/access-control#organization-scoped-roles-vs-project-scoped-roles) are now available for all Supabase Team plans.  With project…

---

## Dashboard Updates [070425 - 210425]

2025-04-21 · frontend · [supabase.com/changelog/35169-dashboard-updates-070425-210425](https://supabase.com/changelog/35169-dashboard-updates-070425-210425)

---

## Developer Update - March 2025

2025-04-08 · frontend, mcp, postgres · [supabase.com/changelog/34839-developer-update-march-2025](https://supabase.com/changelog/34839-developer-update-march-2025)

Here’s a recap of everything we announced during Launch Week and the month of March:  ## Supabase MCP Server…

---

## Dashboard Updates [240225 - 070425]

2025-04-07 · frontend · [supabase.com/changelog/34794-dashboard-updates-240225-070425](https://supabase.com/changelog/34794-dashboard-updates-240225-070425)

What better way to wrap up Launch Week 14 than a summary of what was shipped to the dashboard (as well as several other goodies that we also shipped behind the scenes 😉)  ## Manage your Edge…

---

## Supabase Management API `GET` Logs Restrictions

2025-04-01 · infra · [supabase.com/changelog/34634-supabase-management-api-get-logs-restrictions](https://supabase.com/changelog/34634-supabase-management-api-get-logs-restrictions)

We will be enforcing stricter limitations on the v0 and v1 [`GET` Project Logs endpoint](https://api.supabase.com/api/v1#tag/default): ``` GET /v1/projects/{ref}/analytics/endpoints/logs.all GET…

---

## Upcoming Change: Improved Experimental Routing for Read Replica Load Balancers

2025-03-27 · infra · [supabase.com/changelog/34494-upcoming-change-improved-experimental-routing-for-read-replica-load-balancers](https://supabase.com/changelog/34494-upcoming-change-improved-experimental-routing-for-read-replica-load-balancers)

Starting on April 4th, 2025, we will be enhancing the routing behavior for experimental routing on eligible Data API requests. This change affects GET requests to Data APIs only; the routing behavior…

---

## Dedicated Pooler with PgBouncer

2025-03-25 · infra · [supabase.com/changelog/34404-dedicated-pooler-with-pgbouncer](https://supabase.com/changelog/34404-dedicated-pooler-with-pgbouncer)

Today we’re announcing the official release of **Dedicated Pooler** - a PgBouncer instance co-located with your Postgres database for lower latency, better performance, and higher reliability.…

---

## Restricting Access on Auth, Storage, and Realtime Schemas on April 21, 2025

2025-03-18 · auth, storage, realtime · [supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025](https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025)

On April 21, we are restricting certain SQL actions you can perform in your database’s `auth`, `storage`, and `realtime` schemas.  ## Why are we making these restrictions?  Supabase Auth,…

---

## Developer Update - February 2025

2025-03-07 · frontend, edge functions, ai, billing, postgres · [supabase.com/changelog/34067-developer-update-february-2025](https://supabase.com/changelog/34067-developer-update-february-2025)

Here’s everything that happened with Supabase in the last month:  ## Deploy Edge Functions from the Supabase dashboard…

---

## Deno 2.1 Preview **local only**

2025-03-07 · edge functions · [supabase.com/changelog/34054-deno-2-1-preview-local-only](https://supabase.com/changelog/34054-deno-2-1-preview-local-only)

You can now try Deno 2.1 locally with Supabase CLI. The goal of local preview is to identify any regressions or missing functionality before we upgrade hosted version to Deno 2.1.  ~The hosted…

---

## Greatly increased Third-Party Auth MAU quota for Free and Paid Plans

2025-03-03 · billing · [supabase.com/changelog/33959-greatly-increased-third-party-auth-mau-quota-for-free-and-paid-plans](https://supabase.com/changelog/33959-greatly-increased-third-party-auth-mau-quota-for-free-and-paid-plans)

We are happy to announce that we are simplifying our pricing further by greatly increasing our [Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/overview) quotas and aligning them…

---

## Dashboard Updates [10/02/25 - 24/02/25]

2025-02-25 · frontend · [supabase.com/changelog/33835-dashboard-updates-10-02-25-24-02-25](https://supabase.com/changelog/33835-dashboard-updates-10-02-25-24-02-25)

---

## Deploy and update Edge Functions using the Management API

2025-02-20 · edge functions · [supabase.com/changelog/33720-deploy-and-update-edge-functions-using-the-management-api](https://supabase.com/changelog/33720-deploy-and-update-edge-functions-using-the-management-api)

We have introduced two new API endpoints that allow you to deploy and update Edge Functions programmatically. This will be handy if you're building a [Supabase…

---

## Feature Preview: Inline Editor

2025-02-19 · frontend · [supabase.com/changelog/33690-feature-preview-inline-editor](https://supabase.com/changelog/33690-feature-preview-inline-editor)

---

## Upcoming breaking change to Dashboard Navigation

2025-02-18 · frontend, breaking-change · [supabase.com/changelog/33670-upcoming-breaking-change-to-dashboard-navigation](https://supabase.com/changelog/33670-upcoming-breaking-change-to-dashboard-navigation)

> [!NOTE]  > This change has now been fully rolled out - thank you everyone for the feedback! 🙏  We've made a significant proposal to enhance the Supabase Dashboard UX, ensuring that…

---

## Deploy Edge Functions from CLI without needing Docker + import files outside of supabase directory

2025-02-14 · cli, edge functions · [supabase.com/changelog/33613-deploy-edge-functions-from-cli-without-needing-docker-import-files-outside-of-su](https://supabase.com/changelog/33613-deploy-edge-functions-from-cli-without-needing-docker-import-files-outside-of-su)

We've introduced an experimental flag to the Supabase CLI, which allows you to deploy Edge Functions without running Docker.  ### How to use  ```bash npx supabase@beta functions deploy --use-api…

---

## Dashboard Updates [27/01/25 - 10/02/25]

2025-02-11 · frontend · [supabase.com/changelog/33511-dashboard-updates-27-01-25-10-02-25](https://supabase.com/changelog/33511-dashboard-updates-27-01-25-10-02-25)

---

## Developer Update - January 2025

2025-02-07 · frontend, auth, ai, analytics · [supabase.com/changelog/33416-developer-update-january-2025](https://supabase.com/changelog/33416-developer-update-january-2025)

Here’s everything that happened with Supabase in the last month:  ## Third-party Auth with Firebase is now GA…

---

## Deprecation of Fly.io Postgres Managed by Supabase on April 11, 2025

2025-02-07 · infra · [supabase.com/changelog/33413-deprecation-of-fly-io-postgres-managed-by-supabase-on-april-11-2025](https://supabase.com/changelog/33413-deprecation-of-fly-io-postgres-managed-by-supabase-on-april-11-2025)

Supabase is deprecating [Fly’s Postgres offering managed by Supabase](https://supabase.link/fly-pg-blog) on April 11, 2025.  ### Why are we deprecating this offering?  This deprecation enables us…

---

## Dashboard Updates [13/01/25 - 27/01/25]

2025-01-28 · frontend · [supabase.com/changelog/33144-dashboard-updates-13-01-25-27-01-25](https://supabase.com/changelog/33144-dashboard-updates-13-01-25-27-01-25)

---

## Relaxing Database Size limit on Free Plan - 0.5 GB Database Size per project

2025-01-27 · billing · [supabase.com/changelog/33121-relaxing-database-size-limit-on-free-plan-0-5-gb-database-size-per-project](https://supabase.com/changelog/33121-relaxing-database-size-limit-on-free-plan-0-5-gb-database-size-per-project)

> [!NOTE]   > This is only relevant for Free Plan customers.  We've relaxed the Database Size limit on the Free Plan to be 0.5 GB per active project, rather than 0.5 GB for your entire Free Plan…

---

## Developer Update - December 2024

2025-01-23 · security, frontend, ai · [supabase.com/changelog/33035-developer-update-december-2024](https://supabase.com/changelog/33035-developer-update-december-2024)

Welcome to 2025. Here’s everything that happened with Supabase in the last month:  ## Supabase Integrations Page…

---

## Enhanced Type Inference for JSON Fields in supabase-js

2025-01-20 · javascript · [supabase.com/changelog/32925-enhanced-type-inference-for-json-fields-in-supabase-js](https://supabase.com/changelog/32925-enhanced-type-inference-for-json-fields-in-supabase-js)

TypeScript users, here's a cool new feature! Starting from [v2.48.0](https://github.com/supabase/supabase-js/releases/tag/v2.48.0), defining custom types for JSON fields in `supabase-js` and using…

---

## Add static files to Edge Functions

2025-01-15 · edge functions · [supabase.com/changelog/32815-add-static-files-to-edge-functions](https://supabase.com/changelog/32815-add-static-files-to-edge-functions)

Supabase CLI 2.7.0 adds support for bundling Edge Functions with static files.  You can access bundled files via Deno's file-system APIs. Here's an example function that serves a PDF file.  ```ts…

---

## Supabase Connection Pooler Deprecating Session Mode on Port 6543 on February 28, 2025

2025-01-13 · infra · [supabase.com/changelog/32755-supabase-connection-pooler-deprecating-session-mode-on-port-6543-on-february-28](https://supabase.com/changelog/32755-supabase-connection-pooler-deprecating-session-mode-on-port-6543-on-february-28)

_If you're only using Transaction Mode on Connection Pooler port 6543 or already using Session Mode on port 5432 then no action is required._  On February 28, 2025, Supavisor (Supabase's Connection…

---

## Dashboard Updates [30/12/24 - 13/01/25]

2025-01-13 · frontend · [supabase.com/changelog/32741-dashboard-updates-30-12-24-13-01-25](https://supabase.com/changelog/32741-dashboard-updates-30-12-24-13-01-25)

---

## Credit Balance Top Up

2025-01-13 · billing · [supabase.com/changelog/32735-credit-balance-top-up](https://supabase.com/changelog/32735-credit-balance-top-up)

It is now possible to top up your credit balance through your [organization's billing settings](https://supabase.com/dashboard/org/_/billing). On successful payment, an invoice will be issued and…

---

## Type validation for query filter values in supabase-js

2025-01-09 · javascript · [supabase.com/changelog/32677-type-validation-for-query-filter-values-in-supabase-js](https://supabase.com/changelog/32677-type-validation-for-query-filter-values-in-supabase-js)

If you are using our TypeScript SDK with automatically generated types, you are in for a treat. Starting version `2.47.12`, our `@supabase/supabase-js` SDK will correctly validate all query filter…

---

## Use a custom NPM registry for Edge Function dependencies

2025-01-07 · edge functions · [supabase.com/changelog/32635-use-a-custom-npm-registry-for-edge-function-dependencies](https://supabase.com/changelog/32635-use-a-custom-npm-registry-for-edge-function-dependencies)

Some organizations require using all modules from a private NPM registry for security and compliance reasons. Edge Functions now supports configuring a private registry to load all NPM modules using…

---

## Dashboard Updates [09/12/24 - 23/12/24]

2024-12-24 · frontend · [supabase.com/changelog/31318-dashboard-updates-09-12-24-23-12-24](https://supabase.com/changelog/31318-dashboard-updates-09-12-24-23-12-24)

---

## Dashboard Updates [18/11/24 - 09/12/24]

2024-12-10 · frontend · [supabase.com/changelog/31041-dashboard-updates-18-11-24-09-12-24](https://supabase.com/changelog/31041-dashboard-updates-18-11-24-09-12-24)

Launch Week 13 has wrapped up and it's now the holiday season! 🎄🎁 If you might have missed our launches last week - fret not! We've got you covered with a brief summary of the changes that landed…

---

## Slack V1 OAuth Provider Deprecated in favour of Slack (OIDC)

2024-12-02 · auth · [supabase.com/changelog/30772-slack-v1-oauth-provider-deprecated-in-favour-of-slack-oidc](https://supabase.com/changelog/30772-slack-v1-oauth-provider-deprecated-in-favour-of-slack-oidc)

Dear Users,  Slack has [deprecated their existing v1 API](https://api.slack.com/changelog/2024-04-discontinuing-new-creation-of-classic-slack-apps-and-custom-bots) and will fully sunset the API…

---

## Removal of app.settings.jwt_secret from the database

2024-11-22 · security · [supabase.com/changelog/30606-removal-of-app-settings-jwt-secret-from-the-database](https://supabase.com/changelog/30606-removal-of-app-settings-jwt-secret-from-the-database)

---

## Dashboard Updates [04/11/24 - 18/11/24]

2024-11-18 · frontend · [supabase.com/changelog/30526-dashboard-updates-04-11-24-18-11-24](https://supabase.com/changelog/30526-dashboard-updates-04-11-24-18-11-24)

---

## `supabase-js` release candidate `2.46.2-rc.3` incoming types inferences for PostgREST fixes and feedbacks

2024-11-06 · postgrest, javascript · [supabase.com/changelog/30324-supabase-js-release-candidate-2-46-2-rc-3-incoming-types-inferences-for-postgres](https://supabase.com/changelog/30324-supabase-js-release-candidate-2-46-2-rc-3-incoming-types-inferences-for-postgres)

🚀 **Announcement:** We’ve just released `supabase-js` version `2.46.2-rc.3`, which resolves several type errors in the PostgREST client.    ### Notable issues resolved:  -…

---

## Write Edge Functions in pure JavaScript instead of using TypeScript

2024-11-05 · edge functions · [supabase.com/changelog/30307-write-edge-functions-in-pure-javascript-instead-of-using-typescript](https://supabase.com/changelog/30307-write-edge-functions-in-pure-javascript-instead-of-using-typescript)

From Supabase CLI version 1.215.0 or higher you can configure a custom entrypoint to your Edge Functions. This can be used to write Edge Functions in pure JavaScript instead of TypeScript.  Save…

---

## Use `deno.json` configuration file in Edge Functions

2024-11-05 · edge functions · [supabase.com/changelog/30291-use-deno-json-configuration-file-in-edge-functions](https://supabase.com/changelog/30291-use-deno-json-configuration-file-in-edge-functions)

Each Edge Function can now have its own `deno.json` or `deno.jsonc` file to manage dependencies. You will need to deploy your functions using Supabase CLI version v1.215.0 or above to make use of…

---

## Dashboard Updates [21/10/24 - 04/11/24]

2024-11-04 · frontend, auth · [supabase.com/changelog/30264-dashboard-updates-21-10-24-04-11-24](https://supabase.com/changelog/30264-dashboard-updates-21-10-24-04-11-24)

---

## Import NPM packages from private registries in Edge Functions

2024-10-30 · edge functions · [supabase.com/changelog/30179-import-npm-packages-from-private-registries-in-edge-functions](https://supabase.com/changelog/30179-import-npm-packages-from-private-registries-in-edge-functions)

Edge Functions now support importing NPM packages from private registries. You will need to deploy your functions using Supabase CLI version v1.207.9 or above to make use of this feature.  ### How…

---

## Dashboard Updates [07/10/24 - 21/10/24]

2024-10-21 · frontend · [supabase.com/changelog/30005-dashboard-updates-07-10-24-21-10-24](https://supabase.com/changelog/30005-dashboard-updates-07-10-24-21-10-24)

---

## Developer Update - September 2024

2024-10-10 · frontend, edge functions · [supabase.com/changelog/29828-developer-update-september-2024](https://supabase.com/changelog/29828-developer-update-september-2024)

We’ve announced a Vercel partnership, we’re hosting an AI hackathon with our friends at Y Combinator, and we raised $80M. Let’s dive right in:  ## Supabase + Vercel Partnership  ![Supabase +…

---

## Improved docs information architecture

2024-10-09 · documentation · [supabase.com/changelog/29798-improved-docs-information-architecture](https://supabase.com/changelog/29798-improved-docs-information-architecture)

We improved the information architecture (IA) on our docs site.  ## Why?  We’d outgrown the IA! As we added more features and guides, some sections grew to contain a miscellaneous collection of…

---

## Dashboard Updates [23/09/24 - 07/10/24]

2024-10-07 · frontend · [supabase.com/changelog/29710-dashboard-updates-23-09-24-07-10-24](https://supabase.com/changelog/29710-dashboard-updates-23-09-24-07-10-24)

---

## XHTML responses are only allowed with a Custom Domain enabled

2024-10-02 · infra · [supabase.com/changelog/29633-xhtml-responses-are-only-allowed-with-a-custom-domain-enabled](https://supabase.com/changelog/29633-xhtml-responses-are-only-allowed-with-a-custom-domain-enabled)

---

## Supabase Platform Access Control: Project Permissions Breaking Changes on October 15, 2024

2024-09-24 · security, breaking-change · [supabase.com/changelog/29494-supabase-platform-access-control-project-permissions-breaking-changes-on-october](https://supabase.com/changelog/29494-supabase-platform-access-control-project-permissions-breaking-changes-on-october)

_These breaking changes are rolling out on October 15, 2024 and affects only organizations on the Enterprise plan that have implemented project permissions with members assigned the Developer role._…

---

## Dashboard Weekly Updates [16/09/24 - 23/09/24]

2024-09-23 · frontend · [supabase.com/changelog/29447-dashboard-weekly-updates-16-09-24-23-09-24](https://supabase.com/changelog/29447-dashboard-weekly-updates-16-09-24-23-09-24)

---

## Projects on XL and larger compute add-ons can now create up to 5 Read Replicas.

2024-09-22 · infra · [supabase.com/changelog/29434-projects-on-xl-and-larger-compute-add-ons-can-now-create-up-to-5-read-replicas](https://supabase.com/changelog/29434-projects-on-xl-and-larger-compute-add-ons-can-now-create-up-to-5-read-replicas)

The initial launch of [Read Replicas](https://supabase.com/docs/guides/platform/read-replicas) allowed for up to two Read Replicas per project.  The limit for projects on XL compute add-ons and…

---

## Supabase Auth: Changes to default email provider

2024-09-18 · auth · [supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider)

As our user base has grown, we are taking steps to make sure we are able to continue to provide a safe, secure, robust free plan experience. To ensure that email-based auth continues to work for all…

---

## Developer Update - August 2024

2024-09-16 · postgrest, auth, realtime, python, ai, wrappers, analytics · [supabase.com/changelog/29331-developer-update-august-2024](https://supabase.com/changelog/29331-developer-update-august-2024)

Supabase kicked off Launch Week 12 in August with a Postgres+AI drop that went viral followed by other exciting announcements throughout the week. Here’s all the juicy highlights you don’t want to…

---

## Supabase Auth: Asymmetric Keys support in 2025

2024-09-13 · auth · [supabase.com/changelog/29289-supabase-auth-asymmetric-keys-support-in-2025](https://supabase.com/changelog/29289-supabase-auth-asymmetric-keys-support-in-2025)

This is now live! [Read the blog post.](https://supabase.com/blog/jwt-signing-keys)  # Introduction  We are introducing asymmetric key cryptography to Supabase Auth in **Q4 2024 ~on 7th October…

---

## Upcoming changes to Supabase API Keys

2024-09-12 · breaking-change, persist-in-search · [supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys](https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys)

---

## Dashboard Weekly Updates [02/09/24 - 09/09/24]

2024-09-12 · frontend · [supabase.com/changelog/29239-dashboard-weekly-updates-02-09-24-09-09-24](https://supabase.com/changelog/29239-dashboard-weekly-updates-02-09-24-09-09-24)

---

## Edge Functions are now Deno 1.45 compatible

2024-09-10 · edge functions · [supabase.com/changelog/29189-edge-functions-are-now-deno-1-45-compatible](https://supabase.com/changelog/29189-edge-functions-are-now-deno-1-45-compatible)

Supabase [Edge Runtime version 1.57](https://github.com/supabase/edge-runtime/releases/tag/v1.57.0) is compatible with Deno 1.45.  Supabase's hosted platform was upgraded to use this release when…

---

## Dashboard Weekly Updates [26/08/24 - 02/09/24]

2024-09-02 · frontend · [supabase.com/changelog/29030-dashboard-weekly-updates-26-08-24-02-09-24](https://supabase.com/changelog/29030-dashboard-weekly-updates-26-08-24-02-09-24)

---

## Dashboard Weekly Updates [26/08/24 - 30/08/24]

2024-08-30 · frontend · [supabase.com/changelog/29004-dashboard-weekly-updates-26-08-24-30-08-24](https://supabase.com/changelog/29004-dashboard-weekly-updates-26-08-24-30-08-24)

![screenshot-2024-08-30-at-13 18 28](https://github.com/user-attachments/assets/29aec90a-a524-40f3-827c-f469414aa6cd)   The SQL Editor got an upgrade this week, finally letting you organize…

---

## Moving to hourly usage-based billing for databases, based on disk consumption

2024-08-23 · billing · [supabase.com/changelog/28849-moving-to-hourly-usage-based-billing-for-databases-based-on-disk-consumption](https://supabase.com/changelog/28849-moving-to-hourly-usage-based-billing-for-databases-based-on-disk-consumption)

**tldr:**  - **No changes for Free Plan users** - **Billing for paid plan organizations will be based on provisioned disk rather than used database space:**     - Each project starts with 8 GB…

---

## Threshold for transitioning projects to physical backups lowered to 15GB

2024-08-19 · infra · [supabase.com/changelog/28738-threshold-for-transitioning-projects-to-physical-backups-lowered-to-15gb](https://supabase.com/changelog/28738-threshold-for-transitioning-projects-to-physical-backups-lowered-to-15gb)

Further to [earlier](https://github.com/orgs/supabase/discussions/18654) [discussions](https://github.com/orgs/supabase/discussions/20122), the threshold for transitioning large databases to use…

---

## Developer Updates - July 2024

2024-08-09 · billing, infra, postgres · [supabase.com/changelog/28519-developer-updates-july-2024](https://supabase.com/changelog/28519-developer-updates-july-2024)

Claim your ticket for Launch Week 12 kicking off August 12 and read on to learn about a number of new features we have to share with you for the month.  ## Launch Week 12  ![Launch Week 12…

---

## Let's Encrypt cross-signed chain will no longer be used for Custom Domains after September 9, 2024

2024-08-09 · breaking-change, infra · [supabase.com/changelog/28493-let-s-encrypt-cross-signed-chain-will-no-longer-be-used-for-custom-domains-after](https://supabase.com/changelog/28493-let-s-encrypt-cross-signed-chain-will-no-longer-be-used-for-custom-domains-after)

Some [Custom Domain](https://supabase.com/docs/guides/platform/custom-domains) project endpoints are currently signed by Let's Encrypt's cross-signed chain.  These endpoints will start being signed…

---

## Improved invoices and more timely usage data

2024-08-08 · billing · [supabase.com/changelog/28480-improved-invoices-and-more-timely-usage-data](https://supabase.com/changelog/28480-improved-invoices-and-more-timely-usage-data)

Currently, usage data on the invoice breakdown and [organization usage page](https://supabase.com/dashboard/org/_/usage) has a 24-hour delay. Starting from **August 26th**, the usage data will have…

---

## Moving to hourly usage-based billing for IPv4, Custom Domain and Point-in-time recovery

2024-08-07 · billing · [supabase.com/changelog/28438-moving-to-hourly-usage-based-billing-for-ipv4-custom-domain-and-point-in-time-re](https://supabase.com/changelog/28438-moving-to-hourly-usage-based-billing-for-ipv4-custom-domain-and-point-in-time-re)

---

## Moving to hourly billing for Storage Size

2024-08-02 · billing · [supabase.com/changelog/28339-moving-to-hourly-billing-for-storage-size](https://supabase.com/changelog/28339-moving-to-hourly-billing-for-storage-size)

---

## Wrappers Wasm FDW is on Public Alpha

2024-07-30 · wrappers · [supabase.com/changelog/28267-wrappers-wasm-fdw-is-on-public-alpha](https://supabase.com/changelog/28267-wrappers-wasm-fdw-is-on-public-alpha)

[WebAssembly Foreign Data Wrapper (Wasm FDW)](https://supabase.github.io/wrappers/#webassemblywasm-foreign-data-wrapper) is now on public alpha from Wrappers version >= 0.4.1. This release also…

---

## Developer Updates - June 2024

2024-07-24 · documentation, frontend, edge functions, billing, analytics · [supabase.com/changelog/28154-developer-updates-june-2024](https://supabase.com/changelog/28154-developer-updates-june-2024)

We have several updates and new features to share with you this month. Dive in to see what’s new from Supabase.  # Edge Runtime Inspector Feature (CLI)  ![Edge Runtime Inspector Feature…

---

## DigiCert no longer being used as the CA for Supabase HTTP APIs

2024-07-22 · security, breaking-change · [supabase.com/changelog/28118-digicert-no-longer-being-used-as-the-ca-for-supabase-http-apis](https://supabase.com/changelog/28118-digicert-no-longer-being-used-as-the-ca-for-supabase-http-apis)

Supabase HTTP APIs are [no longer using DigiCert](https://developers.cloudflare.com/ssl/reference/migration-guides/digicert-update/) as the root CA. This should have **no** impact on the vast…

---

## Edge Functions: Deploy More Functions at No Extra Cost

2024-07-18 · billing · [supabase.com/changelog/28062-edge-functions-deploy-more-functions-at-no-extra-cost](https://supabase.com/changelog/28062-edge-functions-deploy-more-functions-at-no-extra-cost)

In an effort to simplify pricing, we are going to remove usage-based billing for the number of Edge Functions in your projects. Instead, we are going for a bigger quota across all plans at no extra…

---

## Supabase Platform Access Control: Organization Permissions Breaking Changes on July 26, 2024

2024-07-15 · breaking-change · [supabase.com/changelog/27993-supabase-platform-access-control-organization-permissions-breaking-changes-on-ju](https://supabase.com/changelog/27993-supabase-platform-access-control-organization-permissions-breaking-changes-on-ju)

_These breaking changes are rolling out on **July 26, 2024** and affects all organizations that have members assigned either the **Developer** or **Read-Only** roles._  All Supabase organizations…

---

## Dashboard Weekly Updates [08/07/24 - 15/07/24]

2024-07-15 · frontend · [supabase.com/changelog/27988-dashboard-weekly-updates-08-07-24-15-07-24](https://supabase.com/changelog/27988-dashboard-weekly-updates-08-07-24-15-07-24)

---

## Postgres 13 Deprecation Notice

2024-07-12 · postgres · [supabase.com/changelog/27946-postgres-13-deprecation-notice](https://supabase.com/changelog/27946-postgres-13-deprecation-notice)

Supabase support for Postgres 13 is being deprecated as of 15th July 2024, and support for it will be fully removed on 15th November 2024.  All Postgres 13 projects should be upgraded to Postgres…

---

## Dashboard Weekly Updates [01/07/24 - 08/07/24]

2024-07-09 · frontend · [supabase.com/changelog/27876-dashboard-weekly-updates-01-07-24-08-07-24](https://supabase.com/changelog/27876-dashboard-weekly-updates-01-07-24-08-07-24)

---

## Dashboard Weekly Updates [17/06/24 - 24/06/24]

2024-06-24 · frontend · [supabase.com/changelog/27498-dashboard-weekly-updates-17-06-24-24-06-24](https://supabase.com/changelog/27498-dashboard-weekly-updates-17-06-24-24-06-24)

---

## Paused Free Plan projects are restorable for 90 days

2024-06-24 · infra · [supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days](https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days)

_This only impacts projects on the Free Plan because projects in any of the paid plans cannot be paused._  Beginning June 24, 2024, we're updating some project pause/restore behavior:  - paused…

---

## Edge Functions are now Deno 1.43 compatible

2024-06-18 · edge functions · [supabase.com/changelog/27349-edge-functions-are-now-deno-1-43-compatible](https://supabase.com/changelog/27349-edge-functions-are-now-deno-1-43-compatible)

Supabase [Edge Runtime version 1.54 ](https://github.com/supabase/edge-runtime/releases/tag/v1.54.0) is compatible with Deno 1.43.  Supabase's hosted platform was upgraded to use this release when…

---

## Developer Updates - May 2024

2024-06-18 · frontend, edge functions, auth, realtime, ai · [supabase.com/changelog/27338-developer-updates-may-2024](https://supabase.com/changelog/27338-developer-updates-may-2024)

Supabase underwent Consolidation Month™ to focus on initiatives that improve the stability, scalability, and security of our products. We also have exciting product announcements that we can’t wait…

---

## Dashboard Weekly Updates [03/06/24 - 10/06/24]

2024-06-11 · frontend · [supabase.com/changelog/27166-dashboard-weekly-updates-03-06-24-10-06-24](https://supabase.com/changelog/27166-dashboard-weekly-updates-03-06-24-10-06-24)

You might be wondering what we've been up to the past few weeks when we'd usually have some cadence in our weekly updates with our GitHub discussion updates - the team at Supabase had decided to…

---

## @supabase/ssr updates and roadmap towards v1.0.0

2024-06-05 · auth · [supabase.com/changelog/27037-supabase-ssr-updates-and-roadmap-towards-v1-0-0](https://supabase.com/changelog/27037-supabase-ssr-updates-and-roadmap-towards-v1-0-0)

[Go here for latest update](https://github.com/orgs/supabase/discussions/27037#discussioncomment-9862922)  Hey everyone,  I'm Stojan a member of the Supabase Auth team, bringing some updates…

---

## Log Drains Private Alpha

2024-05-22 · analytics · [supabase.com/changelog/26650-log-drains-private-alpha](https://supabase.com/changelog/26650-log-drains-private-alpha)

Log drains is currently private alpha, and is available for Teams and Enterprise customers. We are still firming up the [pricing and documentation](https://github.com/supabase/supabase/pull/26370),…

---

## Updated deployment instructions for supabase-grafana monitoring application

2024-05-17 · analytics · [supabase.com/changelog/26421-updated-deployment-instructions-for-supabase-grafana-monitoring-application](https://supabase.com/changelog/26421-updated-deployment-instructions-for-supabase-grafana-monitoring-application)

We've released a fix to the deployment instructions for the [supabase-grafana monitoring application](https://github.com/supabase/supabase-grafana/blob/main/README.md#using-flyio).  If you're…

---

## Dashboard Weekly Updates [06/05/24 - 13/05/24]

2024-05-15 · frontend · [supabase.com/changelog/26327-dashboard-weekly-updates-06-05-24-13-05-24](https://supabase.com/changelog/26327-dashboard-weekly-updates-06-05-24-13-05-24)

---

## Developer Updates - April 2024

2024-05-08 · security, auth, storage, ai, infra · [supabase.com/changelog/25860-developer-updates-april-2024](https://supabase.com/changelog/25860-developer-updates-april-2024)

Here’s everything we shipped during our [GA week](https://supabase.link/ga-week-gh):  ## Day 1 - Supabase is officially launching into General Availability (GA)  ![Day 1 - Supabase is officially…

---

## JSR modules are supported in Edge Functions & Edge Runtime

2024-05-07 · edge functions · [supabase.com/changelog/25842-jsr-modules-are-supported-in-edge-functions-edge-runtime](https://supabase.com/changelog/25842-jsr-modules-are-supported-in-edge-functions-edge-runtime)

You can now use [JSR packages](https://jsr.io/docs/introduction) in your Edge Functions. JSR is a modern package registry for JavaScript and TypeScript created by the Deno team. With JSR support, you…

---

## Dashboard Weekly Updates [22/04/24 - 29/04/24]

2024-04-30 · frontend · [supabase.com/changelog/23433-dashboard-weekly-updates-22-04-24-29-04-24](https://supabase.com/changelog/23433-dashboard-weekly-updates-22-04-24-29-04-24)

---

## Dashboard Weekly Updates [15/04/24 - 22/04/24]

2024-04-22 · security, frontend, auth, storage, wrappers · [supabase.com/changelog/23139-dashboard-weekly-updates-15-04-24-22-04-24](https://supabase.com/changelog/23139-dashboard-weekly-updates-15-04-24-22-04-24)

Supabase [GA Week](https://supabase.com/ga-week) just wrapped up but the shipping doesn't! This just summarises what have been shipped over the last week - and more 😉   ## Auth support for…

---

## Platform Updates: March 2024

2024-04-06 · infra · [supabase.com/changelog/22525-platform-updates-march-2024](https://supabase.com/changelog/22525-platform-updates-march-2024)

---

## Realtime Broadcast and Presence Authorization

2024-04-04 · realtime · [supabase.com/changelog/22484-realtime-broadcast-and-presence-authorization](https://supabase.com/changelog/22484-realtime-broadcast-and-presence-authorization)

---

## Increased Supavisor Client Connection Limits Across Paid Plans

2024-04-04 · infra · [supabase.com/changelog/22457-increased-supavisor-client-connection-limits-across-paid-plans](https://supabase.com/changelog/22457-increased-supavisor-client-connection-limits-across-paid-plans)

Supavisor, Supabase's multi-tenant connection pooler deployed to regional clusters, became production ready back in December 2023. You can read the announcement…

---

## Dashboard Weekly Updates [18/03/24 - 25/03/24]

2024-03-26 · frontend · [supabase.com/changelog/22222-dashboard-weekly-updates-18-03-24-25-03-24](https://supabase.com/changelog/22222-dashboard-weekly-updates-18-03-24-25-03-24)

---

## Migration to v2 platform architecture

2024-03-20 · infra · [supabase.com/changelog/22135-migration-to-v2-platform-architecture](https://supabase.com/changelog/22135-migration-to-v2-platform-architecture)

In our previous platform architecture, our [Storage](https://supabase.com/storage), [Realtime](https://supabase.com/realtime), and connection pooler ([PgBouncer](https://www.pgbouncer.org/)) services…

---

## Dashboard Weekly Updates [04/03/24 - 11/03/24]

2024-03-12 · frontend · [supabase.com/changelog/21974-dashboard-weekly-updates-04-03-24-11-03-24](https://supabase.com/changelog/21974-dashboard-weekly-updates-04-03-24-11-03-24)

---

## Platform Updates: February 2024

2024-03-06 · postgrest, ai, infra · [supabase.com/changelog/21823-platform-updates-february-2024](https://supabase.com/changelog/21823-platform-updates-february-2024)

---

## Dashboard Weekly Updates [26/02/24 - 04/03/24]

2024-03-04 · frontend · [supabase.com/changelog/21732-dashboard-weekly-updates-26-02-24-04-03-24](https://supabase.com/changelog/21732-dashboard-weekly-updates-26-02-24-04-03-24)

---

## Dashboard Weekly Updates [19/02/24 - 26/02/24]

2024-02-26 · frontend · [supabase.com/changelog/21563-dashboard-weekly-updates-19-02-24-26-02-24](https://supabase.com/changelog/21563-dashboard-weekly-updates-19-02-24-26-02-24)

---

## Paid organizations can now launch projects on bigger compute immediately

2024-02-20 · billing, infra · [supabase.com/changelog/21386-paid-organizations-can-now-launch-projects-on-bigger-compute-immediately](https://supabase.com/changelog/21386-paid-organizations-can-now-launch-projects-on-bigger-compute-immediately)

Paid plan users can now immediately launch projects on larger compute sizes. Previously, paid organizations had to launch projects on the default "Micro" instance and then separately upgrade their…

---

## Dashboard Weekly Updates [12/02/24 - 19/02/24]

2024-02-19 · frontend · [supabase.com/changelog/21366-dashboard-weekly-updates-12-02-24-19-02-24](https://supabase.com/changelog/21366-dashboard-weekly-updates-12-02-24-19-02-24)

---

## Dashboard Weekly Updates [05/02/24 - 12/02/24]

2024-02-13 · frontend · [supabase.com/changelog/21219-dashboard-weekly-updates-05-02-24-12-02-24](https://supabase.com/changelog/21219-dashboard-weekly-updates-05-02-24-12-02-24)

---

## Platform Updates: January 2024

2024-02-06 · frontend, edge functions, storage, infra · [supabase.com/changelog/21042-platform-updates-january-2024](https://supabase.com/changelog/21042-platform-updates-january-2024)

---

## Dashboard Weekly Updates [22/01/24 - 29/01/24]

2024-01-30 · frontend · [supabase.com/changelog/20863-dashboard-weekly-updates-22-01-24-29-01-24](https://supabase.com/changelog/20863-dashboard-weekly-updates-22-01-24-29-01-24)

---

## Dashboard Weekly Updates [15/01/24 - 22/01/24]

2024-01-22 · frontend · [supabase.com/changelog/20622-dashboard-weekly-updates-15-01-24-22-01-24](https://supabase.com/changelog/20622-dashboard-weekly-updates-15-01-24-22-01-24)

---

## Supavisor starts enforcing Network Restrictions

2024-01-17 · infra · [supabase.com/changelog/20522-supavisor-starts-enforcing-network-restrictions](https://supabase.com/changelog/20522-supavisor-starts-enforcing-network-restrictions)

Supavisor, our connection pooler, does not support using [Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions#limitations) at the moment. Support for Network…

---

## IPv4 addon for projects available

2024-01-17 · infra · [supabase.com/changelog/20512-ipv4-addon-for-projects-available](https://supabase.com/changelog/20512-ipv4-addon-for-projects-available)

On February 1st 2024, AWS will [start charging for IPv4 addresses](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/). We're [deprecating IPv4 for direct…

---

## Dashboard Weekly Updates [08/01/24 - 15/01/24]

2024-01-15 · frontend · [supabase.com/changelog/20430-dashboard-weekly-updates-08-01-24-15-01-24](https://supabase.com/changelog/20430-dashboard-weekly-updates-08-01-24-15-01-24)

---

## Supavisor 1.1.6

2024-01-11 · infra · [supabase.com/changelog/20358-supavisor-1-1-6](https://supabase.com/changelog/20358-supavisor-1-1-6)

[Released Supavisor 1.1.6](https://github.com/supabase/supavisor/releases/tag/v1.1.6)  ## Notable * Fixes a bug which caused prepared statements to fail in `session` mode

---

## Platform Updates December 2023

2024-01-11 · infra · [supabase.com/changelog/20346-platform-updates-december-2023](https://supabase.com/changelog/20346-platform-updates-december-2023)

A rundown of everything we shipped during [Launch Week X](https://supabase.com/launch-week)  ## Day 1 - Supabase Studio: AI Assistant and User Impersonation  ![l Day 1 - Supabase Studio: AI…

---

## Supavisor 1.1.5

2024-01-10 · infra · [supabase.com/changelog/20313-supavisor-1-1-5](https://supabase.com/changelog/20313-supavisor-1-1-5)

[Released Supavisor 1.1.5](https://github.com/supabase/supavisor/releases/tag/v1.1.5)  ## Notable * Pools now start with only 10 connections and create new ones up to tenant default_pool_size or…

---

## Dashboard Weekly Updates [01/01/24 - 01/08/24]

2024-01-08 · frontend · [supabase.com/changelog/20231-dashboard-weekly-updates-01-01-24-01-08-24](https://supabase.com/changelog/20231-dashboard-weekly-updates-01-01-24-01-08-24)

---

## Supavisor v1.1.2 - allow_list and client_heartbeat_interval

2024-01-05 · infra · [supabase.com/changelog/20195-supavisor-v1-1-2-allow-list-and-client-heartbeat-interval](https://supabase.com/changelog/20195-supavisor-v1-1-2-allow-list-and-client-heartbeat-interval)

[Released Supavisor v1.1.2](https://github.com/supabase/supavisor/releases/tag/v1.1.2)  ## Notable * `allow_list` field on the `tenant` to support network restrictions * More docs *…

---

## Threshold for transitioning projects to physical backups lowered to 40GB

2024-01-03 · infra · [supabase.com/changelog/20122-threshold-for-transitioning-projects-to-physical-backups-lowered-to-40gb](https://supabase.com/changelog/20122-threshold-for-transitioning-projects-to-physical-backups-lowered-to-40gb)

Further to https://github.com/orgs/supabase/discussions/18654 , the threshold for transitioning large databases to use physical backups for their daily backups is being lowered to 40GB over the next…

---

## Dashboard Weekly Updates [11th Dec - 18th Dec]

2023-12-18 · frontend · [supabase.com/changelog/19827-dashboard-weekly-updates-11th-dec-18th-dec](https://supabase.com/changelog/19827-dashboard-weekly-updates-11th-dec-18th-dec)

Launch Week X is just over, but the fun doesn't stop! This changelog summarizes what has been released for Studio over last week as well as other improvements that we shipped behind the scenes while…

---

## Platform update September 2023

2023-10-06 · edge functions, auth, realtime, ai, wrappers, infra · [supabase.com/changelog/19706-platform-update-september-2023](https://supabase.com/changelog/19706-platform-update-september-2023)

---

## Platform updates: October 2023

2023-11-06 · security, frontend, auth, storage, ai · [supabase.com/changelog/19705-platform-updates-october-2023](https://supabase.com/changelog/19705-platform-updates-october-2023)

---

## Platform updates: August 2023

2023-09-08 · security, frontend, ai, billing, infra · [supabase.com/changelog/19704-platform-updates-august-2023](https://supabase.com/changelog/19704-platform-updates-august-2023)

---

## Platform updates June 2023

2023-07-07 · cli, auth, storage, realtime, billing, postgres · [supabase.com/changelog/19703-platform-updates-june-2023](https://supabase.com/changelog/19703-platform-updates-june-2023)

---

## Platform updates: May 2023

2023-06-09 · security, frontend, edge functions, auth, storage, ai, postgres · [supabase.com/changelog/19702-platform-updates-may-2023](https://supabase.com/changelog/19702-platform-updates-may-2023)

---

## Platform updates: April 2023

2023-05-10 · frontend, edge functions, auth, storage, graphql, analytics, postgres · [supabase.com/changelog/19701-platform-updates-april-2023](https://supabase.com/changelog/19701-platform-updates-april-2023)

---

## Platform Update February 2023

2023-03-09 · frontend, cli, edge functions, database, javascript, postgres · [supabase.com/changelog/19700-platform-update-february-2023](https://supabase.com/changelog/19700-platform-update-february-2023)

---

## Platform update January 2023

2023-02-08 · documentation, auth, storage, python, ai, postgres · [supabase.com/changelog/19699-platform-update-january-2023](https://supabase.com/changelog/19699-platform-update-january-2023)

The first month of the year was very productive here at Supabase. Here is a highlight of what we shipped during January:  ## Storing OpenAI embeddings in Postgres with pgvector  ![Storing OpenAI…

---

## Platform Updates November 2022

2022-12-08 · auth, auth-helpers · [supabase.com/changelog/19698-platform-updates-november-2022](https://supabase.com/changelog/19698-platform-updates-november-2022)

Launch Week 6 is just around the corner! We’re saving most of November’s updated as a surprise for Launch Week, but we still had time to ship some goodies this month.  ## Launch Week 6 tickets…

---

## Platform updates: October 2022

2022-11-02 · edge functions, auth, storage, database, javascript, supabase-flutter, postgres · [supabase.com/changelog/19697-platform-updates-october-2022](https://supabase.com/changelog/19697-platform-updates-october-2022)

---

## Platform Update September 2022

2022-10-07 · security, edge functions, auth, postgres · [supabase.com/changelog/19696-platform-update-september-2022](https://supabase.com/changelog/19696-platform-update-september-2022)

---

## Platform updates: 30 Nov 2021

2021-11-30 · postgrest, auth, storage, realtime, postgres · [supabase.com/changelog/19695-platform-updates-30-nov-2021](https://supabase.com/changelog/19695-platform-updates-30-nov-2021)

---

## October Beta 2021

2021-11-08 · frontend, postgrest, auth, self-hosted, javascript · [supabase.com/changelog/19694-october-beta-2021](https://supabase.com/changelog/19694-october-beta-2021)

Three new Auth providers, multi-schema support, and we're gearing up for another Launch Week. Let's dive into what's been happening at Supabase during the month of October.  This is also available…

---

## September Beta 2021

2021-10-04 · auth, database, javascript, postgres · [supabase.com/changelog/19693-september-beta-2021](https://supabase.com/changelog/19693-september-beta-2021)

Did you know it's been 2 years since the [first commit](https://github.com/supabase/realtime/commit/175f649784147af80acfc9ff5be9d160285c76ea) to Realtime, our real-time engine for Postgres? Before we…

---

## August Beta 2021

2021-09-13 · frontend, auth, realtime, supabase-flutter, infra · [supabase.com/changelog/19692-august-beta-2021](https://supabase.com/changelog/19692-august-beta-2021)

We've raised $30M and shipped a bunch of features. Let's dive into what's been happening at Supabase during the month of August.  This is also available as a [blog…

---

## July Beta 2021

2021-08-12 · frontend, postgrest, auth, storage, supabase-flutter, postgres · [supabase.com/changelog/19691-july-beta-2021](https://supabase.com/changelog/19691-july-beta-2021)

Supabase is gearing up for another Launch Week on July the 26th. Until then, here's a few new things to try.  This is also available as a [blog…

---

## June Beta 2021

2021-07-04 · auth, storage, database, postgres · [supabase.com/changelog/19690-june-beta-2021](https://supabase.com/changelog/19690-june-beta-2021)

Supabase is gearing up for another Launch Week on July the 26th. Until then, here's a few new things to try.  This is also available as a [blog…

---

## April Beta 2021

2021-05-05 · frontend, storage, wrappers · [supabase.com/changelog/19688-april-beta-2021](https://supabase.com/changelog/19688-april-beta-2021)

This month was a "gardening" month for Supabase. The team focused on stability, security, and community support.  Check out what we were working on below, as well as some incredible Community…

---

## Supavisor 1.0

2023-12-13 · infra · [supabase.com/changelog/19669-supavisor-1-0](https://supabase.com/changelog/19669-supavisor-1-0)

Supavisor 1.0 is released. Rollout to Supabase hosted projects planned for next week.  Notable changes include:  - Added support for named prepared statements - Added support for read replicas…

---

## Improved usage insights and transparency

2023-12-05 · billing · [supabase.com/changelog/19438-improved-usage-insights-and-transparency](https://supabase.com/changelog/19438-improved-usage-insights-and-transparency)

We've improved insights into usage, billing and costs.  ## Vastly improved usage summary  We previously had a slightly hidden usage summary in the "Upcoming Invoice" section. This section has…

---

## Dashboard Weekly Updates [27th - 4th Dec]

2023-12-05 · frontend · [supabase.com/changelog/19425-dashboard-weekly-updates-27th-4th-dec](https://supabase.com/changelog/19425-dashboard-weekly-updates-27th-4th-dec)

---

## Directly updating rows in the `cron.job` table is no longer allowed

2023-11-29 · database, breaking-change · [supabase.com/changelog/19298-directly-updating-rows-in-the-cron-job-table-is-no-longer-allowed](https://supabase.com/changelog/19298-directly-updating-rows-in-the-cron-job-table-is-no-longer-allowed)

Previously, it was possible to directly insert/update rows on the pg_cron extension's `cron.job` table. This bypasses security checks that would've been asserted when jobs are scheduled/modified via…

---

## Dashboard Weekly Updates [20th Nov - 27th Nov]

2023-11-27 · enhancement, frontend · [supabase.com/changelog/19254-dashboard-weekly-updates-20th-nov-27th-nov](https://supabase.com/changelog/19254-dashboard-weekly-updates-20th-nov-27th-nov)

---

## LinkedIn OAuth Provider deprecated in favour of LinkedIn (OIDC) Provider

2023-11-24 · auth, breaking-change · [supabase.com/changelog/19204-linkedin-oauth-provider-deprecated-in-favour-of-linkedin-oidc-provider](https://supabase.com/changelog/19204-linkedin-oauth-provider-deprecated-in-favour-of-linkedin-oidc-provider)

LinkedIn has modified the required scopes for their API and OAuth Applications created prior to 1st Aug 2023 do not contain the appropriate scopes. This could cause errors when attempting to sign in…

---

## Edge Functions secrets should now get updated upon resetting DB password or JWT secret

2023-11-15 · edge functions · [supabase.com/changelog/18972-edge-functions-secrets-should-now-get-updated-upon-resetting-db-password-or-jwt](https://supabase.com/changelog/18972-edge-functions-secrets-should-now-get-updated-upon-resetting-db-password-or-jwt)

Edge Functions has some predefined secrets: `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Previously, if you reset your DB password or JWT secret, these secrets will become…

---

## Improved Realtime reliability when migrations fail for a project

2023-11-09 · realtime · [supabase.com/changelog/18861-improved-realtime-reliability-when-migrations-fail-for-a-project](https://supabase.com/changelog/18861-improved-realtime-reliability-when-migrations-fail-for-a-project)

Realtime runs migrations for tables under the `realtime` schema when it connects to databases. Sometimes this fails. These changes handle Realtime migration failures better.…

---

## Column Encryption is SQL-only now

2023-11-09 · frontend · [supabase.com/changelog/18849-column-encryption-is-sql-only-now](https://supabase.com/changelog/18849-column-encryption-is-sql-only-now)

---

## Connections to Postgres directly from an edge function are secured with SSL

2023-11-09 · enhancement, edge functions · [supabase.com/changelog/18845-connections-to-postgres-directly-from-an-edge-function-are-secured-with-ssl](https://supabase.com/changelog/18845-connections-to-postgres-directly-from-an-edge-function-are-secured-with-ssl)

If you use Deno Postgres or other Postgres clients to connect to your database instance from a Supabase Edge Function, those connections are now secured with SSL. You don't need to add any extra…

---

## Large databases now use daily physical backups

2023-11-02 · infra · [supabase.com/changelog/18654-large-databases-now-use-daily-physical-backups](https://supabase.com/changelog/18654-large-databases-now-use-daily-physical-backups)

Databases larger than 100GB are being transitioned to using physical backups for their daily backups.  Physical backups are more performant, have lower impact on the db, and avoid holding locks for…

---

## Postgres 12 Deprecation Notice

2023-10-14 · postgres · [supabase.com/changelog/18198-postgres-12-deprecation-notice](https://supabase.com/changelog/18198-postgres-12-deprecation-notice)

Postgres 12 is deprecated as of 14th October 2023 and support for it will be fully removed on 27th November 2023.   Postgres 15 comes with numerous features, bug fixes and performance improvements.…

---

## PGBouncer and IPv4 Deprecation

2023-09-29 · infra · [supabase.com/changelog/17817-pgbouncer-and-ipv4-deprecation](https://supabase.com/changelog/17817-pgbouncer-and-ipv4-deprecation)

---

## Moving to Org-based billing

2023-08-31 · billing · [supabase.com/changelog/17061-moving-to-org-based-billing](https://supabase.com/changelog/17061-moving-to-org-based-billing)

We’re fixing the billing system at Supabase - moving from “project-based” to “organization-based”. We should have started with this model, but I wasn’t wise enough to know that when we started. We…

---

## Security Patch Notice

2022-10-04 · security · [supabase.com/changelog/9314-security-patch-notice](https://supabase.com/changelog/9314-security-patch-notice)
