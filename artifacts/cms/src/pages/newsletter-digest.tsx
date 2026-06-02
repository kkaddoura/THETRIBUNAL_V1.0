import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { track as trackCms } from "@/lib/analytics";
import { Loader2, Eye, Mail, Check, AlertCircle, Users, Clock } from "lucide-react";

interface Schedule {
  enabled: boolean;
  dayOfWeek: number;
  hour: number;
  minute: number;
  timezone: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COMMON_TZS = ["Asia/Dubai", "Asia/Riyadh", "Asia/Beirut", "Africa/Cairo", "Europe/London", "UTC"];

interface ResultOption {
  text: string;
  percentage: number;
}

interface NewsletterContent {
  issueNumber: number;
  weekOf: string;
  subjectLine: string;
  previewText: string;
  headline: string;
  opening: string[];
  signal: {
    category: string;
    question: string;
    takeaway: string;
    options: ResultOption[];
    label: string;
    totalVotes: number;
  };
  split?: { question: string; takeaway: string; topResult?: string };
  oneToWatch?: { kind: string; question: string; takeaway: string };
}

interface PreviewResponse {
  content: NewsletterContent;
  html: string;
}

interface SendOutcome {
  mode: "test" | "all";
  weekStarting: string;
  subjectLine: string;
  attempted: number;
  sent: number;
  failed: number;
  skippedAlreadySent?: boolean;
  sampleError?: string;
}

export default function NewsletterDigestPage() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  useEffect(() => {
    void handlePreview();
    void api.getNewsletterSchedule().then((s) => setSchedule(s as Schedule)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSchedule = async () => {
    if (!schedule) return;
    setError(null);
    setScheduleSaved(false);
    setSavingSchedule(true);
    try {
      const saved = (await api.updateNewsletterSchedule(schedule)) as Schedule;
      setSchedule(saved);
      setScheduleSaved(true);
      trackCms("cms_newsletter_schedule_updated", { enabled: saved.enabled, dayOfWeek: saved.dayOfWeek });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule save failed");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handlePreview = async () => {
    setError(null);
    setPreviewLoading(true);
    try {
      const r = await api.previewNewsletter();
      setPreview(r as PreviewResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    setError(null);
    setResult(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      setError("Enter a valid email for the test send.");
      return;
    }
    setSendingTest(true);
    try {
      const r = (await api.sendTestNewsletter(testEmail)) as SendOutcome;
      trackCms("cms_newsletter_test_sent", { to: testEmail });
      setResult(r.sent ? `Test sent to ${testEmail}.` : `Test failed: ${r.sampleError ?? "unknown"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send test failed");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendAll = async () => {
    setError(null);
    setResult(null);
    const ok = window.confirm(
      "Send this week's issue to ALL opted-in subscribers? This goes to real inboxes and cannot be undone.",
    );
    if (!ok) return;
    setSendingAll(true);
    try {
      const r = (await api.sendAllNewsletter()) as SendOutcome;
      trackCms("cms_newsletter_sent_all", { sent: r.sent, attempted: r.attempted });
      if (r.skippedAlreadySent) {
        setResult(`Already sent this week (${r.weekStarting}). Nothing sent.`);
      } else {
        setResult(`Sent to ${r.sent}/${r.attempted} subscribers${r.failed ? ` (${r.failed} failed)` : ""}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send to all failed");
    } finally {
      setSendingAll(false);
    }
  };

  const c = preview?.content;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Weekly Newsletter</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          This week's editorial issue is auto-assembled from your live debates. Send a test to yourself first, then
          send to all opted-in subscribers. The Friday 9am Asia/Dubai cron can also send automatically when enabled.
        </p>
      </div>

      <div className="bg-card border border-border p-6 mb-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewLoading}
          className="bg-foreground text-background px-5 py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-2"
        >
          {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          {previewLoading ? "Building…" : "Refresh preview"}
        </button>

        <div className="flex items-center gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="border border-border bg-background px-3 py-2 text-sm w-56"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={sendingTest}
            className="bg-foreground text-background px-4 py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-2"
          >
            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send test
          </button>
        </div>

        <button
          type="button"
          onClick={handleSendAll}
          disabled={sendingAll}
          className="bg-primary text-white px-5 py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-2 ml-auto"
        >
          {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          {sendingAll ? "Sending…" : "Send to all subscribers"}
        </button>

        {result && (
          <span className="text-emerald-500 text-sm inline-flex items-center gap-1.5 w-full">
            <Check className="w-4 h-4" />
            {result}
          </span>
        )}
        {error && (
          <span className="text-destructive text-sm inline-flex items-center gap-1.5 w-full">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
        )}
      </div>

      {schedule && (
        <div className="bg-card border border-border p-6 mb-8">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Automated weekly send
          </h2>
          <p className="text-muted-foreground text-xs mb-4">
            When enabled, the issue auto-sends to all opted-in subscribers at this time each week. Changes take effect immediately.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Day</label>
              <select
                value={schedule.dayOfWeek}
                onChange={(e) => setSchedule({ ...schedule, dayOfWeek: Number(e.target.value) })}
                className="border border-border bg-background px-3 py-2 text-sm"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Time</label>
              <input
                type="time"
                value={`${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  setSchedule({ ...schedule, hour: h || 0, minute: m || 0 });
                }}
                className="border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Timezone</label>
              <select
                value={schedule.timezone}
                onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}
                className="border border-border bg-background px-3 py-2 text-sm"
              >
                {(COMMON_TZS.includes(schedule.timezone) ? COMMON_TZS : [schedule.timezone, ...COMMON_TZS]).map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="bg-foreground text-background px-5 py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-2"
            >
              {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Save schedule
            </button>
            {scheduleSaved && (
              <span className="text-emerald-500 text-sm inline-flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                {schedule.enabled ? `Auto-send on ${DAYS[schedule.dayOfWeek]}s at ${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")} ${schedule.timezone}.` : "Saved — automated send is off."}
              </span>
            )}
          </div>
        </div>
      )}

      {c && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-card border border-border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Editorial preview · Issue {String(c.issueNumber).padStart(3, "0")} · {c.weekOf}
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{c.subjectLine}</p>
                <p className="text-muted-foreground text-xs mt-1">{c.previewText}</p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">
                  The Week's Signal · {c.signal.category} · {c.signal.label} · {c.signal.totalVotes} votes
                </p>
                <p className="font-medium">{c.signal.question}</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {c.signal.options.map((o, i) => (
                    <li key={i}>{o.percentage}% · {o.text}</li>
                  ))}
                </ul>
                <p className="text-xs italic mt-2">{c.signal.takeaway}</p>
              </div>
              {c.split && (
                <div className="border-l-2 border-border pl-3">
                  <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">The Split · {c.split.topResult}</p>
                  <p className="font-medium text-sm">{c.split.question}</p>
                  <p className="text-xs italic mt-1">{c.split.takeaway}</p>
                </div>
              )}
              {c.oneToWatch && (
                <div className="border-l-2 border-border pl-3">
                  <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">One to Watch · {c.oneToWatch.kind}</p>
                  <p className="font-medium text-sm">{c.oneToWatch.question}</p>
                  <p className="text-xs italic mt-1">{c.oneToWatch.takeaway}</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-card border border-border p-2 overflow-hidden">
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground p-4">Email rendering</p>
            <iframe title="Newsletter preview" srcDoc={preview!.html} className="w-full h-[800px] bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
