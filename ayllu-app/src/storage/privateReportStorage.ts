import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface PrivateEmergencyReportData {
  category: string;
  title: string;
  description: string;
  neighborhood: string;
  priority: string;
  reportedBy: string;
  beneficiaryName: string;
  beneficiaryAge?: number;
  exactAddress: string;
  contactPhone: string;
  consentAt: string;
}

const key = (reportId: string, field: string) => `ayllu:report:${reportId}:${field}`;

export const PrivateReportStorage = {
  async save(reportId: string, data: PrivateEmergencyReportData): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('El almacenamiento seguro de datos de emergencia no está disponible en Web. Usa la app móvil.');
    }

    const entries: [string, string][] = [
      ['category', data.category],
      ['title', data.title],
      ['description', data.description],
      ['neighborhood', data.neighborhood],
      ['priority', data.priority],
      ['reportedBy', data.reportedBy],
      ['name', data.beneficiaryName],
      ['age', data.beneficiaryAge == null ? '' : String(data.beneficiaryAge)],
      ['address', data.exactAddress],
      ['phone', data.contactPhone],
      ['consent', data.consentAt],
    ];

    try {
      for (const [field, value] of entries) {
        await SecureStore.setItemAsync(key(reportId, field), value);
      }
    } catch {
      await this.remove(reportId);
      throw new Error('No se pudieron proteger los datos privados en este dispositivo. El reporte no se guardó.');
    }
  },

  async get(reportId: string): Promise<PrivateEmergencyReportData | null> {
    if (Platform.OS === 'web') return null;

    const [category, title, description, neighborhood, priority, reportedBy, beneficiaryName, age, exactAddress, contactPhone, consentAt] = await Promise.all([
      SecureStore.getItemAsync(key(reportId, 'category')),
      SecureStore.getItemAsync(key(reportId, 'title')),
      SecureStore.getItemAsync(key(reportId, 'description')),
      SecureStore.getItemAsync(key(reportId, 'neighborhood')),
      SecureStore.getItemAsync(key(reportId, 'priority')),
      SecureStore.getItemAsync(key(reportId, 'reportedBy')),
      SecureStore.getItemAsync(key(reportId, 'name')),
      SecureStore.getItemAsync(key(reportId, 'age')),
      SecureStore.getItemAsync(key(reportId, 'address')),
      SecureStore.getItemAsync(key(reportId, 'phone')),
      SecureStore.getItemAsync(key(reportId, 'consent')),
    ]);

    if ([category, title, description, neighborhood, priority, reportedBy, beneficiaryName, exactAddress, contactPhone, consentAt].some(value => value == null)) return null;
    return {
      category: category!,
      title: title!,
      description: description!,
      neighborhood: neighborhood!,
      priority: priority!,
      reportedBy: reportedBy!,
      beneficiaryName: beneficiaryName!,
      beneficiaryAge: age ? Number(age) : undefined,
      exactAddress: exactAddress!,
      contactPhone: contactPhone!,
      consentAt: consentAt!,
    };
  },

  async remove(reportId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await Promise.all(['category', 'title', 'description', 'neighborhood', 'priority', 'reportedBy', 'name', 'age', 'address', 'phone', 'consent'].map(field =>
      SecureStore.deleteItemAsync(key(reportId, field)),
    ));
  },
};
