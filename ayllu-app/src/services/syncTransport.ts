import { LEGACY_CUSCO_UBIGEO } from '../lib/ubigeo';
import { SyncQueueItem } from '../types';
import { OfflineStorage } from '../storage/offlineStorage';
import { supabase } from '../lib/supabase';

export async function submitQueuedItem(item: SyncQueueItem): Promise<void> {
  if (!supabase) {
    throw new Error('Backend sin configurar. Configura las variables EXPO_PUBLIC_SUPABASE_* para sincronizar.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!sessionData.session) throw new Error('Inicia sesión para enviar este elemento al servidor.');
  if (!item.ownerUserId) {
    throw new Error('No se conoce qué cuenta creó este elemento pendiente. Elimina el borrador y vuelve a crear el reporte con tu sesión activa.');
  }
  if (item.ownerUserId !== sessionData.session.user.id) {
    throw new Error('Este elemento pendiente pertenece a otra cuenta y no se enviará con la sesión actual.');
  }

  if (item.type === 'favor') {
    const payload = item.payload as Record<string, unknown>;
    const { data, error } = await supabase.rpc('sync_community_favor', {
      p_operation_id: item.id, p_favor: payload, p_action: payload.action ?? 'save',
    });
    if (error) throw new Error(error.message);
    if (data !== payload.id) throw new Error('El servidor no confirmó el favor.');
    return;
  }

  if (item.type !== 'emergency_report') {
    throw new Error(`La sincronización de ${item.type} aún no está habilitada en el backend.`);
  }

  const report = item.payload as Record<string, unknown>;
  const privateDataRef = String(report.privateDataRef ?? report.id ?? '');
  const reportId = String(report.reportId ?? privateDataRef);
  const privateData = await OfflineStorage.getPrivateEmergencyReport(privateDataRef);
  if (!privateData) {
    throw new Error('Faltan los datos privados protegidos en este dispositivo; el reporte sigue pendiente.');
  }
  if (!privateData.consentAt) {
    throw new Error('Este reporte antiguo no guardó el consentimiento. Vuelve a ingresarlo y confírmalo antes de enviarlo.');
  }

  let neighborhoodQuery = supabase.from('neighborhoods').select('id');
  if (privateData.neighborhoodId) neighborhoodQuery = neighborhoodQuery.eq('id', privateData.neighborhoodId);
  else neighborhoodQuery = neighborhoodQuery
    .eq('district_ubigeo', privateData.districtUbigeo ?? LEGACY_CUSCO_UBIGEO)
    .eq('name', privateData.neighborhood);
  const { data: neighborhood, error: neighborhoodError } = await neighborhoodQuery.single();
  if (neighborhoodError || !neighborhood) {
    throw new Error('No se encontró el barrio del reporte en la base de datos.');
  }

  const { data, error } = await supabase.rpc('sync_emergency_report', {
    p_idempotency_key: item.id,
    p_report: {
      id: reportId,
      neighborhood_id: neighborhood.id,
      category: privateData.category,
      title: privateData.title,
      description: privateData.description,
      priority: privateData.priority,
    },
    p_private: {
      beneficiary_name: privateData.beneficiaryName,
      beneficiary_age: privateData.beneficiaryAge ?? null,
      exact_address: privateData.exactAddress,
      contact_phone: privateData.contactPhone,
      consent_at: privateData.consentAt,
      consent_version: 'ayllu-emergency-v1',
    },
  });

  if (error) throw new Error(error.message);
  if (data !== reportId) throw new Error('El servidor no confirmó el mismo identificador del reporte.');
}
