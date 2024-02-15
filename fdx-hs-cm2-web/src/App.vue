<template>
  <div>
    
   <CustomMenu />
   <BContainer>
   <router-view></router-view>

   <!-- <compLabel></compLabel> -->
  </BContainer>


  </div>
</template>

<script>

import CustomMenu from './components/menu.vue';
//import compLabel from './views/label_configView.vue';
export default {
  components: { CustomMenu },
  data() {
    
    return {
      
    };
  },
};
</script>

<style lang="scss" scoped>

</style>