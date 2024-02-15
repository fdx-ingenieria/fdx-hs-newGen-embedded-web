<template>
<div :class="{ 'red': status === 'Disconnected', 'green': status === 'Connected' }">{{ status }}</div>
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
      case "Disconnected":
        this.connectWebSocket();
         break;
      case "Connected":
         break;
      default:
          this.connectWebSocket();
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

<style scoped>

.red {
    color: rgb(0, 0, 0); /* Change the text color to red for disconnected */
    padding-right:  50px;
    padding-left:  50px;
    margin-right: 100px;
    padding-top: 20px;
    padding-bottom: 20px;
    background-color: rgb(255, 0, 0);
}

.green {
    color: rgb(0, 0, 0); /* Change the text color to green for connected */
    padding-right:  50px;
    padding-left:  50px;
    margin-right: 100px;
    padding-top: 20px;
    padding-bottom: 20px;
    background-color: rgb(0, 255, 55);


}
</style>
