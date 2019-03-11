"use strict";
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
exports.defaultRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
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
    let svcData = config.SERVICE_DOC;
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    let ep = svcData.getEndpointByName('help');
    res.status(404).json({
        status: '404 - Resource not found.',
        message: util_1.format('See %s%s%s for service documentation.', getProtocolHostPort(req), svcData.BaseUrl, ep.Url)
    });
});
/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req) {
    return util_1.format('%s', getProtocolHostPort(req), req.url);
}
function getProtocolHostPort(req) {
    return util_1.format('%s://%s', req.protocol, req.get('host'));
}
exports.default = exports.defaultRouter;
//# sourceMappingURL=default.js.map