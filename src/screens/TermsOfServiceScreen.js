import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';

const LIGHT_PURPLE = '#6B4E8C';

export default function TermsOfServiceScreen({ navigation }) {
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
  });

  const showCustomAlert = (title, message, buttons) => {
    setAlertConfig({ title, message, buttons });
    setIsAlertModalVisible(true);
  };

  const handleSubmit = () => {
    if (!isAcknowledged) {
      showCustomAlert(
        'Acknowledgment Required',
        'Please acknowledge that you have read and agree to the Terms of Service before proceeding.',
        [{ text: 'OK', onPress: () => setIsAlertModalVisible(false) }]
      );
      return;
    }

    showCustomAlert(
      'Terms Accepted',
      'Thank you for accepting the Terms of Service. You can now use GFIT in accordance with these terms.',
      [{ text: 'Continue', onPress: () => {
        setIsAlertModalVisible(false);
        navigation.goBack();
      } }]
    );
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
          >
            <Icon name="chevron-left" size={28} color={BRAND_COLORS.YELLOW} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>Last Updated: September 2025</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By accessing and using the GFIT mobile application ("App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.sectionText}>
              GFIT is a comprehensive fitness and wellness application that provides personalized workout plans, nutrition guidance, progress tracking, and professional fitness coaching. Our service combines physiotherapy expertise with personalized training to deliver sustainable fitness results.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
            <Text style={styles.sectionText}>
              You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to use the App only for lawful purposes and in accordance with these Terms.
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• Provide accurate and complete information</Text>
              <Text style={styles.bulletPoint}>• Maintain the security of your account</Text>
              <Text style={styles.bulletPoint}>• Use the service responsibly and safely</Text>
              <Text style={styles.bulletPoint}>• Comply with all applicable laws and regulations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Health and Safety Disclaimer</Text>
            <Text style={styles.sectionText}>
              The information provided through GFIT is for educational and informational purposes only. It is not intended as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider before starting any fitness program.
            </Text>
            <Text style={styles.warningText}>
              ⚠️ Consult with healthcare professionals before beginning any exercise program, especially if you have pre-existing medical conditions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Privacy and Data Protection</Text>
            <Text style={styles.sectionText}>
              Your privacy is important to us. We collect, use, and protect your personal information in accordance with our Privacy Policy. By using the App, you consent to such processing and warrant that all data provided is accurate.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Intellectual Property Rights</Text>
            <Text style={styles.sectionText}>
              The App and its original content, features, and functionality are owned by GFIT and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Prohibited Uses</Text>
            <Text style={styles.sectionText}>
              You may not use the App to:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
              <Text style={styles.bulletPoint}>• Infringe upon the rights of others</Text>
              <Text style={styles.bulletPoint}>• Transmit harmful or malicious code</Text>
              <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to the service</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Termination</Text>
            <Text style={styles.sectionText}>
              We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              In no event shall GFIT, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
            <Text style={styles.sectionText}>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Information</Text>
            <Text style={styles.sectionText}>
              If you have any questions about these Terms of Service, please contact us at:
            </Text>
            <View style={styles.contactCard}>
              <Text style={styles.contactEmail}>support@gfit.com</Text>
              <Text style={styles.contactPhone}>+1 (555) 123-4567</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using GFIT, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </Text>
          </View>

          <LinearGradient
            colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
            style={styles.acknowledgmentSection}
          >
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsAcknowledged(!isAcknowledged)}
            >
              <View style={[styles.checkbox, isAcknowledged && styles.checkboxChecked]}>
                {isAcknowledged && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.acknowledgmentText}>
                I have read, understood, and agree to the Terms of Service
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isAcknowledged && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isAcknowledged}
            >
              <LinearGradient
                colors={isAcknowledged ? [BRAND_COLORS.PURPLE, LIGHT_PURPLE] : [UI_COLORS.OVERLAY_LIGHT, UI_COLORS.OVERLAY_LIGHT]}
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={[
                  styles.submitButtonText,
                  !isAcknowledged && styles.submitButtonTextDisabled,
                ]}
              >
                Accept Terms
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal
        visible={isAlertModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAlertModalVisible(false)}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <Text style={styles.alertModalTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertModalMessage}>{alertConfig.message}</Text>
            <View style={styles.alertModalButtonContainer}>
              {alertConfig.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertModalButton,
                    button.style === 'destructive' ? styles.alertModalDestructiveButton : styles.alertModalDefaultButton,
                  ]}
                  onPress={button.onPress}
                  accessible={true}
                  accessibilityLabel={button.text}
                  accessibilityHint={`Press to ${button.text.toLowerCase()}`}
                >
                  <Text
                    style={[
                      styles.alertModalButtonText,
                      button.style === 'destructive' ? styles.alertModalDestructiveButtonText : styles.alertModalDefaultButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  lastUpdatedContainer: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  lastUpdatedText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
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
  bulletPoints: {
    marginTop: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: BRAND_COLORS.YELLOW,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 8,
  },
  contactCard: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  contactEmail: {
    fontSize: 16,
    color: BRAND_COLORS.YELLOW,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    opacity: 0.6,
  },
  footer: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  acknowledgmentSection: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: STATUS_COLORS.SUCCESS,
    borderColor: STATUS_COLORS.SUCCESS,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acknowledgmentText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModalContainer: {
    backgroundColor: BRAND_COLORS.PURPLE,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alertModalMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertModalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  alertModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  alertModalDefaultButton: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
  },
  alertModalDestructiveButton: {
    backgroundColor: STATUS_COLORS.ERROR,
  },
  alertModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertModalDefaultButtonText: {
    color: BRAND_COLORS.YELLOW,
  },
  alertModalDestructiveButtonText: {
    color: '#FFFFFF',
  },
});