import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RtcSurfaceView } from 'react-native-agora';

const { width, height } = Dimensions.get('window');

const CallOverlay = () => {
    const { activeCall, setActiveCall } = useAuth();
    const navigation = useNavigation();

    if (!activeCall || !activeCall.isMinimized) return null;

    const pan = React.useRef(new Animated.ValueXY({ x: width - 120, y: height - 250 })).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => {
                pan.extractOffset();
            },
        })
    ).current;

    const expandCall = () => {
        setActiveCall({ ...activeCall, isMinimized: false });
        navigation.navigate('VideoCalling', {
            channelId: activeCall.channelId,
            callType: activeCall.callType,
            callDocId: activeCall.callDocId,
            callerName: activeCall.callerName
        });
    };

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                pan.getLayout(),
                styles.overlay,
                activeCall.callType === 'audio' && styles.audioOverlay
            ]}
        >
            <TouchableOpacity onPress={expandCall} activeOpacity={0.9} style={styles.content}>
                {activeCall.callType === 'video' && activeCall.remoteUid !== 0 ? (
                    <RtcSurfaceView
                        canvas={{ uid: activeCall.remoteUid }}
                        style={styles.miniVideo}
                    />
                ) : (
                    <View style={styles.miniPlaceholder}>
                        <Ionicons name={activeCall.callType === 'video' ? "videocam" : "call"} size={24} color="#fff" />
                        <Text style={styles.miniText} numberOfLines={1}>{activeCall.callerName || 'Call'}</Text>
                    </View>
                )}
                <View style={styles.expandIcon}>
                    <Ionicons name="expand" size={16} color="#fff" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        width: 100,
        height: 150,
        backgroundColor: '#000',
        borderRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        overflow: 'hidden',
        zIndex: 9999,
    },
    audioOverlay: {
        height: 60,
        width: 150,
        backgroundColor: '#075E54',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    content: {
        flex: 1,
    },
    miniVideo: {
        flex: 1,
    },
    miniPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    miniText: {
        color: '#fff',
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
    },
    expandIcon: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 10,
        padding: 2,
    }
});

export default CallOverlay;
