<script setup>
import NotificationHost from './components/NotificationHost.vue'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import OnlineUsersFloating from './components/OnlineUsersFloating.vue'
import RequestActivityHost from './components/RequestActivityHost.vue'
</script>

<template>
  <UApp>
    <RouterView />
    <RequestActivityHost />
    <ConfirmDialogHost />
    <NotificationHost />
    <OnlineUsersFloating />
  </UApp>
</template>
