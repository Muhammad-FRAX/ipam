-- 07-config-cleanup.sql
-- Task 4.5: Fix any existing double-encoded JSONB values in the configurations table.
--
-- The original config.service.ts was doing JSON.stringify(value) before passing
-- to the parameterized query against a JSONB column, causing the pg driver to
-- serialize the string again, resulting in a JSON-quoted-string stored instead
-- of the actual JSONB object/array.
--
-- This migration unwraps one layer of string encoding for any row where the
-- stored value is a JSON string rather than a proper JSON object or array.
-- Safe to run multiple times (the WHERE clause is a no-op when data is clean).

UPDATE configurations
SET value = (value #>> '{}')::jsonb
WHERE jsonb_typeof(value) = 'string';
