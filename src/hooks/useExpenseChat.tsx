import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ExpenseMessage {
  id: string;
  expense_id: string;
  sender_id: string;
  message_text: string;
  is_system_message: boolean;
  created_at: string;
  sender?: {
    name: string;
    display_name: string | null;
    profile_image_url: string | null;
  };
}

export function useExpenseMessages(expenseId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expense-messages', expenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_messages')
        .select('*')
        .eq('expense_id', expenseId!)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, display_name, profile_image_url')
        .in('user_id', senderIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || null,
      })) as ExpenseMessage[];
    },
    enabled: !!expenseId && !!user,
    refetchInterval: 6000, // Poll every 6 seconds
  });
}

export function useSendExpenseMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ expenseId, messageText }: { expenseId: string; messageText: string }) => {
      const trimmed = messageText.trim().slice(0, 1000);
      if (!trimmed) throw new Error('Message cannot be empty');

      const { data, error } = await supabase
        .from('expense_messages')
        .insert({
          expense_id: expenseId,
          sender_id: user!.id,
          message_text: trimmed,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expense-messages', variables.expenseId] });
    },
  });
}
