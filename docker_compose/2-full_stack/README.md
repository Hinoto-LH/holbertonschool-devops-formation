# 2. Full stack: reverse proxy + cache

Five services, one published port. A reverse proxy is the single entry point,
and a Redis cache sits between the API and the database so hot data is not
recomputed on every request.

```
                    curl / browser
                          │
                     :8080   ← the ONLY published port
                          ▼
                  ┌───────────────┐
                  │  proxy        │  nginx reverse proxy
                  │  (nginx)      │  /      -> web
                  └───┬───────┬───┘  /api/* -> api
                      │       │
          ┌───────────┘       └──────────┐
          ▼                              ▼
   ┌─────────────┐              ┌─────────────┐
   │  web        │              │  api        │
   │  (nginx)    │              │  (Express)  │
   └─────────────┘              └──┬───────┬──┘
                                   │       │
                        ┌──────────┘       └────────┐
                        ▼                           ▼
                 ┌─────────────┐            ┌─────────────┐
                 │  cache      │            │  db         │
                 │  (Redis)    │            │ (PostgreSQL)│
                 └─────────────┘            └─────────────┘
```

`proxy` and `web` are both nginx but do different jobs: **`web` serves files**,
**`proxy` makes routing decisions**. Only `proxy` is published.

## Layout

| Path | Role |
|---|---|
| `compose.yaml` | The five services and their dependency conditions |
| `proxy/nginx.conf` | Routing rules: `/` to the front, `/api/` to the API |
| `web/index.html` | Static page, bind-mounted into nginx |
| `api/` | Express + `pg` + `redis`, built by Compose |
| `.env.example` | Template; the real `.env` is gitignored |

## Run

```bash
cp .env.example .env      # then set POSTGRES_PASSWORD
docker compose up         # add -d to detach
```

Open <http://localhost:8080> — the page has buttons for both endpoints.

## Stop

```bash
docker compose down       # add -v to delete the database volume too
```

## The reverse proxy

`proxy/nginx.conf` routes by path prefix:

```nginx
location / {
    proxy_pass http://web:80;
}

location /api/ {
    proxy_pass http://api:3000;    # no trailing slash: the /api prefix is kept
}
```

`web` and `api` are **service names**, resolved by Compose's internal DNS. No
IP address appears anywhere.

Each location also forwards the client's identity, which would otherwise be
lost — the backend would see every request coming from the proxy:

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Verified — one door, everything else internal:

```
SERVICE   STATUS                    PORTS
api       Up (healthy)              3000/tcp
cache     Up (healthy)              6379/tcp
db        Up (healthy)              5432/tcp
proxy     Up                        0.0.0.0:8080->80/tcp
web       Up                        80/tcp
```

Both routes, seen in the proxy's access log:

```
"GET /api/report HTTP/1.1" 200
"GET / HTTP/1.1" 200
```

## The cache

`GET /api/report` returns a report that takes ~1s to compute in Postgres. The
result is stored in Redis under the key `report` with a 30s TTL, and the
response states where it came from.

```bash
# 1st call — cache empty
curl http://localhost:8080/api/report
# {"row_count":100000,"computed_at":"2026-09-25T13:45:30.166Z",
#  "cached_for_seconds":30,"source":"database (postgres)","elapsed_ms":1059}

# 2nd call — same data, straight from Redis
curl http://localhost:8080/api/report
# {"row_count":100000,"computed_at":"2026-09-25T13:45:30.166Z",
#  "cached_for_seconds":30,"source":"cache (redis)","elapsed_ms":1}

# drop the key, next call recomputes
curl -X DELETE http://localhost:8080/api/cache
# {"deleted_keys":1}

curl http://localhost:8080/api/report
# ... "computed_at":"2026-09-25T13:45:31.271Z","source":"database (postgres)","elapsed_ms":1031
```

| | Source | `elapsed_ms` |
|---|---|---|
| 1st call | database | 1059 |
| 2nd call | cache | 1 |
| 3rd call | cache | 1 |
| after `DELETE /api/cache` | database | 1031 |

**A thousand times faster, and the database was queried twice for four
requests.** Note that `computed_at` is *identical* across cache hits and only
changes after the key is dropped — that is the proof nothing was recomputed.

The app reaches Redis by service name, `redis://cache:6379`. Checked from
inside the API container:

```bash
docker compose exec api sh -c 'nslookup cache'
# Name:    cache
# Address: 172.19.0.3

docker compose exec cache redis-cli KEYS '*'
# report
docker compose exec cache redis-cli TTL report
# 19          <- seconds left before it expires
```

## Notes

- **The cache has no volume, on purpose.** A cache is disposable by
  definition: losing it costs one slow request, not data. The database keeps
  its named volume.
- **Redis' healthcheck is `redis-cli ping`**, which answers `PONG` only once
  the server is ready — the Redis equivalent of `pg_isready`.
- **The API waits for *both* backends.** `depends_on` lists `db` and `cache`,
  each with `condition: service_healthy`, and the proxy in turn waits for the
  API to be healthy.
- **Compose parallelises what it can.** `db`, `cache` and `web` start at the
  same time because nothing links them; only the declared dependencies are
  serialised.
- **`proxy_pass http://api:3000` without a trailing slash** keeps the `/api`
  prefix. With `http://api:3000/`, nginx would strip it and the API — whose
  routes are declared as `/api/...` — would answer 404.
- **A TTL is a correctness decision, not a performance one.** 30s here means
  the report can be up to 30s stale; that number belongs to whoever owns the
  data, not to the infrastructure.
