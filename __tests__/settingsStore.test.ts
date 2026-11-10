jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as SecureStore from 'expo-secure-store';
import { useSettingsStore } from '../src/store/useSettingsStore';

const mockedSetItem = jest.mocked(SecureStore.setItemAsync);
const mockedGetItem = jest.mocked(SecureStore.getItemAsync);
const mockedDelete = jest.mocked(SecureStore.deleteItemAsync);

beforeEach(() => {
  useSettingsStore.setState({
    themeMode: 'system',
    reduceMotion: false,
    notificationsEnabled: false,
    notificationTime: '20:00',
    setThemeMode: useSettingsStore.getState().setThemeMode,
    setReduceMotion: useSettingsStore.getState().setReduceMotion,
    setNotificationsEnabled: useSettingsStore.getState().setNotificationsEnabled,
    setNotificationTime: useSettingsStore.getState().setNotificationTime,
    load: useSettingsStore.getState().load,
    reset: useSettingsStore.getState().reset,
  });
  jest.clearAllMocks();
});

afterEach(() => {
  useSettingsStore.getState().reset();
});

describe('useSettingsStore', () => {
  it('tiene valores por defecto', () => {
    const state = useSettingsStore.getState();

    expect(state.themeMode).toBe('system');
    expect(state.reduceMotion).toBe(false);
    expect(state.notificationsEnabled).toBe(false);
    expect(state.notificationTime).toBe('20:00');
  });

  it('cambia el tema y lo persiste', async () => {
    await useSettingsStore.getState().setThemeMode('dark');

    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('dark');
    expect(mockedSetItem).toHaveBeenCalledWith(
      'me-alcanza-settings',
      expect.stringContaining('"themeMode":"dark"'),
    );
  });

  it('cambia reducir movimiento y lo persiste', async () => {
    await useSettingsStore.getState().setReduceMotion(true);

    const state = useSettingsStore.getState();
    expect(state.reduceMotion).toBe(true);
    expect(mockedSetItem).toHaveBeenCalledWith(
      'me-alcanza-settings',
      expect.stringContaining('"reduceMotion":true'),
    );
  });

  it('cambia el estado de notificaciones y lo persiste', async () => {
    await useSettingsStore.getState().setNotificationsEnabled(true);

    const state = useSettingsStore.getState();
    expect(state.notificationsEnabled).toBe(true);
    expect(mockedSetItem).toHaveBeenCalledWith(
      'me-alcanza-settings',
      expect.stringContaining('"notificationsEnabled":true'),
    );
  });

  it('cambia la hora de notificación y lo persiste', async () => {
    await useSettingsStore.getState().setNotificationTime('08:30');

    const state = useSettingsStore.getState();
    expect(state.notificationTime).toBe('08:30');
    expect(mockedSetItem).toHaveBeenCalledWith(
      'me-alcanza-settings',
      expect.stringContaining('"notificationTime":"08:30"'),
    );
  });

  it('carga valores guardados desde SecureStore', async () => {
    mockedGetItem.mockResolvedValueOnce(
      JSON.stringify({
        themeMode: 'dark',
        reduceMotion: true,
        notificationsEnabled: true,
        notificationTime: '09:00',
      }),
    );

    await useSettingsStore.getState().load();

    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('dark');
    expect(state.reduceMotion).toBe(true);
    expect(state.notificationsEnabled).toBe(true);
    expect(state.notificationTime).toBe('09:00');
  });

  it('usa valores por defecto si SecureStore está vacío', async () => {
    mockedGetItem.mockResolvedValueOnce(null);

    await useSettingsStore.getState().load();

    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('system');
    expect(state.reduceMotion).toBe(false);
  });

  it('borra los datos al resetear', async () => {
    await useSettingsStore.getState().setThemeMode('dark');
    await useSettingsStore.getState().reset();

    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('system');
    expect(mockedDelete).toHaveBeenCalledWith('me-alcanza-settings');
  });
});
