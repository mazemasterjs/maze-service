import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import {format as fmt} from 'util';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';
import {defaultRouter} from './routes/default';
import {probesRouter} from './routes/probes';
import {genRouter} from './routes/generate';
import {MazeDao} from './MazeDao';
import {Server} from 'http';
import Maze from '@mazemasterjs/shared-library/Maze';

// load config
const config = Config.getInstance();

// set up logger
const log = Logger.getInstance();

// set up express
const app = express();

// prep reference for express server
let httpServer: Server;

// used to initialize the database connection
let mazeDao: MazeDao;

startServer();

/**
 * Starts up the express server
 */
function startServer() {
    log.info(__filename, 'startServer()', 'Server started.');

    // enable http compression middleware
    app.use(compression());

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

    // and start the service
    httpServer = app.listen(config.HTTP_PORT, () => {
        log.force(__filename, 'startServer()', fmt('MazeMasterJS/%s -> Now listening (not ready) on port %d.', config.APP_NAME, config.HTTP_PORT));

        mazeDao = MazeDao.getInstance();

        // need to give mazeDao a chance to connect so we'll poll it
        // for a few seconds before giving up and shutting down.
        let timeoutCount = 10; // we'll check 10 times for a DB connection before failing
        let dbConnCheckTimer = setInterval(function() {
            log.debug(__filename, 'startServer().dbConnCheckTimer()', 'Awaiting database connection -> ' + timeoutCount);

            // clear the timer if connected or out of attempts
            if (mazeDao.isConnected() || timeoutCount == 0) {
                clearInterval(dbConnCheckTimer);
            }

            // clear the timer and open server if connected
            if (mazeDao.isConnected()) {
                log.debug(__filename, 'startServer().dbConnCheckTimer()', 'Database connection established.');
                openServer();
            } else {
                // shut down the app if our countdown reaches zero
                if (timeoutCount <= 0) {
                    log.warn(__filename, 'startServer().dbConnCheckTimer()', 'Database connection timed out, shutting down.');
                    doShutdown();
                }
            }

            // decrement countdown with every interval
            timeoutCount--;
        }, 250);
    });
}

/**
 * Sets server config ready flag, enabling live/readiness probes so that
 * orchestration hosts know to start directing traffic to this service
 */
function openServer() {
    // set the ready flag for live/readiness probes and announce
    config.READY_TO_ROCK = true;

    // announce service available
    log.force(__filename, 'openServer()', fmt('MazeMasterJS/%s -> Now live and ready on http://%s:%d', config.APP_NAME, config.HOST_NAME, config.HTTP_PORT));
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
