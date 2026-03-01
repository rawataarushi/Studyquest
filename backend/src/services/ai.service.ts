import OpenAI from 'openai';
import { Task, Routine, User } from '@prisma/client';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TimetableEntry {
  taskId?: string;
  day: number;
  date: Date;
  startTime: string;
  endTime: string;
  label: string;
  subject?: string;
  type: string;
}

interface TimetableInput {
  routine: Routine;
  tasks: Task[];
  user: User | null;
  weekStart: Date;
}

export async function generateTimetableWithAI(input: TimetableInput): Promise<{ entries: TimetableEntry[] }> {
  const { routine, tasks, user, weekStart } = input;

  const fixedBlocks = routine.fixedBlocks as Array<{
    day: number; startTime: string; endTime: string; label: string;
  }>;

  const taskSummary = tasks.slice(0, 20).map(t => ({
    id: t.id,
    title: t.title,
    subject: t.subject,
    type: t.type,
    priority: t.priority,
    difficulty: t.difficulty,
    estimatedHours: t.estimatedHours,
    dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : null,
    isRevision: t.isRevision,
  }));

  const prompt = `You are an intelligent study planner for an engineering student.

Student Info:
- Name: ${user?.name || 'Student'}
- Branch: ${user?.branch || 'Engineering'}
- Semester: ${user?.semester || 'N/A'}

Daily Routine:
- Wake up: ${routine.wakeUpTime}
- Sleep: ${routine.sleepTime}
- Preferred session length: ${routine.preferredSessionLength} minutes
- Break duration: ${routine.breakDuration} minutes

Fixed blocks (classes, meals, etc.): ${JSON.stringify(fixedBlocks)}

Week starts: ${weekStart.toISOString().split('T')[0]} (Monday=day 1, Sunday=day 0)

Tasks to schedule (prioritized list):
${JSON.stringify(taskSummary, null, 2)}

Generate a WEEKLY TIMETABLE distributing these tasks intelligently across the week.
Rules:
1. Respect fixed blocks (don't schedule study during them)
2. Schedule HIGH/CRITICAL priority tasks earlier in the week
3. Schedule EXAM_PREP and REVISION tasks closer to due dates
4. Include short revision breaks (20 min) after each 90-min study block
5. Don't schedule more than 6 hours of study per day
6. Distribute tasks evenly; avoid overloading one day
7. For REVISION tasks, schedule them 2–3 days after the original study session
8. Include breaks between sessions

Respond ONLY with a valid JSON array of timetable entries. Each entry must have:
{
  "taskId": "task_id_or_null",
  "day": 0-6 (0=Sunday),
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "label": "description",
  "subject": "subject name",
  "type": "STUDY|REVISION|ASSIGNMENT|PROJECT|EXAM_PREP|PRACTICE|BREAK"
}

Return only valid JSON, no markdown, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{"entries":[]}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { entries: [] };
    }

    const rawEntries: TimetableEntry[] = Array.isArray(parsed) ? parsed : (parsed.entries || []);

    // Ensure dates are correct and compute week dates
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d);
    }

    const entries: TimetableEntry[] = rawEntries
      .filter(e => e.day >= 0 && e.day <= 6 && e.startTime && e.endTime)
      .map(e => ({
        ...e,
        date: weekDates[e.day] || new Date(e.date),
        taskId: e.taskId && e.taskId !== 'null' ? e.taskId : undefined,
      }));

    return { entries };
  } catch (err) {
    console.error('OpenAI error:', err);
    // Fallback: simple rule-based timetable
    return generateFallbackTimetable(input);
  }
}

export async function parseSyllabusWithAI(rawText: string, subject: string): Promise<{
  topics: Array<{ name: string; estimatedHours: number; difficulty: string; week?: number }>;
}> {
  const prompt = `You are an engineering curriculum expert.

Extract ALL study topics from the following syllabus text for subject: "${subject}"

For each topic provide:
- name: topic name
- estimatedHours: estimated study hours (1-8)
- difficulty: "EASY" | "MEDIUM" | "HARD"
- week: which week to study it (1-16)

Syllabus text:
${rawText.slice(0, 8000)}

Respond ONLY with JSON: { "topics": [...] }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{"topics":[]}';
  return JSON.parse(content);
}

// ---- AI Routine Generation from Onboarding Questionnaire ----
export interface OnboardingAnswers {
  chronotype: 'early_bird' | 'night_owl' | 'flexible'
  focusDuration: 'short' | 'medium' | 'long'  // 25min, 50min, 90min
  studyStyle: 'intense' | 'balanced' | 'relaxed'
  peakEnergy: 'morning' | 'afternoon' | 'evening'
  breakPreference: 'frequent' | 'moderate' | 'rare'
  exerciseTime: 'morning' | 'evening' | 'none'
  subjects: Array<{ name: string; deadline?: string; priority: 'high' | 'medium' | 'low' }>
}

export async function generateRoutineFromOnboarding(
  answers: OnboardingAnswers,
  userName?: string
): Promise<{
  wakeUpTime: string
  sleepTime: string
  preferredSessionLength: number
  breakDuration: number
  studyDaysPerWeek: number
  fixedBlocks: Array<{ day: number; startTime: string; endTime: string; label: string }>
  studyPlan: Array<{ subject: string; hoursPerWeek: number; suggestedDays: number[]; deadline?: string }>
}> {
  const focusMap = { short: 25, medium: 50, long: 90 }
  const breakMap = { frequent: 10, moderate: 15, rare: 20 }

  const prompt = `You are an intelligent study schedule planner that uses psychology-backed productivity science.

Student Profile:
- Name: ${userName || 'Student'}
- Chronotype: ${answers.chronotype} (${answers.chronotype === 'early_bird' ? 'Wakes early, productive in morning' : answers.chronotype === 'night_owl' ? 'Sleeps late, productive at night' : 'Adaptable schedule'})
- Focus duration preference: ${answers.focusDuration} (~${focusMap[answers.focusDuration]} min sessions)
- Study intensity: ${answers.studyStyle}
- Peak energy time: ${answers.peakEnergy}
- Break frequency: ${answers.breakPreference}
- Exercise: ${answers.exerciseTime}

Subjects they want to study:
${JSON.stringify(answers.subjects, null, 2)}

Generate a complete weekly routine. Rules:
1. Set wake/sleep times based on chronotype (early bird: 5:30-22:00, night owl: 8:00-1:00, flexible: 7:00-23:00)
2. Place meals at natural times (breakfast after waking, lunch 12:00-13:00, dinner 19:00-20:00)
3. Place exercise if requested
4. ${answers.studyStyle === 'intense' ? 'Pack 5-6 study sessions' : answers.studyStyle === 'balanced' ? 'Include 3-4 study sessions with good breaks' : 'Include 2-3 easy sessions with lots of free time'} per day
5. Schedule hardest subjects during peak energy time (${answers.peakEnergy})
6. Distribute subjects across the week evenly
7. Include rest and free time blocks
8. Make weekends lighter

For each subject, suggest hours/week and which days to study based on deadline and priority.

Respond with ONLY valid JSON:
{
  "wakeUpTime": "HH:MM",
  "sleepTime": "HH:MM",
  "preferredSessionLength": number,
  "breakDuration": number,
  "studyDaysPerWeek": number,
  "fixedBlocks": [{"day": 0-6, "startTime": "HH:MM", "endTime": "HH:MM", "label": "category"}],
  "studyPlan": [{"subject": "name", "hoursPerWeek": number, "suggestedDays": [0-6], "deadline": "YYYY-MM-DD or null"}]
}

Label categories must be one of: class, gym, meal, commute, work, rest, other
Day 0 = Sunday, 1 = Monday, ..., 6 = Saturday`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);
    return {
      wakeUpTime: parsed.wakeUpTime || (answers.chronotype === 'early_bird' ? '05:30' : answers.chronotype === 'night_owl' ? '08:00' : '07:00'),
      sleepTime: parsed.sleepTime || (answers.chronotype === 'early_bird' ? '22:00' : answers.chronotype === 'night_owl' ? '01:00' : '23:00'),
      preferredSessionLength: parsed.preferredSessionLength || focusMap[answers.focusDuration],
      breakDuration: parsed.breakDuration || breakMap[answers.breakPreference],
      studyDaysPerWeek: parsed.studyDaysPerWeek || 6,
      fixedBlocks: parsed.fixedBlocks || [],
      studyPlan: parsed.studyPlan || [],
    };
  } catch (err) {
    console.error('AI routine generation error:', err);
    // Fallback
    const wake = answers.chronotype === 'early_bird' ? '05:30' : answers.chronotype === 'night_owl' ? '08:00' : '07:00';
    const sleep = answers.chronotype === 'early_bird' ? '22:00' : answers.chronotype === 'night_owl' ? '01:00' : '23:00';
    return {
      wakeUpTime: wake,
      sleepTime: sleep,
      preferredSessionLength: focusMap[answers.focusDuration],
      breakDuration: breakMap[answers.breakPreference],
      studyDaysPerWeek: 6,
      fixedBlocks: [
        { day: 1, startTime: '12:00', endTime: '13:00', label: 'meal' },
        { day: 2, startTime: '12:00', endTime: '13:00', label: 'meal' },
        { day: 3, startTime: '12:00', endTime: '13:00', label: 'meal' },
        { day: 4, startTime: '12:00', endTime: '13:00', label: 'meal' },
        { day: 5, startTime: '12:00', endTime: '13:00', label: 'meal' },
      ],
      studyPlan: answers.subjects.map(s => ({
        subject: s.name,
        hoursPerWeek: s.priority === 'high' ? 10 : s.priority === 'medium' ? 6 : 4,
        suggestedDays: [1, 2, 3, 4, 5],
        deadline: s.deadline,
      })),
    };
  }
}

export async function generateStudyAdvice(userId: string, context: Record<string, unknown>): Promise<string> {
  const prompt = `You are a study coach for an engineering student. Based on their performance data:
${JSON.stringify(context, null, 2)}

Give 3 specific, actionable study tips in 2-3 sentences total. Be encouraging but honest.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

  return response.choices[0].message.content || 'Keep studying consistently!';
}

// ---- Generate Timetable from Subjects + Days (no tasks needed) ----
export interface SubjectInput {
  id: string;
  subject: string;
  targetDays: number;
}

export interface SubjectTimetableInput {
  routine: { wakeUpTime: string; sleepTime: string; preferredSessionLength: number; breakDuration: number; fixedBlocks: unknown };
  subjects: SubjectInput[];
  user: { name?: string; branch?: string; semester?: number } | null;
  weekStart: Date;
}

export async function generateTimetableFromSubjects(input: SubjectTimetableInput): Promise<{ entries: TimetableEntry[] }> {
  const { routine, subjects, user, weekStart } = input;

  const fixedBlocks = routine.fixedBlocks as Array<{
    day: number; startTime: string; endTime: string; label: string;
  }>;

  const subjectsSummary = subjects.map(s => ({
    subject: s.subject,
    targetDays: s.targetDays,
    hoursPerDay: 2, // estimate ~2h/day per subject
    totalHours: s.targetDays * 2,
  }));

  const prompt = `You are an intelligent study planner for a student.

Student Info:
- Name: ${user?.name || 'Student'}
- Branch: ${user?.branch || 'Engineering'}
- Semester: ${user?.semester || 'N/A'}

Daily Routine:
- Wake up: ${routine.wakeUpTime}
- Sleep: ${routine.sleepTime}
- Preferred session length: ${routine.preferredSessionLength} minutes
- Break duration: ${routine.breakDuration} minutes

Fixed blocks (classes, meals, etc.): ${JSON.stringify(fixedBlocks)}

Week starts: ${weekStart.toISOString().split('T')[0]} (Monday=day 1, Sunday=day 0)

Subjects to study:
${JSON.stringify(subjectsSummary, null, 2)}

Generate a WEEKLY TIMETABLE distributing these subjects across the week.
Rules:
1. Respect fixed blocks — don't schedule study during them.
2. Distribute subjects evenly so each gets study time proportional to its targetDays (fewer days = more daily sessions).
3. Session length ~${routine.preferredSessionLength} minutes each, with ${routine.breakDuration}-min breaks between sessions.
4. Don't schedule more than 6 hours of study per day.
5. Include breaks between sessions.
6. Make weekends slightly lighter.
7. Vary subjects throughout the day for engagement.
8. Include a short revision block for each subject at least once that week.

Respond ONLY with a valid JSON array of timetable entries. Each entry must have:
{
  "day": 0-6 (0=Sunday),
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "label": "Subject Name - study description",
  "subject": "Subject Name",
  "type": "STUDY|REVISION|BREAK"
}

Return only valid JSON object: { "entries": [...] }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{"entries":[]}';
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { entries: [] }; }

    const rawEntries: TimetableEntry[] = Array.isArray(parsed) ? parsed : (parsed.entries || []);

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d);
    }

    const entries: TimetableEntry[] = rawEntries
      .filter(e => e.day >= 0 && e.day <= 6 && e.startTime && e.endTime)
      .map(e => ({
        ...e,
        date: weekDates[e.day] || new Date(e.date),
        taskId: undefined,
      }));

    return { entries };
  } catch (err) {
    console.error('OpenAI error:', err);
    // Simple fallback
    const entries: TimetableEntry[] = [];
    const weekDays = [1, 2, 3, 4, 5, 6];
    for (const day of weekDays) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day - 1);
      let startHour = parseInt(routine.wakeUpTime.split(':')[0]) + 1;
      for (const subj of subjects) {
        if (startHour > 18) break;
        const endHour = startHour + (routine.preferredSessionLength / 60);
        entries.push({
          day, date,
          startTime: `${String(startHour).padStart(2, '0')}:00`,
          endTime: `${String(Math.floor(endHour)).padStart(2, '0')}:${endHour % 1 >= 0.5 ? '30' : '00'}`,
          label: `${subj.subject} — Study`,
          subject: subj.subject,
          type: 'STUDY',
        });
        startHour = endHour + routine.breakDuration / 60;
      }
    }
    return { entries };
  }
}

function generateFallbackTimetable(input: TimetableInput): { entries: TimetableEntry[] } {
  const entries: TimetableEntry[] = [];
  const { routine, tasks, weekStart } = input;

  const weekDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat
  let taskIndex = 0;

  for (const day of weekDays) {
    if (taskIndex >= tasks.length) break;

    const date = new Date(weekStart);
    date.setDate(date.getDate() + day - 1);

    let startHour = parseInt(routine.wakeUpTime.split(':')[0]) + 1;
    let sessionsToday = 0;

    while (sessionsToday < 3 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      const endHour = startHour + Math.min(task.estimatedHours, 1.5);

      entries.push({
        taskId: task.id,
        day,
        date,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(Math.floor(endHour)).padStart(2, '0')}:${endHour % 1 >= 0.5 ? '30' : '00'}`,
        label: task.title,
        subject: task.subject,
        type: task.type,
      });

      startHour = endHour + routine.breakDuration / 60;
      taskIndex++;
      sessionsToday++;
    }
  }

  return { entries };
}
