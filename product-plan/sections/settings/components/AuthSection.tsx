import type { AuthSettings } from "@/../product/sections/settings/types";
import { ShieldOff, KeyRound, FormInput, Copy, RefreshCw, Check } from "lucide-react";
import { useState } from "react";

interface AuthSectionProps {
  settings: AuthSettings;
  onUpdate?: (settings: AuthSettings) => void;
  onRegenerateApiKey?: () => Promise<string>;
}

export function AuthSection({ settings, onUpdate, onRegenerateApiKey }: AuthSectionProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleMethodChange = (method: AuthSettings["method"]) => {
    onUpdate?.({ ...settings, method, enabled: method !== "none" });
  };

  const handleUsernameChange = (username: string) => {
    onUpdate?.({ ...settings, username });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onUpdate?.({ ...settings, apiKey });
  };

  const handleCopyApiKey = async () => {
    await navigator.clipboard.writeText(settings.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateApiKey = async () => {
    if (!onRegenerateApiKey) return;
    if (!confirm("Are you sure you want to regenerate your API key? This will invalidate the current key and any applications using it will need to be updated.")) return;
    
    setRegenerating(true);
    try {
      const newKey = await onRegenerateApiKey();
      onUpdate?.({ ...settings, apiKey: newKey });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Method */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Authentication Method
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleMethodChange("none")}
            className={`flex items-center gap-3 p-4 rounded-sm border-2 transition-all ${
              settings.method === "none"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            }`}
          >
            <div
              className={`p-2 rounded-sm ${
                settings.method === "none"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <ShieldOff className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium text-slate-900 dark:text-white">
                Disabled
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                No authentication
              </p>
            </div>
          </button>

          <button
            onClick={() => handleMethodChange("form")}
            className={`flex items-center gap-3 p-4 rounded-sm border-2 transition-all ${
              settings.method === "form"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            }`}
          >
            <div
              className={`p-2 rounded-sm ${
                settings.method === "form"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <FormInput className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium text-slate-900 dark:text-white">
                Form Login
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Username & password
              </p>
            </div>
          </button>

          <button
            onClick={() => handleMethodChange("basic")}
            className={`flex items-center gap-3 p-4 rounded-sm border-2 transition-all ${
              settings.method === "basic"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            }`}
          >
            <div
              className={`p-2 rounded-sm ${
                settings.method === "basic"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium text-slate-900 dark:text-white">
                Basic Auth
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                HTTP Basic authentication
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Username (when auth is enabled) */}
      {settings.method !== "none" && (
        <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={settings.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* API Key */}
      <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              API Key
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">
              Use this key to authenticate external applications with the API
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={settings.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            placeholder="Enter or paste API key"
          />
          
          <button
            onClick={handleCopyApiKey}
            className="flex items-center gap-2 px-3 py-2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
            title="Copy API key"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleRegenerateApiKey}
            disabled={regenerating}
            className="flex items-center gap-2 px-3 py-2 rounded-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors text-sm font-medium disabled:opacity-50"
            title="Regenerate API key"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
          </button>
        </div>
        
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Enter your own API key or regenerate to create a new random key.
        </p>
      </div>
    </div>
  );
}

