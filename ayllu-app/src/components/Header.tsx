import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onOpenNeighborhoodModal: () => void;
  onOpenTutorial: () => void;
  onNavigateProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNeighborhoodModal,
  onOpenTutorial,
  onNavigateProfile,
}) => {
  const { user, isOnline } = useApp();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'coordinador': return 'Coordinador';
      case 'proveedor': return 'Proveedor';
      case 'admin': return 'Admin';
      default: return 'Vecino';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'coordinador': return Colors.tertiary;
      case 'proveedor': return Colors.primaryDark;
      case 'admin': return Colors.secondary;
      default: return Colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Ayllu Logo + Status */}
        <View style={styles.leftSection}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="diversity-3" size={20} color={Colors.primary} />
          </View>
          <View style={styles.titleColumn}>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>AYLLU</Text>
              
              {/* Actual device network state */}
              <View
                style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}
              >
                <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
                <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            {/* Neighborhood selector button */}
            <TouchableOpacity 
              style={styles.locationSelector} 
              onPress={onOpenNeighborhoodModal}
              activeOpacity={0.7}
            >
              <Text style={styles.locationText} numberOfLines={1}>
                {user.neighborhood}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={18} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right action icons & user profile */}
        <View style={styles.rightSection}>
          {/* Tutorial Quick Button */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={onOpenTutorial}
            accessibilityLabel="Abrir tutorial de Ayllu"
          >
            <MaterialIcons name="lightbulb-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Profile Avatar with Role Indicator */}
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={onNavigateProfile}
            activeOpacity={0.8}
            accessibilityLabel="Ver perfil y configuración"
          >
            <Image 
              source={{ uri: user.avatarUrl }} 
              style={styles.avatar} 
            />
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.roleBadgeText}>
                {getRoleLabel(user.role).charAt(0)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 10,
    zIndex: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  onlinePill: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  offlinePill: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineDot: {
    backgroundColor: Colors.primary,
  },
  offlineDot: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  onlineText: {
    color: Colors.primaryDark,
  },
  offlineText: {
    color: Colors.warningText,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginTop: 1,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
    maxWidth: 160,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});
