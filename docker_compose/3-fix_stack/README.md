# 3. Fix a broken stack

A `compose.yaml` that refused to come up for three separate reasons. Only the
compose file was modified — the stack itself was not redesigned.

## Run

```bash
cp .env.example .env      # then set POSTGRES_PASSWORD
docker compose up         # add -d to detach
```

```
SERVICE   STATUS                    PORTS
api       Up                        0.0.0.0:8081->80/tcp
cache     Up                        6379/tcp
db        Up (healthy)              5432/tcp
web       Up                        0.0.0.0:8080->80/tcp
```

```bash
curl -o /dev/null -w '%{http_code}\n' http://localhost:8080   # 200 (web)
curl -o /dev/null -w '%{http_code}\n' http://localhost:8081   # 200 (api)
docker compose down
```

## First reflex on an inherited compose file

```bash
docker compose config
```

It validates the file and prints the resolved configuration **without starting
anything**. It caught the first bug instantly, for free.

## Bug 1 — a reference to a service that does not exist

```yaml
api:
  depends_on:
    - databse        # typo
```

```
service "api" depends on undefined service "databse": invalid compose project
```

The service is called `db`. Compose rejects **the whole project**: nothing
started at all, not even the three correct services. One typo in a name blocks
the entire stack.

**Fix:** `- db`

## Bug 2 — two services fighting over the same host port

```yaml
web:
  ports: ["8080:80"]
api:
  ports: ["8080:8080"]    # same host port
```

```
Bind for 0.0.0.0:8080 failed: port is already allocated
```

A host port belongs to exactly one container. The container side can repeat
freely — every container has its own network stack — but the host side is a
single resource of the machine.

That same line had a second flaw: `api` runs `nginx:alpine`, which listens on
**80**, not 8080. Even without the conflict, `8080:8080` would have pointed at
a port where nothing listens.

**Fix:** `- "8081:80"` — a free host port, and the port nginx actually uses.

## Bug 3 — the database has no credentials

```yaml
db:
  image: postgres:16
  # no environment at all
```

```
Error: Database is uninitialized and superuser password is not specified.
You must specify POSTGRES_PASSWORD to a non-empty value for the superuser.
```

`db exited (1)`. With a `restart` policy it would restart forever — the crash
loop the task warns about.

**Fix:**

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

The value lives in `.env`, which is gitignored; `.env.example` is committed in
its place.

**A constraint worth noticing:** the healthcheck probes `pg_isready -U
postgres`, so the superuser name must stay `postgres`. Adding a
`POSTGRES_USER: appuser` out of habit would have fixed the startup and broken
the healthcheck instead. The existing file constrains the fix.

## Summary

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | `invalid compose project`, nothing starts | `depends_on: databse`, a typo | `- db` |
| 2 | `port is already allocated` | `8080` claimed by two services (and the wrong container port) | `8081:80` |
| 3 | `db exited (1)`, crash loop | no `POSTGRES_PASSWORD` | `environment:` from `.env` |

The three failures surface at three different moments: bug 1 at **validation**,
before any container exists; bug 2 at **container creation**, when Docker binds
the port; bug 3 at **runtime**, inside the container. Reading the error is
usually enough — the hard part is knowing to look in the right place.
