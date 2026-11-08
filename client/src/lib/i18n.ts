import {createI18n} from 'vue-i18n';

const de = {
	app: {name: 'Einbürgerungstest', requestFailed: 'Anfrage fehlgeschlagen', demo: 'Demo: nichts wird gespeichert'},
	nav: {label: 'Navigation', legal: 'Rechtliches', settings: 'Einstellungen', signIn: 'Anmelden', signOut: 'Abmelden', theme: 'Design wechseln'},
	loading: 'Lädt …',
	retry: 'Erneut versuchen',
	home: {
		title: 'Übersicht',
		loadFailed: 'Dein Fortschritt konnte nicht geladen werden.',
		phaseCoverage: 'Phase 1: {seen}/{total} Fragen gesehen',
		phaseWeighted: 'Phase 2: gezieltes Üben',
		mastered: 'Gemeistert',
		inProgress: 'Unsicher',
		masteredHint: 'Gemeistert = 4× richtig in Folge. Eine falsche Antwort setzt die Frage zurück.',
		unseen: 'Ungesehen',
		accuracy: 'Trefferquote',
		overall: 'Gesamt',
		lastWeek: 'Letzte 7 Tage',
		none: '–',
		readiness: 'Prüfungsreife',
		readinessText: 'Bestehenswahrscheinlichkeit ~{percent} %',
		expected: 'Erwartet: {score} von 33 Punkten (bestanden ab 17)',
		weakest: 'Meine häufigsten Fehler',
		noWeakest: 'Noch keine Antworten.',
		practice: 'Üben',
		practiceEasy: 'Leicht üben',
		practiceWeak: 'Meine Fehler üben',
		exam: 'Probeprüfung',
		history: 'Bisherige Probeprüfungen',
		duration: 'Dauer {time} Min.',
		report: 'Auswertung',
		noHistory: 'Noch keine Probeprüfung.',
		passed: 'bestanden',
		failed: 'nicht bestanden'
	},
	question: {
		header: 'Frage {label} · gesehen {seen}/{total}',
		right: 'Richtig!',
		wrong: 'Leider falsch',
		next: 'Nächste Frage',
		overview: 'Zur Übersicht',
		picture: 'Bild {n}',
		saveFailed: 'Die Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.'
	},
	exam: {
		title: 'Probeprüfung',
		intro: 'Die Prüfung hat 33 Fragen und dauert 60 Minuten. Du brauchst mindestens 17 richtige Antworten. Während der Prüfung siehst du kein Ergebnis, du kannst aber vor und zurück gehen und Antworten ändern. Mit „Gesamte Prüfung abgeben“ beendest du die ganze Prüfung.',
		start: 'Prüfung starten',
		startFailed: 'Die Prüfung konnte nicht gestartet werden.',
		progress: 'Frage {n} von {total}',
		previous: 'Zurück',
		next: 'Antwort abgeben',
		submit: 'Gesamte Prüfung abgeben',
		confirmSubmit: 'Es sind noch {open} Fragen offen. Die gesamte Prüfung trotzdem abgeben?',
		confirmAll: 'Alle Fragen sind beantwortet. Die gesamte Prüfung jetzt abgeben?',
		yes: 'Ja, Prüfung abgeben',
		no: 'Weiter prüfen',
		timeLeft: 'Restzeit',
		timeUp: 'Die Zeit ist abgelaufen. Deine Antworten wurden abgegeben.',
		submitFailed: 'Die Prüfung konnte nicht abgegeben werden. Bitte versuche es erneut.',
		score: '{score} von 33 richtig',
		passed: 'BESTANDEN',
		failed: 'NICHT BESTANDEN',
		wrongTitle: 'Falsch oder offen',
		yourAnswer: 'Deine Antwort',
		correctAnswer: 'Richtig',
		noAnswer: 'keine Antwort',
		overview: 'Zur Übersicht'
	},
	report: {
		title: 'Auswertung',
		failed: 'Diese Auswertung konnte nicht geladen werden.'
	},
	settings: {
		title: 'Einstellungen',
		account: 'Angemeldet als {email}',
		shuffle: 'Antworten mischen',
		shuffleHint: 'Aus: Die Reihenfolge bleibt wie im Fragenkatalog.',
		reset: 'Fortschritt zurücksetzen',
		resetWarning: 'Alle Antworten und Probeprüfungen werden gelöscht. Das lässt sich nicht rückgängig machen.',
		resetConfirm: 'Ja, zurücksetzen',
		resetDone: 'Dein Fortschritt wurde zurückgesetzt.',
		delete: 'Konto löschen',
		deleteWarning: 'Dein Konto und alle gespeicherten Daten werden gelöscht. Das lässt sich nicht rückgängig machen.',
		deleteConfirm: 'Ja, Konto löschen',
		cancel: 'Abbrechen',
		failed: 'Das hat nicht geklappt. Bitte versuche es erneut.'
	},
	login: {
		title: 'Anmelden',
		lead: 'Melde dich mit deinem Google-Konto an. Dein Lernfortschritt wird in deinem Konto gespeichert.',
		google: 'Mit Google anmelden',
		agree: 'Mit der Anmeldung stimmst du der {privacy} zu.',
		failed: 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.',
		unverifiedEmail: 'Dein Google-Konto hat keine bestätigte E-Mail-Adresse.'
	},
	errors: {},
	legal: {
		title: 'Rechtliches',
		privacy: {
			title: 'Datenschutz',
			intro: 'Dieser Trainer speichert deinen Lernfortschritt. Hier steht, was gespeichert wird und wie du es löschen kannst.',
			who: {title: 'Verantwortlich', body: 'Betrieben von Predrag Stojadinovic. Bei Fragen zu deinen Daten schreib an die Adresse unten.'},
			data: {
				title: 'Was gespeichert wird',
				body: 'Deine E-Mail-Adresse und die Kennung deines Google-Kontos, deine Antworten mit Zeitpunkt, deine Probeprüfungen und der Stand deines Lernplans.'
			},
			processors: {
				title: 'Wer die Daten verarbeitet',
				body: 'Hetzner betreibt die Server und die Datenbank in der Europäischen Union. Google bestätigt bei der Anmeldung, wer du bist. Es gibt keine Werbung, keine Analyse und keine Drittanbieter-Skripte.'
			},
			retention: {
				title: 'Wie lange',
				body: 'Deine Daten bleiben, solange dein Konto besteht. Wenn du dein Konto löschst, werden alle Daten über dich gelöscht.'
			},
			rights: {
				title: 'Deine Rechte',
				body: 'Du kannst deinen Fortschritt zurücksetzen und dein Konto löschen. Du kannst außerdem Auskunft, Berichtigung oder Löschung verlangen und dich bei deiner Datenschutzbehörde beschweren.'
			},
			contact: {title: 'Kontakt', body: 'Fragen oder Anfragen zu deinen Daten:'}
		}
	},
	notFound: {title: 'Nicht gefunden', home: 'Zur Übersicht'}
};

export default createI18n({legacy: false, locale: 'de', fallbackLocale: 'de', messages: {de}});
