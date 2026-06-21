# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

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

## Recent Changes
- **Added**: [src/database/imageRepository.ts](src/database/imageRepository.ts) — repository for image metadata (create/findAll/findById/remove). Files are stored under `FileSystem.documentDirectory` and `uri` is saved in SQLite.
- **Updated**: [src/app/bodyweight.tsx](src/app/bodyweight.tsx) — added image picker button, copies chosen image to app storage and records metadata via `ImageRepository.create()`; handles both old/new `expo-image-picker` result shapes and requests permissions.
- **Removed**: [src/database/IMAGE_DB.md](src/database/IMAGE_DB.md) — documentation content was moved into this file.

If you want, I can add a small `ImagesGallery` screen and a menu action to view/delete saved images.

