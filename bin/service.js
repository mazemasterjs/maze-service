"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lokijs_1 = __importDefault(require("lokijs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const path_exists_1 = __importDefault(require("path-exists"));
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const util_1 = require("util");
const Config_1 = require("@mazemasterjs/shared-library/Config");
const logger_1 = require("@mazemasterjs/logger");
const default_1 = require("./routes/default");
const probes_1 = require("./routes/probes");
const generate_1 = require("./routes/generate");
// load config
const config = Config_1.Config.getInstance();
// set up logger
const log = logger_1.Logger.getInstance();
// set up express
const app = express_1.default();
// set mazes collection reference
//let mazes: Loki.Collection;
// intialize the embedded database
let db = new lokijs_1.default(util_1.format(config.MAZES_DB_FILE), {
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
    app.use(compression_1.default());
    app.set('view engine', 'ejs');
    // enable bodyParser middleware for json
    // TODO: Remove this if we aren't accepting post/put with JSON data
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use(body_parser_1.default.json());
    // set up the probes router (live/ready checks)
    app.use('/probes', probes_1.probesRouter);
    // set up the generation route handler
    app.use('/generate', generate_1.genRouter);
    // set up the default route handler
    app.use('/', default_1.defaultRouter);
    // and start the service
    app.listen(config.HTTP_PORT, () => {
        log.force(__dirname, 'startServer()', util_1.format('MazeMasterJS/%s -> Now listening (not ready) on port %d.', config.APP_NAME, config.HTTP_PORT));
        openServer();
    });
    // log maze count
    let mazes = db.getCollection(config.MAZES_COLLECTION_NAME);
    log.force(__filename, 'startServer()', util_1.format('%d mazes found in %s -> %s', mazes.count(), config.MAZES_DB_FILE, config.MAZES_COLLECTION_NAME));
}
/**
 * Initialize / load the embedded lokijs database
 */
function dbInit() {
    let fp = path_1.default.resolve('./data');
    if (!path_exists_1.default.sync(fp)) {
        log.force(__filename, 'dbInit()', fp + ' not found, creating...');
        fs_1.default.mkdirSync(fp);
    }
    else {
        log.trace(__filename, 'dbInit()', './data folder found.');
    }
    let mazes = db.getCollection(config.MAZES_COLLECTION_NAME);
    if (mazes == null) {
        log.trace(__filename, 'dbInit()', 'Collection [' + config.MAZES_COLLECTION_NAME + '] initialized.');
        mazes = db.addCollection(config.MAZES_COLLECTION_NAME);
    }
    mazes.insert({ id: '3:5:7:NewMaze', cells: 'cell data here' });
    db.save(function () {
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
    log.force(__filename, 'doShutDown()', 'Closing HTTP Server connections...');
    process.exit(0);
}
//# sourceMappingURL=service.js.map