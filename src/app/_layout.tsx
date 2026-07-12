import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/global.css';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f4f5f2' },
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
