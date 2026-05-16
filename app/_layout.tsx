import "@/global.css";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";

// ✅ Safe helper to guarantee string
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const publishableKey = getEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  const [isReady, setIsReady] = useState(false);
  const splashHidden = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const preventHide = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch {}
    };

    const hideSplash = async () => {
      if (splashHidden.current) return;

      splashHidden.current = true;

      try {
        await SplashScreen.hideAsync();
      } catch {}

      setIsReady(true);
    };

    preventHide();

    timeout = setTimeout(() => {
      hideSplash();
    }, 3000);

    if (fontsLoaded) {
      hideSplash();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [fontsLoaded]);

  if (!isReady) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkProvider>
  );
}
