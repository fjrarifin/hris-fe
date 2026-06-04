<script setup>
import NotificationHost from './components/NotificationHost.vue'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import OnlineUsersFloating from './components/OnlineUsersFloating.vue'
</script>

<template>
  <UApp>
    <RouterView />
    <ConfirmDialogHost />
    <NotificationHost />
    <OnlineUsersFloating />
  </UApp>
</template>
