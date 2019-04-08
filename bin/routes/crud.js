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
let getDocCount = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let count = yield mazeDao.countDocuments(config.MONGO_COL_MAZES);
    log.debug(__filename, 'getDocCount()', 'Document Count=' + count);
    res.status(200).json({ collection: config.MONGO_COL_MAZES, 'document-count': count });
});
let getMazes = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let curMazes = yield mazeDao.getAllDocuments(config.MONGO_COL_MAZES);
    res.status(200).json(yield curMazes.toArray());
});
let getMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = yield mazeDao.getDocument(config.MONGO_COL_MAZES, req.params.id);
    res.status(200).json(maze);
});
let insertMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = new Maze_1.default().generate(3, 3, 2, 'AnotherTest', 'AnotherSeed');
    let ret = yield mazeDao.insertDocument(config.MONGO_COL_MAZES, maze);
    res.status(200).json({ result: ret });
});
let deleteMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let ret = yield mazeDao.deleteDocument(config.MONGO_COL_MAZES, req.params.id);
    res.status(200).json({ result: ret });
});
exports.defaultRouter.get('/get/count', getDocCount);
exports.defaultRouter.get('/get/all', getMazes);
exports.defaultRouter.get('/get/:id', getMaze);
exports.defaultRouter.get('/delete/:id', deleteMaze);
exports.defaultRouter.get('/insert/test', insertMaze);
/**
 * Handle favicon requests
 */
exports.defaultRouter.get('/favicon.ico', (req, res) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    res.setHeader('Content-Type', 'image/x-icon');
    res.status(200).sendFile(path_1.default.resolve('views/images/favicon/favicon.ico'));
});
exports.defaultRouter.get('/css/:file', (req, res) => {
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
});
exports.defaultRouter.get('/help', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.render('help.ejs', { svcDoc: config.SERVICE_DOC });
});
exports.defaultRouter.get('/service', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
});
/**
 * Handles undefined routes
 */
exports.defaultRouter.get('/*', (req, res) => {
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404 - Resource not found.',
        message: getHelpMsg(req)
    });
});
function sendResponse(res, req, err, data) {
    log.trace(__filename, `Route -> [${req.url}]`, 'Sending response.');
    if (util_1.isUndefined(data) || util_1.isNull(data) || data == '') {
        res.sendStatus(404);
    }
    else {
        res.status(200).json(data);
    }
}
/**
 * Generate and a string-based link to the service document's help section using the
 * given request to determine URL parameters.
 *
 * @param req
 */
function getHelpMsg(req) {
    let svcData = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('help');
    return util_1.format('See %s%s%s for service documentation.', getProtocolHostPort(req), svcData.BaseUrl, ep.Url);
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
exports.default = exports.defaultRouter;
//# sourceMappingURL=crud.js.map