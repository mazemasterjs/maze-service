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
const MazeDao_1 = __importDefault(require("../MazeDao"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
exports.defaultRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
const mazeDao = MazeDao_1.default.getInstance();
/**
 * Response with json maze-count value showing the count of all maze documents found
 * in the maze collection.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getDocCount = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let count = yield mazeDao.countDocuments(config.MONGO_COL_MAZES);
    log.debug(__filename, 'getDocCount()', 'Document Count=' + count);
    res.status(200).json({ collection: config.MONGO_COL_MAZES, 'maze-count': count });
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
    let curMazes = yield mazeDao.getAllDocuments(config.MONGO_COL_MAZES);
    res.status(200).json(yield curMazes.toArray());
});
/**
 * Gets and returns a json maze object with the specified ID.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = yield mazeDao.getDocument(config.MONGO_COL_MAZES, req.params.id);
    if (maze) {
        res.status(200).json(maze);
    }
    else {
        log.warn(__filename, `Route -> [${req.url}]`, `Maze [${req.params.id}] not found, returning 404.`);
        res.status(404).json({
            status: '404',
            message: 'Maze not found.'
        });
    }
});
//TODO REPLACE TEST METHOD
let insertMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = new Maze_1.default().generate(3, 3, 2, 'AnotherTest', 'AnotherSeed');
    let ret = yield mazeDao.insertDocument(config.MONGO_COL_MAZES, maze);
    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({ error: ret.name, message: ret.message });
    }
    else {
        res.status(200).json(ret);
    }
});
//TODO REPLACE TEST METHOD
let updateMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let doc = yield mazeDao.getDocument(config.MONGO_COL_MAZES, '3:3:2:AnotherSeed');
    let maze = new Maze_1.default(doc);
    console.log(`Got maze ${maze.Id}, updating...`);
    maze.Note = 'MongoDal test: Note_' + new Date().getTime();
    console.log(`Note: ${maze.Note}`);
    let ret = yield mazeDao.updateDocument(config.MONGO_COL_MAZES, maze.Id, maze);
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
    let ret = yield mazeDao.deleteDocument(config.MONGO_COL_MAZES, req.params.id);
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
    return util_1.format('%s', getProtocolHostPort(req), req.url);
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
// Route -> Handler mappings
exports.defaultRouter.get('/get/count', getDocCount);
exports.defaultRouter.get('/get/all', getMazes);
exports.defaultRouter.get('/get/:id', getMaze);
exports.defaultRouter.get('/delete/:id', deleteMaze);
exports.defaultRouter.get('/insert/test', insertMaze);
exports.defaultRouter.get('/update/test', updateMaze);
exports.defaultRouter.get('/favicon.ico', getFavicon);
exports.defaultRouter.get('/css/:file', getCssFile);
exports.defaultRouter.get('/help', getServiceDoc);
exports.defaultRouter.get('/help.json', getServiceDoc);
exports.defaultRouter.get('/help.html', renderHelp);
exports.defaultRouter.get('/service', getServiceDoc);
exports.defaultRouter.get('/*', unhandledRoute);
exports.default = exports.defaultRouter;
//# sourceMappingURL=default.js.map