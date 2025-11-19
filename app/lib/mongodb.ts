import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env');
}

const uri: string = process.env.MONGODB_URI;
const options = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the client is not recreated on hot reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('video_marketing_db');
}

// Collection names
export const Collections = {
  CAMPAIGNS: 'campaigns',
  PERSONAS: 'personas',
  VIDEOS: 'videos',
  VIDEO_UNDERSTANDINGS: 'video_understandings',
  LLM_MODELS: 'llm_models',
  MARKETING_SIMULATION_RESULTS: 'marketing_simulation_results',
  MARKETING_SIMULATION_SUMMARIES: 'marketing_simulation_summaries',
  FEEDBACKS: 'feedbacks',
  SYNTHESIS_VIDEOS: 'synthesis_videos',
} as const;

// Initialize collections (creates them if they don't exist)
export async function initializeCollections() {
  const db = await getDatabase();

  // Create collections if they don't exist
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(col => col.name);

  for (const collectionName of Object.values(Collections)) {
    if (!existingNames.includes(collectionName)) {
      await db.createCollection(collectionName);
      console.log(`Created collection: ${collectionName}`);
    }
  }

  // Create indexes for better performance (using snake_case to match MongoDB)
  await db.collection(Collections.CAMPAIGNS).createIndex({ created_at: -1 });
  await db.collection(Collections.PERSONAS).createIndex({ campaign_id: 1 });
  await db.collection(Collections.VIDEOS).createIndex({ campaign_id: 1 });
  await db.collection(Collections.VIDEO_UNDERSTANDINGS).createIndex({ campaign_id: 1 });
  await db.collection(Collections.LLM_MODELS).createIndex({ provider: 1, model_name: 1 });
  await db.collection(Collections.MARKETING_SIMULATION_RESULTS).createIndex({ persona_id: 1 });
  await db.collection(Collections.FEEDBACKS).createIndex({ campaign_id: 1 });
  await db.collection(Collections.SYNTHESIS_VIDEOS).createIndex({ campaign_id: 1 });

  console.log('MongoDB collections initialized');
}
