import {MongoClient, Db, Cursor, DeleteWriteOpResultObject, InsertOneWriteOpResult, UpdateWriteOpResult} from 'mongodb';
import {Config} from '@mazemasterjs/shared-library/Config';
import {Logger} from '@mazemasterjs/logger';
import {rejects} from 'assert';

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

    /**
     * Initialize the database connection
     */
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

    /**
     * Return the document count of the given collection
     *
     * @param collectionName string
     */
    public countDocuments(collectionName: string): Promise<number> {
        this.log.debug(__filename, `countDocuments(${collectionName})`, 'Attempting to get document count.');

        if (this.db) {
            return this.db.collection(collectionName).countDocuments();
        } else {
            throw this.dataAccessFailure(`countDocuments(${collectionName})`);
        }
    }

    /**
     * Return all documents in the given collection (danger - not paged!)
     *
     * @param collectionName string
     */
    public getAllDocuments(collectionName: string): Cursor<any> {
        this.log.debug(__filename, `getAllDocuments(${collectionName})`, 'Attempting to get all documents in collection.');
        if (this.db) {
            return this.db.collection(collectionName).find();
        } else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }

    /**
     * Return all documents in the given collection (danger - not paged!)
     *
     * @param collectionName string
     */
    public getDocument(collectionName: string, docId: string): Promise<any> {
        this.log.debug(__filename, `getDocument(${collectionName}, ${docId})`, 'Searching for document.');
        if (this.db) {
            return this.db.collection(collectionName).findOne({id: docId});
        } else {
            throw this.dataAccessFailure(`getDocument(${collectionName},  ${docId})`);
        }
    }

    /**
     * Update the document with the given docId with the given document data
     *
     * @param collectionName string
     * @param docId string
     * @param doc <any>
     */
    public updateDocument(collectionName: string, docId: string, doc: any): Promise<UpdateWriteOpResult> {
        let method = `updateDocument(${collectionName}, ${docId}, ${doc})`;
        this.log.debug(__filename, method, 'Attempting to update document.');

        if (this.db) {
            return this.db
                .collection(collectionName)
                .updateOne({id: docId}, doc, {upsert: false})
                .catch((err) => {
                    this.log.error(__filename, method, 'Error while updating document -> ', err);
                    return err;
                });
        } else {
            throw this.dataAccessFailure(method);
        }
    }

    /**
     * Insert the given document into the specified collection
     *
     * @param collectionName string
     * @param doc any
     */
    public insertDocument(collectionName: string, doc: any): Promise<InsertOneWriteOpResult> {
        let method = `insertDocument(${collectionName}, ${doc})`;
        this.log.debug(__filename, method, 'Attempting to insert document.');

        if (this.db) {
            return this.db
                .collection(collectionName)
                .insertOne(doc)
                .catch((err) => {
                    this.log.error(__filename, method, 'Error while inserting document -> ', err);
                    return err;
                });
        } else {
            throw this.dataAccessFailure(method);
        }
    }

    /**
     * Delete the document with the given ID from the specified collection
     *
     * @param collectionName string
     * @param id string
     */
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

    /**
     * Returns true of the db object is defined.
     */
    public isConnected(): boolean {
        return this.db != undefined;
    }

    /**
     * Private function to handle internal db connection errors
     *
     * @param method string
     */
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
