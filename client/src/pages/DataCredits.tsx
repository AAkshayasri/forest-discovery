import React from 'react';
import metadata from '../data/dataset_metadata.json';
import { Database, ShieldCheck, Layers, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DataCredits: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-on-background pt-28 pb-16 px-4 sm:px-container-margin max-w-5xl mx-auto select-none text-left">
      {/* Header */}
      <div className="mb-8 border-b border-outline-variant/30 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider mb-3 font-label-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>IEEE Reproducibility & Citation Index</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-headline-lg text-white">
          Data Sources, Licenses & Citations
        </h1>
        <p className="text-sm text-on-surface-variant mt-2 max-w-3xl leading-relaxed">
          WildAtlas is engineered for scientific research reproducibility and open-source geospatial transparency. 
          All geospatial features, road network topologies, protected boundary geometries, and species taxonomy 
          are attributed under their respective open database licenses.
        </p>
      </div>

      {/* 1. Datasets Grid */}
      <div className="mb-10">
        <h2 className="text-xl font-bold font-headline-md text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Primary Scientific Datasets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metadata.datasets.map((ds) => (
            <div
              key={ds.id}
              className="p-5 rounded-2xl bg-surface-container-high/70 border border-outline-variant/40 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                    {ds.license}
                  </span>
                  <span className="text-[10px] font-mono text-outline">{ds.lastUpdated}</span>
                </div>
                <h3 className="text-base font-bold text-white font-headline-md leading-tight mb-2">
                  {ds.name}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                  {ds.description}
                </p>
              </div>

              <div className="pt-3 border-t border-outline-variant/30 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Source:</span>
                  <span className="text-white font-bold truncate max-w-[170px]">{ds.source}</span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Record Count:</span>
                  <span className="text-[#10b981] font-bold">{ds.totalRecords.toLocaleString()} verified</span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>CRS:</span>
                  <span className="text-white">{ds.coordinateSystem || 'WGS 84 (EPSG:4326)'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Map Tiles & Cartography */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-headline-md text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-secondary" />
            Basemaps & Tile Services
          </h2>
          <span className="text-xs font-mono text-outline">
            Provider Access Date: <strong className="text-white">{metadata.system.tileProviderAccessDate || '2026-10-02'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metadata.basemaps.map((tile: any) => (
            <div
              key={tile.id}
              className="p-5 rounded-2xl bg-surface-container-high/70 border border-outline-variant/40 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-mono font-bold uppercase">
                    {tile.isPrimary ? 'Primary Basemap' : 'Fallback Basemap'}
                  </span>
                  <span className="text-[10px] font-mono text-outline">{tile.license}</span>
                </div>
                <h3 className="text-base font-bold text-white font-headline-md mb-1.5">
                  {tile.name}
                </h3>
                {tile.description && (
                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                    {tile.description}
                  </p>
                )}
                <p className="text-xs font-mono text-on-surface-variant break-all bg-black/40 p-2 rounded-lg border border-white/5 mb-3">
                  {tile.url}
                </p>
              </div>

              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Attribution: {tile.attribution}</span>
                <a
                  href={tile.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  License <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/30 text-xs text-on-surface-variant leading-relaxed">
          <strong className="text-white">Note for IEEE Paper & Production Deployments:</strong> The public OpenStreetMap raster server is configured for local development and lightweight emergency fallback only. For production deployments and scientific benchmarking, a dedicated self-hosted tile source (e.g. OpenMapTiles / TileServer GL) should be configured via <code className="text-primary font-mono text-[11px]">VITE_MAP_STYLE_URL</code> or <code className="text-primary font-mono text-[11px]">VITE_TILE_URL_FALLBACK</code>.
        </div>
      </div>

      {/* 3. Open Source Engine Libraries */}
      <div className="mb-10">
        <h2 className="text-xl font-bold font-headline-md text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-tertiary" />
          Core Computational Libraries & Engines
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metadata.libraries.map((lib) => (
            <div
              key={lib.name}
              className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline-variant/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-bold text-white font-headline-md">{lib.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#c1c8c2]">
                    v{lib.version}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mb-3">{lib.role}</p>
              </div>

              <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-[11px]">
                <span className="text-outline font-mono">{lib.license}</span>
                <a
                  href={lib.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View License <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Reproducibility Notice for IEEE Paper */}
      <div className="p-6 rounded-3xl bg-surface-container-low border border-primary/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#10b981] text-xs font-bold uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Full Docker Reproducibility Bundle</span>
            </div>
            <h3 className="text-lg font-bold text-white font-headline-md">
              Self-Hosted OSRM & Evaluation Scripts
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
              All benchmarks, latency tests, coordinate integrity validations, and route calculations can be 
              re-executed using the provided Dockerfile and docker-compose deployment configuration.
            </p>
          </div>

          <Link
            to="/map"
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:brightness-105 transition-all shadow-lg shrink-0"
          >
            Launch Map Explorer
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DataCredits;
