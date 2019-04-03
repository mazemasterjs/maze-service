import express, {response} from 'express';
import fs, {readlink} from 'fs';
import {format as fmt, isUndefined, isNull} from 'util';
import {Logger} from '@mazemasterjs/logger';
import path from 'path';
import Config from '@mazemasterjs/shared-library/Config';
import Service from '@mazemasterjs/shared-library/Service';
import MazeDao from '../MazeDao';
import Maze from '@mazemasterjs/shared-library/Maze';
export const defaultRouter = express.Router();

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();
const mazeDao: MazeDao = MazeDao.getInstance();

/**
 * Handle favicon requests
 */
defaultRouter.get('/favicon.ico', (req, res) => {
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    res.setHeader('Content-Type', 'image/x-icon');
    res.status(200).sendFile(path.resolve('views/images/favicon/favicon.ico'));
});

defaultRouter.get('/css/:file', (req, res) => {
    let cssFile: string = `views/css/${req.params.file}`;
    log.trace(__filename, req.url, 'Handling request -> ' + rebuildUrl(req));
    if (fs.existsSync(cssFile)) {
        res.setHeader('Content-Type', 'text/css');
        res.status(200).sendFile(path.resolve(cssFile));
    } else {
        log.warn(__filename, `Route -> [${req.url}]`, `File [${cssFile}] not found, returning 404.`);
        res.sendStatus(404);
    }
});

defaultRouter.get('/help', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.render('help.ejs', {svcDoc: config.SERVICE_DOC});
});

defaultRouter.get('/service', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
});

/**
 * Returns the maze with the given id
 */
defaultRouter.get('/get/count', (req, res) => {
    log.debug(__filename, `Route -> [${req.url}]`, 'Handling request.');
    (async function() {
        if (mazeDao.coll) {
            log.debug(__filename, `Route -> [${req.url}]`, 'Counting...');
            var mazeCount = await mazeDao.coll.countDocuments();
            log.debug(__filename, `Route -> [${req.url}]`, `Returning ${mazeCount}`);
            res.status(200).json({mazeCount: mazeCount});
        } else {
            res.status(500).json({message: 'Unable to connect to Maze Collection.'});
        }
    });
});

/**
 * Handles undefined routes
 */
defaultRouter.get('/*', (req, res) => {
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    res.status(404).json({
        status: '404 - Resource not found.',
        message: getHelpMsg(req)
    });
});

function sendResponse(res: express.Response, req: express.Request, err: Error, data: string) {
    log.trace(__filename, `Route -> [${req.url}]`, 'Sending response.');
    if (isUndefined(data) || isNull(data) || data == '') {
        res.sendStatus(404);
    } else {
        res.status(200).json(data);
    }
}

/**
 * Generate and a string-based link to the service document's help section using the
 * given request to determine URL parameters.
 *
 * @param req
 */
function getHelpMsg(req: express.Request): string {
    let svcData: Service = config.SERVICE_DOC;
    let ep = svcData.getEndpointByName('help');
    return fmt('See %s%s%s for service documentation.', getProtocolHostPort(req), svcData.BaseUrl, ep.Url);
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

export default defaultRouter;
