# 4. Interacting with a running container

I took the image from task 1 and made its message configurable through the
`GREETING` environment variable, then ran two containers from that **same
image** to compare: one with the default value, one overridden with `-e`.

## What changed in the app

`1-first_image/app.js` now reads the variable, with a fallback so the app
still works if nothing is set:

```js
const GREETING = process.env.GREETING || 'Hello from my first Docker image!';

app.get('/', (req, res) => {
  res.send(`${GREETING}\n`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`App listening on port ${PORT}`);
  console.log(`GREETING = ${GREETING}`);   // makes the value visible in docker logs
});
```

`1-first_image/Dockerfile` bakes a default into the image:

```dockerfile
ENV GREETING="Hello from my first Docker image!"
```

So the value can come from three places, in increasing priority:

| Priority | Source | When it applies |
|---|---|---|
| 1 (lowest) | `process.env.GREETING \|\| '...'` in JS | nothing set anywhere |
| 2 | `ENV` in the Dockerfile | baked at build time, default for every container |
| 3 (highest) | `-e` on `docker run` | per container, at run time |

## 1. Passing the variable at run time (`-e`)

```bash
docker build -t first-image .

# default value, coming from the image
docker run -d --name first -p 8080:3000 first-image
curl http://localhost:8080
# -> Hello from my first Docker image!

# same image, value overridden at run time
docker run -d --name greet -p 8081:3000 \
  -e GREETING="Bonjour Hinoto, depuis une variable d'environnement !" \
  first-image
curl http://localhost:8081
# -> Bonjour Hinoto, depuis une variable d'environnement !
```

**Observed:** two containers, one single image, two different answers. The
image was not rebuilt between the two runs — configuration is injected at run
time, not baked per environment. This is what lets the same artifact go from
dev to staging to production unchanged.

## 2. Reading it from inside (`exec`)

```bash
docker exec greet printenv GREETING
# -> Bonjour Hinoto, depuis une variable d'environnement !

docker exec first printenv GREETING
# -> Hello from my first Docker image!

docker exec greet env | grep -E 'GREETING|HOSTNAME|NODE_VERSION'
# -> HOSTNAME=1eb8d94c337c
# -> GREETING=Bonjour Hinoto, depuis une variable d'environnement !
# -> NODE_VERSION=22.23.3
```

**Observed:** `docker exec` starts a **new process** inside the already running
container, and that process inherits the container's environment — which is
why it sees the same `GREETING` the app sees. `HOSTNAME` is the container id,
and `NODE_VERSION` comes from the base image: the environment is a mix of what
the image provides and what I passed in.

This is the check that answers "is the app misreading the variable, or was the
variable never set?" — two very different bugs.

## 3. Inspecting the container (`inspect` and `logs`)

```bash
docker inspect --format '{{json .Config.Env}}' greet
# ["GREETING=Bonjour Hinoto, depuis une variable d'environnement !",
#  "PATH=...","NODE_VERSION=22.23.3","YARN_VERSION=1.22.22"]

docker inspect --format '{{json .Config.Env}}' first
# ["PATH=...","NODE_VERSION=22.23.3","YARN_VERSION=1.22.22",
#  "GREETING=Hello from my first Docker image!"]
```

**Observed — the most interesting detail of this task:** the *position* of
`GREETING` in the array differs between the two containers.

- In `greet`, it is **first**: values passed with `-e` are prepended.
- In `first`, it is **last**: values inherited from the image's `ENV` are
  appended after the base image's own variables.

So `inspect` tells me not only *what* the value is, but *where it came from* —
useful when a variable holds an unexpected value and I need to know whether
the image or the run command is responsible.

```bash
docker logs greet
# App listening on port 3000
# GREETING = Bonjour Hinoto, depuis une variable d'environnement !

docker logs first
# App listening on port 3000
# GREETING = Hello from my first Docker image!
```

**Observed:** logging the value at startup shows what the **application
actually read**, which is not always what Docker was told to set (a typo in the
variable name, for instance, would show up here as the fallback value while
`inspect` still displays the variable I passed).

## Which of the three to reach for

| Question | Command |
|---|---|
| What did Docker configure? | `docker inspect` |
| What does the container's environment really contain, right now? | `docker exec ... printenv` |
| What did the app actually read and do with it? | `docker logs` |

## Note on secrets

Everything shown here is visible: `docker inspect` and `docker exec env`
expose every variable to anyone with access to the daemon, and an `ENV` line
is stored in the image itself and travels with it. Fine for a greeting,
unsuitable for passwords or API keys — those need Docker secrets or an
external secret manager.

## Clean up

```bash
docker rm -f first greet
```
