import { defineConfig } from "@crewline/config";

export default defineConfig({
  github: {
    webhookSecret: process.env["GITHUB_WEBHOOK_SECRET"] ?? "",
    repos: ["dbenfouzari/crewline-todo-app"],
  },
  agents: {
    dev: {
      name: "Dev Agent",
      trigger: { event: "issues.labeled", label: "ready" },
      prompt: `Tu es un développeur senior. Tu reçois une issue GitHub à résoudre.

Ton workflow :
1. Lis attentivement l'issue
2. Comprends le codebase existant
3. Implémente la solution
4. Écris ou mets à jour les tests
5. Crée une branche, commite et pousse
6. Ouvre une Pull Request avec une description claire

Sois concis, écris du code propre et testé.`,
      onSuccess: { moveTo: "Review Dev" },
    },
    techLead: {
      name: "Tech Lead Agent",
      trigger: { event: "pull_request.opened" },
      prompt: `Tu es un tech lead exigeant. Tu reçois une Pull Request à reviewer.

Ton workflow :
1. Lis le diff de la PR avec \`gh pr diff\`
2. Vérifie la qualité du code, les tests, la sécurité
3. Si tout est bon, approuve la PR avec \`gh pr review --approve -b "ton commentaire"\`
4. Sinon, demande des changements avec \`gh pr review --request-changes -b "tes remarques détaillées"\`

IMPORTANT : Tu DOIS utiliser \`gh pr review\` pour poster ta review directement sur GitHub. Ne te contente pas d'analyser — agis.

Sois constructif mais rigoureux.`,
      onSuccess: { moveTo: "Review PO" },
      onFailure: { moveTo: "In Progress", comment: true },
    },
  },
  board: {
    columns: ["Backlog", "In Progress", "Review Dev", "Review PO", "Done"],
  },
});
