import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { formatPersonName } from '@/utils/text';

import { apiGet, apiPost } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';

type ChatMessage = {
  id: number;
  user_id: number;
  user_name: string;
  message: string;
  is_own: boolean;
  created_at: string;
};

type MessagesResponse = {
  messages: ChatMessage[];
};

export default function ChatTabScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { token, user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet('/api/chat/messages', token)) as MessagesResponse;
      setMessages(json.messages ?? []);
      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err: any) {
      console.log('Messages error:', err);
      setError(err?.message ?? 'Unable to load messages');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      loadMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [token, loadMessages]);

  const handleSendMessage = async () => {
    if (!token || !messageText.trim() || sending) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);
    setError(null);

    try {
      const response = (await apiPost('/api/chat/messages', token, {
        message: textToSend,
      })) as { message: ChatMessage };

      setMessages((prev) => [...prev, response.message]);
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.log('Send message error:', err);
      setError(err?.message ?? 'Failed to send message');
      setMessageText(textToSend); // Restore message text on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Group Chat</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesContainer}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadMessages} tintColor={palette.tint} />
          }
        >
          {loading && messages.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={palette.tint} />
              <Text style={styles.loadingText}>Loading messages…</Text>
            </View>
          ) : error && messages.length === 0 ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : messages.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const displayName = formatPersonName(msg.user_name);
              return (
                <View
                  key={msg.id}
                  style={[styles.messageWrapper, msg.is_own && styles.messageWrapperOwn]}
                >
                  {!msg.is_own && (
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageSender}>{displayName || msg.user_name}</Text>
                      <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      msg.is_own ? styles.messageBubbleOwn : styles.messageBubbleOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.is_own ? styles.messageTextOwn : styles.messageTextOther,
                      ]}
                    >
                      {msg.message}
                    </Text>
                  </View>
                  {msg.is_own && (
                    <Text style={styles.messageTimeOwn}>{formatTime(msg.created_at)}</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          {error && messages.length > 0 && (
            <Text style={styles.errorTextSmall}>{error}</Text>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={5000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
    },
    keyboardView: {
      flex: 1,
    },
    messagesContainer: {
      padding: 16,
      gap: 12,
      paddingBottom: 20,
    },
    centered: {
      alignItems: 'center',
      marginTop: 48,
      gap: 12,
    },
    loadingText: {
      color: palette.textMuted,
      fontSize: 14,
    },
    emptyText: {
      color: palette.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 48,
    },
    errorText: {
      color: palette.danger,
      textAlign: 'center',
      marginTop: 24,
      fontSize: 14,
    },
    errorTextSmall: {
      color: palette.danger,
      fontSize: 12,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    messageWrapper: {
      marginBottom: 8,
      maxWidth: '80%',
    },
    messageWrapperOwn: {
      alignSelf: 'flex-end',
      alignItems: 'flex-end',
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    messageSender: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textMuted,
    },
    messageTime: {
      fontSize: 11,
      color: palette.textMuted,
    },
    messageTimeOwn: {
      fontSize: 11,
      color: palette.textMuted,
      marginTop: 4,
      paddingHorizontal: 4,
    },
    messageBubble: {
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxWidth: '100%',
    },
    messageBubbleOwn: {
      backgroundColor: palette.tint,
    },
    messageBubbleOther: {
      backgroundColor: palette.elevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    messageTextOwn: {
      color: '#fff',
    },
    messageTextOther: {
      color: palette.text,
    },
    inputContainer: {
      backgroundColor: palette.surface,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: palette.text,
      backgroundColor: palette.background,
      fontSize: 15,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: palette.tint,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
      minWidth: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });

