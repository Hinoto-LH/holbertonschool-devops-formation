# Docker Compose

Describing multi-service stacks in a single file instead of juggling several
`docker run` invocations.

## Tasks

| Task | Content |
|---|---|
| [`0-first_stack/`](0-first_stack/) | A three-service stack — nginx front, Express API, PostgreSQL — started with one `docker compose up` |
| [`1-healthchecks/`](1-healthchecks/) | The API/database startup race, demonstrated with real logs and fixed with a healthcheck + `condition: service_healthy` |
| [`2-full_stack/`](2-full_stack/) | Five services: an nginx reverse proxy as the single entry point, and a Redis cache in front of PostgreSQL |
| [`3-fix_stack/`](3-fix_stack/) | Debugged a `compose.yaml` that refused to come up: undefined service, port conflict, missing database credentials |

## Requirements

- Docker and Docker Compose installed and running
- Every stack comes up with a single `docker compose up`
- **No secrets in version control**: values live in a `.env` file, which is
  gitignored. Each stack ships a `.env.example` instead.

## Why Compose exists

Running the task 0 stack by hand would mean creating a network, then starting
three containers in the right order, each with its own flags, environment
variables and port mappings — and none of it written down anywhere.

Compose replaces those commands with **one versioned file** describing the
desired state, and a single command to reach it. It is the move from
imperative ("type these commands in this order") to declarative ("here is what
the stack should look like").

## Key takeaways so far

- **Service names are DNS names.** Compose creates a network for the project
  and resolves each service name on it, so containers address each other by
  name, never by IP.
- **Publish only what must be public.** A service without `ports:` is still
  reachable by the other services, but not from the host — the right default
  for an API or a database.
- **`depends_on` alone does not wait for readiness.** It waits for the
  container to start. Ordering a stack correctly means pairing it with a
  `healthcheck` and `condition: service_healthy`.
- **`down` keeps named volumes.** Containers and networks are disposable,
  declared data is not. `down -v` is the explicit opt-in to delete it.
- **One door.** A reverse proxy concentrates external traffic on a single
  published port and routes by path; every other service stays internal.
- **Not all state deserves a volume.** The database gets one; the cache
  deliberately does not — losing a cache costs a slow request, not data.
- **`docker compose config` is the cheapest debugging step.** It validates an
  inherited file and resolves its variables without starting anything.
- **Failures surface at different stages** — validation, container creation,
  runtime — and each stage needs a different command to see it.
