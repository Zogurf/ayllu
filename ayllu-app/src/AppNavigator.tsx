import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  TouchableOpacity 
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

// Screens
import { DirectoryScreen } from './screens/DirectoryScreen';
import { FavoresScreen } from './screens/FavoresScreen';
import { EmergencyDashboardScreen } from './screens/EmergencyDashboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

type TabType = 'directorio' | 'favores' | 'emergencia' | 'perfil';

export const AppNavigator: React.FC = () => {
  const { user, emergencyMode, showTutorial, setShowTutorial } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('directorio');
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
  const [showManageEmergencyModal, setShowManageEmergencyModal] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(!user.isRegistered);

  // If user is not registered, show Onboarding first
  if (forceOnboarding) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={() => setForceOnboarding(false)} />
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
