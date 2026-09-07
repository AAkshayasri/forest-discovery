import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Settings as SettingsIcon, Shield, Sliders, Bell } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Display name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name.trim(), user?.avatar || null);
      showToast('Dossier settings updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update dossier settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setName(user?.name || '');
    showToast('Changes discarded', 'info');
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-container-margin select-none font-body-md">
      <div className="max-w-3xl mx-auto space-y-8 text-left">
        
        {/* Header Title */}
        <div className="border-b border-outline-variant/45 pb-6">
          <h1 className="font-headline-lg text-3xl font-bold text-on-background flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Console Settings
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Configure your explorer preferences, authentication credentials, and notifications.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Explorer Profile */}
          <Card hoverEffect={false} className="space-y-4">
            <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
              <Sliders className="w-4 h-4 text-primary" />
              Explorer Dossier Preferences
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Explorer Display Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
              />
              <Input
                label="Registered Email"
                type="email"
                value={user?.email || ''}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
            </div>
          </Card>

          {/* Section 2: Security */}
          <Card hoverEffect={false} className="space-y-4">
            <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
              <Shield className="w-4 h-4 text-secondary" />
              Security & Permissions
            </h3>
            
            <div className="text-xs space-y-2 font-body-md text-on-surface-variant">
              <div className="flex justify-between items-center py-1">
                <span>Access Authorization Level</span>
                <span className="font-bold text-primary uppercase font-label-sm">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Session Credentials status</span>
                <span className="text-secondary font-bold font-label-sm">Active & Secure</span>
              </div>
            </div>
          </Card>

          {/* Section 3: Notification Toggles */}
          <Card hoverEffect={false} className="space-y-4">
            <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
              <Bell className="w-4 h-4 text-tertiary" />
              Alert Subscriptions
            </h3>
            
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="block text-xs font-bold text-on-surface font-label-sm">Desktop Notifications</span>
                <span className="block text-[10px] text-on-surface-variant font-body-md">Get instant toasts when species are discovered or chat updates occur.</span>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container"
              />
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/45">
            <Button variant="ghost" type="button" onClick={handleDiscard} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Apply Changes'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Settings;
