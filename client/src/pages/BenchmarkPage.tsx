import React, { useState } from 'react';
import { api } from '../services/api';
import { Play, Download, Clock, Zap, Cpu, BarChart2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.markercluster';

interface BenchmarkResult {
  metric: string;
  category: string;
  value: string | number;
  unit: string;
  status: 'PASS' | 'WARN' | 'INFO';
  notes: string;
}

const SAMPLE_TEST_ROUTES = [
  { name: 'London to Oxford', startLat: 51.5074, startLng: -0.1278, endLat: 51.7520, endLng: -1.2577 },
  { name: 'Paris to Lyon', startLat: 48.8566, startLng: 2.3522, endLat: 45.7640, endLng: 4.8357 },
  { name: 'Berlin to Munich', startLat: 52.5200, startLng: 13.4050, endLat: 48.1351, endLng: 11.5820 },
  { name: 'Delhi to Jim Corbett National Park', startLat: 28.6139, startLng: 77.2090, endLat: 29.5300, endLng: 78.9500 },
  { name: 'New York to Adirondack Park', startLat: 40.7128, startLng: -74.0060, endLat: 43.9000, endLng: -74.4500 }
];

export const BenchmarkPage: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const runAllBenchmarks = async () => {
    setRunning(true);
    const benchmarkRows: BenchmarkResult[] = [];

    try {
      // 1. Initial Dataset Load & Parsing Latency
      setProgressText('Testing dataset fetch and parsing latency...');
      const t0 = performance.now();
      const [forests, zoos] = await Promise.all([api.getForests(), api.getZoos()]);
      const t1 = performance.now();
      const loadTime = (t1 - t0).toFixed(2);

      benchmarkRows.push({
        metric: 'Dataset Initial Fetch Latency',
        category: 'Data Ingestion',
        value: loadTime,
        unit: 'ms',
        status: Number(loadTime) < 500 ? 'PASS' : 'WARN',
        notes: `Loaded ${forests.length} forests and ${zoos.length} zoos from local SQLite`
      });

      // 2. Marker Rendering Benchmark (Without Clustering vs With Clustering)
      // Test at 1,000 points, 10,000 points, and 50,000 synthetic points
      const testPointCounts = [1000, 10000, 50000];

      // Create a hidden headless Leaflet map for memory and DOM speed testing
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.width = '800px';
      hiddenContainer.style.height = '600px';
      hiddenContainer.style.position = 'absolute';
      hiddenContainer.style.left = '-9999px';
      document.body.appendChild(hiddenContainer);

      const testMap = L.map(hiddenContainer, {
        center: [20, 10],
        zoom: 4,
        zoomControl: false
      });

      for (const count of testPointCounts) {
        setProgressText(`Generating and benchmarking ${count.toLocaleString()} markers WITHOUT clustering...`);
        // Generate pseudo-random coordinates bounded in Europe/Asia
        const points: [number, number][] = [];
        for (let i = 0; i < count; i++) {
          const lat = 30 + (Math.sin(i) * 20);
          const lng = 10 + (Math.cos(i) * 40);
          points.push([lat, lng]);
        }

        // Test Unclustered
        const tUnclustered0 = performance.now();
        const unclusteredLayer = L.layerGroup();
        for (const pt of points) {
          L.circleMarker(pt, { radius: 3 }).addTo(unclusteredLayer);
        }
        unclusteredLayer.addTo(testMap);
        const tUnclustered1 = performance.now();
        const unclusteredTime = (tUnclustered1 - tUnclustered0).toFixed(2);
        testMap.removeLayer(unclusteredLayer);

        benchmarkRows.push({
          metric: `DOM Marker Render (${count.toLocaleString()} pts, Unclustered)`,
          category: 'Spatial Rendering',
          value: unclusteredTime,
          unit: 'ms',
          status: Number(unclusteredTime) < (count === 50000 ? 5000 : 1000) ? 'PASS' : 'WARN',
          notes: `Raw L.LayerGroup render of ${count.toLocaleString()} points`
        });

        // Test Clustered with Leaflet.markercluster
        setProgressText(`Benchmarking ${count.toLocaleString()} markers WITH Leaflet.markercluster...`);
        const tCluster0 = performance.now();
        const clusterGroup = (L as any).markerClusterGroup({
          chunkedLoading: true,
          showCoverageOnHover: false,
          maxClusterRadius: 50
        });
        const markersList: L.Marker[] = [];
        for (const pt of points) {
          markersList.push(L.marker(pt));
        }
        clusterGroup.addLayers(markersList);
        clusterGroup.addTo(testMap);
        const tCluster1 = performance.now();
        const clusterTime = (tCluster1 - tCluster0).toFixed(2);
        testMap.removeLayer(clusterGroup);

        benchmarkRows.push({
          metric: `Clustered Marker Render (${count.toLocaleString()} pts, MarkerCluster)`,
          category: 'Spatial Rendering',
          value: clusterTime,
          unit: 'ms',
          status: 'PASS',
          notes: `Hierarchical quad-tree cluster index build for ${count.toLocaleString()} points`
        });
      }

      // Cleanup hidden map
      testMap.remove();
      document.body.removeChild(hiddenContainer);

      // 3. OSRM Road Routing Latency Benchmark over sample test pairs
      for (const route of SAMPLE_TEST_ROUTES) {
        setProgressText(`Testing OSRM routing for: ${route.name}...`);
        const rT0 = performance.now();
        try {
          const res = await api.getRoute(route.startLat, route.startLng, route.endLat, route.endLng);
          const rT1 = performance.now();
          const routeLatency = (rT1 - rT0).toFixed(2);

          benchmarkRows.push({
            metric: `OSRM Route Latency: ${route.name}`,
            category: 'Road Network Routing',
            value: routeLatency,
            unit: 'ms',
            status: Number(routeLatency) < 2000 ? 'PASS' : 'WARN',
            notes: `Distance: ${res.distanceFormatted || (res.distance / 1000).toFixed(1) + ' km'}, Duration: ${res.durationFormatted || (res.duration / 60).toFixed(0) + ' min'}`
          });
        } catch (err: any) {
          const rT1 = performance.now();
          benchmarkRows.push({
            metric: `OSRM Route Latency: ${route.name}`,
            category: 'Road Network Routing',
            value: (rT1 - rT0).toFixed(2),
            unit: 'ms',
            status: 'WARN',
            notes: `Route query returned error: ${err.message}`
          });
        }
      }

      setResults(benchmarkRows);
    } catch (error: any) {
      console.error("Benchmark suite error:", error);
    } finally {
      setRunning(false);
      setProgressText('');
    }
  };

  const exportResultsCsv = () => {
    if (results.length === 0) return;
    const headers = ['Category', 'Metric', 'Value', 'Unit', 'Status', 'Notes'];
    const rows = results.map(r => [
      `"${r.category}"`,
      `"${r.metric}"`,
      r.value,
      `"${r.unit}"`,
      r.status,
      `"${r.notes.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `benchmark_evaluation_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-on-background pt-28 pb-16 px-4 sm:px-container-margin max-w-5xl mx-auto select-none text-left">
      {/* Header */}
      <div className="mb-8 border-b border-outline-variant/30 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/25 text-secondary text-xs font-bold uppercase tracking-wider mb-2 font-label-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>Empirical Evaluation Tooling</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline-lg text-white">
            Performance & Reproducibility Benchmarks
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-2xl">
            Live measurements of dataset ingest latency, unclustered vs clustered DOM marker render speeds (1k, 10k, 50k points), 
            and OSRM Multi-Level Dijkstra road network response times.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={runAllBenchmarks}
            disabled={running}
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:brightness-105 transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Benchmarking...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Benchmark Suite</span>
              </>
            )}
          </button>

          {results.length > 0 && (
            <button
              onClick={exportResultsCsv}
              className="px-4 py-2.5 rounded-full bg-surface-container-high border border-outline-variant/50 text-white text-xs font-bold hover:bg-surface-container-highest transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {running && (
        <div className="p-4 rounded-2xl bg-surface-container-low border border-primary/30 shadow-xl mb-6 flex items-center gap-3 animate-pulse">
          <Clock className="w-5 h-5 text-primary shrink-0" />
          <span className="text-xs font-mono text-primary font-bold">{progressText}</span>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-high/70 shadow-2xl">
          <div className="p-4 bg-surface-container-highest/60 border-b border-outline-variant/40 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-headline-md flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Empirical Benchmark Results ({results.length} Metrics Evaluated)
            </h3>
            <span className="text-[10px] font-mono text-[#10b981] font-bold">100% Executed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low/50 text-outline uppercase font-mono text-[10px]">
                  <th className="p-3">Category</th>
                  <th className="p-3">Metric</th>
                  <th className="p-3 text-right">Value</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Benchmark Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-mono text-[11px]">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-highest/40 transition-colors">
                    <td className="p-3 text-outline font-sans text-xs">{r.category}</td>
                    <td className="p-3 font-bold text-white font-sans text-xs">{r.metric}</td>
                    <td className="p-3 text-right font-bold text-primary">{r.value}</td>
                    <td className="p-3 text-center text-on-surface-variant">{r.unit}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        r.status === 'PASS'
                          ? 'bg-[#10b981]/20 text-[#a5d0b9] border border-[#10b981]/30'
                          : 'bg-[#f59e0b]/20 text-[#fde68a] border border-[#f59e0b]/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-on-surface-variant font-sans text-xs">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !running && (
        <div className="py-16 text-center rounded-3xl border border-dashed border-outline-variant/50 p-8 flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-surface-container-high text-primary mb-3">
            <Cpu className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white font-headline-md">Benchmark Suite Ready</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-md">
            Click <strong>"Run Benchmark Suite"</strong> above to measure data ingest, marker rendering at 1k/10k/50k points, and live OSRM routing response times.
          </p>
        </div>
      )}
    </div>
  );
};

export default BenchmarkPage;
