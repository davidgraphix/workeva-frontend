"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  FigureCard,
  IntelligenceNotEnabled,
} from "@/components/features/intelligence";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, Card, CardBody } from "@/components/ui/surfaces";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useAsk,
  useAssistantStatus,
  useConversation,
  useConversations,
  useDeleteConversation,
} from "@/hooks/use-intelligence";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { AiMessageRole, AiOutcome } from "@/lib/types";

/**
 * Ask Workeva.
 *
 * Three things on this page are deliberate and worth stating.
 *
 * **The figures are shown, not just the prose.** Every answer renders the numbers it was written
 * from, beneath the sentence, with each one's period and qualification. They are the evidence for
 * the claim, so a reader can check it rather than taking the sentence on trust — and an answer
 * with no figures is visibly an answer with no figures.
 *
 * **The allowance is shown before it runs out.** A user told "12 questions left today" behaves
 * differently from one who discovers the limit by hitting it.
 *
 * **It says when a model did not write the answer.** With no provider configured the prose comes
 * from the built-in template provider; the figures are identical and only the writing is plainer,
 * and the page says so rather than implying a model was involved.
 */
export default function AskPage() {
  const { can } = useSession();
  const toast = useToast();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const status = useAssistantStatus();
  const conversations = useConversations({ pageSize: 25 });
  const conversation = useConversation(conversationId);
  const ask = useAsk();
  const remove = useDeleteConversation();

  const transcriptEnd = useRef<HTMLDivElement>(null);

  // Scroll the newest turn into view after an answer lands, so a long transcript does not leave
  // the reader looking at the top of a conversation they have just added to.
  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation.data?.messages.length, ask.isPending]);

  if (!can(Permission.intelligenceAsk)) return <NoAccess />;

  if (status.error instanceof ApiError && status.error.status === 404) {
    return (
      <>
        <PageHeader title="Ask Workeva" description="Questions about your organization's data." />
        <IntelligenceNotEnabled />
      </>
    );
  }

  const limit = status.data?.dailyQuestionLimit ?? 0;
  const used = status.data?.questionsUsedToday ?? 0;
  const remaining = Math.max(0, limit - used);
  const maxLength = status.data?.maxQuestionLength ?? 600;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = question.trim();
    if (trimmed.length < 3 || ask.isPending) return;

    try {
      const answer = await ask.mutateAsync({ conversationId, question: trimmed });
      setConversationId(answer.conversationId);
      setQuestion("");
    } catch (error) {
      // 429 is the allowance, which has its own message; anything else gets the API's own words.
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Something went wrong asking that. Please try again.",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Ask Workeva"
        description="Questions about your own organization's attendance, leave, projects and tasks."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setConversationId(null);
              setQuestion("");
            }}
          >
            <MessageSquarePlus aria-hidden className="size-4" />
            New conversation
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        {/* ---------- Conversations ---------- */}
        <aside className="order-2 lg:order-1">
          <Card>
            <CardBody className="space-y-1">
              <p className="px-1 pb-1 text-xs font-medium text-slate-500">Your conversations</p>

              {conversations.isLoading && <Skeleton className="h-16" />}

              {conversations.data?.items.length === 0 && (
                <p className="px-1 py-2 text-sm text-slate-500">
                  Nothing yet. Ask something below.
                </p>
              )}

              {conversations.data?.items.map((item) => (
                <div key={item.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConversationId(item.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-[--radius-field] px-2 py-1.5 text-left text-sm transition-colors",
                      item.id === conversationId
                        ? "bg-brand-50 font-medium text-brand-900"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="block truncate">{item.title}</span>
                    <span className="block text-xs text-slate-400">
                      {new Date(item.lastMessageAt).toLocaleDateString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleting(item.id)}
                    aria-label={`Delete conversation: ${item.title}`}
                    className="shrink-0 rounded-[--radius-field] p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-danger-50 hover:text-danger-700 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </button>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* The honesty panel. Both lines matter: what is left, and who wrote the prose. */}
          {status.data && (
            <Card className="mt-3">
              <CardBody className="space-y-2 text-xs text-slate-600">
                <p>
                  <span className="numeric font-medium text-slate-900">{remaining}</span> of{" "}
                  <span className="numeric">{limit}</span> questions left today for your
                  organization.
                </p>

                {!status.data.writtenByModel && (
                  <p>
                    No AI service is configured, so answers are written from a template. The
                    figures are exactly the same; only the wording is plainer.
                  </p>
                )}

                {status.data.availableTopics.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-medium text-slate-700">
                      What can I ask about?
                    </summary>
                    <ul className="mt-1.5 space-y-0.5 text-slate-500">
                      {status.data.availableTopics.map((topic) => (
                        <li key={topic}>{topic}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardBody>
            </Card>
          )}
        </aside>

        {/* ---------- Transcript ---------- */}
        <div className="order-1 min-w-0 lg:order-2">
          <Card>
            <CardBody>
              {!conversationId && !ask.isPending && (
                <EmptyState
                  icon={<Sparkles aria-hidden className="size-5" />}
                  title="Ask about your organization's figures"
                  description="Try: how is attendance this month, which projects are overdue, who has the most open tasks, or how much leave is waiting for a decision."
                />
              )}

              {conversation.isLoading && conversationId && <Skeleton className="h-32" />}

              <div className="space-y-5">
                {conversation.data?.messages.map((message) => (
                  <div key={message.id}>
                    {message.role === AiMessageRole.User ? (
                      <div className="flex justify-end">
                        <p className="max-w-[85%] rounded-[--radius-card] bg-brand-600 px-3 py-2 text-sm text-white">
                          {message.body}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">
                          {message.body}
                        </p>

                        {/* The evidence. Rendered by the app from the figures the answer was
                            written from, so the numbers on screen are the backend's and not the
                            model's recollection of them. */}
                        {message.figures.length > 0 && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {message.figures.map((figure) => (
                              <FigureCard key={figure.key} figure={figure} />
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {message.outcome === AiOutcome.Refused && (
                            <Badge tone="neutral">Outside what Workeva holds</Badge>
                          )}
                          {message.outcome === AiOutcome.Unavailable && (
                            <Badge tone="warning">Service unavailable</Badge>
                          )}
                          {message.providerName && (
                            <span>
                              {message.providerName === "workeva.deterministic"
                                ? "Written from a template"
                                : `Written by ${message.providerModel ?? message.providerName}`}
                            </span>
                          )}
                          {message.promptVersion && <span>({message.promptVersion})</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {ask.isPending && (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                )}

                <div ref={transcriptEnd} />
              </div>
            </CardBody>
          </Card>

          {/* ---------- Composer ---------- */}
          <form onSubmit={submit} className="mt-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="question" className="sr-only">
                  Your question
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, maxLength))}
                  onKeyDown={(event) => {
                    // Enter sends; shift+enter makes a new line. The same convention as every
                    // other message box a person has used.
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit(event);
                    }
                  }}
                  rows={2}
                  maxLength={maxLength}
                  placeholder="How is attendance this month?"
                  className="w-full resize-y rounded-[--radius-field] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {question.length}/{maxLength}
                  {remaining === 0 && " · no questions left today"}
                </p>
              </div>

              <Button
                type="submit"
                loading={ask.isPending}
                disabled={question.trim().length < 3 || remaining === 0}
                className="mb-6"
              >
                <Send aria-hidden className="size-4" />
                Ask
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;

          try {
            await remove.mutateAsync({ id: deleting });
            if (deleting === conversationId) setConversationId(null);
            toast.success("Conversation deleted.");
          } catch {
            toast.error("Could not delete that conversation.");
          } finally {
            setDeleting(null);
          }
        }}
        title="Delete this conversation?"
        message="The questions and answers go. Your organization's record that the assistant was used stays, because it carries no question text."
        confirmLabel="Delete"
        tone="danger"
        loading={remove.isPending}
      />
    </>
  );
}
