export interface YouTubeShort {
  id: string;
  title: string;
  hook: string;
  timing: { time: string; beat: string }[];
  onScreenText: string[];
  description: string;
  cta: string;
  hashtags: string[];
}

const SITE_TOKEN = "{{SITE_URL}}";

export const YOUTUBE_SHORTS: YouTubeShort[] = [
  {
    id: "dating-photo-wins",
    title: "I let an AI jury pick my best dating photo",
    hook: "Which dating photo wins?",
    timing: [
      { time: "0-2s", beat: "Hook: \"Which dating photo wins?\" over both photos blurred" },
      { time: "2-5s", beat: "Reveal Image A vs Image B side by side" },
      { time: "5-8s", beat: "Animated vote counter climbing for both" },
      { time: "8-11s", beat: "Reveal: B WINS — 71%" },
      { time: "11-15s", beat: "CTA: try yours free, show URL" },
    ],
    onScreenText: ["Which dating photo wins?", "IMAGE A vs IMAGE B", "100 AI jurors voting...", "B WINS — 71%", "Think the jury is wrong?"],
    description:
      "I uploaded two dating photos and let a synthetic jury of 100 AI perspectives decide which one actually wins. The result was not what I expected.\n\nTry it yourself, free: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Try yours free — link in bio",
    hashtags: ["#AIjury", "#datingapp", "#photocomparison", "#shorts", "#AItest"],
  },
  {
    id: "status-test",
    title: "Which photo makes you look more successful?",
    hook: "I tested which photo of me reads higher status.",
    timing: [
      { time: "0-2s", beat: "Hook: \"Which photo makes me look richer?\"" },
      { time: "2-5s", beat: "Show both candidate photos" },
      { time: "5-8s", beat: "Voting animation, persona labels flashing (status-sensitive, analytical...)" },
      { time: "8-11s", beat: "Reveal winner + vote split" },
      { time: "11-15s", beat: "CTA: run your own status test" },
    ],
    onScreenText: ["Which photo reads higher status?", "100 simulated AI perspectives", "Verdict incoming...", "WINNER", "Run yours free"],
    description:
      "I tested two photos of myself against a synthetic AI jury to see which one reads as higher status. Brutal result.\n\nRun your own: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Run your own free",
    hashtags: ["#statustest", "#AIjury", "#glowup", "#shorts", "#personalbranding"],
  },
  {
    id: "linkedin-headshot",
    title: "I AI-tested my LinkedIn photo before posting it",
    hook: "Which LinkedIn photo would strangers trust more?",
    timing: [
      { time: "0-2s", beat: "Hook over two headshot thumbnails" },
      { time: "2-5s", beat: "Full reveal of both headshots" },
      { time: "5-8s", beat: "Vote counter animating" },
      { time: "8-11s", beat: "Winner reveal with trust % callout" },
      { time: "11-15s", beat: "CTA: test yours before you post it" },
    ],
    onScreenText: ["Which LinkedIn photo wins?", "IMAGE A vs IMAGE B", "100 AI jurors", "TRUST WINNER", "Test yours free"],
    description:
      "Two LinkedIn headshot candidates, one synthetic jury of 100 AI perspectives, one clear winner. Here's what actually moved the needle.\n\nTry it on your own photos: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Test your headshot free",
    hashtags: ["#LinkedIn", "#personalbrand", "#AIjury", "#careertips", "#shorts"],
  },
  {
    id: "outfit-battle",
    title: "Outfit A vs Outfit B — the AI jury decides",
    hook: "Which outfit actually wins?",
    timing: [
      { time: "0-2s", beat: "Hook: \"I couldn't decide, so I asked 100 AIs\"" },
      { time: "2-5s", beat: "Outfit A vs Outfit B side by side" },
      { time: "5-8s", beat: "Voting animation" },
      { time: "8-11s", beat: "Reveal winner" },
      { time: "11-15s", beat: "CTA: settle your own debate" },
    ],
    onScreenText: ["Which outfit wins?", "OUTFIT A vs OUTFIT B", "Jury deliberating...", "WINNER", "Settle yours free"],
    description:
      "Two outfits, one synthetic AI jury of 100 perspectives, one winner. Settling outfit debates the ridiculous way.\n\nSettle yours: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Settle it free",
    hashtags: ["#OOTD", "#style", "#AIjury", "#fashiontest", "#shorts"],
  },
  {
    id: "friend-challenge",
    title: "My friend and I let an AI jury settle who has the better photo",
    hook: "My mate said his photo was better.",
    timing: [
      { time: "0-2s", beat: "Hook: two friends, two photos, one claim" },
      { time: "2-5s", beat: "Show both submitted photos" },
      { time: "5-8s", beat: "Voting animation, tension building" },
      { time: "8-11s", beat: "Reveal — loser reacts" },
      { time: "11-15s", beat: "CTA: challenge your own friend" },
    ],
    onScreenText: ["My mate said his was better.", "PHOTO A vs PHOTO B", "100 AI jurors voting", "VERDICT: 78–22", "Challenge a friend"],
    description:
      "We both thought we'd win. The synthetic AI jury of 100 perspectives disagreed with one of us — hard.\n\nChallenge your own friend: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Challenge a friend free",
    hashtags: ["#friendchallenge", "#AIjury", "#loserpaysbill", "#shorts", "#photocompare"],
  },
  {
    id: "controversial-pick",
    title: "The AI jury picked the photo NOBODY expected",
    hook: "No chance it picked THAT one.",
    timing: [
      { time: "0-2s", beat: "Hook: \"I was SURE this would lose\"" },
      { time: "2-5s", beat: "Show both photos" },
      { time: "5-8s", beat: "Voting animation" },
      { time: "8-11s", beat: "Reveal the unexpected winner" },
      { time: "11-15s", beat: "CTA: see if you'd call it differently" },
    ],
    onScreenText: ["I was sure this would lose.", "IMAGE A vs IMAGE B", "Jury deliberating...", "PLOT TWIST", "See if you'd call it"],
    description:
      "I was certain which photo would win. The synthetic jury of 100 AI perspectives had other ideas.\n\nSee if you'd call it differently: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Run your own test",
    hashtags: ["#plottwist", "#AIjury", "#unexpected", "#shorts", "#photocomparison"],
  },
  {
    id: "100-personalities",
    title: "I let 100 simulated AI personalities judge my photos",
    hook: "100 AI personalities judged my photos.",
    timing: [
      { time: "0-2s", beat: "Hook over a grid of persona labels flashing" },
      { time: "2-5s", beat: "Show both photos being judged" },
      { time: "5-8s", beat: "Persona segments flash: bold, analytical, status-sensitive..." },
      { time: "8-11s", beat: "Final tally reveal" },
      { time: "11-15s", beat: "CTA: let them judge yours" },
    ],
    onScreenText: ["100 AI personalities.", "bold · reserved · analytical · status", "Verdict incoming...", "FINAL TALLY", "Let them judge yours"],
    description:
      "A synthetic jury of 100 AI perspectives — bold, reserved, analytical, status-sensitive and more — voted on two of my photos. Here's what happened.\n\nTry it: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Try it free",
    hashtags: ["#AIexperiment", "#syntheticjury", "#shorts", "#AItest", "#curiosity"],
  },
  {
    id: "prediction-experiment",
    title: "Can AI actually predict which photo of you wins?",
    hook: "Can AI predict which version wins?",
    timing: [
      { time: "0-2s", beat: "Hook: framing this as an experiment" },
      { time: "2-5s", beat: "Show two photos of the same person" },
      { time: "5-8s", beat: "Voting animation" },
      { time: "8-11s", beat: "Reveal + confidence level shown" },
      { time: "11-15s", beat: "CTA: run the experiment on yourself" },
    ],
    onScreenText: ["Can AI predict the winner?", "SAME PERSON, TWO PHOTOS", "100 AI jurors voting", "CONFIDENCE: MEDIUM", "Test yourself free"],
    description:
      "I'm testing whether a synthetic jury of 100 AI perspectives can predict genuine preference between two photos of the same person.\n\nRun the experiment yourself: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Run the experiment",
    hashtags: ["#AIexperiment", "#sciencetok", "#AIjury", "#shorts", "#photoscience"],
  },
  {
    id: "brutal-choice",
    title: "I was WRONG about which photo would win",
    hook: "I thought A was the obvious winner.",
    timing: [
      { time: "0-2s", beat: "Hook: confident prediction stated on screen" },
      { time: "2-5s", beat: "Show Image A vs Image B" },
      { time: "5-8s", beat: "Voting animation" },
      { time: "8-11s", beat: "Reveal: A gets destroyed" },
      { time: "11-15s", beat: "CTA: see if you'd call it right" },
    ],
    onScreenText: ["I thought A would win easily.", "IMAGE A vs IMAGE B", "100 AI jurors voting", "A: 18% — DESTROYED", "Would you call it right?"],
    description:
      "I was completely confident which photo would win this AI jury test. I was completely wrong.\n\nSee if you'd call it: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Prove you'd call it",
    hashtags: ["#AIjury", "#plottwist", "#shorts", "#photocomparison", "#wrongagain"],
  },
  {
    id: "beat-this-result",
    title: "Beat this AI jury result if you can",
    hook: "The jury has decided: 73–27.",
    timing: [
      { time: "0-2s", beat: "Hook: bold verdict stat on screen" },
      { time: "2-5s", beat: "Show the winning photo" },
      { time: "5-8s", beat: "Vote counter animating up to final split" },
      { time: "8-11s", beat: "Reveal: THE JURY HAS DECIDED" },
      { time: "11-15s", beat: "CTA: challenge the verdict, show URL" },
    ],
    onScreenText: ["THE JURY HAS DECIDED", "73 — 27", "Think you can beat this?", "CHALLENGE THE VERDICT", "Try it free"],
    description:
      "The synthetic AI jury just delivered a 73–27 verdict. Think you can submit a photo that beats it?\n\nTake the challenge: " +
      SITE_TOKEN +
      "\n\nJURY is an AI simulation of likely perception, not a scientific measurement.",
    cta: "Take the challenge",
    hashtags: ["#challenge", "#AIjury", "#beatthis", "#shorts", "#photobattle"],
  },
];

export function resolveShortUrl(text: string, siteUrl: string): string {
  return text.split(SITE_TOKEN).join(siteUrl || SITE_TOKEN);
}
