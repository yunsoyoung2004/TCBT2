"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, EmptyState, textareaClass } from "@/components/ui/primitives";
import { sendMessage, listMessages } from "@/lib/api/clinician-message-api";
import { useRealtimeInvalidate } from "@/lib/supabase/use-realtime-invalidate";
import { useAuth } from "@/lib/auth/auth-context";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Async patient<->clinician message thread -- shared by the patient-
 * facing page (src/components/pages/patient-messages-page.tsx) and the
 * clinician-facing panel on the patient detail page. One flat thread per
 * participant; "mine" styling compares against the logged-in user's own
 * auth id, not their role, so it stays correct regardless of which side
 * is viewing. */
export function ClinicianMessageThread({ participantId }: { participantId: string }) {
  const { t } = useT();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const messagesQuery = useQuery({
    queryKey: ["clinician-messages", participantId],
    queryFn: () => listMessages(participantId),
    enabled: Boolean(participantId),
  });
  useRealtimeInvalidate([{ table: "clinician_messages", filter: `participant_id=eq.${participantId}` }], ["clinician-messages", participantId]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(participantId, body),
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["clinician-messages", participantId] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : t("messages.sendFailed"));
    },
  });

  const messages = messagesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-panel border border-border bg-surface-subtle p-3">
        {messages.length === 0 ? (
          <EmptyState title={t("messages.empty")} />
        ) : (
          messages.map((message) => {
            const mine = message.senderUserId === user?.id;
            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-panel px-3 py-2 text-sm", mine ? "bg-clinical-blue text-white" : "border border-border bg-surface text-text-primary")}>
                  <div className="whitespace-pre-wrap">{message.body}</div>
                  <div className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-text-muted")}>{formatTimestamp(message.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2">
        <textarea
          className={cn(textareaClass, "min-h-[60px] flex-1")}
          placeholder={t("messages.placeholder")}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (draft.trim()) sendMutation.mutate(draft.trim());
            }
          }}
        />
        <Button loading={sendMutation.isPending} disabled={!draft.trim()} onClick={() => sendMutation.mutate(draft.trim())}>
          {t("messages.send")}
        </Button>
      </div>
    </div>
  );
}
