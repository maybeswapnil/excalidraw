import { MongoClient } from "mongodb";

import type { Db } from "mongodb";

let mongoClient: MongoClient | null = null;
let db: Db | null = null;

const getMongoDb = async (): Promise<Db> => {
  if (!db) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable not set");
    }

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db("excalidraw");

    // Create indexes
    const canvasCollection = db.collection("canvas");
    await canvasCollection.createIndex({ clientId: 1, timestamp: -1 });

    const filesCollection = db.collection("files");
    await filesCollection.createIndex({ fileId: 1 });
  }

  return db;
};

export const closeMongoDb = async () => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
  }
};

export default getMongoDb;
