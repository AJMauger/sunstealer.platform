import * as mongodb from "mongodb";
import { _configuration, _logger } from "../index";

export class MongoDB {
  public client: mongodb.MongoClient | null = null;
  public databaseName: string | null = null;
  public database: mongodb.Db | null  = null;
  public uri: string | null  = null;

  // ajm: ---------------------------------------------------------------------
  public constructor() {
    // ajm:
  }

  // ajm: ---------------------------------------------------------------------
  public async Connect(uri: string, databaseName: string): Promise<boolean> {
    try {
      _logger.LogDebug(`MongoDB: Connect(${uri}, ${databaseName})`);
      this.databaseName = databaseName;
      this.uri = uri;
      this.client = await mongodb.MongoClient.connect(uri);
      if (this.client) {
        this.database = this.client.db(this.databaseName);
        _logger.LogDebug(`MongoDB: Connect(${uri}, database: ${this.database.databaseName})`);  
        return true;
      } else {
        _logger.LogError(`MongoDB: Connect(${uri}`);  
      }
    } catch (e) {
    _logger.LogException(e);
    }
    return false;
  }

  // ajm: ---------------------------------------------------------------------
  public async DeleteAll(collectionName: string): Promise<any> {
    try {
      // ajm: _logger.LogDebug(`MongoDB: DeleteAll(${collectionName})`);
      const collection = this.database?.collection(collectionName);
      const result: mongodb.DeleteResult | undefined= await collection?.deleteMany({});
      return result;
    } catch (e) {
      _logger.LogException(e);
    }
    return null;
  }

  // ajm: ---------------------------------------------------------------------
  public async DeleteOne(collectionName: string, criteria: any): Promise<any> {
    try {
      // ajm: _logger.LogDebug(`MongoDB: DeleteOne(${collectionName}, ${JSON.stringify(criteria)})`);
      const collection = this.database?.collection(collectionName);
      const result: mongodb.DeleteResult | undefined= await collection?.deleteOne(criteria);
      return result;
    } catch (e) {
      _logger.LogException(e);
    }
    return null;
  }

  // ajm: ---------------------------------------------------------------------
  public Disconnent(): boolean {
    try {
      _logger.LogDebug(`MongoDB: Disonnect()`);
      this.client?.close();
      return true;
    } catch (e) {
      _logger.LogException(e);
    }
    return false;
  }

  // ajm: ---------------------------------------------------------------------
  public async Insert(collectionName: string, value: any): Promise<any> {
    try {
      // ajm: _logger.LogDebug(`MongoDB: Insert(${collectionName}, ${JSON.stringify(value)})`);
      const collection = this.database?.collection(collectionName);
      if (Array.isArray(value)) {
        const result: mongodb.InsertManyResult | undefined = await collection?.insertMany(value);
        return result;
      } else {
        const result: mongodb.InsertOneResult | undefined = await collection?.insertOne(value);
        return result;
      }
    } catch (e) {
      _logger.LogException(e);
    }
    return null;
  }

  // ajm: ---------------------------------------------------------------------
  public async Select(collectionName: string, criteria: any): Promise<any> {
    try {
      // ajm: _logger.LogDebug(`MongoDB: Select(${collectionName}, ${JSON.stringify(criteria)})`);
      const collection = this.database?.collection(collectionName);
      const result: mongodb.WithId<mongodb.Document>[] | undefined = await collection?.find(criteria).toArray();
      return result;
    } catch (e) {
      _logger.LogException(e);
    }
    return null;
  }

  // ajm: ---------------------------------------------------------------------
  public async Update(collectionName: string, criteria: any, value: any): Promise<any> {
    try {
      // ajm: _logger.LogDebug(`MongoDB: Insert(${collectionName}, ${JSON.stringify(criteria)}, ${JSON.stringify(value)})`);
      const collection = this.database?.collection(collectionName);
      const result: mongodb.UpdateResult | undefined = await collection?.updateOne(criteria, { $set: value });
      return result;
    } catch (e) {
      _logger.LogException(e);
    }
    return null;
  }
}
