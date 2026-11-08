import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';

export const PasswordRecoveryScreen: React.FC<{ onComplete: () => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updatePassword = async () => {
    if (!supabase || saving) return;
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onComplete();
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      setError(code === 'weak_password' ? 'Elige una contraseña más segura y de al menos 8 caracteres.' : 'No se pudo cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.');
    } finally { setSaving(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.icon}><MaterialIcons name="lock-reset" size={28} color={Colors.primary} /></View>
        <Text style={styles.title}>Elige una contraseña nueva</Text>
        <Text style={styles.subtitle}>Usa al menos 8 caracteres. Al guardar, podrás continuar en Ayllu.</Text>
        <Text style={styles.label}>Nueva contraseña</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Al menos 8 caracteres" secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" editable={!saving} />
        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} placeholder="Vuelve a escribirla" secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" editable={!saving} onSubmitEditing={updatePassword} />
        {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} style={[styles.button, saving && styles.disabled]} onPress={() => { void updatePassword(); }} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar contraseña</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} disabled={saving}><Text style={styles.cancel}>Volver al acceso</Text></TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 12, borderWidth: 1, borderColor: Colors.border },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.secondary, fontSize: 22, fontWeight: '800', marginTop: 4 },
  subtitle: { color: Colors.secondaryMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  label: { color: Colors.secondary, fontWeight: '700', fontSize: 13, marginBottom: -6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, color: Colors.secondary, backgroundColor: '#fff' },
  error: { color: Colors.emergencyDark, fontSize: 14, lineHeight: 20 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 10, marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancel: { color: Colors.primaryDark, textAlign: 'center', fontWeight: '700', padding: 8 },
  disabled: { opacity: 0.6 },
});
