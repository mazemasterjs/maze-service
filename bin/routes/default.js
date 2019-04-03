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
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const logger_1 = require("@mazemasterjs/logger");
const path_1 = __importDefault(require("path"));
const Config_1 = __importDefault(require("@mazemasterjs/shared-library/Config"));
const MazeDao_1 = __importDefault(require("../MazeDao"));
exports.defaultRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
const mazeDao = MazeDao_1.default.getInstance();
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
 * Returns the maze with the given id
 */
exports.defaultRouter.get('/get/count', (req, res) => {
    log.debug(__filename, `Route -> [${req.url}]`, 'Handling request.');
    (function () {
        return __awaiter(this, void 0, void 0, function* () {
            if (mazeDao.coll) {
                log.debug(__filename, `Route -> [${req.url}]`, 'Counting...');
                var mazeCount = yield mazeDao.coll.countDocuments();
                log.debug(__filename, `Route -> [${req.url}]`, `Returning ${mazeCount}`);
                res.status(200).json({ mazeCount: mazeCount });
            }
            else {
                res.status(500).json({ message: 'Unable to connect to Maze Collection.' });
            }
        });
    });
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
//# sourceMappingURL=default.js.map