import express from 'express';
import {Logger} from '@mazemasterjs/logger';
export const helpRouter = express.Router();
import Config from '@mazemasterjs/shared-library/Config';

const log: Logger = Logger.getInstance();
const config: Config = Config.getInstance();
const htmlOpen = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Help</title></head><body>';
const htmlClose = '</html>';

/**
 * Liveness probe for container/cloud hosted service monitoring
 */
helpRouter.get('/*', (req, res) => {
    let htmlOut = htmlOpen + 'This is the help page.' + htmlClose;
    log.trace(__filename, 'Route -> [' + req.url + ']', 'Handling request.');
    res.status(200).send(htmlOut);
    log.trace(__filename, 'Route -> [' + req.url + ']', 'Response complete.');
});

export default helpRouter;
