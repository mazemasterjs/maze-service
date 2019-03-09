import express from 'express';
import {Logger} from '@mazemasterjs/logger';
export const helpRouter = express.Router();
import Config from '@mazemasterjs/shared-library/Config';

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();

/**
 * Liveness probe for container/cloud hosted service monitoring
 */
helpRouter.get('/help', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.render('help.ejs', {svcDoc: config.SERVICE_DOC});
});

helpRouter.get('/service', (req, res) => {
    log.trace(__filename, `Route -> [${req.url}]`, 'Handling request.');
    res.status(200).json(config.SERVICE_DOC);
});

helpRouter.get('/*', (req, res) => {
    log.warn(__filename, `Route -> [${req.url}]`, 'Unhandled route, returning 404.');
    res.sendStatus(404);
});
export default helpRouter;
