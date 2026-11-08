import * as WebBrowser from 'expo-web-browser';
import { normalizePeruMobilePhone } from './validation';
export async function openWhatsApp(phone: string, message: string) {
  const normalized=normalizePeruMobilePhone(phone);
  if (!normalized) throw new Error('El teléfono de contacto no es válido.');
  await WebBrowser.openBrowserAsync(`https://wa.me/${normalized.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`);
}
