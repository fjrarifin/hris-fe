<script setup>
import NotificationHost from './components/NotificationHost.vue'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import RequestActivityHost from './components/RequestActivityHost.vue'
import AndroidApkPromptHost from './components/AndroidApkPromptHost.vue'
</script>

<template>
  <UApp>
    <RouterView />
    <RequestActivityHost />
    <ConfirmDialogHost />
    <NotificationHost />
    <AndroidApkPromptHost />
  </UApp>
</template>
