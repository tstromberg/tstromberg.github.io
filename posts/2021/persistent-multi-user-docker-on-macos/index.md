---
title: "Persistent multi-user Docker on macOS"
date: 2021-02-01
---
![](o4QoLGWZ.webp)

Ever wanted to run Docker on an unmanned macOS machine, where all users could have access to a working Docker command-line?

First, be aware that `docker` is not designed to be securely shared among multiple users. As with Linux, Please assume that anyone who has access to `docker` is effectively equivalent to \`root'.

<!--more-->

This assumes that users will be interacting with `docker` via the command-line, rather than graphically. It also assumes that the environment is such that allows a single user to be automatically logged into via the GUI, but this is mostly out of laziness rather than an underlying technical restriction.

1. Choose an account that Docker Desktop will run as. I recommend creating a `docker` user, but it could be any account. This account does not need admin access.

2. Open `Settings -> Users & Groups -> Login Options`, and ensure that this user is automatically logged into.

3. Created a shared containers directory:

```
sudo mkdir -p /Users/Shared/Library/Containers
sudo chown docker:staff /Users/Shared/Library/Containers
sudo chmod -R 770 /Users/Shared/Library/Containers/
```

4. Login graphically with the account that will run Docker and start `/Applications/Docker.app`, answer any questions it might have.

5. Open `Settings -> Users & Groups -> Login Items`, and drag the `Docker` app to it.

6. Quit `Docker Desktop` via the menu item

7. Open `Terminal` and move your Docker data to a shared location that can be written to by other users:

```
mv ~/Library/Containers/com.docker.docker /Users/Shared/Library/Containers

chmod -R 770 /Users/Shared/Library/Containers/com.docker.docker

chmod -R +a "group:staff allow list,add_file,search,add_subdirectory,delete_child,readattr,writeattr,readextattr,writeextattr,readsecurity,file_inherit,directory_inherit" /Users/Shared/Library/Containers/com.docker.docker

chmod -R g+rw /Users/Shared/Library/Containers/com.docker.docker/Data
```

Then link your local Docker data to this shared source, and make sure that others can traverse into this folder to resolve the socket symlink:

```
ln -s /Users/Shared/Library/Containers/com.docker.docker ~/Library/Containers/com.docker.docker

chmod g+x ~/Library ~/Library/Containers
```

6. Restart `/Applications/Docker.app` to test

7. SSH into the host as another username, and run `docker run mariadb` to test.

8. Reboot host and reconnect via ssh to test (it may take a moment for Docker to start up)

This is the configuration we use for the #kernelcafe. Please add your improvements to the comments!