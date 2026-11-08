import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';

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
  const sending = useRef(false);
  const pendingMessage = useRef<{ id: string; body: string; conversationId: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? '';
    setUserId(uid);
    const { data, error: queryError } = await supabase.from('conversations').select('id,title,favor_id,requester_id,author_id').order('created_at', { ascending: false });
    if (queryError) throw queryError;
    const rows = (data ?? []) as Conversation[];
    setConversations(rows);
    await Promise.all(rows.map(({ id }) => supabase!.rpc('mark_conversation_delivered', { p_id: id })));
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
  }, [userId]);

  useEffect(() => {
    if (!visible || !supabase) return;
    let active = true;
    void Promise.resolve().then(() => loadConversations()).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar la bandeja.'); });
    return () => { active = false; };
  }, [visible, loadConversations]);

  useEffect(() => {
    if (!visible || selected) return;
    const timer = setInterval(() => { void loadConversations().catch((e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar la bandeja.')); }, 5000);
    return () => clearInterval(timer);
  }, [visible, selected, loadConversations]);

  useEffect(() => {
    if (!visible || !selected) return;
    const timer = setInterval(() => { void loadThread(selected).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar el chat.')); }, 4000);
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
    return () => { if (timer) clearTimeout(timer); void client.removeChannel(channel); };
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
      const { error: sendError } = await supabase.rpc('send_message', { p_id: pending.id, p_conversation_id: pending.conversationId, p_body: pending.body });
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

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { setSelected(null); onClose(); }}>
    <View style={styles.overlay}><View style={styles.sheet}>
      <View style={styles.header}>
        {selected && <TouchableOpacity accessibilityRole="button" onPress={() => setSelected(null)} accessibilityLabel="Volver a conversaciones"><MaterialIcons name="arrow-back" size={22} color={Colors.secondary}/></TouchableOpacity>}
        <Text style={styles.title}>{selected?.title ?? 'Mensajes'}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => { setSelected(null); onClose(); }} accessibilityLabel="Cerrar"><MaterialIcons name="close" size={22} color={Colors.slateDim}/></TouchableOpacity>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {selected ? <>
        <ScrollView style={styles.thread}>
          {messages.map((message) => <View key={message.id} style={[styles.bubble, message.sender_id === userId ? styles.mine : styles.theirs]}>
            <Text style={styles.body}>{message.body}</Text>
            {message.sender_id === userId && <Text style={styles.status}>{readAt && readAt >= message.created_at ? 'Leído' : deliveredAt && deliveredAt >= message.created_at ? 'Entregado' : 'Enviado'}</Text>}
          </View>)}
        </ScrollView>
        <View style={styles.compose}><TextInput value={draft} onChangeText={setDraft} placeholder="Escribe un mensaje" maxLength={2000} style={styles.input}/><TouchableOpacity accessibilityRole="button" onPress={() => { void send(); }} disabled={isSending || !draft.trim()} accessibilityLabel={isSending ? "Enviando mensaje" : "Enviar mensaje"}><MaterialIcons name="send" size={22} color={Colors.primary}/></TouchableOpacity></View>
      </> : <ScrollView style={styles.thread}>{conversations.length ? conversations.map((conversation) => <TouchableOpacity accessibilityRole="button" key={conversation.id} style={styles.row} onPress={() => { setError(''); setSelected(conversation); }}><MaterialIcons name="chat-bubble-outline" size={20} color={Colors.primary}/><View style={{flex:1}}><Text style={styles.title}>{conversation.title || 'Favor vecinal'}</Text><Text style={styles.subtitle}>{conversation.author_id === userId ? 'Conversación sobre tu favor' : 'Tu solicitud de apoyo'}</Text></View><MaterialIcons name="chevron-right" size={22} color={Colors.slateDim}/></TouchableOpacity>) : <Text style={styles.subtitle}>Todavía no tienes conversaciones.</Text>}</ScrollView>}
    </View></View>
  </Modal>;
};

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.5)' }, sheet: { height: '78%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderColor: Colors.border }, title: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.secondary }, thread: { flex: 1, marginVertical: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: Colors.border }, subtitle: { fontSize: 12, color: Colors.slateDim, marginTop: 3 }, bubble: { maxWidth: '84%', borderRadius: 12, padding: 10, marginVertical: 4 }, mine: { alignSelf: 'flex-end', backgroundColor: '#eaf1ff' }, theirs: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9' }, body: { color: Colors.secondary, fontSize: 14 }, status: { fontSize: 10, color: Colors.slateDim, textAlign: 'right', marginTop: 4 }, compose: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: Colors.border, paddingTop: 10 }, input: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10, color: Colors.secondary }, error: { color: Colors.emergencyDark, paddingVertical: 8 } });
