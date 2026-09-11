# Post-mortem — The Friday-night incident (PixelCart)

*Blameless post-mortem. The goal is to understand what in the system let the
error reach customers, not who made it.*

## Summary

During the rollout of the new checkout page, a configuration change containing a
typo in the database URL was deployed to production on a Friday evening. Checkout
failed for customers. With no monitoring and nobody watching, the failure went
undetected until the next morning, and recovery required tracking down the only
person with access and fixing the file by hand. Result: **~15 hours of checkout
downtime over a weekend and lost revenue.**

## Timeline (facts)

| When | Event |
|------|-------|
| **Fri 5:40 pm** | A fix is prepared for release before the weekend. Deployment is fully manual: SSH into production, copy files by hand, edit the config directly on the server. |
| **Fri 5:52 pm** *(occurred)* | A bad configuration value (typo in the database URL) is deployed to production. There is no prod-like test environment; the change was tested only "more or less" locally. Checkout is now broken. |
| **Fri 6:05 pm** | End of day. No one is watching the site; there is no automated alerting. |
| **Fri 8:30 pm** | A customer reports the failing checkout on social media. No one on the team sees it. |
| **Sat 9:15 am** *(detected)* | Inès, unofficially on call, finds the complaints. She has no server access and no record of what was deployed, and no simple way to roll back. |
| **Sat 11:40 am** *(resolved)* | After reaching Karim, identifying the typo, and hand-fixing the file, service is restored. |

**Two gaps stand out:**
- **occurred → detected ≈ 15.5 h** the site was broken with nobody aware.
- **detected → resolved ≈ 2.5 h** even once known, recovery was slow and manual.

## Systemic causes (no finger-pointing)

The incident was not caused by one person's typo — a typo is normal and
expected. It reached customers and stayed live for 15 hours because the *system*
had no safety net at any stage:

1. **No automated deployment pipeline.** Deploying meant manual SSH, copying
   files, and editing config live on the server — error-prone and not
   repeatable.
2. **No production-like test/staging environment.** Changes could only be tested
   "more or less" on a laptop, so a bad config value could not be caught before
   production.
3. **No automated tests or pre-deploy validation.** Nothing checked the config
   (e.g. the database URL) before it went live.
4. **No monitoring or alerting.** A broken checkout produced no signal; detection
   depended on a customer noticing and a team member happening to see it the next
   morning.
5. **No change tracking / audit trail.** There was no record of what was
   deployed or changed, so diagnosis started from zero.
6. **No easy rollback.** Recovery required a manual hand-fix instead of reverting
   to the last known-good state.
7. **Single point of failure (access & knowledge).** Only Karim had access and
   knew what shipped; the person available on Saturday could not act alone.

## Priority actions (prioritized and justified)

Ordered by how much they would have shortened or prevented *this* outage.

1. **Add monitoring + alerting on checkout, wired to an on-call notification.**
   *Why first:* the biggest cost here was ~15 hours of **undetected** downtime.
   A simple health check on the checkout flow, alerting the team within minutes,
   would have turned a 15-hour outage into a short one — the single highest-value
   fix.
   → Degrades **Time to Restore (MTTR)** (detection time is part of recovery).

2. **Replace manual deploys with an automated pipeline that records every change
   and supports one-step rollback.**
   *Why:* it removes hand-editing on the server (the source of the typo reaching
   prod), gives an audit trail so anyone can see what changed, and lets any
   engineer revert instantly instead of waiting to reach the one person who knows.
   → Degrades **Time to Restore (MTTR)** (slow, manual, single-person recovery)
   and **Deployment Frequency** / **Lead Time for Changes** (risky manual deploys
   discourage shipping and lengthen the path to production).

3. **Introduce a production-like staging environment with automated tests /
   config validation as a gate before production.**
   *Why:* a prod-like environment plus a validation step would have caught the
   database-URL typo before customers ever saw it, stopping the incident at the
   source rather than recovering from it.
   → Degrades **Change Failure Rate** (bad changes reaching production).

## DORA metrics degraded by this incident

| Systemic problem | DORA metric degraded |
|------------------|----------------------|
| No monitoring/alerting → 15 h to even notice | **Time to Restore (MTTR)** |
| No rollback + manual hand-fix + single-person knowledge → slow recovery | **Time to Restore (MTTR)** |
| No staging + no tests → a bad config reached production | **Change Failure Rate** |
| Manual, risky, "only when forced" deploys | **Deployment Frequency** |
| Manual multi-step deploy, no pipeline → long path from change-ready to live | **Lead Time for Changes** |

All four DORA metrics are touched: the missing safety nets hurt both
**throughput** (deployment frequency, lead time) and **stability** (change
failure rate, time to restore).

## Blameless takeaway

A single typo will always happen eventually. A healthy system assumes that and
makes it a non-event: caught before prod, or detected and rolled back in minutes.
The action items above rebuild those missing safety nets so the next mistake
stays small.
