<template>
  <div class="row">
    <BNavbar toggleable="sm" type="light" variant="light" style="height: 60px;">

      <BNavbarBrand >
        <img src="logo.svg" alt="" height="50px" style="width: 50px; height: 50px;">
      </BNavbarBrand>

      <!-- <BCollapse id="nav-text-collapse" is-nav>
        <BNavbarNav>
          <BNavItem>
            <router-link to="/#" class="menu-link">Temperatures</router-link>
          </BNavItem>
          <BNavItem>
            <router-link to="/alarm" class="menu-link">Alarm</router-link>
          </BNavItem>

          <BNavItemDropdown
            v-model="dropdownShow"
            id="my-nav-dropdown"
            text="Configuration"
            toggle-class="nav-link-custom"
            end
          >
            <BDropdownItem>System</BDropdownItem>
            <BDropdownItem><router-link to="/label_config" class="menu-link">Labels</router-link></BDropdownItem>
            <BDropdownItem><router-link to="/sensor_config" class="menu-link">Sensors</router-link></BDropdownItem>
            <BDropdownItem><router-link to="/console" class="menu-link">CONSOLE TEST</router-link></BDropdownItem>
            <BDropdownItem>Alarms</BDropdownItem>
            <BDropdownItem>Modbus</BDropdownItem>
          </BNavItemDropdown>
        </BNavbarNav>
      </BCollapse> -->
     <connection/>
    </BNavbar>
  </div>
</template>

<script>
import connection from './connection.vue';

export default {
  components: { connection },
  name: 'CustomMenu',
  data() {
    return {
      dropdownShow: false,
    };
  },
};
</script>

<style>
/* Custom styles for the menu links */
.menu-link {
  text-decoration: none;
  color: #333;
  padding: 1px;
}

.menu-link:hover {
  background-color: #ddd;
}

/* Remove underline from the BootstrapVue nav-link class */
.nav-link-custom {
  text-decoration: none;
}
</style>
