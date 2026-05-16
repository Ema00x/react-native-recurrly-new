import { useOAuth, useSignIn } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

interface SignInErrors {
  fields?: {
    identifier?: { message: string };
    password?: { message: string };
    code?: { message: string };
  };
}

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [localErrors, setLocalErrors] = React.useState<string[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        setActive?.({ session: createdSessionId });
        router.push("/");
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      setLocalErrors(["Google sign in failed. Please try again or use email."]);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLocalErrors([]);

    // Client-side validation
    if (!email.trim()) {
      setLocalErrors(["Email is required"]);
      return;
    }

    if (!validateEmail(email)) {
      setLocalErrors(["Please enter a valid email"]);
      return;
    }

    if (!password) {
      setLocalErrors(["Password is required"]);
      return;
    }

    try {
      await signIn.password({ emailAddress: email, password });

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({
            session,
            decorateUrl,
          }: {
            session: any;
            decorateUrl: (url: string) => string;
          }) => {
            if (session?.currentTask) {
              // Handle session tasks if any
              return;
            }

            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              // Web redirect
              window.location.href = url;
            } else {
              router.push(url as Href);
            }
          },
        });
      } else if (signIn.status === "needs_second_factor") {
        // User needs additional verification
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor: { strategy: string }) => factor.strategy === "email_code",
        );

        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
        }
      } else if (signIn.status === "needs_client_trust") {
        // Client trust verification needed
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor: { strategy: string }) => factor.strategy === "email_code",
        );

        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleVerifyCode = async () => {
    setLocalErrors([]);

    if (!code.trim()) {
      setLocalErrors(["Verification code is required"]);
      return;
    }

    try {
      await signIn.mfa.verifyEmailCode({ code });

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({
            session,
            decorateUrl,
          }: {
            session: any;
            decorateUrl: (url: string) => string;
          }) => {
            if (session?.currentTask) {
              return;
            }

            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url as Href);
            }
          },
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

  const handleResendCode = async () => {
    try {
      await signIn.mfa.sendEmailCode();
      setLocalErrors([]);
    } catch (error) {
      console.error("Resend error:", error);
    }
  };

  const handleStartOver = async () => {
    try {
      await signIn.reset();
      setEmail("");
      setPassword("");
      setCode("");
      setLocalErrors([]);
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  // Show verification code screen if needed
  if (
    signIn?.status === "needs_client_trust" ||
    signIn?.status === "needs_second_factor"
  ) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="flex-grow"
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="font-sans-bold text-3xl text-primary">
              Verify your account
            </Text>
            <Text className="mt-2 text-base text-mutedForeground">
              We sent a verification code to {email}
            </Text>
          </View>

          {/* Error Messages */}
          {(localErrors.length > 0 || errors?.fields?.code) && (
            <View className="mb-6 rounded-lg bg-destructive/10 p-4">
              {localErrors.map((error, idx) => (
                <Text key={idx} className="text-sm text-destructive">
                  {error}
                </Text>
              ))}
              {errors?.fields?.code && (
                <Text className="text-sm text-destructive">
                  {errors.fields.code.message}
                </Text>
              )}
            </View>
          )}

          {/* Code Input */}
          <View className="mb-6 gap-3">
            <Text className="font-sans-semibold text-sm text-primary">
              Verification code
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-card px-4 py-3 font-sans-regular text-base text-primary placeholder:text-mutedForeground"
              placeholder="000000"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
              placeholderTextColor="#999"
              editable={fetchStatus !== "fetching"}
            />
          </View>

          {/* Verify Button */}
          <Pressable
            className="mb-4 flex-row items-center justify-center rounded-lg bg-accent py-3"
            onPress={handleVerifyCode}
            disabled={fetchStatus === "fetching"}
          >
            {fetchStatus === "fetching" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-sans-semibold text-base text-white">
                Verify code
              </Text>
            )}
          </Pressable>

          {/* Resend Code Button */}
          <Pressable
            className="mb-4 flex-row items-center justify-center rounded-lg bg-muted py-3"
            onPress={handleResendCode}
            disabled={fetchStatus === "fetching"}
          >
            <Text className="font-sans-semibold text-base text-accent">
              Resend code
            </Text>
          </Pressable>

          {/* Start Over Button */}
          <Pressable
            className="rounded-lg bg-muted py-3"
            onPress={handleStartOver}
            disabled={fetchStatus === "fetching"}
          >
            <Text className="text-center font-sans-semibold text-base text-primary">
              Start over
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow"
    >
      <View className="flex-1 justify-center px-6 py-8">
        {/* Branding */}
        <View className="mb-12">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-lg bg-accent">
            <Text className="font-sans-bold text-3xl text-white">R</Text>
          </View>
          <Text className="font-sans-bold text-3xl text-primary">
            Welcome back
          </Text>
          <Text className="mt-2 text-base text-mutedForeground">
            Sign in to manage your subscriptions
          </Text>
        </View>

        {/* Error Messages */}
        {(localErrors.length > 0 ||
          errors?.fields?.identifier ||
          errors?.fields?.password) && (
          <View className="mb-6 rounded-lg bg-destructive/10 p-4">
            {localErrors.map((error, idx) => (
              <Text key={idx} className="text-sm text-destructive">
                {error}
              </Text>
            ))}
            {errors?.fields?.identifier && (
              <Text className="text-sm text-destructive">
                {errors.fields.identifier.message}
              </Text>
            )}
            {errors?.fields?.password && (
              <Text className="text-sm text-destructive">
                {errors.fields.password.message}
              </Text>
            )}
          </View>
        )}

        {/* Email Input */}
        <View className="mb-6 gap-3">
          <Text className="font-sans-semibold text-sm text-primary">
            Email address
          </Text>
          <TextInput
            className="rounded-lg border border-border bg-card px-4 py-3 font-sans-regular text-base text-primary placeholder:text-mutedForeground"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor="#999"
            editable={fetchStatus !== "fetching"}
          />
        </View>

        {/* Password Input */}
        <View className="mb-8 gap-3">
          <Text className="font-sans-semibold text-sm text-primary">
            Password
          </Text>
          <TextInput
            className="rounded-lg border border-border bg-card px-4 py-3 font-sans-regular text-base text-primary placeholder:text-mutedForeground"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholderTextColor="#999"
            editable={fetchStatus !== "fetching"}
          />
        </View>

        {/* Sign In Button */}
        <Pressable
          className="mb-6 flex-row items-center justify-center rounded-lg bg-accent py-3"
          onPress={handleSignIn}
          disabled={!email || !password || fetchStatus === "fetching"}
        >
          {fetchStatus === "fetching" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-sans-semibold text-base text-white">
              Sign in
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View className="mb-6 flex-row items-center gap-3">
          <View className="flex-1 border-t border-border" />
          <Text className="font-sans-regular text-xs text-mutedForeground">
            OR
          </Text>
          <View className="flex-1 border-t border-border" />
        </View>

        {/* Google Sign In Button */}
        <Pressable
          className="mb-6 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-card py-3"
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading || fetchStatus === "fetching"}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#081126" />
          ) : (
            <>
              <Text className="text-xl font-sans-bold text-primary">G</Text>
              <Text className="font-sans-semibold text-base text-primary">
                Google
              </Text>
            </>
          )}
        </Pressable>

        {/* Sign Up Link */}
        <View className="flex-row items-center justify-center gap-1">
          <Text className="font-sans-regular text-sm text-mutedForeground">
            Don't have an account?
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="font-sans-semibold text-sm text-accent">
                Sign up
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
