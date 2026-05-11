import { MongoClient, type Db } from "mongodb";

let _client: MongoClient | null = null;
let _db: Db | null = null;

// Connection pool tuned for FastAPI-equivalent concurrency. Mirrors the
// settings the upstream Python CRM uses (motor_client.maxPoolSize=50 etc).
const POOL = {
  maxPoolSize: 30,
  minPoolSize: 2,
  maxIdleTimeMS: 45_000,
  connectTimeoutMS: 5_000,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 60_000,
  retryReads: true,
};

function readEnv(): { uri: string; dbName: string } {
  const uri = process.env.MONGO_CONNECTION_STRING;
  const dbName = process.env.MONGO_DATABASE_NAME ?? "pre-sales-crm";
  if (!uri) {
    throw new Error(
      "MONGO_CONNECTION_STRING is not set. Add it to the api-server .env.",
    );
  }
  return { uri, dbName };
}

export async function getMongoClient(): Promise<MongoClient> {
  if (_client) return _client;
  const { uri } = readEnv();
  _client = new MongoClient(uri, POOL);
  await _client.connect();
  return _client;
}

export async function getMongoDb(): Promise<Db> {
  if (_db) return _db;
  const client = await getMongoClient();
  const { dbName } = readEnv();
  _db = client.db(dbName);
  return _db;
}

export async function closeMongo(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
  }
}
