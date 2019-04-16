"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const MongoDBHandler_1 = require("@mazemasterjs/shared-library/MongoDBHandler");
const express_validator_1 = __importDefault(require("express-validator"));
// load config
const config = Config_1.Config.getInstance();
// set up logger
const log = logger_1.Logger.getInstance();
// instatiate express
const app = express_1.default();
// prep reference for express server
let httpServer;
// prep reference for
let mongo;
/**
 * APPLICATION ENTRY POINT
 */
function startService() {
    return __awaiter(this, void 0, void 0, function* () {
        launchExpress();
        log.info(__filename, 'startService()', 'Opening database connection...');
        yield MongoDBHandler_1.MongoDBHandler.getInstance()
            .then((instance) => {
            mongo = instance;
            log.debug(__filename, 'startService()', 'Database connection ready.');
        })
            .catch((err) => {
            log.error(__filename, 'startService()', 'Unable to connect to database.', err);
            doShutdown();
        });
    });
}
/**
 * Starts up the express server
 */
function launchExpress() {
    log.debug(__filename, 'launchExpress()', 'Configuring express HTTPServer...');
    // enable http compression middleware
    app.use(compression_1.default());
    // enable validation / sanitation middleware
    app.use(express_validator_1.default());
    // enable ejs view rendering engine
    app.set('view engine', 'ejs');
    // enable bodyParser middleware for json
    // TODO: Remove this if we aren't accepting post/put with JSON data
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use(body_parser_1.default.json());
    // set up the probes router (live/ready checks)
    app.use('/api/maze/probes', probes_1.probesRouter);
    // set up the default route handler
    app.use('/api/maze', default_1.defaultRouter);
    // and start the httpServer - starts the service
    httpServer = app.listen(config.HTTP_PORT, () => {
        // sever is now listening - live probe should be active, but ready probe must wait for
        // routes to be mapped.
        log.info(__filename, 'launchExpress()', util_1.format('MazeMasterJS/%s -> Service is now LIVE (but not ready) and listening on port %d.', config.APP_NAME, config.HTTP_PORT));
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
//# sourceMappingURL=service.js.map