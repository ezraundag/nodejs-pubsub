////Port config
var pubsubPort = process.env.PUBSUB_PORT, //PORT for pubsub service
    env_PORT = process.env.WEBSERVER_PORT, //PORT for login route,
    redisHost = process.env.REDIS_PORT_6379_TCP_ADDR,
    redisPort = process.env.REDIS_PORT_6379_TCP_PORT,
    redis = require('redis'),
    socketio = require('socket.io'),
    jwt = require('jsonwebtoken'),
    socketioJwt = require('socketio-jwt'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app).listen(pubsubPort),
    io = require('socket.io')(http),
    ipaddr = require('ipaddr.js'),
    bodyParser = require('body-parser'),
    fs = require('fs'), 
    jwtSecret = process.env.JWT_SECRET,
    yaml = require('js-yaml'),
    global_channels = {}, //This object will contain all the channels being listened to.
    socket_connection_holder,
    router = express.Router()
    yaml_path = '../env/pubsub.yml';

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


router.use(function (req, res, next) {
    // do logging
    var ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    var addr = ipaddr.parse(ip);
    if(addr.kind()=='ipv6') {
        if(addr.isIPv4MappedAddress()) {
            ip = addr.toIPv4Address().toString();
        }
    }
    var now = new Date();
    console.log(now + ': ' + 'Http request has been received.');
    console.log('ip from pubsub-client: ' + ip);
    next(); // make sure we go to the next routes and don't stop here
});

//autheticate user
router.route('/login')
        .post(function (req, res) {
            try {
                var doc = yaml.safeLoad(fs.readFileSync(yaml_path, 'utf8')),
                    clients_len = doc.clients.length,
                    found_user = false;
                doc.clients.forEach(function(obj){ //validates user before allowing to subscribe to channel
                    if( obj.username === req.body.username ) {
                        if( obj.password === req.body.password ) {
                            found_user = true;
                        }
                    }
                    if( !--clients_len && found_user ) { //if user is validate and found
                        var profile = {
                            username: req.body.username,
                            password: req.body.password
                        };

                        //reset global channel with port
                        //restricts one client per channel
                        var channel_name_holder = req.body.channel_name;
                        if ((global_channels.hasOwnProperty(channel_name_holder))) {
                            global_channels[channel_name_holder].unsubscribe(channel_name_holder);
                            global_channels[channel_name_holder].listeners = {}
                            delete global_channels[channel_name_holder]
                        }
                         
                        // we are sending the profile in the token
                        var token = jwt.sign(profile, jwtSecret, {expiresIn: 3000});
                        res.json({token: token});
                    }
                });
              } catch (e) {
                console.log(e);
              }

            
        });

io.use(socketioJwt.authorize({
  secret: jwtSecret,
  handshake: true
}));

io.on('connection',function (socketconnection){
    //this socket is authenticated, we are good to handle more events from it.
        console.log('username connected: ', socketconnection.decoded_token.username);
        //All the channels this connection subscribes to
        socketconnection.connected_channels = {}
        socket_connection_holder = socketconnection;
        //Subscribe request from client
        socketconnection.on('subscribe', function (channel_name) {
            //Set up Redis Channel
            if (!(global_channels.hasOwnProperty(channel_name))) {
                //Initialize new Redis Client as a channel and make it subscribe to channel_name
                global_channels[channel_name] = redis.createClient( redisPort, redisHost );
                global_channels[channel_name].subscribe(channel_name);
                global_channels[channel_name].listeners = {};
                //Add this connection to the listeners
                global_channels[channel_name].listeners[socketconnection.id] = socketconnection;
                //Tell this new Redis client to send published messages to all of its listeners
                global_channels[channel_name].on('message', function (channel, message) {
                    Object.keys(global_channels[channel_name].listeners).forEach(function (key) {
                            global_channels[channel_name].listeners[key].send(message);

                    });
                });
            }

            socketconnection.connected_channels[channel_name] = global_channels[channel_name];

        });

        //Unsubscribe request from client
        socketconnection.on('unsubscribe', function (channel_name) {
            if (socketconnection.connected_channels.hasOwnProperty(channel_name)) {
                //If this connection is indeed subscribing to channel_name
                //Delete this connection from the Redis Channel's listeners
                delete global_channels[channel_name].listeners[socketconnection.id];
                //Delete channel from this connection's connected_channels
                delete socketconnection.connected_channels[channel_name];
            }
        });

        //Disconnect request from client
        socketconnection.on('disconnect', function () {
            //Remove this connection from listeners' lists of all channels it subscribes to
            Object.keys(socketconnection.connected_channels).forEach(function (channel_name) {
                delete global_channels[channel_name].listeners[socketconnection.id];
            });
        });
});

app.use('/pubsub', router);

// START THE SERVER
// =============================================================================
app.listen(env_PORT);


