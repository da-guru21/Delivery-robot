-- SQL to create simulations table
CREATE TABLE IF NOT EXISTS simulations (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  initial_parcels INTEGER,
  turns INTEGER,
  pickups JSONB,
  deliveries JSONB,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
