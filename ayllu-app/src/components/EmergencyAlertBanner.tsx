import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface EmergencyAlertBannerProps {
  onPressManage: () => void;
  onPressViewDashboard: () => void;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({
  onPressManage,
  onPressViewDashboard,
}) => {
  const { emergencyMode, user } = useApp();

  if (!emergencyMode.isActive) return null;

  const isAuthorized = user.role === 'coordinador' || user.role === 'admin';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.alertTitleRow}>
          <View style={styles.pulseIndicator}>
            <View style={styles.pulseInner} />
          </View>
          <Text style={styles.alertHeader}>MODO EMERGENCIA ACTIVO</Text>
        </View>
        <View style={styles.zoneBadge}>
          <Text style={styles.zoneText}>{emergencyMode.affectedNeighborhood}</Text>
        </View>
      </View>

      <Text style={styles.emergencyType} numberOfLines={1}>
        {emergencyMode.emergencyType}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={styles.timestamp}>
          Iniciado: {emergencyMode.activatedAt}
        </Text>

        <View style={styles.actionsRow}>
          {isAuthorized && (
            <TouchableOpacity accessibilityRole="button"
              style={styles.manageButton}
              onPress={onPressManage}
              activeOpacity={0.8}
            >
              <Text style={styles.manageButtonText}>Gestionar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity accessibilityRole="button"
            style={styles.dashboardButton}
            onPress={onPressViewDashboard}
            activeOpacity={0.8}
          >
            <Text style={styles.dashboardButtonText}>Ver Tablero</Text>
            <MaterialIcons name="arrow-forward" size={13} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffdada',
    borderLeftWidth: 4,
    borderLeftColor: Colors.emergency,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emergency,
  },
  alertHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#920028',
    letterSpacing: 0.5,
  },
  zoneBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.emergencyDark,
  },
  emergencyType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#40000c',
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(146, 0, 40, 0.1)',
  },
  timestamp: {
    fontSize: 10,
    color: '#920028',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manageButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  manageButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.emergencyDark,
  },
  dashboardButton: {
    backgroundColor: Colors.emergency,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dashboardButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
