import { Avatar } from './Avatar';
import { AylluLogo } from './AylluLogo';
import { LEGACY_CUSCO_UBIGEO, resolveProfileUbigeo } from '../lib/ubigeo';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
          <AylluLogo size={36} rounded />
          <View style={styles.titleColumn}>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>AYLLU</Text>
              <Text style={styles.brandTagline}>· Red Cívica</Text>

              {/* Actual device network state with clear meaning */}
              <View
                style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}
              >
                <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
                <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            {/* Neighborhood selector button with pin icon */}
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={`Cambiar ubicación actual: ${user.neighborhood}, ${user.district}`}
              style={styles.locationSelector}
              onPress={onOpenNeighborhoodModal}
              activeOpacity={0.7}
            >
              <MaterialIcons name="place" size={13} color={Colors.primary} style={{ marginRight: 2 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {user.neighborhood} · {user.district}
              </Text>
              <MaterialIcons name="expand-more" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right action icons & user profile */}
        <View style={styles.rightSection}>
          {/* Tutorial Quick Button */}
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={onOpenTutorial}
            accessibilityLabel="Abrir tutorial rápido de 3 claves cívicas"
          >
            <MaterialIcons name="lightbulb-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>

          {/* Profile Avatar with Role Indicator */}
          <TouchableOpacity accessibilityRole="button"
            style={styles.avatarButton}
            onPress={onNavigateProfile}
            activeOpacity={0.8}
            accessibilityLabel="Ver mi perfil y configuración"
          >
            <Avatar
              uri={user.avatarUrl}
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

      {/* Scope Selector Bar */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: showScopeOptions }}
        accessibilityLabel={`Filtrando publicaciones por: ${scopeLabel}. Toca para cambiar alcance`}
        style={[styles.scopeBar, showScopeOptions && styles.scopeBarActive]}
        onPress={() => setShowScopeOptions(value => !value)}
        activeOpacity={0.8}
      >
        <View style={styles.scopeBarLeft}>
          <MaterialIcons name="tune" size={15} color={Colors.primary} />
          <Text style={styles.scopeLabelPrefix}>Filtro de alcance:</Text>
          <Text style={styles.scopeLabelActiveValue}>{scopeLabel}</Text>
        </View>
        <View style={styles.scopeBarRight}>
          <Text style={styles.changeText}>{showScopeOptions ? 'Ocultar' : 'Cambiar'}</Text>
          <MaterialIcons
            name={showScopeOptions ? 'expand-less' : 'expand-more'}
            size={16}
            color={Colors.primary}
          />
        </View>
      </TouchableOpacity>

      {showScopeOptions && (
        <View style={styles.scopeOptions}>
          <Text style={styles.scopeHelp}>
            Elige qué publicaciones y servicios ver en tu pantalla. Esto no afecta la privacidad de lo que tú publiques.
          </Text>
          {([
            { value: 1, label: 'Mi barrio únicamente (~450m)' },
            ...(hasAdjacentAreas ? [{ value: 2, label: 'Mi barrio y colindantes' }] : []),
            { value: 3, label: 'Todo el distrito' },
          ] as { value: 1 | 2 | 3; label: string }[]).map(option => {
            const isSelected = user.coverageScope === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                style={[styles.scopeOption, isSelected && styles.scopeOptionSelected]}
                onPress={() => {
                  setCoverageScope(option.value);
                  setShowScopeOptions(false);
                }}
              >
                <MaterialIcons
                  name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={18}
                  color={isSelected ? Colors.primary : Colors.slateDim}
                />
                <Text style={[styles.scopeOptionText, isSelected && styles.scopeOptionTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeBarActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  scopeBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  scopeLabelPrefix: {
    fontSize: 11.5,
    color: Colors.slateDim,
    fontWeight: '500',
  },
  scopeLabelActiveValue: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  scopeBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11.5,
    color: Colors.primary,
    fontWeight: '700',
  },
  scopeOptions: {
    backgroundColor: Colors.surface,
    padding: 12,
    gap: 6,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  scopeHelp: {
    fontSize: 11.5,
    lineHeight: 17,
    color: Colors.secondaryMuted,
    marginBottom: 4,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scopeOptionSelected: {
    backgroundColor: Colors.primaryContainer,
  },
  scopeOptionText: {
    fontSize: 12.5,
    color: Colors.secondary,
    fontWeight: '500',
  },
  scopeOptionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
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
    width: 40,
    height: 40,
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
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.slateDim,
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
    backgroundColor: Colors.success,
  },
  offlineDot: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  onlineText: {
    color: '#15803d',
  },
  offlineText: {
    color: Colors.warningText,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
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
