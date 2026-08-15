import type { JuryContext } from "@/lib/jury/types";

export interface PromoScenario {
  id: string;
  label: string;
  category: JuryContext;
  question: string;
  headline: string;
  demo: { votesA: number; votesB: number };
  cta: string;
  xPost: string;
  youtubeTitle: string;
  youtubeDescription: string;
}

const SITE_TOKEN = "{{SITE_URL}}";

export const PROMO_SCENARIOS: PromoScenario[] = [
  {
    id: "dating",
    label: "Dating",
    category: "dating",
    question: "Which dating photo would get more attention?",
    headline: "Which dating photo wins?",
    demo: { votesA: 29, votesB: 71 },
    cta: "Think the jury is wrong? Try yours free.",
    xPost:
      "Before you let Tinder judge your photo, let 100 simulated AI perspectives do it first. Upload two versions, pick the outcome, see which one wins. " +
      SITE_TOKEN,
    youtubeTitle: "I let an AI jury pick my best dating photo",
    youtubeDescription:
      "I uploaded two dating photos and let a synthetic jury of 100 AI perspectives decide which one actually wins. The result was not what I expected.\n\n" +
      "Try it yourself, free: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "status",
    label: "Status",
    category: "status",
    question: "Which one makes me look higher status?",
    headline: "Which photo reads higher status?",
    demo: { votesA: 34, votesB: 66 },
    cta: "Beat this result. Run your own jury free.",
    xPost:
      "Ran a status test on myself. Uploaded two photos, asked 100 simulated AI perspectives which one reads higher status. One of them lost badly. " +
      SITE_TOKEN,
    youtubeTitle: "Which photo makes you look more successful? (AI jury test)",
    youtubeDescription:
      "I tested two photos of myself against a synthetic AI jury to see which one reads as higher status. Brutal result.\n\n" +
      "Run your own: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "professional",
    label: "Professional",
    category: "professional",
    question: "Which LinkedIn photo would strangers trust more?",
    headline: "Which LinkedIn photo wins?",
    demo: { votesA: 41, votesB: 59 },
    cta: "Test your own LinkedIn photo free.",
    xPost:
      "Tested two LinkedIn headshots against a synthetic AI jury of 100 perspectives to see which one strangers would trust more. Closer than I expected. " +
      SITE_TOKEN,
    youtubeTitle: "I AI-tested my LinkedIn photo before posting it",
    youtubeDescription:
      "Two LinkedIn headshot candidates, one synthetic jury of 100 AI perspectives, one clear winner. Here's what actually moved the needle.\n\n" +
      "Try it on your own photos: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "style",
    label: "Style",
    category: "style",
    question: "Which outfit actually wins?",
    headline: "Which outfit actually wins?",
    demo: { votesA: 38, votesB: 62 },
    cta: "Settle your own outfit debate free.",
    xPost:
      "Couldn't decide between two outfits so I let 100 simulated AI perspectives settle it instead. Immediately regret asking. " + SITE_TOKEN,
    youtubeTitle: "Outfit A vs Outfit B — the AI jury decides",
    youtubeDescription:
      "Two outfits, one synthetic AI jury of 100 perspectives, one winner. Settling outfit debates the ridiculous way.\n\n" +
      "Settle yours: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "friend-challenge",
    label: "Friend Challenge",
    category: "social",
    question: "My mate said his photo was better. The AI jury disagreed.",
    headline: "My mate said his photo was better.",
    demo: { votesA: 22, votesB: 78 },
    cta: "Challenge a friend. Loser buys coffee.",
    xPost:
      "My mate swore his photo would win. The AI jury gave it 22%. Sending him this immediately. " + SITE_TOKEN,
    youtubeTitle: "My friend and I let an AI jury settle who has the better photo",
    youtubeDescription:
      "We both thought we'd win. The synthetic AI jury of 100 perspectives disagreed with one of us — hard.\n\n" +
      "Challenge your own friend: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "controversy",
    label: "Controversy",
    category: "style",
    question: "No chance the AI picked THAT one.",
    headline: "No chance it picked that one.",
    demo: { votesA: 68, votesB: 32 },
    cta: "See if you'd have called it. Run it free.",
    xPost:
      "The AI jury picked the photo I was SURE would lose. I'm not saying it's wrong. I'm saying I have questions. " + SITE_TOKEN,
    youtubeTitle: "The AI jury picked the photo NOBODY expected",
    youtubeDescription:
      "I was certain which photo would win. The synthetic jury of 100 AI perspectives had other ideas.\n\n" +
      "See if you'd call it differently: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "curiosity",
    label: "Curiosity",
    category: "social",
    question: "I let 100 simulated AI personalities judge my photos.",
    headline: "100 AI personalities judged my photos.",
    demo: { votesA: 45, votesB: 55 },
    cta: "Let them judge yours. Free.",
    xPost:
      "I built something weird tonight. Upload two photos and 100 simulated AI perspectives decide which one wins. " + SITE_TOKEN,
    youtubeTitle: "I let 100 simulated AI personalities judge my photos",
    youtubeDescription:
      "A synthetic jury of 100 AI perspectives — bold, reserved, analytical, status-sensitive and more — voted on two of my photos. Here's what happened.\n\n" +
      "Try it: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "experiment",
    label: "Experiment",
    category: "trust",
    question: "Can AI predict which version of you people prefer?",
    headline: "Can AI predict which version wins?",
    demo: { votesA: 47, votesB: 53 },
    cta: "Run the experiment on yourself. Free.",
    xPost:
      "Small experiment: can a synthetic AI jury predict which of two photos of the same person people would actually prefer? Testing it now. " +
      SITE_TOKEN,
    youtubeTitle: "Can AI actually predict which photo of you wins?",
    youtubeDescription:
      "I'm testing whether a synthetic jury of 100 AI perspectives can predict genuine preference between two photos of the same person.\n\n" +
      "Run the experiment yourself: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "brutal-choice",
    label: "Brutal Choice",
    category: "dating",
    question: "I thought A was obviously better. The jury destroyed it.",
    headline: "I thought A was the obvious winner.",
    demo: { votesA: 18, votesB: 82 },
    cta: "Think you'd call it right? Prove it.",
    xPost:
      "I thought Photo A was the obvious winner. The AI jury gave it 18%. Apparently my favourite photo just loses, and I disagree with my own app. " +
      SITE_TOKEN,
    youtubeTitle: "I was WRONG about which photo would win (AI jury test)",
    youtubeDescription:
      "I was completely confident which photo would win this AI jury test. I was completely wrong.\n\n" +
      "See if you'd call it: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
  {
    id: "challenge",
    label: "Challenge",
    category: "social",
    question: "Think the AI jury is wrong? Beat this result.",
    headline: "THE JURY HAS DECIDED.",
    demo: { votesA: 27, votesB: 73 },
    cta: "Think the jury is wrong? Beat this result.",
    xPost:
      "The jury has decided: 73–27. Think you can beat this result? Upload your photo and find out. " + SITE_TOKEN,
    youtubeTitle: "Beat this AI jury result if you can",
    youtubeDescription:
      "The synthetic AI jury just delivered a 73–27 verdict. Think you can submit a photo that beats it?\n\n" +
      "Take the challenge: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
  },
];

export function resolveSiteUrl(text: string, siteUrl: string): string {
  return text.split(SITE_TOKEN).join(siteUrl || SITE_TOKEN);
}
