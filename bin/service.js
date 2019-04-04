"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const util_1 = require("util");
const Config_1 = require("@mazemasterjs/shared-library/Config");
const logger_1 = require("@mazemasterjs/logger");
const default_1 = require("./routes/default");
const probes_1 = require("./routes/probes");
const generate_1 = require("./routes/generate");
const MazeDao_1 = require("./MazeDao");
// load config
const config = Config_1.Config.getInstance();
// set up logger
const log = logger_1.Logger.getInstance();
// set up express
const app = express_1.default();
// prep reference for express server
let httpServer;
// used to initialize the database connection
let mazeDao;
startServer();
/**
 * Starts up the express server
 */
function startServer() {
    log.info(__filename, 'startServer()', 'Server started.');
    // enable http compression middleware
    app.use(compression_1.default());
    app.set('view engine', 'ejs');
    // enable bodyParser middleware for json
    // TODO: Remove this if we aren't accepting post/put with JSON data
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use(body_parser_1.default.json());
    // set up the probes router (live/ready checks)
    app.use('/api/maze/probes', probes_1.probesRouter);
    // set up the generation route handler
    app.use('/api/maze/generate', generate_1.genRouter);
    // set up the default route handler
    app.use('/api/maze', default_1.defaultRouter);
    // and start the service
    httpServer = app.listen(config.HTTP_PORT, () => {
        log.force(__filename, 'startServer()', util_1.format('MazeMasterJS/%s -> Now listening (not ready) on port %d.', config.APP_NAME, config.HTTP_PORT));
        mazeDao = MazeDao_1.MazeDao.getInstance();
        // need to give mazeDao a chance to connect so we'll poll it
        // for a few seconds before giving up and shutting down.
        let timeoutCount = 10; // we'll check 10 times for a DB connection before failing
        let dbConnCheckTimer = setInterval(function () {
            log.debug(__filename, 'startServer().dbConnCheckTimer()', 'Awaiting database connection -> ' + timeoutCount);
            // clear the timer if connected or out of attempts
            if (mazeDao.isConnected() || timeoutCount == 0) {
                clearInterval(dbConnCheckTimer);
            }
            // clear the timer and open server if connected
            if (mazeDao.isConnected()) {
                log.debug(__filename, 'startServer().dbConnCheckTimer()', 'Database connection established.');
                openServer();
            }
            else {
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
    log.force(__filename, 'openServer()', util_1.format('MazeMasterJS/%s -> Now live and ready on http://%s:%d', config.APP_NAME, config.HOST_NAME, config.HTTP_PORT));
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
    MazeDao_1.MazeDao.getInstance().disconnect();
    log.force(__filename, 'doShutDown()', 'Shutting down HTTPServer...');
    httpServer.close();
    log.force(__filename, 'doShutDown()', 'Exiting process...');
    process.exit(0);
}
//# sourceMappingURL=service.js.map