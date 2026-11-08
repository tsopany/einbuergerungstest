<template>
	<header class="app-bar">
		<router-link class="brand mono" to="/">{{ t('app.name') }}</router-link>
		<nav class="mono" :aria-label="t('nav.label')">
			<router-link class="link legal" to="/p/legal">{{ t('nav.legal') }}</router-link>
			<template v-if="auth.user">
				<router-link class="link settings" to="/p/einstellungen">{{ t('nav.settings') }}</router-link>
				<button class="link signout" type="button" @click="signOut">{{ t('nav.signOut') }}</button>
			</template>
			<router-link v-else class="link signin" to="/p/login">{{ t('nav.signIn') }}</router-link>
		</nav>
	</header>
</template>

<script setup lang="ts">
	import {useI18n} from 'vue-i18n';
	import {useRouter} from 'vue-router';

	import {useAuthStore} from '@/stores/auth';

	const {t} = useI18n();
	const auth = useAuthStore();
	const router = useRouter();

	async function signOut(): Promise<void> {
		await auth.signOut();
		await router.push('/p/login');
	}
</script>
