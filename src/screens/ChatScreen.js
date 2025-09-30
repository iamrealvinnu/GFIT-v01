import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Alert,
  Modal,
  FlatList,
  Clipboard,
  Share,
  StatusBar,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import * as DocumentPicker from 'expo-document-picker';

const { width, height } = Dimensions.get('window');
const LIGHT_PURPLE = '#6B4E8C';

// Mock data for MVP
const mockChats = [
  {
    id: '1',
    type: 'individual',
    name: 'John Doe',
    avatar: '👨‍💼',
    lastMessage: 'Great workout today! 💪',
    timestamp: '2:30 PM',
    unreadCount: 3,
    isOnline: true,
    lastSeen: '2 minutes ago',
    messages: [
      { id: 1, text: 'Hey! How was your workout?', sender: 'them', timestamp: '2:25 PM', type: 'text' },
      { id: 2, text: 'It was amazing! I hit a new PR!', sender: 'me', timestamp: '2:28 PM', type: 'text' },
      { id: 3, text: 'Great workout today! 💪', sender: 'them', timestamp: '2:30 PM', type: 'text' },
    ],
  },
 
];

export default function ChatScreen({ navigation }) {
  const { user, logout, token } = useAuth();
  const [currentView, setCurrentView] = useState('chatList');
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('light');
  const [userProfile, setUserProfile] = useState({
    name: 'Fitness Enthusiast',
    status: 'Living the fit life! 💪',
    avatar: '🏃‍♂️',
  });

  // NEW STATE
  const [chatUsers, setChatUsers] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showMsgActions, setShowMsgActions] = useState(false);
  const [activeMsg, setActiveMsg] = useState(null);
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', onConfirm: null, onCancel: null });
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(false);

  const typingTimeoutRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Custom alert function that matches app theme
  const showAlert = (title, message, onConfirm, onCancel) => {
    setAlertConfig({ title, message, onConfirm, onCancel });
    setShowCustomAlert(true);
  };

  // Clear all messages in current chat
  const clearChat = async () => {
    if (!conversationId) return;
    
    try {
      // Note: This would need a backend API endpoint to clear all messages
      // For now, we'll just clear locally
      setMessages([]);
      showAlert('Chat Cleared', 'All messages have been cleared from this chat');
    } catch (error) {
      showAlert('Error', 'Could not clear chat messages');
    }
  };

  // Block user functionality
  const blockUser = () => {
    showAlert(
      'Block User',
      `Are you sure you want to block ${selectedChat?.userName}? You won't receive messages from them anymore.`,
      () => {
        // Note: This would need a backend API endpoint to block users
        showAlert('User Blocked', `${selectedChat?.userName} has been blocked`);
        // Navigate back to chat list
        setCurrentView('chatList');
        setSelectedChat(null);
      }
    );
  };

  // Report user functionality
  const reportUser = () => {
    showAlert(
      'Report User',
      `Are you sure you want to report ${selectedChat?.userName}? This will notify the administrators.`,
      () => {
        // Note: This would need a backend API endpoint to report users
        showAlert('User Reported', 'Thank you for your report. Administrators will review it.');
      }
    );
  };

  // Simple download - save to phone gallery/files
  const downloadAttachment = async (attachment, attachmentHeader, filename) => {
    try {
      // Save file to document directory (accessible to other apps)
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, attachment, {
        encoding: 'base64',
      });
      
      console.log('File saved to:', fileUri);
      
      // Create a proper file URI for sharing
      const shareableUri = `file://${fileUri}`;
      
      // Share with proper options
      const shareOptions = {
        url: shareableUri,
        title: `Save ${filename}`,
        message: `Choose where to save ${filename}`,
      };
      
      console.log('Sharing with options:', shareOptions);
      
      const result = await Share.share(shareOptions);
      
      if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      } else {
        console.log('Share completed:', result);
      }
      
    } catch (error) {
      console.log('Download error:', error);
      showAlert('Error', `Could not download file: ${error.message}`);
    }
  };

  // Try to resolve the existing conversation id between two users
  const findConversationId = async (myUserId, otherUserId) => {
    try {
      // Use the correct API endpoint provided by backend team
      const response = await axios.post(
        `https://gfit-dev.gdinexus.com:8412/api/Chat/conversation?user1=${myUserId}&user2=${otherUserId}`,
        {}, // Empty body for POST
        { headers: { ...authHeader } }
      );
      
      const data = response?.data;
      if (data) {
        // The API returns an object with 'id' field containing the conversation ID
        return data.id;
      }
    } catch (err) {
      console.log('❌ Failed to get/create conversation:', err.message);
    }

    return null;
  };

  // Helper for auth header
  const authHeader = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // Fetch all users for chat list (with auth) but show ONLY Admins (member-to-member chat is not allowed)
  useEffect(() => {
    axios.get('https://gfit-dev.gdinexus.com:8412/api/Chat/all-users', {
      headers: { ...authHeader }
    })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        const filtered = list
          .filter(u => u?.id && u.id !== user?.id)
          .filter(u => Array.isArray(u?.claims) && u.claims.some(c => String(c?.claimValue).toLowerCase() === 'admin'));
        setChatUsers(filtered);
      })
      .catch(err => console.log('Error fetching users:', err));
  }, [token, user?.id]);

  // Fetch messages for a conversation (with auth)
  useEffect(() => {
    if (conversationId) {
      setLoadingMessages(true);
      axios.get(`https://gfit-dev.gdinexus.com:8412/api/Chat/conversation/message/${conversationId}`, {
        headers: { ...authHeader }
      })
        .then(res => {
          setMessages(res.data || []);
          setLoadingMessages(false);
        })
        .catch(err => {
          setLoadingMessages(false);
          console.log('Error fetching messages:', err);
        });
    }
  }, [conversationId, token]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Handle back button press
  const handleBackPress = () => {
    if (currentView === 'chat') {
      setCurrentView('chatList');
      setSelectedChat(null);
      return true; // Prevent default back behavior
    }
    return false; // Allow default back behavior
  };

  // Smart back navigation
  const handleSmartBack = () => {
    if (currentView === 'chat') {
      setCurrentView('chatList');
      setSelectedChat(null);
    } else if (currentView === 'chatList') {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [currentView]);

  useEffect(() => {
    if (message && !isTyping) {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
    }
  }, [message]);

  useEffect(() => {
    if (currentView === 'chat' && messages.length) {
      scrollToBottom();
    }
  }, [currentView, messages.length]);

  // Start conversation and fetch messages
  const handleSelectChat = async (userObj) => {
    console.log('💬 Starting chat with user:', userObj.userName);
    setSelectedChat(userObj);
    setCurrentView('chat');
    setConversationId(null);
    setMessages([]);

    // Try to find or create a conversation with this user so history shows immediately
    try {
      setLoadingMessages(true);
      
      // Get or create conversation ID using the correct API
      const foundConversationId = user?.id ? await findConversationId(user.id, userObj.id) : null;

      if (foundConversationId) {
        console.log('✅ Got conversation ID:', foundConversationId);
        setConversationId(foundConversationId);
        try {
          // Use the same working API endpoint that sendMessage uses
          const res = await axios.get(
            `https://gfit-dev.gdinexus.com:8412/api/Chat/conversation/message/${foundConversationId}`,
            { headers: { ...authHeader } }
          );
          setMessages(res.data || []);
          console.log('📨 Loaded', res.data?.length || 0, 'messages from conversation');
        } catch (msgErr) {
          console.log('❌ Failed to fetch conversation messages:', msgErr.message);
        }
      } else {
        console.log('ℹ️ Could not get conversation ID - showing empty chat');
      }
    } catch (err) {
      console.log('❌ Error loading chat history:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Pick attachment (document/image)
  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      // Support both old and new Expo DocumentPicker shapes
      let file = null;
      if (Array.isArray(result?.assets) && result.assets.length > 0) {
        const a = result.assets[0];
        file = {
          uri: a.uri,
          name: a.name || a.fileName || 'attachment',
          mimeType: a.mimeType || a.type || 'application/octet-stream',
          size: a.size,
        };
      } else if (result?.type === 'success') {
        file = {
          uri: result.uri,
          name: result.name || 'attachment',
          mimeType: result.mimeType || 'application/octet-stream',
          size: result.size,
        };
      }
      if (file?.uri) setAttachment(file);
    } catch (err) {
      showAlert('Attachment Error', 'Could not pick file');
    }
  };

  // Create or update message (with attachment support)
  const sendMessage = async () => {
    if ((message.trim() || attachment) && selectedChat && user?.id) {
      try {
        const formData = new FormData();
        formData.append('SenderId', String(user.id));
        formData.append('ReceiverId', String(selectedChat.id));
        formData.append('Content', message.trim());
        
        if (attachment && attachment.uri) {
          console.log('Sending attachment:', attachment);
          
          // Validate attachment data
          if (!attachment.uri) {
            throw new Error('Attachment URI is missing');
          }
          
          const filename = attachment.name || `attachment.${(attachment.mimeType || '').split('/').pop() || 'bin'}`;
          const mimeType = attachment.mimeType || 'application/octet-stream';
          
          console.log('Attachment filename:', filename);
          console.log('Attachment mimeType:', mimeType);
          console.log('Attachment URI exists:', !!attachment.uri);
          
          // Create proper file object for FormData
          const fileObject = {
            uri: attachment.uri,
            name: filename,
            type: mimeType,
          };
          
          console.log('File object for FormData:', fileObject);
          formData.append('Attachment', fileObject);
        } else {
          // Send empty attachment field if no attachment
          console.log('No attachment, sending empty field');
          formData.append('Attachment', '');
        }

        let res;
        if (editingMessageId) {
          res = await axios.put(
            `https://gfit-dev.gdinexus.com:8412/api/Chat/update-message/${editingMessageId}`,
            formData,
            {
              headers: {
                ...authHeader,
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        } else {
          res = await axios.post(
            'https://gfit-dev.gdinexus.com:8412/api/Chat/send-message',
            formData,
            {
              headers: {
                ...authHeader,
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        }
        setMessage('');
        setAttachment(null);
        setEditingMessageId(null);

        // Set conversationId from response if not already set
        if (!conversationId && res.data.conversationId) {
          setConversationId(res.data.conversationId);
        }

        // Refresh messages
        const convId = res.data.conversationId || conversationId;
        if (convId) {
          axios.get(`https://gfit-dev.gdinexus.com:8412/api/Chat/conversation/message/${convId}`, {
            headers: { ...authHeader }
          })
            .then(res => setMessages(res.data || []));
        }
      } catch (err) {
        console.error('Error sending message:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        console.error('Error headers:', err.response?.headers);
        
        const errorMessage = err.response?.data?.message || err.message || 'Could not send message';
        showAlert('Error', `Failed to send message: ${errorMessage}`);
      }
    }
  };

  const deleteMessage = async (messageId) => {
    if (!messageId) {
      console.log('No message ID provided');
      return;
    }
    
    try {
      console.log('Deleting message with ID:', messageId);
      console.log('Message ID type:', typeof messageId);
      console.log('Message ID length:', messageId?.length);
      console.log('Full delete URL:', `https://gfit-dev.gdinexus.com:8412/api/Chat/delete-message/${messageId}`);
      
      // Check if message ID looks like a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      console.log('Is valid UUID format:', uuidRegex.test(messageId));
      
      const response = await axios.delete(
        `https://gfit-dev.gdinexus.com:8412/api/Chat/delete-message/${messageId}`,
        { headers: { ...authHeader } }
      );
      
      console.log('Delete API response:', response.data);
      console.log('Response status:', response.status);
      
      // Remove message from local state immediately for instant feedback
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== messageId);
        console.log('Messages before filter:', prev.length);
        console.log('Messages after local filter:', filtered.length);
        return filtered;
      });
      
      // Don't refresh from server - the API is not actually deleting messages
      // It returns success but messages remain in database (backend issue)
      console.log('Note: Server API returns success but does not actually delete messages');
      
    } catch (error) {
      console.error('Delete error details:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showAlert('Error', `Could not delete message: ${error.response?.data?.message || error.message}`);
    } finally {
      setShowMsgActions(false);
      setActiveMsg(null);
    }
  };

  // Render attachment inside a chat bubble
  const renderMessageAttachment = (msg) => {
    if (!msg?.attachment) return null;
    const isImage = String(msg.attachmentHeader || '').toLowerCase().startsWith('image/');
    const isVideo = String(msg.attachmentHeader || '').toLowerCase().startsWith('video/');
    const filename = `attachment.${(msg.attachmentHeader || '').split('/').pop() || 'bin'}`;
    
    if (isImage) {
      const dataUri = `data:${msg.attachmentHeader};base64,${msg.attachment}`;
      return (
        <TouchableOpacity
          onPress={() => {
            setSelectedImage(dataUri);
            setShowImageViewer(true);
          }}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri: dataUri }}
            style={{ width: 200, height: 200, borderRadius: 10, marginBottom: 8 }}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Icon name="zoom-in" size={20} color="#FFFFFF" />
          </View>
          {/* Download button for images too */}
          <TouchableOpacity
            style={styles.imageDownloadOverlay}
            onPress={(e) => {
              e.stopPropagation(); // Prevent image viewer from opening
              downloadAttachment(msg.attachment, msg.attachmentHeader, filename);
            }}
          >
            <Icon name="download" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
    
    // For all other file types (PDF, Excel, Word, Video, etc.)
    return (
      <TouchableOpacity 
        style={styles.fileAttachmentBox}
        onPress={() => {
          downloadAttachment(msg.attachment, msg.attachmentHeader, filename);
        }}
      >
        <Image source={require('../../assets/document.png')} style={styles.fileAttachmentIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.fileAttachmentTitle}>
            {isVideo ? '🎥 Video' : '📎 Document'}
          </Text>
          <Text style={styles.fileAttachmentSubtitle}>Tap to download & share</Text>
          {msg.attachmentHeader ? (
            <Text style={styles.fileAttachmentMeta}>{msg.attachmentHeader}</Text>
          ) : null}
        </View>
        <Icon name="download" size={20} color={BRAND_COLORS.YELLOW} />
      </TouchableOpacity>
    );
  };


  // Chat list from API
  const renderChatList = () => (
    <View style={styles.chatListContainer}>
      <View style={styles.chatListHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.chatListTitle}>Chats</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={chatUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleSelectChat(item)}
          >
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>{item.userName[0]}</Text>
              {/* Online indicator logic if available */}
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatName}>{item.userName}</Text>
                {/* Timestamp logic if available */}
              </View>
              <View style={styles.chatMessageRow}>
                <Text style={styles.chatLastMessage} numberOfLines={1}>
                  {/* Last message logic if available */}
                </Text>
                {/* Unread count logic if available */}
              </View>
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  // Chat messages from API
  const renderChat = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.chatContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatHeaderAvatar}>
              <Text style={styles.chatHeaderAvatarText}>{selectedChat.userName[0]}</Text>
            </View>
            <View style={styles.chatHeaderText}>
              <Text style={styles.chatTitle}>{selectedChat.userName}</Text>
              {/* You can add online status if available */}
            </View>
          </View>
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => setShowChatMenu(true)}
            >
              <Image source={require('../../assets/three-dots.png')} style={styles.headerActionIcon} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.messagesContent, { flexGrow: 1, justifyContent: 'flex-end' }]}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          onContentSizeChange={scrollToBottom}
        >
          {loadingMessages ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading chat...</Text>
            </View>
          ) : (
            // Sort messages oldest to newest
            [...messages].sort((a, b) => new Date(a.createdOnUtc) - new Date(b.createdOnUtc)).map((msg, idx, arr) => {
              // Convert UTC to local Indian time
              let localTime = '';
              if (msg.createdOnUtc) {
                const utcDate = new Date(msg.createdOnUtc);
                // Convert to IST (Asia/Kolkata)
                const options = {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                };
                localTime = utcDate.toLocaleTimeString('en-IN', options);
              }
              return (
                <React.Fragment key={msg.id}>
                  <View style={styles.messageContainer}>
                    <View
                      style={[
                        styles.messageBubble,
                        msg.senderId === user?.id
                          ? styles.userMessage // Sent by me: right side
                          : styles.otherMessage, // Received: left side
                      ]}
                      onLongPress={() => {
                        if (msg.senderId === user?.id) {
                          setActiveMsg(msg);
                          setShowMsgActions(true);
                        }
                      }}
                    >
                    {renderMessageAttachment(msg)}
                    <Text
                      style={[
                        styles.messageText,
                        msg.senderId === user?.id
                          ? styles.userMessageText
                          : styles.otherMessageText,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTimestamp,
                        msg.senderId === user?.id
                          ? styles.userTimestamp
                          : styles.otherTimestamp,
                      ]}
                    >
                      {localTime}
                    </Text>
                    
                    {/* Action icons inside message bubble */}
                    {msg.senderId === user?.id && (
                      <View style={styles.messageActions}>
                        <TouchableOpacity
                          style={styles.actionIcon}
                          onPress={() => {
                            setEditingMessageId(msg.id);
                            setMessage(msg.content || '');
                          }}
                          accessibilityLabel="Edit message"
                          accessibilityRole="button"
                        >
                          <Icon name="edit-2" size={8} color={BRAND_COLORS.PURPLE} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionIcon}
                          onPress={() => {
                            // Copy to clipboard
                            if (msg.content) {
                              try {
                                Clipboard.setString(msg.content);
                                showAlert('Copied', 'Message copied to clipboard');
                              } catch (error) {
                                showAlert('Error', 'Failed to copy message');
                              }
                            }
                          }}
                          accessibilityLabel="Copy message"
                          accessibilityRole="button"
                        >
                          <Icon name="copy" size={8} color={BRAND_COLORS.PURPLE} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionIcon, styles.deleteIcon]}
                        onPress={() => {
                          console.log('Delete button pressed for message:', msg.id);
                          showAlert(
                            'Delete message',
                            'Are you sure you want to delete this message?',
                            () => {
                              console.log('Delete confirmed for message:', msg.id);
                              deleteMessage(msg.id);
                            },
                            () => {
                              console.log('Delete cancelled');
                            }
                          );
                        }}
                          accessibilityLabel="Delete message"
                          accessibilityRole="button"
                        >
                          <Icon name="trash-2" size={8} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  {/* Typing indicator logic: show on left if receiver is typing, right if sender is typing */}
                  {isTyping && idx === arr.length - 1 && (
                    <View
                      style={[
                        styles.messageBubble,
                        selectedChat.id === user?.id
                          ? styles.userMessage // If I'm typing, show on right
                          : styles.otherMessage, // If receiver is typing, show on left
                        styles.typingIndicator,
                      ]}
                    >
                      <Text style={styles.typingText}>typing...</Text>
                    </View>
                  )}
                  </View>
                </React.Fragment>
              );
            })
          )}
          {/* If no messages yet, show typing indicator at the bottom */}
          {isTyping && messages.length === 0 && (
            <View
              style={[
                styles.messageBubble,
                selectedChat.id === user?.id
                  ? styles.userMessage
                  : styles.otherMessage,
                styles.typingIndicator,
              ]}
            >
              <Text style={styles.typingText}>typing...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} onPress={pickAttachment}>
              <Image source={require('../../assets/attachment.png')} style={styles.attachIcon} />
            </TouchableOpacity>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Message"
                placeholderTextColor={UI_COLORS.TEXT_MUTED}
                multiline
                autoFocus={false}
                blurOnSubmit={false}
                returnKeyType="default"
                enablesReturnKeyAutomatically={true}
                onFocus={() => {
                  scrollToBottom();
                }}
              />
            </View>
            {(message.trim() || attachment) && (
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Text style={styles.sendButtonText}>➤</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Attachment preview before sending */}
          {attachment && (
            <View style={styles.attachmentPreviewRow}>
              {attachment.mimeType && String(attachment.mimeType).startsWith('image/') ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={styles.attachmentPreviewThumb}
                />
              ) : (
                <View style={styles.attachmentPreviewIconWrap}>
                  <Image source={require('../../assets/document.png')} style={styles.attachmentPreviewIcon} />
                </View>
              )}
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.attachmentPreviewName} numberOfLines={1}>
                  {attachment.name || 'Attachment'}
                </Text>
                <Text style={styles.attachmentPreviewMeta}>
                  {attachment.mimeType || 'file'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttachment(null)} style={styles.attachmentPreviewClose}>
                <Text style={styles.attachmentPreviewCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Editing banner */}
          {editingMessageId && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: BRAND_COLORS.YELLOW, fontWeight: '700', marginRight: 8 }}>Editing message</Text>
              <TouchableOpacity onPress={() => { setEditingMessageId(null); setAttachment(null); }}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderProfile = () => (
    <Modal visible={showProfile} animationType="slide">
      <View style={styles.profileContainer}>
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowProfile(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.profileTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton}>
            <Image source={require('../../assets/edit.png')} style={styles.editButtonIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileContent}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{userProfile.avatar}</Text>
            <TouchableOpacity style={styles.cameraButton}>
              <Image source={require('../../assets/camera.png')} style={styles.cameraIcon} />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{userProfile.name}</Text>
          <Text style={styles.profileStatus}>{userProfile.status}</Text>

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>28</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1,250</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSettings = () => (
    <Modal visible={showSettings} animationType="slide">
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowSettings(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.settingsContent}>
          {/* Settings content goes here */}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderMediaPicker = () => (
    showMediaPicker && (
      <View style={styles.mediaPickerOverlay}>
        <TouchableOpacity style={styles.mediaPickerBackdrop} onPress={() => setShowMediaPicker(false)} />
        <View style={styles.mediaPickerPopup}>
          <View style={styles.mediaPickerHeader}>
            <Text style={styles.mediaPickerTitle}>Share</Text>
            <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
              <Text style={styles.mediaPickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mediaOptions}>
            <TouchableOpacity style={styles.mediaOption}>
              <View style={styles.mediaOptionIconContainer}>
                <Image source={require('../../assets/camera.png')} style={styles.mediaOptionIcon} />
              </View>
              <Text style={styles.mediaOptionText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaOption}>
              <View style={styles.mediaOptionIconContainer}>
                <Image source={require('../../assets/gallery.png')} style={styles.mediaOptionIcon} />
              </View>
              <Text style={styles.mediaOptionText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaOption}>
              <View style={styles.mediaOptionIconContainer}>
                <Image source={require('../../assets/document.png')} style={styles.mediaOptionIcon} />
              </View>
              <Text style={styles.mediaOptionText}>Document</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaOption}>
              <View style={styles.mediaOptionIconContainer}>
                <Image source={require('../../assets/three-dots.png')} style={styles.mediaOptionIcon} />
              </View>
              <Text style={styles.mediaOptionText}>Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLORS.PURPLE} />
      <View style={styles.container}>
        <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.gradient}>
          {currentView === 'chatList' && renderChatList()}
          {currentView === 'chat' && selectedChat && renderChat()}
          {/* Message actions modal */}
          <Modal visible={showMsgActions} transparent animationType="fade" onRequestClose={() => setShowMsgActions(false)}>
            <View style={styles.actionsOverlay}>
              <View style={styles.actionsSheet}>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    setShowMsgActions(false);
                    setEditingMessageId(activeMsg?.id || null);
                    setMessage(activeMsg?.content || '');
                    // For edit, do not auto-populate attachment unless you plan to replace
                  }}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionItem, { borderTopWidth: 1, borderTopColor: UI_COLORS.BORDER_LIGHT }]}
                  onPress={() => deleteMessage(activeMsg?.id)}
                >
                  <Text style={[styles.actionText, { color: '#FF6B6B', fontWeight: '800' }]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCancel} onPress={() => setShowMsgActions(false)}>
                  <Text style={styles.actionCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          
          {/* Custom Alert Modal */}
          <Modal visible={showCustomAlert} transparent animationType="fade" onRequestClose={() => setShowCustomAlert(false)}>
            <View style={styles.alertOverlay}>
              <View style={styles.alertContainer}>
                <Text style={styles.alertTitle}>{alertConfig.title}</Text>
                <Text style={styles.alertMessage}>{alertConfig.message}</Text>
                <View style={styles.alertButtons}>
                  {alertConfig.onCancel && (
                    <TouchableOpacity
                      style={[styles.alertButton, styles.alertCancelButton]}
                      onPress={() => {
                        setShowCustomAlert(false);
                        if (alertConfig.onCancel) alertConfig.onCancel();
                      }}
                    >
                      <Text style={styles.alertCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.alertButton, styles.alertConfirmButton]}
                    onPress={() => {
                      setShowCustomAlert(false);
                      if (alertConfig.onConfirm) alertConfig.onConfirm();
                    }}
                  >
                    <Text style={styles.alertConfirmText}>
                      {alertConfig.onCancel ? 'Confirm' : 'OK'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          
          {/* Full Screen Image Viewer */}
          <Modal visible={showImageViewer} transparent animationType="fade" onRequestClose={() => setShowImageViewer(false)}>
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity 
                style={styles.imageViewerClose}
                onPress={() => setShowImageViewer(false)}
              >
                <Icon name="x" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
          
          {/* Chat Menu Modal */}
          <Modal visible={showChatMenu} transparent animationType="fade" onRequestClose={() => setShowChatMenu(false)}>
            <View style={styles.chatMenuOverlay}>
              <View style={styles.chatMenuContainer}>
                <View style={styles.chatMenuHeader}>
                  <Text style={styles.chatMenuTitle}>Chat Options</Text>
                  <TouchableOpacity 
                    style={styles.chatMenuClose}
                    onPress={() => setShowChatMenu(false)}
                  >
                    <Icon name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.chatMenuContent}>
                  <TouchableOpacity 
                    style={styles.chatMenuItem}
                    onPress={() => {
                      setShowChatMenu(false);
                      clearChat();
                    }}
                  >
                    <Icon name="trash-2" size={20} color="#FF6B6B" />
                    <Text style={[styles.chatMenuText, { color: '#FF6B6B' }]}>Clear Chat</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.chatMenuItem}
                    onPress={() => {
                      setShowChatMenu(false);
                      blockUser();
                    }}
                  >
                    <Icon name="user-x" size={20} color="#FF9500" />
                    <Text style={[styles.chatMenuText, { color: '#FF9500' }]}>Block User</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.chatMenuItem}
                    onPress={() => {
                      setShowChatMenu(false);
                      reportUser();
                    }}
                  >
                    <Icon name="flag" size={20} color="#FF3B30" />
                    <Text style={[styles.chatMenuText, { color: '#FF3B30' }]}>Report User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          
          {renderProfile()}
          {renderSettings()}
          {renderMediaPicker()}
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },

  // Chat List Styles
  chatListContainer: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  chatListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // More space below status bar
    backgroundColor: BRAND_COLORS.PURPLE,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  chatListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast
    flex: 1,
    textAlign: 'center',
    marginLeft: -40, // Compensate for back button width to center properly
  },
  chatListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  headerActionIcon: {
    width: 24,
    height: 24,
    tintColor: BRAND_COLORS.YELLOW, // #CFDB27
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  chatAvatarText: {
    fontSize: 26,
    color: '#FFFFFF', // White for contrast
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: STATUS_COLORS.SUCCESS, // #4CAF50
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: LIGHT_PURPLE, // #6B4E8C
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF', // White for contrast
    letterSpacing: 0.2,
  },
  chatTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)', // White with slight opacity
    flex: 1,
    letterSpacing: 0.1,
  },
  unreadBadge: {
    backgroundColor: BRAND_COLORS.YELLOW, // #CFDB27
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: BRAND_COLORS.PURPLE, // #391B58
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupMembers: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  lastSeen: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
    opacity: 0.8,
  },

  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18, // Match chatListHeader for consistency
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Match chatListHeader for consistency
    backgroundColor: BRAND_COLORS.PURPLE, // #391B58
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    color: BRAND_COLORS.YELLOW, // #CFDB27
    fontWeight: 'bold',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  chatHeaderAvatarText: {
    fontSize: 20,
    color: '#FFFFFF', // White for contrast
    fontWeight: '600',
  },
  chatHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF', // White for contrast
    marginBottom: 1,
    letterSpacing: 0.3,
  },
  chatSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    marginTop: 0,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  headerActionIcon: {
    width: 20,
    height: 20,
    tintColor: BRAND_COLORS.YELLOW, // #CFDB27
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
  },
  messagesContent: {
    paddingBottom: 100,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: BRAND_COLORS.YELLOW_LIGHT, // #D8E23A
    borderBottomRightRadius: 2,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 5,
  },
  messageContainer: {
    marginBottom: 8,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
    gap: 4,
  },
  actionIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  deleteIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: BRAND_COLORS.PURPLE,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.YELLOW,
    textAlign: 'center',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
  },
  alertConfirmButton: {
    backgroundColor: BRAND_COLORS.YELLOW,
  },
  alertCancelText: {
    color: BRAND_COLORS.YELLOW,
    fontWeight: '600',
    fontSize: 16,
  },
  alertConfirmText: {
    color: BRAND_COLORS.PURPLE,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Image Viewer Styles
  imageContainer: {
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageDownloadOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  // File Attachment Styles
  fileAttachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  fileAttachmentIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
    tintColor: BRAND_COLORS.YELLOW,
  },
  fileAttachmentTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileAttachmentSubtitle: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileAttachmentMeta: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  userMessageText: {
    color: BRAND_COLORS.PURPLE, // #391B58
  },
  otherMessageText: {
    color: '#FFFFFF', // White for contrast
    opacity: 0.9,
  },
  messageTimestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  userTimestamp: {
    color: BRAND_COLORS.PURPLE_DARK, // #2D1545
    textAlign: 'right',
  },
  otherTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  voiceIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  voiceText: {
    fontSize: 14,
    color: '#FFFFFF', // White for contrast
    flex: 1,
  },
  voiceDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    marginLeft: 10,
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  typingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
  },
  fileAttachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  fileAttachmentIcon: {
    width: 22,
    height: 22,
    tintColor: BRAND_COLORS.PURPLE,
    marginRight: 8,
  },
  fileAttachmentTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 2,
  },
  fileAttachmentMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    position: 'relative',
    zIndex: 1000,
    minHeight: 80,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 12,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  attachIcon: {
    width: 24,
    height: 24,
    tintColor: BRAND_COLORS.YELLOW, // #CFDB27
  },
  textInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF', // White for contrast
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
    borderRadius: 20,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  voiceButtonIcon: {
    width: 24,
    height: 24,
    tintColor: BRAND_COLORS.YELLOW, // #CFDB27
  },
  recordingButton: {
    backgroundColor: BRAND_COLORS.YELLOW, // #CFDB27
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_COLORS.YELLOW, // #CFDB27
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: BRAND_COLORS.PURPLE, // #391B58
    fontSize: 18,
    fontWeight: '800',
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  attachmentPreviewThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  attachmentPreviewIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  attachmentPreviewIcon: {
    width: 28,
    height: 28,
    tintColor: BRAND_COLORS.YELLOW,
  },
  attachmentPreviewName: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 2,
  },
  attachmentPreviewMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  attachmentPreviewClose: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BRAND_COLORS.PURPLE,
  },
  attachmentPreviewCloseText: {
    color: BRAND_COLORS.YELLOW,
    fontWeight: '800',
  },
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionsSheet: {
    backgroundColor: LIGHT_PURPLE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: UI_COLORS.BORDER_LIGHT,
  },
  actionItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionCancel: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
  },
  actionCancelText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Profile Styles
  profileContainer: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: BRAND_COLORS.PURPLE, // #391B58
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: BRAND_COLORS.YELLOW, // #CFDB27
    fontWeight: 'bold',
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonIcon: {
    width: 24,
    height: 24,
    tintColor: BRAND_COLORS.YELLOW, // #CFDB27
  },
  profileContent: {
    padding: 20,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT, // rgba(255, 255, 255, 0.1)
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  profileAvatarText: {
    fontSize: 40,
    color: '#FFFFFF', // White for contrast
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BRAND_COLORS.YELLOW, // #CFDB27
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 20,
    height: 20,
    tintColor: BRAND_COLORS.PURPLE, // #391B58
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast
    marginBottom: 5,
  },
  profileStatus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)', // White with opacity
    marginTop: 5,
  },

  // Settings Styles
  settingsContainer: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: BRAND_COLORS.PURPLE, // #391B58
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },

  // Media Picker Styles
  mediaPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: UI_COLORS.OVERLAY_DARK, // rgba(0, 0, 0, 0.5)
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  mediaPickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mediaPickerPopup: {
    width: '85%',
    backgroundColor: LIGHT_PURPLE, // #6B4E8C
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
    maxHeight: 300,
  },
  mediaPickerHeader: {
    backgroundColor: BRAND_COLORS.PURPLE, // #391B58
    borderBottomColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  mediaPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast
  },
  mediaPickerClose: {
    fontSize: 20,
    color: BRAND_COLORS.YELLOW, // #CFDB27
    fontWeight: 'bold',
  },
  mediaOptions: {
    paddingVertical: 16,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT, // rgba(255, 255, 255, 0.1)
  },
  mediaOptionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_COLORS.YELLOW, // #CFDB27
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mediaOptionIcon: {
    width: 22,
    height: 22,
    tintColor: BRAND_COLORS.PURPLE, // #391B58
  },
  mediaOptionText: {
    fontSize: 16,
    color: '#FFFFFF', // White for contrast
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Chat Menu Styles
  chatMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatMenuContainer: {
    backgroundColor: LIGHT_PURPLE,
    borderRadius: 16,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW,
    overflow: 'hidden',
  },
  chatMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BRAND_COLORS.PURPLE,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.BORDER_LIGHT,
  },
  chatMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.YELLOW,
  },
  chatMenuClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatMenuContent: {
    paddingVertical: 8,
  },
  chatMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatMenuText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});