<template>
 <div> {{ status }}</div>
</template>

<script>
import { useWebSocketStore } from '@/store/websocket.js';
import { defineComponent, ref, watch } from 'vue';


export default {
  name: 'ConnectionComponent',
  data() {
    return {
      messageReceived: null,
      status: null,
      fileContent: null,

    };
  },

  created() {
    this.loadConfigFile();
    const websocketStore = useWebSocketStore();
    const messageReceived = ref(null);
    this.timer = setInterval(this.connection, 1000)
    
    this.$watch(() => websocketStore.messageReceived, (newMessage) => {
      this.messageReceived = newMessage;
    });

  },
  methods: {
    loadConfigFile() {
      const filePath = '/conf.txt'; // Adjust the file path as needed

      // Fetch the conf.txt file using an HTTP request (e.g., using fetch API)
      fetch(filePath)
        .then((response) => response.text())
        .then((data) => {
          this.fileContent = JSON.parse(data);
          // Here you can process the content of the conf.txt file as needed
        })
        .catch((error) => {
          console.error('Error loading the conf.txt file:', error);
        });
    },
    connection() {
      const websocketStore = useWebSocketStore();
      this.status=websocketStore.getStatus();

     switch (this.status) {
      case "disconnected":
        this.connectWebSocket();
         break;
      case "connected":
         break;
      case "error":
         this.connectWebSocket();
         break;
      default:
          break;

}
   
    },
    connectWebSocket() {
      const url = 'ws://'+this.fileContent.server+':'+this.fileContent.port; // Replace with your WebSocket server URL
      const websocketStore = useWebSocketStore();
      websocketStore.connect(url);
    },
    sendMessage() {
      const message = { key: 'value' }; // Replace with your message data
      const websocketStore = useWebSocketStore();
      websocketStore.send(message);
    },
  }
};
</script>
