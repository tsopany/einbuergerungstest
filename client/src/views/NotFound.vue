<template>
	<div class="page">
		<AppHeader />
		<main class="main">
			<h1>{{ t('notFound.title') }}</h1>
			<router-link class="link home" to="/">{{ t('notFound.home') }}</router-link>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {useI18n} from 'vue-i18n';

	import AppHeader from '@/components/AppHeader.vue';

	const {t} = useI18n();
</script>
