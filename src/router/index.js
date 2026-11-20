import { createRouter, createWebHistory } from 'vue-router';
import Play from '../components/pages/play.vue';
import Drill from '../components/pages/drill.vue';
import Range from '../components/pages/range.vue';
import Villains from '../components/pages/villains.vue';
import Profile from '../components/pages/profile.vue';
import Coach from '../components/pages/coach.vue';

const routes = [
  {
    path: '/',
    name: 'Play',
    component: Play,
  },
  {
    path: '/home',
    name: 'Home',
    redirect: '/',
  },
  {
    path: '/drill',
    name: 'Drill',
    component: Drill,
  },
  {
    path: '/range',
    name: 'Range',
    component: Range,
  },
  {
    path: '/villains',
    name: 'Villains',
    component: Villains,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
  },
  {
    path: '/coach',
    name: 'Coach',
    component: Coach,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
