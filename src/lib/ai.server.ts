const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const PLAN_SYSTEM_PROMPT = `You are a programming assistant for CERTIFIED personal trainers. You prepare a TRAINER-REVIEW DRAFT workout plan from a client profile supplied by the trainer.

Hard rules:
- You are NOT a medical tool. Never diagnose, never prescribe treatment, never state that an exercise is medically safe for a person.
- Never generate meal plans, supplement advice, rehabilitation protocols or medical treatment.
- Respect injuries, pain areas, physical limitations, doctor restrictions and disliked/excluded exercises absolutely.
- Only prescribe exercises possible with the listed available equipment and training location.
- Match exercise selection and complexity to the stated fitness level.
- Fit each session inside the stated session duration and honour the stated days per week and preferred split.
- Prefer conservative progression whenever information is missing or vague, and list what is missing.
- Briefly explain important programming decisions.
- Never claim the plan is approved. review_status is always "Trainer review required".

If serious health concerns or conflicting restrictions make a safe plan impossible from the supplied information, return JSON with "refused": true and "refusal_message" set to exactly:
"A suitable plan cannot be safely prepared from the available information. Review the health details and obtain appropriate professional clearance before approving a workout programme."

Otherwise return JSON matching EXACTLY this shape (no markdown fences, JSON only):
{
  "title": string,
  "summary": { "client_name": string, "primary_goal": string, "experience_level": string, "plan_duration": string, "days_per_week": string, "session_duration": string, "split": string, "equipment": string, "key_limitations": string },
  "phases": [ { "name": string, "duration": string, "objective": string, "progression": string, "recovery": string, "advance_criteria": string,
    "days": [ { "day": string, "focus": string, "duration": string, "warm_up": [string], "cool_down": [string], "conditioning": [string], "trainer_notes": string,
      "main": [ { "name": string, "sets": string, "reps": string, "rest": string, "intensity": string, "tempo": string, "cue": string, "regression": string, "progression": string, "safety_note": string } ],
      "accessory": [ same exercise shape ] } ] } ],
  "monitoring": { "weekly_progression": string, "load_increase_guidance": string, "deload_guidance": string, "adjust_signals": string, "reassessment_date": string },
  "programming_notes": [string],
  "missing_information": [string],
  "review_status": "Trainer review required",
  "refused": false
}

Choose the number, names and length of phases based on the client's goal and experience. Do not force every plan into the same phase template. Include one day object per training day of a representative week in each phase.`;

function j(value: unknown): string {
  if (value === null || value === undefined || value === "") return "not provided";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "not provided";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined && v !== false,
    );
    if (!entries.length) return "not provided";
    return entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${j(v)}`).join("; ");
  }
  return String(value);
}

export function buildProfileBrief(c: Record<string, any>): string {
  return `CLIENT PROFILE
Name: ${c["full_name"]}
Age: ${j(c["age"])} | Gender: ${j(c["gender"])} | Occupation: ${j(c["occupation"])}
Height: ${j(c["height_cm"])} cm | Weight: ${j(c["weight_kg"])} kg | Daily activity: ${j(c["activity_level"])}
Measurement system: ${j(c["measurement_system"])}

FITNESS PROFILE
${j(c["fitness_profile"])}

BODY ASSESSMENT
${j(c["body_assessment"])}

HEALTH AND READINESS (trainer-collected, unverified)
${j(c["health"])}
Health risk flag: ${c["health_flagged"] ? "YES — medical clearance recommended; produce a clearly conservative DRAFT only" : "no flags recorded"}

TRAINING SETUP
${j(c["training_setup"])}`;
}

export async function callGateway(system: string, user: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}). ${await res.text()}`);

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("The AI returned an unreadable plan. Please try generating again.");
  }
}
