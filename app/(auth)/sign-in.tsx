import React, { useCallback, useEffect, useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { useSSO } from '@clerk/clerk-expo'
import { useSignIn } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Text, TextInput, Button, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useUser } from '@clerk/clerk-expo'



// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession()

export default function Page() {
    const { signIn, setActive, isLoaded } = useSignIn()
    const router = useRouter()
    const { user } = useUser()
    const [emailAddress, setEmailAddress] = useState('')
    const [password, setPassword] = useState('')    

    // Use the `useSSO()` hook to access the `startSSOFlow()` method
    const { startSSOFlow } = useSSO()

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
    // Handle the submission of the sign-in form
    const onSignInPress = React.useCallback(async () => {
        if (!isLoaded) return

        // Start the sign-in process using the email and password provided
        try {
            const signInAttempt = await signIn.create({
                identifier: emailAddress,
                password,  
            })

            // If sign-in process is complete, set the created session as active
            // and redirect the user
            if (signInAttempt.status === 'complete') {
                await setActive({ session: signInAttempt.createdSessionId })
                const res = await fetch('https://TU_BACKEND_URL/auth/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: emailAddress, contrasena: password }),
                })
                const data = await res.json()

                await AsyncStorage.setItem('token', data.token)
                router.replace('/')
            } else {
                // If the status is not complete, check why. User may need to
                // complete further steps.
                console.error(JSON.stringify(signInAttempt, null, 2))
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(err, null, 2))
        }
    }, [isLoaded, emailAddress, password])


    return (
        <>
            <View>
                <Text>Sign in</Text>
                <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Enter email"
                    placeholderTextColor="#666666"
                    onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
                />
                <TextInput
                    value={password}
                    placeholder="Enter password"
                    placeholderTextColor="#666666"
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                />
                <Button title="Sign in" onPress={onSignInPress} />

            </View>
        <View>
            <Button title="Sign in with Google" onPress={() => handleOAuthPress('oauth_google')} />
            <Button title="Sign in with Apple" onPress={() => handleOAuthPress('oauth_apple')} />
            <Button title="Sign in with Facebook" onPress={() => handleOAuthPress('oauth_facebook')} />
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
            <Text>Don't have an account?</Text>
                <Link href="/sign-up">
                    <Text>Sign up</Text>
                </Link>
        </View>
       
        </>
    );

}