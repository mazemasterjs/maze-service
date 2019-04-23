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
const util_1 = require("util");
const logger_1 = require("@mazemasterjs/logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Config_1 = __importDefault(require("@mazemasterjs/shared-library/Config"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
const MongoDBHandler_1 = __importDefault(require("@mazemasterjs/shared-library/MongoDBHandler"));
exports.defaultRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
const ROUTE_PATH = '/api/maze';
let mongo;
/**
 * This just assigns mongo the instance of MongoDBHandler.  We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
MongoDBHandler_1.default.getInstance()
    .then((instance) => {
    mongo = instance;
    // enable the "readiness" probe that tells OpenShift that it can send traffic to this service's pod
    config.READY_TO_ROCK = true;
    log.info(__filename, 'MongoDBHandler.getInstance()', 'Service is now LIVE, READY, and taking requests.');
})
    .catch((err) => {
    log.error(__filename, 'MongoDBHandler.getInstance()', 'Error getting MongoDBHandler instance ->', err);
});
/**
 * Response with json maze-count value showing the count of all maze documents found
 * in the maze collection.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMazeCount = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let count = yield mongo
        .countDocuments(config.MONGO_COL_MAZES)
        .then((count) => {
        log.debug(__filename, 'getMazeCount()', 'Maze Count=' + count);
        res.status(200).json({ collection: config.MONGO_COL_MAZES, 'maze-count': count });
    })
        .catch((err) => {
        res.status(500).json({ status: '500', message: err.message });
    });
});
/**
 * Responds with JSON from all maze documents found in the maze collection.
 * WARNING: Not currently paged.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMazes = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let curMazes = yield mongo.getAllDocuments(config.MONGO_COL_MAZES);
    res.status(200).json(yield curMazes.toArray().catch((err) => {
        res.status(500).json({ status: '500', message: err.message });
    }));
});
/**
 * Gets and returns a json maze object with the specified Maze.Id.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    yield mongo
        .getDocument(config.MONGO_COL_MAZES, req.params.id)
        .then((doc) => {
        if (doc) {
            let maze = new Maze_1.default(doc);
            log.trace(__filename, req.url, `Maze ${maze.Id} found and returned.`);
            res.status(200).json(maze);
        }
        else {
            res.status(404).json({ status: '404', message: 'Maze not found.' });
        }
    })
        .catch((err) => {
        log.error(__filename, `Route -> [${req.url}]`, 'Error fetching maze ->', err);
        res.status(500).json({ status: '500', message: err.message });
    });
});
/**
 * Gets and returns an html document to display the maze with the specified Maze.Id.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let viewMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    yield mongo
        .getDocument(config.MONGO_COL_MAZES, req.params.id)
        .then((doc) => {
        if (doc) {
            let maze = new Maze_1.default(doc);
            log.trace(__filename, req.url, `Maze ${maze.Id} found and returned.`);
            res.status(200).render('viewMaze.ejs', { maze: maze });
        }
        else {
            res.status(404).json({ status: '404', message: 'Maze not found.' });
        }
    })
        .catch((err) => {
        log.error(__filename, `Route -> [${req.url}]`, 'Error fetching maze ->', err);
        res.status(500).json({ status: '500', message: err.message });
    });
});
/**
 * Generate json representation of a maze from the provided values and insert it into the database
 * Note: Input validation is built into Maze.Generate()
 * @param req
 * @param res
 */
let generateMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    try {
        let maze = new Maze_1.default().generate(req.params.height, req.params.width, req.params.challenge, encodeURI(req.params.name), encodeURI(req.params.seed));
        res.status(200).json(maze);
    }
    catch (err) {
        log.error(__filename, req.url, 'Error generating maze ->', err);
        res.status(400).json({ status: '400', message: `${err.name} - ${err.message}` });
    }
});
/**
 * Generate html representation of a maze from the provided values and insert it into the database
 * Note: Input validation is built into Maze.Generate()
 * @param req
 * @param res
 */
let generateMazeHtml = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    try {
        let maze = new Maze_1.default().generate(req.params.height, req.params.width, req.params.challenge, encodeURI(req.params.name), encodeURI(req.params.seed));
        res.status(200).render('viewMaze.ejs', { maze: maze });
    }
    catch (err) {
        log.error(__filename, req.url, 'Error generating maze ->', err);
        res.status(400).json({ status: '400', message: `${err.name} - ${err.message}` });
    }
});
//TODO REPLACE TEST METHOD
let insertMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = new Maze_1.default().generate(3, 3, 2, 'AnotherTest', 'AnotherSeed');
    let ret = yield mongo
        .insertDocument(config.MONGO_COL_MAZES, maze)
        .then((result) => {
        res.status(200).json(ret);
    })
        .catch((err) => {
        log.error(__filename, req.url, 'Error inserting maze ->', err);
        res.status(500).json({ status: '400', message: `${err.name} - ${err.message}` });
    });
});
//TODO REPLACE TEST METHOD
let updateMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let doc = yield mongo.getDocument(config.MONGO_COL_MAZES, '3:3:2:AnotherSeed');
    let maze = new Maze_1.default(doc);
    console.log(`Got maze ${maze.Id}, updating...`);
    maze.Note = 'MongoDal test: Note_' + new Date().getTime();
    let ret = yield mongo
        .updateDocument(config.MONGO_COL_MAZES, maze.Id, maze)
        .then((result) => { })
        .catch((err) => { });
    console.log('Update complete.');
    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({ error: ret.name, message: ret.message });
    }
    else {
        res.status(200).json(ret);
    }
});
/**
 * Remove the maze document with the ID found in req.id and sends result/count as json response
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let deleteMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let ret = yield mongo.deleteDocument(config.MONGO_COL_MAZES, req.params.id);
    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({ error: ret.name, message: ret.message });
    }
    else {
        res.status(200).json(ret);
    }
});
/**
 * Handle favicon
 */
let getFavicon = (req, res) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    res.setHeader('Content-Type', 'image/x-icon');
    res.status(200).sendFile(path_1.default.resolve('views/images/favicon/favicon.ico'));
};
/**
 * Handle requets for .css files
 */
let getCssFile = (req, res) => {
    let cssFile = `views/css/${req.params.file}`;
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    if (fs_1.default.existsSync(cssFile)) {
        res.setHeader('Content-Type', 'text/css');
        res.status(200).sendFile(path_1.default.resolve(cssFile));
    }
    else {
        log.warn(__filename, `Route -> [${req.url}]`, `File [${cssFile}] not found, returning 404.`);
        res.sendStatus(404);
    }
};
/**
 * Responds with the raw JSON service document
 *
 * @param req
 * @param res
 */
let getServiceDoc = (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
};
/**
 * Responds with an HTML-rendered version of the service document
 *
 * @param req
 * @param res
 */
let renderHelp = (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.render('help.ejs', { svcDoc: config.SERVICE_DOC });
};
/**
 * Handles undefined routes
 */
let unhandledRoute = (req, res) => {
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404',
        message: 'Route not found.  See service documentation for a list of endpoints.',
        'service-document': getSvcDocUrl
    });
};
/**
 * Generate and a string-based link to the service document's help section using the
 * given request to determine URL parameters.
 *
 * @param req
 */
function getHelpUrl(req) {
    let svcData = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('help');
    return util_1.format('%s%s%s', getProtocolHostPort(req), svcData.BaseUrl, ep.Url);
}
/**
 * Generate and a string-based link to the service document's help section using the
 * given request to determine URL parameters.
 *
 * @param req
 */
function getSvcDocUrl(req) {
    let svcData = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('service');
    return util_1.format('%s%s%s', getProtocolHostPort(req), svcData.BaseUrl, ep.Url);
}
/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req) {
    return util_1.format('%s%s%s', getProtocolHostPort(req), ROUTE_PATH, req.path);
}
/**
 * Get and return the protocol, host, and port for the current
 * request.
 *
 * @param req
 */
function getProtocolHostPort(req) {
    return util_1.format('%s://%s', req.protocol, req.get('host'));
}
// Route -> http.get mappings
exports.defaultRouter.get('/get/count', getMazeCount);
exports.defaultRouter.get('/get/all', getMazes);
exports.defaultRouter.get('/get/:id', getMaze);
exports.defaultRouter.get('/view/:id', viewMaze);
exports.defaultRouter.get('/delete/:id', deleteMaze);
exports.defaultRouter.get('/favicon.ico', getFavicon);
exports.defaultRouter.get('/css/:file', getCssFile);
exports.defaultRouter.get('/help', getServiceDoc);
exports.defaultRouter.get('/help.json', getServiceDoc);
exports.defaultRouter.get('/help.html', renderHelp);
exports.defaultRouter.get('/service', getServiceDoc);
exports.defaultRouter.get('/generate/:height/:width/:challenge/:name/:seed', generateMaze);
exports.defaultRouter.get('/generate.html/:height/:width/:challenge/:name/:seed', generateMazeHtml);
// Route - http.put mappings
exports.defaultRouter.put('/insert', insertMaze);
exports.defaultRouter.put('/update', updateMaze);
// capture all unhandled routes
exports.defaultRouter.get('/*', unhandledRoute);
// expose router as module
exports.default = exports.defaultRouter;
//# sourceMappingURL=default.js.map