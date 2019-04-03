"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const Config_1 = require("@mazemasterjs/shared-library/Config");
const logger_1 = require("@mazemasterjs/logger");
class MazeDao {
    // must use getInstance()
    constructor() {
        this.config = Config_1.Config.getInstance();
        this.log = logger_1.Logger.getInstance();
    }
    // singleton instance pattern
    static getInstance() {
        if (!MazeDao.instance) {
            logger_1.Logger.getInstance().debug(__filename, 'getInstance()', 'Instantiating new instance of class.');
            this.instance = new MazeDao();
            this.instance.initConnection();
        }
        return this.instance;
    }
    initConnection() {
        mongodb_1.MongoClient.connect(Config_1.Config.getInstance().MONGO_CONNSTR, { useNewUrlParser: true }, function (err, client) {
            let config = Config_1.Config.getInstance();
            if (err) {
                logger_1.Logger.getInstance().error(__filename, 'constructor()', `Error connecting to ${MazeDao.getInstance().config.MONGO_CONNSTR}`, err);
            }
            MazeDao.instance.mongoDBClient = client;
            MazeDao.instance.db = MazeDao.instance.mongoDBClient.db(config.MONGO_DB);
            MazeDao.instance.coll = MazeDao.instance.db.collection(config.MONGO_COL_MAZES);
        });
    }
    getMazes() {
        if (this.coll) {
            let mazes = this.coll.find();
            this.log.debug(__filename, 'getMazes()', `Returning  ${mazes.count}`);
            return mazes.toArray();
        }
        else {
            this.log.warn(__filename, 'getMazeCount()', 'Maze Collection is undefined.');
            return null;
        }
    }
    /**
     * Close the database connection.
     */
    disconnect() {
        if (this.mongoDBClient) {
            this.mongoDBClient.close();
        }
    }
}
exports.MazeDao = MazeDao;
exports.default = MazeDao;
//# sourceMappingURL=MazeDao.js.map