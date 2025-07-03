
import { Text, TextInput, Button, View } from 'react-native'
import { useSignUp, useSSO } from '@clerk/clerk-expo'
import { useCallback, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, useRouter } from 'expo-router';  
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo'
export default function Page() {
    const { isLoaded, signUp, setActive } = useSignUp()
    const router = useRouter()
    const { startSSOFlow } = useSSO()
    const [emailAddress, setEmailAddress] = useState('')
    const [password, setPassword] = useState('')
    const [pendingVerification, setPendingVerification] = useState(false)
    const [code, setCode] = useState('')
    const { user } = useUser()
    // Handle submission of sign-up form
    const onSignUpPress = async () => {
        if (!isLoaded) return

        // Start sign-up process using email and password provided
        try {
            await signUp.create({
                emailAddress,
                password,
            })

            // Send user an email with verification code
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

            // Set 'pendingVerification' to true to display second form
            // and capture OTP code
            setPendingVerification(true)
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(err, null, 2))
        }
    }

    // Handle submission of verification form
    const onVerifyPress = async () => {
        if (!isLoaded) return

        try {
            // Use the code the user provided to attempt verification
            const signUpAttempt = await signUp.attemptEmailAddressVerification({
                code,
            })

            // If verification was completed, set the session to active
            // and redirect the user
            if (signUpAttempt.status === 'complete') {
                await setActive({ session: signUpAttempt.createdSessionId })
                // Llama a tu backend
                const res = await fetch('http://192.168.0.116:3000/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: emailAddress, contrasena: password }),
                })
                const data = await res.json()

                // Guarda el token
                await AsyncStorage.setItem('token', data.token)
                router.replace('/')
            } else {
                // If the status is not complete, check why. User may need to
                // complete further steps.
                console.error(JSON.stringify(signUpAttempt, null, 2))
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(err, null, 2))
        }
    }

    const handleOAuthPress = useCallback(async (strategy: 'oauth_google' | 'oauth_facebook' | 'oauth_apple') => {
        try {
            const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
                strategy,
                redirectUrl: AuthSession.makeRedirectUri(),
            });

            if (createdSessionId) {
                await setActive!({ session: createdSessionId });
                const res = await fetch('http://192.168.0.116:3000/auth/oauth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        proveedor: strategy.replace('oauth_', ''),
                        sub: user?.id || '',
                        correo: user?.primaryEmailAddress?.emailAddress || '',
                    }),
                })
                const data = await res.json()
                await AsyncStorage.setItem('token', data.token)
            } else {
                // MFA or additional steps might be needed
                console.warn('Sign in requires additional steps', { signIn, signUp });
            }
        } catch (err) {
            console.error('OAuth error:', JSON.stringify(err, null, 2));
        }
    }, []);

    if (pendingVerification) {
        return (
            <View>
                <Text>Verify your email</Text>
                <TextInput
                    value={code}
                    placeholder="Enter your verification code"
                    placeholderTextColor="#666666"
                    onChangeText={(code) => setCode(code)}
                />
                <Button title="Verify" onPress={onVerifyPress} />
            </View>
        )
    }

    WebBrowser.maybeCompleteAuthSession()

    return (
        <View>
            <View>
                <Text>Sign up</Text>
                <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Enter email"
                    placeholderTextColor="#666666"
                    onChangeText={(email) => setEmailAddress(email)}
                />
                <TextInput
                    value={password}
                    placeholder="Enter password"
                    placeholderTextColor="#666666"
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                />
                <Button title="Continue" onPress={onSignUpPress} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Text>Have an account?</Text>
                    <Link href="/sign-in">
                        <Text>Sign in</Text>
                    </Link>
                </View>
                <View>
                    <Button title="Sign in with Google" onPress={() => handleOAuthPress('oauth_google')} />
                    <Button title="Sign in with Apple" onPress={() => handleOAuthPress('oauth_apple')} />
                    <Button title="Sign in with Facebook" onPress={() => handleOAuthPress('oauth_facebook')} />
                </View>
            </View>
        </View>
    )
}