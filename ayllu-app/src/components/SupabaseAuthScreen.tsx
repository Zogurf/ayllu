import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme/colors';

export const SupabaseAuthScreen: React.FC = () => {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 8) {
      Alert.alert('Revisa tus datos', 'Ingresa tu correo y una contraseña de al menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isCreatingAccount
        ? await supabase.auth.signUp({ email: normalizedEmail, password })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (result.error) throw result.error;

      if (isCreatingAccount && !result.data.session) {
        Alert.alert('Confirma tu correo', 'Te enviamos un enlace de verificación. Ábrelo y luego inicia sesión aquí.');
      }
    } catch (error) {
      Alert.alert('No se pudo completar', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <MaterialIcons name="diversity-3" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{isCreatingAccount ? 'Crear cuenta Ayllu' : 'Inicia sesión en Ayllu'}</Text>
        <Text style={styles.subtitle}>Usa tu correo y contraseña para acceder a tu comunidad.</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor={Colors.slateDim}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!isSubmitting}
        />
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Al menos 8 caracteres"
          placeholderTextColor={Colors.slateDim}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isCreatingAccount ? 'new-password' : 'password'}
          textContentType={isCreatingAccount ? 'newPassword' : 'password'}
          editable={!isSubmitting}
          onSubmitEditing={handleSubmit}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isCreatingAccount ? 'Crear cuenta' : 'Iniciar sesión'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsCreatingAccount(value => !value)} disabled={isSubmitting}>
          <Text style={styles.toggleText}>
            {isCreatingAccount ? '¿Ya tienes una cuenta? Inicia sesión' : '¿Primera vez? Crea una cuenta'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footnote}>Al crear una cuenta, el perfil comienza con permisos de vecino. Un administrador podrá asignar otros roles.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 12, borderWidth: 1, borderColor: Colors.border },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.secondary, fontSize: 24, fontWeight: '800', marginTop: 4 },
  subtitle: { color: Colors.secondaryMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  label: { color: Colors.secondary, fontWeight: '700', fontSize: 13, marginBottom: -6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, color: Colors.secondary, backgroundColor: '#fff' },
  submitButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 10, marginTop: 6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  toggleText: { color: Colors.primaryDark, textAlign: 'center', fontWeight: '700', padding: 8 },
  footnote: { color: Colors.secondaryMuted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4 },
});
