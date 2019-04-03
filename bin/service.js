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
    let httpServer = app.listen(config.HTTP_PORT, () => {
        log.force(__dirname, 'startServer()', util_1.format('MazeMasterJS/%s -> Now listening (not ready) on port %d.', config.APP_NAME, config.HTTP_PORT));
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
    log.force(__dirname, 'startServer()', util_1.format('MazeMasterJS/%s -> Now live and ready on http://%s:%d', config.APP_NAME, config.HOST_NAME, config.HTTP_PORT));
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
    log.force(__filename, 'doShutDown()', 'Closing HTTP connections...');
    httpServer.close();
    log.force(__filename, 'doShutDown()', 'Exiting process...');
    process.exit(0);
}
//# sourceMappingURL=service.js.map