import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { openWhatsApp } from '../utils/contact';
import { ContactChannel } from '../types';
import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';

type Message = { id: string; sender_id: string; body: string; created_at: string };
interface ContactActionModalProps {
  visible: boolean;
  onClose: () => void;
  targetName: string;
  targetItemTitle: string;
  favorId: string;
  channel: ContactChannel;
  phone?: string;
}

export const ContactActionModal: React.FC<ContactActionModalProps> = ({ visible, onClose, targetName, targetItemTitle, favorId, channel, phone }) => {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  const refreshConversation = useCallback(async (cid: string) => {
    if (!supabase) return;
    const [{ data: auth }, { data: rows, error: messageError }, { data: participants, error: participantError }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', cid).order('created_at'),
      supabase.from('conversation_participants').select('user_id,last_delivered_at,last_read_at').eq('conversation_id', cid),
    ]);
    if (messageError) throw messageError;
    if (participantError) throw participantError;
    const uid = auth.user?.id ?? '';
    setUserId(uid);
    setMessages((rows ?? []) as Message[]);
    const other = participants?.find((participant) => participant.user_id !== uid);
    setReadAt(other?.last_read_at ?? null);
    setDeliveredAt(other?.last_delivered_at ?? null);
  }, []);

  useEffect(() => {
    if (!visible || channel !== 'ayllu' || !supabase) return;
    const client = supabase;
    let active = true;
    void Promise.resolve().then(async () => {
      setError(''); setConversationId(null); setMessages([]);
      try {
        const { data, error: openError } = await client.rpc('open_favor_conversation', { p_favor_id: favorId });
        if (openError) throw openError;
        if (!active) return;
        setConversationId(data);
        const [{ error: deliveredError }, { error: readError }] = await Promise.all([
          client.rpc('mark_conversation_delivered', { p_id: data }),
          client.rpc('mark_conversation_read', { p_id: data }),
        ]);
        if (deliveredError) throw deliveredError;
        if (readError) throw readError;
        await refreshConversation(data);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'No se pudo abrir el chat.'); }
    });
    return () => { active = false; };
  }, [visible, channel, favorId, refreshConversation]);

  useEffect(() => {
    if (!visible || !conversationId || channel !== 'ayllu') return;
    const timer = setInterval(() => { void refreshConversation(conversationId).catch((e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar el chat.')); }, 4000);
    return () => clearInterval(timer);
  }, [visible, conversationId, channel, refreshConversation]);

  const send = async () => {
    setError('');
    if (channel === 'ayllu') {
      if (!supabase || !conversationId || !message.trim()) return;
      setBusy(true);
      try {
        const { error: sendError } = await supabase.rpc('send_message', { p_id: Crypto.randomUUID(), p_conversation_id: conversationId, p_body: message.trim() });
        if (sendError) throw sendError;
        setMessage('');
        await refreshConversation(conversationId);
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.'); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true);
    try { await openWhatsApp(phone ?? '', message.trim() || `Hola, me interesa: ${targetItemTitle}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir WhatsApp.'); }
    finally { setBusy(false); }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}><View style={styles.iconCircle}><MaterialIcons name="chat" size={20} color={Colors.primary}/></View><View style={{flex:1}}><Text style={styles.title}>Contactar a {targetName}</Text><Text style={styles.subtitle} numberOfLines={1}>{targetItemTitle}</Text></View></View>
        <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={onClose} accessibilityLabel="Cerrar"><MaterialIcons name="close" size={20} color={Colors.slateDim}/></TouchableOpacity>
      </View>
      <View style={styles.channelBadge}><MaterialIcons name={channel === 'ayllu' ? 'security' : 'phone'} size={16} color={Colors.primaryDark}/><Text style={styles.channelText}>{channel === 'ayllu' ? 'Mensajería interna privada' : `WhatsApp vecinal (${phone || 'Directo'})`}</Text></View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {channel === 'ayllu' && <ScrollView style={styles.thread}>{messages.map((item) => <View key={item.id} style={[styles.bubble, item.sender_id === userId ? styles.mine : styles.theirs]}><Text style={styles.body}>{item.body}</Text>{item.sender_id === userId && <Text style={styles.status}>{readAt && readAt >= item.created_at ? 'Leído' : deliveredAt && deliveredAt >= item.created_at ? 'Entregado' : 'Enviado'}</Text>}</View>)}</ScrollView>}
      <Text style={styles.label}>Mensaje solidario</Text>
      <TextInput style={styles.textArea} placeholder={`Hola ${targetName}, me interesa coordinar este favor vecinal...`} placeholderTextColor={Colors.slateDim} value={message} onChangeText={setMessage} multiline maxLength={2000}/>
      <View style={styles.ethicsBox}><MaterialIcons name="handshake" size={16} color={Colors.primary}/><Text style={styles.ethicsText}>Los favores en Ayllu son solidarios y libres de dinero (Principio Ayni).</Text></View>
      <TouchableOpacity accessibilityRole="button" style={[styles.submitBtn, (busy || (channel === 'ayllu' && !conversationId)) && { opacity: 0.55 }]} onPress={() => { void send(); }} disabled={busy || (channel === 'ayllu' && !conversationId)}><MaterialIcons name="send" size={18} color="#fff"/><Text style={styles.submitBtnText}>{busy ? 'Enviando...' : channel === 'ayllu' ? 'Enviar mensaje' : 'Abrir WhatsApp'}</Text></TouchableOpacity>
    </View></View>
  </Modal>;
};

const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }, sheet: { maxHeight: '90%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 24 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }, iconCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 16, fontWeight: '700', color: Colors.secondary }, subtitle: { fontSize: 11, color: Colors.secondaryMuted, maxWidth: 220 }, closeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }, channelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }, channelText: { fontSize: 11, fontWeight: '600', color: Colors.primaryDark, flex: 1 }, thread: { maxHeight: 220, marginBottom: 10 }, bubble: { maxWidth: '84%', borderRadius: 12, padding: 10, marginVertical: 4 }, mine: { alignSelf: 'flex-end', backgroundColor: '#eaf1ff' }, theirs: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9' }, body: { color: Colors.secondary }, status: { fontSize: 10, textAlign: 'right', marginTop: 4, color: Colors.slateDim }, label: { fontSize: 12, fontWeight: '700', color: Colors.secondary, marginBottom: 6 }, textArea: { backgroundColor: Colors.surfaceSubtle, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingTop: 10, height: 76, fontSize: 13, color: Colors.secondary, textAlignVertical: 'top' }, ethicsBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 12 }, ethicsText: { fontSize: 11, color: Colors.secondaryMuted, flex: 1 }, submitBtn: { height: 46, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' }, error: { color: Colors.emergencyDark, marginBottom: 8 } });
