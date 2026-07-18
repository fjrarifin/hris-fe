<template>
  <img v-if="objectUrl" :src="objectUrl" :alt="alt" />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
})

const objectUrl = ref('')

const fetchImage = async () => {
  if (!props.src) return

  if (props.src.startsWith('blob:') || props.src.startsWith('data:')) {
    objectUrl.value = props.src
    return
  }

  try {
    const token = localStorage.getItem('hris_token')
    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(props.src, { headers })

    if (!response.ok) throw new Error('Network response was not ok')

    const blob = await response.blob()
    objectUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('Failed to load secure image', error)
  }
}

watch(
  () => props.src,
  () => {
    if (objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value)
      objectUrl.value = ''
    }
    fetchImage()
  },
)

onMounted(fetchImage)

onUnmounted(() => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }
})
</script>
