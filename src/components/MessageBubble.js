import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

const MessageBubble = ({ message, isMine }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isMine ? styles.myMessageContainer : styles.otherMessageContainer]}>
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
        <Text style={styles.text}>{message.text}</Text>
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
  },
  bottomRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: '#8696a0',
  },
  readStatus: {
    fontSize: 14,
    color: Colors.blue,
    marginLeft: 4,
    fontWeight: 'bold',
  },
});

export default MessageBubble;
