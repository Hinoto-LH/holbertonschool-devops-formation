# 1. Healthchecks and dependency conditions

An API and a database started together: the API usually wins the race and
connects before Postgres is ready to answer. This stack fixes that with a
healthcheck on the database and `condition: service_healthy` on the API.

The API here connects **once, with no retry loop, and exits on failure**. That
is deliberate: it makes the race visible, and it shows that ordering is the
orchestrator's job rather than something every app should have to work around.

## Layout

| Path | Role |
|---|---|
| `compose.yaml` | The stack: db with a healthcheck, api gated on it |
| `compose.race.yaml` | Same stack **without** the healthcheck — broken on purpose, used for the demo below |
| `api/` | Express + `pg`, logs a timestamp at every startup step |
| `.env.example` | Template; the real `.env` is gitignored |

## Run

```bash
cp .env.example .env      # then set POSTGRES_PASSWORD
docker compose up         # add -d to detach
curl http://localhost:8080
# {"service":"api","status":"ok","db_host":"db","db_time":"..."}
```

## Stop

```bash
docker compose down       # add -v to delete the database volume too
```

## The fix, in two keys

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
    interval: 2s        # probe every 2s
    timeout: 3s         # a probe slower than this counts as a failure
    retries: 15         # 15 consecutive failures -> unhealthy
    start_period: 5s    # failures during the first 5s don't count as retries

api:
  depends_on:
    db:
      condition: service_healthy
```

`pg_isready` is Postgres' own readiness probe: it exits 0 only once the server
accepts connections. `$$` escapes the dollar so the container's shell expands
the variable instead of Compose.

## Demonstration

### Without the healthcheck — the API loses the race

```bash
docker compose -p race -f compose.race.yaml up --abort-on-container-exit
```

`compose.race.yaml` has no healthcheck and uses plain `depends_on: [db]`.
Actual logs:

```
api-1 | [2026-09-25T13:30:00.153Z] connecting to database at db:5432 ...
api-1 | [2026-09-25T13:30:00.162Z] FATAL: database not reachable — connect ECONNREFUSED 172.19.0.2:5432
db-1  | 2026-09-25 13:30:00.755 UTC [1] LOG:  database system is ready to accept connections
```

```
SERVICE   STATE     EXIT CODE
api       exited    1
```

The API died **593 ms before** the database was ready — and `depends_on` was
present the whole time. It had done its job: the `db` *container* had started.
It just says nothing about whether Postgres can answer.

### With the healthcheck — the API waits

```bash
docker compose up
```

Compose reports the gate explicitly:

```
Container 1-healthchecks-db-1   Started
Container 1-healthchecks-db-1   Waiting
Container 1-healthchecks-db-1   Healthy      <- the gate opens here
Container 1-healthchecks-api-1  Starting
Container 1-healthchecks-api-1  Started
```

Actual logs:

```
db-1  | 2026-09-25 13:30:26.241 UTC [1] LOG:  database system is ready to accept connections
api-1 | [2026-09-25T13:30:31.082Z] API starting up
api-1 | [2026-09-25T13:30:31.082Z] connecting to database at db:5432 ...
api-1 | [2026-09-25T13:30:31.104Z] connected — database answered at 2026-09-25T13:30:31.103Z
api-1 | [2026-09-25T13:30:31.107Z] API listening on port 3000
```

The probe history shows the gate itself:

```bash
docker inspect --format '{{range .State.Health.Log}}{{.Start}} exit={{.ExitCode}} {{.Output}}{{end}}' 1-healthchecks-db-1
# 2026-09-25 13:30:30.381 ... exit=0  /var/run/postgresql:5432 - accepting connections
```

### Side by side

| | Without healthcheck | With healthcheck |
|---|---|---|
| Database ready at | `13:30:00.755` | `13:30:26.241` |
| API starts at | `13:30:00.153` — **before** | `13:30:31.082` — **after** |
| Outcome | `ECONNREFUSED`, `exited 1` | `API listening on port 3000` |

The same API code, unchanged, in both runs. Only the orchestration differs.

## Notes

- **`depends_on` alone waits for *started*, not for *ready*.** Two different
  events, and the gap between them is where this class of bug lives.
- **Don't trust a log line as a readiness signal.** Postgres prints `ready to
  accept connections` **twice** on first boot: once for a temporary internal
  server used to initialise the database (Unix socket only, no TCP), then once
  for real. A probe run from outside, like `pg_isready`, is the reliable
  signal.
- **`start_period` is not a delay.** Probes still run during it; their failures
  simply don't count toward `retries`. It covers slow boots without making the
  container unhealthy.
- **The gate costs startup time**: roughly 4s here between the database being
  ready and the API starting, driven by `interval` and the probe schedule.
  That is the trade: a few seconds of latency for a deterministic start.
- **A healthcheck also keeps reporting after startup.** `docker compose ps`
  shows `Up (healthy)` continuously — if Postgres later stops answering, the
  container flips to `unhealthy`, which monitoring can act on.
