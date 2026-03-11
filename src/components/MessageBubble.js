import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MessageBubble = ({ message, isMine }) => {
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

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    if (message.mediaType === 'video') {
       return (
           <View style={styles.mediaPlaceholder}>
               <Image source={{ uri: message.mediaUrl }} style={styles.imageMedia} />
               <View style={styles.playOverlay}>
                    <Ionicons name="play" size={40} color="#fff" />
               </View>
           </View>
       );
    }

    return (
        <Image source={{ uri: message.mediaUrl }} style={styles.imageMedia} />
    );
  };

  return (
    <View style={[styles.container, isMine ? styles.myMessageContainer : styles.otherMessageContainer]}>
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble, message.mediaUrl && styles.mediaBubble]}>
        {renderMedia()}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
        <View style={styles.bottomRow}>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
          {isMine && (
            <Text style={styles.readStatus}>✓✓</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    marginVertical: 4,
    width: '100%',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  mediaBubble: {
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  imageMedia: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#eee'
  },
  mediaPlaceholder: {
      position: 'relative'
  },
  playOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: 10
  },
  myBubble: {
    backgroundColor: Colors.myBubble,
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.otherBubble,
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    color: '#303030',
    lineHeight: 20,
    paddingHorizontal: 5
  },
  bottomRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    marginRight: 5
  },
  time: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 4,
  },
  readStatus: {
    fontSize: 14,
    color: Colors.blue,
    marginLeft: 4,
    fontWeight: 'bold',
  },
});

export default MessageBubble;
