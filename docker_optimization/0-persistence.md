# Task 0 — Data persistence with a named volume

## Objective

Run a stateful image (`postgres`), write data, destroy and recreate the container, and prove the
data survived — using a **named volume**, not a bind mount.

## Concept

A container owns a **writable layer**. Anything the process writes lands there, and `docker rm`
deletes it along with the container. That is the classic "my database is empty after a restart"
trap. Three storage mechanisms exist:

| Mechanism            | Declaration                             | Storage owner                            | Survives `docker rm`?        |
| -------------------- | --------------------------------------- | ---------------------------------------- | ---------------------------- |
| Container layer      | *(nothing)*                             | Docker, tied to the container            | No                           |
| **Named volume**     | `-v pgdata:/var/lib/postgresql/data`    | Docker, in `/var/lib/docker/volumes/`    | Yes                          |
| Bind mount           | `-v /Users/me/data:/var/lib/...`        | You, a host directory                    | Yes, but outside Docker      |
| Anonymous volume     | *(implicit, from `VOLUME` in the image)* | Docker, random 64-char name             | Yes — but unaddressable      |

For `postgres`, the directory to persist is `/var/lib/postgresql/data` (the default `PGDATA`).

## Walkthrough

### 1. Create the named volume

```bash
docker volume create pgdata
docker volume ls | grep pgdata
docker volume inspect pgdata
```

```
pgdata
local     pgdata
[
    {
        "CreatedAt": "2026-10-02T07:54:46Z",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/pgdata/_data",
        "Name": "pgdata",
        "Options": null,
        "Scope": "local"
    }
]
```

`"Driver": "local"` confirms Docker manages the storage itself. On macOS the `Mountpoint` path
lives inside the Docker Desktop Linux VM, not on the host filesystem — `ls /var/lib/docker` on the
Mac returns nothing. That is already a practical argument for named volumes over bind mounts: no
dependency on the host's directory layout.

### 2. Start Postgres with the volume mounted

```bash
docker run -d --name pg1 \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

docker ps --filter name=pg1
docker exec pg1 pg_isready -U postgres
```

```
CONTAINER ID   IMAGE                COMMAND                  CREATED         STATUS         PORTS      NAMES
e6d39e40ea00   postgres:16-alpine   "docker-entrypoint.s…"   4 minutes ago   Up 4 minutes   5432/tcp   pg1
/var/run/postgresql:5432 - accepting connections
```

Flags that matter:

- `-d` — detached, the container runs in the background.
- `--name pg1` — stable name, so later commands can target it.
- `-e POSTGRES_PASSWORD=secret` — the image refuses to start without it.
- `-v pgdata:/var/lib/postgresql/data` — **the line the whole task is about**.
- `postgres:16-alpine` — pinned tag, not `latest`.

Container ID to remember: **`e6d39e40ea00`**.

### 3. Write data

```bash
docker exec pg1 psql -U postgres \
  -c "CREATE TABLE notes (id serial PRIMARY KEY, body text, created_at timestamptz DEFAULT now());" \
  -c "INSERT INTO notes (body) VALUES ('note ecrite avant suppression du conteneur'), ('exercice 0-persistence par hinoto');" \
  -c "SELECT * FROM notes;"
```

```
CREATE TABLE
INSERT 0 2
 id |                    body                    |          created_at
----+--------------------------------------------+-------------------------------
  1 | note ecrite avant suppression du conteneur | 2026-10-02 08:45:00.207915+00
  2 | exercice 0-persistence par hinoto          | 2026-10-02 08:45:00.207915+00
(2 rows)
```

Timestamp to remember: **`08:45:00.207915+00`**. It is the fingerprint of these rows.

### 4. Destroy the container

```bash
docker stop pg1
docker ps -a --filter name=pg1
```

```
pg1
CONTAINER ID   IMAGE                COMMAND                  CREATED             STATUS                  PORTS     NAMES
e6d39e40ea00   postgres:16-alpine   "docker-entrypoint.s…"   About an hour ago   Exited (0) 1 second ago             pg1
```

`stop` is **not** `rm`. `Exited (0)` means a clean shutdown — Postgres caught the `SIGTERM` and
flushed its buffers — but the container object still exists and `docker start pg1` would bring it
back untouched. Nothing is proven yet. Actually removing it:

```bash
docker rm pg1
docker ps -a --filter name=pg1
docker volume ls | grep pgdata
```

```
pg1
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
local     pgdata
```

Empty table under the header: the container and its writable layer are gone. `pgdata` is still
listed — now an orphaned volume, data with no container to carry it.

Note that `docker rm` **never** deletes a named volume. Even `docker rm -v pg1` would only drop the
container's *anonymous* volumes. Removing `pgdata` requires an explicit `docker volume rm`.

### 5. Recreate and read back

The exact same `run` command as step 2:

```bash
docker run -d --name pg1 \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

docker ps --filter name=pg1
docker logs pg1 2>&1 | grep -i -m2 "skipping\|database system is ready"
docker exec pg1 psql -U postgres -c "SELECT * FROM notes;"
```

```
CONTAINER ID   IMAGE                COMMAND                  CREATED         STATUS         PORTS      NAMES
b9396a933e66   postgres:16-alpine   "docker-entrypoint.s…"   3 minutes ago   Up 3 minutes   5432/tcp   pg1

PostgreSQL Database directory appears to contain a database; Skipping initialization
2026-10-02 09:28:06.636 UTC [1] LOG:  database system is ready to accept connections

 id |                    body                    |          created_at
----+--------------------------------------------+-------------------------------
  1 | note ecrite avant suppression du conteneur | 2026-10-02 08:45:00.207915+00
  2 | exercice 0-persistence par hinoto          | 2026-10-02 08:45:00.207915+00
(2 rows)
```

## Observations

Three independent proofs, each closing off a different objection:

| Proof            | Observation                                      | Objection it rules out                    |
| ---------------- | ------------------------------------------------ | ----------------------------------------- |
| Container ID     | `e6d39e40ea00` → **`b9396a933e66`**              | "you just ran `docker start`"             |
| Entrypoint log   | `Skipping initialization`                        | "the cluster was recreated empty"         |
| `created_at`     | `08:45:00.207915+00`, byte-identical             | "the rows were re-inserted"               |

The `database system is ready to accept connections` line is stamped `09:28:06` — a fresh startup,
reading data written 43 minutes earlier. The `Skipping initialization` message is the most elegant
of the three: the image's own entrypoint checks whether `PGDATA` is empty, and reports that it found
an existing database. Docker itself states that the volume already held our data.

## Counter-proof: the same scenario without a named volume

Proving "it works with a volume" is weaker than proving "the volume is what makes it work". So the
experiment was repeated with the `-v` flag removed.

The naive expectation — "without `-v`, data goes to the writable layer and `docker rm` erases it" —
is **wrong** for this image:

```bash
docker image inspect postgres:16-alpine --format '{{json .Config.Volumes}}'
docker volume ls -q | wc -l
docker volume ls -qf dangling=true | wc -l
```

```
{"/var/lib/postgresql/data":{}}
      46
      42
```

The image **declares** `VOLUME /var/lib/postgresql/data` in its Dockerfile. Docker therefore refuses
to leave that path in the writable layer and silently creates an **anonymous volume** — a real
volume, named with a random 64-character hash.

Baseline: 46 volumes, 42 of them `dangling` (referenced by no container). Those 42 are the
accumulated debris of earlier exercises — which is itself the problem this task is about.

```bash
docker run -d --name pg-novol -e POSTGRES_PASSWORD=secret postgres:16-alpine
docker volume ls -q | wc -l

docker exec pg-novol psql -U postgres \
  -c "CREATE TABLE notes (id serial PRIMARY KEY, body text, created_at timestamptz DEFAULT now());" \
  -c "INSERT INTO notes (body) VALUES ('ligne sans volume nomme, vouee a devenir inadressable');" \
  -c "SELECT * FROM notes;"

docker inspect pg-novol --format '{{range .Mounts}}{{.Type}} | {{.Name}} | -> {{.Destination}}{{end}}'
```

```
      47
CREATE TABLE
INSERT 0 1
 id |                         body                          |          created_at
----+-------------------------------------------------------+-------------------------------
  1 | ligne sans volume nomme, vouee a devenir inadressable | 2026-10-02 09:53:27.456347+00
(1 row)

volume | 051f27eed43b9083de97c1fbbf29cec45d0998c1d3f123e2e2b6a40a7a8285a2 | -> /var/lib/postgresql/data
```

The count went 46 → 47 with no `-v` flag given. The mount is of type `volume`, same destination as
`pg1` — only the readability of the name differs. `pgdata` can be retyped; a hash cannot.

```bash
docker rm -f pg-novol
docker volume ls -qf dangling=true | wc -l
docker volume ls -qf dangling=true | grep 051f27eed43b
docker run -d --name pg-novol -e POSTGRES_PASSWORD=secret postgres:16-alpine
docker inspect pg-novol --format '{{range .Mounts}}{{.Name}}{{end}}'
```

```
pg-novol
      43
051f27eed43b9083de97c1fbbf29cec45d0998c1d3f123e2e2b6a40a7a8285a2
f06e19f3b4ada6af9de93cad7a40d81af95fe67d67abf483aad7bd44bf72ff49
1dd818b489fc75de4247f4c9a2a597425cbf9beb8edcf7724208e023d442b2c1
```

Dangling count 42 → 43, and the `grep` confirms the new orphan is our volume: the data is still on
disk. But the recreated container received a **different** anonymous volume,
`1dd818b4…` ≠ `051f27…`. Docker has no way to guess you wanted the old one back — an anonymous
volume is never reused automatically. Every `-v`-less `docker run` mints a new one and abandons the
previous.

The SQL verdict, both containers side by side:

```bash
docker exec pg-novol psql -U postgres -c "SELECT * FROM notes;"; \
docker exec pg1 psql -U postgres -c "SELECT count(*) FROM notes;"
```

```
ERROR:  relation "notes" does not exist
LINE 1: SELECT * FROM notes;
                      ^
 count
-------
     2
(1 row)
```

(`;` rather than `&&` between the two commands: the first `psql` is *expected* to fail, and `&&`
would prevent the second from running.)

Same image, same `rm` / `run` sequence, opposite outcomes. The only difference is
`-v pgdata:/var/lib/postgresql/data`.

**Conclusion.** The value of a named volume is not merely that bytes survive — an anonymous volume
survives too. It is **addressability**: a name you can type again, so a future container can be
pointed at the same data. Without it, the bytes persist as unreachable garbage consuming disk.

## Named volume vs bind mount

The `-v <source>:<target>` syntax is ambiguous by design; Docker infers the mount type from the
shape of the source:

| Written                    | Interpreted as    | Allowed here |
| -------------------------- | ----------------- | ------------ |
| `pgdata:/var/lib/...`      | **named volume**  | yes          |
| `./pgdata:/var/lib/...`    | bind mount        | no           |
| `/Users/me/pg:/var/lib/...`| bind mount        | no           |

No leading `/` or `.` means a named volume. The task forbids bind mounts because they demonstrate a
host directory, not a Docker-managed volume with its own lifecycle (`docker volume ls`,
`inspect`, `rm`) and no coupling to the host's filesystem layout.

The explicit, unambiguous form is also available and preferable in scripts:

```bash
--mount type=volume,source=pgdata,target=/var/lib/postgresql/data
```

## Cleanup

```bash
docker rm -f pg1 pg-novol
docker volume rm pgdata
```

Removing the orphaned anonymous volumes left by the counter-proof (and by earlier exercises) is a
separate, irreversible operation:

```bash
docker volume ls -qf dangling=true     # review the list first
docker volume prune                    # deletes every dangling volume
```
