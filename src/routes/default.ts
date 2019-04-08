import express from 'express';
import {format as fmt, isUndefined, isNull} from 'util';
import {Logger} from '@mazemasterjs/logger';
import fs from 'fs';
import path from 'path';
import Config from '@mazemasterjs/shared-library/Config';
import Service from '@mazemasterjs/shared-library/Service';
import MazeDao from '../MazeDao';
import {Cursor} from 'mongodb';
import Maze from '@mazemasterjs/shared-library/Maze';
export const defaultRouter = express.Router();
import MongoError from 'mongodb';

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();
const mazeDao: MazeDao = MazeDao.getInstance();

/**
 * Response with json maze-count value showing the count of all maze documents found
 * in the maze collection.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getDocCount = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let count = await mazeDao.countDocuments(config.MONGO_COL_MAZES);
    log.debug(__filename, 'getDocCount()', 'Document Count=' + count);
    res.status(200).json({collection: config.MONGO_COL_MAZES, 'maze-count': count});
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
    let curMazes: Cursor<any> = await mazeDao.getAllDocuments(config.MONGO_COL_MAZES);
    res.status(200).json(await curMazes.toArray());
};

/**
 * Gets and returns a json maze object with the specified ID.
 *
 * @param req - express.Request
 * @param res - express.Response
 */
let getMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze: Maze = await mazeDao.getDocument(config.MONGO_COL_MAZES, req.params.id);

    if (maze) {
        res.status(200).json(maze);
    } else {
        log.warn(__filename, `Route -> [${req.url}]`, `Maze [${req.params.id}] not found, returning 404.`);
        res.status(404).json({
            status: '404',
            message: 'Maze not found.'
        });
    }
};

//TODO REPLACE TEST METHOD
let insertMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    let maze: Maze = new Maze().generate(3, 3, 2, 'AnotherTest', 'AnotherSeed');
    let ret = await mazeDao.insertDocument(config.MONGO_COL_MAZES, maze);

    // check for errors and respond correctly
    if (ret instanceof Error) {
        res.status(500).json({error: ret.name, message: ret.message});
    } else {
        res.status(200).json(ret);
    }
};

//TODO REPLACE TEST METHOD
let updateMaze = async (req: express.Request, res: express.Response) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));

    let doc = await mazeDao.getDocument(config.MONGO_COL_MAZES, '3:3:2:AnotherSeed');
    let maze = new Maze(doc);

    console.log(`Got maze ${maze.Id}, updating...`);

    maze.Note = 'MongoDal test: Note_' + new Date().getTime();
    console.log(`Note: ${maze.Note}`);

    let ret: any = await mazeDao.updateDocument(config.MONGO_COL_MAZES, maze.Id, maze);
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
    let ret = await mazeDao.deleteDocument(config.MONGO_COL_MAZES, req.params.id);

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
    return fmt('%s', getProtocolHostPort(req), req.url);
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
defaultRouter.get('/get/count', getDocCount);
defaultRouter.get('/get/all', getMazes);
defaultRouter.get('/get/:id', getMaze);
defaultRouter.get('/delete/:id', deleteMaze);
defaultRouter.get('/insert/test', insertMaze);
defaultRouter.get('/update/test', updateMaze);
defaultRouter.get('/favicon.ico', getFavicon);
defaultRouter.get('/css/:file', getCssFile);
defaultRouter.get('/help', getServiceDoc);
defaultRouter.get('/help.json', getServiceDoc);
defaultRouter.get('/help.html', renderHelp);
defaultRouter.get('/service', getServiceDoc);
defaultRouter.get('/*', unhandledRoute);

export default defaultRouter;
