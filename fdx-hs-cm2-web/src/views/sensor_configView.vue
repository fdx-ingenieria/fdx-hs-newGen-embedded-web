<template>
  <div class="container" >


   
  </div>
</template>



<script>
import { useWebSocketStore } from '@/store/websocket.js';
import { defineComponent, ref, watch } from 'vue';

export default {
  name: 'labelMenu',
  data() {
    return {
      saved: false,
      sensor_configl : { "cmd": "sensor_configl","arg":"get_all","data":""},
      messageReceived: null,
      labels:{
      device: '', // User input for device
      equipment: ['', '', '', ''], // User input for equipment
      location: [
        '', // User input for location_0
        '', // User input for location_1
        '', // User input for location_2
        '', // User input for location_3
        '', // User input for location_4
        '', // User input for location_5
        '', // User input for location_6
      ],
      position: [
        '', // User input for phase_0
        '', // User input for phase_1
        '', // User input for phase_2
        '', // User input for neutral_3
        '', // User input for ambient
      ],
    }
    };
  },
  methods: {
    sendMessage() {
      const websocketStore = useWebSocketStore();
        const message = { "cmd": "sensor_configl","arg":"get_all","data":""} ; // Replace with your message data
        websocketStore.send(message);

      },
    save() {
      const websocketStore = useWebSocketStore();
      const message = { cmd: 'label',arg: "set", data: this.labels }; // Replace with your message data
      websocketStore.send(message);
      this.saved=true;
     
    },
    sendCMD(message) {
      const websocketStore = useWebSocketStore();
      //const message = { cmd: 'label',arg: "set", data: this.labels }; // Replace with your message data
      websocketStore.send(message);
      this.saved=true;
     
    },

    loadWhenConnected(){

    const websocketStore = useWebSocketStore();
    this.status=websocketStore.getStatus();
    console.log("status: "+ this.status);

    if(this.status=="connected"){
      this.sendCMD(this.sensor_configl);




      this.sendMessage();
      clearInterval(this.timer)
      }

    },

    deepEqual(obj1, obj2) {
      if (obj1 === obj2) {
        return true;
      }

      if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false;
      }

      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) {
        return false;
      }

      for (const key of keys1) {
        if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
          return false;
        }
      }
      return true;
    },
  },

  created() {

    this.timer = setInterval(this.loadWhenConnected, 1000)
    const websocketStore = useWebSocketStore();

    this.$watch(
      () => websocketStore.messageReceived,
      (newMessage) => {
     // console.log(newMessage);
      try{
        if(this.saved){
          this.saved=false;
          var tmp=this.labels;
          if(this.deepEqual(tmp,newMessage)){

            this.labels=newMessage;
            alert("saved OK")


          }else{
          alert("saved Fail")

          }
        }else{
          this.labels=newMessage.data;

        }
      }
     catch (error) {
        console.error(error);
        // Expected output: ReferenceError: nonExistentFunction is not defined
        // (Note: the exact output may be browser-dependent)
      }
      }
    );

  },
};
</script>

<style scoped>
input {
  margin: 5px;
}
</style>