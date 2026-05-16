import { useOAuth, useSignUp } from "@clerk/expo";
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

interface SignUpErrors {
  fields?: {
    emailAddress?: { message: string };
    password?: { message: string };
    code?: { message: string };
  };
}

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [localErrors, setLocalErrors] = React.useState<string[]>([]);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePassword = (value: string) => {
    // At least 8 characters, includes uppercase, lowercase, and number
    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value)
    );
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        setActive?.({ session: createdSessionId });
        router.push("/");
      }
    } catch (error) {
      console.error("Google sign up error:", error);
      setLocalErrors(["Google sign up failed. Please try again or use email."]);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLocalErrors([]);

    // Client-side validation
    const newErrors: string[] = [];

    if (!email.trim()) {
      newErrors.push("Email is required");
    } else if (!validateEmail(email)) {
      newErrors.push("Please enter a valid email");
    }

    if (!password) {
      newErrors.push("Password is required");
    } else if (!validatePassword(password)) {
      newErrors.push(
        "Password must be at least 8 characters with uppercase, lowercase, and number",
      );
    }

    if (!confirmPassword) {
      newErrors.push("Please confirm your password");
    } else if (password !== confirmPassword) {
      newErrors.push("Passwords do not match");
    }

    if (newErrors.length > 0) {
      setLocalErrors(newErrors);
      return;
    }

    try {
      const result = await signUp.password({
        emailAddress: email,
        password,
      });
      console.log("[SIGNUP] Account created. Status:", signUp.status);

      // Send verification code
      try {
        console.log("[EMAIL] Attempting to send email code to:", email);
        await signUp.verifications.sendEmailCode();
        console.log("[EMAIL] ✅ Email code sent successfully");
        setIsVerifying(true);
      } catch (emailError) {
        console.error("[EMAIL] ❌ Failed to send email code:", emailError);
        const errorMsg =
          emailError instanceof Error
            ? emailError.message
            : "Failed to send verification email. Check Clerk Dashboard.";
        setLocalErrors([errorMsg]);
      }
    } catch (error) {
      console.error("[SIGNUP] ❌ Sign up error:", error);
      if (error instanceof Error) {
        setLocalErrors([error.message]);
      } else {
        setLocalErrors(["An error occurred during sign up"]);
      }
    }
  };

  const handleVerifyCode = async () => {
    setLocalErrors([]);

    if (!code.trim()) {
      setLocalErrors(["Verification code is required"]);
      return;
    }

    try {
      console.log("[VERIFY] Verifying email code:", code);
      await signUp.verifications.verifyEmailCode({ code });
      console.log("[VERIFY] ✅ Email code verified!");
      console.log("[VERIFY] SignUp status after verification:", signUp.status);

      // After successful verification, finalize the sign-up
      console.log("[VERIFY] Finalizing sign-up...");
      await signUp.finalize({
        navigate: ({
          session,
          decorateUrl,
        }: {
          session: any;
          decorateUrl: (url: string) => string;
        }) => {
          console.log("[NAVIGATE] Finalizing with session:", session);
          if (session?.currentTask) {
            console.log(
              "[NAVIGATE] Session task detected:",
              session.currentTask,
            );
            return;
          }

          const url = decorateUrl("/");
          console.log("[NAVIGATE] Routing to:", url);
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url as Href);
          }
        },
      });
      console.log("[VERIFY] ✅ Successfully signed in!");
      setIsVerifying(false);
    } catch (error) {
      console.error("[VERIFY] ❌ Verification error:", error);
      if (error instanceof Error) {
        setLocalErrors([error.message]);
      } else {
        setLocalErrors(["Failed to verify code. Please try again."]);
      }
    }
  };

  const handleResendCode = async () => {
    try {
      await signUp.verifications.sendEmailCode();
      setLocalErrors([]);
    } catch (error) {
      console.error("Resend error:", error);
    }
  };

  const handleStartOver = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setLocalErrors([]);
    setIsVerifying(false);
  };

  // Show verification code screen if email verification is needed
  if (
    isVerifying ||
    (signUp?.status === "missing_requirements" &&
      signUp?.unverifiedFields?.includes("email_address") &&
      !signUp?.missingFields?.length)
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
              Verify your email
            </Text>
            <Text className="mt-2 text-base text-mutedForeground">
              We sent a code to {email}
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
                Verify email
              </Text>
            )}
          </Pressable>

          {/* Resend Code Button */}
          <Pressable
            className="mb-4 rounded-lg bg-muted py-3"
            onPress={handleResendCode}
            disabled={fetchStatus === "fetching"}
          >
            <Text className="text-center font-sans-semibold text-base text-accent">
              Didn't receive a code? Resend
            </Text>
          </Pressable>

          {/* Start Over Button */}
          <Pressable
            className="rounded-lg bg-muted py-3"
            onPress={handleStartOver}
            disabled={fetchStatus === "fetching"}
          >
            <Text className="text-center font-sans-regular text-sm text-mutedForeground">
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
            Create account
          </Text>
          <Text className="mt-2 text-base text-mutedForeground">
            Join millions managing subscriptions smarter
          </Text>
        </View>

        {/* Error Messages */}
        {(localErrors.length > 0 ||
          errors?.fields?.emailAddress ||
          errors?.fields?.password) && (
          <View className="mb-6 rounded-lg bg-destructive/10 p-4">
            {localErrors.map((error, idx) => (
              <Text key={idx} className="text-sm text-destructive">
                {error}
              </Text>
            ))}
            {errors?.fields?.emailAddress && (
              <Text className="text-sm text-destructive">
                {errors.fields.emailAddress.message}
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
        <View className="mb-5 gap-2">
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
        <View className="mb-5 gap-2">
          <Text className="font-sans-semibold text-sm text-primary">
            Password
          </Text>
          <TextInput
            className="rounded-lg border border-border bg-card px-4 py-3 font-sans-regular text-base text-primary placeholder:text-mutedForeground"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            placeholderTextColor="#999"
            editable={fetchStatus !== "fetching"}
          />
          {password && (
            <View className="mt-1 gap-1">
              <Text
                className={`text-xs ${
                  password.length >= 8 ? "text-success" : "text-destructive"
                }`}
              >
                • At least 8 characters
              </Text>
              <Text
                className={`text-xs ${
                  /[A-Z]/.test(password) ? "text-success" : "text-destructive"
                }`}
              >
                • Uppercase letter
              </Text>
              <Text
                className={`text-xs ${
                  /[a-z]/.test(password) ? "text-success" : "text-destructive"
                }`}
              >
                • Lowercase letter
              </Text>
              <Text
                className={`text-xs ${
                  /[0-9]/.test(password) ? "text-success" : "text-destructive"
                }`}
              >
                • Number
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Password Input */}
        <View className="mb-8 gap-2">
          <Text className="font-sans-semibold text-sm text-primary">
            Confirm password
          </Text>
          <TextInput
            className="rounded-lg border border-border bg-card px-4 py-3 font-sans-regular text-base text-primary placeholder:text-mutedForeground"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
            placeholderTextColor="#999"
            editable={fetchStatus !== "fetching"}
          />
          {confirmPassword && password !== confirmPassword && (
            <Text className="mt-1 text-xs text-destructive">
              Passwords don't match
            </Text>
          )}
          {confirmPassword && password === confirmPassword && (
            <Text className="mt-1 text-xs text-success">Passwords match</Text>
          )}
        </View>

        {/* Sign Up Button */}
        <Pressable
          className="mb-6 flex-row items-center justify-center rounded-lg bg-accent py-3"
          onPress={handleSignUp}
          disabled={
            !email ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword ||
            fetchStatus === "fetching"
          }
        >
          {fetchStatus === "fetching" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-sans-semibold text-base text-white">
              Create account
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

        {/* Google Sign Up Button */}
        <Pressable
          className="mb-6 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-card py-3"
          onPress={handleGoogleSignUp}
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

        {/* Sign In Link */}
        <View className="flex-row items-center justify-center gap-1">
          <Text className="font-sans-regular text-sm text-mutedForeground">
            Already have an account?
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="font-sans-semibold text-sm text-accent">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Captcha placeholder */}
        <View nativeID="clerk-captcha" className="mt-8" />
      </View>
    </ScrollView>
  );
}
