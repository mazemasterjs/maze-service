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
    /**
     * Initialize the database connection
     */
    initConnection() {
        this.log.debug(__filename, 'initConnection()', 'Initializing MongoDB Client connection');
        mongodb_1.MongoClient.connect(Config_1.Config.getInstance().MONGO_CONNSTR, { useNewUrlParser: true }, function (err, client) {
            let config = Config_1.Config.getInstance();
            let log = logger_1.Logger.getInstance();
            if (err) {
                log.error(__filename, 'initConnection()', `Error connecting to ${config.MONGO_CONNSTR} ->`, err);
            }
            else {
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
    countDocuments(collectionName) {
        this.log.debug(__filename, `countDocuments(${collectionName})`, 'Attempting to get document count.');
        if (this.db) {
            return this.db.collection(collectionName).countDocuments();
        }
        else {
            throw this.dataAccessFailure(`countDocuments(${collectionName})`);
        }
    }
    /**
     * Return all documents in the given collection (danger - not paged!)
     *
     * @param collectionName string
     */
    getAllDocuments(collectionName) {
        this.log.debug(__filename, `getAllDocuments(${collectionName})`, 'Attempting to get all documents in collection.');
        if (this.db) {
            return this.db.collection(collectionName).find();
        }
        else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }
    /**
     * Insert the given document into the specified collection
     *
     * @param collectionName string
     * @param doc any
     */
    insertDocument(collectionName, doc) {
        this.log.debug(__filename, `insertDocument(${doc})`, 'Attempting to insert document.');
        if (this.db) {
            return this.db.collection(collectionName).insertOne(doc);
        }
        else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }
    /**
     * Delete the document with the given ID from the specified collection
     *
     * @param collectionName string
     * @param id string
     */
    deleteDocument(collectionName, id) {
        this.log.debug(__filename, `deleteDocument(${id})`, 'Attempting to delete document.');
        if (this.db) {
            return this.db
                .collection(collectionName)
                .deleteOne({ id: id })
                .catch((err) => {
                this.log.error(__filename, 'deleteDocument()', 'Error while deleting document', err);
                return err;
            });
        }
        else {
            throw this.dataAccessFailure(`getAllDocuments(${collectionName})`);
        }
    }
    /**
     * Returns true of the db object is defined.
     */
    isConnected() {
        return this.db != undefined;
    }
    /**
     * Private function to handle internal db connection errors
     *
     * @param method string
     */
    dataAccessFailure(method) {
        let msg = 'MongoClient.Db is undefined.  Connection failure?';
        let err = new Error(msg);
        this.log.error(__filename, method, msg, err);
        return err;
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