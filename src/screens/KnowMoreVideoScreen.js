import React, { useRef, useCallback, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Audio, Video, ResizeMode } from 'expo-av';
import { Asset } from 'expo-asset';
import { useFocusEffect } from '@react-navigation/native';

export default function KnowMoreVideoScreen({ navigation }) {
  const videoRef = useRef(null);
  const testimonialRef = useRef(null);
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [bgVideoUri, setBgVideoUri] = useState(null);
  const [testimonialUri, setTestimonialUri] = useState(null);
  const [tLoading, setTLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const setupAndPlay = async () => {
        try {
          if (isActive && videoRef.current) {
            await videoRef.current.playAsync();
          }
        } catch {
          setTimeout(async () => {
            if (isActive && videoRef.current) {
              try { await videoRef.current.playAsync(); } catch {}
            }
          }, 400);
        }
      };

      (async () => {
        try {
          const asset = Asset.fromModule(require('../../assets/bsf-background-01.mp4'));
          await asset.downloadAsync();
          setBgVideoUri(asset.localUri || asset.uri);
        } catch (err) {
          console.log('BG video prefetch failed:', err);
        }
      })();

      (async () => {
        try {
          const tAsset = Asset.fromModule(require('../../assets/Experience.mp4'));
          await tAsset.downloadAsync();
          const uri = tAsset.localUri || tAsset.uri;
          setTestimonialUri(uri);
          console.log('Experience.mp4 ready at:', uri);
        } catch (err) {
          console.log('Experience video prefetch failed:', err);
        } finally {
          setTLoading(false);
        }
      })();

      setupAndPlay();
      return () => { isActive = false; };
    }, [])
  );

  const tryPlayTestimonial = async (attempt = 0) => {
    try {
      await testimonialRef.current?.playAsync();
    } catch (e) {
      console.warn('Testimonial play failed:', e);
      // Retry once with ducking if focus not acquired
      if (String(e).includes('AudioFocusNotAcquired') && attempt < 2) {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true, // allow ducking to get focus
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
            playThroughEarpieceAndroid: false,
          });
        } catch {}
        setTimeout(() => tryPlayTestimonial(attempt + 1), 300);
      }
    }
  };

  const openTestimonial = async () => {
    // Pause background video to avoid decoder/audio contention
    try { await videoRef.current?.pauseAsync(); } catch {}
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true, // important on Android
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        playThroughEarpieceAndroid: false,
      });
    } catch {}
    setShowTestimonial(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Video
        ref={videoRef}
        source={bgVideoUri ? { uri: bgVideoUri } : require('../../assets/bsf-background-01.mp4')}
        style={styles.video}
        shouldPlay
        isLooping
        isMuted
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls={false}
        playsInSilentModeIOS
        onPlaybackStatusUpdate={async (status) => {
          if (status?.isLoaded && !status.isPlaying && !status.isBuffering && videoRef.current) {
            try { await videoRef.current.playAsync(); } catch {}
          }
        }}
        onError={(e) => { console.warn('BG Video error:', e); }}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Experience Ben's Stamina Factory</Text>
        <Text style={styles.subtitle}>
          Walk-in to experience more. Explore our plans, trainers, and community.
        </Text>

        <TouchableOpacity
          style={[styles.soundCta, tLoading && { opacity: 0.5 }]}
          onPress={openTestimonial}
          activeOpacity={0.9}
          disabled={tLoading}
        >
          {tLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.soundCtaText}>Hear from our members and trainers</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTestimonial}
        animationType="fade"
        onRequestClose={async () => {
          setShowTestimonial(false);
          try { await testimonialRef.current?.pauseAsync(); } catch {}
          try { await videoRef.current?.playAsync(); } catch {}
        }}
        transparent={false}
      >
        <View style={styles.modalRoot}>
          <Video
            ref={testimonialRef}
            source={testimonialUri ? { uri: testimonialUri } : require('../../assets/Experience.mp4')}
            style={styles.modalVideo}
            shouldPlay
            isLooping
            volume={1.0}
            isMuted={false}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            playsInSilentModeIOS
            onLoad={async () => {
              // Start once loaded; includes retry with ducking if focus not yet available
              await tryPlayTestimonial(0);
            }}
            onPlaybackStatusUpdate={async (status) => {
              if (status?.isLoaded && !status.isPlaying && !status.isBuffering && testimonialRef.current) {
                await tryPlayTestimonial(1);
              }
            }}
            onError={(e) => { console.warn('Experience.mp4 error:', e); }}
          />
          <TouchableOpacity
            style={styles.modalClose}
            onPress={async () => {
              setShowTestimonial(false);
              try { await testimonialRef.current?.pauseAsync(); } catch {}
              try { await videoRef.current?.playAsync(); } catch {}
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width: '100%', height: '100%', backgroundColor: '#000' },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#333', marginBottom: 12 },
  soundCta: {
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  soundCtaText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalRoot: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  modalVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    elevation: 3,
  },
  modalCloseText: { color: '#111', fontWeight: '800' },
});