import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `@ayllu_avatar:${userId}`;

export async function saveLocalAvatar(userId: string, image: string): Promise<void> {
  if (!image.startsWith('data:image/')) throw new Error('Elige una imagen válida.');
  await AsyncStorage.setItem(key(userId), image);
}

export async function getLocalAvatar(userId: string, providerPhoto?: unknown): Promise<string> {
  const local = await AsyncStorage.getItem(key(userId));
  if (local?.startsWith('data:image/')) return local;
  return typeof providerPhoto === 'string' && providerPhoto.startsWith('https://') ? providerPhoto : '';
}
