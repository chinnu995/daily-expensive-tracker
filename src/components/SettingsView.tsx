import React, { useState, useEffect } from 'react';
import {
  Settings,
  User as UserIcon,
  Globe,
  Shield,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { User, AuditLog } from '../types/index.js';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currencyCode, setCurrencyCode] = useState(user.currencyCode);
  const [timezone, setTimezone] = useState(user.timezone);
  const [allowOverdraft, setAllowOverdraft] = useState(user.allowOverdraft);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.getAuditLogs();
      setAuditLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await api.updateProfile({
        displayName,
        currencyCode,
        timezone,
        allowOverdraft,
      });
      onUpdateUser(res.user);
      setSaveSuccess(true);
      fetchLogs();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'WARNING: This will permanently delete your SpendWise account, all accounts, transactions, and audit logs.\n\nType "DELETE" to confirm:'
    );

    if (confirmation !== 'DELETE') {
      return;
    }

    try {
      await api.deleteAccount();
      onLogout();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Account & Preferences</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage currency, timezone, ledger policies, and inspect your auditable change trail
        </p>
      </div>

      {/* Profile & Preferences Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Profile and currency preferences updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Currency</label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="INR">INR (₹) — Indian Rupee (Default)</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>
        </div>

        {/* Ledger Policy: Overdraft Prevention */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-start justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Negative Balance / Overdraft Policy</span>
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                By default, SpendWise prevents negative balances and blocks expenses or transfers exceeding your available funds. Enable this only if your bank account has a pre-approved overdraft line.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={allowOverdraft}
                onChange={(e) => setAllowOverdraft(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Settings'}
          </button>
        </div>
      </form>

      {/* Auditable Change History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Auditable Change Logs</h3>
          </div>
          <span className="text-[11px] text-slate-400">Tracks balance corrections and edits</span>
        </div>

        {logsLoading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading audit history...</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">No audit events recorded yet.</div>
        ) : (
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block">{log.action}</span>
                  <span className="text-[11px] text-slate-500">
                    {log.reason || 'Manual user action'}
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Danger Zone: Account Deletion</span>
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">
          Deleting your SpendWise account will wipe all financial records, accounts, transactions, budgets, and logs. This action is irreversible.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Permanently Delete My Account</span>
        </button>
      </div>
    </div>
  );
};
