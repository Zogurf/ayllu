import { LEGACY_CUSCO_UBIGEO, resolveProfileUbigeo } from '../lib/ubigeo';
import React, { useState } from 'react';
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
  const { user, isOnline, setCoverageScope } = useApp();
  const [showScopeOptions, setShowScopeOptions] = useState(false);
  const hasAdjacentAreas = resolveProfileUbigeo(user) === LEGACY_CUSCO_UBIGEO;
  const scopeLabel = user.coverageScope === 3 ? 'Todo el distrito'
    : user.coverageScope === 2 && hasAdjacentAreas ? 'Mi barrio y colindantes' : 'Mi barrio';

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
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={`Cambiar ubicación: ${user.neighborhood}, ${user.district}`}
              style={styles.locationSelector}
              onPress={onOpenNeighborhoodModal}
              activeOpacity={0.7}
            >
              <Text style={styles.locationText} numberOfLines={1}>
                {user.neighborhood} · {user.district}
              </Text>
              <Text style={styles.changeText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right action icons & user profile */}
        <View style={styles.rightSection}>
          {/* Tutorial Quick Button */}
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={onOpenTutorial}
            accessibilityLabel="Abrir tutorial de Ayllu"
          >
            <MaterialIcons name="lightbulb-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Profile Avatar with Role Indicator */}
          <TouchableOpacity accessibilityRole="button"
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
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showScopeOptions }}
        accessibilityLabel={`Viendo: ${scopeLabel}. Cambiar alcance`}
        style={styles.scopeBar} onPress={() => setShowScopeOptions(value => !value)}>
        <MaterialIcons name="filter-list" size={18} color={Colors.primary} />
        <Text style={styles.scopeLabel}>Viendo: {scopeLabel}</Text>
        <Text style={styles.changeText}>Cambiar alcance</Text>
      </TouchableOpacity>
      {showScopeOptions && <View style={styles.scopeOptions}>
        <Text style={styles.scopeHelp}>Elige qué publicaciones ver. Esto no cambia quién puede ver las tuyas.</Text>
        {([
          { value: 1, label: 'Mi barrio' },
          ...(hasAdjacentAreas ? [{ value: 2, label: 'Mi barrio y colindantes' }] : []),
          { value: 3, label: 'Todo el distrito' },
        ] as { value: 1 | 2 | 3; label: string }[]).map(option => (
          <TouchableOpacity key={option.value} accessibilityRole="radio"
            accessibilityState={{ checked: user.coverageScope === option.value }}
            style={styles.scopeOption} onPress={() => { setCoverageScope(option.value); setShowScopeOptions(false); }}>
            <MaterialIcons name={user.coverageScope === option.value ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={Colors.primary} />
            <Text style={styles.scopeLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>}
    </View>
  );
};

const styles = StyleSheet.create({
  scopeBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 44, padding: 10, borderRadius: 10, backgroundColor: Colors.surfaceSubtle },
  scopeLabel: { flex: 1, fontSize: 12, color: Colors.secondary, fontWeight: '600' },
  changeText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  scopeOptions: { padding: 10, gap: 4 },
  scopeHelp: { fontSize: 12, lineHeight: 18, color: Colors.secondaryMuted },
  scopeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
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
    minHeight: 44,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
    flexShrink: 1,
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
