import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nativeDb as db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

const CallsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = db.collection('calls')
            .where('participants', 'array-contains', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                if (snapshot) {
                    const fetchedCalls = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setCalls(fetchedCalls);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching calls: ", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [user]);

    const renderCallItem = ({ item }) => {
        const isOutgoing = item.callerId === user.uid;
        const otherPartyName = isOutgoing ? item.receiverName : item.callerName;
        const callTime = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
        const timeString = callTime.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <View style={styles.callItem}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={30} color="#fff" />
                    </View>
                </View>

                <View style={styles.callInfo}>
                    <View style={styles.headerRow}>
                        <Text style={styles.nameText}>{otherPartyName || 'Unknown'}</Text>
                        <Ionicons
                            name={item.type === 'video' ? 'videocam' : 'call'}
                            size={20}
                            color={Colors.secondary}
                        />
                    </View>

                    <View style={styles.statusRow}>
                        <Ionicons
                            name={isOutgoing ? "arrow-up-outline" : "arrow-down-outline"}
                            size={14}
                            color={item.status === 'missed' ? Colors.danger : Colors.accent}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={styles.timeText}>{timeString}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={calls}
                keyExtractor={(item) => item.id}
                renderItem={renderCallItem}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="call-outline" size={60} color="#8696a0" />
                        </View>
                        <Text style={styles.emptyTitle}>No call logs yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Outgoing and incoming calls will appear here.
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    callItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callInfo: {
        flex: 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 150,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f6f6f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
    },
});

export default CallsScreen;
