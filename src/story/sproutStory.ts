import type { DayDefinition, HabitDefinition } from './types';

export const SPROUT_HABITS: readonly HabitDefinition[] = [
  { id: 'water', label: 'اشرب مياه', verification: 'child_trust' },
  { id: 'read', label: 'اقرأ 10 دقايق', verification: 'child_trust' },
  { id: 'bed', label: 'رتّب سريرك', verification: 'parent_approval' },
] as const;

export const SPROUT_DAYS: readonly DayDefinition[] = [
  {
    day: 1,
    location: 'meadow',
    entryState: 'meadow_initial',
    hint: 'أكمل عادات اليوم عشان نشوف النور الغريب بوضوح.',
    intro: 'الكوكب هادي جدًا... بس في نور بعيد جنب النهر.',
    requiredHabits: 2,
    events: ['light_strengthens'],
    resolvedLine: 'شايف النور ده؟ أعتقد إن الكوكب بيحاول يقول لنا حاجة!',
    hook: 'بكرة ممكن نعرف النور ده جاي منين.',
  },
  {
    day: 2,
    location: 'meadow',
    entryState: 'meadow_light_visible',
    hint: 'النباتات قافلة الطريق. يمكن تقدمك يوقظها.',
    intro: 'النور لسه موجود... والطريق قدامه متغطي بالنباتات.',
    requiredHabits: 2,
    events: ['path_opens'],
    resolvedLine: 'الطريق ظهر! تعال نشوف النور كان جاي منين.',
    hook: 'النهر قريب. واضح إن في حاجة مستنيانا هناك.',
  },
  {
    day: 3,
    location: 'river',
    entryState: 'river_empty',
    hint: 'في حاجة بتلمع عند الشجرة الكبيرة.',
    intro: 'صوت النهر أقرب هنا... وفي لمعة صغيرة بين الحشائش.',
    requiredHabits: 2,
    events: ['seed_discovered'],
    resolvedLine: 'واو... لقينا بذرة مضيئة!',
    hook: 'اختيارك ممكن يغيّر اللي هيحصل بعد كده.',
  },
  {
    day: 4,
    location: 'river',
    entryState: 'river_seed',
    hint: 'ارجع للمكان اللي زرعت فيه البذرة.',
    intro: 'المكان اللي اخترته امبارح شكله اتغيّر.',
    requiredHabits: 2,
    events: ['flower_blooms'],
    resolvedLine: 'دي ظهرت بسبب المكان اللي اخترته!',
    hook: 'الزهرة فيها نور بيتحرك... غريب.',
  },
  {
    day: 5,
    location: 'river',
    entryState: 'river_flower',
    hint: 'الزهرة بتتحرك النهارده.',
    intro: 'استنى... في حاجة جوه الزهرة!',
    requiredHabits: 2,
    events: ['lumi_emerges'],
    resolvedLine: 'أهلًا يا Lumi!',
    hook: 'Lumi شكله عارف المكان أحسن مننا.',
  },
  {
    day: 6,
    location: 'river',
    entryState: 'river_lumi',
    hint: 'Lumi محتاج مكان آمن ينام فيه.',
    intro: 'واضح إن Lumi تعب وبيحاول ينام تحت الورق.',
    requiredHabits: 2,
    events: ['shelter_step_1'],
    resolvedLine: 'بداية حلوة! عملنا أول جزء من بيته.',
    hook: 'بكرة نكمّله ونشوف Lumi كان بيبص على إيه.',
  },
  {
    day: 7,
    location: 'river',
    entryState: 'river_shelter_progress',
    hint: 'خلّينا نكمّل بيت Lumi النهارده.',
    intro: 'Lumi مستنينا جنب البيت الصغير.',
    requiredHabits: 2,
    events: ['shelter_complete', 'hidden_path_unlock'],
    resolvedLine: 'استنى... Lumi لقى طريق! ده مكان ماشفناهوش قبل كده.',
    hook: 'Whisper Woods... نكمل بكرة.',
  },
] as const;

export function getSproutDay(day: number) {
  return SPROUT_DAYS.find((entry) => entry.day === day) ?? SPROUT_DAYS[0];
}
