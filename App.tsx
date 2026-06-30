import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthProvider';
import { AppLockProvider } from './src/context/AppLockProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AppLockProvider>
          <AppNavigator />
        </AppLockProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
