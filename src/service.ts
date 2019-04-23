import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import {format as fmt} from 'util';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';
import {defaultRouter} from './routes/default';
import {probesRouter} from './routes/probes';
import {MongoDBHandler} from '@mazemasterjs/shared-library/MongoDBHandler';
import {Server} from 'http';

// load config
const config = Config.getInstance();

// set up logger
const log = Logger.getInstance();

// instatiate express
const app = express();

// prep reference for express server
let httpServer: Server;

// prep reference for
let mongo: MongoDBHandler;

/**
 * APPLICATION ENTRY POINT
 */
async function startService() {
    launchExpress();
    log.info(__filename, 'startService()', 'Opening database connection...');
    await MongoDBHandler.getInstance()
        .then((instance) => {
            mongo = instance;
            log.debug(__filename, 'startService()', 'Database connection ready.');
        })
        .catch((err) => {
            log.error(__filename, 'startService()', 'Unable to connect to database.', err);
            doShutdown();
        });
}

/**
 * Starts up the express server
 */
function launchExpress() {
    log.debug(__filename, 'launchExpress()', 'Configuring express HTTPServer...');

    // enable http compression middleware
    app.use(compression());

    // enable ejs view rendering engine
    app.set('view engine', 'ejs');

    // enable bodyParser middleware for json
    // TODO: Remove this if we aren't accepting post/put with JSON data
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    // set up the probes router (live/ready checks)
    app.use('/api/maze/probes', probesRouter);

    // set up the default route handler
    app.use('/api/maze', defaultRouter);

    // and start the httpServer - starts the service
    httpServer = app.listen(config.HTTP_PORT, () => {
        // sever is now listening - live probe should be active, but ready probe must wait for
        // routes to be mapped.
        log.info(
            __filename,
            'launchExpress()',
            fmt('MazeMasterJS/%s -> Service is now LIVE (but not ready) and listening on port %d.', config.APP_NAME, config.HTTP_PORT)
        );
    });
}

/**
 * Watch for SIGINT (process interrupt signal) and trigger shutdown
 */
process.on('SIGINT', function onSigInt() {
    // all done, close the db connection
    log.force(__filename, 'onSigInt()', 'Got SIGINT - Exiting application...');
    doShutdown();
});

/**
 * Watch for SIGTERM (process terminate signal) and trigger shutdown
 */
process.on('SIGTERM', function onSigTerm() {
    // all done, close the db connection
    log.force(__filename, 'onSigTerm()', 'Got SIGTERM - Exiting application...');
    doShutdown();
});

/**
 * Gracefully shut down the service
 */
function doShutdown() {
    log.force(__filename, 'doShutDown()', 'Service shutdown commenced.');
    if (mongo) {
        log.force(__filename, 'doShutDown()', 'Closing DB connections...');
        mongo.disconnect();
    }

    if (httpServer) {
        log.force(__filename, 'doShutDown()', 'Shutting down HTTPServer...');
        httpServer.close();
    }

    log.force(__filename, 'doShutDown()', 'Exiting process...');
    process.exit(0);
}

// Let's light the tires and kick the fires...
startService();
