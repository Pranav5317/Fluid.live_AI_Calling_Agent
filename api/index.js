// server/index.ts
import express from "express";
import cors from "cors";

// server/routes/leadRoutes.ts
import { Router } from "express";

// server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = globalThis.globalPrisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  globalThis.globalPrisma = prisma;
}
var prisma_default = prisma;

// server/repositories/leadRepository.ts
var LeadRepository = class {
  async getAllLeadsRaw() {
    const list = await prisma_default.lead.findMany({
      orderBy: { createdAt: "desc" }
    });
    return list.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email || void 0,
      metadata: l.metadata || {},
      createdAt: l.createdAt.toISOString()
    }));
  }
  async getLeads(options) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const search = options.search?.trim().toLowerCase();
    const campaignId = options.campaignId;
    const status = options.status;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    if (campaignId && campaignId !== "all") {
      where.campaignLeads = {
        some: {
          campaignId,
          ...status && status !== "all" ? { status } : {}
        }
      };
    } else if (status && status !== "all") {
      if (status === "untouched") {
        where.OR = [
          { campaignLeads: { none: {} } },
          { campaignLeads: { some: { status: "untouched" } } }
        ];
      } else {
        where.campaignLeads = { some: { status } };
      }
    }
    const [total, rawItems] = await Promise.all([
      prisma_default.lead.count({ where }),
      prisma_default.lead.findMany({
        where,
        include: { campaignLeads: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    const untouchedTotal = await prisma_default.lead.count({
      where: {
        OR: [
          { campaignLeads: { none: {} } },
          { campaignLeads: { some: { status: "untouched" } } }
        ]
      }
    });
    const items = rawItems.map((l) => {
      const allMemberships = l.campaignLeads.map((cl) => ({
        id: cl.id,
        campaignId: cl.campaignId,
        leadId: cl.leadId,
        status: cl.status,
        attemptCount: cl.attemptCount,
        lastAttemptAt: cl.lastAttemptAt ? cl.lastAttemptAt.toISOString() : void 0,
        nextAttemptAt: cl.nextAttemptAt ? cl.nextAttemptAt.toISOString() : void 0
      }));
      const activeMembership = campaignId && campaignId !== "all" ? allMemberships.find((cl) => cl.campaignId === campaignId) : allMemberships[0];
      return {
        lead: {
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email || void 0,
          metadata: l.metadata || {},
          createdAt: l.createdAt.toISOString()
        },
        campaignLead: activeMembership,
        allCampaignLeads: allMemberships
      };
    });
    const totalPages = Math.ceil(total / pageSize) || 1;
    return {
      items,
      total,
      untouchedTotal,
      page,
      pageSize,
      totalPages
    };
  }
  async getLeadById(id) {
    const l = await prisma_default.lead.findUnique({ where: { id } });
    if (!l) return null;
    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email || void 0,
      metadata: l.metadata || {},
      createdAt: l.createdAt.toISOString()
    };
  }
  async addLead(leadData, campaignId) {
    const created = await prisma_default.lead.create({
      data: {
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        metadata: leadData.metadata || {}
      }
    });
    if (campaignId) {
      await this.enrollLeadInCampaign(created.id, campaignId);
    }
    return {
      id: created.id,
      name: created.name,
      phone: created.phone,
      email: created.email || void 0,
      metadata: created.metadata || {},
      createdAt: created.createdAt.toISOString()
    };
  }
  async enrollLeadInCampaign(leadId, campaignId) {
    const existing = await prisma_default.campaignLead.findUnique({
      where: {
        campaignId_leadId: { campaignId, leadId }
      }
    });
    if (existing) {
      return {
        id: existing.id,
        campaignId: existing.campaignId,
        leadId: existing.leadId,
        status: existing.status,
        attemptCount: existing.attemptCount,
        lastAttemptAt: existing.lastAttemptAt ? existing.lastAttemptAt.toISOString() : void 0,
        nextAttemptAt: existing.nextAttemptAt ? existing.nextAttemptAt.toISOString() : void 0
      };
    }
    const created = await prisma_default.campaignLead.create({
      data: {
        campaignId,
        leadId,
        status: "untouched",
        attemptCount: 0
      }
    });
    return {
      id: created.id,
      campaignId: created.campaignId,
      leadId: created.leadId,
      status: created.status,
      attemptCount: created.attemptCount,
      lastAttemptAt: created.lastAttemptAt ? created.lastAttemptAt.toISOString() : void 0,
      nextAttemptAt: created.nextAttemptAt ? created.nextAttemptAt.toISOString() : void 0
    };
  }
  async enrollLeadsInCampaign(leadIds, campaignId) {
    let count = 0;
    for (const leadId of leadIds) {
      await this.enrollLeadInCampaign(leadId, campaignId);
      count++;
    }
    return { enrolledCount: count };
  }
};
var leadRepository = new LeadRepository();

// server/services/leadService.ts
var ServerLeadService = class {
  async getLeads(options = {}) {
    return leadRepository.getLeads(options);
  }
  async getAllLeadsRaw() {
    return leadRepository.getAllLeadsRaw();
  }
  async getLeadById(id) {
    return leadRepository.getLeadById(id);
  }
  async addLead(leadData, campaignId) {
    return leadRepository.addLead(leadData, campaignId);
  }
  async importLeads(leadsData, campaignId) {
    for (const data of leadsData) {
      await leadRepository.addLead(data, campaignId);
    }
    return { importedCount: leadsData.length };
  }
  async enrollLeadInCampaign(leadId, campaignId) {
    return leadRepository.enrollLeadInCampaign(leadId, campaignId);
  }
  async enrollLeadsInCampaign(leadIds, campaignId) {
    return leadRepository.enrollLeadsInCampaign(leadIds, campaignId);
  }
};
var serverLeadService = new ServerLeadService();

// server/routes/leadRoutes.ts
var leadRoutes = Router();
leadRoutes.get("/", async (req, res) => {
  try {
    const { search, status, campaignId, page, pageSize } = req.query;
    const result = await serverLeadService.getLeads({
      search,
      status,
      campaignId,
      page: page ? Number(page) : void 0,
      pageSize: pageSize ? Number(pageSize) : void 0
    });
    res.json({ success: true, data: result, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
leadRoutes.get("/:id", async (req, res) => {
  try {
    const lead = await serverLeadService.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    res.json({ success: true, data: lead, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
leadRoutes.post("/", async (req, res) => {
  try {
    const { name, phone, email, metadata, campaignId } = req.body;
    const lead = await serverLeadService.addLead({ name, phone, email, metadata: metadata || {} }, campaignId);
    res.status(201).json({ success: true, data: lead, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
leadRoutes.post("/import", async (req, res) => {
  try {
    const { leads, campaignId } = req.body;
    const result = await serverLeadService.importLeads(leads || [], campaignId);
    res.json({ success: true, data: result, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/agentRoutes.ts
import { Router as Router2 } from "express";

// server/repositories/agentRepository.ts
var AgentRepository = class {
  async getAgents() {
    const list = await prisma_default.agent.findMany({
      include: { campaigns: true },
      orderBy: { createdAt: "desc" }
    });
    return list.map((a) => ({
      id: a.id,
      name: a.name,
      useCase: a.useCase,
      status: a.status,
      currentVersionId: a.currentVersionId,
      campaignsCount: a.campaigns.length,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString()
    }));
  }
  async getAgentById(id) {
    const a = await prisma_default.agent.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: "asc" } } }
    });
    if (!a) return null;
    const allVersions = a.versions.map((v) => ({
      id: v.id,
      agentId: v.agentId,
      versionNumber: v.versionNumber,
      notes: v.notes || void 0,
      config: v.config,
      createdAt: v.createdAt.toISOString()
    }));
    const currentVersion = allVersions.find((v) => v.id === a.currentVersionId) || allVersions[allVersions.length - 1];
    return {
      agent: {
        id: a.id,
        name: a.name,
        useCase: a.useCase,
        status: a.status,
        currentVersionId: a.currentVersionId,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString()
      },
      currentVersion,
      allVersions
    };
  }
  async getAgentVersions(agentId) {
    const list = await prisma_default.agentVersion.findMany({
      where: { agentId },
      orderBy: { versionNumber: "asc" }
    });
    return list.map((v) => ({
      id: v.id,
      agentId: v.agentId,
      versionNumber: v.versionNumber,
      notes: v.notes || void 0,
      config: v.config,
      createdAt: v.createdAt.toISOString()
    }));
  }
  async createAgent(name, useCase, config) {
    const versionId = `agv_${Date.now()}_v1`;
    return await prisma_default.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          name,
          useCase,
          status: "active",
          currentVersionId: versionId
        }
      });
      await tx.agentVersion.create({
        data: {
          id: versionId,
          agentId: agent.id,
          versionNumber: 1,
          notes: "Initial Agent Version Creation",
          config
        }
      });
      return {
        id: agent.id,
        name: agent.name,
        useCase: agent.useCase,
        status: agent.status,
        currentVersionId: versionId,
        campaignsCount: 0,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString()
      };
    });
  }
  async createAgentVersion(agentId, config, notes) {
    return await prisma_default.$transaction(async (tx) => {
      const existingVers = await tx.agentVersion.findMany({ where: { agentId } });
      const newVersionNum = existingVers.length + 1;
      const newVersionId = `agv_${agentId}_v${newVersionNum}`;
      const newVer = await tx.agentVersion.create({
        data: {
          id: newVersionId,
          agentId,
          versionNumber: newVersionNum,
          notes: notes || `Published version ${newVersionNum}`,
          config
        }
      });
      await tx.agent.update({
        where: { id: agentId },
        data: {
          currentVersionId: newVersionId
        }
      });
      return {
        id: newVer.id,
        agentId: newVer.agentId,
        versionNumber: newVer.versionNumber,
        notes: newVer.notes || void 0,
        config: newVer.config,
        createdAt: newVer.createdAt.toISOString()
      };
    });
  }
  async toggleAgentStatus(id) {
    const current = await prisma_default.agent.findUnique({ where: { id } });
    if (!current) throw new Error(`Agent not found: ${id}`);
    const updated = await prisma_default.agent.update({
      where: { id },
      data: {
        status: current.status === "active" ? "inactive" : "active"
      }
    });
    return {
      id: updated.id,
      name: updated.name,
      useCase: updated.useCase,
      status: updated.status,
      currentVersionId: updated.currentVersionId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  }
};
var agentRepository = new AgentRepository();

// server/services/sarvamProvider.ts
import crypto from "crypto";

// server/lib/envUtils.ts
import fs from "fs";
import path from "path";
function updateEnvVariables(updates) {
  if (process.env.VERCEL) {
    return;
  }
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf8");
    }
    const lines = content.split("\n");
    const remainingKeys = new Set(Object.keys(updates));
    const updatedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (remainingKeys.has(key)) {
          const val = updates[key];
          remainingKeys.delete(key);
          return `${key}="${val}"`;
        }
      }
      return line;
    });
    for (const key of remainingKeys) {
      updatedLines.push(`${key}="${updates[key]}"`);
    }
    fs.writeFileSync(envPath, updatedLines.join("\n"), "utf8");
  } catch (err) {
    console.error("[envUtils] Failed to update .env file:", err?.message);
  }
}

// server/services/sarvamProvider.ts
var BackendSarvamProvider = class {
  providerName = "Sarvam AI Voice Infrastructure (Server Bridge)";
  mappings = /* @__PURE__ */ new Map();
  baseUrl = process.env.SARVAM_BASE_URL || "https://apps.sarvam.ai/api";
  orgId = process.env.SARVAM_ORG_ID || "019e9100-606e-790c-92e0-0bcfbf8523a6";
  workspaceId = process.env.SARVAM_WORKSPACE_ID || "019e9100-60a1-7bd7-bdb5-3b118f090be9";
  defaultAppId = process.env.SARVAM_APP_ID || "Conversatio-b063cf10-e735";
  connectionId = process.env.SARVAM_CONNECTION_ID || "7efd8897-87-220da5aa-1d5e";
  agentPhoneNumber = process.env.SARVAM_AGENT_PHONE_NUMBER || "+917965480599";
  apiKey = process.env.SARVAM_API_KEY;
  lastVerifiedAt = void 0;
  lastLatencyMs = void 0;
  getApiKey() {
    return this.apiKey || process.env.SARVAM_API_KEY;
  }
  getConnectionId() {
    return this.connectionId;
  }
  getAgentPhoneNumber() {
    return this.agentPhoneNumber;
  }
  getDefaultAppId() {
    return this.defaultAppId;
  }
  getOrgId() {
    return this.orgId;
  }
  getWorkspaceId() {
    return this.workspaceId;
  }
  getStatus() {
    const key = this.getApiKey();
    return {
      connected: !!key,
      orgId: this.orgId,
      workspaceId: this.workspaceId,
      defaultAppId: this.defaultAppId,
      connectionId: this.connectionId,
      agentPhoneNumber: this.agentPhoneNumber,
      maskedApiKey: key ? key.length > 18 ? `${key.substring(0, 14)}\u2022\u2022\u2022\u2022${key.substring(key.length - 4)}` : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : null,
      lastVerifiedAt: this.lastVerifiedAt,
      latencyMs: this.lastLatencyMs
    };
  }
  async testConnection(customConfig) {
    const testKey = customConfig?.apiKey || this.getApiKey();
    const testOrgId = customConfig?.orgId || this.orgId;
    const testWorkspaceId = customConfig?.workspaceId || this.workspaceId;
    const testAppId = customConfig?.defaultAppId || this.defaultAppId;
    if (!testKey) {
      return { success: false, latencyMs: 0, message: "No Sarvam API Key provided." };
    }
    const startTime = Date.now();
    try {
      const now = /* @__PURE__ */ new Date();
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
      const start = encodeURIComponent(past24h.toISOString());
      const end = encodeURIComponent(now.toISOString());
      const endpoint = `${this.baseUrl}/analytics/v1/${testOrgId}/${testWorkspaceId}/${testAppId}/interactions?start_datetime=${start}&end_datetime=${end}&limit=1`;
      console.log(`[Sarvam Provider] Testing connection to ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-API-Key": testKey,
          "Content-Type": "application/json"
        }
      });
      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        this.lastVerifiedAt = (/* @__PURE__ */ new Date()).toISOString();
        this.lastLatencyMs = latencyMs;
        console.log(`[Sarvam Provider] Test succeeded in ${latencyMs}ms`);
        return {
          success: true,
          latencyMs,
          message: `Successfully connected & authenticated with Sarvam AI Voice Cloud (${latencyMs}ms).`
        };
      } else {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] Connection test HTTP ${res.status}: ${errText}`);
        return {
          success: false,
          latencyMs,
          message: `Sarvam API returned HTTP ${res.status}: ${errText.slice(0, 200)}`
        };
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        message: `Network connection to Sarvam failed: ${err?.message}`
      };
    }
  }
  async updateConfig(config) {
    const envUpdates = {};
    if (config.apiKey !== void 0 && config.apiKey.trim()) {
      this.apiKey = config.apiKey.trim();
      process.env.SARVAM_API_KEY = this.apiKey;
      envUpdates.SARVAM_API_KEY = this.apiKey;
    }
    if (config.orgId !== void 0 && config.orgId.trim()) {
      this.orgId = config.orgId.trim();
      process.env.SARVAM_ORG_ID = this.orgId;
      envUpdates.SARVAM_ORG_ID = this.orgId;
    }
    if (config.workspaceId !== void 0 && config.workspaceId.trim()) {
      this.workspaceId = config.workspaceId.trim();
      process.env.SARVAM_WORKSPACE_ID = this.workspaceId;
      envUpdates.SARVAM_WORKSPACE_ID = this.workspaceId;
    }
    if (config.defaultAppId !== void 0 && config.defaultAppId.trim()) {
      this.defaultAppId = config.defaultAppId.trim();
      process.env.SARVAM_APP_ID = this.defaultAppId;
      envUpdates.SARVAM_APP_ID = this.defaultAppId;
    }
    if (config.connectionId !== void 0 && config.connectionId.trim()) {
      this.connectionId = config.connectionId.trim();
      process.env.SARVAM_CONNECTION_ID = this.connectionId;
      envUpdates.SARVAM_CONNECTION_ID = this.connectionId;
    }
    if (config.agentPhoneNumber !== void 0 && config.agentPhoneNumber.trim()) {
      this.agentPhoneNumber = config.agentPhoneNumber.trim();
      process.env.SARVAM_AGENT_PHONE_NUMBER = this.agentPhoneNumber;
      envUpdates.SARVAM_AGENT_PHONE_NUMBER = this.agentPhoneNumber;
    }
    if (Object.keys(envUpdates).length > 0) {
      updateEnvVariables(envUpdates);
    }
    const testResult = await this.testConnection();
    return {
      success: testResult.success,
      status: this.getStatus(),
      testResult
    };
  }
  async syncAgentConfig(agentId, versionId, config) {
    const apiKey = this.getApiKey();
    let sarvamAgentId = `srv_app_${agentId}`;
    let sarvamVersionId = `1`;
    if (apiKey) {
      try {
        const endpoint = `${this.baseUrl}/v1/orgs/${this.orgId}/workspaces/${this.workspaceId}/apps`;
        console.log(`[Sarvam Provider] Syncing agent config to Sarvam API (${endpoint})...`);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey
          },
          body: JSON.stringify({
            name: `Fluid_Agent_${agentId}`,
            app_type: "voice_agent",
            config: {
              prompt: config.systemPrompt,
              greeting: config.firstGreeting || config.openingLine,
              voice: config.voiceId || config.voiceModel || "sarvam_v1",
              language: config.language || "en-IN",
              temperature: config.temperature || 0.7
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          sarvamAgentId = data.app_id || data.id || sarvamAgentId;
          sarvamVersionId = String(data.app_version || 1);
          console.log(`[Sarvam Provider] Sync succeeded. Provider App ID: ${sarvamAgentId}`);
        } else {
          console.warn(`[Sarvam Provider] HTTP ${res.status} from Sarvam API during syncAgentConfig. Falling back to local mapping.`);
        }
      } catch (err) {
        console.error(`[Sarvam Provider] Network error syncing agent to Sarvam: ${err?.message}`);
      }
    } else {
      console.log(`[Sarvam Provider] SARVAM_API_KEY omitted. Registered simulated provider mapping.`);
    }
    const mapping = {
      fluidAgentId: agentId,
      fluidVersionId: versionId,
      sarvamAgentId,
      sarvamVersionId,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.mappings.set(versionId, mapping);
    return mapping;
  }
  getMapping(fluidVersionId) {
    return this.mappings.get(fluidVersionId);
  }
  async initiateOutboundCall(params) {
    const apiKey = this.getApiKey();
    let providerCallId = `srv_interaction_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    if (apiKey) {
      try {
        const endpoint = `${this.baseUrl}/outbounds/v1/orgs/${this.orgId}/workspaces/${this.workspaceId}/outbounds`;
        console.log(`[Sarvam Provider] Initiating outbound call via Sarvam API (${endpoint}) to ${params.toPhoneNumber} (Lead Name: ${params.userName || "Customer"})...`);
        const appId = params.sarvamAgentId && !params.sarvamAgentId.startsWith("srv_app_") ? params.sarvamAgentId : this.defaultAppId;
        const connectionId = params.connectionId || this.connectionId;
        const agentPhoneNumber = params.fromPhoneNumber && params.fromPhoneNumber.startsWith("+91") ? params.fromPhoneNumber : this.agentPhoneNumber;
        const cleanUserName = params.userName ? params.userName.replace(/\s*\(.*?\)\s*/g, "").trim() : "Valued Customer";
        const payload = {
          app_config: {
            app_id: appId,
            app_version: 1,
            connection_config: {
              connection_id: connectionId,
              agent_phone_number: agentPhoneNumber
            },
            agent_variables: {
              user_name: cleanUserName,
              call_summary: "<call_summary>",
              follow_up_preference: "<follow_up_preference>",
              interest_level: "<interest_level>",
              verification_status: "<verification_status>",
              ...params.agentVariables || {}
            }
          },
          user_config: {
            user_phone_number: params.toPhoneNumber
          }
        };
        if (params.initialBotMessage || params.systemPrompt) {
          payload.app_config.app_overrides = {
            ...params.initialBotMessage ? { initial_bot_message: params.initialBotMessage.replace(/<user_name>/g, cleanUserName) } : {},
            ...params.systemPrompt ? { prompt: params.systemPrompt.replace(/<user_name>/g, cleanUserName) } : {}
          };
        }
        if (params.webhookUrl) {
          payload.webhook_config = {
            url: params.webhookUrl,
            metadata: {
              lead_id: params.leadId,
              agent_version_id: params.agentVersionId,
              campaign_id: params.campaignId
            }
          };
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          providerCallId = data.attempt_id || data.interaction_id || data.interactionId || data.call_id || providerCallId;
          console.log(`[Sarvam Provider] Outbound call initiated successfully. Attempt ID: ${providerCallId}`);
        } else {
          const errText = await res.text();
          throw new Error(`Sarvam API outbound call initiation failed (HTTP ${res.status}): ${errText}`);
        }
      } catch (err) {
        console.error(`[Sarvam Provider] Error calling Sarvam outbound API: ${err?.message}`);
        throw err;
      }
    } else {
      console.log(`[Sarvam Provider] SARVAM_API_KEY omitted. Initiated simulated outbound test call. Provider Attempt ID: ${providerCallId}`);
    }
    return { providerCallId, status: "initiated" };
  }
  normalizeWebhookPayload(payload) {
    const rawCallId = payload.interaction_id || payload.interactionId || payload.call_id || payload.callId || payload.metadata?.local_call_id;
    let externalCallId = rawCallId;
    if (!externalCallId) {
      if (payload.user_phone_number || payload.to_phone_number || payload.metadata?.lead_id) {
        const hash = crypto.createHash("sha256").update(JSON.stringify({
          to: payload.user_phone_number || payload.user_config?.user_phone_number || payload.to_phone_number,
          lead: payload.metadata?.lead_id,
          time: payload.start_datetime || payload.timestamp || payload.created_at || "n/a"
        })).digest("hex").substring(0, 16);
        externalCallId = `call_fallback_${hash}`;
      } else {
        externalCallId = "srv_interaction_unknown";
      }
    }
    const rawEventId = payload.event_id || payload.eventId || payload.id;
    let providerEventId = rawEventId;
    if (!providerEventId) {
      const eventTypeHint = payload.event_type || payload.eventType || (payload.duration !== void 0 ? "completed" : "initiated");
      const hash = crypto.createHash("sha256").update(JSON.stringify({
        callId: externalCallId,
        eventType: eventTypeHint,
        start: payload.start_datetime || payload.timestamp || "",
        duration: payload.duration !== void 0 ? payload.duration : null
      })).digest("hex").substring(0, 16);
      providerEventId = `wh_evt_${hash}`;
    }
    const eventType = payload.event_type || payload.eventType || (payload.duration !== void 0 || payload.end_datetime ? "call.completed" : "call.initiated");
    let canonicalStatus = "unknown";
    let outcome = void 0;
    if (payload.duration !== void 0 || payload.end_datetime || eventType === "call.completed" || eventType === "call.ended") {
      canonicalStatus = "completed";
      outcome = payload.outcome || "successful_contact";
    } else if (eventType === "call.initiated" || eventType === "call.created") {
      canonicalStatus = "initiated";
    } else if (eventType === "call.connected" || eventType === "call.answered") {
      canonicalStatus = "in-progress";
    } else if (eventType === "call.failed") {
      canonicalStatus = "failed";
      outcome = "system_error";
    } else if (eventType === "call.no_answer" || eventType === "call.busy") {
      canonicalStatus = "no_answer";
      outcome = "unreachable";
    } else {
      canonicalStatus = "unknown";
    }
    const duration = payload.duration || payload.duration_seconds || payload.durationSeconds || (canonicalStatus === "completed" ? 120 : 0);
    const durationMinutes = Number((duration / 60).toFixed(2));
    let transcript = void 0;
    if (Array.isArray(payload.interaction_transcript)) {
      transcript = payload.interaction_transcript.map((turn, index) => ({
        id: `t_${index}`,
        speaker: turn.role === "user" ? "lead" : "agent",
        text: turn.en_text || turn.text || turn.indic_text || "",
        timestampSeconds: (index + 1) * 4
      }));
    } else if (Array.isArray(payload.transcript)) {
      transcript = payload.transcript;
    }
    const extractedVariables = payload.final_agent_variables || payload.output_agent_variables || payload.extracted_variables || payload.extractedVariables || void 0;
    const metadata = payload.metadata || {};
    return {
      providerEventId,
      externalCallId,
      eventType,
      canonicalStatus,
      outcome,
      durationSeconds: duration,
      providerCostUnits: payload.provider_cost_units || payload.providerCostUnits || Number((durationMinutes * 0.05).toFixed(3)),
      platformCostUnits: payload.platform_cost_units || payload.platformCostUnits || Number((durationMinutes * 0.08).toFixed(3)),
      transcript,
      extractedVariables,
      campaignId: metadata.campaign_id || payload.campaign_id || payload.campaignId || void 0,
      agentId: metadata.agent_id || payload.agent_id || payload.agentId || void 0,
      agentVersionId: metadata.agent_version_id || payload.agent_version_id || payload.agentVersionId || void 0,
      leadId: metadata.lead_id || payload.lead_id || payload.leadId || void 0
    };
  }
  async startCampaign(campaignId, agentId, versionId, _phoneNumber) {
    let mapping = this.getMapping(versionId);
    if (!mapping) {
      mapping = await this.syncAgentConfig(agentId, versionId, { systemPrompt: "Campaign agent" });
    }
    return {
      providerCampaignId: `srv_cmp_${campaignId}_${mapping.sarvamVersionId}`,
      status: "active"
    };
  }
  async pauseCampaign(_providerCampaignId) {
    return { status: "paused" };
  }
  async resolveInteractionId(jobOrInteractionId, appId, callDate) {
    if (jobOrInteractionId.includes("/")) {
      return { interactionId: jobOrInteractionId };
    }
    const targetAppId = appId || this.defaultAppId;
    let start;
    let end;
    if (callDate) {
      const dt = new Date(callDate);
      start = new Date(dt.getTime() - 7 * 24 * 3600 * 1e3).toISOString();
      end = new Date(dt.getTime() + 2 * 24 * 3600 * 1e3).toISOString();
    } else {
      const now = /* @__PURE__ */ new Date();
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1e3).toISOString();
      end = now.toISOString();
    }
    const interactionsRes = await this.fetchInteractions({
      appId: targetAppId,
      limit: 50,
      startDatetime: start,
      endDatetime: end
    });
    if (interactionsRes && Array.isArray(interactionsRes.items)) {
      const matched = interactionsRes.items.find(
        (item) => item.job_id === jobOrInteractionId || item.interaction_id?.endsWith(jobOrInteractionId) || item.interaction_id?.includes(jobOrInteractionId)
      );
      if (matched) {
        return { interactionId: matched.interaction_id, interactionItem: matched };
      }
    }
    return null;
  }
  async fetchCallRecording(interactionId, appId) {
    const apiKey = this.getApiKey();
    const targetAppId = appId || this.defaultAppId;
    if (!apiKey) {
      console.warn("[Sarvam Provider] SARVAM_API_KEY omitted. Cannot fetch call recording.");
      return null;
    }
    try {
      const endpoint = `${this.baseUrl}/analytics/v1/${this.orgId}/${this.workspaceId}/${targetAppId}/recordings/${interactionId}`;
      console.log(`[Sarvam Provider] Fetching call recording audio from Sarvam Analytics API (${endpoint})...`);
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] HTTP ${res.status} fetching recording: ${errText}`);
        return null;
      }
      const contentType = res.headers.get("content-type") || "audio/wav";
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        buffer,
        contentType
      };
    } catch (err) {
      console.error(`[Sarvam Provider] Error fetching call recording: ${err?.message}`);
      return null;
    }
  }
  async fetchCallTranscript(jobOrInteractionId, appId, callDate) {
    const apiKey = this.getApiKey();
    const targetAppId = appId || process.env.SARVAM_APP_ID || this.defaultAppId;
    if (!apiKey) {
      console.warn(`[Sarvam Provider] SARVAM_API_KEY omitted. Cannot fetch transcript for interaction ${jobOrInteractionId}`);
      return null;
    }
    try {
      let realInteractionId = jobOrInteractionId;
      let extractedVariables = void 0;
      let callDuration = void 0;
      let goalOverallStatus = void 0;
      let endedBy = void 0;
      if (!jobOrInteractionId.includes("/")) {
        console.log(`[Sarvam Provider] Resolving job_id/attempt_id (${jobOrInteractionId}) to Sarvam interaction_id...`);
        const resolved = await this.resolveInteractionId(jobOrInteractionId, targetAppId, callDate);
        if (resolved && resolved.interactionItem) {
          realInteractionId = resolved.interactionId;
          extractedVariables = resolved.interactionItem.agent_variables || resolved.interactionItem.extracted_variables;
          callDuration = resolved.interactionItem.duration_in_seconds;
          goalOverallStatus = resolved.interactionItem.goal_overall_status;
          endedBy = resolved.interactionItem.ended_by;
          console.log(`[Sarvam Provider] Mapped attempt ${jobOrInteractionId} -> interaction_id: ${realInteractionId}`);
        }
      }
      const endpoint = `${this.baseUrl}/analytics/v1/${this.orgId}/${this.workspaceId}/${targetAppId}/transcripts/${realInteractionId}`;
      console.log(`[Sarvam Provider] Fetching transcript from Sarvam Analytics API (${endpoint})...`);
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`[Sarvam Provider] Successfully fetched transcript for ${realInteractionId}. Messages count: ${data.messages?.length || 0}`);
        return {
          ...data,
          real_interaction_id: realInteractionId,
          extracted_variables: extractedVariables || data.extracted_variables || data.agent_variables,
          duration: callDuration !== void 0 ? callDuration : data.duration,
          goal_overall_status: goalOverallStatus,
          ended_by: endedBy
        };
      } else {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] HTTP ${res.status} fetching transcript: ${errText}`);
        return null;
      }
    } catch (err) {
      console.error(`[Sarvam Provider] Error fetching transcript: ${err?.message}`);
      return null;
    }
  }
  async fetchInteractions(params) {
    const apiKey = this.getApiKey();
    const targetAppId = params?.appId || process.env.SARVAM_APP_ID || this.defaultAppId;
    if (!apiKey) {
      return { items: [], total: 0 };
    }
    try {
      const now = /* @__PURE__ */ new Date();
      const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      const start = params?.startDatetime || past30d.toISOString();
      const end = params?.endDatetime || now.toISOString();
      const limit = params?.limit || 50;
      const endpoint = `${this.baseUrl}/analytics/v1/${this.orgId}/${this.workspaceId}/${targetAppId}/interactions?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}&limit=${limit}`;
      console.log(`[Sarvam Provider] Fetching interactions from Sarvam Analytics API (${endpoint})...`);
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        const errText = await res.text();
        console.warn(`[Sarvam Provider] HTTP ${res.status} fetching interactions: ${errText}`);
        return { items: [], total: 0 };
      }
    } catch (err) {
      console.error(`[Sarvam Provider] Error fetching interactions: ${err?.message}`);
      return { items: [], total: 0 };
    }
  }
  async provisionNumber(_areaCode = "800") {
    return {
      phoneNumber: this.agentPhoneNumber,
      providerId: this.connectionId
    };
  }
};
var backendSarvamProvider = new BackendSarvamProvider();

// server/services/agentService.ts
var ServerAgentService = class {
  async getAgents() {
    return agentRepository.getAgents();
  }
  async getAgentById(id) {
    return agentRepository.getAgentById(id);
  }
  async getAgentVersions(agentId) {
    return agentRepository.getAgentVersions(agentId);
  }
  async createAgent(name, useCase, config) {
    const created = await agentRepository.createAgent(name, useCase, config);
    await backendSarvamProvider.syncAgentConfig(created.id, created.currentVersionId, config);
    return created;
  }
  async createAgentVersion(agentId, config, notes) {
    const createdVer = await agentRepository.createAgentVersion(agentId, config, notes);
    await backendSarvamProvider.syncAgentConfig(agentId, createdVer.id, config);
    return createdVer;
  }
  async toggleAgentStatus(id) {
    return agentRepository.toggleAgentStatus(id);
  }
  async syncWithSarvam(agentId) {
    const agentDetails = await agentRepository.getAgentById(agentId);
    if (!agentDetails) throw new Error(`Agent not found: ${agentId}`);
    return await backendSarvamProvider.syncAgentConfig(
      agentDetails.agent.id,
      agentDetails.currentVersion.id,
      agentDetails.currentVersion.config
    );
  }
};
var serverAgentService = new ServerAgentService();

// server/routes/agentRoutes.ts
var agentRoutes = Router2();
agentRoutes.get("/", async (req, res) => {
  try {
    const agents = await serverAgentService.getAgents();
    res.json({ success: true, data: agents, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.get("/:id", async (req, res) => {
  try {
    const agentDetails = await serverAgentService.getAgentById(req.params.id);
    if (!agentDetails) {
      return res.status(404).json({ success: false, error: "Agent not found", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    res.json({ success: true, data: agentDetails, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.post("/", async (req, res) => {
  try {
    const { name, useCase, config } = req.body;
    const agent = await serverAgentService.createAgent(name, useCase, config);
    res.status(201).json({ success: true, data: agent, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.get("/:id/versions", async (req, res) => {
  try {
    const versions = await serverAgentService.getAgentVersions(req.params.id);
    res.json({ success: true, data: versions, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.post("/:id/versions", async (req, res) => {
  try {
    const { config, notes } = req.body;
    const version = await serverAgentService.createAgentVersion(req.params.id, config, notes);
    res.status(201).json({ success: true, data: version, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.post("/:id/activate", async (req, res) => {
  try {
    const agent = await serverAgentService.toggleAgentStatus(req.params.id);
    res.json({ success: true, data: agent, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.post("/:id/sync-sarvam", async (req, res) => {
  try {
    const mapping = await serverAgentService.syncWithSarvam(req.params.id);
    res.json({ success: true, data: mapping, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
agentRoutes.post("/voice-preview", async (req, res) => {
  try {
    const { text, speaker = "shubh", languageCode = "en-IN" } = req.body;
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "SARVAM_API_KEY not configured on server", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    const ttsRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: [text || "Namaste! Main Shubh bol raha hoon Fluid.live se. How can I assist you today?"],
        target_language_code: languageCode || "en-IN",
        speaker: (speaker || "shubh").toLowerCase(),
        model: "bulbul:v1"
      })
    });
    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.warn(`[Sarvam TTS Preview] Bulbul TTS returned HTTP ${ttsRes.status}: ${errText}. Using browser synthesis fallback.`);
      return res.json({
        success: true,
        audioBase64: null,
        fallbackToBrowser: true,
        speaker,
        message: "Bulbul TTS key not available; fallback to browser speech synthesis",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const ttsData = await ttsRes.json();
    const audioBase64 = ttsData.audios?.[0];
    res.json({ success: true, audioBase64, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    console.warn("[Sarvam TTS Preview] Error:", err?.message);
    res.json({
      success: true,
      audioBase64: null,
      fallbackToBrowser: true,
      speaker: req.body?.speaker,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});

// server/routes/campaignRoutes.ts
import { Router as Router3 } from "express";

// server/repositories/campaignRepository.ts
var CampaignRepository = class {
  async getCampaigns(search = "", status = "all") {
    const where = {};
    if (search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }
    if (status && status !== "all") {
      where.status = status;
    }
    const list = await prisma_default.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      phoneNumberId: c.phoneNumberId,
      status: c.status,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : void 0,
      startedAt: c.startedAt ? c.startedAt.toISOString() : void 0,
      completedAt: c.completedAt ? c.completedAt.toISOString() : void 0,
      totalLeads: c.totalLeads,
      completedCalls: c.completedCalls,
      callsAttempted: c.callsAttempted,
      minutesUsed: c.minutesUsed,
      createdAt: c.createdAt.toISOString()
    }));
  }
  async getCampaignById(id) {
    const c = await prisma_default.campaign.findUnique({ where: { id } });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      phoneNumberId: c.phoneNumberId,
      status: c.status,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : void 0,
      startedAt: c.startedAt ? c.startedAt.toISOString() : void 0,
      completedAt: c.completedAt ? c.completedAt.toISOString() : void 0,
      totalLeads: c.totalLeads,
      completedCalls: c.completedCalls,
      callsAttempted: c.callsAttempted,
      minutesUsed: c.minutesUsed,
      createdAt: c.createdAt.toISOString()
    };
  }
  async createCampaign(dto) {
    const initialStatus = dto.scheduledAt ? "scheduled" : "draft";
    return await prisma_default.$transaction(async (tx) => {
      let leadIdsToEnroll = dto.selectedLeadIds || [];
      if (leadIdsToEnroll.length === 0) {
        const rawLeads = await tx.lead.findMany({ take: dto.totalLeads || 100 });
        leadIdsToEnroll = rawLeads.map((l) => l.id);
      }
      const campaign = await tx.campaign.create({
        data: {
          name: dto.name,
          agentId: dto.agentId,
          agentVersionId: dto.agentVersionId,
          // Locked explicit version
          phoneNumberId: dto.phoneNumberId,
          status: initialStatus,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          totalLeads: leadIdsToEnroll.length || dto.totalLeads || 100
        }
      });
      for (const leadId of leadIdsToEnroll) {
        await tx.campaignLead.upsert({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId } },
          update: {},
          create: { campaignId: campaign.id, leadId, status: "untouched", attemptCount: 0 }
        });
      }
      return {
        id: campaign.id,
        name: campaign.name,
        agentId: campaign.agentId,
        agentVersionId: campaign.agentVersionId,
        phoneNumberId: campaign.phoneNumberId,
        status: campaign.status,
        scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : void 0,
        totalLeads: campaign.totalLeads,
        completedCalls: campaign.completedCalls,
        callsAttempted: campaign.callsAttempted,
        minutesUsed: campaign.minutesUsed,
        createdAt: campaign.createdAt.toISOString()
      };
    });
  }
  async updateCampaignStatus(id, status) {
    const updated = await prisma_default.campaign.update({
      where: { id },
      data: {
        status,
        ...status === "running" && { startedAt: /* @__PURE__ */ new Date() },
        ...status === "cancelled" || status === "completed" ? { completedAt: /* @__PURE__ */ new Date() } : {}
      }
    });
    return {
      id: updated.id,
      name: updated.name,
      agentId: updated.agentId,
      agentVersionId: updated.agentVersionId,
      phoneNumberId: updated.phoneNumberId,
      status: updated.status,
      scheduledAt: updated.scheduledAt ? updated.scheduledAt.toISOString() : void 0,
      startedAt: updated.startedAt ? updated.startedAt.toISOString() : void 0,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : void 0,
      totalLeads: updated.totalLeads,
      completedCalls: updated.completedCalls,
      callsAttempted: updated.callsAttempted,
      minutesUsed: updated.minutesUsed,
      createdAt: updated.createdAt.toISOString()
    };
  }
};
var campaignRepository = new CampaignRepository();

// server/repositories/callRepository.ts
var CallRepository = class {
  async getCalls(options = {}) {
    const where = {};
    if (options.status && options.status !== "all") {
      where.status = options.status;
    }
    if (options.outcome && options.outcome !== "all") {
      where.outcome = options.outcome;
    }
    if (options.campaignId && options.campaignId !== "all") {
      where.campaignId = options.campaignId;
    }
    if (options.agentId && options.agentId !== "all") {
      where.agentId = options.agentId;
    }
    if (options.search?.trim()) {
      const q = options.search.trim().toLowerCase();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { externalCallId: { contains: q, mode: "insensitive" } },
        { leadId: { contains: q, mode: "insensitive" } }
      ];
    }
    const list = await prisma_default.call.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: { lead: true }
    });
    return list.map((c) => ({
      id: c.id,
      externalCallId: c.externalCallId,
      campaignId: c.campaignId,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      leadId: c.leadId,
      leadName: c.lead?.name,
      leadPhone: c.lead?.phone,
      phoneNumberId: c.phoneNumberId,
      status: c.status,
      outcome: c.outcome,
      durationSeconds: c.durationSeconds,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt ? c.endedAt.toISOString() : void 0,
      transcript: c.transcript || [],
      extractedVariables: c.extractedVariables || {},
      usageEventId: c.usageEventId || void 0
    }));
  }
  async getCallById(id) {
    const c = await prisma_default.call.findUnique({
      where: { id },
      include: { lead: true }
    });
    if (!c) return null;
    return {
      id: c.id,
      externalCallId: c.externalCallId,
      campaignId: c.campaignId || void 0,
      agentId: c.agentId,
      agentVersionId: c.agentVersionId,
      leadId: c.leadId,
      leadName: c.lead?.name,
      leadPhone: c.lead?.phone,
      phoneNumberId: c.phoneNumberId,
      status: c.status,
      outcome: c.outcome,
      durationSeconds: c.durationSeconds,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt ? c.endedAt.toISOString() : void 0,
      transcript: c.transcript || [],
      extractedVariables: c.extractedVariables || {},
      usageEventId: c.usageEventId || void 0
    };
  }
  async createCall(data) {
    const created = await prisma_default.call.upsert({
      where: { externalCallId: data.externalCallId },
      create: {
        id: `call_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
        externalCallId: data.externalCallId,
        campaignId: data.campaignId || null,
        agentId: data.agentId,
        agentVersionId: data.agentVersionId,
        leadId: data.leadId,
        phoneNumberId: data.phoneNumberId,
        status: data.status,
        outcome: data.outcome || "successful_contact",
        durationSeconds: 0,
        startedAt: /* @__PURE__ */ new Date()
      },
      update: {
        agentId: data.agentId,
        agentVersionId: data.agentVersionId,
        leadId: data.leadId,
        phoneNumberId: data.phoneNumberId,
        ...data.campaignId !== void 0 ? { campaignId: data.campaignId } : {}
      }
    });
    return {
      id: created.id,
      externalCallId: created.externalCallId,
      campaignId: created.campaignId || void 0,
      agentId: created.agentId,
      agentVersionId: created.agentVersionId,
      leadId: created.leadId,
      phoneNumberId: created.phoneNumberId,
      status: created.status,
      outcome: created.outcome,
      durationSeconds: created.durationSeconds,
      startedAt: created.startedAt.toISOString(),
      transcript: [],
      extractedVariables: {}
    };
  }
};
var callRepository = new CallRepository();

// server/services/campaignService.ts
var ServerCampaignService = class {
  async getCampaigns(search = "", status = "all") {
    return campaignRepository.getCampaigns(search, status);
  }
  async getCampaignById(id) {
    return campaignRepository.getCampaignById(id);
  }
  async createCampaign(dto) {
    return campaignRepository.createCampaign(dto);
  }
  async startCampaign(id) {
    const campaign = await campaignRepository.getCampaignById(id);
    if (!campaign) throw new Error(`Campaign not found: ${id}`);
    const runningCampaign = await campaignRepository.updateCampaignStatus(id, "running");
    const campaignLeads = await prisma_default.campaignLead.findMany({
      where: { campaignId: id },
      include: { lead: true }
    });
    const phoneNumberObj = await prisma_default.phoneNumber.findUnique({
      where: { id: campaign.phoneNumberId }
    });
    const fromPhone = phoneNumberObj?.phoneNumber || process.env.SARVAM_AGENT_PHONE_NUMBER || "+917965480599";
    const sarvamAppId = process.env.SARVAM_APP_ID || "Conversatio-b063cf10-e735";
    console.log(`[Campaign Engine] Dispatching calls for campaign "${campaign.name}" (${campaignLeads.length} lead(s))...`);
    const agentVersion = await prisma_default.agentVersion.findUnique({
      where: { id: campaign.agentVersionId }
    });
    const config = agentVersion?.config || {};
    for (const cl of campaignLeads) {
      try {
        console.log(`[Campaign Engine] Calling lead ${cl.lead.name} (${cl.lead.phone}) via Sarvam API...`);
        const callResult = await backendSarvamProvider.initiateOutboundCall({
          agentVersionId: campaign.agentVersionId,
          sarvamAgentId: config.sarvamAppId || sarvamAppId,
          connectionId: config.sarvamConnectionId || phoneNumberObj?.providerId || void 0,
          fromPhoneNumber: fromPhone,
          toPhoneNumber: cl.lead.phone,
          leadId: cl.lead.id,
          campaignId: campaign.id,
          userName: cl.lead.name,
          initialBotMessage: config.firstGreeting || config.openingLine,
          outroMessage: config.closingBehavior || config.outroMessage,
          systemPrompt: config.systemPrompt
        });
        await callRepository.createCall({
          externalCallId: callResult.providerCallId,
          campaignId: campaign.id,
          agentId: campaign.agentId,
          agentVersionId: campaign.agentVersionId,
          leadId: cl.lead.id,
          phoneNumberId: campaign.phoneNumberId,
          status: "initiated"
        });
        await prisma_default.campaignLead.update({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId: cl.lead.id } },
          data: {
            status: "calling",
            attemptCount: { increment: 1 },
            lastAttemptAt: /* @__PURE__ */ new Date()
          }
        });
        await prisma_default.campaign.update({
          where: { id: campaign.id },
          data: { callsAttempted: { increment: 1 } }
        });
        console.log(`[Campaign Engine] Live call dispatched to ${cl.lead.phone}. Attempt ID: ${callResult.providerCallId}`);
      } catch (err) {
        console.error(`[Campaign Engine] Failed to dispatch call to ${cl.lead.phone}: ${err?.message}`);
        await prisma_default.campaignLead.update({
          where: { campaignId_leadId: { campaignId: campaign.id, leadId: cl.lead.id } },
          data: { status: "failed" }
        });
      }
    }
    return runningCampaign;
  }
  async pauseCampaign(id) {
    const campaign = await campaignRepository.getCampaignById(id);
    if (!campaign) throw new Error(`Campaign not found: ${id}`);
    await backendSarvamProvider.pauseCampaign(`srv_cmp_${id}_${campaign.agentVersionId}`);
    return campaignRepository.updateCampaignStatus(id, "paused");
  }
  async resumeCampaign(id) {
    return this.startCampaign(id);
  }
  async stopCampaign(id) {
    return campaignRepository.updateCampaignStatus(id, "cancelled");
  }
};
var serverCampaignService = new ServerCampaignService();

// server/routes/campaignRoutes.ts
var campaignRoutes = Router3();
campaignRoutes.get("/", async (req, res) => {
  try {
    const { search, status } = req.query;
    const campaigns = await serverCampaignService.getCampaigns(search, status);
    res.json({ success: true, data: campaigns, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
campaignRoutes.get("/:id", async (req, res) => {
  try {
    const campaign = await serverCampaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    res.json({ success: true, data: campaign, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
campaignRoutes.post("/", async (req, res) => {
  try {
    const campaign = await serverCampaignService.createCampaign(req.body);
    res.status(201).json({ success: true, data: campaign, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
campaignRoutes.post("/:id/start", async (req, res) => {
  try {
    const campaign = await serverCampaignService.startCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
campaignRoutes.post("/:id/pause", async (req, res) => {
  try {
    const campaign = await serverCampaignService.pauseCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
campaignRoutes.post("/:id/resume", async (req, res) => {
  try {
    const campaign = await serverCampaignService.resumeCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
campaignRoutes.post("/:id/stop", async (req, res) => {
  try {
    const campaign = await serverCampaignService.stopCampaign(req.params.id);
    res.json({ success: true, data: campaign, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/callRoutes.ts
import { Router as Router4 } from "express";

// server/services/r2StorageService.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
var R2StorageService = class {
  client = null;
  bucketName = "";
  publicUrl;
  constructor(config) {
    this.initialize(config);
  }
  initialize(config) {
    const clean = (val) => (val || "").replace(/^\uFEFF/, "").trim();
    const accountId = clean(config?.accountId || process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID);
    const accessKeyId = clean(config?.accessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID);
    const secretAccessKey = clean(config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
    this.bucketName = clean(config?.bucketName || process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME);
    const rawPublicUrl = config?.publicUrl || process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;
    this.publicUrl = rawPublicUrl ? clean(rawPublicUrl) : void 0;
    if (accountId && accessKeyId && secretAccessKey && this.bucketName) {
      try {
        this.client = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        });
        console.log(`[R2 Storage Service] Initialized Cloudflare R2 client for bucket: "${this.bucketName}"`);
      } catch (err) {
        console.error("[R2 Storage Service] Failed to initialize S3Client:", err?.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }
  isConfigured() {
    return this.client !== null && Boolean(this.bucketName);
  }
  getStorageStatus() {
    return {
      enabled: this.isConfigured(),
      bucketName: this.bucketName || null,
      provider: "Cloudflare R2 (S3 API)",
      hasPublicUrl: Boolean(this.publicUrl)
    };
  }
  /**
   * Uploads call audio recording buffer to Cloudflare R2
   */
  async uploadCallAudio(callId, audioBuffer, contentType = "audio/wav") {
    if (!this.client || !this.bucketName) {
      return null;
    }
    const key = `recordings/${callId}.wav`;
    try {
      console.log(`[R2 Storage Service] Archiving call audio to Cloudflare R2: s3://${this.bucketName}/${key} (${audioBuffer.length} bytes)...`);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: audioBuffer,
          ContentType: contentType,
          Metadata: {
            callId,
            archivedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        })
      );
      const publicUrl = this.publicUrl ? `${this.publicUrl.replace(/\/$/, "")}/${key}` : void 0;
      console.log(`[R2 Storage Service] Successfully archived call audio to R2: ${key}`);
      return { key, url: publicUrl };
    } catch (err) {
      console.error(`[R2 Storage Service] Failed to upload audio to R2 for call ${callId}:`, err?.message);
      return null;
    }
  }
  /**
   * Retrieves call audio from Cloudflare R2
   */
  async getCallAudio(callId) {
    if (!this.client || !this.bucketName) {
      return null;
    }
    const key = `recordings/${callId}.wav`;
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key
        })
      );
      if (!response.Body) {
        return null;
      }
      const stream = response.Body;
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const contentType = response.ContentType || "audio/wav";
      console.log(`[R2 Storage Service] Served call recording directly from Cloudflare R2 for call: ${callId}`);
      return { buffer, contentType };
    } catch (err) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.warn(`[R2 Storage Service] Error reading audio for call ${callId} from R2:`, err?.message);
      return null;
    }
  }
  /**
   * Checks if audio recording already exists in Cloudflare R2
   */
  async hasCallAudio(callId) {
    if (!this.client || !this.bucketName) {
      return false;
    }
    const key = `recordings/${callId}.wav`;
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key
        })
      );
      return true;
    } catch {
      return false;
    }
  }
};
var r2StorageService = new R2StorageService();

// server/services/callAnalyticsService.ts
var CallAnalyticsService = class {
  /**
   * Performs deep, automated conversational analysis on a call session.
   * Parses verbatim Hindi/Hinglish/English turns, computes airtime metrics,
   * runs automated QA script audits, detects objections & buying signals,
   * and provides a next-best-action recommendation for sales/operations.
   */
  analyzeCall(call) {
    const transcript = Array.isArray(call.transcript) ? call.transcript : [];
    const durationSecs = call.durationSeconds || 0;
    const extractedVars = call.extractedVariables || {};
    const talkToListen = this.computePacingDynamics(transcript, durationSecs);
    const qaScorecard = this.auditQAScriptCompliance(transcript, call);
    const objections = this.detectObjections(transcript);
    const buyingSignals = this.detectBuyingSignals(transcript, extractedVars);
    const sentimentTrajectory = this.computeSentimentTrajectory(transcript, extractedVars);
    const nextBestAction = this.generateNextBestAction(call, buyingSignals, objections, extractedVars);
    return {
      talkToListen,
      qaScorecard,
      objections,
      buyingSignals,
      sentimentTrajectory,
      nextBestAction,
      analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * 1. Talk-to-Listen Ratio & Conversational Pacing Dynamics
   */
  computePacingDynamics(transcript, durationSecs) {
    if (transcript.length === 0 || durationSecs === 0) {
      return {
        agentWordCount: 0,
        leadWordCount: 0,
        totalWordCount: 0,
        agentTalkPercentage: 0,
        leadTalkPercentage: 0,
        agentWPM: 0,
        leadWPM: 0,
        turnCount: 0,
        avgTurnLengthWords: 0,
        pacingAssessment: "unbalanced",
        pacingSummary: "No verbal turns recorded; call terminated without active dialogue."
      };
    }
    let agentWords = 0;
    let leadWords = 0;
    for (const turn of transcript) {
      const words = turn.text.trim().split(/\s+/).filter(Boolean).length;
      if (turn.speaker === "agent") {
        agentWords += words;
      } else {
        leadWords += words;
      }
    }
    const totalWords = agentWords + leadWords;
    let agentTalkPercentage = 50;
    let leadTalkPercentage = 50;
    if (totalWords > 0) {
      agentTalkPercentage = Math.round(agentWords / totalWords * 100);
      leadTalkPercentage = 100 - agentTalkPercentage;
    } else if (agentWords > 0 && leadWords === 0) {
      agentTalkPercentage = 100;
      leadTalkPercentage = 0;
    }
    const durationMinutes = Math.max(durationSecs / 60, 0.1);
    const agentWPM = Math.round(agentWords / durationMinutes);
    const leadWPM = Math.round(leadWords / durationMinutes);
    const avgTurnLengthWords = Math.round(totalWords / transcript.length);
    let pacingAssessment = "optimal";
    let pacingSummary = "Balanced enterprise conversational exchange.";
    if (leadWords === 0) {
      pacingAssessment = "unbalanced";
      pacingSummary = "One-sided monologue. Customer remained silent or hung up during introduction.";
    } else if (agentTalkPercentage > 75) {
      pacingAssessment = "unbalanced";
      pacingSummary = `Agent dominated airtime (${agentTalkPercentage}%). Consider shortening value pitch to encourage customer replies.`;
    } else if (agentTalkPercentage < 35) {
      pacingAssessment = "unbalanced";
      pacingSummary = `Customer dominated airtime (${leadTalkPercentage}%). High prospect engagement or detailed feedback.`;
    } else if (agentWPM > 175) {
      pacingAssessment = "fast_paced";
      pacingSummary = `Agent cadence is fast (${agentWPM} WPM). Recommended rate for Indian voice outreach is 120-145 WPM.`;
    } else {
      pacingAssessment = "optimal";
      pacingSummary = `Ideal conversational ratio: Agent spoke ${agentTalkPercentage}% of words; prospect engaged for ${leadTalkPercentage}%.`;
    }
    return {
      agentWordCount: agentWords,
      leadWordCount: leadWords,
      totalWordCount: totalWords,
      agentTalkPercentage,
      leadTalkPercentage,
      agentWPM,
      leadWPM,
      turnCount: transcript.length,
      avgTurnLengthWords,
      pacingAssessment,
      pacingSummary
    };
  }
  /**
   * 2. Automated QA Script Compliance Audit (0 - 100 Scorecard)
   */
  auditQAScriptCompliance(transcript, call) {
    const checklist = [];
    const agentTurns = transcript.filter((t) => t.speaker === "agent");
    const combinedAgentText = agentTurns.map((t) => t.text.toLowerCase()).join(" ");
    const brandPattern = /(fluid\.live|fluid\s*live|fluid)/i;
    const agentNamePattern = /(shubh|शुभ|mera\s*naam|my\s*name)/i;
    const passedBrand = brandPattern.test(combinedAgentText) && agentNamePattern.test(combinedAgentText);
    checklist.push({
      id: "qa_brand_id",
      category: "Identification",
      criterion: "Agent Identification & Brand Disclosure",
      score: passedBrand ? 20 : 0,
      passed: passedBrand,
      details: passedBrand ? "Agent clearly introduced self as Shubh representing Fluid.live." : "Failed to mention both agent identity and company brand in opening."
    });
    const leadName = (call.extractedVariables?.user_name || "").toLowerCase();
    const verifyPattern = new RegExp(`(${leadName || "pranav"}|kya\\s*meri\\s*baat|baat\\s*ho\\s*rahi\\s*hai|am\\s*i\\s*speaking|is\\s*this)`, "i");
    const passedVerify = verifyPattern.test(combinedAgentText) || call.extractedVariables?.verification_status === "completed";
    checklist.push({
      id: "qa_verification",
      category: "Verification",
      criterion: "Target Contact Verification",
      score: passedVerify ? 20 : 0,
      passed: passedVerify,
      details: passedVerify ? "Agent addressed customer respectfully by name and validated identity." : "Customer identity verification omitted in opening dialogue."
    });
    const pitchPattern = /(ai\s*voice\s*calling|calling|reminders|follow\s*ups|voice\s*calling|business|businesses)/i;
    const passedPitch = pitchPattern.test(combinedAgentText);
    checklist.push({
      id: "qa_pitch",
      category: "Pitch Clarity",
      criterion: "Value Proposition Articulation",
      score: passedPitch ? 20 : 0,
      passed: passedPitch,
      details: passedPitch ? "Articulated core AI voice calling capabilities and automated follow-up benefits." : "Value proposition was not delivered or call ended prematurely."
    });
    const discoveryPattern = /(chhota\s*sa\s*sawal|ek\s*sawal|quick\s*question|whatsapp|demo|preference|prefer)/i;
    const passedDiscovery = discoveryPattern.test(combinedAgentText) || Boolean(call.extractedVariables?.follow_up_preference);
    checklist.push({
      id: "qa_discovery",
      category: "Consent & Discovery",
      criterion: "Explicit Consent & Channel Preference",
      score: passedDiscovery ? 20 : 0,
      passed: passedDiscovery,
      details: passedDiscovery ? "Politely sought permission before pitching and gathered follow-up channel preference." : "No customer consent or follow-up preference captured."
    });
    const closingPattern = /(shukriya|शुक्रिया|din\s*shubh|thank\s*you|thanks|aapka\s*din|have\s*a\s*great\s*day)/i;
    const passedClosing = closingPattern.test(combinedAgentText);
    checklist.push({
      id: "qa_closing",
      category: "Professionalism",
      criterion: "Courteous Enterprise Sign-off",
      score: passedClosing ? 20 : 0,
      passed: passedClosing,
      details: passedClosing ? "Agent thanked prospect for their time and closed with polite cultural greeting." : "Call terminated abruptly without standard courteous sign-off."
    });
    const overallScore = checklist.reduce((sum, item) => sum + item.score, 0);
    let grade = "Needs Improvement";
    let status = "failed";
    let keyFeedback = "";
    if (overallScore >= 95) {
      grade = "A+";
      status = "passed";
      keyFeedback = "Flawless execution. All compliance and conversational milestones fulfilled.";
    } else if (overallScore >= 80) {
      grade = "A";
      status = "passed";
      keyFeedback = "Strong compliance. Minor opportunities in discovery cadence.";
    } else if (overallScore >= 60) {
      grade = "B";
      status = "warning";
      keyFeedback = "Acceptable. Call completed partial workflow before disengagement.";
    } else if (overallScore >= 40) {
      grade = "C";
      status = "warning";
      keyFeedback = "Incomplete dialogue. Critical script checkpoints were missed.";
    } else {
      grade = "Needs Improvement";
      status = "failed";
      keyFeedback = "Call dropped early or customer hung up before core script delivery.";
    }
    return {
      overallScore,
      grade,
      status,
      checklist,
      keyFeedback
    };
  }
  /**
   * 3. Objection & Friction Detection (Hindi / Hinglish / English)
   */
  detectObjections(transcript) {
    const objections = [];
    const leadTurns = transcript.filter((t) => t.speaker === "lead");
    const patterns = [
      {
        category: "pricing",
        label: "Pricing / Budget Concern",
        regex: /(kitna\s*kharcha|rate\s*kya|expensive|mehenga|cost|price|kitne\s*paise|charges|fees|budget|kitna\s*lagega|kya\s*charge)/i
      },
      {
        category: "timing",
        label: "Timing / Busyness Hesitation",
        regex: /(busy|baad\s*me|not\s*right\s*now|call\s*later|time\s*nahi|driving|meeting|abhi\s*nahi|kal\s*call|fursat\s*nahi|busy\s*hoon|free\s*nahi)/i
      },
      {
        category: "ai_skepticism",
        label: "AI / Bot Skepticism",
        regex: /(ai\s*ho|robot|computer|machine|real\s*person|insaan|asli\s*insaan|recorded|automated|bot\s*ho)/i
      },
      {
        category: "competitor",
        label: "Existing Provider / Competitor",
        regex: /(already\s*using|pehle\s*se|kisi\s*aur\s*se|dusra\s*software|dusri\s*service|already\s*have|vendor)/i
      },
      {
        category: "authority",
        label: "Authority / Gatekeeper Escalation",
        regex: /(boss\s*se|owner\s*se|sir\s*se|decision\s*maker|papa\s*se|kisi\s*aur\s*ka\s*phone|puchna\s*padega)/i
      }
    ];
    for (const turn of leadTurns) {
      for (const p of patterns) {
        if (p.regex.test(turn.text)) {
          objections.push({
            category: p.category,
            label: p.label,
            detectedText: turn.text,
            speaker: "lead",
            turnId: turn.id,
            confidence: 0.92
          });
        }
      }
    }
    return objections;
  }
  /**
   * 4. Buying Signal & High Intent Detection
   */
  detectBuyingSignals(transcript, extractedVars) {
    const signals = [];
    const leadTurns = transcript.filter((t) => t.speaker === "lead");
    for (const turn of leadTurns) {
      const text = turn.text.toLowerCase();
      if (/(whatsapp|whats\s*app|details\s*bhejo|bhej\s*do|bhejiye|pdf|catalogue|brochure|message\s*karo)/i.test(text)) {
        signals.push({
          type: "whatsapp_request",
          label: "Requested WhatsApp Documentation & Pricing",
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.96
        });
      }
      if (/(demo|sample|trial|dikhao|dekhna\s*hai|meeting|schedule|presentation)/i.test(text)) {
        signals.push({
          type: "demo_request",
          label: "Requested Live Product Demonstration",
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.94
        });
      }
      if (/(interested|haan\s*interest|bilkul|sure|sahi\s*hai|acha\s*laga|achha\s*laga|aur\s*batao|theek\s*hai)/i.test(text)) {
        signals.push({
          type: "affirmative_interest",
          label: "Expressed Explicit Business Interest",
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.95
        });
      }
      if (/(haan|bol\s*raha\s*hoon|speaking|yes\s*speaking|ji\s*haan)/i.test(text) && signals.length === 0) {
        signals.push({
          type: "contact_verification",
          label: "Confirmed Target Identity",
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.9
        });
      }
    }
    if (extractedVars.interest_level === "interested" && !signals.some((s) => s.type === "affirmative_interest")) {
      signals.push({
        type: "affirmative_interest",
        label: "Sarvam AI Flagged High Purchase Intent",
        detectedText: extractedVars.call_summary || "Customer expressed positive interest during conversation.",
        turnId: "sarvam_summary",
        confidence: 0.95
      });
    }
    if (extractedVars.follow_up_preference === "whatsapp_details" && !signals.some((s) => s.type === "whatsapp_request")) {
      signals.push({
        type: "whatsapp_request",
        label: "WhatsApp Follow-Up Preference Recorded",
        detectedText: "Preferred follow-up via WhatsApp details.",
        turnId: "sarvam_follow_up",
        confidence: 0.98
      });
    }
    return signals;
  }
  /**
   * 5. Sentiment Trajectory Analysis (Opening -> Pitch -> Closing)
   */
  computeSentimentTrajectory(transcript, extractedVars) {
    if (transcript.length === 0) {
      return {
        overallSentiment: "neutral",
        overallScore: 0,
        trajectoryTrend: "neutral",
        phases: []
      };
    }
    const turnsCount = transcript.length;
    const openingEnd = Math.max(1, Math.floor(turnsCount * 0.33));
    const pitchEnd = Math.max(openingEnd + 1, Math.floor(turnsCount * 0.67));
    const openingTurns = transcript.slice(0, openingEnd);
    const pitchTurns = transcript.slice(openingEnd, pitchEnd);
    const closingTurns = transcript.slice(pitchEnd);
    const scorePhase = (phase, turns) => {
      const combined = turns.map((t) => t.text).join(" ").toLowerCase();
      let positiveMarkers = (combined.match(/(shukriya|शुक्रिया|achha|acha|great|interested|sure|haan|हाँ|bhejo|sahi|wah|good|whatsapp|शुभ|धन्यवाद|thanks)/gi) || []).length;
      let negativeMarkers = (combined.match(/(nahi|नहीं|busy|mat|not|fursat|wrong|disconnect|bekaar)/gi) || []).length;
      let score = 0;
      let sentiment = "neutral";
      if (positiveMarkers > negativeMarkers) {
        score = Math.min(1, 0.4 + (positiveMarkers - negativeMarkers) * 0.2);
        sentiment = "positive";
      } else if (negativeMarkers > positiveMarkers) {
        score = Math.max(-1, -0.4 - (negativeMarkers - positiveMarkers) * 0.2);
        sentiment = "negative";
      } else if (turns.length === 0 || turns.every((t) => t.speaker === "agent")) {
        score = 0;
        sentiment = "hesitant";
      }
      return {
        phase,
        sentiment,
        score: Number(score.toFixed(2)),
        snippet: turns.length > 0 ? turns[turns.length - 1].text.slice(0, 80) : void 0
      };
    };
    const phases = [
      scorePhase("opening", openingTurns),
      scorePhase("pitch", pitchTurns),
      scorePhase("closing", closingTurns)
    ];
    if (extractedVars.interest_level === "interested") {
      if (phases[1]) {
        phases[1].score = Math.max(phases[1].score, 0.8);
        phases[1].sentiment = "positive";
      }
      if (phases[2]) {
        phases[2].score = Math.max(phases[2].score, 0.9);
        phases[2].sentiment = "positive";
      }
    }
    let overallScore = phases.reduce((acc, p) => acc + p.score, 0) / phases.length;
    if (extractedVars.interest_level === "interested") {
      overallScore = Math.max(overallScore, 0.85);
    } else if (extractedVars.interest_level === "not_interested") {
      overallScore = Math.min(overallScore, -0.6);
    }
    let overallSentiment = "neutral";
    if (overallScore > 0.2) overallSentiment = "positive";
    else if (overallScore < -0.2) overallSentiment = "negative";
    let trajectoryTrend = "neutral";
    if (phases[0].score >= 0.3 && phases[2].score >= 0.5) {
      trajectoryTrend = "consistently_positive";
    } else if (phases[2].score > phases[0].score && phases[2].score > 0.3) {
      trajectoryTrend = "ascending";
    } else if (phases[2].score < phases[0].score && phases[2].score < 0) {
      trajectoryTrend = "descending";
    } else if (transcript.every((t) => t.speaker === "agent")) {
      trajectoryTrend = "disengaged";
    }
    return {
      overallSentiment,
      overallScore: Number(overallScore.toFixed(2)),
      trajectoryTrend,
      phases
    };
  }
  /**
   * 6. Next Best Action Generator
   */
  generateNextBestAction(call, buyingSignals, objections, extractedVars) {
    const leadName = extractedVars.user_name || "Customer";
    if (extractedVars.follow_up_preference === "whatsapp_details" || buyingSignals.some((s) => s.type === "whatsapp_request")) {
      return {
        actionTitle: `Dispatch WhatsApp Demo & One-Pager to ${leadName}`,
        actionType: "dispatch_whatsapp",
        priority: "urgent",
        suggestedMessage: `Namaste ${leadName} ji, thank you for speaking with Fluid.live! As requested, here is our 1-minute video demo and enterprise pricing brochure for AI Voice Calling. Let us know if you would like to test a sample workflow!`
      };
    }
    if (extractedVars.follow_up_preference === "callback" || buyingSignals.some((s) => s.type === "demo_request")) {
      return {
        actionTitle: `Schedule Solution Architect Live Demo with ${leadName}`,
        actionType: "book_demo",
        priority: "high",
        suggestedMessage: `Namaste ${leadName} ji, following our conversation, our team would love to show you how Fluid.live automates 10,000+ customer calls daily. When is a convenient time for a 10-minute walkthrough?`
      };
    }
    if (objections.some((o) => o.category === "timing")) {
      return {
        actionTitle: `Auto-Schedule Follow-up Call for ${leadName}`,
        actionType: "schedule_callback",
        priority: "medium",
        suggestedMessage: `Namaste ${leadName} ji, sorry to have caught you at a busy moment! We will reach out again tomorrow at a better time. Have a wonderful day ahead!`
      };
    }
    if (extractedVars.interest_level === "not_interested" || call.outcome === "not_interested") {
      return {
        actionTitle: `Mark Lead as Unqualified & Suppress Dialer`,
        actionType: "suppress",
        priority: "low"
      };
    }
    if (call.durationSeconds > 0 && (!call.transcript || call.transcript.length <= 1)) {
      return {
        actionTitle: `Re-queue for Secondary Afternoon Calling Slot`,
        actionType: "re_queue",
        priority: "medium"
      };
    }
    return {
      actionTitle: `Log Interaction & Review Call Recording`,
      actionType: "escalate_human",
      priority: "medium"
    };
  }
};
var callAnalyticsService = new CallAnalyticsService();

// server/services/callService.ts
var ServerCallService = class {
  async getCalls(options = {}) {
    const calls = await callRepository.getCalls(options);
    return calls.map((call) => {
      if (call.durationSeconds > 0 && !call.extractedVariables?.intelligence) {
        call.extractedVariables.intelligence = callAnalyticsService.analyzeCall(call);
      }
      return call;
    });
  }
  async getCallById(id) {
    const call = await callRepository.getCallById(id);
    if (call && call.durationSeconds > 0 && !call.extractedVariables?.intelligence) {
      call.extractedVariables.intelligence = callAnalyticsService.analyzeCall(call);
    }
    return call;
  }
  async initiateTestCall(dto) {
    if (!dto.agentVersionId || !dto.phoneNumberId || !dto.toPhoneNumber) {
      throw new Error("agentVersionId, phoneNumberId, and toPhoneNumber are required.");
    }
    const agentVersion = await prisma_default.agentVersion.findUnique({
      where: { id: dto.agentVersionId },
      include: { agent: true }
    });
    if (!agentVersion) {
      throw new Error(`AgentVersion not found: ${dto.agentVersionId}`);
    }
    const phoneNumber = await prisma_default.phoneNumber.findUnique({
      where: { id: dto.phoneNumberId }
    });
    if (!phoneNumber) {
      throw new Error(`PhoneNumber not found: ${dto.phoneNumberId}`);
    }
    if (agentVersion.agent.businessId && phoneNumber.businessId && agentVersion.agent.businessId !== phoneNumber.businessId) {
      throw new Error(`Tenant authorization failed: Agent business (${agentVersion.agent.businessId}) does not match PhoneNumber business (${phoneNumber.businessId}).`);
    }
    let leadId = dto.leadId;
    if (!leadId) {
      const firstLead = await prisma_default.lead.findFirst();
      if (!firstLead) throw new Error("No lead available to initiate test call.");
      leadId = firstLead.id;
    }
    const lead = await prisma_default.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }
    const mapping = await backendSarvamProvider.syncAgentConfig(
      agentVersion.agentId,
      agentVersion.id,
      agentVersion.config
    );
    const config = agentVersion.config || {};
    const result = await backendSarvamProvider.initiateOutboundCall({
      agentVersionId: agentVersion.id,
      sarvamAgentId: config.sarvamAppId || mapping.sarvamAgentId,
      connectionId: config.sarvamConnectionId || phoneNumber.providerId || void 0,
      fromPhoneNumber: phoneNumber.phoneNumber,
      toPhoneNumber: dto.toPhoneNumber,
      leadId: lead.id,
      userName: dto.userName || lead.name,
      initialBotMessage: config.firstGreeting || config.openingLine,
      outroMessage: config.closingBehavior || config.outroMessage,
      systemPrompt: config.systemPrompt
    });
    return await callRepository.createCall({
      externalCallId: result.providerCallId,
      campaignId: null,
      // Standalone test call
      agentId: agentVersion.agentId,
      agentVersionId: agentVersion.id,
      leadId: lead.id,
      phoneNumberId: phoneNumber.id,
      status: "initiated"
    });
  }
  async fetchTranscriptForCall(callId) {
    const call = await callRepository.getCallById(callId);
    if (!call) {
      throw new Error(`Call record not found: ${callId}`);
    }
    let lookupId = call.extractedVariables?._sarvam_interaction_id || call.externalCallId;
    const transcriptData = await backendSarvamProvider.fetchCallTranscript(lookupId, void 0, call.startedAt);
    if (transcriptData) {
      const rawMessages = transcriptData.messages || transcriptData.turns || transcriptData.transcript || (Array.isArray(transcriptData) ? transcriptData : []);
      const formattedTranscript = rawMessages.map((msg, index) => ({
        id: `t_${index + 1}`,
        speaker: msg.role === "assistant" || msg.role === "agent" || msg.speaker === "agent" ? "agent" : "lead",
        text: msg.content || msg.text || msg.en_text || msg.indic_text || "",
        timestampSeconds: msg.timestampSeconds || (index + 1) * 4
      }));
      const rawVars = transcriptData.extracted_variables || transcriptData.agent_variables || {};
      const durationSecs = Math.round(transcriptData.duration ?? transcriptData.duration_in_seconds ?? call.durationSeconds ?? 0);
      const durationMins = Number((durationSecs / 60).toFixed(2));
      const providerCost = Number((durationMins * 0.05).toFixed(3));
      const platformCost = Number((durationMins * 0.08).toFixed(3));
      let outcome = call.outcome || "successful_contact";
      if (durationSecs === 0) {
        outcome = "unreachable";
      } else if (rawVars.interest_level === "interested") {
        outcome = rawVars.follow_up_preference === "callback" ? "callback_requested" : "successful_contact";
      } else if (rawVars.interest_level === "not_interested") {
        outcome = "not_interested";
      } else if (rawVars.verification_status === "incomplete" && transcriptData.goal_overall_status === "failed") {
        outcome = "not_interested";
      } else if (durationSecs > 0) {
        outcome = "successful_contact";
      }
      const status = durationSecs > 0 || formattedTranscript.length > 0 ? "completed" : outcome === "unreachable" ? "failed" : "completed";
      const extractedVars = {
        ...call.extractedVariables || {},
        ...rawVars,
        ...transcriptData.real_interaction_id ? { _sarvam_interaction_id: transcriptData.real_interaction_id } : {}
      };
      const callForAnalytics = {
        ...call,
        status,
        outcome,
        durationSeconds: durationSecs,
        transcript: formattedTranscript,
        extractedVariables: extractedVars
      };
      const intelligence = callAnalyticsService.analyzeCall(callForAnalytics);
      extractedVars.intelligence = intelligence;
      await prisma_default.call.update({
        where: { id: call.id },
        data: {
          status,
          outcome,
          durationSeconds: durationSecs,
          transcript: formattedTranscript,
          extractedVariables: extractedVars
        }
      });
      if (durationSecs > 0) {
        try {
          await prisma_default.usageEvent.create({
            data: {
              id: `usg_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
              callId: call.id,
              campaignId: call.campaignId || null,
              agentId: call.agentId,
              durationMinutes: durationMins,
              providerCostUnits: providerCost,
              platformCostUnits: platformCost,
              timestamp: /* @__PURE__ */ new Date()
            }
          });
        } catch (e) {
          console.warn("UsageEvent creation skipped or already exists:", e?.message);
        }
      }
      call.status = status;
      call.outcome = outcome;
      call.durationSeconds = durationSecs;
      call.transcript = formattedTranscript;
      call.extractedVariables = extractedVars;
      if (durationSecs > 0 && r2StorageService.isConfigured()) {
        this.getCallAudio(call.id).catch((err) => {
          console.warn("[CallService] Proactive R2 background audio archive failed:", err?.message);
        });
      }
    }
    return { call, transcriptData };
  }
  async getCallAudio(callId) {
    const call = await callRepository.getCallById(callId);
    if (!call) return null;
    if (r2StorageService.isConfigured()) {
      const r2Audio = await r2StorageService.getCallAudio(call.id);
      if (r2Audio) {
        return r2Audio;
      }
    }
    let interactionId = call.extractedVariables?._sarvam_interaction_id;
    if (!interactionId) {
      if (call.externalCallId && call.externalCallId.includes("/")) {
        interactionId = call.externalCallId;
      } else {
        const resolved = await backendSarvamProvider.resolveInteractionId(call.externalCallId, void 0, call.startedAt);
        if (resolved) {
          interactionId = resolved.interactionId;
          try {
            await prisma_default.call.update({
              where: { id: call.id },
              data: {
                extractedVariables: {
                  ...call.extractedVariables || {},
                  _sarvam_interaction_id: interactionId
                }
              }
            });
          } catch (e) {
          }
        }
      }
    }
    if (!interactionId) {
      return null;
    }
    const audioData = await backendSarvamProvider.fetchCallRecording(interactionId);
    if (audioData && r2StorageService.isConfigured()) {
      r2StorageService.uploadCallAudio(call.id, audioData.buffer, audioData.contentType).then((uploadResult) => {
        if (uploadResult) {
          prisma_default.call.update({
            where: { id: call.id },
            data: {
              extractedVariables: {
                ...call.extractedVariables || {},
                _r2_audio_key: uploadResult.key,
                ...uploadResult.url ? { _r2_audio_url: uploadResult.url } : {}
              }
            }
          }).catch((e) => console.warn("Failed to update call with R2 key:", e?.message));
        }
      }).catch((err) => console.warn("R2 background archive failed:", err?.message));
    }
    return audioData;
  }
};
var serverCallService = new ServerCallService();

// server/routes/callRoutes.ts
var callRoutes = Router4();
callRoutes.get("/storage/status", (req, res) => {
  res.json({
    success: true,
    data: r2StorageService.getStorageStatus(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
callRoutes.get("/", async (req, res) => {
  try {
    const { search, status, outcome, campaignId, agentId } = req.query;
    const calls = await serverCallService.getCalls({
      search,
      status,
      outcome,
      campaignId,
      agentId
    });
    res.json({ success: true, data: calls, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
callRoutes.post("/test", async (req, res) => {
  try {
    const call = await serverCallService.initiateTestCall(req.body);
    res.status(201).json({ success: true, data: call, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message || "Test call initiation failed", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
callRoutes.get("/:id/transcript", async (req, res) => {
  try {
    const result = await serverCallService.fetchTranscriptForCall(req.params.id);
    res.json({ success: true, data: result, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
callRoutes.get("/:id/audio", async (req, res) => {
  try {
    const audioData = await serverCallService.getCallAudio(req.params.id);
    if (!audioData) {
      return res.status(404).json({
        success: false,
        error: "Call recording audio not found or not yet available for this call.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    res.setHeader("Content-Type", audioData.contentType || "audio/wav");
    res.setHeader("Content-Length", audioData.buffer.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(audioData.buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
callRoutes.get("/:id", async (req, res) => {
  try {
    const call = await serverCallService.getCallById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, error: "Call record not found", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    res.json({ success: true, data: call, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/phoneRoutes.ts
import { Router as Router5 } from "express";

// server/repositories/phoneRepository.ts
var PhoneRepository = class {
  async getPhoneNumbers() {
    const list = await prisma_default.phoneNumber.findMany({
      orderBy: { createdAt: "desc" }
    });
    return list.map((n) => ({
      id: n.id,
      phoneNumber: n.phoneNumber,
      status: n.status,
      provider: n.provider,
      providerId: n.providerId || void 0,
      assignedAgentId: n.assignedAgentId || void 0,
      assignedCampaignId: n.assignedCampaignId || void 0,
      createdAt: n.createdAt.toISOString()
    }));
  }
  /**
   * Adds or links a real Sarvam Telephony line (e.g. +917965480599 with SIP Connection ID).
   */
  async addPhoneNumber(data) {
    let cleanPhone = data.phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone.startsWith("+")) {
      cleanPhone = `+${cleanPhone}`;
    }
    const providerId = data.connectionId?.trim() || backendSarvamProvider.getConnectionId();
    const providerName = data.provider?.trim() || "Sarvam AI Telephony (SIP Trunk)";
    const status = data.assignedAgentId ? "active" : "unassigned";
    const existing = await prisma_default.phoneNumber.findUnique({
      where: { phoneNumber: cleanPhone }
    });
    let record;
    if (existing) {
      record = await prisma_default.phoneNumber.update({
        where: { id: existing.id },
        data: {
          provider: providerName,
          providerId,
          assignedAgentId: data.assignedAgentId || existing.assignedAgentId,
          status: data.assignedAgentId ? "active" : existing.status
        }
      });
    } else {
      record = await prisma_default.phoneNumber.create({
        data: {
          phoneNumber: cleanPhone,
          status,
          provider: providerName,
          providerId,
          assignedAgentId: data.assignedAgentId || null
        }
      });
    }
    return {
      id: record.id,
      phoneNumber: record.phoneNumber,
      status: record.status,
      provider: record.provider,
      providerId: record.providerId || void 0,
      assignedAgentId: record.assignedAgentId || void 0,
      createdAt: record.createdAt.toISOString()
    };
  }
  /**
   * Automatically synchronizes the active Sarvam Telephony line configured on the account.
   */
  async syncSarvamPhoneNumber() {
    const activeNumber = backendSarvamProvider.getAgentPhoneNumber();
    const activeConnectionId = backendSarvamProvider.getConnectionId();
    const primaryAgent = await prisma_default.agent.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "asc" }
    });
    return this.addPhoneNumber({
      phoneNumber: activeNumber,
      connectionId: activeConnectionId,
      provider: "Sarvam AI Telephony (SIP Trunk)",
      assignedAgentId: primaryAgent?.id
    });
  }
  /**
   * Unlinks and deletes a phone number from the registry.
   */
  async deletePhoneNumber(id) {
    const runningCampaign = await prisma_default.campaign.findFirst({
      where: { phoneNumberId: id, status: "running" }
    });
    if (runningCampaign) {
      throw new Error(`Cannot delete phone number: It is currently locked by active campaign "${runningCampaign.name}".`);
    }
    await prisma_default.phoneNumber.delete({
      where: { id }
    });
    return true;
  }
  async bindNumberToAgent(phoneId, agentId) {
    const updated = await prisma_default.phoneNumber.update({
      where: { id: phoneId },
      data: {
        assignedAgentId: agentId || null,
        status: agentId ? "active" : "unassigned"
      }
    });
    return {
      id: updated.id,
      phoneNumber: updated.phoneNumber,
      status: updated.status,
      provider: updated.provider,
      providerId: updated.providerId || void 0,
      assignedAgentId: updated.assignedAgentId || void 0,
      createdAt: updated.createdAt.toISOString()
    };
  }
  // Deprecated shim for backward compatibility
  async provisionNumber(areaCode = "800") {
    return this.syncSarvamPhoneNumber();
  }
};
var phoneRepository = new PhoneRepository();

// server/services/phoneService.ts
var ServerPhoneService = class {
  async getPhoneNumbers() {
    return phoneRepository.getPhoneNumbers();
  }
  async addPhoneNumber(data) {
    return phoneRepository.addPhoneNumber(data);
  }
  async syncSarvamPhoneNumber() {
    return phoneRepository.syncSarvamPhoneNumber();
  }
  async deletePhoneNumber(id) {
    return phoneRepository.deletePhoneNumber(id);
  }
  async bindNumberToAgent(phoneId, agentId) {
    return phoneRepository.bindNumberToAgent(phoneId, agentId);
  }
  async provisionNumber(areaCode = "800") {
    return phoneRepository.provisionNumber(areaCode);
  }
};
var serverPhoneService = new ServerPhoneService();

// server/routes/phoneRoutes.ts
var phoneRoutes = Router5();
phoneRoutes.get("/", async (req, res) => {
  try {
    const numbers = await serverPhoneService.getPhoneNumbers();
    res.json({ success: true, data: numbers, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
phoneRoutes.post("/", async (req, res) => {
  try {
    const { phoneNumber, connectionId, provider, assignedAgentId, areaCode } = req.body;
    let number;
    if (phoneNumber) {
      number = await serverPhoneService.addPhoneNumber({
        phoneNumber,
        connectionId,
        provider,
        assignedAgentId
      });
    } else {
      number = await serverPhoneService.provisionNumber(areaCode);
    }
    res.status(201).json({ success: true, data: number, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
phoneRoutes.post("/sync", async (req, res) => {
  try {
    const number = await serverPhoneService.syncSarvamPhoneNumber();
    res.json({
      success: true,
      data: number,
      message: "Active Sarvam Telephony line synchronized successfully.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
phoneRoutes.patch("/:id", async (req, res) => {
  try {
    const { assignedAgentId } = req.body;
    const number = await serverPhoneService.bindNumberToAgent(req.params.id, assignedAgentId);
    res.json({ success: true, data: number, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
phoneRoutes.delete("/:id", async (req, res) => {
  try {
    await serverPhoneService.deletePhoneNumber(req.params.id);
    res.json({
      success: true,
      message: "Phone number unlinked successfully.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/knowledgeRoutes.ts
import { Router as Router6 } from "express";

// server/repositories/knowledgeRepository.ts
var KnowledgeRepository = class {
  async getKnowledgeBases() {
    const list = await prisma_default.knowledgeBase.findMany({
      include: { documents: true },
      orderBy: { createdAt: "desc" }
    });
    return list.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      documentCount: k.documents.length,
      assignedAgentIds: [],
      createdAt: k.createdAt.toISOString()
    }));
  }
  async getDocuments(knowledgeBaseId) {
    const list = await prisma_default.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      orderBy: { uploadedAt: "desc" }
    });
    return list.map((d) => ({
      id: d.id,
      knowledgeBaseId: d.knowledgeBaseId,
      fileName: d.fileName,
      fileSize: d.fileSize,
      status: d.status,
      error: d.error || void 0,
      uploadedAt: d.uploadedAt.toISOString()
    }));
  }
  async createKnowledgeBase(name, description) {
    const created = await prisma_default.knowledgeBase.create({
      data: {
        name,
        description,
        documentCount: 0
      }
    });
    return {
      id: created.id,
      name: created.name,
      description: created.description,
      documentCount: 0,
      assignedAgentIds: [],
      createdAt: created.createdAt.toISOString()
    };
  }
  async uploadDocument(knowledgeBaseId, file) {
    return await prisma_default.$transaction(async (tx) => {
      const doc = await tx.knowledgeDocument.create({
        data: {
          knowledgeBaseId,
          fileName: file.fileName,
          fileSize: file.fileSize,
          status: "ready"
        }
      });
      await tx.knowledgeBase.update({
        where: { id: knowledgeBaseId },
        data: { documentCount: { increment: 1 } }
      });
      return {
        id: doc.id,
        knowledgeBaseId: doc.knowledgeBaseId,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        uploadedAt: doc.uploadedAt.toISOString()
      };
    });
  }
};
var knowledgeRepository = new KnowledgeRepository();

// server/services/knowledgeService.ts
var ServerKnowledgeService = class {
  async getKnowledgeBases() {
    return knowledgeRepository.getKnowledgeBases();
  }
  async getDocuments(knowledgeBaseId) {
    return knowledgeRepository.getDocuments(knowledgeBaseId);
  }
  async createKnowledgeBase(name, description) {
    return knowledgeRepository.createKnowledgeBase(name, description);
  }
  async uploadDocument(knowledgeBaseId, file) {
    return knowledgeRepository.uploadDocument(knowledgeBaseId, file);
  }
};
var serverKnowledgeService = new ServerKnowledgeService();

// server/routes/knowledgeRoutes.ts
var knowledgeRoutes = Router6();
knowledgeRoutes.get("/", async (req, res) => {
  try {
    const bases = await serverKnowledgeService.getKnowledgeBases();
    res.json({ success: true, data: bases, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
knowledgeRoutes.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    const kb = await serverKnowledgeService.createKnowledgeBase(name, description);
    res.status(201).json({ success: true, data: kb, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
knowledgeRoutes.get("/:id/documents", async (req, res) => {
  try {
    const docs = await serverKnowledgeService.getDocuments(req.params.id);
    res.json({ success: true, data: docs, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
knowledgeRoutes.post("/:id/documents", async (req, res) => {
  try {
    const { fileName, fileSize } = req.body;
    const doc = await serverKnowledgeService.uploadDocument(req.params.id, { fileName, fileSize });
    res.status(201).json({ success: true, data: doc, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/billingRoutes.ts
import { Router as Router7 } from "express";

// server/repositories/billingRepository.ts
var BillingRepository = class {
  async getUsageEvents(campaignId) {
    const where = {};
    if (campaignId && campaignId !== "all") {
      where.campaignId = campaignId;
    }
    const list = await prisma_default.usageEvent.findMany({
      where,
      orderBy: { timestamp: "desc" }
    });
    if (list.length > 0) {
      return list.map((u) => ({
        id: u.id,
        callId: u.callId || "",
        campaignId: u.campaignId,
        agentId: u.agentId,
        durationMinutes: u.durationMinutes,
        providerCostUnits: u.providerCostUnits,
        platformCostUnits: u.platformCostUnits,
        timestamp: u.timestamp.toISOString()
      }));
    }
    const callWhere = {};
    if (campaignId && campaignId !== "all") {
      callWhere.campaignId = campaignId;
    }
    const calls = await prisma_default.call.findMany({
      where: callWhere,
      orderBy: { startedAt: "desc" }
    });
    return calls.map((c) => {
      const durationMinutes = Number(((c.durationSeconds || 0) / 60).toFixed(2));
      return {
        id: `usg_${c.id}`,
        callId: c.id,
        campaignId: c.campaignId || null,
        agentId: c.agentId,
        durationMinutes,
        providerCostUnits: Number((durationMinutes * 1).toFixed(2)),
        platformCostUnits: Number((durationMinutes * 0.5).toFixed(2)),
        timestamp: c.startedAt.toISOString()
      };
    });
  }
  async getCurrentBillingPeriod() {
    const calls = await prisma_default.call.findMany();
    const totalCallsCount = calls.length;
    const totalSeconds = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const totalMinutesUsed = Number((totalSeconds / 60).toFixed(1));
    const providerCostTotal = Number((totalMinutesUsed * 1).toFixed(2));
    const platformCostTotal = Number((totalMinutesUsed * 0.5).toFixed(2));
    const estimatedTotalCost = Number((providerCostTotal + platformCostTotal).toFixed(2));
    const now = /* @__PURE__ */ new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const periodName = `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
    const invoiceSuffix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sarvamGst = Number((providerCostTotal * 0.18).toFixed(2));
    const sarvamInvoice = {
      invoiceNumber: `SRV-INV-${invoiceSuffix}`,
      issuer: "Sarvam AI Technologies Pvt. Ltd.",
      billingEntity: "Fluid.live Infrastructure Trunk",
      settlementMethod: "Pre-funded Sarvam Telephony Wallet (api.sarvam.ai)",
      period: periodName,
      subtotal: providerCostTotal,
      taxGst: sarvamGst,
      total: Number((providerCostTotal + sarvamGst).toFixed(2)),
      status: "current",
      lineItems: [
        {
          id: "li_srv_1",
          name: "Outbound SIP Trunk Telephony & Audio Streaming",
          category: "telephony",
          unitRate: "\u20B90.60 / min",
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: Number((totalMinutesUsed * 0.6).toFixed(2))
        },
        {
          id: "li_srv_2",
          name: "Sarvam Saaras Real-Time Speech-to-Text (Indic ASR)",
          category: "telephony",
          unitRate: "\u20B90.30 / min",
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: Number((totalMinutesUsed * 0.3).toFixed(2))
        },
        {
          id: "li_srv_3",
          name: "Sarvam Bulbul Speech Synthesis (Natural Indic TTS)",
          category: "telephony",
          unitRate: "\u20B90.10 / min",
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: Number((totalMinutesUsed * 0.1).toFixed(2))
        }
      ]
    };
    const platformSubtotal = platformCostTotal;
    const platformGst = Number((platformSubtotal * 0.18).toFixed(2));
    const platformInvoice = {
      invoiceNumber: `FLD-INV-${invoiceSuffix}`,
      issuer: "Fluid.live Technologies",
      billingEntity: "Fluid.live Enterprise Client Account",
      settlementMethod: "Fluid.live Platform Usage Billing",
      period: periodName,
      subtotal: platformSubtotal,
      taxGst: platformGst,
      total: Number((platformSubtotal + platformGst).toFixed(2)),
      status: "current",
      lineItems: [
        {
          id: "li_fld_1",
          name: "Dashboard Campaign Orchestration & State Machine",
          category: "platform",
          unitRate: "\u20B90.50 / min",
          quantity: `${totalMinutesUsed.toFixed(1)} mins`,
          amount: platformCostTotal
        }
      ]
    };
    return {
      id: `bp_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`,
      periodName,
      startDate: startOfMonth,
      endDate: endOfMonth,
      totalMinutesUsed,
      totalCallsCount,
      estimatedTotalCost,
      providerCostTotal,
      platformCostTotal,
      status: "current",
      sarvamInvoice,
      platformInvoice
    };
  }
  async getBillingHistory() {
    const current = await this.getCurrentBillingPeriod();
    const pastPeriods = await prisma_default.billingPeriod.findMany({
      where: { status: { not: "current" } },
      orderBy: { startDate: "desc" }
    });
    return [
      current,
      ...pastPeriods.map((bp) => ({
        id: bp.id,
        periodName: bp.periodName,
        startDate: bp.startDate.toISOString(),
        endDate: bp.endDate.toISOString(),
        totalMinutesUsed: bp.totalMinutesUsed,
        totalCallsCount: bp.totalCallsCount,
        estimatedTotalCost: bp.estimatedTotalCost,
        providerCostTotal: bp.providerCostTotal,
        platformCostTotal: bp.platformCostTotal,
        status: bp.status
      }))
    ];
  }
};
var billingRepository = new BillingRepository();

// server/services/billingService.ts
var ServerBillingService = class {
  async getUsageEvents(campaignId) {
    return billingRepository.getUsageEvents(campaignId);
  }
  async getCurrentBillingPeriod() {
    return billingRepository.getCurrentBillingPeriod();
  }
  async getBillingHistory() {
    return billingRepository.getBillingHistory();
  }
};
var serverBillingService = new ServerBillingService();

// server/routes/billingRoutes.ts
var billingRoutes = Router7();
billingRoutes.get("/usage", async (req, res) => {
  try {
    const { campaignId } = req.query;
    const events = await serverBillingService.getUsageEvents(campaignId);
    res.json({ success: true, data: events, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
billingRoutes.get("/billing/current", async (req, res) => {
  try {
    const current = await serverBillingService.getCurrentBillingPeriod();
    res.json({ success: true, data: current, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
billingRoutes.get("/billing/history", async (req, res) => {
  try {
    const history = await serverBillingService.getBillingHistory();
    res.json({ success: true, data: history, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/dashboardRoutes.ts
import { Router as Router8 } from "express";

// server/repositories/dashboardRepository.ts
var DashboardRepository = class {
  async getMetrics() {
    const [totalLeads, untouchedLeads, campaignsBuilt, callsAttempted, completedCallsCount, billing, activeCalls] = await Promise.all([
      prisma_default.lead.count(),
      prisma_default.lead.count({
        where: {
          OR: [
            { campaignLeads: { none: {} } },
            { campaignLeads: { some: { status: "untouched" } } }
          ]
        }
      }),
      prisma_default.campaign.count(),
      prisma_default.call.count(),
      prisma_default.call.count({ where: { status: "completed" } }),
      billingRepository.getCurrentBillingPeriod(),
      prisma_default.call.findMany({
        where: { durationSeconds: { gt: 0 } }
      })
    ]);
    const completionRate = callsAttempted > 0 ? Number((completedCallsCount / callsAttempted * 100).toFixed(1)) : 0;
    let totalQaScore = 0;
    let totalAgentTalkPct = 0;
    let totalLeadTalkPct = 0;
    let positiveSentimentCalls = 0;
    let highIntentCalls = 0;
    const objectionsMap = /* @__PURE__ */ new Map();
    const buyingSignalsMap = /* @__PURE__ */ new Map();
    for (const rawCall of activeCalls) {
      const callObj = {
        ...rawCall,
        startedAt: rawCall.startedAt.toISOString(),
        endedAt: rawCall.endedAt ? rawCall.endedAt.toISOString() : void 0,
        transcript: rawCall.transcript || [],
        extractedVariables: rawCall.extractedVariables || {}
      };
      const intelligence = callObj.extractedVariables?.intelligence || callAnalyticsService.analyzeCall(callObj);
      totalQaScore += intelligence.qaScorecard.overallScore;
      totalAgentTalkPct += intelligence.talkToListen.agentTalkPercentage;
      totalLeadTalkPct += intelligence.talkToListen.leadTalkPercentage;
      if (intelligence.sentimentTrajectory.overallSentiment === "positive") {
        positiveSentimentCalls += 1;
      }
      if (intelligence.buyingSignals.length > 0) {
        highIntentCalls += 1;
      }
      for (const obj of intelligence.objections) {
        objectionsMap.set(obj.label, (objectionsMap.get(obj.label) || 0) + 1);
      }
      for (const sig of intelligence.buyingSignals) {
        buyingSignalsMap.set(sig.label, (buyingSignalsMap.get(sig.label) || 0) + 1);
      }
    }
    const n = activeCalls.length || 1;
    const avgQaScore = activeCalls.length > 0 ? Math.round(totalQaScore / n) : 100;
    const avgTalkListenRatio = {
      agentPct: activeCalls.length > 0 ? Math.round(totalAgentTalkPct / n) : 55,
      leadPct: activeCalls.length > 0 ? Math.round(totalLeadTalkPct / n) : 45
    };
    const positiveSentimentRate = activeCalls.length > 0 ? Math.round(positiveSentimentCalls / n * 100) : 0;
    const highIntentLeadRate = activeCalls.length > 0 ? Math.round(highIntentCalls / n * 100) : 0;
    const topObjections = Array.from(objectionsMap.entries()).map(([label, count]) => ({ label, count, percentage: Math.round(count / n * 100) })).sort((a, b) => b.count - a.count);
    const topBuyingSignals = Array.from(buyingSignalsMap.entries()).map(([label, count]) => ({ label, count, percentage: Math.round(count / n * 100) })).sort((a, b) => b.count - a.count);
    const intelligenceSummary = {
      avgTalkListenRatio,
      avgQaScore,
      positiveSentimentRate,
      highIntentLeadRate,
      topObjections,
      topBuyingSignals
    };
    return {
      totalLeads,
      untouchedLeads,
      campaignsBuilt,
      callsAttempted,
      minutesUtilized: billing.totalMinutesUsed,
      leadsTrendPercentage: 0,
      untouchedTrendPercentage: 0,
      campaignsTrendPercentage: 0,
      callsTrendPercentage: completionRate,
      minutesTrendPercentage: 0,
      intelligenceSummary
    };
  }
  /**
   * Generates real daily call attempts and completions from actual Call records over the last 7 calendar days.
   */
  async getCallActivityChart() {
    const now = /* @__PURE__ */ new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const calls = await prisma_default.call.findMany({
      where: {
        startedAt: { gte: sevenDaysAgo }
      },
      orderBy: { startedAt: "asc" }
    });
    const daysMap = /* @__PURE__ */ new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1e3);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysMap.set(key, { attempts: 0, completed: 0 });
    }
    for (const call of calls) {
      const key = new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (daysMap.has(key)) {
        const entry = daysMap.get(key);
        entry.attempts += 1;
        if (call.status === "completed" || call.durationSeconds > 0) {
          entry.completed += 1;
        }
      }
    }
    return Array.from(daysMap.entries()).map(([date, data]) => ({
      date,
      attempts: data.attempts,
      completed: data.completed
    }));
  }
  /**
   * Dynamically compiles actual system activities from real Call, Campaign, and Agent database records.
   */
  async getRecentActivities() {
    const [recentCalls, recentCampaigns] = await Promise.all([
      prisma_default.call.findMany({
        take: 6,
        orderBy: { startedAt: "desc" },
        include: { lead: true, agent: true }
      }),
      prisma_default.campaign.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
        include: { agent: true }
      })
    ]);
    const activities = [];
    for (const call of recentCalls) {
      const leadName = call.lead?.name || "Customer";
      const outcomeText = call.outcome ? call.outcome.replace(/_/g, " ") : "initiated";
      activities.push({
        id: `act_${call.id}`,
        type: "call_completed",
        title: `Outbound Call ${call.status === "completed" ? "Completed" : "Initiated"} (${leadName})`,
        description: `Duration: ${call.durationSeconds}s \u2022 Outcome: ${outcomeText} \u2022 Provider ID: ${call.externalCallId.slice(0, 18)}...`,
        timestamp: call.startedAt.toISOString(),
        entityId: call.id
      });
    }
    for (const cmp of recentCampaigns) {
      activities.push({
        id: `act_${cmp.id}`,
        type: "campaign_started",
        title: `Campaign: ${cmp.name}`,
        description: `Agent: ${cmp.agent?.name || cmp.agentId} \u2022 Target Audience: ${cmp.totalLeads} lead(s) \u2022 Status: ${cmp.status}`,
        timestamp: cmp.createdAt.toISOString(),
        entityId: cmp.id
      });
    }
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, 8);
  }
};
var dashboardRepository = new DashboardRepository();

// server/services/dashboardService.ts
var ServerDashboardService = class {
  async getMetrics() {
    return dashboardRepository.getMetrics();
  }
  async getCallActivityChart() {
    return dashboardRepository.getCallActivityChart();
  }
  async getRecentActivities() {
    return dashboardRepository.getRecentActivities();
  }
  async getOverviewCampaigns() {
    return campaignRepository.getCampaigns();
  }
};
var serverDashboardService = new ServerDashboardService();

// server/repositories/businessRepository.ts
var BusinessRepository = class {
  async getBusinessProfile() {
    const biz = await prisma_default.business.findFirst();
    if (!biz) return null;
    return {
      id: biz.id,
      name: biz.name,
      email: biz.email,
      plan: biz.plan,
      timezone: biz.timezone,
      createdAt: biz.createdAt.toISOString()
    };
  }
  async updateBusinessProfile(id, updates) {
    const updated = await prisma_default.business.update({
      where: { id },
      data: {
        ...updates.name && { name: updates.name },
        ...updates.email && { email: updates.email },
        ...updates.plan && { plan: updates.plan },
        ...updates.timezone && { timezone: updates.timezone }
      }
    });
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      plan: updated.plan,
      timezone: updated.timezone,
      createdAt: updated.createdAt.toISOString()
    };
  }
};
var businessRepository = new BusinessRepository();

// server/routes/dashboardRoutes.ts
var dashboardRoutes = Router8();
dashboardRoutes.get(["/metrics", "/stats"], async (req, res) => {
  try {
    const metrics = await serverDashboardService.getMetrics();
    res.json({ success: true, data: metrics, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
dashboardRoutes.get("/activity", async (req, res) => {
  try {
    const activity = await serverDashboardService.getRecentActivities();
    res.json({ success: true, data: activity, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
dashboardRoutes.get("/chart", async (req, res) => {
  try {
    const chart = await serverDashboardService.getCallActivityChart();
    res.json({ success: true, data: chart, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
dashboardRoutes.get("/business", async (req, res) => {
  try {
    const biz = await businessRepository.getBusinessProfile();
    res.json({ success: true, data: biz, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/webhookRoutes.ts
import { Router as Router9 } from "express";

// server/repositories/webhookRepository.ts
var WebhookRepository = class {
  async getWebhookEvents() {
    const list = await prisma_default.webhookEvent.findMany({
      orderBy: { receivedAt: "desc" }
    });
    return list.map((e) => ({
      id: e.id,
      provider: e.provider,
      eventType: e.eventType,
      externalId: e.externalId,
      payload: e.payload || {},
      status: e.status,
      receivedAt: e.receivedAt.toISOString(),
      error: e.error || void 0
    }));
  }
  async processSarvamWebhook(payload) {
    const norm = backendSarvamProvider.normalizeWebhookPayload(payload);
    const receivedAt = /* @__PURE__ */ new Date();
    const dbEventId = `wh_evt_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    const existingEvent = await prisma_default.webhookEvent.findFirst({
      where: { externalId: norm.providerEventId, status: "processed" }
    });
    if (existingEvent) {
      await prisma_default.webhookEvent.create({
        data: {
          id: dbEventId,
          provider: "sarvam",
          eventType: norm.eventType,
          externalId: `dup_${norm.providerEventId}_${Date.now()}`,
          payload,
          status: "processed",
          receivedAt
        }
      });
      return {
        receivedEventId: dbEventId,
        externalId: norm.providerEventId,
        status: "duplicate_ignored",
        processedAt: receivedAt.toISOString()
      };
    }
    return await prisma_default.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          id: dbEventId,
          provider: "sarvam",
          eventType: norm.eventType,
          externalId: norm.providerEventId,
          payload,
          status: "processed",
          receivedAt,
          processedAt: receivedAt
        }
      });
      if (norm.externalCallId && norm.canonicalStatus !== "unknown") {
        const firstAgent = await tx.agent.findFirst();
        const firstLead = await tx.lead.findFirst();
        const firstPhone = await tx.phoneNumber.findFirst();
        const agentId = norm.agentId || firstAgent?.id || "ag_default";
        const agentVersionId = norm.agentVersionId || firstAgent?.currentVersionId || "agv_default";
        const leadId = norm.leadId || firstLead?.id || "lead_default";
        const phoneNumberId = firstPhone?.id || "phone_default";
        const campaignId = norm.campaignId || null;
        let existingCall = await tx.call.findUnique({
          where: { externalCallId: norm.externalCallId }
        });
        if (!existingCall) {
          existingCall = await tx.call.create({
            data: {
              id: `call_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
              externalCallId: norm.externalCallId,
              campaignId,
              agentId,
              agentVersionId,
              leadId,
              phoneNumberId,
              status: norm.canonicalStatus,
              outcome: norm.outcome || (norm.canonicalStatus === "completed" ? "successful_contact" : "unreachable"),
              durationSeconds: norm.durationSeconds || 0,
              startedAt: new Date(Date.now() - (norm.durationSeconds || 0) * 1e3),
              endedAt: norm.canonicalStatus === "completed" || norm.canonicalStatus === "failed" ? receivedAt : null,
              transcript: norm.transcript || [
                { id: "t1", speaker: "agent", text: "Hello, calling on behalf of Fluid.Live.", timestampSeconds: 2 },
                { id: "t2", speaker: "lead", text: "Thank you.", timestampSeconds: 8 }
              ],
              extractedVariables: norm.extractedVariables || {}
            }
          });
        } else {
          existingCall = await tx.call.update({
            where: { id: existingCall.id },
            data: {
              status: norm.canonicalStatus,
              ...norm.outcome ? { outcome: norm.outcome } : {},
              ...norm.durationSeconds ? { durationSeconds: norm.durationSeconds } : {},
              ...norm.canonicalStatus === "completed" || norm.canonicalStatus === "failed" ? { endedAt: receivedAt } : {},
              ...norm.transcript ? { transcript: norm.transcript } : {},
              ...norm.extractedVariables ? { extractedVariables: norm.extractedVariables } : {}
            }
          });
        }
        if ((norm.canonicalStatus === "completed" || norm.canonicalStatus === "in-progress") && norm.durationSeconds > 0) {
          const existingUsage = await tx.usageEvent.findFirst({
            where: { callId: existingCall.id }
          });
          if (!existingUsage) {
            const usageId = `usg_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
            const durationMinutes = Number(((norm.durationSeconds || 0) / 60).toFixed(2));
            const newUsage = await tx.usageEvent.create({
              data: {
                id: usageId,
                callId: existingCall.id,
                campaignId,
                agentId: existingCall.agentId,
                durationMinutes,
                providerCostUnits: norm.providerCostUnits || Number((durationMinutes * 0.05).toFixed(3)),
                platformCostUnits: norm.platformCostUnits || Number((durationMinutes * 0.08).toFixed(3)),
                timestamp: receivedAt
              }
            });
            await tx.call.update({
              where: { id: existingCall.id },
              data: { usageEventId: newUsage.id }
            });
          }
        }
        if (campaignId) {
          await tx.campaign.update({
            where: { id: campaignId },
            data: {
              callsAttempted: { increment: 1 },
              ...norm.canonicalStatus === "completed" ? { completedCalls: { increment: 1 } } : {},
              minutesUsed: { increment: Number(((norm.durationSeconds || 0) / 60).toFixed(2)) }
            }
          });
          const cmpLead = await tx.campaignLead.findUnique({
            where: { campaignId_leadId: { campaignId, leadId: existingCall.leadId } }
          });
          if (cmpLead) {
            await tx.campaignLead.update({
              where: { id: cmpLead.id },
              data: {
                status: norm.canonicalStatus === "completed" ? "completed" : "failed",
                attemptCount: { increment: 1 },
                lastAttemptAt: receivedAt
              }
            });
          }
        }
      }
      return {
        receivedEventId: dbEventId,
        externalId: norm.providerEventId,
        status: "processed",
        processedAt: receivedAt.toISOString()
      };
    });
  }
  async reprocessEvent(eventId) {
    const updated = await prisma_default.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: "processed",
        error: null,
        receivedAt: /* @__PURE__ */ new Date()
      }
    });
    return {
      id: updated.id,
      provider: updated.provider,
      eventType: updated.eventType,
      externalId: updated.externalId,
      payload: updated.payload || {},
      status: updated.status,
      receivedAt: updated.receivedAt.toISOString()
    };
  }
};
var webhookRepository = new WebhookRepository();

// server/services/webhookService.ts
var ServerWebhookService = class {
  async getWebhookEvents() {
    return webhookRepository.getWebhookEvents();
  }
  async processSarvamWebhook(payload) {
    return webhookRepository.processSarvamWebhook(payload);
  }
  async reprocessEvent(eventId) {
    return webhookRepository.reprocessEvent(eventId);
  }
};
var serverWebhookService = new ServerWebhookService();

// server/routes/webhookRoutes.ts
var webhookRoutes = Router9();
webhookRoutes.get("/", async (req, res) => {
  try {
    const events = await serverWebhookService.getWebhookEvents();
    res.json({ success: true, data: events, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
webhookRoutes.post("/sarvam", async (req, res) => {
  try {
    const expectedSecret = process.env.SARVAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret = req.headers["x-webhook-secret"] || req.headers["x-sarvam-secret"] || req.headers["authorization"];
      if (!incomingSecret || incomingSecret !== expectedSecret && incomingSecret !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Webhook authentication secret mismatch",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    const result = await serverWebhookService.processSarvamWebhook(req.body);
    res.status(200).json({
      success: true,
      data: result,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err?.message || "Webhook processing failed",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
webhookRoutes.post("/:id/reprocess", async (req, res) => {
  try {
    const reprocessed = await serverWebhookService.reprocessEvent(req.params.id);
    res.json({ success: true, data: reprocessed, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/businessRoutes.ts
import { Router as Router10 } from "express";

// server/services/businessService.ts
var ServerBusinessService = class {
  async getBusinessProfile() {
    return await businessRepository.getBusinessProfile();
  }
  async updateBusinessProfile(id, updates) {
    return await businessRepository.updateBusinessProfile(id, updates);
  }
};
var serverBusinessService = new ServerBusinessService();

// server/routes/businessRoutes.ts
var businessRoutes = Router10();
businessRoutes.get("/", async (req, res) => {
  try {
    const business = await serverBusinessService.getBusinessProfile();
    res.json({ success: true, data: business, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
businessRoutes.patch("/:id", async (req, res) => {
  try {
    const updated = await serverBusinessService.updateBusinessProfile(req.params.id, req.body);
    res.json({ success: true, data: updated, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(400).json({ success: false, error: err?.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});

// server/routes/sarvamRoutes.ts
import { Router as Router11 } from "express";
var sarvamRoutes = Router11();
sarvamRoutes.get("/status", (req, res) => {
  try {
    const status = backendSarvamProvider.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err?.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
sarvamRoutes.post("/test", async (req, res) => {
  try {
    const result = await backendSarvamProvider.testConnection(req.body);
    res.json({
      success: result.success,
      data: result,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err?.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
sarvamRoutes.post("/connect", async (req, res) => {
  try {
    const { apiKey, orgId, workspaceId, defaultAppId, connectionId, agentPhoneNumber } = req.body;
    const result = await backendSarvamProvider.updateConfig({
      apiKey,
      orgId,
      workspaceId,
      defaultAppId,
      connectionId,
      agentPhoneNumber
    });
    res.json({
      success: result.success,
      data: result.status,
      testResult: result.testResult,
      message: result.success ? "Sarvam account connected & verified successfully." : "Credentials saved, but verification ping failed. Please review settings.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err?.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});

// server/index.ts
var app = express();
var PORT = process.env.PORT || 5e3;
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith("/api") && req.url.startsWith("/")) {
    req.url = "/api" + req.url;
  }
  next();
});
app.use("/api/leads", leadRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/phone-numbers", phoneRoutes);
app.use("/api/knowledge-bases", knowledgeRoutes);
app.use("/api", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/sarvam", sarvamRoutes);
app.get(["/api", "/api/health"], (req, res) => {
  res.json({
    status: "healthy",
    service: "Fluid.Live Voice AI Platform Backend API",
    sarvamBridge: "Connected (Live)",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use((err, req, res, next) => {
  console.error("[API Server Error]:", err);
  res.status(500).json({
    success: false,
    error: err?.message || "Internal Server Error",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var server_default = app;
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Fluid.Live Backend API] Modular Monolith Server running on http://localhost:${PORT}`);
  });
}
export {
  server_default as default
};
