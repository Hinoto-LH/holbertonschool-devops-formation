# 4. Architecture of the full stack

A map of the stack built in [`2-full_stack/`](2-full_stack/): five services,
one network, one volume, one published port. Every address, IP and figure
below was read from the running stack, not from memory.

## The picture

```
                        ┌─────────────────────────────────┐
   HOST (macOS)         │  browser / curl                 │
                        └────────────────┬────────────────┘
                                         │ http://localhost:8080
════════════════════════════════════════ │ ═══════════════════════════ the only
                                         ▼                             way in
   DOCKER                   ┌─────────────────────────┐
   network                  │  proxy      172.19.0.6  │  nginx
   2-full_stack_default     │  :80  ──►  published    │  routes by path
   bridge, 172.19.0.0/16    │            as :8080     │  owns no content
   gateway 172.19.0.1       └───────┬─────────────┬───┘
                                    │             │
                        location /  │             │  location /api/
                                    ▼             ▼
                   ┌─────────────────────┐   ┌─────────────────────┐
                   │  web   172.19.0.2   │   │  api   172.19.0.5   │
                   │  :80                │   │  :3000              │
                   │  nginx, static page │   │  Express            │
                   └─────────────────────┘   └────┬───────────┬────┘
                                                  │           │
                                   redis://cache  │           │  postgres://db
                                                  ▼           ▼
                            ┌─────────────────────┐   ┌─────────────────────┐
                            │  cache 172.19.0.3   │   │  db    172.19.0.4   │
                            │  :6379              │   │  :5432              │
                            │  Redis, no volume   │   │  PostgreSQL         │
                            └─────────────────────┘   └──────────┬──────────┘
                                                                 │
                                                      ┌──────────▼──────────┐
                                                      │ volume              │
                                                      │ 2-full_stack_db_data│
                                                      └─────────────────────┘
```

## Services

| Service | Image | Role | Listens on | Published to the host |
|---|---|---|---|---|
| `proxy` | `nginx:alpine` | Reverse proxy. The single entry point; routes by path prefix and owns no content of its own | `80` | **yes — `8080:80`** |
| `web` | `nginx:alpine` | Static front: serves `index.html` | `80` | no |
| `api` | built from `api/Dockerfile` | Express. Reads the cache first, falls back to the database, writes the result back to the cache | `3000` | no |
| `cache` | `redis:7-alpine` | Holds the computed report under the key `report` for 30s | `6379` | no |
| `db` | `postgres:17-alpine` | Source of truth. Computes the report when the cache is cold | `5432` | no |

Four of the five services listen on a port but are **unreachable from the
host**. Only `proxy` has a `ports:` mapping, which is the whole point of
putting a reverse proxy in front.

## Networks

Compose creates one network for the project and attaches every service to it.
Nothing in `compose.yaml` declares it — it is implicit.

```bash
docker network inspect 2-full_stack_default
# 2-full_stack_default | driver=bridge | subnet=172.19.0.0/16 gateway=172.19.0.1
```

| Container | Address |
|---|---|
| `2-full_stack-web-1` | `172.19.0.2` |
| `2-full_stack-cache-1` | `172.19.0.3` |
| `2-full_stack-db-1` | `172.19.0.4` |
| `2-full_stack-api-1` | `172.19.0.5` |
| `2-full_stack-proxy-1` | `172.19.0.6` |

**Those IPs are never written anywhere in the project**, and they are not
stable: they are handed out in start order, so they change between runs.
Compose runs a DNS on this network that resolves each **service name**, which
is why the configuration says:

- `proxy/nginx.conf` → `proxy_pass http://web:80` and `http://api:3000`
- `api/index.js` → `redis://cache:6379` and `host: 'db'`

Everything is namespaced by project name (`2-full_stack_`), so this network is
isolated from the other stacks in this repository.

## Volumes

| Mount | Type | Backing | Purpose |
|---|---|---|---|
| `db_data:/var/lib/postgresql/data` | **named volume** | `/var/lib/docker/volumes/2-full_stack_db_data/_data` | The database files. Survives `docker compose down` |
| `./proxy/nginx.conf:/etc/nginx/conf.d/default.conf:ro` | bind mount | the project directory | Routing rules, read-only |
| `./web/index.html:/usr/share/nginx/html/index.html:ro` | bind mount | the project directory | The static page, read-only |

The distinction is deliberate:

- **`db` has a volume** because losing its files means losing data.
- **`cache` has none** because a cache is disposable by definition: losing it
  costs one slow request. Redis holds its data in memory only, and that is the
  correct design.
- **The two bind mounts carry no state** — they inject configuration that
  already lives in Git, which is why they are mounted `:ro`.

Everything else written inside a container goes to its thin writable layer and
disappears with `docker compose down`.

## The path of a request

### Cold path — the cache is empty

```
 1.  curl                  GET http://localhost:8080/api/report
 2.  macOS                 port 8080 -> Docker Desktop's virtual network
 3.  proxy   :80           nginx matches `location /api/`
 4.  proxy                 resolves "api" via Compose DNS -> 172.19.0.5
 5.  proxy                 proxy_pass http://api:3000, adds X-Forwarded-For
 6.  api     :3000         Express route GET /api/report
 7.  api  -> cache  :6379  GET report            -> (nil)   ← MISS
 8.  api  -> db     :5432  SELECT pg_sleep(1)               ← ~1000 ms
 9.  api  -> db     :5432  SELECT count(*) ... generate_series
10.  api  -> cache  :6379  SETEX report 30 {...}
11.  api                   200 {"source":"database (postgres)","elapsed_ms":1063}
12.  proxy                 relays the response unchanged
13.  curl                  total 1.067 s
```

### Warm path — the same request, 100 ms later

```
 1-6. identical
 7.  api  -> cache  :6379  GET report -> {...}              ← HIT
 8.  api                   200 {"source":"cache (redis)","elapsed_ms":0}
 9.  curl                  total 0.002 s
```

Steps 8 to 10 — the whole database round trip — simply do not happen. That is
the point of the cache: **1.067 s against 0.002 s, and the database is left
alone**.

### Observed at each layer

The proxy logs both requests, and the response sizes differ because the two
payloads are not identical (`source` is a different string):

```
192.168.65.1 - - [25/Sep/2026:13:59:31] "GET /api/report HTTP/1.1" 200 134   <- cold
192.168.65.1 - - [25/Sep/2026:13:59:31] "GET /api/report HTTP/1.1" 200 125   <- warm
```

`192.168.65.1` is not the Mac's real address: it is the gateway of Docker
Desktop's virtual network, which the request crossed on its way in.

The key created at step 10, read directly from Redis:

```bash
docker compose exec cache redis-cli GET report
# {"row_count":100000,"computed_at":"2026-09-25T13:59:31.031Z","cached_for_seconds":30}
docker compose exec cache redis-cli TTL report
# 30
```

`computed_at` is the timestamp Postgres returned during the cold request. It
stays frozen for the whole 30s window — proof that the warm responses are
replays, not recomputations.

## Startup order

The request path above only works if the services come up in the right order,
which the file declares rather than leaves to chance:

```
  db ──┐
       ├──(both healthy)──► api ──(healthy)──► proxy
cache ─┘
  web ─────────────────────────────────────────┘
```

`db`, `cache` and `web` start in parallel — nothing links them. `api` waits
for `db` **and** `cache` to report healthy; `proxy` waits for `api`. Compose
serialises only the declared dependencies.

## Trust boundaries in one sentence

The host can reach exactly one port (`8080` on `proxy`); everything behind it
talks over a private bridge network by service name, and the only thing that
survives a teardown is the one volume that was explicitly asked for.
