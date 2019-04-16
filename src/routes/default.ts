import express from 'express';
import {Cursor} from 'mongodb';
import {format as fmt, isUndefined, isNull} from 'util';
import {Logger} from '@mazemasterjs/logger';
import fs from 'fs';
import path from 'path';
import Config from '@mazemasterjs/shared-library/Config';
import Service from '@mazemasterjs/shared-library/Service';
import Maze from '@mazemasterjs/shared-library/Maze';
import MongoDBHandler from '@mazemasterjs/shared-library/MongoDBHandler';
import {check, validationResult} from 'express-validator/check';

export const defaultRouter = express.Router();

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();
const ROUTE_PATH: string = '/api/maze';
let mongo: MongoDBHandler;

/**
 * This just assigns mongo the instance of MongoDBHandler.  We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
MongoDBHandler.getInstance()
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
let getMazeCount = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let count = await mongo
        .countDocuments(config.MONGO_COL_MAZES)
        .then((count) => {
            log.debug(__filename, 'getMazeCount()', 'Maze Count=' + count);
            res.status(200).json({collection: config.MONGO_COL_MAZES, 'maze-count': count});
        })
        .catch((err) => {
            res.status(500).json({status: '500', message: err.message});
        });
};

/**
 * Responds with JSON from all maze documents found in the maze collection.
 * WARNING: Not currently paged.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMazes = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let curMazes: Cursor<any> = await mongo.getAllDocuments(config.MONGO_COL_MAZES);
    res.status(200).json(
        await curMazes.toArray().catch((err) => {
            res.status(500).json({status: '500', message: err.message});
        })
    );
};

/**
 * Gets and returns a json maze object with the specified Maze.Id.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    await mongo
        .getDocument(config.MONGO_COL_MAZES, req.params.id)
        .then((doc) => {
            if (doc) {
                let maze: Maze = new Maze(doc);
                log.trace(__filename, req.url, `Maze ${maze.Id} found and returned.`);
                res.status(200).json(maze);
            } else {
                res.status(404).json({status: '404', message: 'Maze not found.'});
            }
        })
        .catch((err) => {
            log.error(__filename, `Route -> [${req.url}]`, 'Error fetching maze ->', err);
            res.status(500).json({status: '500', message: err.message});
        });
};

/**
 * Gets and returns an html document to display the maze with the specified Maze.Id.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let viewMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    await mongo
        .getDocument(config.MONGO_COL_MAZES, req.params.id)
        .then((doc) => {
            if (doc) {
                let maze: Maze = new Maze(doc);
                log.trace(__filename, req.url, `Maze ${maze.Id} found and returned.`);
                res.status(200).render('viewMaze.ejs', {maze: maze});
            } else {
                res.status(404).json({status: '404', message: 'Maze not found.'});
            }
        })
        .catch((err) => {
            log.error(__filename, `Route -> [${req.url}]`, 'Error fetching maze ->', err);
            res.status(500).json({status: '500', message: err.message});
        });
};

/**
 * Generate a maze from the provided values and insert it into the database
 * Note: Input validation is built into Maze.Generate()
 * @param req
 * @param res
 */
let generateMaze = async (req: express.Request, res: express.Response) => {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let height: number = parseInt(req.params.height);
    let width: number = parseInt(req.params.width);
    let challenge: number = parseInt(req.params.challenge);
    let name: string = req.params.name;
    let seed: string = req.params.seed;

    try {
        let maze: Maze = new Maze().generate(height, width, challenge, name, seed);
        res.status(200).json(maze);
    } catch (err) {
        log.error(__filename, req.url, 'Error inserting maze ->', err);
        res.status(400).json({status: '400', message: `${err.name} - ${err.message}`});
    }
};

//TODO REPLACE TEST METHOD
let insertMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze: Maze = new Maze().generate(3, 3, 2, 'AnotherTest', 'AnotherSeed');
    let ret = await mongo
        .insertDocument(config.MONGO_COL_MAZES, maze)
        .then((result) => {
            res.status(200).json(ret);
        })
        .catch((err: Error) => {
            log.error(__filename, req.url, 'Error inserting maze ->', err);
            res.status(500).json({status: '400', message: `${err.name} - ${err.message}`});
        });
};

//TODO REPLACE TEST METHOD
let updateMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));

    let doc = await mongo.getDocument(config.MONGO_COL_MAZES, '3:3:2:AnotherSeed');
    let maze = new Maze(doc);

    console.log(`Got maze ${maze.Id}, updating...`);

    maze.Note = 'MongoDal test: Note_' + new Date().getTime();

    let ret: any = await mongo
        .updateDocument(config.MONGO_COL_MAZES, maze.Id, maze)
        .then((result) => {})
        .catch((err) => {});
    console.log('Update complete.');

    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({error: ret.name, message: ret.message});
    } else {
        res.status(200).json(ret);
    }
};

/**
 * Remove the maze document with the ID found in req.id and sends result/count as json response
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let deleteMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let ret = await mongo.deleteDocument(config.MONGO_COL_MAZES, req.params.id);

    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({error: ret.name, message: ret.message});
    } else {
        res.status(200).json(ret);
    }
};

/**
 * Handle favicon
 */
let getFavicon = (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    res.setHeader('Content-Type', 'image/x-icon');
    res.status(200).sendFile(path.resolve('views/images/favicon/favicon.ico'));
};

/**
 * Handle requets for .css files
 */
let getCssFile = (req: express.Request, res: express.Response) => {
    let cssFile: string = `views/css/${req.params.file}`;
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    if (fs.existsSync(cssFile)) {
        res.setHeader('Content-Type', 'text/css');
        res.status(200).sendFile(path.resolve(cssFile));
    } else {
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
let getServiceDoc = (req: express.Request, res: express.Response) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
};

/**
 * Responds with an HTML-rendered version of the service document
 *
 * @param req
 * @param res
 */
let renderHelp = (req: express.Request, res: express.Response) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.render('help.ejs', {svcDoc: config.SERVICE_DOC});
};

/**
 * Handles undefined routes
 */
let unhandledRoute = (req: express.Request, res: express.Response) => {
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
function getHelpUrl(req: express.Request): string {
    let svcData: Service = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('help');
    return fmt('%s%s%s', getProtocolHostPort(req), svcData.BaseUrl, ep.Url);
}

/**
 * Generate and a string-based link to the service document's help section using the
 * given request to determine URL parameters.
 *
 * @param req
 */
function getSvcDocUrl(req: express.Request): string {
    let svcData: Service = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('service');
    return fmt('%s%s%s', getProtocolHostPort(req), svcData.BaseUrl, ep.Url);
}

/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req: express.Request): string {
    return fmt('%s%s%s', getProtocolHostPort(req), ROUTE_PATH, req.path);
}

/**
 * Get and return the protocol, host, and port for the current
 * request.
 *
 * @param req
 */
function getProtocolHostPort(req: express.Request): string {
    return fmt('%s://%s', req.protocol, req.get('host'));
}

// Route -> Handler mappings
defaultRouter.get('/get/count', getMazeCount);
defaultRouter.get('/get/all', getMazes);
defaultRouter.get('/get/:id', getMaze);
defaultRouter.get('/view/:id', viewMaze);
defaultRouter.get('/delete/:id', deleteMaze);
defaultRouter.get('/favicon.ico', getFavicon);
defaultRouter.get('/css/:file', getCssFile);
defaultRouter.get('/help', getServiceDoc);
defaultRouter.get('/help.json', getServiceDoc);
defaultRouter.get('/help.html', renderHelp);
defaultRouter.get('/service', getServiceDoc);
defaultRouter.get(
    '/generate/:height/:width/:challenge/:name/:seed',
    [
        check('height')
            .isInt({min: config.MAZE_MIN_HEIGHT, max: config.MAZE_MAX_HEIGHT})
            .trim()
            .escape(),
        check('width')
            .isInt({min: config.MAZE_MIN_WIDTH, max: config.MAZE_MAX_WIDTH})
            .trim()
            .escape(),
        check('challenge')
            .isInt({min: 0, max: 10})
            .trim()
            .escape(),
        check('name')
            .isLength({min: 3, max: 32})
            .trim()
            .escape(),
        check('seed')
            .isLength({min: 3, max: 32})
            .trim()
            .escape()
    ],
    generateMaze
);

defaultRouter.put('/insert', insertMaze);
defaultRouter.put('/update', updateMaze);

// capture all unhandled routes
defaultRouter.get('/*', unhandledRoute);

export default defaultRouter;
