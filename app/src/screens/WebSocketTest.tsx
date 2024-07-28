import React, { useState, useEffect, useCallback } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import io, { Socket } from 'socket.io-client';

const WebSocketTest: React.FC = () => {
    const [status, setStatus] = useState('Disconnected');
    const [socket, setSocket] = useState<Socket | null>(null);
    const sessionId = '123'; // In a real app, this should be dynamically generated or received from the web app

    const initializeSocket = useCallback(() => {
        const newSocket = io('https://proofofpassport-merkle-tree.xyz', {
            path: '/websocket',
            transports: ['websocket'],
            query: { sessionId, clientType: 'mobile' }
        });

        newSocket.on('connect', () => {
            setStatus('Connected to server');
            console.log('Connected to WebSocket server');
            newSocket.emit('mobile_connected', { sessionId });
        });

        newSocket.on('disconnect', () => {
            setStatus('Disconnected from server');
            console.log('Disconnected from WebSocket server');
        });

        newSocket.on('handshake_response', (data: { message: string }) => {
            setStatus(`Server response: ${data.message}`);
            console.log('Handshake response:', data.message);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setStatus(`Connection error: ${error.message}`);
        });

        setSocket(newSocket);

        return newSocket;
    }, []);

    useEffect(() => {
        const newSocket = initializeSocket();

        return () => {
            newSocket.disconnect();
        };
    }, [initializeSocket]);

    const handleHandshake = () => {
        if (socket && socket.connected) {
            socket.emit('handshake', { message: 'Hello from React Native!', sessionId });
            setStatus('Handshake initiated...');
        } else {
            setStatus('Socket not connected. Attempting to reconnect...');
            const newSocket = initializeSocket();
            setSocket(newSocket);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Initiate Handshake" onPress={handleHandshake} />
            <Text style={styles.statusText}>{status}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        marginTop: 20,
        fontSize: 16,
    },
});

export default WebSocketTest;