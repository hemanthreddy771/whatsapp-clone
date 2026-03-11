import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nativeDb as db } from '../config/firebase';
import Colors from '../constants/Colors';

const IncomingCallScreen = ({ route, navigation }) => {
    const { channelId, chatId, callerName, callType, callDocId } = route.params || {};
    const callChannelId = channelId || chatId; // Support both param names

    // You would typically play a ringtone here
    // useEffect(() => { ... }, []);

    const handleAccept = async () => {
        if (callDocId) {
            await db.collection('calls').doc(callDocId).update({ status: 'ongoing' }).catch(() => { });
        }
        navigation.replace('VideoCalling', {
            channelId: callChannelId,
            callType: callType || 'video',
            callDocId: callDocId
        });
    };

    const handleDecline = async () => {
        if (callDocId) {
            await db.collection('calls').doc(callDocId).update({ status: 'rejected' }).catch(() => { });
        }
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.endToEnd}>End-to-end encrypted</Text>
            </View>

            <View style={styles.callerInfo}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={100} color="#fff" />
                </View>
                <Text style={styles.callerName}>{callerName || 'Unknown Contact'}</Text>
                <Text style={styles.callType}>
                    WhatsApp {callType === 'video' ? 'Video' : 'Audio'} Call
                </Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.actionsRow}>
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={handleDecline}
                        >
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.actionText}>Decline</Text>
                    </View>

                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={handleAccept}
                        >
                            <Ionicons name={callType === 'video' ? "videocam" : "call"} size={32} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.actionText}>Accept</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#075E54', // WhatsApp Green
        justifyContent: 'space-between',
        paddingVertical: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    endToEnd: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginLeft: 5,
    },
    callerInfo: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    callerName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '500',
    },
    callType: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 18,
        marginTop: 10,
    },
    footer: {
        width: '100%',
        paddingHorizontal: 40,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    actionContainer: {
        alignItems: 'center',
    },
    actionButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    declineButton: {
        backgroundColor: '#FF3B30',
    },
    acceptButton: {
        backgroundColor: '#25D366',
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
    }
});

export default IncomingCallScreen;
