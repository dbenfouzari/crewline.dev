# Crewline.dev - Initial Specification

## Vision

Crewline est un orchestrateur d'agents IA self-hosted et open source, webhook-driven, avec interface web.
Il permet d'automatiser un workflow de développement complet (dev, review, validation) en utilisant Claude Code CLI et l'abonnement Max de l'utilisateur, sans clé API ni frais supplémentaires.

## Problème résolu

Les outils existants (Devin, Sweep, Claude Code GitHub Actions) sont soit payants, soit nécessitent une clé API Anthropic. Crewline permet d'utiliser son abonnement Claude Max existant pour orchestrer des agents IA de développement, le tout self-hosted et gratuit.

## Architecture

```
GitHub Webhook (instant, gratuit)
        |
        v
  Serveur Bun/Hono (self-hosted)
        |
        |-- Issue créée/labellée --> lance `claude` en agent Dev
        |-- PR ouverte           --> lance `claude` en agent Tech Lead (review)
        |-- PR commentée         --> relance l'agent Dev
        |
        v
  Claude Code CLI (abonnement Max de l'utilisateur)
```

### Principes

- **Event-driven** : webhooks GitHub, pas de polling
- **Self-hosted** : tourne sur l'infra de l'utilisateur (Coolify, Docker, VPS...)
- **Budget 0 EUR** : utilise l'abonnement Claude Max, pas de clé API
- **Open source** : projet communautaire
- **Configurable** : chaque utilisateur définit ses agents, triggers et prompts

## Workflow par défaut

```
Utilisateur/PO --> Backlog --> [Agent Dev détecte] --> In Progress --> code + PR --> Review Dev
  --> [Agent Tech Lead détecte] --> review PR --> Review PO (ou retour In Progress)
  --> [Utilisateur valide] --> Done
```

### Agents

| Agent     | Trigger                          | Action                                              |
|-----------|----------------------------------|-----------------------------------------------------|
| Dev       | Issue labellée "ready"           | Lit l'issue, code, pousse une branche, ouvre une PR |
| Tech Lead | PR ouverte                       | Review la PR, approuve ou demande des changements   |
| PO        | Manuel ou configurable           | Crée les issues, priorise, met en Backlog           |

### Colonnes du kanban

Backlog -> In Progress -> Review Dev -> Review PO -> Done

## Stack technique

| Composant       | Techno                                              |
|-----------------|-----------------------------------------------------|
| Runtime         | Bun                                                 |
| Monorepo        | Bun workspaces                                      |
| Serveur API     | Hono                                                |
| Base de données | SQLite (léger, self-hosted friendly)                |
| Frontend        | React + Vite (dashboard)                            |
| Queue           | Simple queue SQLite pour v1, BullMQ + Redis ensuite |
| Déploiement     | Docker + docker-compose                             |
| Tests           | bun:test, objectif 100% coverage                    |

## Structure monorepo

```
crewline.dev/
  packages/
    server/        # API Hono + webhook handler
    worker/        # Exécute les agents Claude CLI
    dashboard/     # React UI de monitoring
    config/        # Schéma de configuration
    shared/        # Types partagés
  docker-compose.yml
  crewline.config.ts   # Exemple de config utilisateur
```

## Configuration utilisateur

```typescript
// crewline.config.ts
export default defineConfig({
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    repos: ["user/my-app"],
  },
  agents: {
    dev: {
      trigger: { event: "issues.labeled", label: "ready" },
      prompt: "Tu es un développeur senior...",
      onComplete: { moveTo: "Review Dev" },
    },
    techLead: {
      trigger: { event: "pull_request.opened" },
      prompt: "Tu es un tech lead exigeant...",
      onSuccess: { moveTo: "Review PO" },
      onFailure: { moveTo: "In Progress", comment: true },
    },
  },
  board: {
    columns: ["Backlog", "In Progress", "Review Dev", "Review PO", "Done"],
  },
})
```

## Dashboard web

- Vue kanban temps réel des issues/PRs
- Logs live de chaque agent en cours d'exécution
- Historique des runs (succès/échec/durée/coût estimé)
- Configuration des agents via UI
- Statut du serveur + queue

## Contraintes

- Self-hosted uniquement (pas de SaaS)
- Open source
- Budget 0 EUR : pas de services payants
- Pas de Next.js (React + Vite)
- Bun comme runtime, bun:test pour les tests
- 100% de couverture de tests

## Points à approfondir

- Authentification du dashboard (comment sécuriser l'accès ?)
- Gestion de la concurrence (combien d'agents en parallèle ?)
- Support d'autres providers que GitHub (GitLab, Bitbucket ?)
- Support d'autres LLM CLI que Claude (Codex, etc.)
- Persistance des logs et métriques
- Notifications (Slack, Discord, email ?)
- Gestion des erreurs et retries des agents
- Stratégie de branchement Git (convention de nommage des branches)
