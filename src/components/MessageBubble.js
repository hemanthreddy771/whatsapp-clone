import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MessageBubble = ({ message, isMine, onMediaPress, onDownload }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Read receipt tick marks
  const renderStatus = () => {
    if (!isMine) return null;

    const status = message.status || 'sent';

    if (status === 'read') {
      // Blue double ticks
      return <Text style={[styles.readStatus, { color: '#53bdeb' }]}>✓✓</Text>;
    } else if (status === 'delivered') {
      // Grey double ticks  
      return <Text style={[styles.readStatus, { color: '#8696a0' }]}>✓✓</Text>;
    } else {
      // Grey single tick (sent)
      return <Text style={[styles.readStatus, { color: '#8696a0' }]}>✓</Text>;
    }
  };

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    if (message.mediaType === 'video') {
      return (
        <TouchableOpacity onPress={() => onMediaPress && onMediaPress(message.mediaUrl)} activeOpacity={0.9}>
          <View style={styles.mediaContainer}>
            <Image source={{ uri: message.mediaUrl }} style={styles.imageMedia} />
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={50} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
          {!isMine && (
            <TouchableOpacity style={styles.downloadRow} onPress={() => onDownload && onDownload(message.mediaUrl)}>
              <Ionicons name="download-outline" size={16} color={Colors.secondary} />
              <Text style={styles.downloadText}>Download</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={() => onMediaPress && onMediaPress(message.mediaUrl)} activeOpacity={0.9}>
        <Image source={{ uri: message.mediaUrl }} style={styles.imageMedia} />
        {!isMine && (
          <TouchableOpacity style={styles.downloadRow} onPress={() => onDownload && onDownload(message.mediaUrl)}>
            <Ionicons name="download-outline" size={16} color={Colors.secondary} />
            <Text style={styles.downloadText}>Download</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isMine ? styles.myMessageContainer : styles.otherMessageContainer]}>
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble, message.mediaUrl && styles.mediaBubble]}>
        {renderMedia()}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
        <View style={styles.bottomRow}>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
          {renderStatus()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10, marginVertical: 3, width: '100%',
  },
  myMessageContainer: { alignItems: 'flex-end' },
  otherMessageContainer: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
  },
  mediaBubble: { paddingHorizontal: 3, paddingTop: 3 },
  mediaContainer: { position: 'relative' },
  imageMedia: {
    width: width * 0.65, height: width * 0.65, borderRadius: 8, backgroundColor: '#eee'
  },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8
  },
  downloadRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 5,
  },
  downloadText: {
    color: Colors.secondary, fontSize: 12, fontWeight: '600', marginLeft: 4,
  },
  myBubble: { backgroundColor: Colors.myBubble, borderTopRightRadius: 3 },
  otherBubble: { backgroundColor: Colors.otherBubble, borderTopLeftRadius: 3 },
  text: { fontSize: 16, color: '#303030', lineHeight: 20, paddingHorizontal: 4 },
  bottomRow: {
    flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginTop: 1, marginRight: 2,
  },
  time: { fontSize: 11, color: '#8696a0', marginTop: 2 },
  readStatus: {
    fontSize: 13, marginLeft: 3, fontWeight: 'bold',
  },
});

export default MessageBubble;
