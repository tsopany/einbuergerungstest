<template>
	<div class="page">
		<AppHeader />
		<main class="main">
			<p v-if="failed" class="err" role="alert">
				{{ t('home.loadFailed') }}
				<button class="link retry" type="button" @click="start">{{ t('retry') }}</button>
			</p>
			<p v-else-if="!question" class="muted loading">{{ t('loading') }}</p>
			<template v-else>
				<p class="mono muted header">{{ t('question.header', {label: question.id, seen: progress.summary.seen, total}) }}</p>
				<template v-if="!pictures">
					<img v-for="file in question.images" :key="file" class="question-image" :src="imageUrl(file)" alt="" />
				</template>
				<h1 class="question-text">{{ question.text }}</h1>
				<div class="options" :class="{pictures}">
					<button v-for="index in order" :key="index" class="option" :class="optionClass(index)" type="button" :disabled="chosen !== null" @click="answer(index)">
						<img v-if="pictures" :src="imageUrl(question.images[index])" :alt="t('question.picture', {n: index + 1})" />
						{{ question.options[index] }}
					</button>
				</div>
				<p v-if="question.credit" class="credit">{{ question.credit }}</p>
				<p v-if="saveFailed" class="err" role="alert">{{ t('question.saveFailed') }}</p>
				<template v-if="correctIndex !== null">
					<p class="verdict" :class="chosen === correctIndex ? 'right' : 'wrong'" role="status">
						{{ chosen === correctIndex ? t('question.right') : t('question.wrong') }}
					</p>
					<div class="row">
						<button class="primary next" type="button" @click="next">{{ t('question.next') }}</button>
						<router-link class="ghost overview" to="/">{{ t('question.overview') }}</router-link>
					</div>
				</template>
			</template>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {computed, onMounted, ref, watch} from 'vue';
	import {useI18n} from 'vue-i18n';
	import {useRoute, useRouter} from 'vue-router';

	import AppHeader from '@/components/AppHeader.vue';
	import {optionOrder} from '@/lib/order';
	import {imageUrl, isPictureOptions, questionById} from '@/lib/questions';
	import {useProgressStore} from '@/stores/progress';
	import {QUESTION_COUNT as total} from '#shared/ids';
	import type {Mode} from '#shared/picker';

	const props = defineProps<{id?: string}>();
	const {t} = useI18n();
	const route = useRoute();
	const router = useRouter();
	const progress = useProgressStore();

	const failed = ref(false);
	const saveFailed = ref(false);
	const chosen = ref<number | null>(null);
	const correctIndex = ref<number | null>(null);

	const mode = computed<Mode>(() => (route.query.mode === 'weak' || route.query.mode === 'easy' ? route.query.mode : 'practice'));
	const question = computed(() => (props.id ? questionById.get(props.id) : undefined));
	const order = computed(() => (question.value ? optionOrder(question.value) : []));
	const pictures = computed(() => (question.value ? isPictureOptions(question.value) : false));

	function optionClass(index: number): Record<string, boolean> {
		if (correctIndex.value === null) return {selected: chosen.value === index};
		return {right: index === correctIndex.value, wrong: index === chosen.value && index !== correctIndex.value};
	}

	function next(): Promise<unknown> {
		const query = mode.value === 'practice' ? {} : {mode: mode.value};
		return router.replace({name: 'question', params: {id: progress.next(mode.value)}, query});
	}

	async function answer(index: number): Promise<void> {
		if (!question.value || chosen.value !== null) return;
		chosen.value = index;
		saveFailed.value = false;
		try {
			correctIndex.value = (await progress.record(question.value.id, index, mode.value)).correctIndex;
		} catch {
			chosen.value = null;
			saveFailed.value = true;
		}
	}

	async function start(): Promise<void> {
		failed.value = false;
		try {
			await progress.load();
		} catch {
			failed.value = true;
			return;
		}
		if (!props.id) await next();
		else if (!question.value) await router.replace('/');
	}

	watch(
		() => props.id,
		() => {
			chosen.value = null;
			correctIndex.value = null;
			saveFailed.value = false;
		}
	);

	onMounted(start);
</script>
