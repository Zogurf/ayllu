import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getAuthRedirectUrl, signInWithGoogle } from '../lib/socialAuth';
import { Colors } from '../theme/colors';
import { AylluLogo } from './AylluLogo';

export const SupabaseAuthScreen: React.FC<{ callbackError?: string }> = ({ callbackError }) => {
  const [socialError, setSocialError] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const busy = isSubmitting || isGoogleSubmitting;

  const handleGoogleSignIn = async () => {
    if (busy) return;
    setSocialError('');
    setFormError('');
    setFormNotice('');
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : 'Inténtalo nuevamente.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (busy) return;
    setFormError('');
    setFormNotice('');
    setSocialError('');
    if (!supabase) {
      setFormError('El acceso no está disponible en este momento. Inténtalo más tarde.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password || (isCreatingAccount && password.length < 8)) {
      setFormError(isCreatingAccount ? 'La contraseña debe tener al menos 8 caracteres.' : 'Ingresa tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isCreatingAccount
        ? await supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo: getAuthRedirectUrl() } })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (result.error) throw result.error;

      if (isCreatingAccount && !result.data.session) {
        setFormNotice('Revisa tu correo para confirmar la cuenta. Si recibes un enlace de verificación, ábrelo y luego inicia sesión aquí.');
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const messages: Record<string, string> = {
        invalid_credentials: 'El correo o la contraseña no son correctos. Revisa tus datos.',
        email_not_confirmed: 'Confirma tu correo antes de iniciar sesión. Revisa también la carpeta de spam.',
        user_already_exists: 'No se pudo crear la cuenta con estos datos. Prueba iniciar sesión.',
        email_exists: 'No se pudo crear la cuenta con estos datos. Prueba iniciar sesión.',
        weak_password: 'Elige una contraseña más segura y de al menos 8 caracteres.',
        over_request_rate_limit: 'Hay demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
        over_email_send_rate_limit: 'Espera unos minutos antes de solicitar otro correo.',
        signup_disabled: 'El registro de cuentas no está disponible en este momento.',
        email_provider_disabled: 'El acceso por correo no está disponible en este momento.',
        email_address_invalid: 'Revisa tu dirección de correo o utiliza otra.',
      };
      const networkError = error instanceof Error && /network|fetch|connection|timeout/i.test(error.message);
      setFormError(messages[code] ?? (networkError
        ? 'No se pudo conectar. Revisa tu conexión e inténtalo nuevamente.'
        : 'No se pudo completar la solicitud. Inténtalo nuevamente en unos momentos.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendAccountEmail = async (type: 'recovery' | 'confirmation') => {
    if (busy || !supabase) return;
    setFormError(''); setFormNotice(''); setSocialError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = type === 'recovery'
        ? await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: getAuthRedirectUrl() })
        : await supabase.auth.resend({ type: 'signup', email: normalizedEmail, options: { emailRedirectTo: getAuthRedirectUrl() } });
      if (result.error) throw result.error;
      setFormNotice(type === 'recovery'
        ? 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también spam.'
        : 'Si la cuenta aún necesita confirmación, recibirás un nuevo correo. Revisa también spam.');
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      setFormError(code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit'
        ? 'Se enviaron demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.'
        : 'No se pudo enviar el correo. Verifica la dirección e inténtalo nuevamente.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <AylluLogo size={56} rounded />
        <Text style={styles.title}>{isRecoveringPassword ? 'Restablecer contraseña' : isCreatingAccount ? 'Crear cuenta Ayllu' : 'Inicia sesión en Ayllu'}</Text>
        <Text style={styles.subtitle}>{isRecoveringPassword ? 'Te enviaremos un enlace seguro a tu correo.' : isCreatingAccount ? 'Únete a tu comunidad vecinal y participa en el apoyo mutuo.' : 'Accede con tu cuenta de Google o tu correo.'}</Text>

        {!isRecoveringPassword && (
          <View style={styles.authModeSelector}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.authModeTab, !isCreatingAccount && styles.authModeTabActive]}
              onPress={() => {
                setIsCreatingAccount(false);
                setFormError('');
                setFormNotice('');
                setSocialError('');
              }}
              disabled={busy}
            >
              <Text style={[styles.authModeText, !isCreatingAccount && styles.authModeTextActive]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.authModeTab, isCreatingAccount && styles.authModeTabActive]}
              onPress={() => {
                setIsCreatingAccount(true);
                setFormError('');
                setFormNotice('');
                setSocialError('');
              }}
              disabled={busy}
            >
              <Text style={[styles.authModeText, isCreatingAccount && styles.authModeTextActive]}>
                Crear Cuenta
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isRecoveringPassword && (socialError || callbackError) ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={16} color={Colors.emergencyDark} />
            <Text accessibilityRole="alert" style={styles.errorText}>{socialError || callbackError}</Text>
          </View>
        ) : null}
        {!isRecoveringPassword && <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Continuar con Google"
          accessibilityState={{ disabled: busy, busy: isGoogleSubmitting }}
          style={[styles.socialButton, busy && styles.disabled]}
          onPress={() => { void handleGoogleSignIn(); }}
          disabled={busy}
        >
          {isGoogleSubmitting ? <ActivityIndicator color={Colors.primary} /> : (
            <Text style={styles.socialText}>Continuar con Google</Text>
          )}
        </TouchableOpacity>}
        {!isRecoveringPassword && <Text style={styles.separator}>O usa tu correo electrónico</Text>}
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={value => { setEmail(value); setFormError(''); setFormNotice(''); }}
          placeholder="tu@correo.com"
          placeholderTextColor={Colors.slateDim}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!busy}
        />
        {isCreatingAccount && (
          <Text style={styles.inputHelper}>Usa un correo real (Gmail, Outlook, etc.). Supabase valida que el dominio exista.</Text>
        )}
        {!isRecoveringPassword && <Text style={styles.label}>Contraseña</Text>}
        {!isRecoveringPassword && <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={value => { setPassword(value); setFormError(''); setFormNotice(''); }}
            placeholder="Al menos 8 caracteres"
            placeholderTextColor={Colors.slateDim}
            secureTextEntry={!showPassword}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete={isCreatingAccount ? 'new-password' : 'password'}
            textContentType={isCreatingAccount ? 'newPassword' : 'password'}
            editable={!busy}
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ disabled: busy }}
            style={styles.passwordToggle}
            onPress={() => setShowPassword(value => !value)}
            disabled={busy}
          >
            <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color={Colors.slateDim} />
          </TouchableOpacity>
        </View>}
        {isCreatingAccount && (
          <Text style={styles.inputHelper}>Mínimo 8 caracteres (letras y números).</Text>
        )}

        {!!formError && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={16} color={Colors.emergencyDark} />
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{formError}</Text>
          </View>
        )}
        {!!formNotice && (
          <View style={styles.noticeBox}>
            <MaterialIcons name="info-outline" size={18} color={Colors.primaryDark} />
            <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{formNotice}</Text>
          </View>
        )}

        <TouchableOpacity accessibilityRole="button" style={styles.submitButton} onPress={isRecoveringPassword ? () => { void sendAccountEmail('recovery'); } : handleSubmit} disabled={busy}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isRecoveringPassword ? 'Enviar enlace' : isCreatingAccount ? 'Crear cuenta' : 'Iniciar sesión'}</Text>}
        </TouchableOpacity>

        {!isRecoveringPassword && !isCreatingAccount && <TouchableOpacity accessibilityRole="button" onPress={() => { setFormError(''); setFormNotice(''); setIsRecoveringPassword(true); }} disabled={busy}>
          <Text style={styles.toggleText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>}
        {!isRecoveringPassword && !isCreatingAccount && <TouchableOpacity accessibilityRole="button" onPress={() => { void sendAccountEmail('confirmation'); }} disabled={busy}>
          <Text style={styles.toggleText}>Reenviar correo de confirmación</Text>
        </TouchableOpacity>}
        {isRecoveringPassword && (
          <TouchableOpacity accessibilityRole="button" onPress={() => { setIsRecoveringPassword(false); setFormError(''); setFormNotice(''); setSocialError(''); }} disabled={busy}>
            <Text style={styles.toggleText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        )}
        {!isRecoveringPassword && <Text style={styles.footnote}>Al crear una cuenta, el perfil comienza con permisos de vecino. Un administrador podrá asignar otros roles.</Text>}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  authModeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 3,
    marginTop: 4,
    marginBottom: 4,
  },
  authModeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  authModeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  authModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryMuted,
  },
  authModeTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  inputHelper: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    marginTop: -4,
    marginBottom: 2,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: Colors.emergencyDark, fontSize: 13, lineHeight: 18, flex: 1, fontWeight: '500' },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
  },
  noticeText: { color: Colors.primaryDark, fontSize: 13, lineHeight: 18, flex: 1, fontWeight: '500' },
  socialButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 10 },
  socialText: { color: Colors.secondary, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  separator: { color: Colors.secondaryMuted, textAlign: 'center', fontSize: 12, marginVertical: 4 },
  container: { flexGrow: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 12, borderWidth: 1, borderColor: Colors.border },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.secondary, fontSize: 24, fontWeight: '800', marginTop: 4 },
  subtitle: { color: Colors.secondaryMuted, fontSize: 13.5, lineHeight: 19, marginBottom: 4 },
  label: { color: Colors.secondary, fontWeight: '700', fontSize: 13, marginBottom: -6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, color: Colors.secondary, backgroundColor: '#fff' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: '#fff' },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 12, color: Colors.secondary },
  passwordToggle: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  submitButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 10, marginTop: 6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  toggleText: { color: Colors.primaryDark, textAlign: 'center', fontWeight: '700', padding: 8 },
  footnote: { color: Colors.secondaryMuted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4 },
});
