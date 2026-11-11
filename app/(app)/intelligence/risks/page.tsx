"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  IntelligenceNotEnabled,
  NothingDetected,
  RiskCard,
} from "@/components/features/intelligence";
import { useSession } from "@/components/session-provider";
import { Checkbox, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/data-table";
import { Card, CardBody } from "@/components/ui/surfaces";
import { CardSkeleton, QueryBoundary } from "@/components/ui/states";
import { useRisks } from "@/hooks/use-intelligence";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { RiskBand, riskBandLabels, riskCategoryLabels } from "@/lib/types";

/**
 * Operational risk.
 *
 * The standing caveat sits at the top of the page and on every card, because cards get
 * screenshotted and forwarded to people who never saw the page. It says the two things that
 * matter: these are estimates from measured figures, and no decision about anybody follows from
 * them automatically.
 *
 * Insufficient-data assessments are off by default and available on request. They exist so that
 * "we cannot assess this" is recorded rather than guessed at — a risk list padded with unknowns
 * is a list nobody reads, but knowing which subjects cannot be assessed is itself useful.
 */
export default function RisksPage() {
  const { can } = useSession();

  const [category, setCategory] = useState("");
  const [band, setBand] = useState("");
  const [includeInsufficient, setIncludeInsufficient] = useState(false);
  const [page, setPage] = useState(1);

  const risks = useRisks({
    category: category || undefined,
    minimumBand: band === "" ? undefined : (Number(band) as RiskBand),
    includeInsufficientData: includeInsufficient || undefined,
    page,
    pageSize: 20,
  });

  if (!can(Permission.intelligenceRiskView)) return <NoAccess />;

  if (risks.error instanceof ApiError && risks.error.status === 404) {
    return (
      <>
        <PageHeader title="Operational risk" description="Where delivery or attendance may be heading." />
        <IntelligenceNotEnabled />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Operational risk"
        description="Estimates from your own measured figures, each with the evidence behind it."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Category"
              containerClassName="w-44"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {Object.entries(riskCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              label="At least"
              containerClassName="w-40"
              value={band}
              onChange={(event) => {
                setBand(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Any level</option>
              {[RiskBand.Moderate, RiskBand.Elevated, RiskBand.High].map((value) => (
                <option key={value} value={value}>
                  {riskBandLabels[value]}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {/* The caveat, stated once at the top and repeated on each card. */}
      <Card className="mb-4">
        <CardBody className="flex items-start gap-2.5 text-sm text-slate-600">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p>
            These are estimates calculated from measured figures — not facts, and not decisions.
            Each one shows the numbers it was worked out from and the method that produced it, so
            you can disagree with it. Workeva does not make employment, disciplinary or pay
            decisions; a manager does.
          </p>
        </CardBody>
      </Card>

      <div className="mb-4">
        <Checkbox
          label="Include subjects that can't be assessed yet"
          description="Where there isn't enough history to say anything useful. Shown without a score, because a score there would be meaningless."
          checked={includeInsufficient}
          onChange={(event) => {
            setIncludeInsufficient(event.target.checked);
            setPage(1);
          }}
        />
      </div>

      <QueryBoundary
        isLoading={risks.isLoading}
        error={risks.error}
        data={risks.data}
        onRetry={() => risks.refetch()}
        loadingFallback={
          <div className="grid gap-3 lg:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        emptyState={
          <NothingDetected
            title="No elevated risk"
            description="Nothing currently scores above the filters you've set. The dashboard shows when the assessment last ran."
          />
        }
      >
        {(data) => (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              {data.items.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>

            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
