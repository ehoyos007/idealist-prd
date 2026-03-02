import { useRef, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConversationMessage } from '@/types/project';

export interface SavedSession {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  messages: ConversationMessage[];
  transcript?: string;
  metadata: Record<string, unknown>;
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  projectId?: string;
  updatedAt: string;
}

function serializeMessages(messages: ConversationMessage[]): unknown[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp.toISOString(),
    source: m.source,
    attachedFile: m.attachedFile
      ? {
          id: m.attachedFile.id,
          name: m.attachedFile.name,
          type: m.attachedFile.type,
          size: m.attachedFile.size,
          uploadedAt: m.attachedFile.uploadedAt.toISOString(),
        }
      : undefined,
  }));
}

function deserializeMessages(raw: unknown[]): ConversationMessage[] {
  return (raw || []).map((m: unknown) => {
    const msg = m as Record<string, unknown>;
    return {
      role: msg.role as ConversationMessage['role'],
      content: msg.content as string,
      timestamp: new Date(msg.timestamp as string),
      source: msg.source as ConversationMessage['source'],
      attachedFile: msg.attachedFile
        ? {
            ...(msg.attachedFile as Record<string, unknown>),
            uploadedAt: new Date((msg.attachedFile as Record<string, string>).uploadedAt),
          } as ConversationMessage['attachedFile']
        : undefined,
    };
  });
}

export function useSessionPersistence() {
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pausedSessions, setPausedSessions] = useState<SavedSession[]>([]);

  const saveSession = useCallback(
    async (
      messages: ConversationMessage[],
      status: 'active' | 'paused' | 'completed' | 'abandoned',
      sessionId: string,
      remixSourceName?: string
    ) => {
      const now = new Date().toISOString();
      const transcript = messages
        .filter((m) => m.role !== 'context')
        .map((m) => {
          const label = m.role === 'user' ? (m.source === 'text' ? 'User (typed)' : 'User') : 'AI';
          return `${label}: ${m.content}`;
        })
        .join('\n\n');

      const record: Record<string, unknown> = {
        id: sessionId,
        status,
        messages: serializeMessages(messages),
        transcript,
        metadata: { remixSourceName },
        updated_at: now,
      };

      if (status === 'paused') record.paused_at = now;
      if (status === 'completed') record.completed_at = now;

      const { error } = await supabase
        .from('prd_sessions')
        .upsert(record, { onConflict: 'id' });

      if (error) {
        console.error('Failed to save session:', error.message);
      }
    },
    []
  );

  const loadSession = useCallback(async (id: string): Promise<SavedSession | null> => {
    const { data, error } = await supabase
      .from('prd_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Failed to load session:', error?.message);
      return null;
    }

    return {
      id: data.id,
      status: data.status,
      messages: deserializeMessages(data.messages as unknown[]),
      transcript: data.transcript,
      metadata: (data.metadata as Record<string, unknown>) || {},
      startedAt: data.started_at,
      pausedAt: data.paused_at,
      resumedAt: data.resumed_at,
      completedAt: data.completed_at,
      projectId: data.project_id,
      updatedAt: data.updated_at,
    };
  }, []);

  const fetchPausedSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('prd_sessions')
      .select('*')
      .eq('status', 'paused')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch paused sessions:', error.message);
      return;
    }

    const sessions: SavedSession[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      status: row.status as SavedSession['status'],
      messages: deserializeMessages(row.messages as unknown[]),
      transcript: row.transcript as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      startedAt: row.started_at as string,
      pausedAt: row.paused_at as string | undefined,
      resumedAt: row.resumed_at as string | undefined,
      completedAt: row.completed_at as string | undefined,
      projectId: row.project_id as string | undefined,
      updatedAt: row.updated_at as string,
    }));

    setPausedSessions(sessions);
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.from('prd_sessions').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete session:', error.message);
    }
    setPausedSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const startAutoSave = useCallback(
    (
      getMessages: () => ConversationMessage[],
      sessionId: string,
      remixSourceName?: string
    ) => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      autoSaveIntervalRef.current = setInterval(() => {
        const msgs = getMessages();
        if (msgs.length > 0) {
          saveSession(msgs, 'active', sessionId, remixSourceName);
        }
      }, 60_000);
    },
    [saveSession]
  );

  const stopAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  }, []);

  // Fetch paused sessions on mount
  useEffect(() => {
    fetchPausedSessions();
  }, [fetchPausedSessions]);

  return {
    pausedSessions,
    saveSession,
    loadSession,
    fetchPausedSessions,
    deleteSession,
    startAutoSave,
    stopAutoSave,
  };
}
