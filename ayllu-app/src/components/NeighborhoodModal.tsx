import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { INITIAL_NEIGHBORHOODS } from '../storage/mockData';
import { supabase } from '../lib/supabase';
import { departments, provinces, districts, getLocation, normalizeSearch, resolveProfileUbigeo, LEGACY_CUSCO_UBIGEO } from '../lib/ubigeo';
import { CommunityLocation, normalizeNeighborhood, saveCommunityProfile } from '../lib/communityProfile';

type Step = 'department' | 'province' | 'district' | 'neighborhood';
interface NeighborhoodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (location: CommunityLocation) => void;
}

const LocationForm: React.FC<NeighborhoodModalProps> = ({ visible, onClose, onSelect }) => {
  const { user, updateProfile } = useApp();
  const initialCode = resolveProfileUbigeo(user);
  const [step, setStep] = useState<Step>(initialCode ? 'neighborhood' : 'department');
  const [department, setDepartment] = useState(initialCode?.slice(0, 2) ?? '');
  const [province, setProvince] = useState(initialCode?.slice(0, 4) ?? '');
  const [district, setDistrict] = useState(initialCode ?? '');
  const [neighborhood, setNeighborhood] = useState(user.neighborhood);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const changeStep = (next: Step) => { setStep(next); setSearch(''); setError(''); };
  const rows = step === 'department' ? departments
    : step === 'province' ? provinces.filter(p => p.departmentCode === department)
    : districts.filter(d => d.provinceCode === province);
  const filtered = rows.filter(row => normalizeSearch(row.name).includes(normalizeSearch(search)));
  const location = getLocation(district);
  const select = (code: string) => {
    if (step === 'department') {
      setDepartment(code); setProvince(''); setDistrict(''); setNeighborhood(''); changeStep('province');
    } else if (step === 'province') {
      setProvince(code); setDistrict(''); setNeighborhood(''); changeStep('district');
    } else {
      setDistrict(code); setNeighborhood(''); changeStep('neighborhood');
    }
  };
  const handleSave = async () => {
    if (saving || !location) return;
    const name = normalizeNeighborhood(neighborhood);
    if (!name || name.length > 120) { setError('Ingresa un barrio o sector de entre 1 y 120 caracteres.'); return; }
    const selection = { ...location, neighborhood: name };
    setSaving(true); setError('');
    try {
      if (onSelect) onSelect(selection);
      else {
        const saved = await saveCommunityProfile({ ...user, ...selection });
        const changed = saved.neighborhoodId && user.neighborhoodId ? saved.neighborhoodId !== user.neighborhoodId
          : district !== resolveProfileUbigeo(user) || normalizeSearch(name) !== normalizeSearch(user.neighborhood);
        updateProfile({ ...saved, ...(changed ? { gpsEnabled: false, coords: undefined } : {}), ...(supabase && changed ? { role: 'vecino' } : {}) });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ubicación.');
    } finally { setSaving(false); }
  };
  const labels: Record<Step, string> = { department: 'Departamento', province: 'Provincia', district: 'Distrito', neighborhood: 'Barrio / sector' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Tu ubicación en Perú</Text>
              <Text style={styles.subtitle}>{location ? `${location.region} · ${location.province} · ${location.district}` : 'Selecciona departamento, provincia y distrito'}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={saving} accessibilityLabel="Cerrar modal">
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.steps}>
            {(['department', 'province', 'district', 'neighborhood'] as const).map(target => (
              <TouchableOpacity key={target} disabled={saving || (target === 'province' && !department) || (target === 'district' && !province) || (target === 'neighborhood' && !district)} onPress={() => changeStep(target)}>
                <Text style={[styles.step, target === step && styles.activeStep]}>{labels[target]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {step === 'neighborhood' ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.subtitle}>Escribe el nombre de tu barrio, sector o comunidad.</Text>
              <TextInput accessibilityLabel="Barrio o sector" style={[styles.searchBox, { color: Colors.secondary }]} value={neighborhood} onChangeText={setNeighborhood} placeholder="Ej.: Los Olivos, Sector 2" placeholderTextColor={Colors.slateDim} maxLength={120} editable={!saving} />
              {district === LEGACY_CUSCO_UBIGEO && (
                <View style={styles.steps}>
                  {INITIAL_NEIGHBORHOODS.map(n => <TouchableOpacity key={n.id} disabled={saving} onPress={() => setNeighborhood(n.name)}><Text style={styles.step}>{n.name}</Text></TouchableOpacity>)}
                </View>
              )}
              <TouchableOpacity accessibilityRole="button" style={styles.saveButton} disabled={saving} onPress={() => { void handleSave(); }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Usar esta ubicación</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color={Colors.slateDim} />
                <TextInput style={styles.searchInput} accessibilityLabel={`Buscar ${labels[step]}`} placeholder={`Buscar ${labels[step].toLowerCase()}...`} placeholderTextColor={Colors.slateDim} value={search} onChangeText={setSearch} autoCapitalize="none" />
              </View>
              <FlatList key={step} data={filtered} keyExtractor={item => item.code} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.subtitle}>No se encontraron resultados.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity accessibilityRole="button" style={[styles.itemButton, styles.itemButtonNormal]} onPress={() => select(item.code)}>
                    <Text style={[styles.itemName, styles.itemNameNormal]}>{item.name}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                )} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Mount a fresh draft on each opening, so cancellation never persists edits.
export const NeighborhoodModal: React.FC<NeighborhoodModalProps> = props => props.visible ? <LocationForm {...props} /> : null;

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  step: { color: Colors.secondaryMuted, backgroundColor: Colors.surfaceSubtle, padding: 8, borderRadius: 8, fontSize: 12 },
  activeStep: { color: Colors.primaryDark, fontWeight: '700', backgroundColor: '#eff6ff' },
  error: { color: Colors.emergencyDark, marginBottom: 12 },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
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
    maxHeight: '90%',
    height: '80%',
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
