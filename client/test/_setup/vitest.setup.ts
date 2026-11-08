import {config} from '@vue/test-utils';
import {createRouter, createWebHistory} from 'vue-router';
import {createPinia} from 'pinia';
import {vi} from 'vitest';
import i18n from '@/lib/i18n';

localStorage.setItem('shuffle-answers', 'off');
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8115');

const router = createRouter({history: createWebHistory(), routes: []});

config.global.plugins = [router, createPinia(), i18n];
