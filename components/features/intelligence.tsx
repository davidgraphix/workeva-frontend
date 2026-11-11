"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge, Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import {
  AlertResponse,
  AlertStatus,
  FigureKind,
  FigureResponse,
  FigureRowResponse,
  IntelligenceSeverity,
  RiskBand,
  RiskResponse,
  RunStatusResponse,
  alertCategoryLabels,
  alertStatusLabels,
  figureKindLabels,
  riskBandLabels,
  riskCategoryLabels,
  riskConfidenceLabels,
  severityLabels,
} from "@/lib/types";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Workeva Intelligence components.
 *
 * One idea runs through all of them, and it is the reason this file is not just a set of charts:
 * **a figure is never shown as a bare number**. Every figure arrives from the server with the
 * period it covers, the note that qualifies it, and whether it is a measurement, an
 * approximation, a prediction or unavailable - and these components render all four differently,
 * so the UI cannot accidentally present an estimate as a fact or an unavailable figure as a zero.
 *
 * The visual language is deliberately the same as the rest of Workeva. Nothing here glows,
 * sparkles, or announces that a computer was involved: these are the company's own numbers, and
 * dressing them up as machine output would make a user trust them less rather than more.
 */

// =============================================================================================
// Figures
// =============================================================================================

const severityTone: Record<IntelligenceSeverity, Tone> = {
  [IntelligenceSeverity.Information]: "neutral",
  [IntelligenceSeverity.Low]: "info",
  [IntelligenceSeverity.Medium]: "warning",
  [IntelligenceSeverity.High]: "danger",
  [IntelligenceSeverity.Critical]: "danger",
};

const bandTone: Record<RiskBand, Tone> = {
  [RiskBand.Low]: "success",
  [RiskBand.Moderate]: "info",
  [RiskBand.Elevated]: "warning",
  [RiskBand.High]: "danger",
};

/** Numbers as a person writes them: no trailing zeros, thousands separated. */
function formatValue(value: number | null, unit: string): string {
  if (value === null) return "—";

  const rounded = Math.abs(value % 1) < 0.005 ? Math.round(value) : Math.round(value * 10) / 10;
  const text = rounded.toLocaleString(undefined, { maximumFractionDigits: 1 });

  if (unit === "%") return `${text}%`;
  return unit ? `${text} ${unit}` : text;
}

/**
 * The qualification badge.
 *
 * Absent for a plain measurement, because labelling every counted figure "Measured" would turn
 * the word into furniture and stop anybody reading it on the figures that need it.
 */
function KindBadge({ kind }: { kind: FigureKind }) {
  if (kind === FigureKind.Measured) return null;

  const tone: Record<FigureKind, Tone> = {
    [FigureKind.Measured]: "neutral",
    [FigureKind.Estimated]: "neutral",
    [FigureKind.Predicted]: "info",
    [FigureKind.Unavailable]: "warning",
  };

  return (
    <Badge tone={tone[kind]} className="shrink-0">
      {figureKindLabels[kind]}
    </Badge>
  );
}

/**
 * One figure, with everything needed to read it correctly.
 *
 * An unavailable figure shows its reason instead of a number — never a zero, which is the
 * mistake that turns a missing integration into a confident claim that nothing is happening.
 */
export function FigureCard({
  figure,
  compact = false,
}: {
  figure: FigureResponse;
  compact?: boolean;
}) {
  const unavailable = figure.kind === FigureKind.Unavailable;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{figure.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{figure.periodLabel}</p>
          </div>
          <KindBadge kind={figure.kind} />
        </div>

        {unavailable ? (
          <p className="mt-3 text-sm text-slate-500">
            {figure.note ?? "This figure could not be calculated."}
          </p>
        ) : (
          <>
            <p className="numeric mt-2 text-2xl font-semibold text-slate-900">
              {formatValue(figure.value, figure.unit)}
            </p>

            {!compact && figure.rows.length > 0 && (
              <FigureRows rows={figure.rows} unit={figure.unit} />
            )}

            {figure.note && (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{figure.note}</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/**
 * A breakdown, as a labelled bar list rather than a chart.
 *
 * A bar list is read more accurately than a pie or a donut at this size, needs no legend, and
 * keeps the label beside its own number — so a screen reader reads "Engineering, 14" rather than
 * a colour. The widths are proportional to the largest row, which is what makes the comparison
 * the point rather than the absolute value.
 */
export function FigureRows({
  rows,
  unit,
  limit = 8,
}: {
  rows: FigureRowResponse[];
  unit?: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const shown = expanded ? rows : rows.slice(0, limit);
  const largest = useMemo(() => Math.max(...rows.map((r) => Math.abs(r.value)), 1), [rows]);

  return (
    <div className="mt-3 space-y-1.5">
      {shown.map((row, index) => {
        const width = Math.max(2, Math.round((Math.abs(row.value) / largest) * 100));

        return (
          <div key={`${row.label}-${index}`}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-600">{row.label}</span>
              <span className="numeric shrink-0 font-medium text-slate-900">
                {formatValue(row.value, unit ?? "")}
                {row.secondary !== null && (
                  <span className="ml-1 font-normal text-slate-400">
                    ({row.secondary.toLocaleString(undefined, { maximumFractionDigits: 1 })})
                  </span>
                )}
              </span>
            </div>
            <div
              className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100"
              role="presentation"
            >
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}

      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          <ChevronDown aria-hidden className={cn("size-3 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

/**
 * A trend figure, where the direction matters more than the magnitude.
 *
 * Direction carries an arrow as well as a colour, because a reader who cannot distinguish red
 * from green must still be able to tell improvement from decline.
 */
export function TrendFigure({ figure, goodWhenUp = true }: { figure: FigureResponse; goodWhenUp?: boolean }) {
  const value = figure.value ?? 0;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;

  const tone: Tone = flat ? "neutral" : up === goodWhenUp ? "success" : "danger";
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;

  const colour: Record<Tone, string> = {
    neutral: "text-slate-500",
    info: "text-brand-700",
    success: "text-success-700",
    warning: "text-warning-700",
    danger: "text-danger-700",
  };

  return (
    <Card className="h-full">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{figure.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{figure.periodLabel}</p>
          </div>
          <KindBadge kind={figure.kind} />
        </div>

        <p className={cn("numeric mt-2 flex items-center gap-1.5 text-2xl font-semibold", colour[tone])}>
          <Icon aria-hidden className="size-5" />
          {figure.kind === FigureKind.Unavailable
            ? "—"
            : `${value > 0 ? "+" : ""}${formatValue(value, figure.unit)}`}
        </p>

        {figure.rows.length > 0 && <FigureRows rows={figure.rows} unit={figure.unit} limit={4} />}
        {figure.note && <p className="mt-3 text-xs leading-relaxed text-slate-500">{figure.note}</p>}
      </div>
    </Card>
  );
}

export function FigureGrid({ figures }: { figures: FigureResponse[] }) {
  if (figures.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {figures.map((figure) => (
        <FigureCard key={figure.key} figure={figure} />
      ))}
    </div>
  );
}

// =============================================================================================
// Alerts
// =============================================================================================

/**
 * One alert, with its evidence available rather than hidden.
 *
 * `occurrenceCount` is shown whenever it is above one, because an alert seen fourteen times is a
 * different conversation from one seen once — and because showing it is what makes the
 * deduplication legible rather than looking like the product missed thirteen alerts.
 */
export function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  canManage,
  busy,
}: {
  alert: AlertResponse;
  onAcknowledge?: (alert: AlertResponse) => void;
  onResolve?: (alert: AlertResponse) => void;
  canManage: boolean;
  busy?: boolean;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const tone = severityTone[alert.severity];

  const stripe: Record<Tone, string> = {
    neutral: "bg-slate-300",
    info: "bg-brand-500",
    success: "bg-success-500",
    warning: "bg-warning-500",
    danger: "bg-danger-500",
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div aria-hidden className={cn("w-1 shrink-0", stripe[tone])} />

        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{alert.body}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Badge tone={tone}>{severityLabels[alert.severity]}</Badge>
              <Badge tone="neutral">{alertCategoryLabels[alert.category]}</Badge>
              {alert.status !== AlertStatus.Open && (
                <Badge tone={alert.status === AlertStatus.Resolved ? "success" : "info"}>
                  {alertStatusLabels[alert.status]}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>First seen {new Date(alert.firstSeenAt).toLocaleDateString()}</span>
            <span>Last seen {new Date(alert.lastSeenAt).toLocaleDateString()}</span>
            {alert.occurrenceCount > 1 && (
              <span>Detected {alert.occurrenceCount} times</span>
            )}
            {alert.acknowledgedByName && (
              <span>Acknowledged by {alert.acknowledgedByName}</span>
            )}
          </div>

          {alert.resolutionNote && (
            <p className="mt-2 rounded-[--radius-field] bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
              {alert.resolutionNote}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {alert.evidence.length > 0 && (
              <button
                type="button"
                onClick={() => setShowEvidence((value) => !value)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                <ChevronDown
                  aria-hidden
                  className={cn("size-3 transition-transform", showEvidence && "rotate-180")}
                />
                {showEvidence ? "Hide the numbers" : "Show the numbers"}
              </button>
            )}

            {canManage && alert.status === AlertStatus.Open && onAcknowledge && (
              <Button variant="ghost" size="sm" onClick={() => onAcknowledge(alert)} loading={busy}>
                Acknowledge
              </Button>
            )}

            {canManage && alert.status !== AlertStatus.Resolved && onResolve && (
              <Button variant="secondary" size="sm" onClick={() => onResolve(alert)} loading={busy}>
                <Check aria-hidden className="size-3.5" />
                Resolve
              </Button>
            )}
          </div>

          {showEvidence && <FigureRows rows={alert.evidence} limit={10} />}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================================
// Risk
// =============================================================================================

/**
 * One risk assessment, with everything needed to disagree with it.
 *
 * The explanation, the evidence, the confidence, the method and its version are all on the card
 * rather than behind a tooltip, because a score about a person or a project that a manager cannot
 * interrogate is a score they will either obey blindly or ignore — and both are worse than a
 * simpler number they can argue with.
 *
 * An insufficient-data assessment shows **no score at all**. The stored value is zero and showing
 * it would read as "assessed, and fine", which is the opposite of what it means.
 */
export function RiskCard({ risk }: { risk: RiskResponse }) {
  const [open, setOpen] = useState(false);

  if (risk.isInsufficientData) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{risk.subjectLabel}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {riskCategoryLabels[risk.category] ?? risk.category}
              </p>
            </div>
            <Badge tone="neutral" icon={<Info aria-hidden className="size-3" />}>
              Not enough data
            </Badge>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">{risk.explanation}</p>
          <p className="mt-2 text-xs text-slate-500">{risk.recommendedAction}</p>
        </div>
      </Card>
    );
  }

  const tone = bandTone[risk.band];

  const barColour: Record<Tone, string> = {
    neutral: "bg-slate-400",
    info: "bg-brand-500",
    success: "bg-success-500",
    warning: "bg-warning-500",
    danger: "bg-danger-500",
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{risk.subjectLabel}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {riskCategoryLabels[risk.category] ?? risk.category}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Badge tone={tone}>{riskBandLabels[risk.band]}</Badge>
            {/* Confidence beside the band, always. A high score held with low confidence is a
                different thing from a high score held with high confidence, and a card that
                showed only the band would conflate them. */}
            <Badge tone="neutral">{riskConfidenceLabels[risk.confidence]}</Badge>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="meter"
            aria-valuenow={risk.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${risk.subjectLabel} risk score`}
          >
            <div
              className={cn("h-full rounded-full", barColour[tone])}
              style={{ width: `${Math.max(2, Math.min(100, risk.score))}%` }}
            />
          </div>
          <span className="numeric shrink-0 text-sm font-semibold text-slate-900">
            {risk.score}
            <span className="font-normal text-slate-400">/100</span>
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">{risk.explanation}</p>

        <div className="mt-3 rounded-[--radius-field] bg-brand-50 px-3 py-2">
          <p className="text-xs font-medium text-brand-900">Suggested next step</p>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-800">{risk.recommendedAction}</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          <ChevronDown aria-hidden className={cn("size-3 transition-transform", open && "rotate-180")} />
          {open ? "Hide how this was worked out" : "How this was worked out"}
        </button>

        {open && (
          <div className="mt-2">
            {risk.evidence.length > 0 && <FigureRows rows={risk.evidence} limit={10} />}
            <p className="mt-3 text-xs text-slate-400">
              Method {risk.methodKey} v{risk.methodVersion}, assessed{" "}
              {new Date(risk.assessedAt).toLocaleDateString()} over {risk.periodStart} to{" "}
              {risk.periodEnd}.
            </p>
            {/* The standing caveat. It is on every risk card rather than once on the page,
                because cards get screenshotted and sent to people who never saw the page. */}
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              This is an estimate from the figures above, not a fact and not a decision. Workeva
              does not make employment, disciplinary or pay decisions — a manager does.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================================
// Sweep status
// =============================================================================================

/**
 * When the background sweeps last ran.
 *
 * On the page deliberately. "No alerts" and "the sweep has never run" look identical otherwise,
 * and only one of them is good news — so an empty alerts list is only reassuring beside this.
 */
export function SweepStatus({ runs }: { runs: RunStatusResponse[] }) {
  const names: Record<string, string> = {
    alerts: "Alert detection",
    risk: "Risk assessment",
    insights: "Insight generation",
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      {runs.map((run) => (
        <span key={run.runKind} className="inline-flex items-center gap-1.5">
          {run.lastSucceeded === false ? (
            <CircleAlert aria-hidden className="size-3.5 text-danger-600" />
          ) : run.lastCompletedAt ? (
            <Check aria-hidden className="size-3.5 text-success-600" />
          ) : (
            <Minus aria-hidden className="size-3.5 text-slate-400" />
          )}
          <span>
            {names[run.runKind] ?? run.runKind}:{" "}
            {run.lastCompletedAt
              ? `last ran ${new Date(run.lastCompletedAt).toLocaleString()}`
              : "has not run yet"}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * The line that explains an empty page honestly.
 *
 * Used wherever a section has nothing in it, so that "nothing to show" is distinguishable from
 * "nothing has been checked" — which the sweep status beside it answers.
 */
export function NothingDetected({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <EmptyState
        icon={<BarChart3 aria-hidden className="size-5" />}
        title={title}
        description={description}
      />
    </Card>
  );
}

/**
 * The page shown when the organization does not have the intelligence layer switched on.
 *
 * A 404 from these endpoints is the normal answer for an organization without the feature, not an
 * error — so it renders as an explanation rather than as a retry button, and it names who can turn
 * it on rather than leaving the reader stuck.
 */
export function IntelligenceNotEnabled() {
  return (
    <Card>
      <EmptyState
        icon={<AlertTriangle aria-hidden className="size-5" />}
        title="Workeva Intelligence isn't switched on"
        description="Your company owner or an administrator can enable it in Settings. Everything else in Workeva works exactly as it does now."
      />
    </Card>
  );
}

/**
 * Names the sections a caller cannot see, rather than silently showing a thin page.
 *
 * A dashboard missing half its panels with no explanation reads as broken. Saying which parts are
 * absent, and why, reads as a permission boundary — which is what it is.
 */
export function WithheldNotice({ withheld }: { withheld: string[] }) {
  if (withheld.length === 0) return null;

  return (
    <Card>
      <CardBody className="flex items-start gap-2.5 text-sm text-slate-600">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <p>
          Not shown, because your access doesn&apos;t cover it: {withheld.join(", ")}. Ask an
          administrator if you need it.
        </p>
      </CardBody>
    </Card>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={action} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}
