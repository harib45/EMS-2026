import { useState, useRef, useEffect } from 'react';
import { useExpenseMessages, useSendExpenseMessage } from '@/hooks/useExpenseChat';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, MessageCircle, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExpenseChatPanelProps {
  expenseId: string;
}

export function ExpenseChatPanel({ expenseId }: ExpenseChatPanelProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useExpenseMessages(expenseId);
  const sendMessage = useSendExpenseMessage();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      await sendMessage.mutateAsync({ expenseId, messageText: trimmed });
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderName = (msg: any) => {
    if (msg.is_system_message) return 'System';
    return msg.sender?.display_name || msg.sender?.name || 'Unknown';
  };

  const getSenderInitial = (msg: any) => {
    const name = getSenderName(msg);
    return name.charAt(0).toUpperCase();
  };

  return (
    <Card className="flex flex-col h-[400px]">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Expense Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !messages?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const isSystem = msg.is_system_message;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-xs text-muted-foreground">
                        <Bot className="h-3 w-3" />
                        {msg.message_text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={msg.sender?.profile_image_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getSenderInitial(msg)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                      <p className={cn('text-[11px] mb-0.5 text-muted-foreground', isOwn ? 'text-right' : 'text-left')}>
                        {getSenderName(msg)}
                      </p>
                      <div
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm shadow-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                        )}
                      >
                        {msg.message_text}
                      </div>
                      <p className={cn('text-[10px] mt-0.5 text-muted-foreground', isOwn ? 'text-right' : 'text-left')}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 flex gap-2">
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            disabled={sendMessage.isPending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={sendMessage.isPending || !text.trim()}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
