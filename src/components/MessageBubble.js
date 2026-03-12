import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import { Swipeable } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const MessageBubble = ({ message, isMine, onMediaPress, onDownload, onSwipeToReply }) => {
  const swipeableRef = React.useRef(null);

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

  const renderStatus = () => {
    if (!isMine) return null;
    const status = message.status || 'sent';
    if (status === 'read') {
      return <Text style={[styles.readStatus, { color: '#53bdeb' }]}>✓✓</Text>;
    } else if (status === 'delivered') {
      return <Text style={[styles.readStatus, { color: '#8696a0' }]}>✓✓</Text>;
    } else {
      return <Text style={[styles.readStatus, { color: '#8696a0' }]}>✓</Text>;
    }
  };

  const isVideo = message.mediaType === 'video';

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    if (isVideo) {
      // For videos: show a dark placeholder with a play button (not an Image)
      return (
        <TouchableOpacity
          onPress={() => onMediaPress && onMediaPress(message.mediaUrl, 'video')}
          activeOpacity={0.8}
        >
          <View style={[styles.imageMedia, styles.videoPlaceholder]}>
            <Ionicons name="videocam" size={30} color="rgba(255,255,255,0.5)" />
            <View style={styles.playCircle}>
              <Ionicons name="play" size={32} color="#fff" />
            </View>
            <Text style={styles.videoLabel}>Video</Text>
          </View>
          {!isMine && (
            <TouchableOpacity style={styles.downloadRow} onPress={() => onDownload && onDownload(message.mediaUrl)}>
              <Ionicons name="download-outline" size={16} color={Colors.secondary} />
              <Text style={styles.downloadText}>Download Video</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    // For images: show the actual image
    return (
      <TouchableOpacity onPress={() => onMediaPress && onMediaPress(message.mediaUrl, 'image')} activeOpacity={0.9}>
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

  const renderLeftActions = () => {
    return (
      <View style={styles.replyAction}>
        <Ionicons name="arrow-undo" size={24} color="#000" />
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={40}
      renderLeftActions={renderLeftActions}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'left') {
          if (onSwipeToReply) onSwipeToReply(message);
          swipeableRef.current?.close();
        }
      }}
    >
      <View style={[styles.container, isMine ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble, message.mediaUrl && styles.mediaBubble]}>
          {message.replyTo && (
            <View style={styles.replyBox}>
              <Text style={styles.replyName} numberOfLines={1}>{message.replyTo.senderName}</Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {message.replyTo.text || (message.replyTo.mediaType === 'video' ? '🎥 Video' : '📷 Photo')}
              </Text>
            </View>
          )}
          {renderMedia()}
          {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
          <View style={styles.bottomRow}>
            <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
            {renderStatus()}
          </View>
          {message.reaction && (
            <View style={[styles.reactionBadge, isMine ? { left: -10 } : { right: -10 }]}>
              <Text style={styles.reactionEmoji}>{message.reaction}</Text>
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 10, marginVertical: 3, width: '100%' },
  myMessageContainer: { alignItems: 'flex-end' },
  otherMessageContainer: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
  },
  mediaBubble: { paddingHorizontal: 3, paddingTop: 3 },
  imageMedia: {
    width: width * 0.65, height: width * 0.65, borderRadius: 8, backgroundColor: '#eee'
  },
  videoPlaceholder: {
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    height: width * 0.45,
  },
  playCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 5,
  },
  videoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
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
  readStatus: { fontSize: 13, marginLeft: 3, fontWeight: 'bold' },
  replyBox: {
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 5, padding: 5, marginBottom: 5, borderLeftWidth: 4, borderLeftColor: Colors.secondary
  },
  replyName: { fontSize: 13, fontWeight: 'bold', color: Colors.secondary },
  replyText: { fontSize: 14, color: '#666', marginTop: 2 },
  replyAction: {
    justifyContent: 'center', alignItems: 'center', width: 50, height: '100%',
  },
  reactionBadge: {
    position: 'absolute', bottom: -12, backgroundColor: '#fff', borderRadius: 12, padding: 2,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1,
    minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  reactionEmoji: { fontSize: 14 },
});

export default MessageBubble;
