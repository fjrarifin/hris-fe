<script setup>
import NotificationHost from './components/NotificationHost.vue'
import OnlineUsersFloating from './components/OnlineUsersFloating.vue'
</script>

<template>
  <UApp>
    <RouterView />
    <NotificationHost />
    <OnlineUsersFloating />
  </UApp>
</template>
