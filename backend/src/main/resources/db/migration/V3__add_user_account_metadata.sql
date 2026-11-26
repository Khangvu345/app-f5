-- Extend the existing account table while retaining the V1/V2 data and API fields.
-- Authentication, account status and role enforcement are implemented separately.
ALTER TABLE users
    ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    ADD COLUMN provider_subject VARCHAR(255),
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD CONSTRAINT users_auth_provider_check CHECK (auth_provider IN ('EMAIL', 'GOOGLE', 'APPLE')),
    ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN')),
    ADD CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'DISABLED', 'DELETED')),
    ADD CONSTRAINT users_provider_subject_unique UNIQUE (auth_provider, provider_subject);
