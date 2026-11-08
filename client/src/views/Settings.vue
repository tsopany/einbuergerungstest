<template>
	<div class="page">
		<AppHeader />
		<main class="main">
			<h1>{{ t('settings.title') }}</h1>
			<p v-if="auth.user" class="muted account">{{ t('settings.account', {email: auth.user.email}) }}</p>
			<p v-if="done" class="done" role="status">{{ t('settings.resetDone') }}</p>
			<p v-if="failed" class="err" role="alert">{{ t('settings.failed') }}</p>
			<section v-for="action in actions" :key="action.name" class="action" :class="action.name">
				<button v-if="asking !== action.name" class="ghost danger ask" type="button" @click="ask(action.name)">{{ t(`settings.${action.name}`) }}</button>
				<div v-else class="confirm" role="alertdialog">
					<span>{{ t(`settings.${action.name}Warning`) }}</span>
					<div class="row">
						<button class="primary danger yes" type="button" @click="action.run">{{ t(`settings.${action.name}Confirm`) }}</button>
						<button class="ghost no" type="button" @click="asking = ''">{{ t('settings.cancel') }}</button>
					</div>
				</div>
			</section>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {ref} from 'vue';
	import {useI18n} from 'vue-i18n';
	import {useRouter} from 'vue-router';

	import AppHeader from '@/components/AppHeader.vue';
	import {useAuthStore} from '@/stores/auth';
	import {useProgressStore} from '@/stores/progress';

	const {t} = useI18n();
	const auth = useAuthStore();
	const progress = useProgressStore();
	const router = useRouter();

	const asking = ref('');
	const done = ref(false);
	const failed = ref(false);

	function ask(name: string): void {
		asking.value = name;
		done.value = false;
		failed.value = false;
	}

	async function attempt(work: () => Promise<void>): Promise<boolean> {
		try {
			await work();
			return true;
		} catch {
			failed.value = true;
			asking.value = '';
			return false;
		}
	}

	async function reset(): Promise<void> {
		if (!(await attempt(() => progress.reset()))) return;
		asking.value = '';
		done.value = true;
	}

	async function remove(): Promise<void> {
		if (await attempt(() => auth.deleteAccount())) await router.push('/p/login');
	}

	const actions = [
		{name: 'reset', run: reset},
		{name: 'delete', run: remove}
	];
</script>
