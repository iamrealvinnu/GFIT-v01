import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

const LIGHT_PURPLE = '#6B4E8C';
const { width, height } = Dimensions.get('window');

const countryCodes = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
];

export default function PhoneNumberScreen({ navigation, route }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState(''); // Added missing state
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPwd, setIsResettingPwd] = useState(false);
  const [isWrongPasswordModalVisible, setIsWrongPasswordModalVisible] = useState(false); // Added missing state
  const [password, setPassword] = useState(''); // Added missing state
  const { login } = useAuth();
  
  const isLogin = route?.params?.isLogin || false;

  useEffect(() => {
    setSelectedCountry(countryCodes[0]);
  }, []);

  // Try to extract a usable name from a JWT token payload
  const extractNameFromJwt = (token) => {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      payload += '='.repeat((4 - (payload.length % 4)) % 4);

      let jsonStr = null;
      if (typeof atob === 'function') {
        jsonStr = atob(payload);
      } else if (typeof Buffer !== 'undefined') {
        jsonStr = Buffer.from(payload, 'base64').toString('utf8');
      } else if (globalThis && typeof globalThis.atob === 'function') {
        jsonStr = globalThis.atob(payload);
      } else {
        return null;
      }

      try {
        const decoded = decodeURIComponent(escape(jsonStr));
        const obj = JSON.parse(decoded);
        return obj?.name || obj?.unique_name || obj?.given_name || obj?.email || null;
      } catch (e) {
        const obj = JSON.parse(jsonStr);
        return obj?.name || obj?.unique_name || obj?.given_name || obj?.email || null;
      }
    } catch (err) {
      console.log('JWT decode error:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isLogin) {
        try {
          const res = await fetch('https://gfit-dev.gdinexus.com:8412/api/Member/login', {
            method: 'POST',
            headers: {
              'Accept': '*/*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: phoneNumber,
              password: password, // Include password in login request
            }),
          });

          const data = await res.json();
          console.log('API Response:', data);

          if (!res.ok) {
            const msg = data?.message || 'Login failed. Please check your credentials.';
            setErrorMessage(msg);
            setIsWrongPasswordModalVisible(true); // Show error modal
          } else {
            const token = data?.token;
            const extractedName = extractNameFromJwt(token);
            const userData = {
              phoneNumber: selectedCountry.code + phoneNumber,
              name: data?.name || extractedName || 'Member',
            };
            await login(userData, token);
            navigation.navigate('MainApp');
          }
        } catch (apiError) {
          console.log('Login API error:', apiError);
          Alert.alert('Error', 'Unable to contact login server. Please try again.');
        }
      } else {
        // Handle registration logic here if needed
      }
    } catch (error) {
      console.log('General error:', error);
      Alert.alert('Error', isLogin ? 'Login failed. Please check your credentials.' : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const maxLength = 10;
    return cleaned.slice(0, maxLength);
  };

  const handlePhoneNumberChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const selectCountry = (country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setPhoneNumber('');
  };

  const sendOtp = async () => {
    if (!fpEmail || fpEmail.trim().length === 0) {
      Alert.alert('Error', 'Please enter your email to receive OTP.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const url = `https://gfit-dev.gdinexus.com:8412/api/Member/send-otp?email=${encodeURIComponent(fpEmail)}`;
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        Alert.alert('OTP Sent', 'An OTP has been sent to your email.');
      } else {
        const text = await res.text();
        const msg = text || 'Failed to send OTP. Please try again.';
        Alert.alert('Error', msg);
      }
    } catch (e) {
      console.log('sendOtp error:', e);
      Alert.alert('Error', 'Unable to contact server. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resetPassword = async () => {
    if (!fpEmail || !fpOtp || !fpNewPassword) {
      Alert.alert('Error', 'Please fill in email, OTP, and new password.');
      return;
    }

    setIsResettingPwd(true);
    try {
      const res = await fetch('https://gfit-dev.gdinexus.com:8412/api/Member/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body: JSON.stringify({
          email: fpEmail,
          otpCode: fpOtp,
          newPassword: fpNewPassword, // Include new password in request
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Your password has been reset. You can now login.', [
          { text: 'OK', onPress: () => setShowForgotModal(false) }
        ]);
        setFpEmail('');
        setFpOtp('');
        setFpNewPassword('');
      } else {
        const text = await res.text();
        const msg = text || 'Failed to reset password. Please try again.';
        Alert.alert('Error', msg);
      }
    } catch (e) {
      console.log('resetPassword error:', e);
      Alert.alert('Error', 'Unable to contact server. Please try again.');
    } finally {
      setIsResettingPwd(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
        style={styles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.YELLOW} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {isLogin ? 'Member Login' : 'Enter Phone Number'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Enter your phone number and gym-provided password' 
                : 'We\'ll help you create your account'
              }
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.phoneInputWrapper}>
              <TouchableOpacity
                style={styles.countryCodeSelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                <Ionicons name="chevron-down" size={16} color={BRAND_COLORS.YELLOW} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
              />
            </View>
            
            {isLogin && (
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter gym-provided password"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}
            
            <Text style={styles.helpText}>
              {isLogin 
                ? 'Enter your registered phone number and password provided by the gym'
                : 'Enter your mobile number to create your account'
              }
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!phoneNumber || phoneNumber.length < 10 || (isLogin && !password)) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={!phoneNumber || phoneNumber.length < 10 || (isLogin && !password) || isLoading}
            >
              <LinearGradient
                colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
                style={styles.buttonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading 
                    ? (isLogin ? 'Logging in...' : 'Creating Account...') 
                    : (isLogin ? 'Login' : 'Continue')
                  }
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {isLogin && (
            <View style={styles.forgotRow}>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <Modal
            visible={isWrongPasswordModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsWrongPasswordModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.wrongPasswordModalContainer}>
                <Text style={styles.wrongPasswordModalTitle}>Login Failed</Text>
                <Text style={styles.wrongPasswordModalMessage}>
                  {errorMessage}
                </Text>
                <TouchableOpacity
                  style={styles.wrongPasswordModalButton}
                  onPress={() => setIsWrongPasswordModalVisible(false)}
                  accessible={true}
                  accessibilityLabel="OK"
                  accessibilityHint="Dismiss the login error alert"
                >
                  <Text style={styles.wrongPasswordModalButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showForgotModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowForgotModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowForgotModal(false)}
                  >
                    <Ionicons name="close" size={24} color={BRAND_COLORS.YELLOW} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Email</Text>
                  <TextInput
                    style={[styles.passwordInput, { backgroundColor: UI_COLORS.OVERLAY_LIGHT, borderRadius: 10, paddingHorizontal: 12 }]}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={fpEmail}
                    onChangeText={setFpEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, { marginTop: 14 }]}
                    onPress={sendOtp}
                    disabled={isSendingOtp}
                  >
                    <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.buttonGradient}>
                      <Text style={styles.submitButtonText}>{isSendingOtp ? 'Sending OTP...' : 'Send OTP'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <Text style={{ color: 'rgba(255,255,255,0.9)', marginVertical: 12 }}>OTP Code</Text>
                  <TextInput
                    style={[styles.passwordInput, { backgroundColor: UI_COLORS.OVERLAY_LIGHT, borderRadius: 10, paddingHorizontal: 12 }]}
                    placeholder="Enter OTP"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={fpOtp}
                    onChangeText={setFpOtp}
                    keyboardType="numeric"
                  />

                  <Text style={{ color: 'rgba(255,255,255,0.9)', marginVertical: 12 }}>New Password</Text>
                  <TextInput
                    style={[styles.passwordInput, { backgroundColor: UI_COLORS.OVERLAY_LIGHT, borderRadius: 10, paddingHorizontal: 12 }]}
                    placeholder="Enter new password"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={fpNewPassword}
                    onChangeText={setFpNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, { marginTop: 16 }]}
                    onPress={resetPassword}
                    disabled={isResettingPwd}
                  >
                    <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.buttonGradient}>
                      <Text style={styles.submitButtonText}>{isResettingPwd ? 'Resetting...' : 'Reset Password'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showCountryPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCountryPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Country</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowCountryPicker(false)}
                  >
                    <Ionicons name="close" size={24} color={BRAND_COLORS.YELLOW} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                  {countryCodes.map((country, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.countryItem,
                        selectedCountry.code === country.code && styles.selectedCountryItem
                      ]}
                      onPress={() => selectCountry(country)}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <View style={styles.countryInfo}>
                        <Text style={styles.countryName}>{country.country}</Text>
                        <Text style={styles.countryCode}>{country.code}</Text>
                      </View>
                      {selectedCountry.code === country.code && (
                        <Ionicons name="checkmark" size={20} color={BRAND_COLORS.YELLOW} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  background: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    marginBottom: 40,
    paddingTop: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 40,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  countryCodeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCodeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    paddingVertical: 16,
  },
  passwordInputWrapper: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  passwordInput: {
    color: '#FFFFFF',
    fontSize: 18,
    paddingVertical: 16,
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 40,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: LIGHT_PURPLE,
    borderRadius: 16,
    width: width * 0.85,
    maxHeight: height * 0.7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
    backgroundColor: 'transparent',
  },
  countryList: {
    maxHeight: height * 0.6,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT,
  },
  selectedCountryItem: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countryInfo: {
    marginLeft: 15,
  },
  countryName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  wrongPasswordModalContainer: {
    backgroundColor: BRAND_COLORS.PURPLE,
    borderRadius: 12,
    padding: 20,
    width: width * 0.8,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  wrongPasswordModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  wrongPasswordModalMessage: {
    fontSize: 16,
    color: STATUS_COLORS.ERROR,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  wrongPasswordModalButton: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  wrongPasswordModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.YELLOW,
  },
  forgotRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});