import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';

const LIGHT_PURPLE = '#6B4E8C';

export default function PrivacyPolicyScreen({ navigation }) {
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
        'Please acknowledge that you have read and understood the Privacy Policy before proceeding.',
        [{ text: 'OK', onPress: () => setIsAlertModalVisible(false) }]
      );
      return;
    }

    showCustomAlert(
      'Privacy Policy Acknowledged',
      'Thank you for acknowledging the Privacy Policy. Your data will be handled in accordance with these guidelines.',
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
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
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.sectionText}>
              At GFIT, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
            </Text>
            <Text style={styles.sectionText}>
              By using GFIT, you consent to the data practices described in this policy. If you do not agree with our policies and practices, please do not use our service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.sectionText}>
              We collect several types of information to provide and improve our services:
            </Text>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Personal Information</Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• Name and contact information</Text>
                <Text style={styles.bulletPoint}>• Date of birth and gender</Text>
                <Text style={styles.bulletPoint}>• Height, weight, and fitness goals</Text>
                <Text style={styles.bulletPoint}>• Emergency contact information</Text>
              </View>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Health and Fitness Data</Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• Workout history and progress</Text>
                <Text style={styles.bulletPoint}>• Physical measurements and assessments</Text>
                <Text style={styles.bulletPoint}>• Nutrition and dietary preferences</Text>
                <Text style={styles.bulletPoint}>• Health conditions and limitations</Text>
              </View>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Usage Information</Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• App usage patterns and preferences</Text>
                <Text style={styles.bulletPoint}>• Device information and identifiers</Text>
                <Text style={styles.bulletPoint}>• Log data and analytics</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.sectionText}>
              We use the collected information for the following purposes:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• Provide personalized fitness and nutrition plans</Text>
              <Text style={styles.bulletPoint}>• Track your progress and achievements</Text>
              <Text style={styles.bulletPoint}>• Improve our services and user experience</Text>
              <Text style={styles.bulletPoint}>• Communicate with you about your account</Text>
              <Text style={styles.bulletPoint}>• Ensure the security and safety of our platform</Text>
              <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Information Sharing and Disclosure</Text>
            <Text style={styles.sectionText}>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• With your explicit consent</Text>
              <Text style={styles.bulletPoint}>• To comply with legal requirements</Text>
              <Text style={styles.bulletPoint}>• To protect our rights and safety</Text>
              <Text style={styles.bulletPoint}>• With trusted service providers who assist in our operations</Text>
            </View>
            <Text style={styles.warningText}>
              🔒 Your health and fitness data is never shared with advertisers or marketing companies.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• Encryption of data in transit and at rest</Text>
              <Text style={styles.bulletPoint}>• Regular security assessments and updates</Text>
              <Text style={styles.bulletPoint}>• Access controls and authentication measures</Text>
              <Text style={styles.bulletPoint}>• Employee training on data protection</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </Text>
            <Text style={styles.sectionText}>
              You may request deletion of your account and associated data at any time through the app settings or by contacting our support team.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
            <Text style={styles.sectionText}>
              You have the following rights regarding your personal information:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• Access and review your personal data</Text>
              <Text style={styles.bulletPoint}>• Update or correct inaccurate information</Text>
              <Text style={styles.bulletPoint}>• Request deletion of your data</Text>
              <Text style={styles.bulletPoint}>• Opt-out of certain communications</Text>
              <Text style={styles.bulletPoint}>• Export your data in a portable format</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.sectionText}>
              GFIT is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
            <Text style={styles.sectionText}>
              Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Changes to This Privacy Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </Text>
            <Text style={styles.sectionText}>
              Your continued use of GFIT after any changes constitutes acceptance of the updated Privacy Policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </Text>
            <View style={styles.contactCard}>
              <Text style={styles.contactEmail}>privacy@gfit.com</Text>
              <Text style={styles.contactPhone}>+1 (555) 123-4567</Text>
              <Text style={styles.contactAddress}>123 Fitness Street, Health City, HC 12345</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Thank you for trusting GFIT with your health and fitness journey. We are committed to protecting your privacy and providing you with a secure and personalized experience.
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
                I have read and understood the Privacy Policy
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
                Acknowledge Policy
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
  subsection: {
    marginTop: 16,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
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
    marginBottom: 4,
  },
  contactAddress: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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