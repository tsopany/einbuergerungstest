<template>
	<div class="page">
		<AppHeader />
		<main class="main wide">
			<h1>{{ t('home.title') }}</h1>
			<p v-if="failed" class="err" role="alert">
				{{ t('home.loadFailed') }}
				<button class="link retry" type="button" @click="load">{{ t('retry') }}</button>
			</p>
			<p v-else-if="!progress.loaded" class="muted loading">{{ t('loading') }}</p>
			<template v-else>
				<p class="phase mono">{{ summary.phase === 'coverage' ? t('home.phaseCoverage', {seen: summary.seen, total}) : t('home.phaseWeighted') }}</p>
				<div class="row actions">
					<router-link class="primary practice" to="/p/frage">{{ t('home.practice') }}</router-link>
					<router-link class="ghost easy" :to="{path: '/p/frage', query: {mode: 'easy'}}">{{ t('home.practiceEasy') }}</router-link>
					<router-link class="ghost weak" :to="{path: '/p/frage', query: {mode: 'weak'}}">{{ t('home.practiceWeak') }}</router-link>
					<router-link class="ghost exam" to="/p/pruefung">{{ t('home.exam') }}</router-link>
				</div>
				<section class="counts">
					<div class="stats">
						<div class="stat">
							<span class="muted">{{ t('home.mastered') }}</span
							><strong class="mastered">{{ summary.mastered }}</strong>
						</div>
						<div class="stat">
							<span class="muted">{{ t('home.inProgress') }}</span
							><strong class="in-progress">{{ summary.inProgress }}</strong>
						</div>
						<div class="stat">
							<span class="muted">{{ t('home.unseen') }}</span
							><strong class="unseen">{{ summary.unseen }}</strong>
						</div>
					</div>
					<p class="muted hint">{{ t('home.masteredHint') }}</p>
					<div class="bar" aria-hidden="true">
						<span class="mastered" :style="{width: share(summary.mastered)}"></span>
						<span class="progress" :style="{width: share(summary.inProgress)}"></span>
					</div>
				</section>
				<section>
					<h2>{{ t('home.accuracy') }}</h2>
					<div class="stats">
						<div class="stat">
							<span class="muted">{{ t('home.overall') }}</span
							><strong class="overall">{{ percent(rates.overall.rate) }}</strong>
						</div>
						<div class="stat">
							<span class="muted">{{ t('home.lastWeek') }}</span
							><strong class="last-week">{{ percent(rates.lastWeek.rate) }}</strong>
						</div>
					</div>
				</section>
				<section>
					<h2>{{ t('home.readiness') }}</h2>
					<p class="readiness">
						<strong>{{ t('home.readinessText', {percent: Math.round(readiness.probability * 100)}) }}</strong>
					</p>
					<p class="muted expected">{{ t('home.expected', {score: readiness.expectedScore.toFixed(1)}) }}</p>
				</section>
				<section>
					<h2>{{ t('home.weakest') }}</h2>
					<p v-if="!progress.weakestIds.length" class="muted none">{{ t('home.noWeakest') }}</p>
					<ul v-else class="list weakest">
						<li v-for="id in progress.weakestIds" :key="id">
							<router-link class="link" :to="`/p/frage/${id}`">{{ id }} · {{ preview(id) }}</router-link>
							<span class="mono muted">{{ boxOf(id) }}/4</span>
						</li>
					</ul>
				</section>
				<section>
					<h2>{{ t('home.history') }}</h2>
					<p v-if="!progress.exams.length" class="muted no-history">{{ t('home.noHistory') }}</p>
					<ul v-else class="list history">
						<li v-for="exam in progress.exams" :key="exam.id">
							<span>{{ new Date(exam.finishedAt).toLocaleString('de-DE') }}</span>
							<span class="mono">{{ exam.score }}/33 · {{ exam.passed ? t('home.passed') : t('home.failed') }}</span>
						</li>
					</ul>
				</section>
			</template>
		</main>
	</div>
</template>

<script setup lang="ts">
	import {computed, onMounted, ref} from 'vue';
	import {useI18n} from 'vue-i18n';

	import AppHeader from '@/components/AppHeader.vue';
	import {questionById} from '@/lib/questions';
	import {useProgressStore} from '@/stores/progress';
	import {QUESTION_COUNT as total} from '#shared/ids';

	const {t} = useI18n();
	const progress = useProgressStore();
	const failed = ref(false);

	const summary = computed(() => progress.summary);
	const rates = computed(() => progress.rates());
	const readiness = computed(() => progress.readinessNow());

	const share = (count: number): string => `${(count / total) * 100}%`;
	const percent = (rate: number | null): string => (rate === null ? t('home.none') : `${Math.round(rate * 100)} %`);
	const boxOf = (id: string): number => progress.states.get(id)?.box ?? 0;
	const preview = (id: string): string => {
		const text = questionById.get(id)?.text ?? '';
		return text.length > 70 ? `${text.slice(0, 70)} …` : text;
	};

	async function load(): Promise<void> {
		failed.value = false;
		try {
			await progress.load();
		} catch {
			failed.value = true;
		}
	}

	onMounted(load);
</script>
