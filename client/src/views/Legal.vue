<template>
	<div class="page">
		<AppHeader />
		<main class="main">
			<h1>{{ t('legal.title') }}</h1>
			<section id="privacy" class="doc">
				<h2>{{ t('legal.privacy.title') }}</h2>
				<p>{{ t('legal.privacy.intro') }}</p>
				<section v-for="section in sections" :key="section" class="section" :data-section="section">
					<h2>{{ t(`legal.privacy.${section}.title`) }}</h2>
					<p class="muted">
						{{ t(`legal.privacy.${section}.body`) }}
						<a v-if="section === 'contact'" class="contact" :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
					</p>
				</section>
			</section>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {useI18n} from 'vue-i18n';

	import AppHeader from '@/components/AppHeader.vue';
	import {CONTACT_EMAIL} from '@/lib/legal';

	const {t} = useI18n();
	const sections = ['who', 'data', 'processors', 'retention', 'rights', 'contact'];
</script>
