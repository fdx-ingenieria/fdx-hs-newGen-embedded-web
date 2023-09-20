<template>
  <div class="container mt-5">
    <div class="row mb-3">
      <label class="col-md-2 col-form-label">Device:</label>
      <div class="col-md-4">
        <input class="form-control" v-model="labels.device" maxlength="15" />
      </div>
    </div>
    <div class="row mb-3">
      <label class="col-md-2 col-form-label">Equipment:</label>
      <div class="col-md-8">
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Equipment 0:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.equipment[0]" maxlength="15" />
          </div>
          <div class="col-md-2">
            <label class="col-form-label">Equipment 1:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.equipment[1]" maxlength="15" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Equipment 2:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.equipment[2]" maxlength="15" />
          </div>
          <div class="col-md-2">
            <label class="col-form-label">Equipment 3:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.equipment[3]" maxlength="15" />
          </div>
        </div>
      </div>
    </div>
    <div class="row mb-3">
      <label class="col-md-2 col-form-label">Location:</label>
      <div class="col-md-8">
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Location 0:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[0]" maxlength="15" />

          </div>
          <div class="col-md-2">
            <label class="col-form-label">Location 1:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[1]" maxlength="15" />
          </div>
          <div class="col-12">     All sensor in "Location 0" represent a sensor out the system</div>

        </div>
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Location 2:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[2]" maxlength="15" />
          </div>
          <div class="col-md-2">
            <label class="col-form-label">Location 3:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[3]" maxlength="15" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Location 4:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[4]" maxlength="15" />
          </div>
          <div class="col-md-2">
            <label class="col-form-label">Location 5:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[5]" maxlength="15" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Location 6:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.location[6]" maxlength="15" />
          </div>
        </div>
      </div>
    </div>
    <div class="row mb-3">
      <label class="col-md-2 col-form-label">Position:</label>
      <div class="col-md-8">
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Position 0:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.position[0]" maxlength="15" />
          </div>
          <div class="col-md-2">
            <label class="col-form-label">Position 1:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.position[1]" maxlength="15" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Position 2:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.position[2]" maxlength="15" />
          </div>
          <div class="col-md-2">
            <label class="col-form-label">Position 3:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.position[3]" maxlength="15" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-2">
            <label class="col-form-label">Position 4:</label>
          </div>
          <div class="col-md-4">
            <input class="form-control" v-model="labels.position[4]" maxlength="15" />
          </div>
        </div>
      </div>
    </div>

    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
      <button class="btn btn-primary me-md-2" @click="save">SAVE</button>

    </div>

   
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
        const message = { cmd: 'label',arg: "get", data:"" }; // Replace with your message data
        websocketStore.send(message);

      },
    save() {
      const websocketStore = useWebSocketStore();
      
      const message = { cmd: 'label',arg: "set", data: this.labels }; // Replace with your message data
      websocketStore.send(message);
      this.saved=true;

     
    },

    loadWhenConnected(){

    const websocketStore = useWebSocketStore();
    this.status=websocketStore.getStatus();
    console.log("status: "+ this.status);

    if(this.status=="connected"){
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
      console.log(newMessage);
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
    );

  },
};
</script>

<style scoped>
input {
  margin: 5px;
}
</style>