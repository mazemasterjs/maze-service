import express from 'express';
import {format as fmt} from 'util';
import {Logger} from '@mazemasterjs/logger';
import Config from '@mazemasterjs/shared-library/Config';
import Maze from '@mazemasterjs/shared-library/Maze';
export const genRouter = express.Router();

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();
const METHOD = 'Route -> [%s]';
const SAMPLE = '%s://%s/10/10/5/MyMazeSeed';

/**
 * Base maze generation routine, returns a JSON representation of the @mazemasterjs/shared-library/Maze class.
 */
genRouter.get('/:height/:width/:challenge/:seed', (req, res) => {
    let route = '/:height/:width/:challenge/:seed';
    let url = rebuildUrl(req);

    log.trace(__filename, route, 'Handling GET -> ' + url);

    // get the parameters
    let height: number = parseInt(req.params.height);
    let width: number = parseInt(req.params.width);
    let challenge: number = parseInt(req.params.challenge);
    let seed: string = req.params.seed;
    let errors: Array<string> = new Array<string>();

    // validate height
    if (isNaN(height) || height < config.MAZE_MIN_HEIGHT || height > config.MAZE_MAX_HEIGHT) {
        log.debug(__filename, fmt(METHOD, url), 'Invalid height provided: ' + height);
        errors.push(fmt('Height must be a numeric value between %d and %d.', config.MAZE_MIN_HEIGHT, config.MAZE_MAX_HEIGHT));
    }

    // validate width
    if (isNaN(width) || width < config.MAZE_MIN_WIDTH || width > config.MAZE_MAX_WIDTH) {
        log.debug(__filename, fmt(METHOD, url), 'Invalid width provided: ' + width);
        errors.push(fmt('Width must be a numeric value between %d and %d.', config.MAZE_MIN_WIDTH, config.MAZE_MAX_WIDTH));
    }

    // validate challenge
    if (isNaN(challenge) || challenge < 0 || challenge > 10) {
        log.debug(__filename, fmt(METHOD, url), 'Invalid challenge level provided: ' + challenge);
        errors.push('Challenge Level must be a numeric value between 0 and 10.');
    }

    // TODO: validate seed?

    // check for errors
    if (errors.length > 0) {
        log.trace(__filename, fmt(METHOD, url), 'Input validation errors: ' + errors.join(' :: '));
        res.status(400).json({
            status: '400',
            message: 'Bad Request - Invalid or empty parameter(s).',
            errors: errors,
            usage: route,
            sample: fmt(SAMPLE, req.protocol, req.get('host'))
        });
    } else {
        // All is well - let's produce a maze!
        log.trace(__filename, route, fmt('Height=%d, Width=%d, Challenge=%d, Seed=%s', height, width, challenge, seed));
        let maze: Maze = new Maze().generate(height, width, challenge, seed);

        // send the json data to the client
        res.status(200).json(maze);
    }
});

/**
 * Handles undefined routes
 */
genRouter.get('/*', (req, res) => {
    let route = '/*';
    let url = rebuildUrl(req);

    log.warn(__filename, route, 'Invalid Route Requested -> ' + url);

    res.status(400).json({
        status: '400',
        message: 'Invalid request.',
        sample: fmt(SAMPLE, req.protocol, req.get('host'))
    });
});

/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req: express.Request) {
    return fmt('%s://%s%s', req.protocol, req.get('host'), req.url);
}

export default genRouter;
