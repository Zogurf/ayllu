import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';
import { EmptyCommunityState } from './EmptyCommunityState';

type Conversation = { id: string; title: string; favor_id: string; requester_id: string; author_id: string };
type Message = { id: string; sender_id: string; body: string; created_at: string };

export const MessagingInboxModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [userId, setUserId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const sending = useRef(false);
  const pendingMessage = useRef<{ id: string; body: string; conversationId: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<any>(null);

  const loadConversations = useCallback(async () => {
    if (!supabase) return;
    setLoadingList(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? '';
      setUserId(uid);
      const { data, error: queryError } = await supabase
        .from('conversations')
        .select('id,title,favor_id,requester_id,author_id')
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      const rows = (data ?? []) as Conversation[];
      setConversations(rows);
      await Promise.all(rows.map(({ id }) => supabase!.rpc('mark_conversation_delivered', { p_id: id })));
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (conversation: Conversation) => {
    if (!supabase) return;
    const { error: deliveredError } = await supabase.rpc('mark_conversation_delivered', { p_id: conversation.id });
    if (deliveredError) throw deliveredError;
    const { error: readError } = await supabase.rpc('mark_conversation_read', { p_id: conversation.id });
    if (readError) throw readError;
    const [{ data: rows, error: messageError }, { data: participants, error: participantError }] = await Promise.all([
      supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', conversation.id).order('created_at'),
      supabase.from('conversation_participants').select('user_id,last_delivered_at,last_read_at').eq('conversation_id', conversation.id),
    ]);
    if (messageError) throw messageError;
    if (participantError) throw participantError;
    setMessages((rows ?? []) as Message[]);
    const other = participants?.find((participant) => participant.user_id !== userId);
    setReadAt(other?.last_read_at ?? null);
    setDeliveredAt(other?.last_delivered_at ?? null);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [userId]);

  useEffect(() => {
    if (!visible || !supabase) return;
    let active = true;
    void Promise.resolve().then(() => loadConversations()).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar la bandeja.');
    });
    return () => { active = false; };
  }, [visible, loadConversations]);

  useEffect(() => {
    if (!visible || selected) return;
    const timer = setInterval(() => {
      void loadConversations().catch((e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar la bandeja.'));
    }, 5000);
    return () => clearInterval(timer);
  }, [visible, selected, loadConversations]);

  useEffect(() => {
    if (!visible || !selected) return;
    const timer = setInterval(() => {
      void loadThread(selected).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar el chat.'));
    }, 4000);
    void Promise.resolve().then(() => loadThread(selected)).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo abrir el chat.'));
    return () => clearInterval(timer);
  }, [visible, selected, loadThread]);

  useEffect(() => {
    const client = supabase;
    if (!visible || !client || !userId) return;
    const channel = client.channel(`inbox:${userId}:${selected?.id ?? 'list'}`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void (selected ? loadThread(selected) : loadConversations()).catch(() => setError('No se pudo actualizar la conversación.'));
      }, 250);
    };
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, refresh);
    if (selected) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.id}` }, refresh);
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [visible, userId, selected, loadThread, loadConversations]);

  const send = async () => {
    if (!supabase || !selected || !draft.trim() || sending.current) return;
    sending.current = true;
    setIsSending(true);
    setError('');
    try {
      if (pendingMessage.current?.body !== draft.trim() || pendingMessage.current?.conversationId !== selected.id) {
        pendingMessage.current = { id: Crypto.randomUUID(), body: draft.trim(), conversationId: selected.id };
      }
      const pending = pendingMessage.current;
      const { error: sendError } = await supabase.rpc('send_message', {
        p_id: pending.id,
        p_conversation_id: pending.conversationId,
        p_body: pending.body,
      });
      if (sendError) throw sendError;
      pendingMessage.current = null;
      setDraft('');
      await loadThread(selected);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje. Inténtalo nuevamente.');
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { setSelected(null); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            {selected ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setSelected(null)}
                style={styles.backButton}
                accessibilityLabel="Volver a la lista de mensajes"
              >
                <MaterialIcons name="arrow-back" size={22} color={Colors.secondary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.inboxIconWrap}>
                <MaterialIcons name="forum" size={20} color={Colors.primary} />
              </View>
            )}

            <View style={styles.headerTitles}>
              <Text style={styles.title} numberOfLines={1}>
                {selected?.title ? selected.title : 'Mensajería Vecinal'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {selected ? 'Canal interno cifrado por participante' : 'Conversaciones directas y seguras'}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => { setSelected(null); onClose(); }}
              style={styles.closeButton}
              accessibilityLabel="Cerrar mensajería"
            >
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={16} color={Colors.emergencyDark} />
              <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Content: Selected Thread vs Conversation List */}
          {selected ? (
            <View style={styles.threadContainer}>
              <ScrollView
                ref={scrollRef}
                style={styles.threadScroll}
                contentContainerStyle={styles.threadContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.securityPill}>
                  <MaterialIcons name="verified-user" size={13} color={Colors.primary} />
                  <Text style={styles.securityPillText}>
                    Teléfonos y datos protegidos. Solo ustedes dos pueden leer estos mensajes.
                  </Text>
                </View>

                {messages.length === 0 ? (
                  <View style={styles.emptyMessages}>
                    <Text style={styles.emptyMessagesText}>
                      Envía un primer mensaje para coordinar este favor.
                    </Text>
                  </View>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === userId;
                    const isRead = Boolean(readAt && readAt >= message.created_at);
                    const isDelivered = Boolean(deliveredAt && deliveredAt >= message.created_at);

                    return (
                      <View
                        key={message.id}
                        style={[styles.bubbleWrapper, isMine ? styles.mineWrapper : styles.theirsWrapper]}
                      >
                        <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirsBubble]}>
                          <Text style={[styles.messageBody, isMine && styles.mineMessageBody]}>
                            {message.body}
                          </Text>
                        </View>
                        {isMine && (
                          <View style={styles.receiptRow}>
                            <MaterialIcons
                              name={isRead ? 'done-all' : isDelivered ? 'done-all' : 'done'}
                              size={13}
                              color={isRead ? Colors.primary : Colors.slateDim}
                            />
                            <Text style={styles.receiptText}>
                              {isRead ? 'Leído' : isDelivered ? 'Entregado' : 'Enviado'}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Compose Bar */}
              <View style={styles.composeContainer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Escribe tu mensaje vecinal..."
                  placeholderTextColor={Colors.slateDim}
                  maxLength={2000}
                  style={styles.composeInput}
                  multiline
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => { void send(); }}
                  disabled={isSending || !draft.trim()}
                  style={[
                    styles.sendButton,
                    (!draft.trim() || isSending) && styles.sendButtonDisabled,
                  ]}
                  accessibilityLabel={isSending ? "Enviando mensaje" : "Enviar mensaje"}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <MaterialIcons name="send" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {loadingList && conversations.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Cargando conversaciones...</Text>
                </View>
              ) : conversations.length === 0 ? (
                <EmptyCommunityState
                  title="No tienes conversaciones aún"
                  description="Cuando te pongas en contacto con un vecino o respondas a un favor con mensajería interna, tus conversaciones aparecerán aquí."
                  icon="forum"
                />
              ) : (
                conversations.map((conversation) => {
                  const isAuthor = conversation.author_id === userId;
                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={conversation.id}
                      style={styles.conversationCard}
                      onPress={() => { setError(''); setSelected(conversation); }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.conversationIconCircle}>
                        <MaterialIcons
                          name={isAuthor ? 'volunteer-activism' : 'chat-bubble-outline'}
                          size={20}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.conversationTitle} numberOfLines={1}>
                          {conversation.title || 'Favor Comunitario'}
                        </Text>
                        <Text style={styles.conversationSubtitle}>
                          {isAuthor ? 'Mensaje sobre tu publicación' : 'Tu pedido de apoyo mutuo'}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={Colors.slateDim} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    height: '84%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inboxIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.slateDim,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: Colors.emergencyDark,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  threadContainer: {
    flex: 1,
  },
  threadScroll: {
    flex: 1,
  },
  threadContent: {
    paddingVertical: 14,
    gap: 10,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  securityPillText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyMessagesText: {
    fontSize: 12.5,
    color: Colors.slateDim,
    textAlign: 'center',
  },
  bubbleWrapper: {
    marginBottom: 6,
  },
  mineWrapper: {
    alignItems: 'flex-end',
  },
  theirsWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  mineBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirsBubble: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  messageBody: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.secondary,
  },
  mineMessageBody: {
    color: '#ffffff',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    marginRight: 4,
  },
  receiptText: {
    fontSize: 10,
    color: Colors.slateDim,
    fontWeight: '500',
  },
  composeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composeInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13.5,
    color: Colors.secondary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.slateDim,
    opacity: 0.5,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.secondaryMuted,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  conversationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
  conversationSubtitle: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    marginTop: 2,
  },
});
