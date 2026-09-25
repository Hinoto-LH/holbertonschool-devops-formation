# Docker Fundamentals

Learning the basics of Docker: running containers from existing images, then
building my own image from a Dockerfile.

## Tasks

| Task | Content |
|---|---|
| [`0-first_container.md`](0-first_container.md) | Ran an official `nginx` image, published a port, inspected the running container, read its logs, cleaned up |
| [`1-first_image/`](1-first_image/) | A tiny Express app, its `Dockerfile`, and the exact build/run commands |
| [`2-fix_flask/`](2-fix_flask/) | Debugged a broken `Dockerfile` for a Flask app, without touching the app code |
| [`3-fix_express/`](3-fix_express/) | Debugged a broken `Dockerfile` for an Express app: wrong instruction order, wrong `EXPOSE` |
| [`4-interact.md`](4-interact.md) | Made the task 1 message configurable with an env var, then `-e` / `exec` / `inspect` / `logs` on the running container |

## Requirements

- Docker installed and running (`docker run hello-world` works)
- No secrets, no `node_modules` and no virtualenvs committed

## Key takeaways so far

- An **image** is the read-only template; a **container** is a running instance
  of it. Deleting the container leaves the image on disk.
- A container carries its own Linux filesystem, which is why the same image
  runs identically anywhere.
- `EXPOSE` documents a port; `-p` is what actually publishes it — and the app
  must bind to `0.0.0.0` for that mapping to be of any use.
- **A Dockerfile that builds is not a Dockerfile that works.** `RUN` fails at
  build time and is loud; a wrong `CMD` only fails when a container starts.
- **Order is an instruction too.** Every line can be valid on its own and the
  file still be broken: what matters is what exists in the image at the moment
  each instruction runs.
- **Configuration is injected at run time, not baked in.** One image, many
  containers, different `-e` values — no rebuild in between.
