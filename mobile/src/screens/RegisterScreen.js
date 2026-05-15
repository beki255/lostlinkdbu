import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }) {
  const { register, googleLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    selectAccount: true,
  });

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill all fields' });
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
      Toast.show({ type: 'success', text1: 'Account created! Check email for OTP.' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await googlePromptAsync();
      if (result?.type === 'success') {
        await googleLogin(result.params.id_token);
        Toast.show({ type: 'success', text1: 'Account created!' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Google Sign-Up Failed', text2: err.message });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>L</Text></View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join LostLink DBU community</Text>
      </View>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password (min 6 characters)" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={[styles.googleButton, !googleRequest && styles.googleButtonDisabled]}
          onPress={handleGoogleSignUp} disabled={!googleRequest}>
          <Text style={[styles.googleButtonText, !googleRequest && styles.googleButtonTextDisabled]}>
            {googleRequest ? 'Continue with Google' : 'Loading...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5ff', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 56, height: 56, backgroundColor: '#0057B8', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  button: { backgroundColor: '#0057B8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 13, marginHorizontal: 12 },
  googleButton: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  googleButtonDisabled: { opacity: 0.5 },
  googleButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  googleButtonTextDisabled: { color: '#9CA3AF' },
  link: { alignItems: 'center', marginTop: 20 },
  linkText: { color: '#0057B8', fontSize: 14 },
});
