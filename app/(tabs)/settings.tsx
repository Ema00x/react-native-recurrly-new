import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/(auth)/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="text-xl font-sans-bold mb-8">Settings</Text>
      
      <View className="mt-10">
        <Pressable
          onPress={handleLogout}
          className="rounded-lg bg-accent p-6 px-6 py-4"
        >
          <Text className="font-sans-semibold text-base text-white text-center">
            Logout
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Settings;
