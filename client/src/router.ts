import {createRouter, createWebHistory, type RouteLocationNormalized, type RouteRecordRaw} from 'vue-router';

import {useAuthStore} from '@/stores/auth';
import Exam from './views/Exam.vue';
import ExamReport from './views/ExamReport.vue';
import Home from './views/Home.vue';
import Legal from './views/Legal.vue';
import Login from './views/Login.vue';
import NotFound from './views/NotFound.vue';
import Question from './views/Question.vue';
import Settings from './views/Settings.vue';

export const routes: RouteRecordRaw[] = [
	{path: '/', name: 'home', component: Home, meta: {auth: true}},
	{path: '/p/login', name: 'login', component: Login},
	{path: '/p/frage/:id?', name: 'question', component: Question, props: true, meta: {auth: true}},
	{path: '/p/pruefung', name: 'exam', component: Exam, meta: {auth: true}},
	{path: '/p/pruefung/:id', name: 'exam-report', component: ExamReport, props: true, meta: {auth: true}},
	{path: '/p/einstellungen', name: 'settings', component: Settings, meta: {auth: true}},
	{path: '/p/legal', name: 'legal', component: Legal},
	{path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound}
];

export async function requireAuth(to: RouteLocationNormalized): Promise<true | {path: string; query: {next: string}}> {
	if (!to.meta.auth) return true;
	const auth = useAuthStore();
	return auth.user || (await auth.signIn()) ? true : {path: '/p/login', query: {next: to.fullPath}};
}

export const scrollBehavior = (to: RouteLocationNormalized): {el: string} | {top: number} => (to.hash ? {el: to.hash} : {top: 0});

const router = createRouter({history: createWebHistory(), routes, scrollBehavior});
router.beforeEach(requireAuth);

export default router;
