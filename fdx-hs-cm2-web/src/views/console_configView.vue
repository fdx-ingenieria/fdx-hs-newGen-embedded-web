<template>
  <span>
    <div class="row">
      <p></p>
      <div class="col-6">
        send:
        <div>
          <textarea v-model="customMessage" placeholder="Enter custom message" rows="40" cols="80"></textarea>
        </div>
      </div>
      <div class="col-6">
        Received:
        <div v-if="messageReceived" class="message-container">
          <pre> {{ formattedMessage }}</pre>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-6">
        <button @click="sendMessage">Send Message</button>
      </div>
    </div>
    <div class="row">  
      {{ error_msg }}
    </div>
  </span>
</template>

<script>
import { useWebSocketStore } from '@/store/websocket.js';
import { defineComponent, ref, watch } from 'vue';

export default {
  name: 'CustomMenu',
  data() {
    return {
      messageReceived: null,
      customMessage: '',
      error_msg: '',
    };
  },
  computed: {
    formattedMessage() {
      if (this.messageReceived) {
        try {
          return JSON.stringify(JSON.parse(this.messageReceived), null, 2);
        } catch (error) {
          return this.messageReceived; // Display the original message if JSON parsing fails
        }
      }
      return '';
    },
  },
  methods: {
    sendMessage() {
      try {
        const message = this.customMessage; // Use the customMessage property as the message
        const parsedMessage = JSON.parse(message);
        const websocketStore = useWebSocketStore();
        websocketStore.send(parsedMessage);
        //this.customMessage = ''; // Clear the input after sending the message
      } catch (error) {
        console.error('Error parsing JSON:', error);
        this.error_msg = error;
        // Handle the error as needed (e.g., display an error message, etc.)
      }
    },
  },
  created() {
    const websocketStore = useWebSocketStore();
    const messageReceived = ref(null);

    this.$watch(() => websocketStore.messageReceived, (newMessage) => {
      this.messageReceived = newMessage;
    });
  },
};
</script>

<style>
  textarea {
    width:  100%; /* Set the desired width */
    height: 400px; /* Set the desired height */
  }

  .message-container {
    max-height: 400px; /* Set the maximum height for the container */
    overflow-y: auto; /* Add a scrollbar when content exceeds the height */
    padding: 8px; /* Add some padding to the container */
    border: 1px solid #ccc; /* Optional: Add a border for better visual separation */
    font-family: monospace; /* Optional: Use a monospace font for better code formatting */
  }
</style>
