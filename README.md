# maze-service

maze-service handles storage, retrieval, and generation of maze data.

## Details

-   MazeMasterJS services are RESTful APIs built in NodeJS with express
-   Every service includes a service.json file that lists endpoints, and possible arguments (with type)
-   See [/service.json](https://github.com/mazemasterjs/maze-service/blob/development/service.json) for complete list of endpoints and arguments.

## Notes

-   This service is hooked to OpenShift - when a PR against master is completed, the CD pipeline kicks in and OpenShift pulls the repo, creates a new container image, and attempts to deploy it to the cluster. Unless the build / deploy fails, changes will be live within a minute of the PR being completed.
-   Chris is [working on a vue component](https://trello.com/c/yrkTE2Od) for service docs that will be available via web-ui sometime soon.

## Change Log

### v1.1.0

-   Reversed order of maze generation in /generate/default-maze-list so smaller mazes would be on top of the document stack
-   Changed /get/all to return maze stubs (meta data - no cell data or textRender) instead of full maze docs
-   Added internal cache for full list of maze stubs. Cache expiration controlled by env-var: CACHE_DURATION_MAZES (default 300000ms)
-   Renamed base routes file from default.ts to mazeRoutes.ts to clarify logging
-   Updated service.json to reflect api changes
-   More detail in: https://trello.com/c/cgbQ8xdd
