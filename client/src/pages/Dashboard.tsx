import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useFavorites } from '../hooks/useFavorites';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { 
  Trees, Eye, MessageSquare, Camera, CheckCircle2,
  Clock, User, Globe2, Compass,
  Sparkles, Loader2, Plus, AlertCircle, ShieldCheck, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserDashboardData {
  aiQuestionsCount: number;
  sightingsCount: number;
  verifiedSightingsCount: number;
  pendingSightingsCount: number;
  flaggedSightingsCount: number;
  recentSightings: any[];
  recentChats: any[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const { history } = useSearchHistory();
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const data = await api.getUserDashboard();
      setDashboardData(data);
      setLastSynced(new Date());
    } catch (error) {
      console.error("Failed to load user dashboard telemetry:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Compute actual real user activities
  const recentActivities = [];

  if (dashboardData?.recentChats) {
    for (const chat of dashboardData.recentChats) {
      recentActivities.push({
        id: `chat-${chat.id}`,
        type: 'ai_question',
        title: `AI Question: "${chat.prompt.length > 50 ? chat.prompt.substring(0, 50) + '...' : chat.prompt}"`,
        time: chat.timestamp ? new Date(chat.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently',
        rawTime: chat.timestamp ? new Date(chat.timestamp).getTime() : 0,
        icon: MessageSquare,
        iconColor: 'text-primary'
      });
    }
  }

  if (dashboardData?.recentSightings) {
    for (const s of dashboardData.recentSightings) {
      recentActivities.push({
        id: `sighting-${s.id}`,
        type: 'sighting',
        title: `Submitted Sighting: ${s.commonName} (${s.status.toUpperCase()})`,
        time: s.timestamp ? new Date(s.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently',
        rawTime: s.timestamp ? new Date(s.timestamp).getTime() : 0,
        icon: Camera,
        iconColor: 'text-secondary'
      });
    }
  }

  // Sort activities chronologically descending
  recentActivities.sort((a, b) => b.rawTime - a.rawTime);

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-8 select-none font-body-md relative text-left">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-primary blur-[140px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Top: Welcome & Explorer Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant/45 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display-lg text-3xl font-bold text-on-background">
                Explorer Dashboard
              </h1>
              <button
                onClick={fetchDashboard}
                disabled={refreshing}
                title="Refresh Telemetry"
                className="p-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              Field monitoring telemetry, personal sightings records, and real-time database activity for <span className="text-primary font-bold">{user?.name || 'Explorer'}</span> • <span className="text-[10px] text-on-surface-variant/70">Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/map">
              <Button variant="primary" size="sm" className="rounded-full">
                <Globe2 className="w-4 h-4 mr-1.5" /> Launch Map
              </Button>
            </Link>
            <Link to="/sightings">
              <Button variant="secondary" size="sm" className="rounded-full">
                <Plus className="w-4 h-4 mr-1.5" /> Post Sighting
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. USER OVERVIEW (100% Real Database & State Values) */}
        <div className="space-y-3">
          <h2 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-primary" /> User Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            
            {/* Forests Explored */}
            <Card hoverEffect={true} className="flex items-start justify-between bg-surface-container/70 p-4">
              <div>
                <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Forests Explored</span>
                <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">
                  {history.length}
                </span>
              </div>
              <Trees className="w-4 h-4 text-primary" />
            </Card>

            {/* Wildlife Viewed / Bookmarked */}
            <Card hoverEffect={true} className="flex items-start justify-between bg-surface-container/70 p-4">
              <div>
                <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Wildlife Bookmarked</span>
                <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">
                  {favorites.length}
                </span>
              </div>
              <Eye className="w-4 h-4 text-secondary" />
            </Card>

            {/* AI Questions Asked */}
            <Card hoverEffect={true} className="flex items-start justify-between bg-surface-container/70 p-4">
              <div>
                <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">AI Questions Asked</span>
                <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">
                  {loading ? '...' : dashboardData?.aiQuestionsCount ?? 0}
                </span>
              </div>
              <MessageSquare className="w-4 h-4 text-tertiary" />
            </Card>

            {/* Sightings Submitted */}
            <Card hoverEffect={true} className="flex items-start justify-between bg-surface-container/70 p-4">
              <div>
                <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Sightings Submitted</span>
                <span className="font-display-lg text-2xl font-bold text-on-surface block mt-1">
                  {loading ? '...' : dashboardData?.sightingsCount ?? 0}
                </span>
              </div>
              <Camera className="w-4 h-4 text-primary" />
            </Card>

            {/* Verified Sightings */}
            <Card hoverEffect={true} className="col-span-2 sm:col-span-1 flex items-start justify-between bg-surface-container/70 p-4">
              <div>
                <span className="block text-[9px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Verified Sightings</span>
                <span className="font-display-lg text-2xl font-bold text-primary block mt-1">
                  {loading ? '...' : dashboardData?.verifiedSightingsCount ?? 0}
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </Card>

          </div>
        </div>

        {/* 2. MY SIGHTINGS & 3. RECENT ACTIVITY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: MY SIGHTINGS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                <Camera className="w-4.5 h-4.5 text-secondary" /> My Sightings Log
              </h2>
              <Link to="/sightings" className="text-xs text-primary font-bold hover:underline font-label-sm">
                View All &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="p-8 rounded-lg bg-surface-container/50 border border-outline-variant/30 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading sightings records...
              </div>
            ) : dashboardData?.recentSightings && dashboardData.recentSightings.length > 0 ? (
              <div className="glass-panel bg-surface-container-high/90 rounded-xl border-outline-variant/40 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-container text-[10px] text-on-surface-variant font-bold uppercase tracking-wider border-b border-outline-variant/30">
                      <tr>
                        <th className="py-3 px-4">Species Name</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Coordinates / Location</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {dashboardData.recentSightings.map((s) => (
                        <tr key={s.id} className="hover:bg-surface-container/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface">
                            {s.commonName}
                            {s.scientificName && (
                              <span className="block text-[10px] font-normal italic text-on-surface-variant">
                                {s.scientificName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant font-mono text-[11px]">
                            {s.timestamp ? new Date(s.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant font-mono text-[10px]">
                            {s.latitude && s.longitude ? (
                              <Link
                                to={`/map?lat=${s.latitude}&lng=${s.longitude}&zoom=10`}
                                title="View location on interactive map"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                              >
                                <Compass className="w-3 h-3" />
                                {`${Number(s.latitude).toFixed(3)}°, ${Number(s.longitude).toFixed(3)}°`}
                              </Link>
                            ) : (
                              'Field GPS'
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              s.status === 'verified'
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : s.status === 'flagged'
                                ? 'bg-error-container/20 text-error border-error/30'
                                : 'bg-warning-container/20 text-warning border-warning/30'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-on-surface-variant mx-auto opacity-60" />
                <p className="text-xs text-on-surface-variant">No sightings submitted yet. Report wildlife observations to help citizen science!</p>
                <Link to="/sightings">
                  <Button variant="primary" size="sm" className="rounded-full mt-2">
                    Submit First Sighting
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right: 3. RECENT ACTIVITY & 4. AI WILDLIFE GUIDE & 5. QUICK ACCESS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 3. RECENT ACTIVITY (Actual Real Events) */}
            <div className="space-y-3">
              <h2 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-primary" /> Real Activity Stream
              </h2>
              <div className="glass-panel bg-surface-container-high/90 rounded-xl border-outline-variant/40 p-4 space-y-3 shadow-lg">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((act) => {
                    const IconComp = act.icon;
                    return (
                      <div key={act.id} className="flex items-start gap-3 border-b border-outline-variant/25 pb-2.5 last:border-0 last:pb-0 text-xs">
                        <IconComp className={`w-4 h-4 shrink-0 mt-0.5 ${act.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-on-surface truncate">{act.title}</p>
                          <span className="text-[10px] text-on-surface-variant font-mono">{act.time}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-on-surface-variant italic text-center py-4">No recent activity recorded.</p>
                )}
              </div>
            </div>

            {/* 4. AI WILDLIFE GUIDE CARD */}
            <div className="glass-panel bg-surface-container-high/90 rounded-xl border-outline-variant/40 p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-primary animate-pulse" />
                <h3 className="font-bold text-sm text-on-surface">AI Wildlife Guide Assistant</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Consult Google Gemini for real-time biological taxonomy, behavioral traits, and ecosystem guidance.
              </p>
              <Link to="/chat" className="block pt-1">
                <Button variant="primary" size="sm" className="w-full rounded-lg justify-center font-label-sm font-bold">
                  Open AI Guide Chat &rarr;
                </Button>
              </Link>
            </div>

            {/* 5. QUICK ACCESS SHORTCUTS */}
            <div className="space-y-3">
              <h2 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-secondary" /> Quick Access
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/map">
                  <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg font-label-sm text-xs bg-surface-container hover:bg-surface-container-high">
                    <Globe2 className="w-3.5 h-3.5 text-primary" /> Explore Map
                  </Button>
                </Link>
                <Link to="/identify">
                  <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg font-label-sm text-xs bg-surface-container hover:bg-surface-container-high">
                    <Eye className="w-3.5 h-3.5 text-secondary" /> Wildlife
                  </Button>
                </Link>
                <Link to="/map">
                  <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg font-label-sm text-xs bg-surface-container hover:bg-surface-container-high">
                    <Trees className="w-3.5 h-3.5 text-tertiary" /> Forest Reserves
                  </Button>
                </Link>
                <Link to="/chat">
                  <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg font-label-sm text-xs bg-surface-container hover:bg-surface-container-high">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" /> AI Guide
                  </Button>
                </Link>
                <Link to="/sightings">
                  <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg font-label-sm text-xs bg-surface-container hover:bg-surface-container-high">
                    <Camera className="w-3.5 h-3.5 text-secondary" /> My Sightings
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg font-label-sm text-xs bg-surface-container hover:bg-surface-container-high">
                    <User className="w-3.5 h-3.5 text-tertiary" /> Profile
                  </Button>
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
