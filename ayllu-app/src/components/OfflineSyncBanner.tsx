import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline, syncQueue, synchronizeQueue, lastSyncTime } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const pendingCount = syncQueue.length;

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await synchronizeQueue();
      setSyncFeedback(res.success
        ? `El servidor confirmó ${res.count} elemento(s).`
        : `${res.count} confirmado(s); ${res.failed} sigue(n) pendiente(s). ${res.message ?? ''}`);
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch {
      setSyncFeedback('Error al sincronizar');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !syncFeedback) {
    // Normal connected state banner (RNF-09)
    return (
      <View style={styles.onlineContainer}>
        <View style={styles.leftRow}>
          <MaterialIcons name="cloud-done" size={16} color={Colors.primary} />
          <Text style={styles.onlineText} numberOfLines={1}>
            Datos disponibles en este dispositivo
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOnline ? styles.syncedContainer : styles.offlineContainer]}>
      <View style={styles.contentRow}>
        <View style={styles.iconWrapper}>
          <MaterialIcons 
            name={isOnline ? (pendingCount > 0 ? "sync" : "cloud-done") : "wifi-off"} 
            size={18} 
            color={isOnline ? Colors.primaryDark : Colors.warningText} 
          />
        </View>

        <View style={styles.textWrapper}>
          <Text style={styles.titleText}>
            {syncFeedback ? syncFeedback : (
              !isOnline 
                ? 'Modo sin internet activo' 
                : `${pendingCount} elemento(s) pendientes de subir`
            )}
          </Text>
          <Text style={styles.subtitleText}>
            {!isOnline 
              ? (pendingCount > 0 
                  ? `${pendingCount} acción(es) solo en este dispositivo; no han llegado al servidor.`
                  : `Caché disponible. Última confirmación del servidor: ${lastSyncTime || 'ninguna todavía'}`)
              : syncQueue.some(item => item.status === 'error')
                ? 'Algunos envíos fallaron. Se conservan en la cola para reintentar.'
                : `Haz clic para sincronizar con la red comunitaria.`
            }
          </Text>
        </View>

        {/* Sync Action Button */}
        {isOnline && pendingCount > 0 && (
          <TouchableOpacity 
            style={styles.syncButton} 
            onPress={handleManualSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={14} color="#ffffff" />
                <Text style={styles.syncButtonText}>Sincronizar</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  onlineText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    fontWeight: '500',
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  offlineContainer: {
    backgroundColor: '#fffbeb',
    borderBottomColor: '#fde68a',
  },
  syncedContainer: {
    backgroundColor: '#eff6ff',
    borderBottomColor: '#bfdbfe',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  subtitleText: {
    fontSize: 10,
    color: Colors.secondaryMuted,
    marginTop: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
