"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const util_1 = require("util");
const logger_1 = require("@mazemasterjs/logger");
const Config_1 = __importDefault(require("@mazemasterjs/shared-library/Config"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
exports.genRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
const METHOD = 'Route -> [%s]';
/**
 * Base maze generation routine, returns a JSON representation of the @mazemasterjs/shared-library/Maze class.
 */
exports.genRouter.get('/:height/:width/:challenge/:name/:seed', (req, res) => {
    let route = '/:height/:width/:challenge/:name/:seed';
    let url = rebuildUrl(req);
    log.trace(__filename, route, 'Handling GET -> ' + url);
    // get the parameters
    let height = parseInt(req.params.height);
    let width = parseInt(req.params.width);
    let challenge = parseInt(req.params.challenge);
    let seed = req.params.seed;
    let name = req.params.name;
    let errors = new Array();
    // validate height
    if (isNaN(height) || height < config.MAZE_MIN_HEIGHT || height > config.MAZE_MAX_HEIGHT) {
        log.debug(__filename, util_1.format(METHOD, url), 'Invalid height provided: ' + height);
        errors.push(util_1.format('Height must be a numeric value between %d and %d.', config.MAZE_MIN_HEIGHT, config.MAZE_MAX_HEIGHT));
    }
    // validate width
    if (isNaN(width) || width < config.MAZE_MIN_WIDTH || width > config.MAZE_MAX_WIDTH) {
        log.debug(__filename, util_1.format(METHOD, url), 'Invalid width provided: ' + width);
        errors.push(util_1.format('Width must be a numeric value between %d and %d.', config.MAZE_MIN_WIDTH, config.MAZE_MAX_WIDTH));
    }
    // validate challenge
    if (isNaN(challenge) || challenge < 0 || challenge > 10) {
        log.debug(__filename, util_1.format(METHOD, url), 'Invalid challenge level provided: ' + challenge);
        errors.push('Challenge Level must be a numeric value between 0 and 10.');
    }
    // check for errors
    if (errors.length > 0) {
        log.trace(__filename, util_1.format(METHOD, url), 'Input validation errors: ' + errors.join(' :: '));
        res.status(400).json({
            status: '400',
            message: util_1.format('Bad Request - Invalid or empty parameter(s). See %s://%s/api/maze/help for documentation.', req.protocol, req.get('host')),
            errors: errors,
            usage: route
        });
    }
    else {
        // All is well - let's produce a maze!
        log.trace(__filename, route, util_1.format('Height=%d, Width=%d, Challenge=%d, Name=%s, Seed=%s', height, width, challenge, name, seed));
        let maze = new Maze_1.default().generate(height, width, challenge, name, seed);
        // send the json data to the client
        //res.status(200).json(maze);
        res.status(200).send('<pre>' + maze.TextRender + '</pre>');
    }
});
/**
 * Handles undefined routes
 */
exports.genRouter.get('/*', (req, res) => {
    let route = '/*';
    let url = rebuildUrl(req);
    log.warn(__filename, route, 'Invalid Route Requested -> ' + url);
    res.status(400).json({
        status: '400',
        message: util_1.format('Invalid request. See %s://%s/api/maze/help for documentation.', req.protocol, req.get('host'))
    });
});
/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req) {
    return util_1.format('%s://%s%s', req.protocol, req.get('host'), req.url);
}
exports.default = exports.genRouter;
//# sourceMappingURL=generate.js.map