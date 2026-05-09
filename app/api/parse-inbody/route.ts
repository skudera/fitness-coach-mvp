import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const EXTRACT_PROMPT = `This is an InBody body composition assessment report. Extract every numerical value listed below and return ONLY a valid JSON object — no explanation, no markdown.

Use null for any field not visible or not applicable. Convert dates to YYYY-MM-DD format. All weights in lbs, percentages as numbers (e.g. 19.9 not "19.9%").

{
  "assessment_date": "YYYY-MM-DD",
  "weight": number,
  "smm": number,
  "body_fat_mass": number,
  "body_fat_percent": number,
  "bmi": number,
  "visceral_fat_level": number,
  "ecw_tbw": number,
  "bmr": number,
  "lean_right_arm": number,
  "lean_left_arm": number,
  "lean_trunk": number,
  "lean_right_leg": number,
  "lean_left_leg": number,
  "lean_right_arm_pct": number,
  "lean_left_arm_pct": number,
  "lean_trunk_pct": number,
  "lean_right_leg_pct": number,
  "lean_left_leg_pct": number,
  "fat_trunk": number
}`

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)

    if (!match) {
      return Response.json({ error: 'Could not extract values from image' }, { status: 422 })
    }

    const parsed = JSON.parse(match[0])
    return Response.json(parsed)
  } catch (err) {
    console.error('InBody parse error:', err)
    return Response.json({ error: 'Parsing failed' }, { status: 500 })
  }
}
