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
const path_1 = __importDefault(require("path"));
const logger_1 = require("@mazemasterjs/logger");
const Config_1 = __importDefault(require("@mazemasterjs/shared-library/Config"));
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
const DatabaseManager_1 = __importDefault(require("@mazemasterjs/database-manager/DatabaseManager"));
exports.defaultRouter = express_1.default.Router();
const log = logger_1.Logger.getInstance();
const config = Config_1.default.getInstance();
let dbMan;
// cache maze data
let stubCache = new Array();
let cacheExpiration = Date.now();
// load env vars
const CACHE_DURATION = process.env.CACHE_DURATION_MAZES === undefined ? 300000 : parseInt(process.env.CACHE_DURATION_MAZES + '', 10);
// other constants
const MAZE_DATA_FILE = path_1.default.resolve('data/default-maze-list.json');
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
 * Removes data fields not needed for basic list views from a full maze object
 * to avoid transferring large amounts of data for list-oriented use cases.
 *
 * @param maze A JSON object matching the Maze object signature
 */
function getStubFromMazeDoc(maze) {
    delete maze._id;
    delete maze.cells;
    delete maze.textRender;
    delete maze.startCell;
    delete maze.finishCell;
    return maze;
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
            // push the new maze stub onto the cache and reset expiration timer
            stubCache.push(getStubFromMazeDoc(result.ops[0]));
            cacheExpiration = Date.now() + CACHE_DURATION;
            // return the insert result
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
    yield buildMazeArray(STUB_PROJECTION)
        .then((stubs) => {
        res.status(200).json(stubs);
    })
        .catch((err) => {
        res.status(500).json({ status: '500', message: err.message });
    });
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
/**
 * Deletes existing mazes from MAZE_DATA_FILE and regenerates them from the
 * settings in the data file.  Useful for rebuilding a full set of 21 mazes after updates
 * to the generation routines are made.
 *
 */
let generateDefaultMazes = (req, res) => __awaiter(this, void 0, void 0, function* () {
    log.debug(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    cacheExpiration = Date.now(); // invalidate cache
    if (!fs_1.default.existsSync(MAZE_DATA_FILE)) {
        const err = new Error(`File not found: ${MAZE_DATA_FILE}. CWD: ${__dirname}`);
        log.error(__filename, 'generateDefaultMazes()', 'Unable to load maze-data file ->', err);
        return res.status(500).json({ status: '500', message: err.message });
    }
    // load the default-maze-list.json file and convert to json
    const mazeData = JSON.parse(fs_1.default.readFileSync(MAZE_DATA_FILE, 'UTF-8'));
    // capture errors to return if function completes
    let resOk = [];
    let resWrn = [];
    let resErr = [];
    // parse the file, deleting all mazes first, then regenerating and inserting them
    for (const stub of mazeData.stubs) {
        const stubId = `${stub.height}:${stub.width}:${stub.challenge}:${stub.seed}`;
        yield dbMan
            .deleteDocument(config.MONGO_COL_MAZES, { id: stubId })
            .then((result) => {
            switch (result.deletedCount) {
                case 0: {
                    log.debug(__filename, req.url, `Maze "${stubId}" not found.`);
                    resWrn.push({ id: stubId, msg: `delete failed - maze not found` });
                    break;
                }
                case 1: {
                    log.debug(__filename, req.url, `Maze "${stubId}" deleted.`);
                    resOk.push({ id: stubId, msg: 'maze deleted' });
                    break;
                }
                default: {
                    log.warn(__filename, req.url, `!! WARNING !! ${result.deletedCount} mazes with id "${stubId}" deleted`);
                    resWrn.push({ id: stubId, msg: `multiple mazes delete: (${result.deletedCount})` });
                }
            }
        })
            .catch((err) => {
            log.warn(__filename, req.url, `Maze "${stubId}" was not deleted. Error -> ${err.message}`);
            resErr.push({ id: stubId, msg: err.message });
        });
        // only generate and insert the maze if regen is not disabled
        if (req.query.NO_REGEN !== 'true') {
            let maze;
            // generate the maze
            try {
                maze = new Maze_1.default().generate(stub.height, stub.width, stub.challenge, stub.name, stub.seed);
            }
            catch (err) {
                log.error(__filename, 'generateDefaultMazes()', `Error generating default maze named '${stub.name}' ->`, err);
                resErr.push(err);
                return res.status(500).json({ ok: resOk, warn: resWrn, error: resErr });
            }
            // and insert it into the databse
            yield doInsertMaze(maze)
                .then((mdbRes) => {
                console.log(JSON.stringify(mdbRes));
                if (mdbRes.result.n == 1) {
                    log.debug(__filename, req.url, `Maze ${maze.Id} inserted into mazes collection`);
                    resOk.push({ id: maze.Id, msg: 'inserted' });
                }
                else {
                    log.warn(__filename, req.url, `Maze ${maze.Id} generated, but insert count was ${mdbRes.result.n}.`);
                    resWrn.push({ id: maze.Id, msg: `insert result count: ${mdbRes.result.n}` });
                }
            })
                .catch((err) => {
                log.error(__filename, req.url, 'Error inserting regenerated maze data ->', err);
                resErr.push({ id: maze.Id, msg: err.message });
            });
        }
    }
    // set response status based on error count
    if (resErr.length > 0) {
        res.status(500);
    }
    else {
        res.status(200);
    }
    // return the results
    return res.json({ ok: resOk, warn: resWrn, error: resErr });
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
 * Deletes all mazes found matching the given query parameters
 *
 * @param req
 * @param res
 */
let deleteManyMazes = (req, res) => __awaiter(this, void 0, void 0, function* () {
    const query = {};
    // build the json object containing maze parameters for deletion
    for (const key in req.query) {
        query[key] = req.query[key];
    }
    log.debug(__filename, `deleteManyMazes(${JSON.stringify(query)})`, 'Entering');
    yield dbMan
        .deleteDocuments(config.MONGO_COL_MAZES, query)
        .then((result) => {
        if (result.deletedCount === 0) {
            log.debug(__filename, req.url, `No mazes matching parameters ${JSON.stringify(query)} were found.`);
            return res.status(404).json(result);
        }
        else {
            log.debug(__filename, req.url, `${result.deletedCount} mazes were deleted.`);
            return res.status(200).json(result);
        }
    })
        .catch((err) => {
        log.error(__filename, `deleteManyMazes(${query})`, 'Error encountered ->', err);
    });
});
/**
 * Remove the maze document with the ID found in req.id and sends result/count as json response
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let deleteMazeById = (req, res) => __awaiter(this, void 0, void 0, function* () {
    const mazeId = req.params.id;
    cacheExpiration = Date.now(); // invalidate cache
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    yield dbMan.deleteDocument(config.MONGO_COL_MAZES, { id: mazeId }).then((result) => {
        if (result.deletedCount === 0) {
            log.debug(__filename, req.url, `Maze "${mazeId}" not found.`);
            return res.status(404).json(result);
        }
        else {
            return res.status(200).json(result);
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
    return `${getProtocolHostPort(req)}${config.SERVICE_DOC.baseUrl}${req.path}`;
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
exports.defaultRouter.delete('/delete/:id', deleteMazeById);
exports.defaultRouter.delete('/deleteMany', deleteManyMazes);
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