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
    let httpServer = app.listen(config.HTTP_PORT, () => {
        log.force(__dirname, 'startServer()', fmt('MazeMasterJS/%s -> Now listening (not ready) on port %d.', config.APP_NAME, config.HTTP_PORT));
        openServer();
    });

    // log maze count
    // let mazes = db.getCollection(config.MAZES_COLLECTION_NAME);
    // log.force(__filename, 'startServer()', fmt('%d mazes found in %s -> %s', mazes.count(), config.MAZES_DB_FILE, config.MAZES_COLLECTION_NAME));
}

/**
 * Sets server config ready flag, enabling live/readiness probes so that
 * orchestration hosts know to start directing traffic to this service
 */
function openServer() {
    // set the ready flag for live/readiness probes and announce
    config.READY_TO_ROCK = true;

    // announce service available
    log.force(__dirname, 'startServer()', fmt('MazeMasterJS/%s -> Now live and ready on http://%s:%d', config.APP_NAME, config.HOST_NAME, config.HTTP_PORT));
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

    log.force(__filename, 'doShutDown()', 'Closing HTTP connections...');
    httpServer.close();

    log.force(__filename, 'doShutDown()', 'Exiting process...');
    process.exit(0);
}
