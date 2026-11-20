<script setup>
import NavBar from './components/navBar.vue';
import NoticeToast from './components/NoticeToast.vue';
</script>

<template>
  <NavBar />
  <NoticeToast />
  <router-view />
</template>
