-- WildAtlas Database Schema

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for easy re-runs)
DROP TABLE IF EXISTS animals;
DROP TABLE IF EXISTS forests;

-- Create Forests Table
CREATE TABLE forests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  country VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  boundary JSONB, -- GeoJSON feature/geometry for Leaflet boundary highlight
  description TEXT NOT NULL,
  area VARCHAR(100),
  climate VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Animals Table (Includes Animals, Birds, and Reptiles)
CREATE TABLE animals (
  id SERIAL PRIMARY KEY,
  forest_id INTEGER REFERENCES forests(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('animal', 'bird', 'reptile')),
  image_url TEXT,
  habitat TEXT,
  diet TEXT,
  behaviour TEXT,
  lifespan VARCHAR(100),
  conservation_status VARCHAR(100),
  interesting_facts TEXT[], -- String array for facts
  distribution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_forests_name ON forests(name);
CREATE INDEX idx_forests_country ON forests(country);
CREATE INDEX idx_forests_state ON forests(state);
CREATE INDEX idx_animals_forest ON animals(forest_id);
CREATE INDEX idx_animals_type ON animals(type);
