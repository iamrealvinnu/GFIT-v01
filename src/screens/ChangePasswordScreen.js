import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { Feather as Icon } from '@expo/vector-icons';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

const LIGHT_PURPLE = '#6B4E8C';

export default function ChangePasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth(); // Get user data to prefill email

  // Prefill email from user context if available
  React.useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async () => {
    // Client-side validation
    if (!email || !currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        Alert.alert('Error', 'Not authenticated. Please log in again.');
        return;
      }

      const response = await fetch('https://gfit-dev.gdinexus.com:8412/api/Member/change-password', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData?.message || 'Failed to change password. Please try again.';
        Alert.alert('Error', message);
        return;
      }

      // Success response
      Alert.alert('Success', 'Your password has been updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setEmail('');
            setCurrentPassword('');
            setNewPassword('');
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.log('Change Password API error:', error);
      Alert.alert('Error', 'Unable to contact server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            disabled={isLoading}
          >
            <Icon name="chevron-left" size={28} color={BRAND_COLORS.YELLOW} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            keyboardType="email-address"
            accessible={true}
            accessibilityLabel="Email input"
            accessibilityHint="Enter your email address"
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current Password"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            secureTextEntry
            accessible={true}
            accessibilityLabel="Current password input"
            accessibilityHint="Enter your current password"
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            secureTextEntry
            accessible={true}
            accessibilityLabel="New password input"
            accessibilityHint="Enter your new password"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            accessible={true}
            accessibilityLabel="Submit new password"
            accessibilityHint="Saves the new password"
            disabled={isLoading}
          >
            <LinearGradient
              colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
              style={StyleSheet.absoluteFill}
            />
            {isLoading ? (
              <ActivityIndicator color={BRAND_COLORS.YELLOW} />
            ) : (
              <Text style={styles.submitButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
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
  input: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  submitButtonText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});