import { Pool } from 'pg';
import { EventsData } from "./constants";
import { TreeType } from "./constants";

// Create a new pool instance with persistent settings
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        // For encrypted connections—if you want full TLS verification, uncomment these lines:
        // rejectUnauthorized: true,
        // ca: fs.readFileSync("path/to/rds-ca-2019-root.pem").toString(),
        rejectUnauthorized: false,
    },
    keepAlive: true,                // Keep the underlying TCP connection alive
    idleTimeoutMillis: 30000,       // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000,  // Fail if a new connection isn't established within 2000ms
});

// Listen for unexpected errors on idle clients and log them
pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
});

// Helper function that will retry queries if they fail transiently
async function queryWithRetry(
    query: string,
    params: any[] = [],
    retries = 3,
    delayMs = 1000
) {
    try {
        return await pool.query(query, params);
    } catch (error) {
        if (retries > 0) {
            console.error(
                `Query failed. Retrying in ${delayMs}ms... Attempts left: ${retries}`,
                error
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return queryWithRetry(query, params, retries - 1, delayMs);
        } else {
            console.error("Query failed after retries.", error);
            throw error;
        }
    }
}

interface LastEventData {
    blockNumber: number;
    index: number;
    commitment: string;
}

/// @notice retrieve the event with the highest index from the db and return the block number
export async function getLastEventFromDB(type: TreeType): Promise<LastEventData | null> {
    try {
        const tableName = type === 'dsc' ? 'dsc_key_commitment_events' : 'identity_commitment_events';
        const query = `
            SELECT 
                blockNumber,
                index,
                commitment
            FROM ${tableName}
            ORDER BY index DESC 
            LIMIT 1
        `;

        const result = await queryWithRetry(query);
        if (result.rows.length === 0) return null;

        return {
            blockNumber: result.rows[0].blockNumber,
            index: result.rows[0].index,
            commitment: result.rows[0].commitment
        };
    } catch (error) {
        console.error('Error getting last event:', error);
        return null;
    }
}

/// @notice add the events to the db, be careful this app will could try to overwrite the events
export async function addEventsInDB(type: TreeType, events: EventsData[]) {
    try {
        const tableName = type === 'dsc' ? 'dsc_key_commitment_events' : 'identity_commitment_events';
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const event of events) {
                const query = `
                    INSERT INTO ${tableName} (
                        index,
                        commitment,
                        blockNumber
                    )
                    VALUES ($1, $2, $3)
                    ON CONFLICT (index) DO NOTHING
                `;

                await client.query(query, [
                    event.index,
                    event.commitment,
                    event.blockNumber
                ]);
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            console.error('Error in transaction:', error);
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error in addEventsInDB:', error);
        return false;
    }
}

/// @notice retrieve the tree from the db
export async function getTreeFromDB(type: TreeType) {
    try {
        const tableName = type === 'dsc' ? 'dsc_key_commitment_tree' : 'identity_commitment_tree';
        // Since there's at most one row in these tables, no ORDER BY is needed.
        const query = `SELECT tree FROM ${tableName} LIMIT 1`;
        const result = await queryWithRetry(query);

        if (result.rows.length === 0) return null;
        return result.rows[0].tree;
    } catch (error) {
        console.error(`Error getting ${type} tree:`, error);
        return null;
    }
}

/// @notice set the tree in the db
export async function setTreeInDB(type: TreeType, tree: string) {
    try {
        const tableName = type === 'dsc' ? 'dsc_key_commitment_tree' : 'identity_commitment_tree';
        // First, try to update an existing row
        const updateResult = await queryWithRetry(`UPDATE ${tableName} SET tree = $1;`, [tree]);
        if (updateResult.rowCount === 0) {
            // If no row exists, insert one
            await queryWithRetry(`INSERT INTO ${tableName} (tree) VALUES ($1);`, [tree]);
        }
        return true;
    } catch (error) {
        console.error(`Error setting ${type} tree:`, error);
        return false;
    }
}

// Add this function to periodically ping the DB
function startKeepAlive(intervalMs: number = 5 * 60 * 1000) { // default every 5 minutes
    setInterval(async () => {
        try {
            await queryWithRetry("SELECT 1");
            console.log('Database ping successful');
        } catch (error) {
            console.error('Database ping failed', error);
        }
    }, intervalMs);
}

// Start the keep-alive when your module initializes
startKeepAlive();

