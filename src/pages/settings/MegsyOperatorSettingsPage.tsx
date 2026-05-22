import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, ShieldCheck, Bot, Terminal, Globe, Users, Wallet, ScrollText } from "lucide-react";
import { MegsyComputerIcon } from "@/components/settings/MegsyComputerIcon";
import { BackIcon } from "@/components/settings/SettingsIcons";
import { toast } from "sonner";

interface OperatorSettings {
  ask_before_sensitive: boolean;
  ask_before_anything: boolean;
  allow_free_shell: boolean;
  allow_browser_automation: boolean;
  allow_dynamic_agents: boolean;
  max_parallel_agents: number;
  budget_cap_cents: number;
}

const DEFAULTS: OperatorSettings = {
  ask_before_sensitive: true,
  ask_before_anything: false,
  allow_free_shell: false,
  allow_browser_automation: true,
  allow_dynamic_agents: true,
  max_parallel_agents: 3,
  budget_cap_cents: 500,
};

const MegsyOperatorSettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<OperatorSettings>(DEFAULTS);
  const [agentCount, setAgentCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      const [{ data: s }, { count: ac }, { count: lc }] = await Promise.all([
        supabase.from("operator_user_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("operator_dynamic_agents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("operator_audit_log").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (s) setSettings({ ...DEFAULTS, ...s });
      setAgentCount(ac || 0);
      setAuditCount(lc || 0);
      setLoading(false);
    })();
  }, [navigate]);

  const save = async (patch: Partial<OperatorSettings>) => {
    if (!userId) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    const { error } = await supabase.from("operator_user_settings").upsert({ user_id: userId, ...next });
    setSaving(false);
    if (error) toast.error("فشل الحفظ"); else toast.success("تم الحفظ");
  };

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Row = ({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-4 border-b border-border/40">
      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto pb-16 px-5">
        <div className="flex items-center justify-between py-4">
          <button onClick={() => navigate("/settings")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted/50">
            <BackIcon className="w-5 h-5" />
          </button>
          <h1 className="font-display text-base font-bold">Megsy Operator</h1>
          <div className="w-9">{saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Hero */}
          <div className="mt-2 mb-6 p-5 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/5 border border-border/40">
            <div className="flex items-center gap-3 mb-2">
              <MegsyComputerIcon className="w-8 h-8 text-primary" />
              <h2 className="font-display text-lg font-bold">كمبيوتر Megsy</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تحكّم في صلاحيات الذكاء داخل بيئته الخاصة: متصفح، شل، وكلاء ديناميكيين، وحدود الإنفاق.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-2xl bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">وكلاء مولّدون</p>
                <p className="text-lg font-bold">{agentCount}</p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">سجل المراجعة</p>
                <p className="text-lg font-bold">{auditCount}</p>
              </div>
            </div>
          </div>

          {/* Approval gates */}
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 px-1">بوابات الموافقة</p>
          <Row icon={ShieldCheck} title="اسألني قبل الأفعال الحساسة" desc="مدفوعات، إيميلات، حذف ملفات، نشر علني.">
            <Switch checked={settings.ask_before_sensitive} onCheckedChange={(v) => save({ ask_before_sensitive: v })} />
          </Row>
          <Row icon={ShieldCheck} title="اسألني قبل أي فعل" desc="وضع متشدد — الذكاء يستأذن قبل كل أداة.">
            <Switch checked={settings.ask_before_anything} onCheckedChange={(v) => save({ ask_before_anything: v })} />
          </Row>

          {/* Capabilities */}
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 px-1 mt-6">القدرات</p>
          <Row icon={Globe} title="أتمتة المتصفح" desc="فتح مواقع، نقر، تعبئة نماذج، استخراج بيانات.">
            <Switch checked={settings.allow_browser_automation} onCheckedChange={(v) => save({ allow_browser_automation: v })} />
          </Row>
          <Row icon={Terminal} title="شل حر داخل البيئة" desc="bash، apt، python، ffmpeg. خطر — للمتقدمين فقط.">
            <Switch checked={settings.allow_free_shell} onCheckedChange={(v) => save({ allow_free_shell: v })} />
          </Row>
          <Row icon={Bot} title="وكلاء ديناميكيون" desc="الذكاء يولّد وكيلاً جديداً (مثلاً وكيل ماركتينج) عند الحاجة ويحفظه.">
            <Switch checked={settings.allow_dynamic_agents} onCheckedChange={(v) => save({ allow_dynamic_agents: v })} />
          </Row>

          {/* Limits */}
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 px-1 mt-6">الحدود</p>
          <div className="py-4 border-b border-border/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"><Users className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold">عدد الوكلاء المتوازيين</p>
                <p className="text-xs text-muted-foreground">{settings.max_parallel_agents} وكلاء يعملون معاً</p>
              </div>
            </div>
            <Slider value={[settings.max_parallel_agents]} min={1} max={10} step={1}
              onValueChange={(v) => setSettings({ ...settings, max_parallel_agents: v[0] })}
              onValueCommit={(v) => save({ max_parallel_agents: v[0] })} />
          </div>
          <div className="py-4 border-b border-border/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold">حد الإنفاق لكل مهمة</p>
                <p className="text-xs text-muted-foreground">${(settings.budget_cap_cents / 100).toFixed(2)} كحد أقصى</p>
              </div>
            </div>
            <Slider value={[settings.budget_cap_cents]} min={50} max={5000} step={50}
              onValueChange={(v) => setSettings({ ...settings, budget_cap_cents: v[0] })}
              onValueCommit={(v) => save({ budget_cap_cents: v[0] })} />
          </div>

          {/* Sub-pages */}
          <button onClick={() => navigate("/settings/operator/agents")}
            className="w-full flex items-center gap-3 py-4 mt-2 text-left border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"><Bot className="w-5 h-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold">الوكلاء الديناميكيون</p>
              <p className="text-xs text-muted-foreground">{agentCount} وكيل متخصص مولّد تلقائياً</p>
            </div>
            <span className="text-muted-foreground/40">›</span>
          </button>
          <button onClick={() => navigate("/settings/operator/audit")}
            className="w-full flex items-center gap-3 py-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"><ScrollText className="w-5 h-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold">سجل المراجعة الكامل</p>
              <p className="text-xs text-muted-foreground">كل أمر نفّذه الذكاء — قابل للتصدير</p>
            </div>
            <span className="text-muted-foreground/40">›</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default MegsyOperatorSettingsPage;
