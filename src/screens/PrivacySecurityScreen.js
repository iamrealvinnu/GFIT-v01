import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

const LIGHT_PURPLE = '#6B4E8C';

export default function PrivacySecurityScreen({ navigation }) {
  const { biometricEnabled, setBiometricPreference } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = has ? await LocalAuthentication.isEnrolledAsync() : false;
        setSupported(has);
        setEnrolled(isEnrolled);
      } catch (e) {
        setSupported(false);
        setEnrolled(false);
      }
    })();
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
      <LinearGradient
        colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous screen"
          >
            <Icon name="chevron-left" size={28} color={BRAND_COLORS.YELLOW} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Account Security</Text>
            <Text style={styles.sectionText}>
              We use advanced encryption to protect your account. Enable two-factor authentication (2FA) to add an extra layer of security.
            </Text>
          </View>
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.sectionTitle}>Biometric Unlock</Text>
                <Text style={styles.sectionText}>
                  Use Face ID/Touch ID/Android Biometrics to unlock your saved session on this device.
                </Text>
                {!supported && (
                  <Text style={styles.noteText}>This device does not support biometrics.</Text>
                )}
                {supported && !enrolled && (
                  <Text style={styles.noteText}>No biometrics enrolled. Add one in device settings.</Text>
                )}
              </View>
              <Switch
                value={biometricEnabled && supported && enrolled}
                onValueChange={(val) => setBiometricPreference(!!val)}
                disabled={!supported || !enrolled}
              />
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Data Protection</Text>
            <Text style={styles.sectionText}>
              Your data is stored securely and only accessible to authorized personnel. Learn more in our Privacy Policy.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Manage Permissions</Text>
            <Text style={styles.sectionText}>
              Control app permissions for camera, location, and notifications in your device settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 20,
  },
  card: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
    fontWeight: '400',
    marginBottom: 12,
  },
});