# Docker Fundamentals

Learning the basics of Docker: running containers from existing images, then
building my own image from a Dockerfile.

## Tasks

| Task | Content |
|---|---|
| [`0-first_container.md`](0-first_container.md) | Ran an official `nginx` image, published a port, inspected the running container, read its logs, cleaned up |
| [`1-first_image/`](1-first_image/) | A tiny Express app, its `Dockerfile`, and the exact build/run commands |

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
