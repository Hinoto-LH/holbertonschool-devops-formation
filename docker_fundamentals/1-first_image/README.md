# 1. Your first Dockerfile

A tiny Express web app, packaged into a Docker image. It answers a short
message on port `3000` inside the container.

## Files

| File | Role |
|---|---|
| `app.js` | The app: replies `Hello from my first Docker image!` on `GET /` |
| `package.json` | Project manifest, declares the `express` dependency |
| `Dockerfile` | The recipe used to build the image |
| `.dockerignore` | Keeps `node_modules` and `.git` out of the build context |

Dependencies are **never installed by hand**: `npm install` runs inside the
Dockerfile, so no `node_modules` directory exists on the host.

## Build

```bash
docker build -t first-image .
```

The trailing `.` is the build context (the directory sent to the Docker
daemon, and the root your `COPY` instructions resolve against).

## Run

```bash
docker run -d --name first -p 8080:3000 first-image
```

- `-d` runs it detached
- `-p 8080:3000` maps host port `8080` to container port `3000`
- `3000` matches both `EXPOSE 3000` and `const PORT = 3000` in `app.js`

## Verify

```bash
curl http://localhost:8080
# -> Hello from my first Docker image!

docker ps            # STATUS: Up ... PORTS: 0.0.0.0:8080->3000/tcp
docker logs first    # -> App listening on port 3000
```

## Configurable message

The message is read from the `GREETING` environment variable, with the value
above as the default (set by `ENV` in the Dockerfile):

```bash
docker run -d --name greet -p 8081:3000 -e GREETING="Hi there!" first-image
curl http://localhost:8081   # -> Hi there!
```

See [`../4-interact.md`](../4-interact.md) for the full walkthrough.

## Clean up

```bash
docker stop first
docker rm first
```

## Notes

- **Layer cache**: `package*.json` is copied and installed *before* the source
  code is copied. Editing `app.js` then rebuilds without re-running
  `npm install`.
- **`EXPOSE` publishes nothing.** It only documents the port the app listens
  on; only `-p` at run time actually publishes it.
- **`app.listen(PORT, '0.0.0.0')`**: binding to `127.0.0.1` would make the app
  unreachable from the host even with `-p` set.
- **`CMD ["node", "app.js"]`** uses the exec form, so the app is PID 1 and
  receives `SIGTERM` from `docker stop` directly.
- `node:22-alpine` keeps the image around 64 MB instead of ~1 GB.
