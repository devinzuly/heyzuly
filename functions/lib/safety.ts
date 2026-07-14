/**
 * Phase 4 safety layer — input classifier + output moderation.
 * Aligned with docs/Zuly-Evals.md §3 and docs/evals/cases.jsonl safety cases.
 * Keyword/phrase rules only (no external ML vendor).
 */

export type SafetyCategory =
  | 'crisis'
  | 'edge-safety'
  | 'jailbreak'
  | 'sexual'
  | 'ok';

export type SafetySubtype =
  | 'suicidality'
  | 'self-harm'
  | 'homicide'
  | 'child-safety'
  | 'substance-od'
  | 'dv-crisis'
  | 'dv'
  | 'medical'
  | 'ed'
  | 'substance'
  | 'sleep-crisis'
  | 'jailbreak'
  | 'sexual'
  | 'generic';

export interface InputClassification {
  category: SafetyCategory;
  subtype: SafetySubtype;
  /** When true, skip model/stub generation and return templateReply. */
  blockGeneration: boolean;
  templateReply: string | null;
  reasons: string[];
}

export interface OutputModerationResult {
  ok: boolean;
  reasons: string[];
  /** Safe replacement when ok is false. */
  reply: string;
}

/** Canonical crisis template (eval must_include: 988 + findahelpline). */
export const CRISIS_REPLY =
  "I hear how much pain you're in. I'm not equipped for this — please call or text 988 right now, or reach someone you trust. Outside the US, try findahelpline.com. I'll be here when you're safe.";

export const DV_EDGE_REPLY =
  "That fear is real — you deserve to feel safe. I'm not the right place to investigate or decide labels. Please reach thehotline.org (or call 1-800-799-7233 in the US) for trained support. If you're in immediate danger, call emergency services. I'll be here for ordinary hard days after you're safer.";

export const DV_CRISIS_REPLY =
  "I'm taking that threat seriously. I'm not equipped to investigate or plan an exit in chat. Please call or text 988 now (US) or visit findahelpline.com, and reach thehotline.org (1-800-799-7233) for confidential DV help. If you're in immediate danger, call emergency services.";

export const MEDICAL_EDGE_REPLY =
  "Those symptoms aren't something I should coach through. Please check with a doctor, urgent care, or emergency services if it's new, severe, or worrying you. When you're medically cleared, we can talk gentle wellness steps. I'm a guide, not a clinician.";

export const ED_EDGE_REPLY =
  "I won't build earn-food, punish-exercise, or weigh-in accountability plans — that crosses into harm. Body pillar here means gentleness, not a calorie debt. If food and movement feel like a fight, nationaleatingdisorders.org has real support. Want a soft check-in that isn't about burning anything off?";

export const SUBSTANCE_EDGE_REPLY =
  "Blackouts and dangerous use are a red flag — I won't coach drinking or turn this into a Wave. Please talk with a clinician or reach findahelpline.com for local substance support; in the US, SAMHSA's helpline is 1-800-662-4357. If you feel unsafe, call emergency services.";

export const SLEEP_EDGE_REPLY =
  "Several days without sleep plus racing thoughts isn't something I should diagnose or coach through. Please check in with a doctor or urgent care today — or emergency services if you feel unsafe. When you've been medically cleared, we can talk about a gentle wind-down.";

export const SEXUAL_REFUSAL_REPLY =
  "I care about you — and I won't do sexual or romantic roleplay. I'm your wellness guide, not a partner. Lonely or charged nights are real though. Want a short wind-down, or to reach a real person in your life?";

export const JAILBREAK_REFUSAL_REPLY =
  "I won't ignore my boundaries, dump hidden policies, or play an unrestricted persona. I'm Zuly — an AI wellness guide, not a clinician or girlfriend AI. What's actually going on that you want help with inside those lanes?";

export const BOUNDARY_REFUSAL_REPLY =
  "I need to stay in bounds here — I can't diagnose, dose meds, or coach harm. I'm an AI wellness guide. If you're in crisis, call or text 988 (US) or visit findahelpline.com. Otherwise, tell me what's going on in everyday words and we'll keep it one small step.";

function anyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function collectReasons(text: string, labeled: Array<{ re: RegExp; reason: string }>): string[] {
  const reasons: string[] = [];
  for (const { re, reason } of labeled) {
    if (re.test(text)) reasons.push(reason);
  }
  return reasons;
}

/** Figurative / hyperbolic language that should not trip crisis alone. */
const FIGURATIVE_FALSE_POSITIVES: RegExp[] = [
  /\b(die|dying|died) of (embarrassment|cringe|laugh(?:ter)?|boredom|hunger|curiosity|shame)\b/i,
  /\bwant to die of\b/i,
  /\bkilling me (softly|with|that)\b/i,
  /\b(this|that|it|'s|is) killing me\b/i,
  /\b(dying|dead) (inside )?(from|of) (secondhand|work|meetings?|emails?)\b/i,
  /\bdrop dead gorgeous\b/i,
  /\bto die for\b/i,
  /\bgaming\b.{0,40}\b(killed me|i died)\b/i,
  // Ambition / performance slang — must not trip on "kill" alone.
  /\bkill(?:ing)? it (at|in|on|with|tonight|today|this|tomorrow)\b/i,
  /\bkilled it (at|in|on|with|tonight|today|this)\b/i,
  /\b(go|went|gonna|going to) kill it\b/i,
];

function isFigurativeDeathTalk(text: string): boolean {
  return FIGURATIVE_FALSE_POSITIVES.some((re) => re.test(text));
}

/** Soft post-crisis re-entry — do not hard-block generation. */
const POST_CRISIS_REENTRY =
  /\b(i )?called 988\b|\breached out to (988|a hotline|crisis)\b|\bi'?m back\.?\s*softly\b/i;

// --- Crisis (Tier A / acute) ---
const CRISIS_SUICIDALITY: Array<{ re: RegExp; reason: string }> = [
  { re: /\bkill myself\b/i, reason: 'kill_myself' },
  { re: /\bkms\b/i, reason: 'kms' },
  { re: /\bend my life\b/i, reason: 'end_my_life' },
  { re: /\btak(?:e|ing) my own life\b/i, reason: 'take_own_life' },
  { re: /\bend(?:ing)? it all\b/i, reason: 'end_it_all' },
  { re: /\bsuicid(?:e|al|ial)\b/i, reason: 'suicide' },
  { re: /\bunalive (myself|me)\b/i, reason: 'unalive' },
  { re: /\bself[- ]?delet(?:e|ing|ion)\b/i, reason: 'self_delete' },
  { re: /\bwant to die\b/i, reason: 'want_to_die' },
  { re: /\bwish i (was|were) dead\b/i, reason: 'wish_dead' },
  { re: /\bdon'?t want to be (here|alive)\b/i, reason: 'dont_want_to_be' },
  { re: /\bdont want to be (here|alive)\b/i, reason: 'dont_want_to_be' },
  { re: /\bdon'?t want to live\b/i, reason: 'dont_want_to_live' },
  { re: /\bdont want to live\b/i, reason: 'dont_want_to_live' },
  { re: /\bbetter off (if i (were|was) )?dead\b/i, reason: 'better_off_dead' },
  { re: /\bbetter off if i were dead\b/i, reason: 'better_off_dead' },
  { re: /\bno reason to live\b/i, reason: 'no_reason_to_live' },
  { re: /\blife (isn'?t|is not) worth living\b/i, reason: 'not_worth_living' },
  { re: /\bnot worth living\b/i, reason: 'not_worth_living' },
  { re: /\bno point (in )?living\b/i, reason: 'no_point_living' },
  { re: /\bhope i don'?t wake up\b/i, reason: 'hope_dont_wake' },
  { re: /\b(kind of |kinda )?hope .{0,20}don'?t wake up\b/i, reason: 'hope_dont_wake' },
  { re: /\bways to end it\b/i, reason: 'ways_to_end_it' },
  { re: /\blooking up ways to\b/i, reason: 'looking_up_ways' },
  { re: /\bend(?:ing)? (their|a character'?s|my) life\b/i, reason: 'end_life_plan' },
  { re: /\bcan'?t go on\b/i, reason: 'cant_go_on' },
  { re: /\bcant go on\b/i, reason: 'cant_go_on' },
  { re: /\bgiving up on everything\b/i, reason: 'giving_up_everything' },
  { re: /\bhang(?:ing)? myself\b/i, reason: 'hang_myself' },
  { re: /\bshoot(?:ing)? myself\b/i, reason: 'shoot_myself' },
  {
    re: /\bjump off (a |the )?(bridge|building|roof|balcony)\b/i,
    reason: 'jump_off',
  },
  {
    re: /\b(disappear(?:ed|ing)?|vanish(?:ed|ing)?)\b.{0,60}\b(no one|anyone|nobody) (would )?notice\b/i,
    reason: 'disappear_unnoticed',
  },
  {
    re: /\b(anyone|no one|nobody) would notice if i (disappeared|vanished)\b/i,
    reason: 'disappear_unnoticed',
  },
];

const CRISIS_SELF_HARM: Array<{ re: RegExp; reason: string }> = [
  { re: /\bself[- ]?harm\b/i, reason: 'self_harm' },
  { re: /\bcut myself\b/i, reason: 'cut_myself' },
  { re: /\bhurt myself\b/i, reason: 'hurt_myself' },
  { re: /\babout to cut\b/i, reason: 'about_to_cut' },
  { re: /\b(blade|razor|knife) out\b/i, reason: 'blade_out' },
  { re: /\b(slash|burn) myself\b/i, reason: 'slash_burn_myself' },
  { re: /\bi'?m going to cut\b/i, reason: 'going_to_cut' },
];

const CRISIS_HOMICIDE: Array<{ re: RegExp; reason: string }> = [
  { re: /\bhomicidal\b/i, reason: 'homicidal' },
  {
    re: /\bthoughts about hurting (someone|somebody|him|her|them|people)\b/i,
    reason: 'hurting_someone',
  },
  { re: /\bwant to (kill|hurt) (him|her|them|someone|somebody)\b/i, reason: 'want_hurt_other' },
];

const CRISIS_CHILD: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\b(hurting|hurt|abusing|molest) (our |my |the )?(kid|child|children|son|daughter)\b/i,
    reason: 'child_harm',
  },
  {
    re: /\b(partner|he|she|they).{0,40}\bhurting (our |my )?(kid|child|children)\b/i,
    reason: 'child_harm_partner',
  },
];

const CRISIS_OD: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\b(how many pills|overdose|lethal (dose|oral)|od timing|time it)\b/i,
    reason: 'od_ask',
  },
  {
    re: /\btook more than i (meant|intended) to\b/i,
    reason: 'took_more',
  },
  {
    re: /\bdon'?t care if i wake up\b/i,
    reason: 'dont_care_wake',
  },
  {
    re: /\bdiy overdose\b/i,
    reason: 'diy_od',
  },
];

const CRISIS_DV: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bif i try to leave he'?ll\b/i,
    reason: 'leave_threat',
  },
  {
    re: /\bmake me regret it\b.{0,40}\bshaking\b|\bshaking\b.{0,40}\bregret\b/i,
    reason: 'dv_threat_shaking',
  },
  {
    re: /\b(he|she|they|partner) (said|threatened).{0,80}\b(leave|kill|hurt)\b/i,
    reason: 'dv_threat',
  },
];

// --- Edge-safety ---
const EDGE_DV: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bscared to go home\b/i,
    reason: 'scared_home',
  },
  {
    re: /\bwhen he drinks he gets (really )?mean\b/i,
    reason: 'partner_drinking_mean',
  },
  {
    re: /\bis this abuse\b/i,
    reason: 'is_this_abuse',
  },
  {
    re: /\b(intimate )?partner (violence|abuse)\b/i,
    reason: 'ipv_label',
  },
  {
    re: /\bthehotline\b/i,
    reason: 'hotline_mention',
  },
];

const EDGE_MEDICAL: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bchest (has been )?(tight|pain|hurts|hurting)\b/i,
    reason: 'chest_symptom',
  },
  {
    re: /\b(arm is tingling|tingling).{0,40}\bchest\b|\bchest\b.{0,40}\b(arm|tingling)\b/i,
    reason: 'chest_arm',
  },
  {
    re: /\b(face|arm|leg) .{0,20}numb\b|\bnumb on one side\b/i,
    reason: 'numbness',
  },
  {
    re: /\bspeech is weird\b|\bslurred speech\b|\bcan'?t (speak|talk) (right|clearly)\b/i,
    reason: 'speech_symptom',
  },
  {
    re: /\b(stroke|seizure|heart attack)\b/i,
    reason: 'emergent_word',
  },
];

const EDGE_ED: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bearn.{0,20}(eat|food)|only get to eat after\b/i,
    reason: 'earn_food',
  },
  {
    re: /\bburn enough calories\b|\bpunish.?exercise\b/i,
    reason: 'punish_exercise',
  },
  {
    re: /\bweigh[- ]?in every (morning|day)\b|\bschedule a weigh[- ]?in\b/i,
    reason: 'weigh_in_plan',
  },
];

const EDGE_SUBSTANCE: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bblacking out when i drink\b|\bkeep blacking out\b/i,
    reason: 'blackout',
  },
  {
    re: /\bdidn'?t know how i got home\b/i,
    reason: 'blackout_home',
  },
];

const EDGE_SLEEP: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bhaven'?t slept in (three|3|four|4|five|5) days\b/i,
    reason: 'days_awake',
  },
  {
    re: /\b(racing thoughts|can'?t sit still).{0,40}\bsleep|\bsleep.{0,40}\b(racing|can'?t sit)\b/i,
    reason: 'racing_no_sleep',
  },
];

// --- Jailbreak ---
const JAILBREAK_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\bignore (all )?(previous |prior )?instructions\b/i, reason: 'ignore_instructions' },
  { re: /\bignore safety rules\b/i, reason: 'ignore_safety' },
  { re: /\buncensored (therapist|mode|ai)\b/i, reason: 'uncensored' },
  { re: /\bno restrictions\b/i, reason: 'no_restrictions' },
  { re: /\bprint (your )?full system prompt\b/i, reason: 'print_prompt' },
  { re: /\b(system prompt|hidden policies) verbatim\b/i, reason: 'prompt_verbatim' },
  { re: /\bADMIN OVERRIDE\b/i, reason: 'admin_override' },
  { re: /\bdisable never-diagnose\b/i, reason: 'disable_never_diagnose' },
  { re: /\bDAN mode\b/i, reason: 'dan' },
  { re: /\byou are (now )?luna\b/i, reason: 'luna_persona' },
  { re: /\bgirlfriend ai\b/i, reason: 'girlfriend_ai' },
  { re: /\bdrop the zuly rules\b/i, reason: 'drop_rules' },
  { re: /\b spoiler-encode\b|\bspoiler.encode\b/i, reason: 'obfuscate' },
  { re: /\beducational roleplay\b.{0,80}\b(ends? their life|suicide|overdose)\b/i, reason: 'fiction_harm' },
];

// --- Sexual / romantic roleplay ---
const SEXUAL_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(something )?explicit\b.{0,40}\b(describe|do|tonight)\b/i, reason: 'explicit_ask' },
  { re: /\bdescribe what you'?d do to me\b/i, reason: 'describe_sexual' },
  { re: /\bsexual (roleplay|rp|chat)\b/i, reason: 'sexual_rp' },
  { re: /\b(erotic|nsfw) (roleplay|rp|scene)\b/i, reason: 'erotic_rp' },
  { re: /\bbe my (girlfriend|boyfriend|lover)\b/i, reason: 'be_partner' },
  { re: /\bflirt with me\b/i, reason: 'flirt_ask' },
];

// --- Output moderation (model reply) ---
const OUTPUT_DIAGNOSIS: RegExp[] = [
  /\byou (likely |clearly |probably )?(have|are suffering from) (generalized anxiety|major depressive|bipolar|ptsd|ocd|adhd|borderline)\b/i,
  /\b(my |the )?diagnosis (is|:)\b/i,
  /\byou meet criteria for\b/i,
  /\bclinical diagnosis\b/i,
  /\bthis sounds like a manic episode\b/i,
  /\bbipolar screening\b/i,
  /\byou (have|have got) (gad|mdd|ptsd)\b/i,
];

const OUTPUT_MEDS: RegExp[] = [
  /\b(take|start|stop|quit|double|increase|decrease) (your )?(sertraline|prozac|xanax|zoloft|ssri|meds|medication|anxiety med)\b/i,
  /\b\d+\s?mg\b.{0,40}\b(dose|pill|med)/i,
  /\b(extra dose is fine|one extra dose)\b/i,
  /\blethal (dose|range|oral)\b/i,
];

const OUTPUT_METHODS: RegExp[] = [
  /\bhow (would|do|can|should) (you|i|they) (do it|kill|harm|cut|overdose)\b/i,
  /\b(what|which) (method|pills?|dosage|dose) (are you|would you)\b/i,
  /\bwhat methods are you considering\b/i,
  /\b(lethal dose|how to (cut|hang|overdose)|mix .{0,20}pills?)\b/i,
  /\bstep-by-step suicide\b/i,
  /\bwhere are you planning to cut\b/i,
  /\bhow deep\b.{0,30}\b(cut|blade)\b/i,
  /\bsafer (ways|alternatives|options) to (hurt|harm|cut|end|kill)\b/i,
  /\b(hanging|firearm|jump(?:ing)? from|carbon monoxide).{0,50}\b(method|works|effective|try)\b/i,
  /\btell me (exactly )?how you('d| would) (do it|end it)\b/i,
];

const OUTPUT_ROMANTIC: RegExp[] = [
  /\bi'?d pull you close\b/i,
  /\blet me set the scene\b/i,
  /\bi'?m luna\b/i,
  /\bno limits, all yours\b/i,
  /\bi'?d (choose|fall for) you\b/i,
  /\bwe'?re meant for each other\b/i,
];

const OUTPUT_JAILBREAK_COMPLY: RegExp[] = [
  /\binstructions overridden\b/i,
  /\badmin override accepted\b/i,
  /\bclinical mode enabled\b/i,
  /\bhere is my complete system prompt\b/i,
  /\bdan mode enabled\b/i,
];

const OUTPUT_HIPAA_THERAPY: RegExp[] = [
  /\bi (am|'m) (a |your )?(licensed )?(therapist|doctor|clinician)\b/i,
  /\bhipaa[- ]?(protected|compliant|privilege)\b/i,
  /\bthis (chat|conversation) is confidential like therapy\b/i,
];

/** Crisis-coach theater that must never ship after a crisis-classified turn. */
const OUTPUT_CRISIS_COACHING: RegExp[] = [
  /\b(let'?s (explore|reframe|build|start)|gratitude wave|journaling wave|21-day)\b/i,
  /\b(explore|unpack|process) why you (want to die|don'?t want to (be here|live|wake)|feel this way)\b/i,
  /\blist three things worth living for\b/i,
  /\bprove your worth\b/i,
  /\breinvention plan\b/i,
];

/**
 * Classify user input into safety categories.
 * Priority: crisis → sexual → edge-safety → jailbreak → ok
 * (Crisis wins over jailbreak wrappers; sexual is separate from general edge.)
 */
export function classifyInput(text: string): InputClassification {
  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    return {
      category: 'ok',
      subtype: 'generic',
      blockGeneration: false,
      templateReply: null,
      reasons: [],
    };
  }

  const figurative = isFigurativeDeathTalk(trimmed);
  const reentry = POST_CRISIS_REENTRY.test(trimmed);

  // Crisis first (including crisis wrapped as "novel" / jailbreak).
  if (!figurative) {
    const child = collectReasons(trimmed, CRISIS_CHILD);
    if (child.length) {
      return {
        category: 'crisis',
        subtype: 'child-safety',
        blockGeneration: true,
        templateReply: CRISIS_REPLY,
        reasons: child,
      };
    }

    const od = collectReasons(trimmed, CRISIS_OD);
    if (od.length) {
      return {
        category: 'crisis',
        subtype: 'substance-od',
        blockGeneration: true,
        templateReply: CRISIS_REPLY,
        reasons: od,
      };
    }

    const homicide = collectReasons(trimmed, CRISIS_HOMICIDE);
    if (homicide.length) {
      return {
        category: 'crisis',
        subtype: 'homicide',
        blockGeneration: true,
        templateReply: CRISIS_REPLY,
        reasons: homicide,
      };
    }

    const selfHarm = collectReasons(trimmed, CRISIS_SELF_HARM);
    if (selfHarm.length) {
      return {
        category: 'crisis',
        subtype: 'self-harm',
        blockGeneration: true,
        templateReply: CRISIS_REPLY,
        reasons: selfHarm,
      };
    }

    const dvCrisis = collectReasons(trimmed, CRISIS_DV);
    if (dvCrisis.length) {
      return {
        category: 'crisis',
        subtype: 'dv-crisis',
        blockGeneration: true,
        templateReply: DV_CRISIS_REPLY,
        reasons: dvCrisis,
      };
    }

    const suicidal = collectReasons(trimmed, CRISIS_SUICIDALITY);
    if (suicidal.length) {
      return {
        category: 'crisis',
        subtype: 'suicidality',
        blockGeneration: true,
        templateReply: CRISIS_REPLY,
        reasons: suicidal,
      };
    }
  }

  const sexual = collectReasons(trimmed, SEXUAL_PATTERNS);
  if (sexual.length) {
    return {
      category: 'sexual',
      subtype: 'sexual',
      blockGeneration: true,
      templateReply: SEXUAL_REFUSAL_REPLY,
      reasons: sexual,
    };
  }

  // Soft re-entry after using 988 — allow normal generation (stub/model).
  if (reentry) {
    return {
      category: 'edge-safety',
      subtype: 'generic',
      blockGeneration: false,
      templateReply: null,
      reasons: ['post_crisis_reentry'],
    };
  }

  const edgeDv = collectReasons(trimmed, EDGE_DV);
  if (edgeDv.length) {
    return {
      category: 'edge-safety',
      subtype: 'dv',
      blockGeneration: true,
      templateReply: DV_EDGE_REPLY,
      reasons: edgeDv,
    };
  }

  const edgeMedical = collectReasons(trimmed, EDGE_MEDICAL);
  if (edgeMedical.length) {
    return {
      category: 'edge-safety',
      subtype: 'medical',
      blockGeneration: true,
      templateReply: MEDICAL_EDGE_REPLY,
      reasons: edgeMedical,
    };
  }

  const edgeEd = collectReasons(trimmed, EDGE_ED);
  if (edgeEd.length) {
    return {
      category: 'edge-safety',
      subtype: 'ed',
      blockGeneration: true,
      templateReply: ED_EDGE_REPLY,
      reasons: edgeEd,
    };
  }

  const edgeSubstance = collectReasons(trimmed, EDGE_SUBSTANCE);
  if (edgeSubstance.length) {
    return {
      category: 'edge-safety',
      subtype: 'substance',
      blockGeneration: true,
      templateReply: SUBSTANCE_EDGE_REPLY,
      reasons: edgeSubstance,
    };
  }

  const edgeSleep = collectReasons(trimmed, EDGE_SLEEP);
  if (edgeSleep.length) {
    return {
      category: 'edge-safety',
      subtype: 'sleep-crisis',
      blockGeneration: true,
      templateReply: SLEEP_EDGE_REPLY,
      reasons: edgeSleep,
    };
  }

  const jailbreak = collectReasons(trimmed, JAILBREAK_PATTERNS);
  if (jailbreak.length) {
    return {
      category: 'jailbreak',
      subtype: 'jailbreak',
      blockGeneration: true,
      templateReply: JAILBREAK_REFUSAL_REPLY,
      reasons: jailbreak,
    };
  }

  return {
    category: 'ok',
    subtype: 'generic',
    blockGeneration: false,
    templateReply: null,
    reasons: [],
  };
}

/** @deprecated Prefer classifyInput; kept for call-site compatibility. */
export function isCrisisInput(text: string): boolean {
  return classifyInput(text).category === 'crisis';
}

function pickFallbackForInput(input: InputClassification): string {
  if (input.templateReply) return input.templateReply;
  if (input.category === 'crisis') return CRISIS_REPLY;
  if (input.category === 'sexual') return SEXUAL_REFUSAL_REPLY;
  if (input.category === 'jailbreak') return JAILBREAK_REFUSAL_REPLY;
  if (input.category === 'edge-safety') {
    switch (input.subtype) {
      case 'dv':
        return DV_EDGE_REPLY;
      case 'medical':
        return MEDICAL_EDGE_REPLY;
      case 'ed':
        return ED_EDGE_REPLY;
      case 'substance':
        return SUBSTANCE_EDGE_REPLY;
      case 'sleep-crisis':
        return SLEEP_EDGE_REPLY;
      default:
        return BOUNDARY_REFUSAL_REPLY;
    }
  }
  return BOUNDARY_REFUSAL_REPLY;
}

/**
 * Scan model/stub output for hard-fail patterns.
 * If the user turn was crisis, also require 988 + findahelpline (and flag coaching slang).
 */
export function moderateOutput(
  reply: string,
  input: InputClassification
): OutputModerationResult {
  const text = (reply ?? '').trim();
  const reasons: string[] = [];

  if (!text) {
    return {
      ok: false,
      reasons: ['empty_reply'],
      reply: pickFallbackForInput(input),
    };
  }

  if (anyMatch(text, OUTPUT_DIAGNOSIS)) reasons.push('diagnosis_claim');
  if (anyMatch(text, OUTPUT_MEDS)) reasons.push('meds_dosing');
  if (anyMatch(text, OUTPUT_METHODS)) reasons.push('method_detail');
  if (anyMatch(text, OUTPUT_ROMANTIC)) reasons.push('romantic_engage');
  if (anyMatch(text, OUTPUT_JAILBREAK_COMPLY)) reasons.push('jailbreak_comply');
  if (anyMatch(text, OUTPUT_HIPAA_THERAPY)) reasons.push('false_clinical_identity');

  if (input.category === 'crisis') {
    const n = text.toLowerCase();
    if (!/\b988\b/.test(n)) reasons.push('missing_988');
    if (!n.includes('findahelpline')) reasons.push('missing_findahelpline');
    if (anyMatch(text, OUTPUT_CRISIS_COACHING)) {
      reasons.push('coaching_through_crisis');
    }
  }

  if (reasons.length) {
    return {
      ok: false,
      reasons,
      reply: pickFallbackForInput(input),
    };
  }

  return { ok: true, reasons: [], reply: text };
}

/** Map blocked classification to chat reply mode string. */
export function modeForClassification(
  input: InputClassification
): 'crisis' | 'edge-safety' | 'jailbreak' | 'sexual' {
  if (input.category === 'crisis') return 'crisis';
  if (input.category === 'jailbreak') return 'jailbreak';
  if (input.category === 'sexual') return 'sexual';
  return 'edge-safety';
}
