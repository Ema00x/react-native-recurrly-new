import "@/global.css";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";

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
    let timeout: number | null = null;
    const preventHide = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch {
        // ignore failure and continue to ensure the app can still render
      }
    };

    const hideSplash = async () => {
      if (splashHidden.current) {
        return;
      }
      splashHidden.current = true;
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignore hide errors
      }
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
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [fontsLoaded]);

  if (!isReady) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
