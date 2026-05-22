// Integrations — luma/neutral. Grouped by category, clean list, detail modal on tap.
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSettingsLayout } from "@/components/settings/DesktopSettingsLayout";
import { integrations, INTEGRATION_CATEGORIES, type Integration } from "@/lib/integrationsData";
import IntegrationDetailModal from "@/components/integrations/IntegrationDetailModal";

const ICON_BASE = "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons";

const ICON_MAP: Record<string, string> = {
  gmail: "gmail", outlook: "microsoftoutlook", slack: "slack", discord: "discord",
  microsoftteams: "microsoftteams", zoom: "zoom", telegram: "telegram",
  whatsapp: "whatsapp", notion: "notion", googlecalendar: "googlecalendar",
  todoist: "todoist", trello: "trello", asana: "asana", clickup: "clickup",
  github: "github", gitlab: "gitlab", jira: "jira", linear: "linear",
  vercel: "vercel", salesforce: "salesforce", hubspot: "hubspot",
  stripe: "stripe", paypal: "paypal", shopify: "shopify",
  instagram: "instagram", twitter: "x", facebook: "facebook", linkedin: "linkedin",
  youtube: "youtube", pinterest: "pinterest", reddit: "reddit",
  googledrive: "googledrive", dropbox: "dropbox", figma: "figma", canva: "canva",
  zendesk: "zendesk", wordpress: "wordpress",
  firebase: "firebase", supabase: "supabase", airtable: "airtable",
  openai: "openai", googlesheets: "googlesheets",
};

function getIcon(app: string): string | null {
  return ICON_MAP[app] ? `${ICON_BASE}/${ICON_MAP[app]}.svg` : null;
}

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [connectedApps, setConnectedApps] = useState<Record<string, string>>({});
  const [loadingApp, setLoadingApp] = useState<string | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => { loadConnections(); }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("composio", {
        body: { action: "list-connections", userId: "default" },
      });
      if (error) throw error;
      const items = data?.items || data || [];
      const connected: Record<string, string> = {};
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const appName = (item.appName || item.appUniqueId || "").toLowerCase();
          if (appName && item.status === "ACTIVE") connected[appName] = item.id;
        });
      }
      setConnectedApps(connected);
    } catch (e) {
      console.error("Failed to load connections:", e);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    setLoadingApp(integration.id);
    try {
      const { data, error } = await supabase.functions.invoke("composio", {
        body: { action: "connect", app: integration.app, userId: "default" },
      });
      if (error) throw error;
      if (data?.redirectUrl) {
        const returnUrl = window.location.href;
        const redirectWithReturn = data.redirectUrl + (data.redirectUrl.includes("?") ? "&" : "?") + `redirect_url=${encodeURIComponent(returnUrl)}`;
        const authWindow = window.open(redirectWithReturn, "_blank", "width=600,height=700");
        if (!authWindow) { window.location.href = redirectWithReturn; return; }
        toast.success(`Opening ${integration.name} authorization...`);
        const pollInterval = setInterval(async () => {
          try {
            if (authWindow.closed) { clearInterval(pollInterval); await loadConnections(); setLoadingApp(null); return; }
            const { data: checkData } = await supabase.functions.invoke("composio", {
              body: { action: "list-connections", userId: "default" },
            });
            const items = checkData?.items || checkData || [];
            if (Array.isArray(items)) {
              const found = items.find((item: any) => (item.appName || item.appUniqueId || "").toLowerCase() === integration.app && item.status === "ACTIVE");
              if (found) {
                clearInterval(pollInterval); authWindow.close();
                setConnectedApps(prev => ({ ...prev, [integration.app]: found.id }));
                toast.success(`${integration.name} connected successfully`);
                setLoadingApp(null);
              }
            }
          } catch {}
        }, 2500);
        setTimeout(() => { clearInterval(pollInterval); setLoadingApp(null); }, 120000);
        return;
      } else if (data?.connectionStatus === "ACTIVE") {
        toast.success(`${integration.name} connected`);
        setConnectedApps(prev => ({ ...prev, [integration.app]: data.id }));
      }
    } catch {
      toast.error(`Failed to connect ${integration.name}`);
    } finally {
      setLoadingApp(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    const connectionId = connectedApps[integration.app];
    if (!connectionId) return;
    setLoadingApp(integration.id);
    try {
      const { error } = await supabase.functions.invoke("composio", {
        body: { action: "disconnect", connectionId, userId: "default" },
      });
      if (error) throw error;
      setConnectedApps(prev => { const next = { ...prev }; delete next[integration.app]; return next; });
      toast.success(`${integration.name} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setLoadingApp(null);
    }
  };

  const isConnected = (app: string) => !!connectedApps[app];

  const grouped = useMemo(() => {
    const out: { category: string; items: Integration[] }[] = [];
    INTEGRATION_CATEGORIES.filter(c => c !== "All").forEach(cat => {
      const items = integrations.filter(i => i.category === cat);
      if (items.length) out.push({ category: cat, items });
    });
    return out;
  }, []);

  const connectedCount = Object.keys(connectedApps).length;

  const Row = ({ integration }: { integration: Integration }) => {
    const connected = isConnected(integration.app);
    const iconUrl = getIcon(integration.app);
    return (
      <button
        onClick={() => setSelectedIntegration(integration)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
      >
        <div className="w-10 h-10 rounded-xl bg-muted grid place-items-center shrink-0 overflow-hidden">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-5 h-5 dark:invert" loading="lazy" />
          ) : (
            <span className="text-[13px] font-semibold text-foreground/70">{integration.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground truncate">{integration.name}</p>
          <p className="text-[12px] text-muted-foreground truncate">{integration.description}</p>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted px-2 py-1 rounded-full shrink-0">
            <Check className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/70 shrink-0">Connect</span>
        )}
      </button>
    );
  };

  const Content = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl"
    >
      {/* Summary card */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card mb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70">Integrations</p>
          <p className="text-[15px] font-semibold text-foreground mt-0.5">
            {connectedCount} connected
            <span className="text-muted-foreground font-normal"> · {integrations.length} available</span>
          </p>
        </div>
      </div>

      {isLoadingConnections ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-7">
          {grouped.map(group => (
            <section key={group.category}>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70 mb-2 px-1">
                {group.category}
              </p>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                {group.items.map(i => <Row key={i.id} integration={i} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <IntegrationDetailModal
        integration={selectedIntegration}
        isConnected={selectedIntegration ? isConnected(selectedIntegration.app) : false}
        isLoading={selectedIntegration ? loadingApp === selectedIntegration.id : false}
        onConnect={() => selectedIntegration && handleConnect(selectedIntegration)}
        onDisconnect={() => selectedIntegration && handleDisconnect(selectedIntegration)}
        onClose={() => setSelectedIntegration(null)}
      />
    </motion.div>
  );

  if (!isMobile) {
    return (
      <DesktopSettingsLayout title="Integrations" subtitle={`${integrations.length} apps · grouped by category`}>
        <Content />
      </DesktopSettingsLayout>
    );
  }

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto px-5 pb-16">
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 grid place-items-center rounded-xl text-foreground/70 hover:bg-muted/50 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Integrations</h1>
        </div>
        <div className="pt-2">
          <Content />
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
