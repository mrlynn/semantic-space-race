import Pusher from 'pusher-js';

let pusherInstance = null;

export function getPusherClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    });
  }

  return pusherInstance;
}

