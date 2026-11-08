import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from './theme/colors';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { NeighborhoodModal } from './components/NeighborhoodModal';
import { TutorialModal } from './components/TutorialModal';
import { ManageEmergencyModal } from './components/ManageEmergencyModal';
import { SupabaseAuthScreen } from './components/SupabaseAuthScreen';
import { PasswordRecoveryScreen } from './components/PasswordRecoveryScreen';
import { getLocation } from './lib/ubigeo';
import { completeAuthCallback } from './lib/socialAuth';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Screens
import { DirectoryScreen } from './screens/DirectoryScreen';
import { FavoresScreen } from './screens/FavoresScreen';
import { EmergencyDashboardScreen } from './screens/EmergencyDashboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

type TabType = 'directorio' | 'favores' | 'emergencia' | 'perfil';

export const AppNavigator: React.FC = () => {
  const { user, updateProfile, isHydrated, emergencyMode, showTutorial, setShowTutorial } = useApp();
  const profileLookupInProgress = useRef(false);
  const updateProfileRef = useRef(updateProfile);

  const [activeTab, setActiveTab] = useState<TabType>('directorio');
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
  const [showManageEmergencyModal, setShowManageEmergencyModal] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(!user.isRegistered);
  const [session, setSession] = useState<Session | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [profileCheck, setProfileCheck] = useState<'loading' | 'missing' | 'exists' | 'error'>(supabase ? 'loading' : 'missing');
  const [profileError, setProfileError] = useState('');
  const [authCallbackError, setAuthCallbackError] = useState('');
  const [profileRetry, setProfileRetry] = useState(0);

  useEffect(() => {
    updateProfileRef.current = updateProfile;
  }, [updateProfile]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      setSession(nextSession);
      setProfileError('');
      setProfileCheck(nextSession ? 'loading' : 'missing');
    });
    const handleCallback = async (url: string | null | undefined) => {
      if (!url) return;
      try {
        const flow = await completeAuthCallback(url);
        if (flow === 'recovery' && mounted) setPasswordRecovery(true);
      } catch (error) {
        if (mounted) setAuthCallbackError(error instanceof Error ? error.message : 'Inténtalo nuevamente.');
      }
    };
    const linkSubscription = Linking.addEventListener('url', ({ url }) => { void handleCallback(url); });
    const client = supabase;
    void (async () => {
      await handleCallback(Platform.OS === 'web' ? window.location.href : await Linking.getInitialURL());
      return client.auth.getSession();
    })().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setProfileError(error.message);
      setSession(data.session);
      setProfileCheck(data.session ? 'loading' : 'missing');
      setAuthLoading(false);
    }).catch(error => {
      if (mounted) {
        setProfileError(error instanceof Error ? error.message : 'No se pudo recuperar la sesión.');
        setAuthLoading(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session || !isHydrated || profileCheck === 'exists' || profileCheck === 'missing' || profileCheck === 'error') return;
    if (profileLookupInProgress.current) return;
    let mounted = true;
    profileLookupInProgress.current = true;
    void (async () => {
      try {
        const { data: profile, error: profileQueryError } = await supabase
          .from('profiles')
          .select('nickname, phone, neighborhood_id')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profileQueryError) throw profileQueryError;
        if (!profile) {
          if (mounted) {
            updateProfileRef.current({
              id: session.user.id, nickname: '', phone: '', neighborhood: '', district: '', region: '',
              province: undefined, districtUbigeo: undefined, neighborhoodId: undefined,
              role: 'vecino', isRegistered: false, gpsEnabled: false, coords: undefined,
              avatarUrl: '', coverageScope: 1,
            });
            setProfileCheck('missing');
          }
          return;
        }

        const [neighborhoodResult, membershipResult] = await Promise.all([
          supabase.from('neighborhoods').select('name, district, region, province, district_ubigeo').eq('id', profile.neighborhood_id).maybeSingle(),
          supabase.from('community_memberships').select('role').eq('user_id', session.user.id).eq('neighborhood_id', profile.neighborhood_id).maybeSingle(),
        ]);
        if (neighborhoodResult.error) throw neighborhoodResult.error;
        if (membershipResult.error) throw membershipResult.error;
        if (!mounted) return;
        updateProfileRef.current({
          id: session.user.id,
          nickname: profile.nickname,
          phone: profile.phone ?? '',
          neighborhood: neighborhoodResult.data?.name ?? '',
          district: neighborhoodResult.data?.district ?? '',
          region: neighborhoodResult.data?.region ?? '',
          province: neighborhoodResult.data?.province ?? undefined,
          districtUbigeo: neighborhoodResult.data?.district_ubigeo ?? undefined,
          neighborhoodId: profile.neighborhood_id,
          ...getLocation(neighborhoodResult.data?.district_ubigeo ?? ''),
          role: membershipResult.data?.role ?? 'vecino',
          isRegistered: true,
        });
        setProfileCheck('exists');
      } catch (error) {
        if (mounted) {
          setProfileError(error instanceof Error ? error.message : 'No se pudo cargar el perfil de Supabase.');
          setProfileCheck('error');
        }
      }
    })();
    return () => {
      mounted = false;
      profileLookupInProgress.current = false;
    };
  }, [session, isHydrated, profileRetry, profileCheck]);

  if (supabase && authLoading) {
    return <View style={styles.authLoading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (supabase && passwordRecovery && session) return <PasswordRecoveryScreen onComplete={() => setPasswordRecovery(false)} onCancel={() => { setPasswordRecovery(false); void supabase?.auth.signOut(); }} />;
  if (supabase && !session) return <SupabaseAuthScreen callbackError={authCallbackError} />;
  if (supabase && profileCheck === 'loading') {
    return <View style={styles.authLoading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (supabase && profileCheck === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authError}>
          <Text style={styles.authErrorTitle}>No se pudo conectar con el perfil</Text>
          <Text style={styles.authErrorText}>{profileError}</Text>
          <TouchableOpacity style={styles.authErrorButton} onPress={() => { setProfileError(''); setProfileCheck('loading'); setProfileRetry(value => value + 1); }}>
            <Text style={styles.authErrorButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { if (supabase) void supabase.auth.signOut(); }}>
            <Text style={styles.authErrorSignOut}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If user is not registered, show Onboarding first
  if ((supabase && session && profileCheck === 'missing') || (!supabase && forceOnboarding)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <OnboardingScreen key={session?.user.id ?? 'demo'} onComplete={() => { setForceOnboarding(false); setProfileCheck('exists'); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Main Header (Stitch design) */}
      <Header
        onOpenNeighborhoodModal={() => setShowNeighborhoodModal(true)}
        onOpenTutorial={() => setShowTutorial(true)}
        onNavigateProfile={() => setActiveTab('perfil')}
      />

      {/* Connectivity & Offline Sync Indicator (RF-22 to RF-25, RNF-04) */}
      <OfflineSyncBanner />

      {/* Emergency Active Alert Banner (RF-15, RF-16) */}
      <EmergencyAlertBanner
        onPressManage={() => setShowManageEmergencyModal(true)}
        onPressViewDashboard={() => setActiveTab('emergencia')}
      />

      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'directorio' && <DirectoryScreen />}
        {activeTab === 'favores' && <FavoresScreen />}
        {activeTab === 'emergencia' && <EmergencyDashboardScreen />}
        {activeTab === 'perfil' && (
          <ProfileScreen onOpenTutorial={() => setShowTutorial(true)} />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* Tab 1: Directorio */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('directorio')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="storefront"
            size={22}
            color={activeTab === 'directorio' ? Colors.primary : Colors.slateDim}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'directorio' && styles.navLabelActive,
            ]}
          >
            Directorio
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Cadena de Favores */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('favores')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="volunteer-activism"
            size={22}
            color={activeTab === 'favores' ? Colors.primary : Colors.slateDim}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'favores' && styles.navLabelActive,
            ]}
          >
            Favores
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Emergencias (with alert badge if active) */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('emergencia')}
          activeOpacity={0.7}
        >
          <View style={styles.emergencyIconWrap}>
            <MaterialIcons
              name="crisis-alert"
              size={22}
              color={
                activeTab === 'emergencia'
                  ? Colors.emergency
                  : emergencyMode.isActive
                  ? Colors.emergencyDark
                  : Colors.slateDim
              }
            />
            {emergencyMode.isActive && (
              <View style={styles.emergencyTabDot} />
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'emergencia' && styles.navLabelEmergencyActive,
              emergencyMode.isActive && !activeTab.includes('emergencia') && styles.emergencyTextPulsing,
            ]}
          >
            Emergencia
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Perfil & Config */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('perfil')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="tune"
            size={22}
            color={activeTab === 'perfil' ? Colors.primary : Colors.slateDim}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'perfil' && styles.navLabelActive,
            ]}
          >
            Mi Barrio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Global Modals */}
      <NeighborhoodModal
        visible={showNeighborhoodModal}
        onClose={() => setShowNeighborhoodModal(false)}
      />

      <TutorialModal
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <ManageEmergencyModal
        visible={showManageEmergencyModal}
        onClose={() => setShowManageEmergencyModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  authLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  authError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: Colors.background,
  },
  authErrorTitle: { color: Colors.secondary, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  authErrorText: { color: Colors.secondaryMuted, textAlign: 'center' },
  authErrorButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  authErrorButtonText: { color: '#fff', fontWeight: '700' },
  authErrorSignOut: { color: Colors.primaryDark, fontWeight: '700', padding: 8 },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 64 : 58,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  emergencyIconWrap: {
    position: 'relative',
  },
  emergencyTabDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.emergency,
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: Colors.slateDim,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  navLabelEmergencyActive: {
    color: Colors.emergency,
    fontWeight: '700',
  },
  emergencyTextPulsing: {
    color: Colors.emergencyDark,
    fontWeight: '700',
  },
});
