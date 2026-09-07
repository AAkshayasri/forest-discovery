import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ShieldAlert, LayoutDashboard, Trash2, 
  Users, MessageSquare, Trees, Layers, 
  PlusCircle, Loader2, ScanEye, Building2,
  CheckCircle2, AlertTriangle, XCircle, Activity,
  ShieldCheck, Plus, Edit3, Search, CheckSquare, Square, X
} from 'lucide-react';
import { Button } from '../components/common/Button';

interface AdminDashboardData {
  counts: {
    totalUsers: number;
    totalForests: number;
    totalWildlife: number;
    totalZoos: number;
    totalChats: number;
    totalSightings: number;
  };
  sightingsBreakdown: {
    pending: number;
    verified: number;
    flagged: number;
    total: number;
  };
  recentUsers: any[];
  recentActivity: any[];
  systemHealth: {
    database: string;
    geminiAI: string;
    mapService: string;
  };
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'forests' | 'wildlife' | 'zoos' | 'sightings' | 'logs'>('overview');
  
  // Data states
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [forests, setForests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [zoos, setZoos] = useState<any[]>([]);
  const [sightings, setSightings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [forestSearch, setForestSearch] = useState('');
  const [wildlifeSearch, setWildlifeSearch] = useState('');
  const [zooSearch, setZooSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [sightingsSearch, setSightingsSearch] = useState('');
  const [sightingsStatusFilter, setSightingsStatusFilter] = useState<'all' | 'pending' | 'verified' | 'flagged'>('all');
  const [selectedSightingIds, setSelectedSightingIds] = useState<number[]>([]);

  // Forest Form States
  const [forestName, setForestName] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [area, setArea] = useState('');
  const [climate, setClimate] = useState('');
  const [forestDesc, setForestDesc] = useState('');

  // Forest Edit State
  const [editingForest, setEditingForest] = useState<any | null>(null);
  const [editForestForm, setEditForestForm] = useState({
    name: '',
    country: '',
    state: '',
    latitude: '',
    longitude: '',
    area: '',
    climate: '',
    description: ''
  });

  // Wildlife Form States
  const [selectedForestId, setSelectedForestId] = useState('');
  const [animalName, setAnimalName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [type, setType] = useState<'animal' | 'bird' | 'reptile'>('animal');
  const [imageUrl, setImageUrl] = useState('');
  const [habitat, setHabitat] = useState('');
  const [diet, setDiet] = useState('');
  const [behaviour, setBehaviour] = useState('');
  const [lifespan, setLifespan] = useState('');
  const [status, setStatus] = useState('Least Concern');
  const [factsInput, setFactsInput] = useState('');
  const [distribution, setDistribution] = useState('');

  // Wildlife Directory & Edit State
  const [selectedForestForWildlife, setSelectedForestForWildlife] = useState('');
  const [forestWildlifeList, setForestWildlifeList] = useState<any[]>([]);
  const [loadingForestWildlife, setLoadingForestWildlife] = useState(false);
  const [editingWildlife, setEditingWildlife] = useState<any | null>(null);
  const [editWildlifeForm, setEditWildlifeForm] = useState({
    name: '',
    scientificName: '',
    type: 'animal' as 'animal' | 'bird' | 'reptile',
    imageUrl: '',
    habitat: '',
    diet: '',
    behaviour: '',
    lifespan: '',
    conservationStatus: 'Least Concern',
    distribution: '',
    factsInput: ''
  });

  // Zoo Form States
  const [zooName, setZooName] = useState('');
  const [zooCountry, setZooCountry] = useState('');
  const [zooLatitude, setZooLatitude] = useState('');
  const [zooLongitude, setZooLongitude] = useState('');
  const [zooNotable, setZooNotable] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load admin details
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, forestRes, userRes, chatRes, zooRes, sightingsRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getForests(),
        api.getUsers(),
        api.getChats(),
        api.getZoos(),
        api.getAdminSightings()
      ]);
      setDashboardData(dashRes);
      setForests(forestRes);
      setUsers(userRes);
      setChats(chatRes);
      setZoos(zooRes);
      setSightings(sightingsRes);

      if (!selectedForestForWildlife && forestRes.length > 0) {
        setSelectedForestForWildlife(forestRes[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to load admin dashboard monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadForestWildlife = async (forestId: string | number) => {
    if (!forestId) {
      setForestWildlifeList([]);
      return;
    }
    setLoadingForestWildlife(true);
    try {
      const data = await api.getForestWildlife(forestId);
      setForestWildlifeList(data);
    } catch (err) {
      console.error("Failed to load forest wildlife:", err);
    } finally {
      setLoadingForestWildlife(false);
    }
  };

  useEffect(() => {
    if (selectedForestForWildlife) {
      loadForestWildlife(selectedForestForWildlife);
    }
  }, [selectedForestForWildlife]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  // Flash messages helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // 1. Submit Forest Form
  const handleAddForest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name: forestName,
        country,
        state: stateName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description: forestDesc,
        area,
        climate
      };

      await api.addForest(payload);
      
      // Reset Form
      setForestName('');
      setCountry('');
      setStateName('');
      setLatitude('');
      setLongitude('');
      setArea('');
      setClimate('');
      setForestDesc('');
      
      triggerSuccess("Forest added to global atlas successfully!");
      loadAdminData();
    } catch (error: any) {
      triggerError(error.message || "Failed to add forest.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Forest Handlers
  const handleOpenEditForest = (f: any) => {
    setEditingForest(f);
    setEditForestForm({
      name: f.name || '',
      country: f.country || '',
      state: f.state || '',
      latitude: f.latitude?.toString() || '',
      longitude: f.longitude?.toString() || '',
      area: f.area || '',
      climate: f.climate || '',
      description: f.description || ''
    });
  };

  const handleUpdateForest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForest) return;
    setActionLoading(true);
    try {
      await api.updateForest(editingForest.id, {
        name: editForestForm.name,
        country: editForestForm.country,
        state: editForestForm.state,
        latitude: parseFloat(editForestForm.latitude),
        longitude: parseFloat(editForestForm.longitude),
        area: editForestForm.area,
        climate: editForestForm.climate,
        description: editForestForm.description
      });
      triggerSuccess("Forest profile updated successfully!");
      setEditingForest(null);
      loadAdminData();
    } catch (err: any) {
      triggerError(err.message || "Failed to update forest.");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Submit Wildlife Form
  const handleAddWildlife = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForestId) {
      triggerError("Please select a target forest database first.");
      return;
    }
    setActionLoading(true);

    try {
      const factsArray = factsInput
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const payload = {
        forestId: parseInt(selectedForestId),
        name: animalName,
        scientificName,
        type,
        imageUrl,
        habitat,
        diet,
        behaviour,
        lifespan,
        conservationStatus: status,
        interestingFacts: factsArray,
        distribution
      };

      await api.addWildlife(payload);

      // Reset Form
      setAnimalName('');
      setScientificName('');
      setImageUrl('');
      setHabitat('');
      setDiet('');
      setBehaviour('');
      setLifespan('');
      setFactsInput('');
      setDistribution('');

      triggerSuccess("Wildlife record indexed successfully!");
      loadAdminData();
      if (selectedForestForWildlife === selectedForestId) {
        loadForestWildlife(selectedForestId);
      }
    } catch (error: any) {
      triggerError(error.message || "Failed to add wildlife.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Wildlife Handlers
  const handleOpenEditWildlife = (w: any) => {
    setEditingWildlife(w);
    setEditWildlifeForm({
      name: w.name || '',
      scientificName: w.scientificName || '',
      type: w.type || 'animal',
      imageUrl: w.imageUrl || '',
      habitat: w.habitat || '',
      diet: w.diet || '',
      behaviour: w.behaviour || '',
      lifespan: w.lifespan || '',
      conservationStatus: w.conservationStatus || 'Least Concern',
      distribution: w.distribution || '',
      factsInput: Array.isArray(w.interestingFacts) ? w.interestingFacts.join('\n') : (w.interestingFacts || '')
    });
  };

  const handleUpdateWildlife = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWildlife) return;
    setActionLoading(true);
    try {
      const factsArray = editWildlifeForm.factsInput
        .split('\n')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      await api.updateWildlife(editingWildlife.id, {
        name: editWildlifeForm.name,
        scientificName: editWildlifeForm.scientificName,
        type: editWildlifeForm.type,
        imageUrl: editWildlifeForm.imageUrl,
        habitat: editWildlifeForm.habitat,
        diet: editWildlifeForm.diet,
        behaviour: editWildlifeForm.behaviour,
        lifespan: editWildlifeForm.lifespan,
        conservationStatus: editWildlifeForm.conservationStatus,
        distribution: editWildlifeForm.distribution,
        interestingFacts: factsArray
      });
      triggerSuccess("Wildlife record updated successfully!");
      setEditingWildlife(null);
      if (selectedForestForWildlife) {
        loadForestWildlife(selectedForestForWildlife);
      }
      loadAdminData();
    } catch (err: any) {
      triggerError(err.message || "Failed to update wildlife.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWildlife = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this wildlife profile?")) return;
    try {
      await api.deleteWildlife(id);
      triggerSuccess("Wildlife record removed.");
      if (selectedForestForWildlife) {
        loadForestWildlife(selectedForestForWildlife);
      }
      loadAdminData();
    } catch (error: any) {
      triggerError(error.message || "Failed to delete wildlife.");
    }
  };

  // 3. Delete Forest
  const handleDeleteForest = async (id: number) => {
    if (!window.confirm("Are you sure? Deleting this forest will remove all associated wildlife records!")) return;
    try {
      await api.deleteForest(id);
      triggerSuccess("Forest entry purged.");
      loadAdminData();
    } catch (error: any) {
      triggerError(error.message || "Deletion failed.");
    }
  };

  // 4. Submit Zoo Form
  const handleAddZoo = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name: zooName,
        country: zooCountry,
        latitude: parseFloat(zooLatitude),
        longitude: parseFloat(zooLongitude),
        notable_species: zooNotable
      };

      await api.addZoo(payload);

      setZooName('');
      setZooCountry('');
      setZooLatitude('');
      setZooLongitude('');
      setZooNotable('');

      triggerSuccess("Zoo / Conservation Center indexed successfully!");
      loadAdminData();
    } catch (error: any) {
      triggerError(error.message || "Failed to add zoo.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Delete Zoo
  const handleDeleteZoo = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this zoo?")) return;
    try {
      await api.deleteZoo(id);
      triggerSuccess("Zoo entry purged.");
      loadAdminData();
    } catch (error: any) {
      triggerError(error.message || "Zoo deletion failed.");
    }
  };

  // 7. Verify Sighting
  const handleVerifySighting = async (id: number, status: 'verified' | 'flagged') => {
    try {
      await api.verifySighting(id, status);
      triggerSuccess(`Sighting marked as ${status} successfully.`);
      loadAdminData();
    } catch (error: any) {
      triggerError(error.message || "Verification action failed.");
    }
  };

  // 8. Batch Moderation Handlers
  const toggleSelectSighting = (id: number) => {
    setSelectedSightingIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    const pendingIds = sightings.filter(s => s.status === 'pending').map(s => s.id);
    setSelectedSightingIds(pendingIds);
  };

  const handleClearSightingSelection = () => {
    setSelectedSightingIds([]);
  };

  const handleBatchModerate = async (status: 'verified' | 'flagged') => {
    if (selectedSightingIds.length === 0) return;
    setActionLoading(true);
    try {
      await api.batchVerifySightings(selectedSightingIds, status);
      triggerSuccess(`Successfully marked ${selectedSightingIds.length} sightings as ${status}.`);
      setSelectedSightingIds([]);
      loadAdminData();
    } catch (err: any) {
      triggerError(err.message || "Batch moderation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Security Gate: Ensure only Admins view
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-24 px-4 select-none font-body-md">
        <div className="glass-panel bg-surface-container-high/95 rounded-xl p-8 max-w-sm text-center border border-error-container/20 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-error mx-auto mb-4 animate-bounce" />
          <h2 className="font-display-lg text-xl font-bold text-on-surface">Access Restricted</h2>
          <p className="text-on-surface-variant text-xs mt-2 leading-relaxed font-body-md">
            The requested console is reserved for WildAtlas Administrators. Verify your privileges or sign in using administrative credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-8 select-none font-body-md text-left">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/45 pb-6 gap-4">
          <div>
            <h1 className="font-display-lg text-3xl font-bold text-on-background flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Admin Monitoring Console
            </h1>
            <p className="font-body-md text-xs text-on-surface-variant mt-1">
              Real-time system telemetry, citizen sightings moderation, content registry, and user access oversight.
            </p>
          </div>
          
          {/* Sub Navigation */}
          <div className="flex gap-1.5 p-1 bg-surface-container border border-outline-variant/45 rounded-lg self-start sm:self-center overflow-x-auto max-w-full">
            {(['overview', 'forests', 'wildlife', 'zoos', 'sightings', 'logs'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubTab(sub)}
                className={`px-3 py-1.5 text-xs font-bold rounded capitalize transition-all cursor-pointer font-label-sm whitespace-nowrap ${
                  activeSubTab === sub 
                    ? 'bg-primary text-on-primary shadow-md' 
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {sub === 'overview' ? 'Dashboard Overview' : sub === 'logs' ? 'Users & Logs' : sub}
              </button>
            ))}
          </div>
        </div>

        {/* Global Feedback banners */}
        {successMsg && (
          <div className="p-3 bg-primary-container/20 border border-primary/20 text-primary text-xs rounded-lg text-left animate-in fade-in font-label-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-error-container/20 border border-error/20 text-error text-xs rounded-lg text-left animate-in fade-in font-label-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        {/* Console Content Panels */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Syncing database state...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. OVERVIEW & MONITORING DASHBOARD */}
            {activeSubTab === 'overview' && dashboardData && (
              <div className="space-y-8">
                
                {/* 1. SYSTEM OVERVIEW: Real Database Counts */}
                <div className="space-y-3">
                  <h2 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-primary" /> System Overview Telemetry
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    
                    <div className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border-outline-variant/40 flex items-start justify-between">
                      <div>
                        <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Total Users</span>
                        <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">{dashboardData.counts.totalUsers}</span>
                      </div>
                      <Users className="w-4 h-4 text-primary" />
                    </div>

                    <div className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border-outline-variant/40 flex items-start justify-between">
                      <div>
                        <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Total Forests</span>
                        <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">{dashboardData.counts.totalForests}</span>
                      </div>
                      <Trees className="w-4 h-4 text-primary" />
                    </div>

                    <div className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border-outline-variant/40 flex items-start justify-between">
                      <div>
                        <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Wildlife Records</span>
                        <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">{dashboardData.counts.totalWildlife}</span>
                      </div>
                      <Layers className="w-4 h-4 text-secondary" />
                    </div>

                    <div className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border-outline-variant/40 flex items-start justify-between">
                      <div>
                        <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Total Zoos</span>
                        <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">{dashboardData.counts.totalZoos}</span>
                      </div>
                      <Building2 className="w-4 h-4 text-tertiary" />
                    </div>

                    <div className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border-outline-variant/40 flex items-start justify-between">
                      <div>
                        <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">AI Telemetry Chats</span>
                        <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">{dashboardData.counts.totalChats}</span>
                      </div>
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>

                    <div className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border-outline-variant/40 flex items-start justify-between">
                      <div>
                        <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Total Sightings</span>
                        <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">{dashboardData.counts.totalSightings}</span>
                      </div>
                      <ScanEye className="w-4 h-4 text-secondary" />
                    </div>

                  </div>
                </div>

                {/* 2. SIGHTING MONITORING (Action Center) & 5. CONTENT MONITORING */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Sighting Action Center */}
                  <div className="lg:col-span-7 glass-panel bg-surface-container-high/90 p-6 rounded-xl border-outline-variant/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                      <div>
                        <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                          <ScanEye className="w-4.5 h-4.5 text-secondary" /> Sighting Moderation & Action Center
                        </h3>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Citizen science observations requiring administrator review and verification.
                        </p>
                      </div>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => setActiveSubTab('sightings')}
                        className="rounded-full text-xs font-label-sm"
                      >
                        Review Sightings &rarr;
                      </Button>
                    </div>

                    {/* Breakdown cards */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="p-3.5 rounded-lg bg-warning-container/15 border border-warning/30 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-warning uppercase font-label-sm">Pending Action</span>
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        </div>
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-warning font-display-lg block">
                            {dashboardData.sightingsBreakdown.pending}
                          </span>
                          <span className="text-[9px] text-on-surface-variant font-medium">Awaiting moderation</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/25 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary uppercase font-label-sm">Verified</span>
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-primary font-display-lg block">
                            {dashboardData.sightingsBreakdown.verified}
                          </span>
                          <span className="text-[9px] text-on-surface-variant font-medium">Published in atlas</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-error-container/15 border border-error/25 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-error uppercase font-label-sm">Flagged</span>
                          <XCircle className="w-4 h-4 text-error" />
                        </div>
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-error font-display-lg block">
                            {dashboardData.sightingsBreakdown.flagged}
                          </span>
                          <span className="text-[9px] text-on-surface-variant font-medium">Rejected / Invalid</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. CONTENT MONITORING */}
                  <div className="lg:col-span-5 glass-panel bg-surface-container-high/90 p-6 rounded-xl border-outline-variant/40 space-y-4">
                    <div className="border-b border-outline-variant/30 pb-3">
                      <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-primary" /> Content Registry Monitoring
                      </h3>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Active databases powering map exploration and taxonomy.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <Trees className="w-4 h-4 text-primary" />
                          <span className="font-bold text-on-surface">Forest Biospheres ({dashboardData.counts.totalForests})</span>
                        </div>
                        <button
                          onClick={() => setActiveSubTab('forests')}
                          className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Manage Forests &rarr;
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-secondary" />
                          <span className="font-bold text-on-surface">Wildlife Profiles ({dashboardData.counts.totalWildlife})</span>
                        </div>
                        <button
                          onClick={() => setActiveSubTab('wildlife')}
                          className="text-[11px] font-bold text-secondary hover:underline cursor-pointer"
                        >
                          Manage Wildlife &rarr;
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-tertiary" />
                          <span className="font-bold text-on-surface">Global Zoos ({dashboardData.counts.totalZoos})</span>
                        </div>
                        <button
                          onClick={() => setActiveSubTab('zoos')}
                          className="text-[11px] font-bold text-tertiary hover:underline cursor-pointer"
                        >
                          Manage Zoos &rarr;
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. RECENT ACTIVITY & 4. RECENT USERS & 6. SYSTEM HEALTH */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: 4. RECENT USERS */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                        <Users className="w-4.5 h-4.5 text-primary" /> Recently Registered Explorers
                      </h3>
                      <button
                        onClick={() => setActiveSubTab('logs')}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer font-label-sm"
                      >
                        All Users ({users.length}) &rarr;
                      </button>
                    </div>

                    <div className="glass-panel bg-surface-container-high/90 rounded-xl border-outline-variant/40 overflow-hidden shadow-lg">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-surface-container text-[10px] text-on-surface-variant font-bold uppercase tracking-wider border-b border-outline-variant/30">
                            <tr>
                              <th className="py-3 px-4">Name</th>
                              <th className="py-3 px-4">Role</th>
                              <th className="py-3 px-4">Registration Date</th>
                              <th className="py-3 px-4">Last Login</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {dashboardData.recentUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-surface-container/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-on-surface">
                                  {u.name}
                                  <span className="block text-[10px] font-normal text-on-surface-variant font-mono">{u.email}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                    u.role === 'admin'
                                      ? 'bg-tertiary-container/30 text-tertiary border-tertiary/30'
                                      : 'bg-primary-container/30 text-primary border-primary/30'
                                  }`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-on-surface-variant font-mono text-[10px]">
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-on-surface-variant font-mono text-[10px]">
                                  {u.last_login ? new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right: 3. RECENT ACTIVITY & 6. SYSTEM HEALTH */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* 3. RECENT SYSTEM ACTIVITY */}
                    <div className="space-y-3">
                      <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-secondary" /> Recent System Events
                      </h3>
                      <div className="glass-panel bg-surface-container-high/90 rounded-xl border-outline-variant/40 p-4 space-y-3 shadow-lg">
                        {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
                          dashboardData.recentActivity.slice(0, 5).map((act) => (
                            <div key={act.id} className="flex items-start gap-2.5 border-b border-outline-variant/25 pb-2.5 last:border-0 last:pb-0 text-xs">
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-on-surface truncate">{act.title}</p>
                                <div className="flex justify-between items-center text-[10px] text-on-surface-variant mt-0.5">
                                  <span className="truncate">{act.detail}</span>
                                  <span className="font-mono ml-2 shrink-0">
                                    {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-on-surface-variant italic text-center py-4">No events logged yet.</p>
                        )}
                      </div>
                    </div>

                    {/* 6. SYSTEM HEALTH STATUS */}
                    <div className="glass-panel bg-surface-container-high/90 rounded-xl border-outline-variant/40 p-5 space-y-3 shadow-lg">
                      <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                        <ShieldCheck className="w-4.5 h-4.5 text-primary" /> Service Health Monitor
                      </h3>
                      <div className="space-y-2.5 text-xs font-label-sm">
                        
                        <div className="flex justify-between items-center p-2 rounded bg-surface-container/60">
                          <span className="text-on-surface-variant">SQLite Database Storage</span>
                          <span className={`font-bold flex items-center gap-1.5 ${
                            dashboardData.systemHealth.database === 'Connected' ? 'text-primary' : 'text-error'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              dashboardData.systemHealth.database === 'Connected' ? 'bg-primary animate-pulse' : 'bg-error'
                            }`} />
                            {dashboardData.systemHealth.database}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 rounded bg-surface-container/60">
                          <span className="text-on-surface-variant">Google Gemini Live AI</span>
                          <span className={`font-bold flex items-center gap-1.5 ${
                            dashboardData.systemHealth.geminiAI === 'Available' ? 'text-primary' : 'text-warning'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              dashboardData.systemHealth.geminiAI === 'Available' ? 'bg-primary' : 'bg-warning'
                            }`} />
                            {dashboardData.systemHealth.geminiAI}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 rounded bg-surface-container/60">
                          <span className="text-on-surface-variant">OpenStreetMap Tile Engine</span>
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {dashboardData.systemHealth.mapService}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* 7. ADMIN QUICK ACTIONS */}
                    <div className="space-y-3">
                      <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                        <PlusCircle className="w-4.5 h-4.5 text-tertiary" /> Administration Quick Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveSubTab('forests')}
                          className="justify-start gap-1.5 rounded-lg text-xs bg-surface-container hover:bg-surface-container-high"
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" /> Add Forest
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveSubTab('wildlife')}
                          className="justify-start gap-1.5 rounded-lg text-xs bg-surface-container hover:bg-surface-container-high"
                        >
                          <Plus className="w-3.5 h-3.5 text-secondary" /> Add Wildlife
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveSubTab('zoos')}
                          className="justify-start gap-1.5 rounded-lg text-xs bg-surface-container hover:bg-surface-container-high"
                        >
                          <Plus className="w-3.5 h-3.5 text-tertiary" /> Add Zoo
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveSubTab('sightings')}
                          className="justify-start gap-1.5 rounded-lg text-xs bg-surface-container hover:bg-surface-container-high"
                        >
                          <ScanEye className="w-3.5 h-3.5 text-primary" /> Review Sightings
                        </Button>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* 2. FORESTS SUB TAB (Add, edit, and delete forests) */}
            {activeSubTab === 'forests' && (
              <div className="grid md:grid-cols-12 gap-6 items-start">
                {/* Form column */}
                <form onSubmit={handleAddForest} className="md:col-span-5 glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 text-left space-y-4">
                  <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 mb-2 border-b border-outline-variant/45 pb-2">
                    <PlusCircle className="w-4.5 h-4.5 text-primary" /> Index New Forest Location
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Forest Name</label>
                    <input
                      type="text" required value={forestName} onChange={(e) => setForestName(e.target.value)}
                      placeholder="e.g. Mudumalai National Park"
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Country</label>
                      <input
                        type="text" required value={country} onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. India"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">State / Province</label>
                      <input
                        type="text" required value={stateName} onChange={(e) => setStateName(e.target.value)}
                        placeholder="e.g. Tamil Nadu"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Latitude</label>
                      <input
                        type="number" step="any" required value={latitude} onChange={(e) => setLatitude(e.target.value)}
                        placeholder="e.g. 11.5623"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Longitude</label>
                      <input
                        type="number" step="any" required value={longitude} onChange={(e) => setLongitude(e.target.value)}
                        placeholder="e.g. 76.5345"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Area Size</label>
                      <input
                        type="text" value={area} onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g. 321 km²"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Climate Info</label>
                      <input
                        type="text" value={climate} onChange={(e) => setClimate(e.target.value)}
                        placeholder="e.g. Tropical Deciduous"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Description Summary</label>
                    <textarea
                      rows={2} required value={forestDesc} onChange={(e) => setForestDesc(e.target.value)}
                      placeholder="Summary of ecosystem, wildlife, and location highlights..."
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <button
                    type="submit" disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-primary hover:brightness-105 font-bold text-xs text-on-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 font-label-md"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Publish Forest Location
                  </button>
                </form>

                {/* Forests Directory List */}
                <div className="md:col-span-7 glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 text-left space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/45 pb-3">
                    <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                      <Trees className="w-4.5 h-4.5 text-primary animate-pulse" />
                      Global Forests Directory ({forests.length})
                    </h3>

                    {/* Forest search */}
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search forests..."
                        value={forestSearch}
                        onChange={(e) => setForestSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg glass-input text-on-surface font-body-md"
                      />
                    </div>
                  </div>

                  <div className="max-h-[450px] overflow-y-auto space-y-3 pr-1">
                    {forests
                      .filter(f => 
                        f.name.toLowerCase().includes(forestSearch.toLowerCase()) || 
                        f.country.toLowerCase().includes(forestSearch.toLowerCase()) ||
                        (f.state && f.state.toLowerCase().includes(forestSearch.toLowerCase()))
                      )
                      .map((f) => (
                        <div key={f.id} className="p-3 bg-[#1c1b1b] border border-outline-variant/40 rounded-lg flex items-center justify-between font-body-md">
                          <div className="flex-1 pr-3">
                            <div className="font-semibold text-xs text-on-surface">{f.name}</div>
                            <div className="text-[10px] text-on-surface-variant mt-0.5 font-label-sm">{f.state}, {f.country} • Lat: {f.latitude}, Lng: {f.longitude}</div>
                            {f.climate && <div className="text-[9px] text-primary mt-0.5 italic">Climate: {f.climate}</div>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditForest(f)}
                              title="Edit Forest"
                              className="p-1.5 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteForest(f.id)}
                              title="Delete Forest"
                              className="p-1.5 rounded bg-error/20 hover:bg-error/30 text-error border border-error/20 hover:border-error/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    {forests.length === 0 && (
                      <p className="text-xs text-on-surface-variant text-center py-6 italic">No forests indexed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. WILDLIFE SUB TAB (Add, view, and edit wildlife) */}
            {activeSubTab === 'wildlife' && (
              <div className="grid md:grid-cols-12 gap-6 items-start text-left">
                {/* Wildlife Form */}
                <form onSubmit={handleAddWildlife} className="md:col-span-5 glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 space-y-4">
                  <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 mb-2 border-b border-outline-variant/45 pb-2">
                    <PlusCircle className="w-4.5 h-4.5 text-secondary" /> Register Species Profile
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Select Target Forest Location</label>
                    <select
                      required value={selectedForestId} onChange={(e) => setSelectedForestId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md bg-surface-container"
                    >
                      <option value="">-- Choose Forest --</option>
                      {forests.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.country})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Common Name</label>
                      <input
                        type="text" required value={animalName} onChange={(e) => setAnimalName(e.target.value)}
                        placeholder="e.g. Bengal Tiger"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Scientific Name</label>
                      <input
                        type="text" required value={scientificName} onChange={(e) => setScientificName(e.target.value)}
                        placeholder="e.g. Panthera tigris"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Classification</label>
                      <select
                        value={type} onChange={(e) => setType(e.target.value as any)}
                        className="w-full px-2 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md bg-surface-container"
                      >
                        <option value="animal">Mammal</option>
                        <option value="bird">Bird</option>
                        <option value="reptile">Reptile</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Status</label>
                      <select
                        value={status} onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md bg-surface-container"
                      >
                        <option value="Least Concern">Least Concern</option>
                        <option value="Near Threatened">Near Threatened</option>
                        <option value="Vulnerable">Vulnerable</option>
                        <option value="Endangered">Endangered</option>
                        <option value="Critically Endangered">Critically Endangered</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Lifespan</label>
                      <input
                        type="text" value={lifespan} onChange={(e) => setLifespan(e.target.value)}
                        placeholder="e.g. 15-20 yrs"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Image Direct URL</label>
                    <input
                      type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Habitat Type</label>
                      <input
                        type="text" value={habitat} onChange={(e) => setHabitat(e.target.value)}
                        placeholder="e.g. Dense Canopy Forest"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Diet Type</label>
                      <input
                        type="text" value={diet} onChange={(e) => setDiet(e.target.value)}
                        placeholder="e.g. Carnivore (Deer, Boar)"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Facts (One per line)</label>
                    <textarea
                      rows={2} value={factsInput} onChange={(e) => setFactsInput(e.target.value)}
                      placeholder="Solitary nocturnal hunter&#10;Unique stripe pattern on each tiger"
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <button
                    type="submit" disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-secondary hover:brightness-105 font-bold text-xs text-on-secondary transition-all cursor-pointer flex items-center justify-center gap-1.5 font-label-md"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Index Wildlife Species
                  </button>
                </form>

                {/* Wildlife Species Directory & Management List */}
                <div className="md:col-span-7 glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/45 pb-3">
                    <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-secondary" />
                      Species Directory Management
                    </h3>

                    {/* Forest filter for wildlife directory */}
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedForestForWildlife}
                        onChange={(e) => setSelectedForestForWildlife(e.target.value)}
                        className="px-2 py-1 text-xs rounded glass-input text-on-surface bg-surface-container font-label-sm"
                      >
                        <option value="">-- Choose Forest --</option>
                        {forests.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Wildlife Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search species by name or scientific name..."
                      value={wildlifeSearch}
                      onChange={(e) => setWildlifeSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg glass-input text-on-surface font-body-md"
                    />
                  </div>

                  {loadingForestWildlife ? (
                    <div className="py-12 flex justify-center items-center text-secondary">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                      {forestWildlifeList
                        .filter(w => 
                          w.name.toLowerCase().includes(wildlifeSearch.toLowerCase()) ||
                          (w.scientificName && w.scientificName.toLowerCase().includes(wildlifeSearch.toLowerCase()))
                        )
                        .map((w) => (
                          <div key={w.id} className="p-3 bg-[#1c1b1b] border border-outline-variant/40 rounded-lg flex items-center justify-between font-body-md gap-3">
                            <img src={w.imageUrl} alt={w.name} className="w-12 h-12 object-cover rounded-md border border-outline-variant/30 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-on-surface truncate">{w.name}</div>
                              <div className="text-[10px] text-primary italic truncate">{w.scientificName}</div>
                              <div className="text-[9px] text-on-surface-variant mt-0.5">{w.type} • {w.conservationStatus}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleOpenEditWildlife(w)}
                                title="Edit Wildlife"
                                className="p-1.5 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteWildlife(w.id)}
                                title="Delete Wildlife"
                                className="p-1.5 rounded bg-error/20 hover:bg-error/30 text-error border border-error/20 hover:border-error/40 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      {forestWildlifeList.length === 0 && (
                        <p className="text-xs text-on-surface-variant text-center py-6 italic">
                          No species found for the selected forest.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. ZOOS SUB TAB */}
            {activeSubTab === 'zoos' && (
              <div className="grid md:grid-cols-2 gap-6 items-start text-left">
                {/* Zoo Form */}
                <form onSubmit={handleAddZoo} className="glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 space-y-4">
                  <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 mb-2 border-b border-outline-variant/45 pb-2">
                    <PlusCircle className="w-4.5 h-4.5 text-primary" /> Index Zoo / Conservation Center
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Zoo / Center Name</label>
                    <input
                      type="text" required value={zooName} onChange={(e) => setZooName(e.target.value)}
                      placeholder="e.g. Singapore Zoo"
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Country</label>
                    <input
                      type="text" required value={zooCountry} onChange={(e) => setZooCountry(e.target.value)}
                      placeholder="e.g. Singapore"
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Latitude</label>
                      <input
                        type="number" step="0.00001" required value={zooLatitude} onChange={(e) => setZooLatitude(e.target.value)}
                        placeholder="e.g. 1.4043"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Longitude</label>
                      <input
                        type="number" step="0.00001" required value={zooLongitude} onChange={(e) => setZooLongitude(e.target.value)}
                        placeholder="e.g. 103.7930"
                        className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-label-sm">Notable Species (Comma-separated)</label>
                    <input
                      type="text" required value={zooNotable} onChange={(e) => setZooNotable(e.target.value)}
                      placeholder="e.g. Giant Panda, White Tiger, Komodo Dragon"
                      className="w-full px-3 py-2 text-xs rounded-lg text-on-surface glass-input font-body-md"
                    />
                  </div>

                  <button
                    type="submit" disabled={actionLoading}
                    className="w-full py-2.5 rounded-full bg-primary hover:brightness-105 font-bold text-xs text-on-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 font-label-md"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Index Zoo Record
                  </button>
                </form>

                {/* Zoos Directory List */}
                <div className="glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/45 pb-3">
                    <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                      <Building2 className="w-4.5 h-4.5 text-primary" />
                      Zoos & Conservation Centers Directory ({zoos.length})
                    </h3>

                    {/* Zoo search */}
                    <div className="relative w-full sm:w-44">
                      <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search zoos..."
                        value={zooSearch}
                        onChange={(e) => setZooSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg glass-input text-on-surface font-body-md"
                      />
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                    {zoos
                      .filter(z => 
                        z.name.toLowerCase().includes(zooSearch.toLowerCase()) || 
                        z.country.toLowerCase().includes(zooSearch.toLowerCase())
                      )
                      .map((z) => (
                        <div key={z.id} className="p-3 bg-[#1c1b1b] border border-outline-variant/40 rounded-lg flex items-center justify-between font-body-md">
                          <div>
                            <div className="font-semibold text-xs text-on-surface">{z.name}</div>
                            <div className="text-[10px] text-on-surface-variant mt-0.5 font-label-sm">{z.country} • Lat: {z.latitude}, Lng: {z.longitude}</div>
                            <div className="text-[9px] text-primary italic mt-1">Exhibits: {z.notable_species}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteZoo(z.id)}
                            className="p-1.5 rounded bg-error/20 hover:bg-error/30 text-error border border-error/20 hover:border-error/40 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    {zoos.length === 0 && (
                      <p className="text-xs text-on-surface-variant text-center py-6 italic">No zoos registered yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. SIGHTINGS SUB TAB (With Batch Moderation, Filters, and Checkboxes) */}
            {activeSubTab === 'sightings' && (
              <div className="glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/45 pb-4">
                  <div>
                    <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                      <ScanEye className="w-4.5 h-4.5 text-tertiary" />
                      Wildlife Sightings Moderation ({sightings.length})
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Filter, review, verify or flag citizen-submitted wildlife observations.
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/40">
                    {(['all', 'pending', 'verified', 'flagged'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setSightingsStatusFilter(status)}
                        className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all cursor-pointer font-label-sm ${
                          sightingsStatusFilter === status
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant/35">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllPending}
                      className="px-3 py-1.5 text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface rounded border border-outline-variant/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      Select All Pending
                    </button>
                    {selectedSightingIds.length > 0 && (
                      <button
                        onClick={handleClearSightingSelection}
                        className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded transition-all cursor-pointer"
                      >
                        Clear Selection ({selectedSightingIds.length})
                      </button>
                    )}
                  </div>

                  {selectedSightingIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBatchModerate('verified')}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-primary hover:brightness-105 text-on-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify Selected ({selectedSightingIds.length})
                      </button>
                      <button
                        onClick={() => handleBatchModerate('flagged')}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-error hover:brightness-105 text-on-error text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Flag Selected ({selectedSightingIds.length})
                      </button>
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search species / notes..."
                      value={sightingsSearch}
                      onChange={(e) => setSightingsSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg glass-input text-on-surface font-body-md"
                    />
                  </div>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {sightings
                    .filter(s => {
                      if (sightingsStatusFilter !== 'all' && s.status !== sightingsStatusFilter) return false;
                      if (!sightingsSearch.trim()) return true;
                      const q = sightingsSearch.toLowerCase();
                      return (
                        s.commonName?.toLowerCase().includes(q) ||
                        s.scientificName?.toLowerCase().includes(q) ||
                        s.notes?.toLowerCase().includes(q) ||
                        s.userId?.toLowerCase().includes(q)
                      );
                    })
                    .map((s) => {
                      const isSelected = selectedSightingIds.includes(s.id);
                      return (
                        <div 
                          key={s.id} 
                          className={`p-4 bg-[#1c1b1b] border rounded-xl flex flex-col md:flex-row gap-4 font-body-md transition-all ${
                            isSelected ? 'border-primary shadow-md bg-primary/5' : 'border-outline-variant/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleSelectSighting(s.id)}
                              className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors cursor-pointer mt-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5 text-on-surface-variant" />
                              )}
                            </button>
                            {s.imageBase64 && (
                              <img src={s.imageBase64} alt={s.commonName} className="w-24 h-24 object-cover rounded-lg border border-outline-variant/30 shrink-0" />
                            )}
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-xs text-on-surface">{s.commonName}</h4>
                                <span className="text-[9px] text-on-surface-variant italic font-body-md block">{s.scientificName || "Scientific name not provided"}</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                s.status === 'verified'
                                  ? 'bg-primary/20 text-primary border-primary/30'
                                  : s.status === 'flagged'
                                  ? 'bg-error-container/20 text-error border-error/30'
                                  : 'bg-warning-container/20 text-warning border-warning/30'
                              }`}>
                                {s.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-on-surface-variant/80 font-semibold font-label-sm">
                              Submitter User ID: {s.userId} • Coords: {s.latitude}, {s.longitude} • Timestamp: {new Date(s.timestamp).toLocaleString()}
                            </div>
                            {s.notes && (
                              <p className="text-xs text-on-surface-variant/90 leading-relaxed italic bg-surface-container/30 p-2 rounded border border-outline-variant/20 font-body-md">
                                "{s.notes}"
                              </p>
                            )}
                            
                            {s.status === 'pending' && (
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleVerifySighting(s.id, 'verified')}
                                  className="px-3 py-1.5 rounded-lg bg-primary hover:brightness-105 text-on-primary text-[10px] font-bold transition-all cursor-pointer font-label-sm flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify Sighting
                                </button>
                                <button
                                  onClick={() => handleVerifySighting(s.id, 'flagged')}
                                  className="px-3 py-1.5 rounded-lg bg-error hover:brightness-105 text-on-error text-[10px] font-bold transition-all cursor-pointer font-label-sm flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Flag / Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {sightings.length === 0 && (
                    <div className="text-xs text-on-surface-variant text-center py-10 italic">
                      No wildlife sightings logged yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. LOGS SUB TAB (Users and Chat log histories) */}
            {activeSubTab === 'logs' && (
              <div className="grid md:grid-cols-2 gap-6 text-left">
                {/* Users List */}
                <div className="glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/45 pb-3">
                    <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                      <Users className="w-4.5 h-4.5 text-tertiary" />
                      Active Users Directory ({users.length})
                    </h3>
                    <div className="relative w-full sm:w-40">
                      <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg glass-input text-on-surface font-body-md"
                      />
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-3">
                    {users
                      .filter(u => 
                        (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
                        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
                      )
                      .map((u, idx) => (
                        <div key={u.id || idx} className="p-3 bg-[#1c1b1b] border border-outline-variant/40 rounded-lg flex items-center justify-between font-body-md">
                          <div>
                            <div className="font-semibold text-xs text-on-surface">{u.name}</div>
                            <div className="text-[10px] text-on-surface-variant mt-0.5 font-label-sm">{u.email}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold font-label-sm ${
                            u.role === 'admin' 
                              ? 'bg-tertiary-container/30 text-tertiary border-tertiary/20' 
                              : 'bg-primary-container/30 text-primary border-primary/20'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* AI Chat History log */}
                <div className="glass-panel bg-surface-container-high/95 p-6 rounded-lg border-outline-variant/45 space-y-3">
                  <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/45 pb-3">
                    <MessageSquare className="w-4.5 h-4.5 text-primary animate-pulse" />
                    Global AI Chat logs ({chats.length})
                  </h3>
                  <div className="max-h-[400px] overflow-y-auto space-y-4">
                    {chats.map((c) => (
                      <div key={c.id} className="p-3 bg-[#1c1b1b] border border-outline-variant/40 rounded-lg space-y-2 text-xs font-body-md">
                        <div className="flex justify-between text-[10px] text-on-surface-variant font-label-sm">
                          <span>User UID: {c.userId ? c.userId.substring(0, 10) : 'Anonymous'}...</span>
                          <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div>
                          <strong className="text-primary block text-[11px] font-label-sm">Prompt:</strong>
                          <p className="text-on-surface-variant italic mt-0.5 font-light">"{c.prompt}"</p>
                        </div>
                        <div className="pt-1.5 border-t border-outline-variant/30">
                          <strong className="text-secondary block text-[11px] font-label-sm">Answer:</strong>
                          <p className="text-on-surface-variant mt-0.5 line-clamp-2 font-light">{c.answer}</p>
                        </div>
                      </div>
                    ))}
                    {chats.length === 0 && (
                      <div className="text-xs text-on-surface-variant text-center py-10 italic">
                        No AI conversations recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Edit Forest Modal */}
      {editingForest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-surface-container-high rounded-xl border border-outline-variant/60 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-3">
              <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" /> Edit Forest Location
              </h3>
              <button 
                onClick={() => setEditingForest(null)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateForest} className="space-y-3 font-body-md">
              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Name</label>
                <input
                  type="text" required
                  value={editForestForm.name}
                  onChange={(e) => setEditForestForm({ ...editForestForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Country</label>
                  <input
                    type="text" required
                    value={editForestForm.country}
                    onChange={(e) => setEditForestForm({ ...editForestForm, country: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">State</label>
                  <input
                    type="text" required
                    value={editForestForm.state}
                    onChange={(e) => setEditForestForm({ ...editForestForm, state: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Latitude</label>
                  <input
                    type="number" step="any" required
                    value={editForestForm.latitude}
                    onChange={(e) => setEditForestForm({ ...editForestForm, latitude: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Longitude</label>
                  <input
                    type="number" step="any" required
                    value={editForestForm.longitude}
                    onChange={(e) => setEditForestForm({ ...editForestForm, longitude: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Area Size</label>
                  <input
                    type="text"
                    value={editForestForm.area}
                    onChange={(e) => setEditForestForm({ ...editForestForm, area: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Climate</label>
                  <input
                    type="text"
                    value={editForestForm.climate}
                    onChange={(e) => setEditForestForm({ ...editForestForm, climate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Description</label>
                <textarea
                  rows={2} required
                  value={editForestForm.description}
                  onChange={(e) => setEditForestForm({ ...editForestForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setEditingForest(null)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary hover:brightness-105 shadow flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Wildlife Modal */}
      {editingWildlife && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-surface-container-high rounded-xl border border-outline-variant/60 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-3">
              <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-secondary" /> Edit Species Profile
              </h3>
              <button 
                onClick={() => setEditingWildlife(null)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateWildlife} className="space-y-3 font-body-md">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Common Name</label>
                  <input
                    type="text" required
                    value={editWildlifeForm.name}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Scientific Name</label>
                  <input
                    type="text" required
                    value={editWildlifeForm.scientificName}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, scientificName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Type</label>
                  <select
                    value={editWildlifeForm.type}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, type: e.target.value as any })}
                    className="w-full px-2 py-1.5 text-xs rounded glass-input text-on-surface bg-surface-container"
                  >
                    <option value="animal">Mammal</option>
                    <option value="bird">Bird</option>
                    <option value="reptile">Reptile</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Status</label>
                  <select
                    value={editWildlifeForm.conservationStatus}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, conservationStatus: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded glass-input text-on-surface bg-surface-container"
                  >
                    <option value="Least Concern">Least Concern</option>
                    <option value="Near Threatened">Near Threatened</option>
                    <option value="Vulnerable">Vulnerable</option>
                    <option value="Endangered">Endangered</option>
                    <option value="Critically Endangered">Critically Endangered</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Lifespan</label>
                  <input
                    type="text"
                    value={editWildlifeForm.lifespan}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, lifespan: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Image URL</label>
                <input
                  type="url" required
                  value={editWildlifeForm.imageUrl}
                  onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Habitat</label>
                  <input
                    type="text"
                    value={editWildlifeForm.habitat}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, habitat: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Diet</label>
                  <input
                    type="text"
                    value={editWildlifeForm.diet}
                    onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, diet: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold font-label-sm">Interesting Facts (One per line)</label>
                <textarea
                  rows={3}
                  value={editWildlifeForm.factsInput}
                  onChange={(e) => setEditWildlifeForm({ ...editWildlifeForm, factsInput: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded glass-input text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setEditingWildlife(null)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-secondary text-on-secondary hover:brightness-105 shadow flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Species Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
