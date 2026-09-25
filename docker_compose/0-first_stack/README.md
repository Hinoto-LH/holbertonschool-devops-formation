# 0. Your first stack

Three services described in one `compose.yaml`, started with a single
`docker compose up`.

```
              curl / browser
                    │
               :8080  (the only published port)
                    ▼
            ┌───────────────┐
            │ web           │  nginx: serves index.html,
            │ nginx:alpine  │  proxies /api to the API
            └───────┬───────┘
                    │  Compose internal network
                    ▼
            ┌───────────────┐
            │ api           │  Express: queries the database,
            │ built locally │  answers JSON
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ db            │  PostgreSQL + named volume
            │ postgres:17   │  (data survives `down`)
            └───────────────┘
```

`api` and `db` have **no published port**: they are reachable only from inside
the stack. Only `web` is exposed to the host.

## Layout

| Path | Role |
|---|---|
| `compose.yaml` | The whole stack: three services, one volume |
| `api/` | Express app (`index.js`, `package.json`, `Dockerfile`) — built by Compose |
| `web/` | `index.html` and `nginx.conf`, bind-mounted read-only into nginx |
| `.env.example` | Template for the variables the stack needs |
| `.env` | Real values — **not in Git** |

## Setup

The database credentials come from a `.env` file, which is gitignored:

```bash
cp .env.example .env
# then edit .env and set POSTGRES_PASSWORD
```

## Run

```bash
docker compose up          # add -d to run detached
```

Compose builds the `api` image on first run, creates the network and the
volume, then starts the services **in dependency order**.

## Verify

```bash
docker compose ps
# SERVICE  STATUS                  PORTS
# api      Up (healthy)            3000/tcp
# db       Up (healthy)            5432/tcp
# web      Up                      0.0.0.0:8080->80/tcp

curl http://localhost:8080          # the page served by nginx
curl http://localhost:8080/api      # nginx -> api -> postgres
# {"service":"api","status":"ok","message":"API reached the database",
#  "db_host":"db","db_time":"...","db_version":"PostgreSQL 17.11 ..."}
```

Open <http://localhost:8080> in a browser: the page fetches `/api` and displays
the JSON, which proves the three services talk to each other.

## Other lifecycle commands

```bash
docker compose logs              # all services, interleaved and prefixed
docker compose logs -f api       # follow one service
docker compose exec db psql -U appuser -d appdb -c "SELECT current_user;"
docker compose ps
```

## Stop

```bash
docker compose down        # removes containers and the network
docker compose down -v     # ...and the named volume (deletes the data)
```

`down` deliberately keeps the volume: the stack can be torn down and brought
back up with the database content intact.

## Notes

- **Service names are hostnames.** `nginx.conf` says `proxy_pass
  http://api:3000` and the API connects to host `db` — Compose runs a DNS on
  the network it creates, so no IP address is ever hardcoded.
- **`build` vs `image`.** `api` is built from `./api/Dockerfile`; `web` and
  `db` pull existing images.
- **Startup order needs `healthcheck`, not just `depends_on`.** Plain
  `depends_on` waits for the container to *start*, not for the service to be
  *ready*. PostgreSQL takes a few seconds before it accepts queries, so the API
  waits on `condition: service_healthy`, and `web` waits on the API the same
  way.
- **`127.0.0.1` in the API healthcheck, not `localhost`.** The app binds to
  `0.0.0.0`, which is IPv4-only, while `localhost` in the container also
  resolves to `::1` — which BusyBox `wget` tries first, and gets a connection
  refused.
- **`$$` in the healthcheck command** escapes the dollar so Compose leaves it
  for the container's shell instead of interpolating it itself.
- **Named volume vs bind mount.** `db_data:` is managed by Docker and persists
  data; `./web/nginx.conf:...:ro` mounts a file from the project, read-only.
- **No `version:` key**: obsolete in Compose v2.
