import {MongoClient, Db, Collection, Cursor} from 'mongodb';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';

export class MazeDao {
    // get/declare static variables
    private static instance: MazeDao;
    private config: Config = Config.getInstance();
    private log: Logger = Logger.getInstance();

    // declear mongo classes
    private mongoDBClient: MongoClient | undefined;
    public coll: Collection | undefined;
    private db: Db | undefined;

    // must use getInstance()
    private constructor() {}

    // singleton instance pattern
    public static getInstance(): MazeDao {
        if (!MazeDao.instance) {
            Logger.getInstance().debug(__filename, 'getInstance()', 'Instantiating new instance of class.');
            this.instance = new MazeDao();
            this.instance.initConnection();
        }
        return this.instance;
    }

    private initConnection() {
        MongoClient.connect(Config.getInstance().MONGO_CONNSTR, {useNewUrlParser: true}, function(err, client) {
            let config: Config = Config.getInstance();
            if (err) {
                Logger.getInstance().error(__filename, 'constructor()', `Error connecting to ${MazeDao.getInstance().config.MONGO_CONNSTR}`, err);
            }

            MazeDao.instance.mongoDBClient = client;
            MazeDao.instance.db = MazeDao.instance.mongoDBClient.db(config.MONGO_DB);
            MazeDao.instance.coll = MazeDao.instance.db.collection(config.MONGO_COL_MAZES);
        });
    }

    public getMazes() {
        if (this.coll) {
            let mazes: Cursor = this.coll.find();
            this.log.debug(__filename, 'getMazes()', `Returning  ${mazes.count}`);
            return mazes.toArray();
        } else {
            this.log.warn(__filename, 'getMazeCount()', 'Maze Collection is undefined.');
            return null;
        }
    }

    /**
     * Close the database connection.
     */
    public disconnect() {
        if (this.mongoDBClient) {
            this.mongoDBClient.close();
        }
    }
}

export default MazeDao;
