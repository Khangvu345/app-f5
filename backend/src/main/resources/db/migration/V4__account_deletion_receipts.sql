-- The one-way receipt remains after account data and credentials are deleted.
CREATE TABLE account_deletion_receipts (
    secret_hash VARCHAR(64) PRIMARY KEY
);

ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
