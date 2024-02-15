import { defineStore } from 'pinia';

export const useWebSocketStore = defineStore({
  id: 'websocket',
  state: () => ({
    socket: null,
    messageReceived: null,
    status: 'Disconnected', // New status property to track WebSocket status

  }),
  actions: {
    connect(url) {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('WebSocket connected');
        this.$state.socket = socket;
        this.$state.status = "Connected";

      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.$state.socket = null;
        this.$state.status = "Disconnected";
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.$state.socket = null;
        this.$state.status = "Disconnected";
      };

      // Set up the message event handler to update messageReceived
      socket.onmessage = (event) => {
        console.log(event.data);
        this.$state.messageReceived = JSON.parse(event.data);
      };
      
    },
    getStatus() {
      return this.$state.status;
    },
    close() {
      if (this.$state.socket) {
        this.$state.socket.close();
        this.$state.status = "Disconnected";
      }
    },

    send(message) {
      if (this.$state.socket) {
        this.$state.socket.send(JSON.stringify(message));
      } else {
        console.error('WebSocket not connected');
        this.$state.status = "Disconnected";
      }
    },
  },
});
