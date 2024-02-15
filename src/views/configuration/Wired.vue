<template>
    <section>
    <div class="mx-auto">
      <h2>Network Configuration</h2>
        <label for="dhcp">Enable DHCP:</label>
        <input type="checkbox" id="dhcp" v-model="enableDHCP" />

        <div v-if="!enableDHCP">

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">IP Address:</label>
              <input type="ip" min="1" max="247" v-model="ipAddress" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Subnet Mask:</label>
              <input type="ip" min="1" max="247" v-model="subnetMask" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Gateway:</label>
              <input type="ip" min="1" max="247" v-model="gateway" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">DNS Server 1:</label>
              <input type="ip" min="1" max="247" v-model="dnsServer1" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">DNS Server 2:</label>
              <input type="ip" min="1" max="247" v-model="dnsServer2" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>
          </div>

          <div class="flex items-center space-x-4">
        
            <button class="text-white flex disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
            type="button" >
              Save
          </button>
        </div>
        
    </div>
  </section>
</template>

<script>
export default {
  data() {
    return {
      enableDHCP: true,
      ipAddress: "192.168.1.10",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
      dnsServer1: "8.8.8.8",
      dnsServer2: "8.8.8.8"
    };
  },
  methods: {
    submitForm() {
      // Here you can handle the form submission logic
      console.log("Form submitted with the following data:", this.$data);
    }
  }
};
</script>

<style scoped>
/* Add your custom styling here if needed */
</style>
