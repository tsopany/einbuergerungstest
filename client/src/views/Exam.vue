<template>
	<div class="page">
		<AppHeader />
		<main class="main">
			<h1>{{ t('exam.title') }}</h1>
			<template v-if="phase === 'idle'">
				<p class="intro">{{ t('exam.intro') }}</p>
				<p v-if="error" class="err" role="alert">{{ error }}</p>
				<div class="row">
					<button class="primary start" type="button" @click="start">{{ t('exam.start') }}</button>
					<router-link class="ghost overview" to="/">{{ t('exam.overview') }}</router-link>
				</div>
			</template>
			<template v-else-if="phase === 'running' && question">
				<div class="row">
					<span class="mono muted progress">{{ t('exam.progress', {n: current + 1, total: questionIds.length}) }}</span>
					<span class="mono timer" :class="{low: remaining < 5 * 60_000}" role="timer">{{ t('exam.timeLeft') }} {{ clock }}</span>
				</div>
				<div class="numbers">
					<button
						v-for="(id, index) in questionIds"
						:key="id"
						class="number"
						:class="{answered: chosen.has(id), current: index === current}"
						type="button"
						@click="current = index">
						{{ index + 1 }}
					</button>
				</div>
				<img v-for="file in question.images" v-show="!pictures" :key="file" class="question-image" :src="imageUrl(file)" alt="" />
				<h2 class="question-text">{{ question.text }}</h2>
				<div class="options" :class="{pictures}">
					<button v-for="index in order" :key="index" class="option" :class="{selected: chosen.get(question.id) === index}" type="button" @click="choose(index)">
						<img v-if="pictures" :src="imageUrl(question.images[index])" :alt="t('question.picture', {n: index + 1})" />
						{{ question.options[index] }}
					</button>
				</div>
				<p v-if="question.credit" class="credit">{{ question.credit }}</p>
				<p v-if="error" class="err" role="alert">{{ error }}</p>
				<div v-if="confirming" class="confirm" role="alertdialog">
					<span>{{ t('exam.confirmSubmit', {open: questionIds.length - chosen.size}) }}</span>
					<div class="row">
						<button class="primary confirm-yes" type="button" @click="submit(false)">{{ t('exam.yes') }}</button>
						<button class="ghost confirm-no" type="button" @click="confirming = false">{{ t('exam.no') }}</button>
					</div>
				</div>
				<div v-else class="row">
					<button class="ghost previous" type="button" :disabled="current === 0" @click="current -= 1">{{ t('exam.previous') }}</button>
					<button class="ghost forward" type="button" :disabled="current === questionIds.length - 1" @click="current += 1">{{ t('exam.next') }}</button>
					<button class="primary submit" type="button" :disabled="submitting" @click="ask">{{ t('exam.submit') }}</button>
				</div>
			</template>
			<template v-else-if="phase === 'done' && result">
				<p v-if="timedOut" class="muted timeup">{{ t('exam.timeUp') }}</p>
				<p class="result" :class="result.passed ? 'passed' : 'failed'">{{ result.passed ? t('exam.passed') : t('exam.failed') }}</p>
				<p class="score">{{ t('exam.score', {score: result.score}) }}</p>
				<section v-if="result.wrong.length">
					<h2>{{ t('exam.wrongTitle') }}</h2>
					<ul class="list wrong-list">
						<li v-for="item in result.wrong" :key="item.questionId">
							<div>
								<strong>{{ item.questionId }} · {{ questionById.get(item.questionId)?.text }}</strong>
								<p class="muted">{{ t('exam.yourAnswer') }}: {{ given(item.questionId) }}</p>
								<p class="right-answer">{{ t('exam.correctAnswer') }}: {{ questionById.get(item.questionId)?.options[item.correctIndex] }}</p>
							</div>
						</li>
					</ul>
				</section>
				<router-link class="primary overview" to="/">{{ t('exam.overview') }}</router-link>
			</template>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {computed, onBeforeUnmount, ref} from 'vue';
	import {useI18n} from 'vue-i18n';

	import AppHeader from '@/components/AppHeader.vue';
	import {optionOrder} from '@/lib/order';
	import {imageUrl, isPictureOptions, questionById} from '@/lib/questions';
	import {useProgressStore, type ExamResult} from '@/stores/progress';
	import {EXAM} from '#shared/ids';

	const {t} = useI18n();
	const progress = useProgressStore();

	const phase = ref<'idle' | 'running' | 'done'>('idle');
	const examId = ref(0);
	const questionIds = ref<string[]>([]);
	const chosen = ref(new Map<string, number>());
	const current = ref(0);
	const remaining = ref(EXAM.minutes * 60_000);
	const confirming = ref(false);
	const submitting = ref(false);
	const timedOut = ref(false);
	const error = ref('');
	const result = ref<ExamResult | null>(null);
	let deadline = 0;
	let ticker: ReturnType<typeof setInterval> | undefined;

	const orders = ref(new Map<string, number[]>());
	const question = computed(() => questionById.get(questionIds.value[current.value]));
	const order = computed(() => (question.value ? (orders.value.get(question.value.id) ?? []) : []));
	const pictures = computed(() => (question.value ? isPictureOptions(question.value) : false));
	const clock = computed(() => {
		const seconds = Math.ceil(remaining.value / 1000);
		return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
	});

	function stopTicker(): void {
		clearInterval(ticker);
		ticker = undefined;
	}

	function tick(): void {
		remaining.value = Math.max(0, deadline - Date.now());
		if (remaining.value === 0) void submit(true);
	}

	async function start(): Promise<void> {
		error.value = '';
		try {
			const started = await progress.startExam();
			examId.value = started.id;
			questionIds.value = started.questionIds;
			orders.value = new Map(started.questionIds.map((id) => [id, optionOrder(questionById.get(id)!)]));
		} catch {
			error.value = t('exam.startFailed');
			return;
		}
		chosen.value = new Map();
		current.value = 0;
		deadline = Date.now() + EXAM.minutes * 60_000;
		remaining.value = EXAM.minutes * 60_000;
		phase.value = 'running';
		ticker = setInterval(tick, 1000);
	}

	function choose(index: number): void {
		if (question.value) chosen.value = new Map(chosen.value).set(question.value.id, index);
	}

	function ask(): void {
		if (chosen.value.size === questionIds.value.length) void submit(false);
		else confirming.value = true;
	}

	async function submit(auto: boolean): Promise<void> {
		if (submitting.value) return;
		submitting.value = true;
		confirming.value = false;
		error.value = '';
		try {
			result.value = await progress.finishExam(examId.value, questionIds.value, chosen.value);
			timedOut.value = auto;
			stopTicker();
			phase.value = 'done';
		} catch {
			error.value = t('exam.submitFailed');
		} finally {
			submitting.value = false;
		}
	}

	function given(id: string): string {
		const index = chosen.value.get(id);
		return index === undefined ? t('exam.noAnswer') : (questionById.get(id)?.options[index] ?? t('exam.noAnswer'));
	}

	onBeforeUnmount(stopTicker);
</script>
