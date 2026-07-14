# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Premium visual polish pass

- Reduced the cheap/glossy feel without adding useful product behavior.
- Reworked [src/constants/theme.ts](src/constants/theme.ts) toward quieter neutral surfaces, restrained accent color, smaller radii, softer borders, and less theatrical shadowing.
- Toned down glass effects in [src/app/(tabs)/index.tsx](src/app/(tabs)/index.tsx), [src/app/(tabs)/bodyweight.tsx](src/app/(tabs)/bodyweight.tsx), [src/components/WeightStatsCard.tsx](src/components/WeightStatsCard.tsx), [src/app/(tabs)/_layout.tsx](src/app/(tabs)/_layout.tsx), and [src/app/settings.tsx](src/app/settings.tsx) by using lower blur intensity and fewer decorative overlays.
- Restyled [src/components/app-tabs.tsx](src/components/app-tabs.tsx) with a quieter blurred tab bar, subtler indicator color, and calmer label weights.
- Tightened typography in [src/components/themed-text.tsx](src/components/themed-text.tsx) so headers and labels feel more controlled.
- This pass intentionally changed presentation only: palette, type scale, surface depth, blur intensity, brand panel styling, tabs, toast shape, and card shadows.

## Samsung One UI visual pass

- Applied a Samsung One UI inspired design language without adding useful product behavior.
- Updated shared visual tokens in [src/constants/theme.ts](src/constants/theme.ts) with soft system grays, Samsung-style blue accents, lighter dividers, and large rounded radii.
- Adjusted shared layout radii in [src/constants/layout.ts](src/constants/layout.ts) and typography in [src/components/themed-text.tsx](src/components/themed-text.tsx) for calmer, larger One UI style hierarchy.
- Restyled current visible surfaces in [src/app/(tabs)/index.tsx](src/app/(tabs)/index.tsx), [src/app/(tabs)/bodyweight.tsx](src/app/(tabs)/bodyweight.tsx), [src/components/WeightStatsCard.tsx](src/components/WeightStatsCard.tsx), [src/components/app-tabs.tsx](src/components/app-tabs.tsx), [src/app/(tabs)/_layout.tsx](src/app/(tabs)/_layout.tsx), and [src/app/settings.tsx](src/app/settings.tsx).
- This pass intentionally changed presentation only: colors, spacing, rounded cards, tab tinting, toast shape, and typographic emphasis.

## Fonts applied

- Registered Inter fonts from `assets/fonts/static` using `expo-font` in [src/app/_layout.tsx](src/app/_layout.tsx#L1-L100).
- Updated the app font constants in [src/constants/theme.ts](src/constants/theme.ts#L1-L40) to use the `Inter` family for the primary sans font.
- Added `@font-face` rules to [src/global.css](src/global.css#L1-L40) so web builds use the same Inter fonts.

These changes load Inter across native platforms (via `useFonts`) and the web (via CSS). If you want additional weights or italics available by name on web/native, we can register more family keys or adjust the CSS mappings.

## Image DB (SQLite + FileSystem)

Este documento descreve como usar o repositório de imagens locais implementado em `src/database/imageRepository.ts`.

## Dependências
Instale as bibliotecas necessárias no projeto Expo:

```bash
npm install expo-image-picker expo-file-system expo-sqlite
# ou
yarn add expo-image-picker expo-file-system expo-sqlite
```

## Inicialização do DB
A tabela `images` já é criada por `initDB()` em `src/database/database.ts`:

- campos: `id`, `uri`, `filename`, `created_at`, `width`, `height`.

Verifique que `initDB()` é chamado na inicialização do app (por exemplo em `src/app/_layout.tsx`).

## APIs principais

- `ImageRepository.create(uri, filename?, width?, height?)` — insere metadados da imagem no DB.
- `ImageRepository.findAll()` — retorna todas as imagens ordenadas por `created_at`.
- `ImageRepository.findById(id)` — retorna um registro específico.
- `ImageRepository.remove(id)` — remove o registro e tenta apagar o ficheiro do disco.

Exemplo de uso (picker + salvar) — versão compatível:

```ts
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { ImageRepository } from '@/database/repositories/imageRepository';

async function pickAndSaveImage() {
	const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (permission.status !== 'granted') return null;

	const res: any = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
	if (res.cancelled === true || res.canceled === true) return null;

	const asset = res.assets?.[0] ?? null;
	const uri = res.uri ?? asset?.uri;
	if (!uri) return null;

	const filename = uri.split('/').pop() ?? asset?.fileName ?? `img_${Date.now()}.jpg`;
	const width = res.width ?? asset?.width ?? null;
	const height = res.height ?? asset?.height ?? null;

	// copy only on native; on web use original URI
	if (Platform.OS !== 'web') {
		const dest = FileSystem.documentDirectory + filename;
		try {
			await FileSystem.copyAsync({ from: uri, to: dest });
			await ImageRepository.create(dest, filename, width, height);
			return { uri: dest, filename, width, height };
		} catch (e) {
			// fallback to original uri
		}
	}

	await ImageRepository.create(uri, filename, width, height);
	return { uri, filename, width, height };
}
```

## Exibir imagens
Use o `uri` retornado para renderizar com `<Image source={{ uri: item.uri }} />` em uma `FlatList`.

## Remoção e limpeza
Ao remover um registro via `ImageRepository.remove(id)` o ficheiro é apagado (se possível).
Implemente rotinas para limpar ficheiros órfãos caso seja necessário (ex.: verificar arquivos no `documentDirectory` sem registros no DB).

## Observações e boas práticas
- Não salve imagens em base64 no SQLite; armazene apenas o `uri` e metadados.
- Peça permissões antes de usar o `ImagePicker` (`ImagePicker.requestMediaLibraryPermissionsAsync()`).
- No Web o `FileSystem`/`SQLite` têm limitações — considere fallback para upload remoto ou IndexedDB.
- Para persistência entre reinstalações, sincronize com servidor ou exporte o diretório de documentos.

## Próximos passos sugeridos
- Criar uma tela `ImagesGallery` que usa `ImageRepository.findAll()` e mostra miniaturas.
- Adicionar opção de compartilhar/exportar imagens.

## Bodyweight goals and weekly trend

- Added user bodyweight intent in [src/app/settings.tsx](src/app/settings.tsx): lose, maintain, or gain weight.
- Added editable weekly bodyweight target presets and input in Settings, supporting goals such as `0.5 kg/week` or `1 kg/week`.
- Added read-only `Bodyweight goal` and `Bodyweight trending` metrics to the Bodyweight screen.
- Persisted these settings in SQLite with the `bodyweight_settings` table created by `initDB()` in [src/database/database.ts](src/database/database.ts).
- Extended [src/database/repositories/bodyweightRepository.ts](src/database/repositories/bodyweightRepository.ts) with `getSettings()` and `upsertSettings(goal, weeklyTarget)`.
- Extended [src/hooks/use-bodyweight.ts](src/hooks/use-bodyweight.ts) to expose `settings`, `bodyweightGoal`, `bodyweightTrend`, `trendStatus`, `updateSettings()`, and `getBodyweightTrendStatus()`.
- Added success/danger theme tokens in [src/constants/theme.ts](src/constants/theme.ts) so bodyweight cards can show green/red status consistently.
- Bodyweight status is green when the current weekly trend is within tolerance of the selected goal and red when it is off pace; missing comparison data is neutral.
- [src/hooks/use-bodyweight.ts](src/hooks/use-bodyweight.ts) refreshes on route focus so Bodyweight reflects Settings changes after navigation.
- Verified with `npx tsc --noEmit`.

## Training and workout logging module

The offline training module follows the project's original flat architecture. Screen implementations live directly under [src/app](src/app), reusable UI lives under [src/components](src/components), hooks live under [src/hooks](src/hooks), persistence lives under [src/database/repositories](src/database/repositories), and domain services/types/utilities live under [src/utils](src/utils). SQLite is the persisted source of truth; screens must use the typed repositories and services rather than issuing SQL directly.

User prompts and confirmations use the app-themed [src/components/AppDialog.tsx](src/components/AppDialog.tsx) provider instead of React Native `Alert`. Keep action hierarchy explicit with primary, secondary, destructive, and ghost buttons; the dialog must remain responsive, accessible, safe-area aware, and compatible with light and dark themes.

### Routes

- [src/app/(tabs)/index.tsx](src/app/(tabs)/index.tsx) — Training home, start actions, and today’s workout when it has logged sets; otherwise it displays “No training logged today”.
- [src/app/training/exercises.tsx](src/app/training/exercises.tsx) — exercise library, category dropdown with a `+` action for custom categories, editing, and archiving.
- [src/app/training/templates.tsx](src/app/training/templates.tsx) — template list and workout starts.
- [src/app/training/template/[id].tsx](src/app/training/template/[id].tsx) — template editor.
- [src/app/training/today/[id].tsx](src/app/training/today/[id].tsx) — today’s workout editor focused on one exercise at a time. A rightward swipe from the left edge, the list icon, or the exercise selector opens the exercise drawer; selecting an exercise shows its sets and hold-and-drag reorders the drawer list.
- [src/app/training/history.tsx](src/app/training/history.tsx) — searchable history containing completed workouts only.
- [src/app/training/workout/[id].tsx](src/app/training/workout/[id].tsx) — workout detail, totals, duplication, template saving, and deletion.

Screen implementations must remain in `src/app/`, colocated with their Expo Router routes. Do not create a `src/features` architecture. Continue using the existing `app`, `components`, `hooks`, `database/repositories`, and `utils` directories.

### Database initialization

- There are no separate database migration files. [src/database/database.ts](src/database/database.ts) owns idempotent schema initialization, enables WAL and foreign keys, and exposes the shared database instance.
- Tables and indexes are created with `IF NOT EXISTS`. The initializer detects and repairs legacy `exercises` tables that lack current columns or use non-text IDs while preserving existing rows.
- The initializer creates `bodyweight`, `bodyweight_settings`, `exercises`, `workout_templates`, `workout_template_exercises`, `workout_sessions`, `workout_session_exercises`, and `workout_sets`.
- Foreign-key cascades, exercise snapshots, validation checks, lookup/order indexes, and the partial unique index that protects the single editable daily workout remain part of the schema.
- The only records inserted automatically are the nine predefined resistance exercises. They use stable IDs and case-insensitive name checks, so user-created exercises are not duplicated.
- Training is resistance-only. During initialization, exercises and workout/template snapshots from the removed non-resistance mode are deleted together with their dependent sets and local set videos.
- Foreign-key repair creates a completed “Recovered workout” only when the orphaned session contains at least one valid logged set. Empty orphaned session structures and their local videos are deleted instead of appearing in history.
- Do not create or alter database tables from screens.
- [src/app/_layout.tsx](src/app/_layout.tsx) waits for successful database initialization and exposes a retry state without deleting existing data if initialization fails.

### Domain and repository structure

- Domain types: [src/utils/training-types.ts](src/utils/training-types.ts).
- Reusable training UI: [src/components/AppDialog.tsx](src/components/AppDialog.tsx), [src/components/ExercisePicker.tsx](src/components/ExercisePicker.tsx), [src/components/WorkoutExerciseDrawer.tsx](src/components/WorkoutExerciseDrawer.tsx), [src/components/CategoryDropdown.tsx](src/components/CategoryDropdown.tsx), [src/components/TrainingPrimitives.tsx](src/components/TrainingPrimitives.tsx), and [src/components/WorkoutSetRow.tsx](src/components/WorkoutSetRow.tsx).
- Training hooks: [src/hooks/use-training-home.ts](src/hooks/use-training-home.ts) and [src/hooks/use-today-workout.ts](src/hooks/use-today-workout.ts).
- Row-to-domain conversion: [src/database/repositories/trainingMappers.ts](src/database/repositories/trainingMappers.ts).
- Exercise persistence: [src/database/repositories/exerciseRepository.ts](src/database/repositories/exerciseRepository.ts).
- Template persistence: [src/database/repositories/workoutTemplateRepository.ts](src/database/repositories/workoutTemplateRepository.ts).
- Session persistence and transactions: [src/database/repositories/workoutSessionRepository.ts](src/database/repositories/workoutSessionRepository.ts).
- Set persistence: [src/database/repositories/workoutSetRepository.ts](src/database/repositories/workoutSetRepository.ts).
- Workout lifecycle orchestration: [src/utils/workout-lifecycle.ts](src/utils/workout-lifecycle.ts) and [src/utils/workout-service.ts](src/utils/workout-service.ts).

Workout creation from templates copies exercise names, categories, types, notes, positions, and sets into session snapshots. Before starting, prompt users to either start with empty values or copy weight, repetitions, and RIR from the latest completed session for that same template. Match copied values by exercise ID and set position; never copy set comments or videos. Later library/template edits must not mutate historical sessions.

### Set input and calculations

- Resistance sets store decimal weight, non-negative integer repetitions, optional RIR, completion state, and an optional video URI.
- RIR is stored as `null | 0 | 1 | 2`; the UI displays `?`, `0`, `1`, and `2+`.
- The training module supports resistance exercises only. Do not add exercise-type selectors, distance/time fields, distance units, or non-resistance summaries back to its screens, domain types, repositories, or services.
- A workout belongs to the user’s local calendar day determined from `started_at`. It stays editable for that whole day regardless of its start or last-edit time; do not expose active/finish actions, start/end times, a live timer, or workout duration.
- On the first daily access after midnight, the repository closes the previous day automatically: workouts with valid logged sets enter completed history, while empty structures are marked abandoned and remain outside normal history. A legacy completed workout from the current day is reopened internally so it remains editable until the day changes.
- SQLite’s `active` status is an internal compatibility/editability lock only and must not be presented as a user-facing workout state. There is at most one workout per local day.
- A workout with no logged sets is considered empty, including template workouts that contain only blank sets. Do not show it in the “Today’s workout” section; starting another workout may offer to discard the empty daily record first. Use the shared `isWorkoutEmpty()` rule from [src/utils/training-validation.ts](src/utils/training-validation.ts).
- Sets have no manual completed toggle. Completion is inferred and persisted automatically when both weight and repetitions are present. Clearing either logged field makes the set incomplete again.
- Decimal weight input accepts comma or period.
- Logged-set inference and validation live in [src/utils/training-validation.ts](src/utils/training-validation.ts).
- Summary, best-performance, and Epley estimated-1RM calculations live in [src/utils/training-calculations.ts](src/utils/training-calculations.ts).
- Only valid logged sets contribute to calculations. Blank or partially entered sets remain stored with the workout.
- Do not calculate or display aggregate volume load or total repetitions. Weight and repetitions remain visible only on their individual resistance sets.

### Local set videos

- [src/utils/video-service.ts](src/utils/video-service.ts) handles library selection, system-camera recording, persistent copies, existence checks, and deletion.
- Videos are copied to the application document directory under `workout-videos`; SQLite stores only the local URI.
- Playback uses a single modal `expo-video` player. Do not mount full video players for every set row.
- Explicit removal, set deletion, exercise removal, and workout deletion clean up their unique local video files.
- Permission messages are configured through the `expo-image-picker` plugin in [app.json](app.json).

### Dependencies and Expo compatibility

- The current project uses Expo SDK 57 packages even though the repository instruction requires reading the exact SDK 56 documentation before implementation.
- New native packages were installed using `npx expo install`: `expo-file-system` and `expo-video`.
- Continue using `npx expo install` for Expo native packages; do not hand-select arbitrary versions or upgrade the Expo SDK as part of unrelated work.

### Tests and verification

- Vitest configuration: [vitest.config.ts](vitest.config.ts).
- ESLint configuration: [eslint.config.js](eslint.config.js).
- Tests cover RIR mapping, decimal parsing, summary/e1RM calculations, logged-set validation, local-day boundaries and rollover, empty/template starts, snapshot behavior, one-workout-per-day enforcement, daily retrieval, reorder, and set deletion position handling.
- Current verification result: 12 test files and 32 tests passing.

Run before completing future changes:

```bash
npm run lint
npx tsc --noEmit
npm test
```

For route or native-module changes, also verify Metro bundling when practical:

```bash
npx expo export --platform android --output-dir /tmp/liftbook-export
```

### Current limitations

- Camera permissions, system-camera video recording, playback, and persistent file cleanup still require final validation on physical Android and iOS devices.
- Recording intentionally uses the system camera via `expo-image-picker`; there is no custom embedded camera UI.
- Do not add mock bodyweight, workouts, templates, or workout history. The predefined exercise library is the only automatic seed data.
