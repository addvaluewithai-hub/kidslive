import type { SproutStoryState } from '../story/types';

export type NovaStoryContext = {
  planet: 'sprout';
  day: number;
  location: 'meadow' | 'river';
  seedChoice: 'water' | 'tree' | null;
  lumiDiscovered: boolean;
  hiddenPathDiscovered: boolean;
};

export interface NovaConversationProvider {
  readonly id: 'mock' | 'live';
  ask(message: string, context: NovaStoryContext): Promise<string>;
}

export function visibleNovaContext(state: SproutStoryState): NovaStoryContext {
  return {
    planet: 'sprout',
    day: state.currentDay,
    location: state.currentLocation,
    seedChoice: state.seedDiscovered ? state.seedChoice : null,
    lumiDiscovered: state.lumiDiscovered,
    hiddenPathDiscovered: state.hiddenPathUnlocked,
  };
}

export class MockNovaProvider implements NovaConversationProvider {
  readonly id = 'mock' as const;

  async ask(message: string, context: NovaStoryContext) {
    const normalized = message.toLowerCase();
    if (normalized.includes('lumi') && context.lumiDiscovered) {
      return 'Lumi صغير وشجاع جدًا. لسه بنتعرف عليه، بس واضح إنه بيسمع حاجات في الكوكب إحنا مش سامعينها.';
    }
    if (normalized.includes('بعد') || normalized.includes('next')) {
      if (context.hiddenPathDiscovered) return 'الطريق الجديد ظهر، بس هنستناه لبكرة. خلّيه يفضل سر صغير الليلة.';
      return 'مش عايزة أحرق المفاجأة 😄 خلّينا نشوف الكوكب هيورّينا إيه لما نكمل تقدمنا.';
    }
    if (context.day <= 2) return 'أنا مركزة على النور اللي جنب النهر. حاسة إنه مش مجرد ضوء عادي.';
    if (context.day <= 4) return 'البذرة دي مرتبطة بالمكان اللي اخترته. الكوكب فعلًا بيفتكر قراراتنا.';
    if (context.lumiDiscovered) return 'أجمل حاجة النهارده إننا مش لوحدنا في Sprout Planet خلاص.';
    return 'أنا معاك. كل تغيير صغير هنا له معنى، ومش محتاجين نستعجل الحكاية.';
  }
}

export class LiveNovaProvider implements NovaConversationProvider {
  readonly id = 'live' as const;

  async ask(_message: string, _context: NovaStoryContext) {
    throw new Error('Nova Live backend is not configured in this repository yet.');
  }
}

export const novaProviders = {
  mock: new MockNovaProvider(),
  live: new LiveNovaProvider(),
};
