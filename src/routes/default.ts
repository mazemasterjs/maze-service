import express from 'express';
import fs from 'fs';
import {format as fmt} from 'util';
import {Logger} from '@mazemasterjs/logger';
import path from 'path';
import Config from '@mazemasterjs/shared-library/Config';
import Service from '@mazemasterjs/shared-library/Service';
import {fips} from 'crypto';
export const defaultRouter = express.Router();

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();

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
 * Handles undefined routes
 */
defaultRouter.get('/*', (req, res) => {
    let svcData: Service = config.SERVICE_DOC;
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    let ep = svcData.getEndpointByName('help');
    res.status(404).json({
        status: '404 - Resource not found.',
        message: fmt('See %s%s%s for service documentation.', getProtocolHostPort(req), svcData.BaseUrl, ep.Url)
    });
});

/**
 * Reconstruct the URL from the Express Request object
 * @param req
 */
function rebuildUrl(req: express.Request): string {
    return fmt('%s', getProtocolHostPort(req), req.url);
}

function getProtocolHostPort(req: express.Request): string {
    return fmt('%s://%s', req.protocol, req.get('host'));
}

export default defaultRouter;
