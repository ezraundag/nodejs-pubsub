# nodejs-pubsub
Node.js Redis Pubsub in a Docker container

Nodejs-pubsub implements the Publish/Subscribe messaging paradigm  where senders of messages, called publishers, do not program the messages to be sent directly to specific receivers, called subscribers. Rather, published messages are characterized into channels, without knowledge of what (if any) subscribers there may be. [Cite](http://redis.io/topics/pubsub)

However due to certain requirements, Nodejs-pubsub allows a single channel to one subscriber and published messages coming from a script or redis-cli.It is built to run inside a docker container to achieve portability, rapid deployment and lightweight footprint.

## Installation
1. Checkout Nodejs-pubsub
2. Create env/ directory in the same directory level of nodejs-pubsub/ folder
3. Create pubsub.yml inside env/ directory. pubsub.yml contains credentials for user-based authentication.
Sample pubsub.yml

``` yaml
clients:
    -   username: demo1
        password: demo1
    -   username: demo2
        password: demo2 
``` 
4. Review directory tree structure to look like the following:

```
nodejs-pubsub/
 	Dockerfile
	README.md
	docker-compose.yml
	package.json
	pubsub.js
env/
	pubsub.yml
```

5. Inside nodejs-pubsub directory, build and start the container.
```
$ docker-compose up
```
To run container in the background 
```
$ docker-compose up -d
```

To test this app, we use [nodejs-pubsubcl](https://github.com/ezraundag/nodejs-pubsubcl.git) and redis-cli.

## Recommendation

Customise this app and allow published messages coming from a script, redis-cli, outside the container or outside the server.

