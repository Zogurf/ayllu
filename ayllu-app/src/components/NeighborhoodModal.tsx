import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { INITIAL_NEIGHBORHOODS } from '../storage/mockData';
import { supabase } from '../lib/supabase';

interface NeighborhoodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (neighborhood: string) => void;
}

export const NeighborhoodModal: React.FC<NeighborhoodModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { user, updateProfile } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = INITIAL_NEIGHBORHOODS.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (name: string) => {
    if (onSelect) {
      onSelect(name);
    } else {
      if (supabase) {
        try {
          const { error } = await supabase.rpc('complete_community_profile', {
            p_nickname: user.nickname,
            p_phone: user.phone,
            p_neighborhood_name: name,
          });
          if (error) throw error;
        } catch (error) {
          Alert.alert('No se cambió el barrio', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
          return;
        }
      }
      updateProfile({ neighborhood: name, ...(supabase && name !== user.neighborhood ? { role: 'vecino' } : {}) });
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Selecciona tu Barrio</Text>
              <Text style={styles.subtitle}>Distrito de Cusco · Región Cusco</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              accessibilityLabel="Cerrar modal"
            >
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={Colors.slateDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar barrio o sector..."
              placeholderTextColor={Colors.slateDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="cancel" size={16} color={Colors.slateDim} />
              </TouchableOpacity>
            )}
          </View>

          {/* Neighborhood list */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = item.name === user.neighborhood;
              return (
                <TouchableOpacity
                  style={[
                    styles.itemButton,
                    isSelected ? styles.itemButtonSelected : styles.itemButtonNormal,
                  ]}
                  onPress={() => handleSelect(item.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTextCol}>
                    <Text
                      style={[
                        styles.itemName,
                        isSelected ? styles.itemNameSelected : styles.itemNameNormal,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.isAdjacent && (
                      <Text style={styles.itemBadge}>Sector colindante</Text>
                    )}
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.secondary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryMuted,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary,
  },
  list: {
    paddingBottom: 16,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemButtonNormal: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.border,
  },
  itemButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  itemTextCol: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
  },
  itemNameNormal: {
    fontWeight: '500',
    color: Colors.secondary,
  },
  itemNameSelected: {
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  itemBadge: {
    fontSize: 10,
    color: Colors.slateDim,
    marginTop: 2,
  },
});
