"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = require("@mazemasterjs/logger");
exports.helpRouter = express_1.default.Router();
const Config_1 = __importDefault(require("@mazemasterjs/shared-library/Config"));
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
/**
 * Liveness probe for container/cloud hosted service monitoring
 */
exports.helpRouter.get('/help', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.render('help.ejs', { svcDoc: config.SERVICE_DOC });
});
exports.helpRouter.get('/service', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
});
exports.helpRouter.get('/*', (req, res) => {
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    res.sendStatus(404);
});
exports.default = exports.helpRouter;
//# sourceMappingURL=help.js.map