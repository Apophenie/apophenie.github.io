# Récupérer une conversation t3code locale

Méthode vérifiée sur cette machine le 22 septembre 2026. Elle permet de relire le contexte et les traces disponibles ; elle ne recrée pas une session active ni la mémoire interne du modèle.

## Emplacements et lecture

La base utile est `~/.t3/userdata/state.sqlite`. Une autre base existe dans `~/.t3/dev/state.sqlite`. Le dossier `~/.config/t3code` contient aussi des données Electron, mais la conversation recherchée a été retrouvée dans SQLite.

Ouvrir SQLite avec `mode=ro`. La base en cours d'utilisation possède des fichiers `-wal` et `-shm` : ne pas copier uniquement `state.sqlite` pour fabriquer une sauvegarde. Utiliser l'API SQLite `backup` si une copie cohérente de toute la base est nécessaire. Le script ci-dessous lit directement la base dans une transaction pour obtenir un instantané cohérent, sans la modifier.

| Table | Utilité |
|---|---|
| `projection_projects` | Relier `project_id` au dossier `workspace_root` |
| `projection_threads` | Titre, dates, modèle, branche, worktree, archivage et suppression |
| `projection_thread_messages` | Messages utilisateur et assistant ; tri par `created_at`, puis `rowid` |
| `projection_thread_activities` | Activités et traces d'outils disponibles |
| `projection_turns` | État des tours et références de checkpoints |
| `projection_thread_proposed_plans` | Plans proposés |
| `projection_thread_sessions` | Métadonnées de session côté t3code |
| `provider_session_runtime` | Fournisseur et `resume_cursor_json`, dont l'identifiant Claude `resume` |
| `orchestration_events` | Événements du fil, filtrés par `stream_id`, ordonnés par `sequence` |

Les identifiants t3code et Claude sont différents. Dans les sessions examinées, `provider_session_id` et `provider_thread_id` étaient nuls : utiliser `provider_session_runtime.resume_cursor_json` pour retrouver l'identifiant natif. Une conversation marquée supprimée peut encore avoir des données : la liste ne les masque pas.

## Script réutilisable

Depuis la racine du dépôt, avec Python 3 et sa bibliothèque standard :

```sh
# Lister les conversations du projet, y compris archivées ou supprimées.
python3 scripts/export-t3-session.py --project numherololgeek

# Omettre --project pour lister tous les projets.
python3 scripts/export-t3-session.py

# Exporter un fil précis dans un NOUVEAU dossier.
python3 scripts/export-t3-session.py \
  --thread 24f737b5-74ff-4373-b6cb-15918e3baf53 \
  --output .claude/session-recovery/nouvel-export

# Pour une autre installation, ajouter :
# --db /chemin/vers/state.sqlite
```

Le dossier produit contient `conversation.md` pour la lecture et `session.json` pour les messages, activités, tours, plans, métadonnées et événements. Un dossier existant est refusé afin de préserver les exports précédents. Les exports effectués ici sont dans `.claude/session-recovery/`, déjà ignoré par Git via `.claude/` ; seuls la méthode et le script sont destinés au suivi Git.

Les textes des exports sont des archives brutes, conservées tels qu'enregistrés. Les pièces jointes sont représentées par leurs métadonnées, sans copie des fichiers binaires. Les projections ne garantissent pas de contenir toutes les sorties d'outils, les raisonnements ou les échanges des sous-agents. Le script dépend du schéma observé : en cas de changement, examiner `sqlite_master` et `PRAGMA table_info(...)` avant de l'adapter.

## Compléter avec les journaux natifs

Pour la session Claude récente, le champ `resume` vaut `4427b535-88ac-4091-a3d5-8483d69dcdf6`. Son journal existe dans :

```text
~/.wclaude/projects/-home-1000i100-gitWorkspace-numherololgeek/4427b535-88ac-4091-a3d5-8483d69dcdf6.jsonl
```

Le journal de la session historique existe dans :

```text
~/.claude/projects/-home-1000i100-gitWorkspace-numherololgeek/afd9a4d9-8834-448d-99f2-4d4819095de2.jsonl
```

Ne pas supposer que tous les journaux sont sous `~/.claude` : chercher aussi dans les autres profils locaux, ici `~/.wclaude`. Exemple :

```sh
rg --files --hidden ~/.claude ~/.wclaude -g '*4427b535-88ac-4091-a3d5-8483d69dcdf6*'
```

Des traces complémentaires existent dans `~/.t3/userdata/logs/provider/events.<thread_id>.log`, avec rotations éventuelles. Ces fichiers et les exports peuvent contenir des informations privées ; ne pas les publier automatiquement.

## Contexte retrouvé pour numherololgeek

- Fil récent : `24f737b5-74ff-4373-b6cb-15918e3baf53`, titre commençant par « ── 1. [gauche 4ᵉ] Didier Raoult ». Export : 13 messages, 1 161 activités, 4 204 événements.
- Historique précédent : `47e717d2-97a4-4e32-a2d4-2596fe112512`, titre commençant par « regarde le readme et au travail ». Export : 3 375 messages, 64 214 activités, 127 251 événements.
- Le dernier grand message utilisateur traite dix arbitrages. Il est repris dans le fil récent avec une demande de commit préalable et de chantiers indépendants en worktrees.
- Les derniers messages de la session récente signalent la limite hebdomadaire de Claude, après un compte rendu partiel sur les césars justifiés.

Les demandes à conserver pour une reprise sont : remplacer les redites par les modes « Pas à pas » et « Simultané » ; décaler les opérations indépendantes de 0,1 s ; prévoir des afficheurs par caractère sans chevauchement ; revoir `mrn` en largeur d'abord et par paires ; corriger les accolades ; garder les 6 à leur place dans le tri de `mrtE` ; rétablir les cornes sur tous les 666 en scénique et supprimer entièrement ces étapes en sobre ; revoir le barème des pertes et conserver la voie préférée du domaine ; justifier les décalages de César à partir de la saisie sans consommer les caractères.

Attention au cas 10 : le message d'origine dit deux fois « celle de gauche » avec des appréciations contradictoires. Ne pas inventer une correction de sens lors de la reprise.

Claude annonçait la pile précédente fusionnée dans `main` à `c616f4f`, le correctif des accolades prêt à `fff78af` avec tests rapides verts, et un problème de déduplication entre les césars `fj22` et `fr22`. Ce sont ses comptes rendus, pas une validation indépendante du code.

La lecture de Git confirme `main` à `c616f4f` et les six branches suivantes au moment de la récupération :

| Branche | Commit observé |
|---|---|
| `rythme-pas-a-pas-ou-simultane` | `ffa0154` |
| `accolades-sans-chevauchement` | `fff78af` |
| `cornes-a-tous-les-666` | `7ce7a34` |
| `tri-qui-respecte-lordre` | `718d0dd` |
| `cesar-trouve-son-decalage` | `19aadf3` |
| `bareme-de-la-perte` | `4145628` |

Pour reprendre le développement, relire la conversation récente, puis examiner `git worktree list`, les modifications non commitées dans chaque worktree et les différences avec `main`. Les branches ont pu progresser après le dernier compte rendu de Claude. Aucun chantier applicatif n'a été repris ou fusionné pendant cette récupération.
