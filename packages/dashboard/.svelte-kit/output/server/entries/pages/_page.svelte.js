import { a as attr_class, b as stringify, e as escape_html, a6 as derived, a7 as ensure_array_like, c as store_get, u as unsubscribe_stores } from "../../chunks/renderer.js";
import { w as writable, d as derived$1 } from "../../chunks/index.js";
import { z } from "zod";
const jobStore = writable([]);
const STATUS_MAP = {
  completed: { icon: "✅", label: "Completed", cssClass: "status-completed" },
  running: { icon: "🔄", label: "Running", cssClass: "status-running" },
  pending: { icon: "⏳", label: "Pending", cssClass: "status-pending" },
  failed: { icon: "❌", label: "Failed", cssClass: "status-failed" }
};
function statusIndicator(status) {
  return STATUS_MAP[status];
}
function formatAgentName(agentName) {
  return agentName.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()).trim();
}
function StageChip($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { stage } = $$props;
    let indicator = derived(() => statusIndicator(stage.status));
    let elapsed = derived(() => {
      if (stage.status === "running" && stage.startedAt) {
        const seconds = Math.floor((Date.now() - new Date(stage.startedAt).getTime()) / 1e3);
        const minutes = Math.floor(seconds / 60);
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      }
      if ((stage.status === "completed" || stage.status === "failed") && stage.startedAt && stage.completedAt) {
        const seconds = Math.floor((new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime()) / 1e3);
        const minutes = Math.floor(seconds / 60);
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      }
      return null;
    });
    $$renderer2.push(`<div${attr_class(`stage-chip ${stringify(indicator().cssClass)}`, "svelte-1chuj1c")}><span class="icon svelte-1chuj1c">${escape_html(indicator().icon)}</span> <span class="name svelte-1chuj1c">${escape_html(formatAgentName(stage.agentName))}</span> `);
    if (elapsed()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="elapsed svelte-1chuj1c">${escape_html(elapsed())}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function IssueCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { issueNumber, pipeline } = $$props;
    let sortedStages = derived(() => [...pipeline.stages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    $$renderer2.push(`<article class="issue-card svelte-kkstsp"><header class="svelte-kkstsp"><h2 class="svelte-kkstsp">#${escape_html(issueNumber)}</h2> <span class="stage-count svelte-kkstsp">${escape_html(pipeline.stages.length)} stage${escape_html(pipeline.stages.length === 1 ? "" : "s")}</span></header> <div class="stages svelte-kkstsp"><!--[-->`);
    const each_array = ensure_array_like(sortedStages());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let stage = each_array[$$index];
      StageChip($$renderer2, { stage });
    }
    $$renderer2.push(`<!--]--></div></article>`);
  });
}
function aggregatePipelineState(issueNumber, jobs) {
  const latestByAgent = /* @__PURE__ */ new Map();
  for (const job of jobs) {
    const existing = latestByAgent.get(job.agentName);
    if (!existing || job.createdAt > existing.createdAt) {
      latestByAgent.set(job.agentName, job);
    }
  }
  const stages = Array.from(
    latestByAgent.values()
  ).map((job) => ({
    agentName: job.agentName,
    status: job.status,
    jobId: job.id,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  }));
  return { issueNumber, stages };
}
const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number().int(),
  avatar_url: z.string()
});
z.object({
  id: z.number().int(),
  full_name: z.string(),
  clone_url: z.string(),
  default_branch: z.string()
});
const GitHubLabelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string()
});
z.object({
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.array(GitHubLabelSchema),
  user: GitHubUserSchema,
  state: z.enum(["open", "closed"])
});
z.object({
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string().nullable(),
  head: z.object({ ref: z.string(), sha: z.string() }).default({ ref: "", sha: "" }),
  base: z.object({ ref: z.string(), sha: z.string() }).default({ ref: "", sha: "" }),
  user: GitHubUserSchema,
  state: z.enum(["open", "closed"]),
  draft: z.boolean().default(false)
});
const pipelinesByIssue = derived$1(jobStore, ($jobs) => {
  const grouped = /* @__PURE__ */ new Map();
  for (const job of $jobs) {
    const existing = grouped.get(job.targetNumber);
    if (existing) {
      existing.push(job);
    } else {
      grouped.set(job.targetNumber, [job]);
    }
  }
  const pipelines = /* @__PURE__ */ new Map();
  for (const [issueNumber, jobs] of grouped) {
    pipelines.set(issueNumber, aggregatePipelineState(issueNumber, jobs));
  }
  return pipelines;
});
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    $$renderer2.push(`<div class="page">`);
    if (store_get($$store_subs ??= {}, "$pipelinesByIssue", pipelinesByIssue).size === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty-state svelte-1uha8ag"><p class="svelte-1uha8ag">No active pipelines</p> <p class="hint svelte-1uha8ag">Jobs will appear here as issues are processed.</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="pipeline-list svelte-1uha8ag"><!--[-->`);
      const each_array = ensure_array_like([
        ...store_get($$store_subs ??= {}, "$pipelinesByIssue", pipelinesByIssue).entries()
      ]);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let [issueNumber, pipeline] = each_array[$$index];
        IssueCard($$renderer2, { issueNumber, pipeline });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
