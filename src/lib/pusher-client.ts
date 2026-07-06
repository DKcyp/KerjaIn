// Pusher client configuration for browser
import Pusher from 'pusher-js';

let pusherClient: Pusher | null = null;

export const getPusherClient = () => {
  // Skip Pusher initialization if credentials are not configured
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
    console.log('⚠️ Pusher credentials not configured, skipping real-time features');
    return null;
  }
  
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      // Windows-friendly configuration
      enabledTransports: ['ws', 'wss', 'xhr_polling', 'xhr_streaming'],
      disabledTransports: [], // Don't disable any transports
      wsHost: undefined, // Use default
      wsPort: undefined, // Use default
      wssPort: undefined, // Use default
      httpHost: undefined, // Use default
      httpPort: undefined, // Use default
      httpsPort: undefined, // Use default
      // Connection timeout settings for Windows
      activityTimeout: 120000, // 2 minutes
      pongTimeout: 30000, // 30 seconds
      unavailableTimeout: 10000, // 10 seconds
      // Retry configuration
      // reconnectionDelay: 1000, // REMOVED: Not supported by pusher-js
    });
    
    // Add error handling for Windows compatibility
    pusherClient.connection.bind('error', (error: any) => {
      console.error('Pusher connection error:', error);
      if (error.error?.data?.code === 4004) {
        console.log('Pusher: Over connection limit, will retry...');
      }
    });
    
    pusherClient.connection.bind('connected', () => {
      console.log('✅ Pusher connected successfully');
    });
    
    pusherClient.connection.bind('disconnected', () => {
      console.log('❌ Pusher disconnected');
    });
    
    pusherClient.connection.bind('failed', () => {
      console.error('❌ Pusher connection failed');
    });
  }

  return pusherClient;
};

export const disconnectPusher = () => {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
};
