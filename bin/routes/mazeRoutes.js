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
const logger_1 = require("@mazemasterjs/logger");
const Config_1 = __importDefault(require("@mazemasterjs/shared-library/Config"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
exports.defaultRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
const ROUTE_PATH = '/api/maze';
let dbMan;
// cache maze data
let stubCache = new Array();
let cacheExpiration = Date.now();
// load env vars
const CACHE_DURATION = process.env.CACHE_DURATION_MAZES === undefined ? 300000 : parseInt(process.env.CACHE_DURATION_MAZES + '', 10);
// other constants
const STUB_PROJECTION = { _id: 0, cells: 0, textRender: 0, startCell: 0, finishCell: 0 };
/**
 * This just assigns mongo the instance of DatabaseManager. We shouldn't be
 * able to get here without a database connection and existing instance, but
 * we'll do some logging / error checking anyway.
 */
DatabaseManager_1.default.getInstance()
    .then((instance) => {
    dbMan = instance;
    // enable the "readiness" probe that tells OpenShift that it can send traffic to this service's pod
    config.READY_TO_ROCK = true;
    log.info(__filename, 'DatabaseManager.getInstance()', 'Service is now LIVE, READY, and taking requests.');
    // db connected, prepare the maze cache
    loadMazeCaches();
})
    .catch((err) => {
    log.error(__filename, 'DatabaseManager.getInstance()', 'Error getting DatabaseManager instance ->', err);
});
/**
 * loads maze data into local caches
 *
 * */
function loadMazeCaches() {
    log.debug(__filename, 'loadMazeCaches()', 'Preparing maze cache.');
    if (process.env.CACHE_DURATION_MAZES === undefined) {
        log.warn(__filename, 'loadMazeCaches()', `env.CACHE_DURATION_MAZES not set, using default of ${CACHE_DURATION}ms.`);
    }
    else {
        log.info(__filename, 'loadMazeCaches()', `Cache duration set via config to ${CACHE_DURATION}ms.`);
    }
    buildMazeArray(STUB_PROJECTION).then((stubArray) => {
        stubCache = stubArray;
        cacheExpiration = Date.now() + CACHE_DURATION;
        log.info(__filename, 'loadMazeCaches()', `stubCache loaded with ${stubCache.length} stubbed maze documents, caches expire at ${cacheExpiration}.`);
    });
}
/**
 * Builds and returns an array of maze objects with the given projection
 *
 * @param projection The field projection to use during the query
 */
function buildMazeArray(projection) {
    return __awaiter(this, void 0, void 0, function* () {
        let mazes = new Array();
        let cacheValid = cacheExpiration > Date.now();
        let trappedError;
        const query = {};
        const expectedCount = yield dbMan.getDocumentCount(config.MONGO_COL_MAZES).then((count) => {
            return count;
        });
        // check the requested array length agains the database document count and invalidate if there is a mismatch
        if (cacheValid && stubCache.length != expectedCount) {
            log.warn(__filename, 'buildMazeArray()', `stubCache.length (${stubCache.length}) does not match document count ${expectedCount}. Invalidating cache.`);
            cacheValid = false;
        }
        // return a cached array if not expired, otherwise rebuild the requested array
        if (cacheValid) {
            log.debug(__filename, 'buildMazeArray()', 'Caches valid and fresh, returning cached maze data.');
            mazes = stubCache;
        }
        else {
            try {
                let done = false;
                let pageNum = 1;
                let pageSize = 10;
                // loop through the paged list of mazes and return the full array of mazes
                while (!done) {
                    let page = yield dbMan.getDocuments(config.MONGO_COL_MAZES, query, projection, pageSize, pageNum);
                    if (page.length > 0) {
                        log.debug(__filename, 'buildMazeArray()', `-> Page #${pageNum}, pushing ${page.length} documents into mazes array.`);
                        // can't easily use Array.concat, so have to loop and push
                        for (const stub of page) {
                            mazes.push(stub);
                        }
                    }
                    // if we don't have at least pageSize elements, we've hit the last page
                    if (page.length < pageSize) {
                        done = true;
                        log.debug(__filename, 'buildMazeArray()', `-> Finished. ${mazes.length} maze documents collected from ${pageNum} pages.`);
                    }
                    else {
                        pageNum++;
                    }
                }
                // just a little sanity check...
                if (mazes.length < expectedCount) {
                    log.warn(__filename, 'buildMazeArray()', `Returned ${mazes.length} documents, but expected ${expectedCount}`);
                }
            }
            catch (err) {
                log.error(__filename, 'buildMazeArray()', 'Unable to build array of maze documents ->', err);
                trappedError = err;
            }
        }
        // resolve and return the promise
        return new Promise((resolve, reject) => {
            if (trappedError !== undefined) {
                reject(trappedError);
            }
            else {
                resolve(mazes);
            }
        });
    });
}
/**
 * Strip some data from a maze to make it a stub then insert it into stubCache and reset expiration
 *
 * @param maze
 */
function addToCache(maze) {
    delete maze._id;
    delete maze.cells;
    delete maze.textRender;
    delete maze.startCell;
    delete maze.finishCell;
    stubCache.push(maze);
    cacheExpiration = Date.now() + CACHE_DURATION;
}
/**
 * Attempts to insert the given document into the mazes collection
 *
 * @param mazeDoc - Maze document
 */
function doInsertMaze(mazeDoc) {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug(__filename, `doInsertMaze(${mazeDoc})`, `Attempting to insert ${mazeDoc.id}`);
        let result = yield dbMan
            .insertDocument(config.MONGO_COL_MAZES, mazeDoc)
            .then((result) => {
            addToCache(result.ops[0]);
            return result;
        })
            .catch((err) => {
            log.error(__filename, `doInsertMaze(${mazeDoc.id})`, 'Error inserting maze ->', err);
            return err;
        });
        return new Promise((resolve, reject) => {
            resolve(result);
        });
    });
}
/**
 * Response with json maze-count value showing the count of all maze documents found
 * in the maze collection.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMazeCount = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    yield dbMan
        .getDocumentCount(config.MONGO_COL_MAZES)
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
let getAllMazeStubs = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    try {
        buildMazeArray(STUB_PROJECTION).then((stubs) => {
            stubCache = stubs;
            res.status(200).json(stubCache);
        });
    }
    catch (err) {
        res.status(500).json({ status: '500', message: err.message });
    }
});
/**
 * Gets and returns a json maze object with the specified Maze.Id.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    const mazeId = req.params.id;
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    yield dbMan
        .getDocument(config.MONGO_COL_MAZES, { id: mazeId }, { _id: 0 })
        .then((maze) => {
        if (!maze) {
            return res.status(404).json({ status: '404', message: 'Maze not found.' });
        }
        else {
            return res.status(200).json(maze);
        }
    })
        .catch((err) => {
        res.status(500).json({ status: '500', message: err.message });
    });
});
/**
 * Generate a new maze from the given parameters and either return as json or render an HTML preview.
 * Note: Input validation is built into Maze.Generate()
 * @param req - supports query paramenter "?html" - if present, will render a maze preview instead of returning json.
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
let generateDefaultMazes = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    cacheExpiration = Date.now(); // invalidate cache
    try {
        const defaultMazeStubs = {
            mazeStubs: [
                { name: "Farstrider's Folly", height: 50, width: 50, challenge: 10, seed: 'FarFol v0.0.1' },
                { name: 'Ridiculous Ramble', height: 45, width: 50, challenge: 10, seed: 'RidRam v0.0.1' },
                { name: "Withershins' Wander", height: 45, width: 45, challenge: 10, seed: 'WitWan v0.0.1' },
                { name: 'Fearful Flight', height: 40, width: 45, challenge: 9, seed: 'FeaFli v0.0.1' },
                { name: 'Gangrenous Gallop', height: 40, width: 40, challenge: 9, seed: 'GanGal v0.0.1' },
                { name: 'Painful Pace', height: 35, width: 40, challenge: 8, seed: 'PaiPac v0.0.1' },
                { name: 'Boiling Bound', height: 35, width: 35, challenge: 8, seed: 'BoiBou v0.0.1' },
                { name: 'Miserable Mile', height: 30, width: 35, challenge: 7, seed: 'MisMil v0.0.1' },
                { name: 'Tormenting Tour', height: 30, width: 30, challenge: 7, seed: 'TorTou v0.0.1' },
                { name: 'Deadly Dash', height: 25, width: 30, challenge: 6, seed: 'DeaDas v0.0.1' },
                { name: 'Searing Sprint', height: 25, width: 25, challenge: 6, seed: 'SeaSpr v0.0.1' },
                { name: 'Painful Promenade', height: 20, width: 25, challenge: 5, seed: 'PaiPro v0.0.1' },
                { name: 'Turkey Trot', height: 20, width: 20, challenge: 5, seed: 'TurTro v0.0.1' },
                { name: 'Jarring Jog', height: 15, width: 20, challenge: 4, seed: 'JarJog v0.0.1' },
                { name: 'Horrible Hike', height: 15, width: 15, challenge: 4, seed: 'HorHik v0.0.1' },
                { name: 'Terrible Traipse', height: 10, width: 15, challenge: 4, seed: 'TerTra v0.0.1' },
                { name: 'Simmering Shuffle', height: 10, width: 10, challenge: 3, seed: 'SimShu v0.0.1' },
                { name: 'Winding Walk', height: 5, width: 10, challenge: 3, seed: 'WinWal v0.0.1' },
                { name: 'Short Stroll', height: 5, width: 5, challenge: 2, seed: 'ShoStr v0.0.1' },
                { name: 'Miniature March', height: 3, width: 5, challenge: 1, seed: 'MinMar v0.0.1' },
                { name: 'Tiny Trek', height: 3, width: 3, challenge: 1, seed: 'TinTre v0.0.1' }
            ]
        };
        for (const stub of defaultMazeStubs.mazeStubs) {
            let maze = new Maze_1.default().generate(stub.height, stub.width, stub.challenge, stub.name, stub.seed);
            yield dbMan
                .deleteDocument(config.MONGO_COL_MAZES, { id: maze.Id })
                .then((result) => {
                switch (result.deletedCount) {
                    case 0: {
                        log.debug(__filename, req.url, `Maze "${maze.Id}" not found.`);
                        break;
                    }
                    case 1: {
                        log.debug(__filename, req.url, `Maze "${maze.Id}" deleted.`);
                        break;
                    }
                    default: {
                        log.warn(__filename, req.url, `!! WARNING !! ${result.deletedCount} mazes with id "${maze.Id}" deleted`);
                    }
                }
            })
                .catch((err) => {
                log.warn(__filename, req.url, `Maze "${maze.Id}" was not deleted. Error -> ${err.message}`);
            });
            yield doInsertMaze(maze).then((result) => {
                if (result.insertedCount == 1) {
                    log.debug(__filename, req.url, `Maze ${maze.Id} inserted into mazes collection`);
                }
                else {
                    log.warn(__filename, req.url, `Maze ${maze.Id} generated, but insertCount returned 0.`);
                }
            });
        }
    }
    catch (err) {
        log.error(__filename, req.url, 'Error generating maze ->', err);
        res.status(400).json({ status: '400', message: `${err.name} - ${err.message}` });
    }
    return res.status(200).json({ status: '200', message: 'Default maze generation complete.' });
});
/**
 * Inserts the maze from the JSON http body into the mongo database.
 *
 * @param req
 * @param res
 */
let insertMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    cacheExpiration = Date.now(); // invalidate cache
    let maze = req.body;
    yield doInsertMaze(maze)
        .then((result) => {
        res.status(200).json(result);
    })
        .catch((err) => {
        res.status(400).json({ status: '400', message: `${err.name} - ${err.message}` });
    });
});
/**
 * Updates the given maze with data from json body.
 * MazeID is pulled from json body as well.
 *
 * @param req
 * @param res
 */
let updateMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    cacheExpiration = Date.now(); // invalidate cache
    let maze = new Maze_1.default(req.body);
    yield dbMan
        .updateDocument(config.MONGO_COL_MAZES, { id: maze.Id }, maze)
        .then((result) => {
        res.status(200).json(result);
    })
        .catch((err) => {
        log.error(__filename, req.url, 'Error updating maze ->', err);
        res.status(500).json({ status: '500', message: `${err.name} - ${err.message}` });
    });
});
/**
 * Remove the maze document with the ID found in req.id and sends result/count as json response
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let deleteMaze = (req, res) => __awaiter(this, void 0, void 0, function* () {
    const mazeId = req.params.id;
    cacheExpiration = Date.now(); // invalidate cache
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    yield dbMan.deleteDocument(config.MONGO_COL_MAZES, { id: mazeId }).then((result) => {
        switch (result.deletedCount) {
            case 0: {
                log.debug(__filename, req.url, `Maze "${mazeId}" not found.`);
                return res.status(404).json(result);
            }
            case 1: {
                log.debug(__filename, req.url, `Maze "${mazeId}" deleted.`);
                return res.status(200).json(result);
            }
            default: {
                log.warn(__filename, req.url, `!! WARNING !! ${result.deletedCount} mazes with id "${mazeId}" deleted`);
                return res.status(200).json(result);
            }
        }
    });
});
/**
 * Responds with the raw JSON service document unless the "?html"
 * parameter is found, in which case it renderse an HTML document
 * @param req
 * @param res
 */
let getServiceDoc = (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
};
/**
 * Handles undefined routes
 */
let unhandledRoute = (req, res) => {
    log.warn(__filename, `Route -> [${req.method} -> ${req.url}]`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404',
        message: 'Route not found. See service documentation for a list of endpoints.',
        'service-document': getSvcDocUrl
    });
};
/**
 * Generate and a string-based link to the service document's help section using the
 * given request to determine URL parameters.
 *
 * @param req
 */
function getSvcDocUrl(req) {
    let svcData = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('service');
    return `${getProtocolHostPort(req)}${svcData.BaseUrl}${ep.Url}`;
}
/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req) {
    return `${getProtocolHostPort(req)}${ROUTE_PATH}${req.path}`;
}
/**
 * Get and return the protocol, host, and port for the current
 * request.
 *
 * @param req
 */
function getProtocolHostPort(req) {
    return `${req.protocol}://${req.get('host')}`;
}
// Route -> http.get mappings
exports.defaultRouter.get('/service', getServiceDoc);
exports.defaultRouter.get('/get/count', getMazeCount);
exports.defaultRouter.get('/get/all', getAllMazeStubs);
exports.defaultRouter.get('/get/:id', getMaze);
exports.defaultRouter.get('/generate/default-maze-list', generateDefaultMazes);
exports.defaultRouter.get('/generate/:height/:width/:challenge/:name/:seed', generateMaze);
// Route -> http.delete mappings
exports.defaultRouter.delete('/delete/:id', deleteMaze);
// Route -> http.put mappings
exports.defaultRouter.put('/insert', insertMaze);
exports.defaultRouter.put('/update', updateMaze);
// capture all unhandled routes
exports.defaultRouter.get('/*', unhandledRoute);
exports.defaultRouter.put('/*', unhandledRoute);
exports.defaultRouter.delete('/*', unhandledRoute);
exports.defaultRouter.post('/*', unhandledRoute);
// expose router as module
exports.default = exports.defaultRouter;
//# sourceMappingURL=mazeRoutes.js.map