# DORA Metrics — In-Class Quiz

## Q1. Match each DORA metric to its definition

- **Deployment Frequency** — how often the team successfully releases code to
  production (i.e. ships changes to end users). Elite teams deploy on demand,
  multiple times per day.
- **Lead Time for Changes** — the time it takes for a change to go from *code
  committed / merged* to *running in production*. It measures how fast an
  accepted change actually reaches users.
- **Change Failure Rate** — the percentage of deployments to production that
  cause a failure (an incident, a rollback, a hotfix, or degraded service).
- **Time to Restore / MTTR (Mean Time To Restore)** — how long it takes to
  recover service after a failure in production, i.e. from incident detected to
  service restored.

## Q2. A team deploys once a quarter. Which metric is poor?

**Deployment Frequency** is poor — deploying only 4 times a year is at the far
"low" end of that metric (it also drags down lead time, but the metric measured
directly here is deployment frequency).

## Q3. You shorten the time between merging a PR and shipping to production. Which metric improves?

**Lead Time for Changes** improves — that is exactly the interval it measures
(from change merged/committed to change live in production).

## Q4. 1 deployment out of 4 causes an incident. Which metric, and is a high value good or bad?

This is the **Change Failure Rate** = 1/4 = **25%**.
A **high value is bad**: it means a larger share of deployments break
production. You want this number as **low** as possible.

## Q5. What does CALMS stand for?

- **C**ulture
- **A**utomation
- **L**ean
- **M**easurement
- **S**haring

## Q6. True or false: "elite" teams deploy less often but in bigger batches. Justify.

**False.** Elite teams deploy **more often**, in **smaller batches**.
Small, frequent deployments carry less change each, so they are lower risk:
failures are easier to isolate, lead time stays short, and recovery is faster.
Large, infrequent batches do the opposite — they raise the change failure rate
and make MTTR worse because many changes ship at once and a failure is harder to
pinpoint and roll back.

## Q7. Which practice improves MTTR the most?

**(b) monitoring and alerting plus automated rollback.**
MTTR is about *recovering fast*: good monitoring/alerting detects the failure
quickly, and automated rollback restores service quickly. Option (a) adds delay,
and (c) makes both throughput and recovery worse.

## Q8. Which metrics measure throughput, and which measure stability?

- **Throughput (speed / velocity):** Deployment Frequency, Lead Time for Changes.
- **Stability (quality / reliability):** Change Failure Rate, Time to Restore (MTTR).

The key insight: the two pairs balance each other. Good teams are fast **and**
stable — going faster should not cost you reliability.

## Q9. Why do we run blameless post-mortems?

To focus on the **systemic and process causes** of an incident rather than
blaming individuals. When people are not blamed, they share what really happened
honestly and in full, which lets the team find the true root cause and put in
place fixes that prevent recurrence. A blame culture pushes people to hide
mistakes, which destroys learning and psychological safety — so the same
failures keep happening.
