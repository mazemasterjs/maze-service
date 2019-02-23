import Loki from 'lokijs';
import fs from 'fs';
import path from 'path';
import pathExists from 'path-exists';
import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import {format as fmt} from 'util';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';
import {defaultRouter} from './routes/default';
import {probesRouter} from './routes/probes';

// load config
const config = Config.getInstance();

// set up logger
const log = Logger.getInstance();

// set up express
const app = express();

// set mazes collection reference
//let mazes: Loki.Collection;

// intialize the embedded database
let db = new Loki(fmt(config.MAZES_DB_FILE), {
    autoload: true,
    autoloadCallback: dbInit,
    autosave: true,
    autosaveInterval: 2500
});

/**
 * Starts up the express server
 */
function startServer() {
    log.info(__filename, 'startServer()', 'Server started.');

    // enable http compression middleware
    app.use(compression());

    // enable bodyParser middleware for json
    // TODO: Remove this if we aren't accepting post/put with JSON data
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    // set up the probes router (live/ready checks)
    app.use('/api/maze/gen/probes', probesRouter);

    // set up the default route handler
    app.use('/*', defaultRouter);

    // and start the service
    app.listen(config.HTTP_PORT, () => {
        log.force(__dirname, 'startServer()', fmt('MazeMasterJS/%s -> Now listening (not ready) on port %d.', config.APP_NAME, config.HTTP_PORT));
        openServer();
    });

    // log maze count
    let mazes = db.getCollection(config.MAZES_COLLECTION_NAME);
    log.force(__filename, 'startServer()', fmt('%d mazes found in %s -> %s', mazes.count(), config.MAZES_DB_FILE, config.MAZES_COLLECTION_NAME));
}

/**
 * Initialize / load the embedded lokijs database
 */
function dbInit() {
    let fp = path.resolve('./data');
    if (!pathExists.sync(fp)) {
        log.force(__filename, 'dbInit()', fp + ' not found, creating...');
        fs.mkdirSync(fp);
    } else {
        log.trace(__filename, 'dbInit()', './maze folder found.');
    }

    let mazes = db.getCollection(config.MAZES_COLLECTION_NAME);
    if (mazes == null) {
        log.trace(__filename, 'dbInit()', 'Collection [' + config.MAZES_COLLECTION_NAME + '] initialized.');
        mazes = db.addCollection(config.MAZES_COLLECTION_NAME);
    }

    mazes.insert({id: '3:5:7:NewMaze', cells: 'cell data here'});

    db.save(function() {
        log.info(__filename, 'dbInit()', 'Database connection validated, starting server...');
        startServer();
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
    log.force(__filename, 'doShutDown()', 'Closing HTTP Server connections...');
    process.exit(0);
}
