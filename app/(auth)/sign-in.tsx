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
  const { signIn, errors, fetchStatus, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [localErrors, setLocalErrors] = React.useState<string[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [mfaStrategy, setMfaStrategy] = React.useState<string | null>(null);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const getMfaFactorAndSend = async (
    strategies: string[],
  ): Promise<string | null> => {
    const availableFactor = signIn.supportedSecondFactors?.find(
      (factor: { strategy: string }) => strategies.includes(factor.strategy),
    );

    if (!availableFactor) return null;

    try {
      const strategy = availableFactor.strategy;
      if (strategy === "email_code") {
        await signIn.mfa.sendEmailCode();
      } else if (strategy === "phone_code") {
        await signIn.mfa.sendSmsCode();
      } else if (strategy === "totp") {
        // TOTP doesn't require sending, user enters their app secret
        // No send step needed
      } else if (strategy === "backup_code") {
        // Backup code is provided, no send step needed
      }
      return strategy;
    } catch (error) {
      console.error("Error sending MFA code:", error);
      return null;
    }
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
    if (!isLoaded) return;

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
        const strategy = await getMfaFactorAndSend([
          "email_code",
          "phone_code",
          "totp",
          "backup_code",
        ]);
        if (strategy) {
          setMfaStrategy(strategy);
        }
      } else if (signIn.status === "needs_client_trust") {
        // Client trust verification needed
        const strategy = await getMfaFactorAndSend([
          "email_code",
          "phone_code",
          "totp",
          "backup_code",
        ]);
        if (strategy) {
          setMfaStrategy(strategy);
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !mfaStrategy) return;

    setLocalErrors([]);

    if (!code.trim()) {
      setLocalErrors(["Verification code is required"]);
      return;
    }

    try {
      if (mfaStrategy === "email_code") {
        await signIn.mfa.verifyEmailCode({ code });
      } else if (mfaStrategy === "phone_code") {
        await signIn.mfa.verifySmsCode({ code });
      } else if (mfaStrategy === "totp") {
        await signIn.mfa.verifyTOTPCode({ code });
      } else if (mfaStrategy === "backup_code") {
        await signIn.mfa.verifyBackupCode({ code });
      }

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
    if (!isLoaded || !mfaStrategy) return;

    try {
      if (mfaStrategy === "email_code") {
        await signIn.mfa.sendEmailCode();
      } else if (mfaStrategy === "phone_code") {
        await signIn.mfa.sendSmsCode();
      }
      setLocalErrors([]);
    } catch (error) {
      console.error("Resend error:", error);
    }
  };

  const handleStartOver = async () => {
    if (!isLoaded) return;

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
              {mfaStrategy === "email_code"
                ? `We sent a verification code to ${email}`
                : mfaStrategy === "phone_code"
                  ? "We sent a verification code via SMS"
                  : mfaStrategy === "totp"
                    ? "Enter the code from your authenticator app"
                    : mfaStrategy === "backup_code"
                      ? "Enter a backup code"
                      : "Enter verification code"}
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
            {"Don't have an account?"}
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
