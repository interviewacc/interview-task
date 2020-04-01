import {MongoClient} from "mongodb";

export default function (): Promise<MongoClient> {
    // Should be retrieved from configuration
    return MongoClient.connect('mongodb://localhost:27017')
}