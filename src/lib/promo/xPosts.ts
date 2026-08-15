export interface XPost {
  id: string;
  tone:
    | "curiosity"
    | "humour"
    | "controversy"
    | "friend-competition"
    | "founder"
    | "direct-demo"
    | "challenge"
    | "status"
    | "dating"
    | "professional";
  text: string;
}

const SITE_TOKEN = "{{SITE_URL}}";

export const X_POSTS: XPost[] = [
  {
    id: "curiosity-1",
    tone: "curiosity",
    text:
      "I built something weird tonight. Upload two photos and 100 simulated AI perspectives decide which one wins. " +
      SITE_TOKEN,
  },
  {
    id: "curiosity-2",
    tone: "curiosity",
    text: "What happens if you let 100 different AI personalities argue about your photo? I found out. " + SITE_TOKEN,
  },
  {
    id: "humour-1",
    tone: "humour",
    text: "Apparently my favourite photo loses 74–26. I disagree with my own app. " + SITE_TOKEN,
  },
  {
    id: "humour-2",
    tone: "humour",
    text: "Built an app that judges your photos so your friends don't have to lie to you anymore. You're welcome. " + SITE_TOKEN,
  },
  {
    id: "controversy-1",
    tone: "controversy",
    text: "No chance the AI picked THAT one. And yet, here we are. " + SITE_TOKEN,
  },
  {
    id: "controversy-2",
    tone: "controversy",
    text: "The AI jury just gave a 91–9 verdict on two photos I thought were basically equal. Not okay. " + SITE_TOKEN,
  },
  {
    id: "friend-competition-1",
    tone: "friend-competition",
    text: "My mate said his photo was better. The AI jury disagreed. Screenshotting this for the group chat. " + SITE_TOKEN,
  },
  {
    id: "friend-competition-2",
    tone: "friend-competition",
    text: "Me and my mate both submitted our best photo. Only one of us is speaking to the app right now. " + SITE_TOKEN,
  },
  {
    id: "founder-1",
    tone: "founder",
    text:
      "Shipped a small experiment tonight: a synthetic AI jury that votes on which of two photos wins for a given outcome (dating, professional, status...). Built in a day. " +
      SITE_TOKEN,
  },
  {
    id: "founder-2",
    tone: "founder",
    text: "Building in public: JURY simulates 100 heterogeneous AI perspectives voting on your photos instead of asking one model for a score. Live now. " + SITE_TOKEN,
  },
  {
    id: "direct-demo-1",
    tone: "direct-demo",
    text: "Upload two versions. Pick the outcome. See which one wins. Free, no account. " + SITE_TOKEN,
  },
  {
    id: "direct-demo-2",
    tone: "direct-demo",
    text: "Before real people judge you, let 100 AI people do it first. " + SITE_TOKEN,
  },
  {
    id: "challenge-1",
    tone: "challenge",
    text: "The jury has decided: 73–27. Think you can beat this result? Upload your photo and find out. " + SITE_TOKEN,
  },
  {
    id: "challenge-2",
    tone: "challenge",
    text: "Think the AI jury is wrong? Prove it. " + SITE_TOKEN,
  },
  {
    id: "status-1",
    tone: "status",
    text: "Ran a status test on myself. Uploaded two photos, asked 100 simulated AI perspectives which one reads higher status. One of them lost badly. " + SITE_TOKEN,
  },
  {
    id: "dating-1",
    tone: "dating",
    text: "Before you let Tinder judge your photo, let the AI jury do it first. " + SITE_TOKEN,
  },
  {
    id: "dating-2",
    tone: "dating",
    text: "Which version of you wins? Tested it on two dating photos and got a very clear answer. " + SITE_TOKEN,
  },
  {
    id: "professional-1",
    tone: "professional",
    text: "Tested two LinkedIn headshots against a synthetic AI jury of 100 perspectives to see which one strangers would trust more. Closer than I expected. " + SITE_TOKEN,
  },
];

export function resolveXPostUrl(text: string, siteUrl: string): string {
  return text.split(SITE_TOKEN).join(siteUrl || SITE_TOKEN);
}
