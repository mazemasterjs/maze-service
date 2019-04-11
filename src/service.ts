import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import {format as fmt} from 'util';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';
import {defaultRouter} from './routes/default';
import {probesRouter} from './routes/probes';
import {genRouter} from './routes/generate';
import {MongoDBHandler} from '@mazemasterjs/shared-library/MongoDBHandler';
import {Server} from 'http';

// load config
const config = Config.getInstance();

// set up logger
const log = Logger.getInstance();

// set up express
const app = express();

// prep reference for express server
let httpServer: Server;

/**
 * APPLICATION ENTRY POINT
 */
let service = async function startService() {
    log.info(__filename, 'startService()', 'Opening database connection');
    await MongoDBHandler.getInstance()
        .then((instance) => {
            log.info(__filename, 'startService()', 'Database connection opened, launching express server');
            launchExpress();
        })
        .catch((err) => {
            throw err;
        });
};

/**
 * Starts up the express server
 */
function launchExpress() {
    log.info(__filename, 'launchExpress()', 'Server started.');

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

    // set up the generation route handler
    app.use('/api/maze/generate', genRouter);

    // set up the default route handler
    app.use('/api/maze', defaultRouter);

    // and start the httpServer - starts the service
    httpServer = app.listen(config.HTTP_PORT, () => {
        // server is now live
        config.READY_TO_ROCK = true;
        log.force(__filename, 'launchExpress()', fmt('MazeMasterJS/%s -> Service live and ready Now listening on port %d.', config.APP_NAME, config.HTTP_PORT));
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
    log.force(__filename, 'doShutDown()', 'Closing DB connections...');
    MazeDao.getInstance().disconnect();

    log.force(__filename, 'doShutDown()', 'Shutting down HTTPServer...');
    httpServer.close();

    log.force(__filename, 'doShutDown()', 'Exiting process...');
    process.exit(0);
}
