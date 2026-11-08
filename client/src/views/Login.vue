<template>
	<div class="page">
		<AppHeader />
		<main class="main login">
			<h1>{{ t('login.title') }}</h1>
			<p class="muted">{{ t('login.lead') }}</p>
			<p v-if="errorKey" class="err" role="alert">{{ t(errorKey) }}</p>
			<div v-if="!checking">
				<a class="primary google" :href="apiUrl('/api/auth/google')">{{ t('login.google') }}</a>
			</div>
			<i18n-t keypath="login.agree" tag="p" class="muted agree">
				<template #privacy
					><router-link class="link privacy" to="/p/legal#privacy">{{ t('legal.privacy.title') }}</router-link></template
				>
			</i18n-t>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {computed, onMounted, ref} from 'vue';
	import {useI18n} from 'vue-i18n';
	import {useRoute, useRouter} from 'vue-router';

	import AppHeader from '@/components/AppHeader.vue';
	import {apiUrl} from '@/lib/api';
	import {useAuthStore} from '@/stores/auth';

	const {t} = useI18n();
	const route = useRoute();
	const router = useRouter();
	const auth = useAuthStore();

	const checking = ref(true);
	const errorKey = computed(() => {
		if (!route.query.error) return '';
		return route.query.error === 'unverified_email' ? 'login.unverifiedEmail' : 'login.failed';
	});

	onMounted(async () => {
		if (!route.query.error && (await auth.signIn()))
			await router.replace(typeof route.query.next === 'string' && route.query.next.startsWith('/') && !route.query.next.startsWith('//') ? route.query.next : '/');
		checking.value = false;
	});
</script>
