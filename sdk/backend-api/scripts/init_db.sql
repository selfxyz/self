-- Create DSC key commitment events table
CREATE TABLE IF NOT EXISTS dsc_key_commitment_events (
    index INTEGER PRIMARY KEY,
    commitment TEXT NOT NULL,
    blockNumber INTEGER NOT NULL
);

-- Create identity commitment events table
CREATE TABLE IF NOT EXISTS identity_commitment_events (
    index INTEGER PRIMARY KEY,
    commitment TEXT NOT NULL,
    blockNumber INTEGER NOT NULL
);

-- Create DSC key commitment tree table
CREATE TABLE IF NOT EXISTS dsc_key_commitment_tree (
    tree TEXT NOT NULL
);

-- Create identity commitment tree table
CREATE TABLE IF NOT EXISTS identity_commitment_tree (
    tree TEXT NOT NULL
);