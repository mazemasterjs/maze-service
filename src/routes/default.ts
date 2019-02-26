import express from 'express';
import fs from 'fs';
import {format as fmt} from 'util';
import {Logger} from '@mazemasterjs/logger';
import path from 'path';
import Config from '@mazemasterjs/shared-library/Config';
import Maze from '@mazemasterjs/shared-library/Maze';
export const defaultRouter = express.Router();

const log: Logger = Logger.getInstance();
const apiDataFile = 'data/api.json';
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
defaultRouter.get('/*', (req, res) => {
    let apiData: any = null;
    let route = '/*';
    let url = rebuildUrl(req);
    let helpUrl = '';

    log.warn(__filename, route, 'Invalid Route Requested -> ' + url);

    fs.readFile(apiDataFile, 'utf8', function(err, data) {
        if (err) {
            res.status(400).json({
                status: '400',
                message: fmt('Invalid request. See %s://%s/api/maze/help for documentation.', req.protocol, req.get('host'))
            });
            log.error(__filename, fmt('Route -> %s -> Invalid Request.', req.originalUrl), err.message, err);
        } else {
            apiData = JSON.parse(data);
            res.status(400).json({
                status: '400',
                message: fmt('Invalid request. See %s://%s/%s for documentation.', req.protocol, req.get('host'), apiData.baseUrl + apiData.endpoints[0].url)
            });
        }
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
