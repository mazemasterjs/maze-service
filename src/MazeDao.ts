import {MongoClient, Db, Cursor, DeleteWriteOpResultObject, InsertOneWriteOpResult} from 'mongodb';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';

export class MazeDao {
    // get/declare static variables
    private static instance: MazeDao;
    private config: Config = Config.getInstance();
    private log: Logger = Logger.getInstance();

    // declare mongo classes
    private mongoDBClient: MongoClient | undefined;
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
        this.log.debug(__filename, 'initConnection()', 'Initializing MongoDB Client connection');
        MongoClient.connect(Config.getInstance().MONGO_CONNSTR, {useNewUrlParser: true}, function(err, client) {
            let config: Config = Config.getInstance();
            let log: Logger = Logger.getInstance();
            if (err) {
                log.error(__filename, 'initConnection()', `Error connecting to ${config.MONGO_CONNSTR} ->`, err);
            } else {
                log.debug(__filename, 'initConnection()', `MongoDB Client connection established to ${config.MONGO_CONNSTR}`);
                MazeDao.instance.mongoDBClient = client;
                MazeDao.instance.db = MazeDao.instance.mongoDBClient.db(config.MONGO_DB);
            }
        });
    }

    public countDocuments(collectionName: string): Promise<number> {
        this.log.debug(__filename, `countDocuments(${collectionName})`, 'Attempting to get document count.');

        if (this.db) {
            return this.db.collection(collectionName).countDocuments();
        } else {
            throw this.dataAccessFailure(`countDocuments(${collectionName})`);
        }
    }

    public getAllDocuments(collectionName: string): Cursor<any> {
        this.log.debug(__filename, `getAllDocuments(${collectionName})`, 'Attempting to get all documents in collection.');
        if (this.db) {
            return this.db.collection(collectionName).find();
        } else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }

    public insertDocument(collectionName: string, doc: any): Promise<InsertOneWriteOpResult> {
        this.log.debug(__filename, `insertDocument(${doc})`, 'Attempting to insert document.');

        if (this.db) {
            return this.db.collection(collectionName).insertOne(doc);
        } else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }

    public deleteDocument(collectionName: string, id: string): Promise<DeleteWriteOpResultObject> {
        this.log.debug(__filename, `deleteDocument(${id})`, 'Attempting to delete document.');

        if (this.db) {
            return this.db
                .collection(collectionName)
                .deleteOne({id: id})
                .catch((err) => {
                    this.log.error(__filename, 'deleteDocument()', 'Error while deleting document', err);
                    return err;
                });
        } else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }

    public isConnected(): boolean {
        return this.db != undefined;
    }

    private dataAccessFailure(method: string): Error {
        let msg: string = 'MongoClient.Db is undefined.  Connection failure?';
        let err: Error = new Error(msg);
        this.log.error(__filename, method, msg, err);
        return err;
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
