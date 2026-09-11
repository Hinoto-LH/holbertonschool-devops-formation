# 0. Meet your first container

I ran an official `nginx` image, published a port to my host, hit it with
`curl`, looked inside the running container, read its logs, and cleaned up.

## Commands used

```bash
# 1. Run the official nginx image, detached, publishing host port 8080 -> container port 80
docker run -d --name web -p 8080:80 nginx

# 2. Confirm it runs, then reach it from the host
docker ps
curl http://localhost:8080          # returns the "Welcome to nginx!" HTML page

# 3. Open a shell INSIDE the running container and look around
docker exec -it web /bin/bash
#   --- run these inside the container ---
whoami                              # -> root
hostname                            # -> 4e2a80f8593a  (the container id)
ls /usr/share/nginx/html            # -> 50x.html  index.html
cat /usr/share/nginx/html/index.html
cat /etc/os-release                 # -> Debian GNU/Linux 13 (trixie)
exit
#   --------------------------------------

# 4. Read the container logs (shows my curl request)
docker logs web                     # ... "GET / HTTP/1.1" 200 ...

# 5. Clean up
docker stop web
docker rm web
docker ps -a                        # "web" is gone
```

## 3 observations (in my own words)

1. **An image and a container are not the same thing.** The nginx *image* is the
   read-only template; the *container* is a running instance created from it.
   When I deleted the container with `docker rm web`, the nginx image was still on
   my machine (`docker images` still lists it), so I could start a brand-new
   container from it at any time.

2. **A container is an isolated environment, not just a process on my Mac.**
   Inside `docker exec`, I was `root`, the hostname was the container id, and the
   OS was Debian 13 — even though my host machine is macOS. The container carries
   its own filesystem and Linux userland, which is exactly why the same image runs
   identically on any machine (reproducibility).

3. **Publishing a port (`-p`) is not the same as the port the app uses inside.**
   Nginx listens on port 80 *inside* the container, but I could only reach it from
   my Mac because `-p 8080:80` maps host port 8080 to container port 80. Without
   `-p`, that port 80 would stay private to the container.
