<template>
	<div class="page">
		<AppHeader />
		<main class="main wide">
			<h1>{{ t('report.title') }}</h1>
			<p v-if="failed" class="err" role="alert">{{ t('report.failed') }}</p>
			<p v-else-if="!report" class="muted loading">{{ t('loading') }}</p>
			<template v-else>
				<p class="meta mono muted">
					{{ new Date(report.finishedAt).toLocaleString('de-DE') }} · {{ t('home.duration', {time: formatDuration(report.finishedAt - report.startedAt)}) }}
				</p>
				<p class="result" :class="report.passed ? 'passed' : 'failed'">{{ report.passed ? t('exam.passed') : t('exam.failed') }}</p>
				<p class="score">{{ t('exam.score', {score: report.score}) }}</p>
				<ul class="list report-list">
					<li v-for="(item, index) in report.questions" :key="item.questionId" class="report-item" :class="statusOf(item)">
						<div>
							<router-link class="question-link" :to="`/p/frage/${item.questionId}`"
								><strong>{{ index + 1 }}. {{ item.questionId }} · {{ questionById.get(item.questionId)?.text }}</strong></router-link
							>
							<p class="muted given">{{ t('exam.yourAnswer') }}: {{ optionText(item.questionId, item.chosen) }}</p>
							<p v-if="statusOf(item) !== 'right'" class="right-answer">{{ t('exam.correctAnswer') }}: {{ optionText(item.questionId, item.correctIndex) }}</p>
						</div>
						<span class="mono status" aria-hidden="true">{{ {right: '✓', wrong: '✗', open: '–'}[statusOf(item)] }}</span>
					</li>
				</ul>
			</template>
			<router-link class="primary overview" to="/">{{ t('exam.overview') }}</router-link>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {onMounted, ref} from 'vue';
	import {useI18n} from 'vue-i18n';

	import AppHeader from '@/components/AppHeader.vue';
	import {formatDuration} from '@/lib/format';
	import {questionById} from '@/lib/questions';
	import {useAuthStore} from '@/stores/auth';

	interface Item {
		questionId: string;
		chosen: number | null;
		correctIndex: number;
	}

	interface Report {
		id: number;
		startedAt: number;
		finishedAt: number;
		score: number;
		passed: boolean;
		questions: Item[];
	}

	const props = defineProps<{id: string}>();
	const {t} = useI18n();
	const auth = useAuthStore();
	const report = ref<Report | null>(null);
	const failed = ref(false);

	function statusOf(item: Item): 'right' | 'wrong' | 'open' {
		if (item.chosen === null) return 'open';
		return item.chosen === item.correctIndex ? 'right' : 'wrong';
	}
	const optionText = (id: string, index: number | null): string => (index === null ? t('exam.noAnswer') : (questionById.get(id)?.options[index] ?? t('exam.noAnswer')));

	onMounted(async () => {
		try {
			report.value = await auth.request<Report>(`/api/exams/${props.id}`);
		} catch {
			failed.value = true;
		}
	});
</script>
