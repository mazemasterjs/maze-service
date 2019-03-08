import express from 'express';
import fs from 'fs';
import {format as fmt} from 'util';
import {Logger} from '@mazemasterjs/logger';
import path from 'path';
import Config from '@mazemasterjs/shared-library/Config';
import Maze from '@mazemasterjs/shared-library/Maze';
export const defaultRouter = express.Router();

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();

/**
 * Handle favicon requests
 */
defaultRouter.get('/favicon.ico', (req, res) => {
    log.trace(__filename, '/favicon.ico', 'Handling request -> ' + rebuildUrl(req));
    res.setHeader('Content-Type', 'image/x-icon');
    res.status(200).sendFile(path.resolve('views/images/favicon/favicon.ico'));
});

/**
 * Handles undefined routes
 */
defaultRouter.get('/', (req, res) => {
    let apiData = config.SERVICE_DOC;
    let route = '/';
    let url = rebuildUrl(req);
    let helpUrl = '';

    log.warn(__filename, route, 'Invalid Route Requested -> ' + url);

    let host = fmt('%s://%s%s', req.protocol, req.get('host'));
    res.status(400).json({
        status: '400',
        message: fmt('Invalid request. See %s for documentation.', apiData.baseUrl + apiData.endpoints[0].url)
    });
});

/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req: express.Request) {
    return fmt('%s://%s%s', req.protocol, req.get('host'), req.url);
}

export default defaultRouter;
