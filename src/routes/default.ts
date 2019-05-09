import express from 'express';
import {Logger} from '@mazemasterjs/logger';
import Config from '@mazemasterjs/shared-library/Config';
import Service from '@mazemasterjs/shared-library/Service';
import Maze from '@mazemasterjs/shared-library/Maze';
import DatabaseManager from '@mazemasterjs/database-manager/DatabaseManager';

export const defaultRouter = express.Router();

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();
const ROUTE_PATH: string = '/api/maze';
let dbMan: DatabaseManager;

/**
 * This just assigns mongo the instance of DatabaseManager.  We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
DatabaseManager.getInstance()
    .then((instance) => {
        dbMan = instance;
        // enable the "readiness" probe that tells OpenShift that it can send traffic to this service's pod
        config.READY_TO_ROCK = true;
        log.info(__filename, 'DatabaseManager.getInstance()', 'Service is now LIVE, READY, and taking requests.');
    })
    .catch((err) => {
        log.error(__filename, 'DatabaseManager.getInstance()', 'Error getting DatabaseManager instance ->', err);
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
    await dbMan
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
    try {
        let mazes = await dbMan.getAllDocuments(config.MONGO_COL_MAZES).toArray();
        res.status(200).json(mazes);
    } catch (err) {
        res.status(500).json({status: '500', message: err.message});
    }
};

/**
 * Gets and returns a json maze object with the specified Maze.Id.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    await dbMan
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
 * Generate a new maze from the given parameters and either return as json or render an HTML preview.
 * Note: Input validation is built into Maze.Generate()
 * @param req - supports query paramenter "?html" - if present, will render a maze preview instead of returning json.
 * @param res
 */
let generateMaze = async (req: express.Request, res: express.Response) => {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    try {
        let maze: Maze = new Maze().generate(req.params.height, req.params.width, req.params.challenge, encodeURI(req.params.name), encodeURI(req.params.seed));
        res.status(200).json(maze);
    } catch (err) {
        log.error(__filename, req.url, 'Error generating maze ->', err);
        res.status(400).json({status: '400', message: `${err.name} - ${err.message}`});
    }
};

let generateDefaultMazes = async (req: express.Request, res: express.Response) => {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    try {
        const defaultMazeStubs = {
            mazeStubs: [
                {name: 'Tiny Trek', height: 3, width: 3, challenge: 1, seed: 'TinTre v0.0.1'},
                {name: 'Miniature March', height: 3, width: 5, challenge: 1, seed: 'MinMar v0.0.1'},
                {name: 'Short Stroll', height: 5, width: 5, challenge: 2, seed: 'ShoStr v0.0.1'},
                {name: 'Winding Walk', height: 5, width: 10, challenge: 3, seed: 'WinWal v0.0.1'},
                {name: 'Simmering Shuffle', height: 10, width: 10, challenge: 3, seed: 'SimShu v0.0.1'},
                {name: 'Terrible Traipse', height: 10, width: 15, challenge: 4, seed: 'TerTra v0.0.1'},
                {name: 'Horrible Hike', height: 15, width: 15, challenge: 4, seed: 'HorHik v0.0.1'},
                {name: 'Jarring Jog', height: 15, width: 20, challenge: 4, seed: 'JarJog v0.0.1'},
                {name: 'Turkey Trot', height: 20, width: 20, challenge: 5, seed: 'TurTro v0.0.1'},
                {name: 'Painful Promenade', height: 20, width: 25, challenge: 5, seed: 'PaiPro v0.0.1'},
                {name: 'Searing Sprint', height: 25, width: 25, challenge: 6, seed: 'SeaSpr v0.0.1'},
                {name: 'Deadly Dash', height: 25, width: 30, challenge: 6, seed: 'DeaDas v0.0.1'},
                {name: 'Tormenting Tour', height: 30, width: 30, challenge: 7, seed: 'TorTou v0.0.1'},
                {name: 'Miserable Mile', height: 30, width: 35, challenge: 7, seed: 'MisMil v0.0.1'},
                {name: 'Boiling Bound', height: 35, width: 35, challenge: 8, seed: 'BoiBou v0.0.1'},
                {name: 'Painful Pace', height: 35, width: 40, challenge: 8, seed: 'PaiPac v0.0.1'},
                {name: 'Gangrenous Gallop', height: 40, width: 40, challenge: 9, seed: 'GanGal v0.0.1'},
                {name: 'Fearful Flight', height: 40, width: 45, challenge: 9, seed: 'FeaFli v0.0.1'},
                {name: "Withershins' Wander", height: 45, width: 45, challenge: 10, seed: 'WitWan v0.0.1'},
                {name: 'Ridiculous Ramble', height: 45, width: 50, challenge: 10, seed: 'RidRam v0.0.1'},
                {name: "Farstrider's Folly", height: 50, width: 50, challenge: 10, seed: 'FarFol v0.0.1'}
            ]
        };

        for (const stub of defaultMazeStubs.mazeStubs) {
            let maze = new Maze().generate(stub.height, stub.width, stub.challenge, stub.name, stub.seed);

            await dbMan
                .deleteDocument(config.MONGO_COL_MAZES, maze.Id)
                .then((result) => {
                    log.debug(__filename, req.url, `Maze "${maze.Id}" deleted.`);
                })
                .catch((err) => {
                    log.warn(__filename, req.url, `Maze "${maze.Id}" was not deleted.  Error -> ${err.message}`);
                });

            await dbMan
                .insertDocument(config.MONGO_COL_MAZES, maze)
                .then((result) => {
                    log.debug(__filename, req.url, `Maze ${maze.Id} generated and inserted into mazes collection`);
                })
                .catch((err: Error) => {
                    log.error(__filename, req.url, 'Error inserting maze ->', err);
                });
        }
    } catch (err) {
        log.error(__filename, req.url, 'Error generating maze ->', err);
        res.status(400).json({status: '400', message: `${err.name} - ${err.message}`});
    }

    return res.status(200).json({status: '200', message: 'Default maze generation complete.'});
};

/**
 * Inserts the maze from the JSON http body into the mongo database.
 *
 * @param req
 * @param res
 */
let insertMaze = async (req: express.Request, res: express.Response) => {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = req.body;

    await dbMan
        .insertDocument(config.MONGO_COL_MAZES, maze)
        .then((result) => {
            res.status(200).json(result);
        })
        .catch((err: Error) => {
            log.error(__filename, req.url, 'Error inserting maze ->', err);
            res.status(400).json({status: '400', message: `${err.name} - ${err.message}`});
        });
};

/**
 * Updates the given maze with data from json body.
 * MazeID is pulled from json body as well.
 *
 * @param req
 * @param res
 */
let updateMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze = new Maze(req.body);

    await dbMan
        .updateDocument(config.MONGO_COL_MAZES, maze.Id, maze)
        .then((result) => {
            res.status(200).json(result);
        })
        .catch((err) => {
            log.error(__filename, req.url, 'Error updating maze ->', err);
            res.status(500).json({status: '500', message: `${err.name} - ${err.message}`});
        });
};

/**
 * Remove the maze document with the ID found in req.id and sends result/count as json response
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let deleteMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let ret = await dbMan.deleteDocument(config.MONGO_COL_MAZES, req.params.id);

    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({error: ret.name, message: ret.message});
    } else {
        res.status(200).json(ret);
    }
};

/**
 * Responds with the raw JSON service document unless the "?html"
 * parameter is found, in which case it renderse an HTML document
 * @param req
 * @param res
 */
let getServiceDoc = (req: express.Request, res: express.Response) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
};

/**
 * Handles undefined routes
 */
let unhandledRoute = (req: express.Request, res: express.Response) => {
    log.warn(__filename, `Route -> [${req.method} -> ${req.url}]`, 'Unhandled route, returning 404.');
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
function getSvcDocUrl(req: express.Request): string {
    let svcData: Service = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('service');
    return `${getProtocolHostPort(req)}${svcData.BaseUrl}${ep.Url}`;
}

/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req: express.Request): string {
    return `${getProtocolHostPort(req)}${ROUTE_PATH}${req.path}`;
}

/**
 * Get and return the protocol, host, and port for the current
 * request.
 *
 * @param req
 */
function getProtocolHostPort(req: express.Request): string {
    return `${req.protocol}://${req.get('host')}`;
}

// Route -> http.get mappings
defaultRouter.get('/service', getServiceDoc);
defaultRouter.get('/get/count', getMazeCount);
defaultRouter.get('/get/all', getMazes);
defaultRouter.get('/get/:id', getMaze);
defaultRouter.get('/generate/:height/:width/:challenge/:name/:seed', generateMaze);
defaultRouter.get('/generate/default-maze-list', generateDefaultMazes);
// Route -> http.delete mappings
defaultRouter.delete('/delete/:id', deleteMaze);

// Route -> http.put mappings
defaultRouter.put('/insert', insertMaze);
defaultRouter.put('/update', updateMaze);

// capture all unhandled routes
defaultRouter.get('/*', unhandledRoute);
defaultRouter.put('/*', unhandledRoute);
defaultRouter.delete('/*', unhandledRoute);
defaultRouter.post('/*', unhandledRoute);

// expose router as module
export default defaultRouter;
