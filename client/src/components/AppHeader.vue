<template>
	<header class="app-bar">
		<div class="who-bar">
			<router-link class="brand mono" to="/">{{ t('app.name') }}</router-link>
			<span v-if="auth.user" class="who mono">{{ auth.user.name || auth.user.email }}</span>
		</div>
		<nav class="mono" :aria-label="t('nav.label')">
			<router-link class="link legal" to="/p/legal">{{ t('nav.legal') }}</router-link>
			<template v-if="auth.user">
				<router-link class="link settings" to="/p/einstellungen">{{ t('nav.settings') }}</router-link>
				<button class="link signout" type="button" @click="signOut">{{ t('nav.signOut') }}</button>
			</template>
			<router-link v-else class="link signin" to="/p/login">{{ t('nav.signIn') }}</router-link>
			<button class="link theme" type="button" :aria-label="t('nav.theme')" :title="t('nav.theme')" @click="toggleTheme">
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<template v-if="theme === 'dark'">
						<circle cx="12" cy="12" r="4" />
						<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
					</template>
					<path v-else d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
				</svg>
			</button>
		</nav>
	</header>
</template>

<script setup lang="ts">
	import {useI18n} from 'vue-i18n';
	import {useRouter} from 'vue-router';

	import {theme, toggleTheme} from '@/lib/theme';
	import {useAuthStore} from '@/stores/auth';

	const {t} = useI18n();
	const auth = useAuthStore();
	const router = useRouter();

	async function signOut(): Promise<void> {
		await auth.signOut();
		await router.push('/p/login');
	}
</script>
